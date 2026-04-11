// ─────────────────────────────────────────────────────────────
//  POST /api/antrean/panggil
//
//  Petugas klik "Panggil Berikutnya":
//    1. Cari antrean status=waiting paling awal (nomor_urut terkecil)
//    2. Update jadi called + waktu_panggil + dilayani_oleh
//    3. Audit log + publish SSE DIPANGGIL
//
//  Body  : { loketId?: number }  (opsional, jika dikirim dipakai)
//  Return: Antrean (yang baru dipanggil)
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { antreanDal } from "@/app/lib/dal/Antrean.dal";
import { requireSession, jsonError } from "@/app/lib/apiHelpers";
import { publishEvent } from "@/app/lib/emitter";

export async function POST(req: NextRequest) {
  const auth = await requireSession(req);
  if (!auth.ok) return auth.response;

  try {
    const { unitId, userId } = auth.session;

    const body = await req.json().catch(() => ({} as { loketId?: number }));
    const loketId = typeof body?.loketId === "number" ? body.loketId : undefined;

    const sesi = await antreanDal.findAktifSession(unitId);
    if (!sesi) return jsonError("Belum ada sesi aktif hari ini", 404);

    const next = await antreanDal.findFirstWaiting(sesi.id);
    if (!next) return jsonError("Tidak ada antrean menunggu", 404);

    const updated = await antreanDal.panggilAntrean(next.id, userId, loketId);

    antreanDal
      .createAuditLog({
        antreanId: next.id,
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
    console.error("[POST] /api/antrean/panggil", err);
    return jsonError("Gagal memanggil antrean", 500);
  }
}
