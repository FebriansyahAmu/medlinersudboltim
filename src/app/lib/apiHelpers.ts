"server-only";

// ─────────────────────────────────────────────────────────────
//  lib/apiHelpers.ts
//
//  Helper kecil yang dipakai berulang di Route Handler.
//
//  - requireSession()       → auth guard, return SessionPayload atau 401
//  - resolvePublicUnitId()  → unitId dari session ATAU display_token
//  - jsonError()            → respons error konsisten
//  - generateNomorAntrian() → format nomor antrian: "F-001", "F-002"
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "./sessions";
import { unitDal } from "./dal/Unit.dal";
import type { SessionPayload } from "./interfaces/sessionPayload";

export type AuthResult =
  | { ok: true; session: SessionPayload }
  | { ok: false; response: NextResponse };

export async function requireSession(req: NextRequest): Promise<AuthResult> {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true, session };
}

// Resolve unitId untuk endpoint publik (display, stream).
// Prioritas: session cookie → ?token= query param.
// Return null jika tidak ada auth yang valid.
export async function resolvePublicUnitId(
  req: NextRequest,
): Promise<number | null> {
  const session = await getSessionFromRequest(req);
  if (session) return session.unitId;

  const token = new URL(req.url).searchParams.get("token");
  if (!token) return null;

  const unit = await unitDal.findByDisplayToken(token);
  return unit?.id ?? null;
}

export function jsonError(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

// ─────────────────────────────────────────────────────────────
//  Date helpers — dipakai di route handler untuk filter tanggal
// ─────────────────────────────────────────────────────────────

// Parses "YYYY-MM-DD" → Date (midnight lokal).  Return null jika invalid.
export function parseTanggal(raw: string | null): Date | null {
  if (!raw) return null;
  const d = new Date(`${raw}T00:00:00`);
  return isNaN(d.getTime()) ? null : d;
}

// True jika `date` (midnight lokal) jatuh pada hari kalender hari ini.
export function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

// Format: "{prefix}-{nomor padded 3 digit}", contoh: "F-001"
// prefix diambil dari huruf pertama unit.kode (uppercase)
export function generateNomorAntrian(unitKode: string, nomorUrut: number): string {
  const prefix = (unitKode?.charAt(0) ?? "X").toUpperCase();
  return `${prefix}-${String(nomorUrut).padStart(3, "0")}`;
}
