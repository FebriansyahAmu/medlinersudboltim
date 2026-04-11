// ─────────────────────────────────────────────────────────────
//  POST /api/antrean/[nomor]/selesai
//
//  Tandai antrean selesai dilayani.
//  Validasi: hanya antrean status=called yang bisa di-selesai.
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
      return jsonError(
        `Hanya antrean status 'called' yang bisa diselesaikan (saat ini: ${existing.status})`,
        409
      );
    }

    const updated = await antreanDal.selesaiAntrean(existing.id);

    antreanDal
      .createAuditLog({
        antreanId: existing.id,
        userId,
        aksi: "SELESAI",
        statusSebelum: "called",
        statusSesudah: "done",
      })
      .catch(console.error);

    publishEvent(unitId, {
      type: "SELESAI",
      data: {
        nomorAntrian: updated.nomorAntrian,
        waktuSelesai: updated.waktuSelesai ?? new Date().toISOString(),
      },
    });

    // Stats update event — push agar display & petugas counter sync
    antreanDal
      .getStatsHariIni(sesi.id, unitId)
      .then((stats) =>
        publishEvent(unitId, { type: "STATS_UPDATE", data: stats })
      )
      .catch(console.error);

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[POST] /api/antrean/[nomor]/selesai", err);
    return jsonError("Gagal menyelesaikan antrean", 500);
  }
}
