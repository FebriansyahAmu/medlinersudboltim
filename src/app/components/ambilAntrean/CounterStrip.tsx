type Props = {
  menunggu: number;
  total: number;
};

export default function CounterStrip({ menunggu, total }: Props) {
  return (
    <div className="w-full bg-white rounded-xl shadow p-4 flex justify-around">
      <div className="text-center">
        <div className="text-2xl font-bold font-mono text-slate-800">
          {menunggu}
        </div>
        <div className="text-xs text-slate-400">Menunggu</div>
      </div>

      <div className="w-px bg-slate-100"></div>

      <div className="text-center">
        <div className="text-2xl font-bold font-mono text-emerald-700">
          {total}
        </div>
        <div className="text-xs text-slate-400">Total Hari Ini</div>
      </div>
    </div>
  );
}
