"use client";

// ─────────────────────────────────────────────────────────────
//  app/display/page.tsx
//
//  Halaman display antrian untuk layar TV / monitor ruang tunggu.
//  Setara dengan 0-display-antrian.html
//
//  Tidak butuh login — diakses langsung di browser layar TV.
//  unitId diambil dari query param: /display?unitId=1
//
//  Realtime via SSE:
//    DIPANGGIL       → update nomor besar + TTS
//    NOMOR_BARU      → update daftar + stats
//    SELESAI         → update daftar + stats
//    TIDAK_HADIR     → update daftar + stats
//    STATS_UPDATE    → update stats langsung dari cache
// ─────────────────────────────────────────────────────────────

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAntreanStream } from "@/app/hooks/useAntreanStream";
import { useAntreanList, useStatsHariIni } from "@/app/hooks/useAntrean";
import type { AntreanEvent } from "@/app/types/antrianTypes";

import { DisplayHeader } from "@/app/components/display/DisplayHeader";
import { CallingDisplay } from "@/app/components/display/CallingDisplay";
import { QueueSidebar } from "@/app/components/display/QueueSidebar";
import { DisplayFooter } from "@/app/components/display/DisplayFooter";
import { Ticker } from "@/app/components/display/Ticker";

// ── TTS ───────────────────────────────────────────────────────
function speak(nomorAntrian: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const parts = nomorAntrian.split("-");
  const text = `Perhatian. Nomor antrian Farmasi, ${parts[0]}, ${parseInt(parts[1] ?? "0")}. Silakan menuju loket farmasi.`;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "id-ID";
  u.rate = 0.84;
  window.speechSynthesis.speak(u);
}

// ─────────────────────────────────────────────────────────────
export default function DisplayPage() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  // Resolve token → unitId (satu kali fetch, stale selamanya).
  const { data: unitInfo, isError: isTokenInvalid } = useQuery<{ id: number; kode: string; nama: string }>({
    queryKey: ["display-unit", token],
    queryFn: () =>
      fetch(`/api/display/resolve?token=${token}`).then((r) => {
        if (!r.ok) throw new Error("Token tidak valid");
        return r.json();
      }),
    enabled: !!token,
    staleTime: Infinity,
    retry: false,
  });

  const unitId = unitInfo?.id ?? 0;
  const ready = unitId > 0; // token sudah resolved ke unitId yang valid

  // Track nomor yang sedang dipanggil — untuk deteksi isNew
  const [prevNomor, setPrevNomor] = useState<string | null>(null);
  const [animate, setAnimate] = useState(false);

  // ── SSE — semua event diterima di sini ────────────────────
  const handleSSEEvent = useCallback((event: AntreanEvent) => {
    if (event.type === "DIPANGGIL") {
      speak(event.data.nomorAntrian);
    }
  }, []);

  useAntreanStream({
    unitId,
    token,
    enabled: ready,
    onEvent: handleSSEEvent,
  });

  // ── Queries ───────────────────────────────────────────────
  const { data: stats } = useStatsHariIni(unitId, { enabled: ready }, token);
  const { data: antrian } = useAntreanList({ unitId, token }, { enabled: ready });

  // ── Token invalid / tidak ada ─────────────────────────────
  if (!token || isTokenInvalid) {
    return (
      <div className="min-h-screen bg-[#F7F9FB] flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-bold text-slate-400 mb-2">Token Tidak Valid</p>
          <p className="text-sm text-slate-400">
            Akses halaman ini via URL yang diberikan admin.
            <br />
            Contoh: <code className="bg-slate-100 px-1 rounded">/display?token=xxxxx</code>
          </p>
        </div>
      </div>
    );
  }

  // ── Filter & sortir untuk TV display ─────────────────────
  // "batal" tidak ditampilkan di layar TV — tidak relevan bagi pasien.
  // Urutan: dipanggil → menunggu → selesai → tidak hadir
  const ORDER: Record<string, number> = {
    called:  0,
    waiting: 1,
    done:    2,
    absent:  3,
  };
  const sorted = [...(antrian ?? [])]
    .filter((a) => a.status !== "batal")
    .sort((a, b) => {
      const d = (ORDER[a.status] ?? 1) - (ORDER[b.status] ?? 1);
      return d !== 0
        ? d
        : new Date(a.waktuDaftar).getTime() - new Date(b.waktuDaftar).getTime();
    });

  const called = sorted.find((a) => a.status === "called") ?? null;

  // ── Deteksi nomor baru dipanggil → trigger animasi ────────
  useEffect(() => {
    const nomorBaru = called?.nomorAntrian ?? null;
    if (nomorBaru && nomorBaru !== prevNomor) {
      setPrevNomor(nomorBaru);
      setAnimate(true);
      const t = setTimeout(() => setAnimate(false), 500);
      return () => clearTimeout(t);
    }
    if (!nomorBaru) setPrevNomor(null);
  }, [called?.nomorAntrian, prevNomor]);

  return (
    <div
      className="min-h-screen bg-[#F7F9FB] text-[#334155]"
      style={{
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        overflow: "hidden",
        height: "100vh",
      }}
    >
      {/* ── Header ── */}
      <DisplayHeader unitId={unitId} />

      {/* ── Main ── */}
      <main
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 360px",
          overflow: "hidden",
        }}
      >
        {/* Kiri — nomor dipanggil */}
        <div
          className="flex flex-col items-center justify-center relative overflow-hidden"
          style={{ padding: "40px 48px 80px" }}
        >
          <CallingDisplay antrean={called} animate={animate} />

          {/* Ticker berjalan di bawah */}
          <Ticker />
        </div>

        {/* Kanan — daftar antrian */}
        <QueueSidebar data={sorted} stats={stats} />
      </main>

      {/* ── Footer ── */}
      <DisplayFooter />
    </div>
  );
}
