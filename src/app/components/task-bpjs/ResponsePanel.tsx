import type {
  LastResponse,
  LogEntry,
} from "@/app/petugas-panggil/task-bpjs/page";
import type { TaskId } from "@/app/types/antrianTypes";

// ─────────────────────────────────────────────────────────────
//  ResponsePanel
// ─────────────────────────────────────────────────────────────
interface ResponsePanelProps {
  response: LastResponse | null;
  isSending: boolean;
}

export function ResponsePanel({ response, isSending }: ResponsePanelProps) {
  const badgeStyle = response
    ? response.ok
      ? { bg: "#E3F5EF", c: "#00875A", border: "#A7F3D0", label: "✓ Berhasil" }
      : { bg: "#FEE2E2", c: "#DC2626", border: "#FCA5A5", label: "✗ Gagal" }
    : { bg: "#F1F5F9", c: "#64748B", border: "#E2E8F0", label: "Menunggu" };

  return (
    <div className="bg-white rounded-[18px] shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <span className="w-1.5 h-4 rounded bg-purple-500 inline-block" />
          Response BPJS Terakhir
        </h2>
        <span
          className="text-xs px-3 py-1 rounded-full font-semibold border"
          style={{
            background: badgeStyle.bg,
            color: badgeStyle.c,
            borderColor: badgeStyle.border,
          }}
        >
          {isSending ? "⏳ Mengirim..." : badgeStyle.label}
        </span>
      </div>

      {/* Body */}
      <div
        className="font-mono text-xs leading-relaxed rounded-xl p-3 max-h-32 overflow-y-auto"
        style={{
          background: "#F8FAFC",
          border: "1.5px solid #E2E8F0",
          color: response ? "#334155" : "#94A3B8",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
          minHeight: 60,
        }}
      >
        {response
          ? JSON.stringify(response.body, null, 2)
          : "— Belum ada response —"}
      </div>

      {/* Stats */}
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[
          { label: "HTTP", value: response?.httpStatus ?? "—" },
          { label: "Code", value: response?.metaCode ?? "—" },
          {
            label: "Latency",
            value: response ? `${response.latencyMs}ms` : "—",
          },
        ].map((s) => (
          <div key={s.label} className="bg-slate-50 rounded-xl p-2">
            <p className="text-xs text-slate-400">{s.label}</p>
            <p className="font-mono text-sm font-bold text-slate-600 tabular-nums">
              {s.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  SendLog
// ─────────────────────────────────────────────────────────────
interface SendLogProps {
  logs: LogEntry[];
  onClear: () => void;
}

const TASK_LABEL: Record<TaskId | "farmasi", string> = {
  5: "Task 5",
  6: "Task 6",
  7: "Task 7",
  99: "Task 99",
  farmasi: "Daftar Farmasi",
};

export function SendLog({ logs, onClear }: SendLogProps) {
  return (
    <div className="bg-white rounded-[18px] shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <span className="w-1.5 h-4 rounded bg-slate-300 inline-block" />
          Riwayat Pengiriman
        </h2>
        <button
          onClick={onClear}
          className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          Hapus
        </button>
      </div>

      <div className="space-y-2 max-h-44 overflow-y-auto">
        {logs.length === 0 ? (
          <p className="text-xs text-slate-300 text-center py-4">
            Belum ada pengiriman
          </p>
        ) : (
          logs.map((log, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-2.5 rounded-xl text-xs"
              style={{ background: log.ok ? "#F0FDF4" : "#FFF1F2" }}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: log.ok ? "#00875A" : "#DC2626" }}
              />
              <span className="font-mono text-slate-400 shrink-0 tabular-nums">
                {log.time}
              </span>
              <span
                className="font-semibold shrink-0"
                style={{
                  color: log.ok ? "#334155" : "#DC2626",
                  fontWeight: 600,
                }}
              >
                {TASK_LABEL[log.taskId]}
              </span>
              <span className="font-mono text-slate-400 truncate flex-1">
                {log.kodeBooking}
              </span>
              <span
                className="font-mono shrink-0 tabular-nums"
                style={{ color: log.ok ? "#00875A" : "#DC2626" }}
              >
                {log.latencyMs > 0 ? `${log.latencyMs}ms` : "—"}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
