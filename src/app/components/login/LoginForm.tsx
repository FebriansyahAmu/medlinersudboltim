"use client";

// ─────────────────────────────────────────────────────────────
//  components/auth/LoginForm.tsx
//
//  Form login — Client Component.
//  Memanggil POST /api/auth/login lalu redirect.
//
//  Setelah login berhasil:
//    - Cookie "session" httpOnly di-set oleh server
//    - useAuth hook di halaman petugas akan fetch /api/auth/me
//      dan dapat unitId, role, dll dari cookie
// ─────────────────────────────────────────────────────────────

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

export function LoginForm() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password.trim()) {
      setError("Username dan password wajib diisi.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      // Cek status response dulu sebelum parse JSON
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { message?: string }).message ?? "Login gagal.");
        return;
      }

      // Login berhasil — cookie httpOnly sudah di-set server.
      // Tidak perlu baca response body karena data user
      // ada di JWT cookie dan bisa diambil via useAuth → /api/auth/me.

      // Invalidate cache auth agar useAuth refetch dengan session baru
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });

      // Push ke "/" — proxy yang akan redirect ke landing page sesuai role
      // (kiosk → /kiosk, petugas → /petugas-panggil, dll).
      router.push("/");
      router.refresh();
    } catch {
      setError("Tidak dapat terhubung ke server. Periksa koneksi Anda.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      className="w-full bg-white rounded-[28px] p-14"
      style={{
        maxWidth: 480,
        boxShadow:
          "0 0 0 1px rgba(0,0,0,.05), 0 8px 24px rgba(0,0,0,.06), 0 32px 64px rgba(0,0,0,.04)",
      }}
    >
      {/* Logo + judul */}
      <div className="text-center mb-11">
        <img
          src="/medline-log.png"
          alt="MedLine RSUD BOLTIM"
          className="w-13 h-13 rounded-2xl object-contain mx-auto mb-5"
          style={{ boxShadow: "0 4px 14px rgba(0,135,90,.28)" }}
        />
        <p className="text-xs font-semibold uppercase tracking-[3px] text-[#00875A] mb-2.5">
          Selamat datang
        </p>
        <h1 className="text-2xl font-bold text-[#1A2332] tracking-tight">
          Masuk ke Sistem
        </h1>
        <p className="text-sm text-[#9AABBA] mt-2">
          RSUD BOLTIM · Antrian Farmasi BPJS
        </p>
      </div>

      {/* Error */}
      {error && (
        <div
          className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl mb-5 text-sm"
          style={{
            background: "#FDECEA",
            border: "1px solid rgba(208,64,42,.18)",
            color: "#C0392B",
          }}
        >
          <svg
            width="15"
            height="15"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Username */}
        <div>
          <label className="block text-xs font-semibold text-[#5A6A78] mb-1.5 uppercase tracking-[0.3px]">
            Username
          </label>
          <div className="relative">
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError(null);
              }}
              placeholder="Masukkan username"
              autoComplete="username"
              className="w-full pl-10 pr-3.5 py-3 border-2 border-[#E4ECF0] rounded-xl text-sm text-[#1A2332]
                         bg-[#F5F8FA] outline-none transition-all
                         focus:border-[#00875A] focus:bg-white focus:ring-4 focus:ring-[#00875A]/10
                         placeholder:text-[#9AABBA]"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9AABBA]"
              width="15"
              height="15"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-semibold text-[#5A6A78] mb-1.5 uppercase tracking-[0.3px]">
            Kata Sandi
          </label>
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full pl-10 pr-11 py-3 border-2 border-[#E4ECF0] rounded-xl text-sm text-[#1A2332]
                         bg-[#F5F8FA] outline-none transition-all
                         focus:border-[#00875A] focus:bg-white focus:ring-4 focus:ring-[#00875A]/10
                         placeholder:text-[#9AABBA]"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9AABBA]"
              width="15"
              height="15"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            <button
              type="button"
              onClick={() => setShowPass((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9AABBA] hover:text-[#5A6A78] transition-colors p-1"
            >
              {showPass ? (
                <svg
                  width="15"
                  height="15"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg
                  width="15"
                  height="15"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2
                     transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            background: "#00875A",
            boxShadow: "0 3px 12px rgba(0,135,90,.28)",
            letterSpacing: ".1px",
          }}
        >
          {isLoading ? (
            <>
              <svg
                className="w-4 h-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Memverifikasi...
            </>
          ) : (
            "Masuk"
          )}
        </button>
      </form>

      {/* Akses langsung tanpa login */}
      <div className="mt-7">
        <div className="flex items-center gap-3 mb-4">
          <hr className="flex-1 border-[#E4ECF0]" />
          <span className="text-xs text-[#9AABBA]">atau akses langsung</span>
          <hr className="flex-1 border-[#E4ECF0]" />
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <a
            href="/kiosk"
            className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-[#5A6A78]
                       rounded-xl border-[1.5px] border-[#E4ECF0] hover:border-[#00875A] hover:text-[#00875A]
                       hover:bg-[#EBF7F2] transition-all"
          >
            <svg
              width="13"
              height="13"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
            Kiosk Antrian
          </a>
          <a
            href="/display"
            className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-[#5A6A78]
                       rounded-xl border-[1.5px] border-[#E4ECF0] hover:border-[#00875A] hover:text-[#00875A]
                       hover:bg-[#EBF7F2] transition-all"
          >
            <svg
              width="13"
              height="13"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            Display Antrian
          </a>
        </div>
      </div>

      {/* Footer */}
      <p className="mt-7 text-center text-[11.5px] text-[#9AABBA]">
        RSUD Kotamobagu · Sistem Antrian Farmasi v2.0
      </p>
    </div>
  );
}
