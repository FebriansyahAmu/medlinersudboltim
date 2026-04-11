interface LogEntry {
  time: string;
  msg: string;
}

interface Props {
  logs: LogEntry[];
  onClear: () => void;
}

export function ActivityLog({ logs, onClear }: Props) {
  return (
    <div className="bg-white rounded-[18px] shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Log Aktivitas
        </p>
        <button
          onClick={onClear}
          className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          Hapus
        </button>
      </div>

      <div className="space-y-2 max-h-32 overflow-y-auto text-xs">
        {logs.length === 0 ? (
          <p className="text-slate-300 text-center py-3">Belum ada aktivitas</p>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="flex items-start gap-2 text-slate-500">
              <span className="font-mono text-slate-300 shrink-0 tabular-nums">
                {log.time}
              </span>
              <span>{log.msg}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
