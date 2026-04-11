"use client";

// ─────────────────────────────────────────────────────────────
//  app/kiosk/page.tsx
//
//  Halaman kiosk ambil nomor antrian farmasi.
//  Setara dengan 1-ambil-antrian.html
//
//  Alur:
//    1. Pasien tekan tombol "Ambil Nomor Antrian"
//    2. useAmbilNomor.mutate() → POST /api/antrean
//    3. Server generate nomorAntrian → simpan ke DB
//    4. Response: { nomorAntrian, waktuDaftar }
//    5. Tampilkan tiket di print area → window.print()
//    6. SSE event NOMOR_BARU dikirim server → counter semua
//       layar terupdate realtime
// ─────────────────────────────────────────────────────────────

import { useState } from "react";
// import { useAuth }                       from '@/app/hooks/useAuth'
import { useAntreanStream } from "@/app/hooks/useAntreanStream";
import { useAmbilNomor, useStatsHariIni } from "@/app/hooks/useAntrean";

import { CounterStrip } from "@/app/components/kiosk/CounterStrip";
import { AmbilButton } from "@/app/components/kiosk/AmbilButton";
import { PrintTicket } from "@/app/components/kiosk/PrintTicket";

// ── Tipe data tiket yang dicetak ──────────────────────────────
interface TicketData {
  nomorAntrian: string;
  nomorUrut: number;
  waktuDaftar: string; // ISO string dari API
  totalMenunggu: number; // jumlah pasien menunggu saat tiket diambil
}

// ─────────────────────────────────────────────────────────────
export default function KioskPage() {
  //   const { unitId } = useAuth();
  const unitId = 1;
  const [ticket, setTicket] = useState<TicketData | null>(null);

  // ── SSE — update counter realtime ────────────────────────────
  // Kiosk hanya butuh listen NOMOR_BARU dan STATS_UPDATE
  // agar counter "Menunggu" dan "Total" terupdate
  // saat ada pasien lain yang ambil nomor dari kiosk berbeda
  useAntreanStream({
    unitId: unitId ?? 0,
    enabled: !!unitId,
  });

  // ── Queries ──────────────────────────────────────────────────
  const { data: stats, isLoading: statsLoading } = useStatsHariIni(
    unitId ?? 0,
    { enabled: !!unitId },
  );

  // ── Mutation ─────────────────────────────────────────────────
  const ambil = useAmbilNomor(unitId ?? 0);

  // ── Handler ──────────────────────────────────────────────────
  function handleAmbil() {
    ambil.mutate(undefined, {
      onSuccess: (data) => {
        setTicket({
          nomorAntrian: data.nomorAntrian,
          nomorUrut: data.nomorUrut,
          waktuDaftar: data.waktuDaftar,
          totalMenunggu: stats?.menunggu ?? 0,
        });
        // Beri sedikit jeda agar print area ter-render dulu
        setTimeout(() => window.print(), 150);
      },
    });
  }

  return (
    <>
      {/* ── Screen (disembunyikan saat print) ── */}
      <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center px-6 print:hidden">
        <div className="w-full max-w-105 flex flex-col items-center gap-6">
          {/* Header */}
          <div className="text-center">
            <div className="w-13 h-13 bg-[#00875A] rounded-2xl flex items-center justify-center mx-auto mb-3">
              <svg
                width="26"
                height="26"
                fill="none"
                stroke="#fff"
                viewBox="0 0 24 24"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                <rect x="9" y="3" width="6" height="4" rx="1" />
                <path d="M9 12h6M9 16h4" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              Antrian Farmasi BPJS
            </h1>
            <p className="text-sm text-slate-400 mt-1">RSUD BOLTIM</p>
          </div>

          {/* Counter */}
          <CounterStrip
            menunggu={stats?.menunggu ?? 0}
            total={stats?.total ?? 0}
            isLoading={statsLoading}
          />

          {/* Tombol ambil */}
          <AmbilButton isLoading={ambil.isPending} onClick={handleAmbil} />

          {/* Catatan */}
          <p className="text-xs text-slate-300 text-center leading-relaxed">
            Serahkan tiket kepada petugas farmasi.
            <br />
            Harap menunggu di ruang tunggu.
          </p>
        </div>
      </div>

      {/* ── Print area (hanya muncul saat print) ── */}
      {ticket && (
        <PrintTicket
          nomorAntrian={ticket.nomorAntrian}
          nomorUrut={ticket.nomorUrut}
          waktuDaftar={ticket.waktuDaftar}
          totalMenunggu={ticket.totalMenunggu}
        />
      )}
    </>
  );
}
