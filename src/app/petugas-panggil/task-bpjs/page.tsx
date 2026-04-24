"use client";

// ─────────────────────────────────────────────────────────────
//  app/petugas/task-bpjs/page.tsx
//
//  Halaman kirim task ID ke API BPJS Kesehatan.
//  Setara dengan 3-kirim-task-bpjs.html
//
//  Alur:
//    1. Petugas pilih pasien dari grid
//    2. System tampilkan 4 card task (5, 6, 7, 99)
//    3. Petugas klik card → useKirimTaskBpjs.mutate()
//    4. Payload dikirim ke /api/antrean/:nomor/tasks
//    5. Server forward ke API BPJS → return response
//    6. UI update status card + timeline
//
//  Waktu tiap task diambil dari resolveWaktuTask():
//    Task 5  → waktuDaftar
//    Task 6  → waktuPanggil
//    Task 7  → waktuSelesai
//    Task 99 → waktuPanggil
// ─────────────────────────────────────────────────────────────

import { useState } from "react";
import { useAuth, useLogout } from "@/app/hooks/useAuth";
import { useAntreanStream } from "@/app/hooks/useAntreanStream";
import {
  useAntreanList,
  useAntreanDetail,
  useBpjsTaskStatus,
  useKirimTaskBpjs,
  useDaftarFarmasiBpjs,
  resolveWaktuTask,
} from "@/app/hooks/useAntrean";
import type { TaskId } from "@/app/types/antrianTypes";

import { Clock } from "@/app/components/petugas/Clock";
import { PasienGrid } from "@/app/components/task-bpjs/PasienGrid";
import { PasienInfo } from "@/app/components/task-bpjs/PasienInfo";
import { TaskTimeline } from "@/app/components/task-bpjs/TaskTimeline";
import { TaskCardList } from "@/app/components/task-bpjs/TaskCardList";
import {
  ResponsePanel,
  SendLog,
} from "@/app/components/task-bpjs/ResponsePanel";

// ── Tipe response terakhir ────────────────────────────────────
export interface LastResponse {
  ok: boolean;
  httpStatus: number;
  metaCode: string;
  latencyMs: number;
  body: object;
}

// ── Tipe log entry ─────────────────────────────────────────────
export interface LogEntry {
  time: string;
  taskId: TaskId | "farmasi"; // "farmasi" = hasil /antrean/farmasi/add
  kodeBooking: string;
  ok: boolean;
  latencyMs: number;
}

