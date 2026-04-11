import type {
  Antrean,
  AntreanStatus,
  StatsHariIni,
} from "@/app/types/antrianTypes";

// Tab yang tampil di UI petugas panggil — 'batal' tidak ada tab-nya
export type TabStatus = Extract<
  AntreanStatus,
  "waiting" | "called" | "done" | "absent"
>;

// ── Helpers ───────────────────────────────────────────────────
const JR_COLORS: Record<string, [string, string]> = {
  "Non racikan": ["#E8F3FB", "#1D6FA4"],
  Racikan: ["#FEF3C7", "#D97706"],
  "Tidak ada": ["#F1F5F9", "#64748B"],
};

function JrPill({ jr }: { jr: string | null }) {
  if (!jr) return <span className="text-xs text-slate-300 italic">—</span>;
  const [bg, c] = JR_COLORS[jr] ?? ["#F1F5F9", "#64748B"];
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full"
      style={{ background: bg, color: c }}
    >
      {jr}
    </span>
  );
}

// ── Tab config ────────────────────────────────────────────────
const TABS: { key: TabStatus; label: string }[] = [
  { key: "waiting", label: "Menunggu" },
  { key: "called", label: "Dipanggil" },
  { key: "done", label: "Selesai" },
  { key: "absent", label: "Absen" },
];

const TAB_BADGE_COLORS: Record<string, string> = {
  waiting: "#D97706",
  called: "#1D6FA4",
  done: "#00875A",
};

// ─────────────────────────────────────────────────────────────
interface Props {
  data: Antrean[];
  allData: Antrean[];
  activeTab: TabStatus;
  search: string;
  currentNomor: string | null;
  stats?: StatsHariIni;
  onTabChange: (tab: TabStatus) => void;
  onSearchChange: (val: string) => void;
  onPanggil: (nomor: string) => void;
  onLengkapi: (nomor: string) => void;
  onSelesai: (nomor: string) => void;
}

export function QueueTable({
  data,
  allData,
  activeTab,
  search,
  currentNomor,
  stats,
  onTabChange,
  onSearchChange,
  onPanggil,
  onLengkapi,
  onSelesai,
}: Props) {
  // Hitung badge per tab dari allData
  const counts = allData.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* ── Tabs + Search ── */}
      <div className="bg-white rounded-[18px] shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          {/* Tabs */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
            {TABS.map(({ key, label }) => {
              const isActive = activeTab === key;
              const count = counts[key] ?? 0;
              const badgeCol = TAB_BADGE_COLORS[key] ?? "#94A3B8";

              return (
                <button
                  key={key}
                  onClick={() => onTabChange(key)}
                  className={`flex-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                    isActive
                      ? "bg-[#00875A] text-white"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {label}
                  {key !== "absent" && (
                    <span
                      className="ml-1 px-1.5 rounded-full text-white text-xs"
                      style={{
                        background: isActive
                          ? "rgba(255,255,255,.3)"
                          : badgeCol,
                      }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative sm:w-48">
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
              placeholder="Cari pasien..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#00875A] focus:ring-2 focus:ring-[#00875A]/10"
            />
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-[18px] shadow-sm overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <div className="col-span-2">Nomor</div>
          <div className="col-span-3">Nama</div>
          <div className="col-span-2 hidden sm:block">Resep</div>
          <div className="col-span-2 hidden md:block">Kode Booking</div>
          <div className="col-span-5 sm:col-span-3 text-right">Aksi</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
          {data.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Tidak ada data
            </div>
          ) : (
            data.map((entry) => {
              const noData =
                !entry.namaPasien || !entry.kodeBooking || !entry.jenisResep;
              const isCurrent = entry.nomorAntrian === currentNomor;

              return (
                <div
                  key={entry.nomorAntrian}
                  className={`grid grid-cols-12 gap-2 px-4 py-3 items-center transition-colors hover:bg-[#F8FFFE] ${
                    isCurrent ? "bg-green-50" : ""
                  }`}
                >
                  {/* Nomor */}
                  <div
                    className="col-span-2 font-mono text-sm font-bold tabular-nums"
                    style={{
                      color: isCurrent ? "#00875A" : "#334155",
                      fontWeight: 700,
                    }}
                  >
                    {entry.nomorAntrian}
                  </div>

                  {/* Nama */}
                  <div className="col-span-3">
                    {entry.namaPasien ? (
                      <p className="text-sm font-medium text-slate-700 truncate">
                        {entry.namaPasien}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-300 italic">
                        Belum diisi
                      </p>
                    )}
                  </div>

                  {/* Resep */}
                  <div className="col-span-2 hidden sm:block">
                    <JrPill jr={entry.jenisResep} />
                  </div>

                  {/* Kode booking */}
                  <div className="col-span-2 hidden md:block font-mono text-xs text-slate-400 truncate">
                    {entry.kodeBooking ?? "—"}
                  </div>

                  {/* Aksi */}
                  <div className="col-span-5 sm:col-span-3 flex justify-end">
                    {entry.status === "waiting" &&
                      (noData ? (
                        <button
                          onClick={() => onLengkapi(entry.nomorAntrian)}
                          className="text-xs px-2 py-1 rounded-lg font-semibold text-white flex items-center gap-1"
                          style={{ background: "#D97706" }}
                        >
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                          Lengkapi
                        </button>
                      ) : (
                        <button
                          onClick={() => onPanggil(entry.nomorAntrian)}
                          className="text-xs px-2 py-1 rounded-lg font-semibold text-white"
                          style={{ background: "#00875A" }}
                        >
                          Panggil
                        </button>
                      ))}
                    {entry.status === "called" && (
                      <button
                        onClick={() => onSelesai(entry.nomorAntrian)}
                        className="text-xs px-2 py-1 rounded-lg font-semibold text-white"
                        style={{ background: "#1D6FA4" }}
                      >
                        Selesai
                      </button>
                    )}
                    {(entry.status === "done" || entry.status === "absent") && (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
