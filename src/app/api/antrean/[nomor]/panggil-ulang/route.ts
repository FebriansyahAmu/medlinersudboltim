// ─────────────────────────────────────────────────────────────
//  POST /api/antrean/[nomor]/panggil-ulang
//
//  Petugas klik "Panggil Ulang" untuk antrean yang sedang called.
//  Increment jumlah_panggilan; tidak ada perubahan status.
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

    if (existing.status !== "called") {
      return jsonError("Hanya antrean yang sedang dipanggil yang bisa di-ulang", 409);
    }

    const result = await antreanDal.panggilUlangAntrean(existing.id);

    // Ambil nama pasien untuk SSE event (opsional)
    const detail = await antreanDal.findAntreanByNomor(nomor, sesi.id);

    antreanDal
      .createAuditLog({
        antreanId: existing.id,
        userId,
        aksi: "PANGGIL_ULANG",
        keterangan: `Panggilan ke-${result.jumlahPanggilan}`,
      })
      .catch(console.error);

    publishEvent(unitId, {
      type: "PANGGIL_ULANG",
      data: {
        nomorAntrian: nomor,
        namaPasien: detail?.namaPasien ?? null,
      },
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST] /api/antrean/[nomor]/panggil-ulang", err);
    return jsonError("Gagal panggil ulang antrean", 500);
  }
}
