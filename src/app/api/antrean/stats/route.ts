// ─────────────────────────────────────────────────────────────
//  GET /api/antrean/stats
//
//  Mengembalikan StatsHariIni untuk unit pada sesi aktif hari ini.
//  Jika belum ada sesi → kembalikan stats kosong (semua 0).
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { antreanDal } from "@/app/lib/dal/Antrean.dal";
import { resolvePublicUnitId, jsonError } from "@/app/lib/apiHelpers";
import type { StatsHariIni } from "@/app/types/antrianTypes";

export async function GET(req: NextRequest) {
  const unitId = await resolvePublicUnitId(req);
  if (unitId === null) return jsonError("Unauthorized", 401);

  try {
    const sesi = await antreanDal.findAktifSession(unitId);

    if (!sesi) {
      const empty: StatsHariIni = {
        unitId,
        total: 0,
        menunggu: 0,
        dipanggil: 0,
        selesai: 0,
        tidakHadir: 0,
        rataLamaLayananMenit: null,
      };
      return NextResponse.json(empty);
    }

    const stats = await antreanDal.getStatsHariIni(sesi.id, unitId);
    return NextResponse.json(stats);
  } catch (err) {
    console.error("[GET] /api/antrean/stats", err);
    return jsonError("Gagal mengambil statistik", 500);
  }
}
