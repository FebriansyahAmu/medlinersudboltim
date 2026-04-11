// ─────────────────────────────────────────────────────────────
//  components/kiosk/CounterStrip.tsx
//
//  Menampilkan counter "Menunggu" dan "Total Hari Ini".
//  Data dari useStatsHariIni di parent (page.tsx).
// ─────────────────────────────────────────────────────────────

interface Props {
  menunggu: number;
  total: number;
  isLoading?: boolean;
}

export function CounterStrip({ menunggu, total, isLoading }: Props) {
  return (
    <div
      className="w-full bg-white rounded-2xl px-5 py-4 flex justify-around
                    shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.05)]"
    >
      {/* Menunggu */}
      <div className="text-center">
        <div
          className={`font-mono text-[28px] font-bold leading-none text-slate-800 tabular-nums
                        ${isLoading ? "opacity-30" : ""}`}
        >
          {menunggu}
        </div>
        <div className="text-[11px] text-slate-400 mt-1">Menunggu</div>
      </div>

      {/* Separator */}
      <div className="w-px bg-slate-100 self-stretch" />

      {/* Total */}
      <div className="text-center">
        <div
          className={`font-mono text-[28px] font-bold leading-none text-[#00875A] tabular-nums
                        ${isLoading ? "opacity-30" : ""}`}
        >
          {total}
        </div>
        <div className="text-[11px] text-slate-400 mt-1">Total Hari Ini</div>
      </div>
    </div>
  );
}
