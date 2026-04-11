import type { StatsHariIni } from "@/app/types/antrianTypes";

interface Props {
  stats?: StatsHariIni;
  className?: string;
}

export function StatsStrip({ stats, className = "" }: Props) {
  const items = [
    { label: "Menunggu", value: stats?.menunggu ?? 0, color: "#D97706" },
    { label: "Dipanggil", value: stats?.dipanggil ?? 0, color: "#1D6FA4" },
    { label: "Selesai", value: stats?.selesai ?? 0, color: "#00875A" },
    { label: "Total", value: stats?.total ?? 0, color: "#334155" },
  ];

  return (
    <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 ${className}`}>
      {items.map(({ label, value, color }) => (
        <div key={label} className="bg-white rounded-[18px] shadow-sm p-4">
          <p className="text-xs text-slate-400">{label}</p>
          <p
            className="font-mono text-2xl font-bold mt-1 tabular-nums"
            style={{ color }}
          >
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}
