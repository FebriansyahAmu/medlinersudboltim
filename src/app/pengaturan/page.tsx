"use client";

// ─────────────────────────────────────────────────────────────
//  app/pengaturan/page.tsx
//
//  Halaman pengaturan — hanya admin.
//  Fitur saat ini: manajemen display token per unit.
//
//  Alur:
//    1. Fetch GET /api/units → list unit + status token
//    2. Admin klik "Generate" → POST /api/units/:id/display-token
//       → server kembalikan { token, url } → tampilkan modal URL
//    3. Admin klik "Cabut"  → DELETE /api/units/:id/display-token
//       → token dihapus, display TV langsung invalid
// ─────────────────────────────────────────────────────────────

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/hooks/useAuth";

interface UnitRow {
  id: number;
  kode: string;
  nama: string;
  jenis: string;
  lantai: number | null;
  hasToken: boolean;
  tokenPreview: string | null;
  displayUrl: string | null;
}

interface GenerateResult {
  token: string;
  url: string;
}

// ── API helpers ───────────────────────────────────────────────

async function fetchUnits(): Promise<UnitRow[]> {
  const res = await fetch("/api/units");
  if (!res.ok) throw new Error("Gagal memuat data unit");
  return res.json();
}

async function generateToken(unitId: number): Promise<GenerateResult> {
  const res = await fetch(`/api/units/${unitId}/display-token`, {
    method: "POST",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { message?: string }).message ?? "Gagal generate token",
    );
  }
  return res.json();
}

async function revokeToken(unitId: number): Promise<void> {
  const res = await fetch(`/api/units/${unitId}/display-token`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { message?: string }).message ?? "Gagal mencabut token",
    );
  }
}

// ── Komponen utama ────────────────────────────────────────────

