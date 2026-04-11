// ─────────────────────────────────────────────────────────────
//  POST /api/units/:unitId/display-token  → generate / rotate token
//  DELETE /api/units/:unitId/display-token → revoke token
//
//  Butuh login sebagai admin.
//  Response POST: { token, url }  — URL siap pakai untuk dikonfigurasi di TV.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { requireSession, jsonError } from "@/app/lib/apiHelpers";
import { unitDal } from "@/app/lib/dal/Unit.dal";

// ── POST — generate / rotate ──────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ unitId: string }> },
) {
  const auth = await requireSession(req);
  if (!auth.ok) return auth.response;

  if (auth.session.role !== "admin") {
    return jsonError("Hanya admin yang dapat mengelola display token", 403);
  }

  const { unitId: rawId } = await params;
  const unitId = Number(rawId);
  if (isNaN(unitId)) return jsonError("unitId tidak valid", 400);

  const token = await unitDal.generateDisplayToken(unitId);

  const origin = new URL(req.url).origin;
  const displayUrl = `${origin}/display?token=${token}`;

  return NextResponse.json({ token, url: displayUrl });
}

// ── DELETE — revoke ───────────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ unitId: string }> },
) {
  const auth = await requireSession(req);
  if (!auth.ok) return auth.response;

  if (auth.session.role !== "admin") {
    return jsonError("Hanya admin yang dapat mengelola display token", 403);
  }

  const { unitId: rawId } = await params;
  const unitId = Number(rawId);
  if (isNaN(unitId)) return jsonError("unitId tidak valid", 400);

  await unitDal.revokeDisplayToken(unitId);
  return NextResponse.json({ ok: true });
}
