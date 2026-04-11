// ─────────────────────────────────────────────────────────────
//  GET /api/display/resolve?token=xxx
//
//  Endpoint publik — tidak butuh login.
//  Resolve display_token → { unitId, nama, kode }.
//  Dipakai halaman /display saat pertama load untuk tahu unitId-nya.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { unitDal } from "@/app/lib/dal/Unit.dal";
import { jsonError } from "@/app/lib/apiHelpers";

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return jsonError("Parameter token wajib diisi", 400);

  const unit = await unitDal.findByDisplayToken(token);
  if (!unit) return jsonError("Token tidak valid atau sudah kadaluarsa", 401);

  return NextResponse.json(unit);
}
