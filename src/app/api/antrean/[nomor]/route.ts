// ─────────────────────────────────────────────────────────────
//  GET   /api/antrean/[nomor]   → detail antrean
//  PATCH /api/antrean/[nomor]   → lengkapi data (kodeBooking, nama, jenisResep)
//
//  Params : { nomor: string }   (nomor antrean, contoh: "F-001")
//  Auth   : wajib
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { antreanDal } from "@/app/lib/dal/Antrean.dal";
import { requireSession, jsonError } from "@/app/lib/apiHelpers";
import { publishEvent } from "@/app/lib/emitter";
import type { JenisResep } from "@/app/types/antrianTypes";

const VALID_JENIS_RESEP: JenisResep[] = ["Non Racik", "Racikan", "Tidak ada"];

interface RouteContext {
  params: Promise<{ nomor: string }>;
}

// ─────────────────────────────────────────────────────────────
//  GET — detail
// ─────────────────────────────────────────────────────────────
export async function GET(req: NextRequest, ctx: RouteContext) {
  const auth = await requireSession(req);
  if (!auth.ok) return auth.response;

  try {
    const { nomor } = await ctx.params;
    const unitId = auth.session.unitId;

    const sesi = await antreanDal.findAktifSession(unitId);
    if (!sesi) return jsonError("Sesi tidak ditemukan", 404);

    const antrean = await antreanDal.findAntreanByNomor(nomor, sesi.id);
    if (!antrean) return jsonError("Antrean tidak ditemukan", 404);

    return NextResponse.json(antrean);
  } catch (err) {
    console.error("[GET] /api/antrean/[nomor]", err);
    return jsonError("Gagal mengambil detail antrean", 500);
  }
}

// ─────────────────────────────────────────────────────────────
//  PATCH — lengkapi data
// ─────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const auth = await requireSession(req);
  if (!auth.ok) return auth.response;

  try {
    const { nomor } = await ctx.params;
    const { unitId, userId } = auth.session;

    const body = await req.json().catch(() => null);
    if (!body) return jsonError("Body tidak valid", 400);

    const { kodeBooking, namaPasien, jenisResep, noSep, noBpjs } = body as {
      kodeBooking?: unknown;
      namaPasien?: unknown;
      jenisResep?: unknown;
      noSep?: unknown;
      noBpjs?: unknown;
    };

    if (typeof kodeBooking !== "string" || !kodeBooking.trim()) {
      return jsonError("kodeBooking wajib diisi", 400);
    }
    if (typeof namaPasien !== "string" || !namaPasien.trim()) {
      return jsonError("namaPasien wajib diisi", 400);
    }
    if (
      typeof jenisResep !== "string" ||
      !VALID_JENIS_RESEP.includes(jenisResep as JenisResep)
    ) {
      return jsonError("jenisResep tidak valid", 400);
    }

    const sesi = await antreanDal.findAktifSession(unitId);
    if (!sesi) return jsonError("Sesi tidak ditemukan", 404);

    const existing = await antreanDal.findAntreanRawByNomor(nomor, sesi.id);
    if (!existing) return jsonError("Antrean tidak ditemukan", 404);

    const updated = await antreanDal.lengkapiDataAntrean(existing.id, {
      kodeBooking: kodeBooking.trim(),
      namaPasien: namaPasien.trim(),
      jenisResep,
      noSep: typeof noSep === "string" ? noSep.trim() : null,
      noBpjs: typeof noBpjs === "string" ? noBpjs.trim() : null,
    });

    antreanDal
      .createAuditLog({
        antreanId: existing.id,
        userId,
        aksi: "LENGKAPI_DATA",
        keterangan: `kodeBooking=${kodeBooking}, jenisResep=${jenisResep}`,
      })
      .catch(console.error);

    publishEvent(unitId, {
      type: "DATA_DILENGKAPI",
      data: {
        nomorAntrian: updated.nomorAntrian,
        namaPasien: updated.namaPasien ?? "",
        jenisResep: updated.jenisResep ?? "Tidak ada",
        kodeBooking: updated.kodeBooking ?? "",
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[PATCH] /api/antrean/[nomor]", err);
    return jsonError("Gagal melengkapi data antrean", 500);
  }
}
