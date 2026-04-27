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

// ── Step definitions (ordered: 5 → farmasi → 6 → 7) ──────────
type TaskStep = {
  kind: "task";
  id: TaskId;
  label: string;
  color: string;
  bg: string;
  getHint: (a: Antrean) => string;
};

type FarmasiStep = {
  kind: "farmasi";
  label: string;
  color: string;
  bg: string;
};

type Step = TaskStep | FarmasiStep;

const MAIN_STEPS: Step[] = [
  {
    kind: "task",
    id: 5,
    label: "Selesai Poli → Mulai Tunggu Farmasi",
    color: "#00875A",
    bg: "#E3F5EF",
    getHint: (a) => (a.waktuDaftar ? fmtWaktu(a.waktuDaftar) : ""),
  },
  {
    kind: "farmasi",
    label: "Daftar Antrian Farmasi BPJS",
    color: "#7C3AED",
    bg: "#F3F0FF",
  },
  {
    kind: "task",
    id: 6,
    label: "Dipanggil Farmasi / Mulai Buat Obat",
    color: "#D97706",
    bg: "#FEF3C7",
    getHint: (a) => (a.WaktuPanggil ? fmtWaktu(a.WaktuPanggil) : ""),
  },
  {
    kind: "task",
    id: 7,
    label: "Obat Selesai Dibuat",
    color: "#1D6FA4",
    bg: "#E8F3FB",
    getHint: (a) => (a.waktuSelesai ? fmtWaktu(a.waktuSelesai) : ""),
  },
];

interface Props {
  antrean: Antrean;
  taskStatus: BpjsTaskInfo[];
  isSending: boolean;
  isRegistering: boolean;
  onKirim: (taskId: TaskId) => void;
  onDaftar: () => void;
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
  const noKodeBooking = !antrean.kodeBooking;
  const registered = antrean.farmasiTerdaftar;

  function isTaskLocked(taskId: TaskId): boolean {
    if (taskId === 99 || taskId === 5) return false;
    if (taskId === 6) return !registered;
    if (taskId === 7) return statusMap.get(6)?.status !== "sukses";
    return false;
  }

  function isTaskSent(taskId: TaskId): boolean {
    return statusMap.get(taskId)?.status === "sukses";
  }

  const doneCount = [
    isTaskSent(5),
    registered,
    isTaskSent(6),
    isTaskSent(7),
  ].filter(Boolean).length;

