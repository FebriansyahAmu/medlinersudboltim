"server-only";

// ─────────────────────────────────────────────────────────────
//  lib/session.ts
//
//  Manajemen JWT session via cookie httpOnly.
//  Menggunakan jose (bawaan Next.js ecosystem, bukan jsonwebtoken
//  yang tidak support Edge Runtime).
//
//  Cookie name: "session"
//  Algorithm  : HS256
//  Expiry     : 2 hari
// ─────────────────────────────────────────────────────────────

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import type { SessionPayload } from "./interfaces/sessionPayload";

// ── Secret key ────────────────────────────────────────────────
// Wajib set SESSION_SECRET di .env (min 32 karakter)
const secretKey = process.env.SESSION_SECRET;
const encodedKey = new TextEncoder().encode(secretKey);

const COOKIE_NAME = "session";
const EXPIRY_DAYS = 2;
const EXPIRY_MS = EXPIRY_DAYS * 24 * 60 * 60 * 1000;
const EXPIRY_JOSE = `${EXPIRY_DAYS}d`;

function isSessionPayload(payload: any): payload is SessionPayload {
  return (
    typeof payload.userId === "number" &&
    typeof payload.username === "string" &&
    typeof payload.nama === "string" &&
    typeof payload.role === "string" &&
    typeof payload.unitId === "number"
  );
}

//encrypt - buat jwt string dari payload
export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload } as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(EXPIRY_JOSE)
    .sign(encodedKey);
}

//verifyToken - verifikasi JWT string, return payload atau null
export async function verifyToken(
  session?: string,
): Promise<SessionPayload | null> {
  if (!session) return null;

  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ["HS256"],
    });

    if (!isSessionPayload(payload)) {
      return null;
    }

    return payload;
  } catch (error) {
    console.error(
      "[session] JWT verification failed",
      (error as Error).message,
    );
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
//  createSession — buat JWT dan set ke cookie httpOnly
//  Dipanggil di: POST /api/auth/login (setelah verifikasi password)
// ─────────────────────────────────────────────────────────────
export async function createSession(payload: SessionPayload): Promise<void> {
  const expiresAt = new Date(Date.now() + EXPIRY_MS);
  const token = await encrypt(payload);
  const store = await cookies();

  store.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

// ─────────────────────────────────────────────────────────────
//  deleteSession — hapus cookie session
//  Dipanggil di: POST /api/auth/logout
// ─────────────────────────────────────────────────────────────
export async function deleteSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

// ─────────────────────────────────────────────────────────────
//  getSession — baca session dari cookie (Server Component / RSC)
//  Dipakai di Server Component yang butuh payload tanpa request obj
// ─────────────────────────────────────────────────────────────
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  return verifyToken(token);
}

// ─────────────────────────────────────────────────────────────
//  getSessionFromRequest — baca session dari NextRequest
//  Dipakai di: middleware.ts dan Route Handler
// ─────────────────────────────────────────────────────────────
export async function getSessionFromRequest(
  req: NextRequest,
): Promise<SessionPayload | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  return verifyToken(token);
}
