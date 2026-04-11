"use client";
// ─────────────────────────────────────────────────────────────
//  hooks/useAuth.ts
//
//  Hook untuk membaca data user yang sedang login.
//  Memanggil GET /api/auth/me → cookie httpOnly otomatis terbawa.
//
//  staleTime: Infinity → tidak re-fetch selama sesi aktif.
//  retry: false        → kalau 401, langsung stop (bukan retry).
//
//  Shape return disesuaikan dengan SessionPayload:
//    userId, username, nama, role, unitId
// ─────────────────────────────────────────────────────────────

import { useQuery } from "@tanstack/react-query";
import type { SessionPayload } from "../lib/interfaces/sessionPayload";

export type AuthUser = Omit<SessionPayload, "iat" | "exp"> & {
  id: number;
};

async function fetchMe(): Promise<AuthUser> {
  const res = await fetch("/api/auth/me", {
    credentials: "same-origin",
  });

  if (!res.ok) {
    throw new Error("Unauthorize");
  }

  return res.json();
}

export function useAuth() {
  const { data, isLoading, isError } = useQuery<AuthUser>({
    queryKey: ["auth", "me"],
    queryFn: fetchMe,
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  });

  return {
    user: data ?? null,
    userId: data?.userId ?? null,
    nama: data?.nama ?? null,
    role: data?.role ?? null,
    unitId: data?.unitId ?? null,
    isLoading,
    isLoggedIn: !!data && !isError,
  };
}
