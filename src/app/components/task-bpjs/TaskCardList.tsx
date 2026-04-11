import type { Antrean, BpjsTaskInfo, TaskId } from "@/app/types/antrianTypes";

function fmtWaktu(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

// ── Config tiap task ──────────────────────────────────────────
const TASK_CONFIG: {
  id: TaskId;
  label: string;
  bg: string;
  color: string;
  numColor: string;
}[] = [
  {
    id: 5,
    label: "Selesai Poli → Mulai Tunggu Farmasi",
    bg: "#E3F5EF",
    color: "#00875A",
    numColor: "#00875A",
  },
  {
    id: 6,
    label: "Dipanggil Farmasi / Mulai Buat Obat",
    bg: "#FEF3C7",
    color: "#D97706",
    numColor: "#D97706",
  },
  {
    id: 7,
    label: "Obat Selesai Dibuat",
    bg: "#E8F3FB",
    color: "#1D6FA4",
    numColor: "#1D6FA4",
  },
  {
    id: 99,
    label: "Tidak Hadir / Batal",
    bg: "#FEE2E2",
    color: "#DC2626",
    numColor: "#DC2626",
  },
];

interface Props {
  antrean: Antrean;
  taskStatus: BpjsTaskInfo[];
  isSending: boolean;
  isRegistering: boolean; // sedang memanggil farmasi/add
  onKirim: (taskId: TaskId) => void;
  onDaftar: () => void; // panggil farmasi/add
}

export function TaskCardList({
  antrean,
  taskStatus,
  isSending,
  isRegistering,
  onKirim,
  onDaftar,
}: Props) {
  const statusMap = new Map(taskStatus.map((t) => [t.taskId, t]));

  // Lock logic:
  //   Semua task butuh farmasi terdaftar terlebih dahulu (farmasi/add)
  //   Task 6 butuh task 5 sukses, task 7 butuh task 6 sukses
  function isLocked(taskId: TaskId): boolean {
    if (!antrean.farmasiTerdaftar) return true;
    if (taskId === 6) return statusMap.get(5)?.status !== "sukses";
    if (taskId === 7) return statusMap.get(6)?.status !== "sukses";
    return false;
  }

  function isSent(taskId: TaskId): boolean {
    return statusMap.get(taskId)?.status === "sukses";
  }

  // Waktu yang akan dikirim — tampilkan sebagai hint
  function getWaktuHint(taskId: TaskId): string {
    switch (taskId) {
      case 5:
        return antrean.waktuDaftar
          ? `🕐 ${fmtWaktu(antrean.waktuDaftar)}`
          : "⚠ waktuDaftar belum ada";
      case 6:
        return antrean.WaktuPanggil
          ? `🕐 ${fmtWaktu(antrean.WaktuPanggil)}`
          : "⚠ Belum dipanggil petugas";
      case 7:
        return antrean.waktuSelesai
          ? `🕐 ${fmtWaktu(antrean.waktuSelesai)}`
          : "⚠ Belum selesai dilayani";
      case 99:
        return antrean.WaktuPanggil
          ? `🕐 ${fmtWaktu(antrean.WaktuPanggil)}`
          : "⚠ Belum ada waktu panggil";
    }
  }

  const noKodeBooking = !antrean.kodeBooking;
  const registered = antrean.farmasiTerdaftar;

  return (
    <div className="bg-white rounded-[18px] shadow-sm p-5">
      <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-4">
        <span className="w-1.5 h-4 rounded bg-[#00875A] inline-block" />
        Kirim Task ID ke BPJS
        <span className="text-xs font-normal text-slate-400 ml-1">
          — waktu dari layanan nyata
        </span>
      </h2>

      {noKodeBooking && (
        <div className="mb-3 p-3 rounded-xl text-xs text-amber-700 bg-amber-50 border border-amber-200">
          ⚠ Kode booking belum diisi — lengkapi data pasien di halaman Petugas
          Panggil dulu.
        </div>
      )}

      {/* ── Step 0: Daftarkan ke Antrian Farmasi BPJS ── */}
      <div
        className="mb-4 rounded-2xl border-2 p-3.5 flex items-center justify-between gap-3"
        style={{
          borderColor: registered ? "#A7F3D0" : "#E2E8F0",
          background: registered ? "#F0FDF8" : "#FAFAFA",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: registered ? "#E3F5EF" : "#F1F5F9" }}
          >
            {registered ? (
              <svg className="w-5 h-5 text-[#00875A]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            )}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-700">
              Daftar Antrian Farmasi BPJS
              <span
                className="font-mono text-xs ml-1.5 px-1.5 py-0.5 rounded-full"
                style={{ background: "#F1F5F9", color: "#64748B" }}
              >
                Prasyarat
              </span>
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {registered
                ? "Terdaftar — semua task ID siap dikirim"
                : "Wajib sebelum kirim task ID ke BPJS"}
            </p>
          </div>
        </div>

        {registered ? (
          <span
            className="text-xs px-2 py-1 rounded-lg font-semibold shrink-0"
            style={{ background: "#E3F5EF", color: "#00875A", border: "1px solid #A7F3D0" }}
          >
            ✓ Terdaftar
          </span>
        ) : (
          <button
            onClick={onDaftar}
            disabled={noKodeBooking || isRegistering}
            className="shrink-0 px-3 py-2 rounded-xl text-xs font-semibold text-white transition-opacity"
            style={{
              background: noKodeBooking ? "#CBD5E1" : "#00875A",
              opacity: isRegistering ? 0.7 : 1,
              cursor: noKodeBooking || isRegistering ? "not-allowed" : "pointer",
              minWidth: 90,
            }}
          >
            {isRegistering ? (
              <span className="flex items-center gap-1.5 justify-center">
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Mendaftar...
              </span>
            ) : "Daftarkan"}
          </button>
        )}
      </div>

      <div className="space-y-3">
        {TASK_CONFIG.map((task) => {
          const sent = isSent(task.id);
          const locked = isLocked(task.id) && !sent;
          const info = statusMap.get(task.id);
          const disabled = sent || locked || isSending || noKodeBooking;

          return (
            <button
              key={task.id}
              onClick={() => !disabled && onKirim(task.id)}
              disabled={disabled}
              className="w-full text-left rounded-2xl p-3.5 border-2 transition-all"
              style={{
                borderColor: sent ? "#00875A" : locked ? "#E2E8F0" : "#E2E8F0",
                background: sent ? "#F0FDF8" : "white",
                opacity: locked ? 0.4 : 1,
                cursor: disabled ? "not-allowed" : "pointer",
                transform: disabled ? "none" : undefined,
              }}
            >
              <div className="flex items-center justify-between gap-2">
                {/* Icon + label */}
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: task.bg }}
                  >
                    {task.id === 99 ? (
                      <svg
                        className="w-5 h-5"
                        style={{ color: task.color }}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    ) : (
                      <span
                        className="font-mono font-bold text-base"
                        style={{ color: task.numColor, fontWeight: 700 }}
                      >
                        {task.id}
                      </span>
                    )}
                  </div>

                  <div>
                    <p
                      className="text-sm font-bold text-slate-700"
                      style={{ fontWeight: 700 }}
                    >
                      {task.label}
                      {task.id === 99 && (
                        <span
                          className="font-mono text-xs ml-1.5 px-1.5 py-0.5 rounded-full"
                          style={{ background: "#FEF3C7", color: "#D97706" }}
                        >
                          99
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">
                      Kb: {antrean.kodeBooking ?? "—"}
                      {task.id === 6 &&
                        antrean.jenisResep &&
                        ` · ${antrean.jenisResep}`}
                    </p>
                    {/* Waktu hint */}
                    <p
                      className="text-xs mt-1"
                      style={{
                        color: sent
                          ? "#00875A"
                          : task.id === 6
                            ? "#D97706"
                            : task.id === 7
                              ? "#1D6FA4"
                              : "#00875A",
                      }}
                    >
                      {sent && info
                        ? `🕐 ${fmtWaktu(info.waktuEvent)}`
                        : getWaktuHint(task.id)}
                    </p>
                  </div>
                </div>

                {/* Status badge */}
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {isSending && !sent ? (
                    <span className="flex items-center gap-1 text-xs text-amber-600 font-semibold">
                      <svg
                        className="w-4 h-4 animate-spin"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                      >
                        <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Mengirim...
                    </span>
                  ) : sent ? (
                    <span
                      className="text-xs px-2 py-1 rounded-lg font-semibold"
                      style={{
                        background: "#E3F5EF",
                        color: "#00875A",
                        border: "1px solid #A7F3D0",
                      }}
                    >
                      ✓ Terkirim
                    </span>
                  ) : (
                    <>
                      <span
                        className="text-xs px-2 py-1 rounded-lg font-medium"
                        style={{
                          background: "#F1F5F9",
                          color: "#64748B",
                          border: "1px solid #E2E8F0",
                        }}
                      >
                        {locked ? "🔒 Terkunci" : "Belum kirim"}
                      </span>
                      {!locked && !disabled && (
                        <svg
                          className="w-5 h-5 text-slate-300"
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
                    </>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
