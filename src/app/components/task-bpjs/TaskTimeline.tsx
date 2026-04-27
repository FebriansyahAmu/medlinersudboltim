import type { BpjsTaskInfo, TaskId } from "@/app/types/antrianTypes";

function fmtWaktu(iso: string): string {
  return new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

// ── Timeline steps (same order as TaskCardList) ────────────────
type TimelineStep =
  | { kind: "task"; id: TaskId; label: string; sub: string; color: string; isCancel?: boolean }
  | { kind: "farmasi"; label: string; sub: string; color: string };

const STEPS: TimelineStep[] = [
  { kind: "task",    id: 5,  label: "Selesai Poli → Farmasi",    sub: "waktuDaftar",    color: "#00875A" },
  { kind: "farmasi",         label: "Daftar Antrian Farmasi",     sub: "farmasi/add BPJS", color: "#7C3AED" },
  { kind: "task",    id: 6,  label: "Dipanggil Farmasi",          sub: "waktuPanggil",   color: "#D97706" },
  { kind: "task",    id: 7,  label: "Obat Selesai Dibuat",        sub: "waktuSelesai",   color: "#1D6FA4" },
  { kind: "task",    id: 99, label: "Batal / Tidak Hadir",        sub: "opsional",       color: "#DC2626", isCancel: true },
];

interface Props {
  taskStatus: BpjsTaskInfo[];
  farmasiTerdaftar: boolean;
}

export function TaskTimeline({ taskStatus, farmasiTerdaftar }: Props) {
  const statusMap = new Map(taskStatus.map((t) => [t.taskId, t]));

  function isDone(step: TimelineStep): boolean {
    if (step.kind === "farmasi") return farmasiTerdaftar;
    return statusMap.get(step.id)?.status === "sukses";
  }

  const mainDone = STEPS.filter((s) => !(s.kind === "task" && s.isCancel) && isDone(s)).length;
  const mainTotal = STEPS.filter((s) => !(s.kind === "task" && s.isCancel)).length;

  return (
    <div className="bg-white rounded-[18px] shadow-sm p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Progres Pengiriman
        </h2>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full tabular-nums"
          style={{
            background: mainDone === mainTotal ? "#E3F5EF" : "#F1F5F9",
            color: mainDone === mainTotal ? "#00875A" : "#64748B",
          }}
        >
          {mainDone}/{mainTotal}
        </span>
      </div>

      <div className="space-y-0">
        {STEPS.map((step, idx) => {
          const done = isDone(step);
          const isLast = idx === STEPS.length - 1;
          const isCancel = step.kind === "task" && step.isCancel;
          const info = step.kind === "task" ? statusMap.get(step.id) : null;
          const { color } = step;

          const key = step.kind === "task" ? step.id : "farmasi";

          return (
            <div key={key} className="relative flex items-start gap-3 pb-4">
              {/* Connector */}
              {!isLast && (
                <div
                  className="absolute top-8 w-0.5 transition-colors duration-500"
                  style={{
                    left: "15px",
                    height: "calc(100% - 12px)",
                    background: done ? color : "#E2E8F0",
                  }}
                />
              )}

              {/* Circle */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold relative z-10 transition-all"
                style={
                  done
                    ? { background: color, color: "#fff", border: `2px solid ${color}` }
                    : isCancel
                      ? { background: "#FEF2F2", color: "#DC2626", border: "2px solid #FEE2E2" }
                      : { background: "#F1F5F9", color: "#94A3B8", border: "2px solid #E2E8F0" }
                }
              >
                {done ? (
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={3}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : isCancel ? (
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : step.kind === "task" ? (
                  step.id === 99 ? "99" : step.id
                ) : (
                  <svg
                    className="w-3.5 h-3.5"
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
                )}
              </div>

              {/* Label */}
              <div className="flex-1 pt-0.5 min-w-0">
                <p
                  className="text-sm font-semibold"
                  style={{ color: done ? "#334155" : "#94A3B8" }}
                >
                  {step.label}
                  {isCancel && (
                    <span
                      className="font-mono text-xs ml-1.5 px-1.5 py-0.5 rounded-full"
                      style={{ background: "#FEF3C7", color: "#D97706" }}
                    >
                      99
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-400">{step.sub}</p>

                {done && info && (
                  <p className="text-xs mt-1" style={{ color }}>
                    ✓ {fmtWaktu(info.dikirimAt)}
                    {info.latencyMs ? ` · ${info.latencyMs}ms` : ""}
                  </p>
                )}
                {done && step.kind === "farmasi" && (
                  <p className="text-xs mt-1" style={{ color }}>
                    ✓ Terdaftar
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