  return (
    <div className="bg-white rounded-[18px] shadow-sm overflow-hidden">
      {/* ── Header + progress ── */}
      <div className="px-5 pt-5 pb-4 border-b border-slate-50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <span className="w-1.5 h-4 rounded bg-[#00875A] inline-block" />
            Kirim Task ID ke BPJS
          </h2>
          <span className="text-xs font-semibold text-slate-500 tabular-nums">
            {doneCount}/4 tahap
          </span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.round((doneCount / 4) * 100)}%`,
              background:
                doneCount === 4
                  ? "#00875A"
                  : "linear-gradient(90deg,#00875A 0%,#34D399 100%)",
            }}
          />
        </div>
        {noKodeBooking && (
          <div className="mt-3 p-3 rounded-xl text-xs text-amber-700 bg-amber-50 border border-amber-200 flex items-start gap-2">
            <svg
              className="w-3.5 h-3.5 mt-0.5 shrink-0"
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
            Kode booking belum diisi — lengkapi data pasien di halaman Petugas Panggil dulu.
          </div>
        )}
      </div>

      {/* ── Step list ── */}
      <div className="p-4 space-y-2.5">
        {MAIN_STEPS.map((step, idx) => {
          /* ── Farmasi registration ── */
          if (step.kind === "farmasi") {
            return (
              <div
                key="farmasi"
                className="rounded-2xl border-2 p-3.5 flex items-center gap-3 transition-all"
                style={{
                  borderColor: registered ? "#A7F3D0" : "#DDD6FE",
                  background: registered ? "#F0FDF8" : "#FAFAFA",
                }}
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold"
                  style={{
                    background: registered ? "#00875A" : step.color,
                    color: "#fff",
                  }}
                >
                  {registered ? (
                    <svg
                      className="w-4 h-4"
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
                  ) : (
                    idx + 1
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-700">
                    {step.label}
                  </p>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: registered ? "#00875A" : step.color }}
                  >
                    {registered
                      ? "Terdaftar — Task 6 & 7 siap dikirim"
                      : "Diperlukan sebelum kirim Task 6"}
                  </p>
                </div>

                {registered ? (
                  <span
                    className="text-xs px-2.5 py-1 rounded-lg font-semibold shrink-0"
                    style={{
                      background: "#E3F5EF",
                      color: "#00875A",
                      border: "1px solid #A7F3D0",
                    }}
                  >
                    ✓ Terdaftar
                  </span>
                ) : (
                  <button
                    onClick={onDaftar}
                    disabled={noKodeBooking || isRegistering}
                    className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold text-white transition-all"
                    style={{
                      background: noKodeBooking ? "#CBD5E1" : step.color,
                      opacity: isRegistering ? 0.7 : 1,
                      cursor:
                        noKodeBooking || isRegistering
                          ? "not-allowed"
                          : "pointer",
                      minWidth: 84,
                    }}
                  >
                    {isRegistering ? (
                      <span className="flex items-center gap-1.5 justify-center">
                        <svg
                          className="w-3 h-3 animate-spin"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                        >
                          <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Mendaftar...
                      </span>
                    ) : (
                      "Daftarkan"
                    )}
                  </button>
                )}
              </div>
            );
          }

          /* ── Task step (5, 6, 7) ── */
          const taskId = step.id;
          const sent = isTaskSent(taskId);
          const locked = isTaskLocked(taskId) && !sent;
          const info = statusMap.get(taskId);
          const disabled = sent || locked || isSending || noKodeBooking;
          const hint = step.getHint(antrean);

          return (
            <button
              key={taskId}
              onClick={() => !disabled && onKirim(taskId)}
              disabled={disabled}
              className="w-full text-left rounded-2xl border-2 p-3.5 transition-all group"
              style={{
                borderColor: sent ? "#A7F3D0" : "#E2E8F0",
                background: sent ? "#F0FDF8" : "white",
                opacity: locked ? 0.45 : 1,
                cursor: disabled ? "not-allowed" : "pointer",
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold"
                  style={
                    sent
                      ? { background: "#00875A", color: "#fff" }
                      : { background: step.bg, color: step.color }
                  }
                >
                  {sent ? (
                    <svg
                      className="w-4 h-4"
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
                  ) : (
                    idx + 1
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-slate-700">
                      {step.label}
                    </p>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-full font-mono font-semibold"
                      style={{ background: step.bg, color: step.color }}
                    >
                      Task {taskId}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">
                    Kb: {antrean.kodeBooking ?? "—"}
                    {taskId === 6 &&
                      antrean.jenisResep &&
                      ` · ${antrean.jenisResep}`}
                  </p>
                  <p
                    className="text-xs mt-1 font-medium"
                    style={{ color: sent ? "#00875A" : step.color }}
                  >
                    {sent && info
                      ? `🕐 ${fmtWaktu(info.waktuEvent)}`
                      : hint
                        ? `🕐 ${hint}`
                        : "⚠ Waktu belum tersedia"}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
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
                      className="text-xs px-2.5 py-1 rounded-lg font-semibold"
                      style={{
                        background: "#E3F5EF",
                        color: "#00875A",
                        border: "1px solid #A7F3D0",
                      }}
                    >
                      ✓ Terkirim
                    </span>
                  ) : locked ? (
                    <span
                      className="text-xs px-2.5 py-1 rounded-lg font-medium"
                      style={{
                        background: "#F1F5F9",
                        color: "#94A3B8",
                        border: "1px solid #E2E8F0",
                      }}
                    >
                      🔒 Terkunci
                    </span>
                  ) : (
                    <span
                      className="text-xs px-2.5 py-1 rounded-lg font-medium transition-colors group-hover:bg-slate-100"
                      style={{
                        background: "#F8FAFC",
                        color: "#64748B",
                        border: "1px solid #E2E8F0",
                      }}
                    >
                      Kirim →
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}

        {/* ── Danger zone: Task 99 ── */}
        <div className="pt-1">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-xs text-slate-400 font-medium px-1">
              Tindakan Khusus
            </span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          {(() => {
            const taskId = 99 as TaskId;
            const sent = isTaskSent(taskId);
            const info = statusMap.get(taskId);
            const disabled = sent || isSending || noKodeBooking;

            return (
              <button
                onClick={() => !disabled && onKirim(taskId)}
                disabled={disabled}
                className="w-full text-left rounded-2xl border-2 p-3.5 transition-all group"
                style={{
                  borderColor: sent ? "#FCA5A5" : "#FEE2E2",
                  background: sent ? "#FFF1F2" : "white",
                  cursor: disabled ? "not-allowed" : "pointer",
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "#FEE2E2" }}
                  >
                    {sent ? (
                      <svg
                        className="w-4 h-4 text-red-600"
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
                    ) : (
                      <svg
                        className="w-4 h-4 text-red-500"
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
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-700">
                        Tidak Hadir / Batal
                      </p>
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-mono font-semibold bg-red-50 text-red-500">
                        Task 99
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">
                      Kb: {antrean.kodeBooking ?? "—"}
                    </p>
                    <p className="text-xs mt-1 font-medium text-red-400">
                      {sent && info
                        ? `🕐 ${fmtWaktu(info.waktuEvent)}`
                        : antrean.WaktuPanggil
                          ? `🕐 ${fmtWaktu(antrean.WaktuPanggil)}`
                          : "⚠ Belum ada waktu panggil"}
                    </p>
                  </div>

                  <div className="shrink-0">
                    {sent ? (
                      <span
                        className="text-xs px-2.5 py-1 rounded-lg font-semibold"
                        style={{
                          background: "#FEE2E2",
                          color: "#DC2626",
                          border: "1px solid #FCA5A5",
                        }}
                      >
                        ✓ Terkirim
                      </span>
                    ) : (
                      <span
                        className="text-xs px-2.5 py-1 rounded-lg font-medium transition-colors group-hover:bg-red-50"
                        style={{
                          background: "#FFF1F2",
                          color: "#DC2626",
                          border: "1px solid #FEE2E2",
                        }}
                      >
                        Kirim →
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
