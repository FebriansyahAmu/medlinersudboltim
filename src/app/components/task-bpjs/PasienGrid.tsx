import type { Antrean } from "@/app/types/antrianTypes";

const STATUS_MAP: Record<string, { bg: string; c: string; label: string }> = {
  waiting: { bg: "#FEF3C7", c: "#D97706", label: "Menunggu" },
  called: { bg: "#E8F3FB", c: "#1D6FA4", label: "Dipanggil" },
  done: { bg: "#E3F5EF", c: "#00875A", label: "Selesai" },
  absent: { bg: "#FEE2E2", c: "#DC2626", label: "Absen" },
};

interface Props {
  data: Antrean[];
  selectedNomor: string | null;
  search: string;
  onSelect: (nomor: string) => void;
  onSearchChange: (val: string) => void;
}

export function PasienGrid({
  data,
  selectedNomor,
  search,
  onSelect,
  onSearchChange,
}: Props) {
  return (
    <div className="bg-white rounded-[18px] shadow-sm p-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between mb-4">
        <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <span className="w-1.5 h-4 rounded bg-[#1D6FA4] inline-block" />
          Pilih Pasien
        </h2>
        <div className="relative sm:w-60">
          <svg
            className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari nama / nomor..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl
                       focus:outline-none focus:border-[#00875A] focus:ring-2 focus:ring-[#00875A]/10"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-56 overflow-y-auto pr-1">
        {data.length === 0 ? (
          <div className="col-span-full py-6 text-center text-xs text-slate-400">
            {search ? (
              "Tidak ditemukan."
            ) : (
              <>
                Belum ada pasien.{" "}
                <a
                  href="/kiosk"
                  className="text-[#00875A] font-semibold underline"
                >
                  Ambil antrian →
                </a>
              </>
            )}
          </div>
        ) : (
          data.map((entry) => {
            const s = STATUS_MAP[entry.status] ?? STATUS_MAP.waiting;
            const isActive = entry.nomorAntrian === selectedNomor;

            return (
              <button
                key={entry.nomorAntrian}
                onClick={() => onSelect(entry.nomorAntrian)}
                className="p-3 rounded-xl border-2 text-left transition-all hover:border-green-300 hover:bg-green-50"
                style={{
                  borderColor: isActive ? "#00875A" : "#E2E8F0",
                  background: isActive ? "#F0FDF8" : "#fff",
                }}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span
                    className="font-mono text-base font-bold tabular-nums"
                    style={{
                      color: isActive ? "#00875A" : "#334155",
                      fontWeight: 700,
                    }}
                  >
                    {entry.nomorAntrian}
                  </span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: s.bg, color: s.c }}
                  >
                    {s.label}
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-600 truncate">
                  {entry.namaPasien || (
                    <span className="italic text-slate-300">Belum diisi</span>
                  )}
                </p>
                <p className="font-mono text-xs text-slate-400 mt-0.5 truncate">
                  {entry.kodeBooking || "—"}
                </p>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
