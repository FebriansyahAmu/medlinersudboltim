// ─────────────────────────────────────────────────────────────
//  app/api/auth/me/route.ts
//
//  GET /api/auth/me
//
//  Dipakai oleh useAuth hook (TanStack Query) di client.
//  Baca session dari cookie → return user info.
//
//  useAuth di hooks/useAuth.ts memanggil endpoint ini
//  dengan staleTime: Infinity agar tidak re-fetch tiap render.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/app/lib/sessions";
import { authDal } from "@/app/lib/dal/Auth.dal";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);

  if (!session) {
    return NextResponse.json({ message: "Unauthorize" }, { status: 401 });
  }

  //validasi user
  const user = await authDal.findUserById(session.userId);

  if (!user) {
    return NextResponse.json(
      { message: "User tidak ditemukan atau sudah tidak aktif" },
      { status: 401 },
    );
  }

  // Shape disesuaikan dengan SessionPayload + AuthUser di hooks/useAuth.ts
  return NextResponse.json({
    id: user.id,
    userId: user.id,
    username: user.username,
    nama: user.nama,
    role: user.role,
    unitId: user.unitId ?? 0,
  });
}