export default function PengaturanPage() {
  const router = useRouter();
  const { role, isLoading: authLoading } = useAuth();
  const qc = useQueryClient();

  const [result, setResult] = useState<GenerateResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedUnitId, setCopiedUnitId] = useState<number | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<UnitRow | null>(null);

  // Guard admin — proxy sudah blok non-admin, ini safety extra di UI
  if (!authLoading && role && role !== "admin") {
    router.replace("/petugas-panggil");
    return null;
  }

  const { data: units, isLoading } = useQuery<UnitRow[]>({
    queryKey: ["units"],
    queryFn: fetchUnits,
    staleTime: 30_000,
    enabled: role === "admin",
  });

  const generateMutation = useMutation({
    mutationFn: generateToken,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["units"] });
      setResult(data);
    },
  });

  const revokeMutation = useMutation({
    mutationFn: revokeToken,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["units"] });
      setConfirmRevoke(null);
    },
  });

  const handleCopy = useCallback((url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  // ── Loading ───────────────────────────────────────────────
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#F4F7FA] flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
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
          <span className="text-sm">Memuat...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7FA]">
      {/* ── Topbar ── */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/petugas-panggil")}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1 -ml-1"
            >
              <svg
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <div>
              <h1 className="text-base font-bold text-slate-800">Pengaturan</h1>
              <p className="text-xs text-slate-400">Manajemen Display Token</p>
            </div>
          </div>
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ background: "#E3F5EF", color: "#00875A" }}
          >
            Admin
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-4">
        {/* ── Info banner ── */}
        <div
          className="rounded-2xl p-4 flex items-start gap-3"
          style={{ background: "#EBF5FB", border: "1px solid #BEE3F8" }}
        >
          <svg
            width="18"
            height="18"
            fill="none"
            stroke="#1D6FA4"
            viewBox="0 0 24 24"
            strokeWidth={2}
            className="shrink-0 mt-0.5"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div className="text-sm text-[#1D6FA4]">
            <p className="font-semibold mb-0.5">
              Cara setup layar TV / Display
            </p>
            <p className="text-xs leading-relaxed opacity-80">
              Generate token untuk setiap unit, lalu buka URL yang dihasilkan di
              browser layar TV. Token bisa di-rotate kapan saja — URL lama
              langsung tidak berlaku.
            </p>
          </div>
        </div>

        {/* ── Tabel unit ── */}
        <div className="bg-white rounded-[18px] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-50">
            <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <span className="w-1.5 h-4 rounded bg-[#00875A] inline-block" />
              Unit Layanan
            </h2>
          </div>

          {!units?.length ? (
            <div className="px-5 py-10 text-center text-sm text-slate-400">
              Tidak ada unit aktif.
            </div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {units.map((unit) => (
                <li key={unit.id} className="px-5 py-4 flex items-center gap-4">
                  {/* Kode badge */}
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 font-mono font-bold text-sm"
                    style={{ background: "#F0FDF8", color: "#00875A" }}
                  >
                    {unit.kode.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">
                      {unit.nama}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {unit.kode}
                      {unit.lantai ? ` · Lantai ${unit.lantai}` : ""}
                      {" · "}
                      <span className="capitalize">{unit.jenis}</span>
                    </p>
                    {/* Token preview */}
                    {unit.hasToken && (
                      <p className="text-xs text-slate-400 mt-1 font-mono">
                        Token aktif:{" "}
                        <span className="text-[#00875A]">
                          {unit.tokenPreview}
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Status badge */}
                  <div className="shrink-0">
                    {unit.hasToken ? (
                      <span
                        className="text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: "#E3F5EF", color: "#00875A" }}
                      >
                        ✓ Aktif
                      </span>
                    ) : (
                      <span
                        className="text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: "#F1F5F9", color: "#94A3B8" }}
                      >
                        Belum ada
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {unit.hasToken && unit.displayUrl && (
                      <button
                        onClick={() => {
                          navigator.clipboard
                            .writeText(unit.displayUrl!)
                            .then(() => {
                              setCopiedUnitId(unit.id);
                              setTimeout(() => setCopiedUnitId(null), 2000);
                            });
                        }}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5"
                        style={{
                          background:
                            copiedUnitId === unit.id ? "#E3F5EF" : "#EBF5FB",
                          color:
                            copiedUnitId === unit.id ? "#00875A" : "#1D6FA4",
                          border: `1px solid ${copiedUnitId === unit.id ? "#A7F3D0" : "#BEE3F8"}`,
                        }}
                        title="Salin URL display"
                      >
                        {copiedUnitId === unit.id ? (
                          <>
                            <svg
                              width="12"
                              height="12"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              strokeWidth={2.5}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            Tersalin
                          </>
                        ) : (
                          <>
                            <svg
                              width="12"
                              height="12"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              strokeWidth={2}
                            >
                              <rect
                                x="9"
                                y="9"
                                width="13"
                                height="13"
                                rx="2"
                                ry="2"
                              />
                              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                            </svg>
                            Salin URL
                          </>
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => generateMutation.mutate(unit.id)}
                      disabled={generateMutation.isPending}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
                      style={{ background: "#00875A", color: "#fff" }}
                    >
                      {unit.hasToken ? "Rotate" : "Generate"}
                    </button>
                    {unit.hasToken && (
                      <button
                        onClick={() => setConfirmRevoke(unit)}
                        disabled={revokeMutation.isPending}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
                        style={{
                          background: "#FEE2E2",
                          color: "#DC2626",
                          border: "1px solid rgba(220,38,38,.15)",
                        }}
                      >
                        Cabut
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      {/* ── Modal: hasil generate ── */}
      {result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-3xl p-7 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "#E3F5EF" }}
              >
                <svg
                  width="18"
                  height="18"
                  fill="none"
                  stroke="#00875A"
                  viewBox="0 0 24 24"
                  strokeWidth={2.2}
                >
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Token Berhasil Dibuat
                </h3>
                <p className="text-xs text-slate-400">
                  Simpan URL berikut untuk dikonfigurasi di TV
                </p>
              </div>
            </div>

            {/* URL box */}
            <div
              className="rounded-xl p-3 mb-4 flex items-center gap-2"
              style={{ background: "#F8FAFC", border: "1.5px solid #E2E8F0" }}
            >
              <p className="text-xs font-mono text-slate-600 flex-1 break-all leading-relaxed">
                {result.url}
              </p>
              <button
                onClick={() => handleCopy(result.url)}
                className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                style={{
                  background: copied ? "#E3F5EF" : "#F1F5F9",
                  color: copied ? "#00875A" : "#64748B",
                }}
              >
                {copied ? "✓ Tersalin" : "Salin"}
              </button>
            </div>

            <div
              className="rounded-xl p-3 mb-5 text-xs text-amber-700"
              style={{
                background: "#FFFBEB",
                border: "1px solid rgba(217,119,6,.2)",
              }}
            >
              ⚠ Token hanya ditampilkan sekali. Catat URL ini sebelum menutup
              dialog.
            </div>

            <button
              onClick={() => {
                setResult(null);
                setCopied(false);
              }}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ background: "#00875A" }}
            >
              Selesai
            </button>
          </div>
        </div>
      )}

      {/* ── Modal: konfirmasi cabut ── */}
      {confirmRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-3xl p-7 w-full max-w-sm shadow-2xl">
            <div className="text-center mb-5">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: "#FEE2E2" }}
              >
                <svg
                  width="20"
                  height="20"
                  fill="none"
                  stroke="#DC2626"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-slate-800 mb-1">
                Cabut Token — {confirmRevoke.nama}?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Layar TV yang menggunakan token ini akan langsung tidak bisa
                mengakses data. Aksi ini tidak bisa dibatalkan.
              </p>
            </div>

            {revokeMutation.isError && (
              <p className="text-xs text-red-600 text-center mb-3">
                {(revokeMutation.error as Error).message}
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setConfirmRevoke(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-600 transition-all"
                style={{ background: "#F1F5F9" }}
              >
                Batal
              </button>
              <button
                onClick={() => revokeMutation.mutate(confirmRevoke.id)}
                disabled={revokeMutation.isPending}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60"
                style={{ background: "#DC2626" }}
              >
                {revokeMutation.isPending ? "Mencabut..." : "Ya, Cabut"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
