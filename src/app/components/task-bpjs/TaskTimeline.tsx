import type { BpjsTaskInfo, TaskId } from "@/app/types/antrianTypes";

function fmtWaktu(iso: string): string {
  return new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

// ── Config per task ───────────────────────────────────────────
const TASK_CONFIG: {
  id: TaskId;
  label: string;
  sub: string;
}[] = [
  { id: 5, label: "Selesai Poli → Farmasi", sub: "Kode booking" },
  { id: 6, label: "Dipanggil Farmasi", sub: "Kode booking" },
  { id: 7, label: "Obat Selesai Dibuat", sub: "Kode booking" },
  { id: 99, label: "Batal / Tidak Hadir", sub: "Kapan saja" },
];

interface Props {
  taskStatus: BpjsTaskInfo[];
}

export function TaskTimeline({ taskStatus }: Props) {
  // Map taskId → info
  const statusMap = new Map(taskStatus.map((t) => [t.taskId, t]));

  return (
    <div className="bg-white rounded-[18px] shadow-sm p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">
        Progres Pengiriman
      </h2>

      <div className="space-y-0">
        {TASK_CONFIG.map((task, idx) => {
          const info = statusMap.get(task.id);
          const isDone = info?.status === "sukses";
          const isCancel = task.id === 99;
          const isLast = idx === TASK_CONFIG.length - 1;

          // Tentukan state circle
          const prevDone =
            idx > 0
              ? statusMap.get(TASK_CONFIG[idx - 1].id)?.status === "sukses"
              : true;
          const isActive = !isDone && prevDone && !isCancel;

          return (
            <div key={task.id} className="relative flex items-start gap-3 pb-4">
              {/* Garis vertikal */}
              {!isLast && (
                <div
                  className="absolute left-3.75 top-9 w-0.5"
                  style={{
                    height: "calc(100% - 12px)",
                    background: isDone ? "#00875A" : "#E2E8F0",
                    zIndex: 0,
                  }}
                />
              )}

              {/* Circle */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold relative z-10 transition-all"
                style={
                  isDone
                    ? {
                        background: "#00875A",
                        color: "#fff",
                        border: "2px solid #00875A",
                      }
                    : isActive
                      ? {
                          background: "#00875A",
                          color: "#fff",
                          border: "2px solid #00875A",
                          boxShadow: "0 0 0 4px rgba(0,135,90,.15)",
                          animation: "tpulse 2s ease infinite",
                        }
                      : isCancel
                        ? {
                            background: "#FEF3C7",
                            color: "#D97706",
                            border: "2px solid #FDE68A",
                          }
                        : {
                            background: "#F1F5F9",
                            color: "#94A3B8",
                            border: "2px solid #E2E8F0",
                          }
                }
              >
                {isDone ? (
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : isCancel ? (
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                ) : (
                  task.id
                )}
              </div>

              {/* Label */}
              <div className="flex-1 pt-0.5">
                <p
                  className={`text-sm font-semibold ${isDone || isActive ? "text-slate-700" : "text-slate-400"}`}
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
                <p className="text-xs text-slate-400">{task.sub}</p>
                {isDone && info && (
                  <p className="text-xs mt-1 text-[#00875A]">
                    ✓ Terkirim: {fmtWaktu(info.dikirimAt)}
                    {info.latencyMs ? ` · ${info.latencyMs}ms` : ""}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes tpulse {
          0%,100% { box-shadow: 0 0 0 4px rgba(0,135,90,.15); }
          50%      { box-shadow: 0 0 0 8px rgba(0,135,90,.06); }
        }
      `}</style>
    </div>
  );
}
