// ─────────────────────────────────────────────────────────────
//  GET /api/units
//
//  List semua unit aktif beserta status display token.
//  Token asli tidak dikembalikan — hanya preview 8 karakter.
//  Butuh login sebagai admin.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { requireSession, jsonError } from "@/app/lib/apiHelpers";
import { unitDal } from "@/app/lib/dal/Unit.dal";

export async function GET(req: NextRequest) {
  const auth = await requireSession(req);
  if (!auth.ok) return auth.response;

  if (auth.session.role !== "admin") {
    return jsonError("Hanya admin yang dapat mengakses data unit", 403);
  }

  const units = await unitDal.getAllWithTokenStatus();
  return NextResponse.json(units);
}
