// ─────────────────────────────────────────────────────────────
//  Body  : { username: string, password: string }
//  Cookie: set "session" httpOnly jika berhasil
//
//  Alur:
//    1. Validasi body (username & password wajib ada)
//    2. DAL: cari user by username
//    3. Verifikasi password dengan bcrypt
//    4. Buat JWT session → set cookie httpOnly
//    5. DAL: update last_login_at
//    6. Return user info (tanpa password)
//
//  Error codes:
//    400 → body tidak valid
//    401 → username/password salah atau user tidak aktif
//    500 → server error
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { authDal } from "@/app/lib/dal/Auth.dal";
import { createSession } from "@/app/lib/sessions";
import { SessionPayload } from "@/app/lib/interfaces/sessionPayload";
import { loginSchema } from "@/app/lib/validation/loginSchema";
import * as yup from "yup";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        {
          message: "Request body tidak valid",
        },
        {
          status: 400,
        },
      );
    }

    let validated;
    try {
      validated = await loginSchema.validate(body, {
        abortEarly: false,
      });
    } catch (err) {
      if (err instanceof yup.ValidationError) {
        return NextResponse.json(
          {
            message: "validasi gagal",
            errors: err.errors,
          },
          {
            status: 400,
          },
        );
      }
      throw err;
    }

    const { username, password } = validated;

    const user = await authDal.findUserByUsername(username.trim());

    const INVALID_MSG = "Username atau password salah";

    if (!user) {
      return NextResponse.json(
        {
          message: INVALID_MSG,
        },
        { status: 401 },
      );
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return NextResponse.json(
        {
          message: INVALID_MSG,
        },
        { status: 401 },
      );
    }

    //session  payload & set cookies
    if (!user.unit_id) {
      return NextResponse.json(
        {
          message: "Akun belum ditugaskan ke unit, Hubungi administrator",
        },
        { status: 401 },
      );
    }

    const sessionPayload: SessionPayload = {
      userId: Number(user.id),
      username: user.username,
      nama: user.nama,
      role: user.role as SessionPayload["role"],
      unitId: Number(user.unit_id),
    };

    await createSession(sessionPayload);

    //update lastlogin
    authDal.updateLastLogin(Number(user.id)).catch(console.error);

    //return user info
    return NextResponse.json(
      {
        message: "Login Berhasil",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[POST] /api/auth/login", error);

    return NextResponse.json(
      { message: "Terjadi kesalahan server. Coba lagi." },
      { status: 500 },
    );
  }
}
