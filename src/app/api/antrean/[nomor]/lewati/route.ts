// ─────────────────────────────────────────────────────────────
//  POST /api/antrean/[nomor]/lewati
//
//  Tandai antrean tidak hadir (absent).
//  Bisa dari status waiting atau called.
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

    if (existing.status !== "waiting" && existing.status !== "called") {
      return jsonError(
        `Antrean tidak bisa dilewati dari status ${existing.status}`,
        409
      );
    }

    const updated = await antreanDal.lewatiAntrean(existing.id);

    antreanDal
      .createAuditLog({
        antreanId: existing.id,
        userId,
        aksi: "LEWATI",
        statusSebelum: existing.status,
        statusSesudah: "absent",
      })
      .catch(console.error);

    publishEvent(unitId, {
      type: "TIDAK_HADIR",
      data: { nomorAntrian: updated.nomorAntrian },
    });

    antreanDal
      .getStatsHariIni(sesi.id, unitId)
      .then((stats) =>
        publishEvent(unitId, { type: "STATS_UPDATE", data: stats })
      )
      .catch(console.error);

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[POST] /api/antrean/[nomor]/lewati", err);
    return jsonError("Gagal melewati antrean", 500);
  }
}
