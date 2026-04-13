"use client";

// ─────────────────────────────────────────────────────────────
//  app/petugas/panggil/page.tsx
//
//  Halaman utama petugas pemanggil farmasi.
//  Setara dengan 2-petugas-panggil.html
//
//  Komponen:
//    StatsStrip       — counter Menunggu/Dipanggil/Selesai/Total
//    CallingPanel     — nomor sedang dipanggil + tombol aksi
//    ActivityLog      — log aktivitas real-time
//    QueueTable       — tabel antrian dengan tab filter
//    NextPreview      — 3 antrian berikutnya
//    ModalLengkapi    — modal input data pasien
// ─────────────────────────────────────────────────────────────

import { useState, useCallback } from "react";
import { useAuth, useLogout } from "@/app/hooks/useAuth";
import { useAntreanStream } from "@/app/hooks/useAntreanStream";
import {
  useAntreanList,
  useStatsHariIni,
  usePanggilBerikutnya,
  usePanggilNomor,
  usePanggilUlang,
  useLewati,
  useTandaiSelesai,
  useLengkapiData,
} from "@/app/hooks/useAntrean";
import type { AntreanEvent } from "@/app/types/antrianTypes";

import { StatsStrip } from "@/app/components/petugas/StatsStrip";
import { CallingPanel } from "@/app/components/petugas/CallingPanel";
import { ActivityLog } from "@/app/components/petugas/ActivityLog";
import { QueueTable } from "@/app/components/petugas/QueueTable";
import { NextPreview } from "@/app/components/petugas/NextPreview";
import { ModalLengkapi } from "@/app/components/petugas/ModalLengkapi";
import { Clock } from "@/app/components/petugas/Clock";

// ── TTS helper ────────────────────────────────────────────────
function speak(nomorAntrian: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const parts = nomorAntrian.split("-");
  const text = `Nomor antrian Farmasi, ${parts[0]}, ${parseInt(parts[1] ?? "0")}. Silakan menuju loket farmasi.`;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "id-ID";
  u.rate = 0.85;
  // Pilih voice Indonesia secara eksplisit agar tidak fallback ke default browser
  const idVoice = synth.getVoices().find((v) => v.lang.startsWith("id"));
  if (idVoice) u.voice = idVoice;
  synth.speak(u);
}

