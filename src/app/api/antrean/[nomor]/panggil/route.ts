// ─────────────────────────────────────────────────────────────
//  POST /api/antrean/[nomor]/panggil
//
//  Panggil nomor spesifik (dipilih petugas dari tabel antrian).
//  Berbeda dengan /api/antrean/panggil yang ambil "berikutnya".
//
//  Validasi: hanya antrean status=waiting yang bisa dipanggil
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { antreanDal } from "@/app/lib/dal/Antrean.dal";
import { requireSession, jsonError } from "@/app/lib/apiHelpers";
import { publishEvent } from "@/app/lib/emitter";

interface RouteContext {
  params: Promise<{ nomor: string }>;
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const auth = await requireSession(req);
  if (!auth.ok) return auth.response;

  try {
    const { nomor } = await ctx.params;
    const { unitId, userId } = auth.session;

    const sesi = await antreanDal.findAktifSession(unitId);
    if (!sesi) return jsonError("Sesi tidak ditemukan", 404);

    const existing = await antreanDal.findAntreanRawByNomor(nomor, sesi.id);
    if (!existing) return jsonError("Antrean tidak ditemukan", 404);

    if (existing.status !== "waiting") {
      return jsonError(
        `Antrean tidak dalam status waiting (status saat ini: ${existing.status})`,
        409
      );
    }

    const updated = await antreanDal.panggilAntrean(existing.id, userId);

    antreanDal
      .createAuditLog({
        antreanId: existing.id,
        userId,
        aksi: "PANGGIL",
        statusSebelum: "waiting",
        statusSesudah: "called",
      })
      .catch(console.error);

    publishEvent(unitId, {
      type: "DIPANGGIL",
      data: {
        nomorAntrian: updated.nomorAntrian,
        namaPasien: updated.namaPasien,
        jenisResep: updated.jenisResep,
        loket: updated.loket,
        waktuPanggil: updated.WaktuPanggil ?? new Date().toISOString(),
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[POST] /api/antrean/[nomor]/panggil", err);
    return jsonError("Gagal memanggil antrean", 500);
  }
}