// ─────────────────────────────────────────────────────────────
export default function TaskBpjsPage() {
  const { unitId, nama, role } = useAuth();
  const { logout } = useLogout();
  const [selectedNomor, setSelectedNomor] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tanggal, setTanggal] = useState(""); // "" = hari ini, "YYYY-MM-DD" = historis
  const [lastResponse, setLastResponse] = useState<LastResponse | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [pendingTaskId, setPendingTaskId] = useState<TaskId | null>(null);

  // ── SSE — update grid pasien realtime ────────────────────────
  useAntreanStream({ unitId: unitId ?? 0, enabled: !!unitId });

  // ── Queries ──────────────────────────────────────────────────
  const { data: allAntrian } = useAntreanList(
    { unitId: unitId ?? 0, tanggal: tanggal || undefined },
    { enabled: !!unitId },
  );

  // Detail pasien terpilih — re-load fresh setiap pilih
  const { data: detail } = useAntreanDetail(
    unitId ?? 0,
    selectedNomor,
    tanggal || undefined,
    {
      enabled: !!selectedNomor && !!unitId,
    },
  );

  // Status task BPJS pasien terpilih
  const { data: taskStatus } = useBpjsTaskStatus(
    unitId ?? 0,
    selectedNomor,
    tanggal || undefined,
    {
      enabled: !!selectedNomor && !!unitId,
    },
  );

  // ── Mutations ─────────────────────────────────────────────────
  const daftar = useDaftarFarmasiBpjs(unitId ?? 0, tanggal || undefined);
  const kirim = useKirimTaskBpjs(unitId ?? 0, tanggal || undefined);

  // ── Handler: daftarkan antrian ke BPJS Farmasi (farmasi/add) ──
  function handleDaftar() {
    if (!selectedNomor) return;
    daftar.mutate(selectedNomor, {
      onSuccess: (data) => {
        setLastResponse({
          ok: data.ok,
          httpStatus: data.ok ? 200 : 400,
          metaCode: data.responseCode,
          latencyMs: data.latencyMs,
          body: data.responseBody ?? {},
        });
        const time = new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        });
        setLogs((prev) =>
          [
            {
              time,
              taskId: "farmasi" as const,
              kodeBooking: detail?.kodeBooking ?? "—",
              ok: data.ok,
              latencyMs: data.latencyMs,
            },
            ...prev,
          ].slice(0, 50),
        );
      },
    });
  }

  // ── Handler: tampilkan konfirmasi sebelum kirim ───────────────
  function handleKirim(taskId: TaskId) {
    if (!detail || !selectedNomor) return;
    if (!detail.kodeBooking) return;
    setPendingTaskId(taskId);
  }

  // ── Handler: eksekusi setelah konfirmasi ──────────────────────
  function handleConfirm() {
    if (!detail || !selectedNomor || pendingTaskId === null) return;
    const taskId = pendingTaskId;
    setPendingTaskId(null);

    const waktu = resolveWaktuTask(taskId, detail);
    const payload = {
      kodebooking: detail.kodeBooking!,
      taskid: taskId,
      waktu,
      ...(taskId !== 99 && detail.jenisResep
        ? { jenisresep: detail.jenisResep }
        : {}),
    };

    kirim.mutate(
      { nomorAntrian: selectedNomor, payload },
      {
        onSuccess: (data) => {
          const entry: LastResponse = {
            ok: data.ok,
            httpStatus: data.ok ? 200 : 400,
            metaCode: data.responseCode,
            latencyMs: data.latencyMs,
            body: data,
          };
          setLastResponse(entry);

          const time = new Date().toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          });
          setLogs((prev) =>
            [
              {
                time,
                taskId,
                kodeBooking: detail.kodeBooking!,
                ok: data.ok,
                latencyMs: data.latencyMs,
              },
              ...prev,
            ].slice(0, 50),
          );
        },
        onError: () => {
          const time = new Date().toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          });
          setLogs((prev) =>
            [
              {
                time,
                taskId,
                kodeBooking: detail.kodeBooking ?? "—",
                ok: false,
                latencyMs: 0,
              },
              ...prev,
            ].slice(0, 50),
          );
        },
      },
    );
  }

  // ── Filter pencarian pasien ───────────────────────────────────
  const filtered = (allAntrian ?? []).filter((e) => {
    if (!search) return true;
    const sv = search.toLowerCase();
    return (
      e.nomorAntrian.toLowerCase().includes(sv) ||
      (e.namaPasien ?? "").toLowerCase().includes(sv)
    );
  });

  const hasSelected = !!detail;

  return (
    <>
      <div className="min-h-screen bg-[#EEF2F7]">
        {/* ── Header ── */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14 gap-3">
              <div className="flex items-center gap-3">
                <img
                  src="/medline-log.png"
                  alt="MedLine"
                  className="w-8 h-8 rounded-xl object-contain"
                />
                <span className="font-extrabold text-slate-800 text-sm">
                  Farmasi BPJS
                </span>
              </div>

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
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                  <span className="hidden sm:inline">Petugas Panggil</span>
                </a>
                <a
                  href="/petugas-panggil/task-bpjs"
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
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="hidden sm:inline">Pengaturan</span>
                  </a>
                )}
              </nav>

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

        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
          {/* Notice */}
          <div
            className="rounded-2xl p-4 flex items-start gap-3 text-sm"
            style={{ background: "#E8F3FB", border: "1.5px solid #BFDBFE" }}
          >
            <svg
              className="w-5 h-5 mt-0.5 shrink-0 text-[#1D6FA4]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="text-[#1e3a5f]">
              <strong>Satu kode booking</strong> untuk semua task (5, 6, 7, 99)
              — diinput petugas saat melengkapi data. Waktu tiap task diambil
              otomatis dari waktu layanan nyata.
            </div>
          </div>

          {/* Pilih Pasien */}
          <PasienGrid
            data={filtered}
            selectedNomor={selectedNomor}
            search={search}
            tanggal={tanggal}
            onSelect={setSelectedNomor}
            onSearchChange={setSearch}
            onTanggalChange={(val) => {
              setTanggal(val);
              setSelectedNomor(null); // reset pilihan saat tanggal berubah
            }}
          />

          {/* Detail + Task panel */}
          {hasSelected && detail ? (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
              {/* Kiri — info + timeline */}
              <div className="lg:col-span-2 space-y-4">
                <PasienInfo antrean={detail} />
                <TaskTimeline taskStatus={taskStatus ?? []} />
              </div>

              {/* Kanan — task cards + response + log */}
              <div className="lg:col-span-3 space-y-4">
                <TaskCardList
                  antrean={detail}
                  taskStatus={taskStatus ?? []}
                  isSending={kirim.isPending}
                  isRegistering={daftar.isPending}
                  onKirim={handleKirim}
                  onDaftar={handleDaftar}
                />
                <ResponsePanel
                  response={lastResponse}
                  isSending={kirim.isPending}
                />
                <SendLog logs={logs} onClear={() => setLogs([])} />
              </div>
            </div>
          ) : (
            /* Empty state */
            <div className="bg-white rounded-[18px] shadow-sm p-12 text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 bg-[#E3F5EF]">
                <svg
                  className="w-8 h-8 text-[#00875A]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </div>
              <p className="text-sm font-semibold text-slate-600">
                Pilih pasien di atas untuk mengirim task ke BPJS
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Pastikan data pasien sudah dilengkapi di halaman Petugas
              </p>
            </div>
          )}
        </main>
      </div>

      {/* ── Modal Konfirmasi Kirim Task ── */}
      {pendingTaskId !== null && detail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            background: "rgba(15,23,42,0.55)",
            backdropFilter: "blur(2px)",
          }}
          onClick={() => setPendingTaskId(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{
                background: pendingTaskId === 99 ? "#FEE2E2" : "#E3F5EF",
              }}
            >
              {pendingTaskId === 99 ? (
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-6 h-6 text-[#00875A]"
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
              )}
            </div>

            {/* Judul */}
            <h3
              className="text-base font-bold text-center mb-1"
              style={{ color: pendingTaskId === 99 ? "#DC2626" : "#0F172A" }}
            >
              {pendingTaskId === 99
                ? "Konfirmasi Tidak Hadir / Batal"
                : `Konfirmasi Kirim Task ${pendingTaskId}`}
            </h3>

            {/* Deskripsi */}
            <p className="text-sm text-slate-500 text-center mb-4 leading-relaxed">
              {pendingTaskId === 99 ? (
                <>
                  Pasien{" "}
                  <strong className="text-slate-700">
                    {detail.namaPasien ?? detail.nomorAntrian}
                  </strong>{" "}
                  akan ditandai{" "}
                  <strong className="text-red-600">Tidak Hadir / Batal</strong>.
                  Tindakan ini akan dikirim ke BPJS dan tidak dapat dibatalkan.
                </>
              ) : (
                <>
                  Kirim{" "}
                  <strong className="text-slate-700">
                    Task {pendingTaskId}
                  </strong>{" "}
                  untuk pasien{" "}
                  <strong className="text-slate-700">
                    {detail.namaPasien ?? detail.nomorAntrian}
                  </strong>{" "}
                  ke server BPJS Kesehatan?
                </>
              )}
            </p>

            {/* Kode booking */}
            <div
              className="rounded-xl px-3 py-2 mb-5 text-xs font-mono text-center"
              style={{
                background: "#F8FAFC",
                border: "1.5px solid #E2E8F0",
                color: "#64748B",
              }}
            >
              Kode Booking:{" "}
              <span className="font-bold text-slate-700">
                {detail.kodeBooking}
              </span>
            </div>

            {/* Tombol */}
            <div className="flex gap-3">
              <button
                onClick={() => setPendingTaskId(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors"
                style={{
                  borderColor: "#E2E8F0",
                  color: "#64748B",
                  background: "white",
                }}
              >
                Batal
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
                style={{
                  background: pendingTaskId === 99 ? "#DC2626" : "#00875A",
                }}
              >
                Ya, Kirim
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