// ─────────────────────────────────────────────────────────────
export default function PetugasPanggilPage() {
  const { userId, unitId, nama, role, isLoading: authLoading } = useAuth();
  const { logout } = useLogout();

  // State lokal — hanya UI state (tab, search, modal, log)
  // Nomor "sedang dipanggil" TIDAK disimpan di sini; diturunkan dari
  // server supaya tetap persist saat pindah halaman / refresh.
  const [activeTab, setActiveTab] = useState<
    "waiting" | "called" | "done" | "absent"
  >("waiting");
  const [search, setSearch] = useState("");
  const [modalNomor, setModalNomor] = useState<string | null>(null);
  const [logs, setLogs] = useState<{ time: string; msg: string }[]>([]);

  // ── Log helper ───────────────────────────────────────────────
  const addLog = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    setLogs((prev) => [{ time, msg }, ...prev].slice(0, 50));
  }, []);

  // ── SSE — realtime ───────────────────────────────────────────
  const handleSSEEvent = useCallback(
    (event: AntreanEvent) => {
      switch (event.type) {
        case "DIPANGGIL":
          speak(event.data.nomorAntrian);
          addLog(
            `Memanggil ${event.data.nomorAntrian} — ${event.data.namaPasien ?? "—"}`,
          );
          break;
        case "PANGGIL_ULANG":
          speak(event.data.nomorAntrian);
          addLog(`Panggil ulang: ${event.data.nomorAntrian}`);
          break;
        case "SELESAI":
          addLog(`Selesai dilayani: ${event.data.nomorAntrian}`);
          break;
        case "TIDAK_HADIR":
          addLog(`Tidak hadir: ${event.data.nomorAntrian}`);
          break;
        case "DATA_DILENGKAPI":
          addLog(
            `Data dilengkapi: ${event.data.nomorAntrian} — ${event.data.namaPasien}`,
          );
          break;

        // Events di bawah ditangani oleh useAntreanStream via invalidateQueries.
        // onEvent hanya untuk side-effect UI (log, TTS) — tidak perlu aksi tambahan.
        case "NOMOR_BARU":
          addLog(
            `Nomor baru diambil: ${event.data.nomorAntrian} · Menunggu: ${event.data.totalMenunggu}`,
          );
          break;
        case "STATS_UPDATE":
          // Cache diupdate langsung oleh useAntreanStream — tidak perlu aksi di sini
          break;
        case "TASK_BPJS_TERKIRIM":
          // Hanya relevan di halaman kirim-task-bpjs — abaikan di halaman ini
          break;
      }
    },
    [addLog],
  );

  useAntreanStream({
    unitId: unitId ?? 0,
    enabled: !!unitId,
    onEvent: handleSSEEvent,
  });

  // ── Queries ──────────────────────────────────────────────────
  const { data: stats } = useStatsHariIni(unitId ?? 0, { enabled: !!unitId });
  const { data: antrian } = useAntreanList(
    { unitId: unitId ?? 0, status: activeTab, search },
    { enabled: !!unitId },
  );
  const { data: allAntrian } = useAntreanList(
    { unitId: unitId ?? 0 },
    { enabled: !!unitId },
  );

  // Data antrian yang sedang dipanggil — diturunkan dari server.
  // Hanya antrean status 'called' yang dilayani oleh user saat ini
  // yang dianggap "sedang dipanggil". Dengan begitu state tetap
  // bertahan saat petugas pindah halaman / reload.
  const currentAntrean =
    allAntrian?.find(
      (a) => a.status === "called" && a.dilayaniOlehId === userId,
    ) ?? null;
  const currentNomor = currentAntrean?.nomorAntrian ?? null;

  // ── Mutations ─────────────────────────────────────────────────
  const panggilBerikutnya = usePanggilBerikutnya(unitId ?? 0);
  const panggilNomor = usePanggilNomor(unitId ?? 0);
  const panggilUlang = usePanggilUlang(unitId ?? 0);
  const lewati = useLewati(unitId ?? 0);
  const tandaiSelesai = useTandaiSelesai(unitId ?? 0);
  const lengkapiData = useLengkapiData(unitId ?? 0);

  // ── Handlers ─────────────────────────────────────────────────
  function handlePanggilBerikutnya() {
    const next = allAntrian?.find((a) => a.status === "waiting");
    if (!next) return;

    // Kalau data belum lengkap → buka modal dulu
    if (!next.namaPasien || !next.kodeBooking || !next.jenisResep) {
      setModalNomor(next.nomorAntrian);
      return;
    }

    panggilBerikutnya.mutate(
      {},
      {
        onSuccess: (data) => {
          setActiveTab("called");
          addLog(`Memanggil ${data.nomorAntrian} — ${data.namaPasien ?? "—"}`);
        },
      },
    );
  }

  function handlePanggilNomor(nomorAntrian: string) {
    const entry = allAntrian?.find((a) => a.nomorAntrian === nomorAntrian);
    if (!entry) return;

    if (!entry.namaPasien || !entry.kodeBooking || !entry.jenisResep) {
      setModalNomor(nomorAntrian);
      return;
    }

    panggilNomor.mutate(nomorAntrian, {
      onSuccess: (data) => {
        setActiveTab("called");
        addLog(`Memanggil ${data.nomorAntrian} — ${data.namaPasien ?? "—"}`);
      },
    });
  }

  function handlePanggilUlang() {
    if (!currentNomor) return;
    // currentNomor sudah di-guard di atas — non-null assertion aman
    panggilUlang.mutate(currentNomor!);
    addLog(`Panggil ulang: ${currentNomor}`);
  }

  function handleLewati() {
    if (!currentNomor) return;
    const nomor = currentNomor;
    lewati.mutate(nomor, {
      onSuccess: () => {
        addLog(`Dilewati (tidak hadir): ${nomor}`);
        setActiveTab("waiting");
      },
    });
  }

  function handleSelesai(nomorAntrian?: string) {
    const nomor = nomorAntrian ?? currentNomor;
    if (!nomor) return;
    tandaiSelesai.mutate(nomor, {
      onSuccess: () => {
        addLog(`Selesai dilayani: ${nomor}`);
        if (nomor === currentNomor) {
          setActiveTab("waiting");
        }
      },
    });
  }

  function handleLengkapiData(data: {
    nomorAntrian: string;
    kodeBooking: string;
    namaPasien: string;
    jenisResep: "Non Racik" | "Racikan" | "Tidak ada";
  }) {
    lengkapiData.mutate(data, {
      onSuccess: () => {
        addLog(`Data dilengkapi: ${data.nomorAntrian} — ${data.namaPasien}`);
        setModalNomor(null);
        // Data dipastikan lengkap dari form — langsung mutate tanpa cek cache
        // (handlePanggilNomor tidak bisa dipakai karena allAntrian masih stale)
        panggilNomor.mutate(data.nomorAntrian, {
          onSuccess: (res) => {
            setActiveTab("called");
            addLog(`Memanggil ${res.nomorAntrian} — ${res.namaPasien ?? "—"}`);
          },
        });
      },
    });
  }

  // ── Loading state ─────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Memuat...</div>
      </div>
    );
  }

  if (!unitId || !userId) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-slate-500 text-sm">
          Sesi tidak valid — silakan login ulang.
        </div>
      </div>
    );
  }

  const isBusy = panggilBerikutnya.isPending || panggilNomor.isPending;

  return (
    <div className="min-h-screen bg-[#EEF2F7]">
      {/* ── Header ── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 gap-3">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-[#00875A] shrink-0 ">
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <span className="font-semibold text-slate-800 text-sm">
                Farmasi BPJS
              </span>
            </div>

            {/* Nav */}
            <nav className="flex items-center gap-1">
              <a
                href="/kiosk"
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-[#F0FDF8] hover:text-[#00875A] transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
                  />
                </svg>
                <span className="hidden sm:inline">Ambil Antrian</span>
              </a>
              <a
                href="/petugas-panggil"
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-[#E3F5EF] text-[#00875A]"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                <span className="hidden sm:inline">Petugas Panggil</span>
              </a>
              <a
                href="/petugas-panggil/task-bpjs"
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-[#F0FDF8] hover:text-[#00875A] transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
                <span className="hidden sm:inline">Kirim BPJS</span>
              </a>
              {role === "admin" && (
                <a
                  href="/pengaturan"
                  className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-[#F0FDF8] hover:text-[#00875A] transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span className="hidden sm:inline">Pengaturan</span>
                </a>
              )}
            </nav>

            {/* Clock + user + logout */}
            <div className="flex items-center gap-2">
              <Clock />
              {nama && (
                <span className="hidden sm:inline text-xs font-medium text-slate-500 max-w-30 truncate">
                  {nama}
                </span>
              )}
              <button
                onClick={logout}
                className="flex items-center cursor-pointer gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                title="Logout"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {/* Stats */}
        <StatsStrip stats={stats} className="mb-5" />

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* ── Kolom kiri ── */}
          <div className="lg:col-span-2 space-y-4">
            <CallingPanel
              antrean={currentAntrean}
              onPanggilBerikutnya={handlePanggilBerikutnya}
              onPanggilUlang={handlePanggilUlang}
              onLewati={handleLewati}
              onSelesai={() => handleSelesai()}
              isLoading={isBusy}
            />
            <ActivityLog logs={logs} onClear={() => setLogs([])} />
          </div>

          {/* ── Kolom kanan ── */}
          <div className="lg:col-span-3 space-y-4">
            <QueueTable
              data={antrian ?? []}
              allData={allAntrian ?? []}
              activeTab={activeTab}
              search={search}
              currentNomor={currentNomor}
              onTabChange={setActiveTab}
              onSearchChange={setSearch}
              onPanggil={handlePanggilNomor}
              onLengkapi={(nomor) => setModalNomor(nomor)}
              onSelesai={(nomor) => handleSelesai(nomor)}
              stats={stats}
            />
            <NextPreview
              data={allAntrian ?? []}
              onLengkapi={(nomor) => setModalNomor(nomor)}
            />
          </div>
        </div>
      </main>

      {/* ── Modal ── */}
      {modalNomor && (
        <ModalLengkapi
          nomorAntrian={modalNomor}
          antrean={
            allAntrian?.find((a) => a.nomorAntrian === modalNomor) ?? null
          }
          isLoading={lengkapiData.isPending}
          onSave={handleLengkapiData}
          onClose={() => setModalNomor(null)}
        />
      )}
    </div>
  );
}
