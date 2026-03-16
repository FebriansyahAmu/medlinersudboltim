export default function Header() {
  return (
    <div className="text-center">
      <div className="w-14 h-14 bg-emerald-700 rounded-xl flex items-center justify-center mx-auto mb-3">
        <svg
          className="w-6 h-6 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
          <rect x="9" y="3" width="6" height="4" rx="1" />
        </svg>
      </div>

      <h1 className="text-xl font-bold text-slate-800">Antrian Farmasi BPJS</h1>

      <p className="text-sm text-slate-400">RSUD BOLTIM</p>
    </div>
  );
}
