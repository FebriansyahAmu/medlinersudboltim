import type { Antrean, StatsHariIni } from "@/app/types/antrianTypes";

// ── Pill config ───────────────────────────────────────────────
const PILL: Record<string, { bg: string; color: string; label: string }> = {
  called:  { bg: "#E8F5EF", color: "#00875A", label: "Dipanggil" },
  waiting: { bg: "#FEF3C7", color: "#B45309", label: "Menunggu" },
  done:    { bg: "#E8EEF4", color: "#94A3B8", label: "Selesai" },
  absent:  { bg: "#FEE2E2", color: "#DC2626", label: "Tidak Hadir" },
  batal:   { bg: "#F1F5F9", color: "#94A3B8", label: "Batal" },
};

// ── Format HH:MM dari ISO ─────────────────────────────────────
function fmtHm(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// ── Jenis resep singkat ───────────────────────────────────────
const JR_SHORT: Record<string, string> = {
  "Non racikan": "Non Racikan",
  Racikan: "Racikan",
  "Tidak ada": "Tdk Ada",
};

// ─────────────────────────────────────────────────────────────
interface Props {
  data: Antrean[];
  stats?: StatsHariIni;
}

export function QueueSidebar({ data, stats }: Props) {
  return (
    <div
      className="bg-white flex flex-col overflow-hidden"
      style={{ borderLeft: "1px solid #E8EEF4" }}
    >
      {/* Header */}
      <div
        className="px-6 pt-5 pb-4"
        style={{ borderBottom: "1px solid #E8EEF4" }}
      >
        <h2 className="text-lg text-[#334155]">Daftar Antrian</h2>
      </div>

      {/* Stats strip */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: "repeat(3, 1fr)",
          borderBottom: "1px solid #E8EEF4",
        }}
      >
        {[
          { label: "Menunggu", value: stats?.menunggu ?? 0, color: "#B45309" },
          { label: "Selesai", value: stats?.selesai ?? 0, color: "#00875A" },
          { label: "Total", value: stats?.total ?? 0, color: "#334155" },
        ].map((s, i) => (
          <div
            key={s.label}
            className="py-3.5 text-center"
            style={{ borderRight: i < 2 ? "1px solid #E8EEF4" : "none" }}
          >
            <div
              className="font-mono font-bold leading-none tabular-nums"
              style={{ fontSize: 26, color: s.color }}
            >
              {s.value}
            </div>
            <div
              className="uppercase text-[#94A3B8] mt-1"
              style={{ fontSize: 10, letterSpacing: 1.5 }}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Daftar antrian */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ scrollbarWidth: "none" }}
      >
        {data.length === 0 ? (
          <div
            className="text-center italic text-[#94A3B8]"
            style={{ padding: "40px 0", fontSize: 13 }}
          >
            Belum ada antrian
          </div>
        ) : (
          data.map((entry) => {
            const pill = PILL[entry.status] ?? PILL.waiting;
            const isCalled = entry.status === "called";
            const isDim = entry.status === "done" || entry.status === "absent";
            const jr = entry.jenisResep
              ? (JR_SHORT[entry.jenisResep] ?? "—")
              : "—";
            const wkt = entry.waktuDaftar ? fmtHm(entry.waktuDaftar) : "—";

            return (
              <div
                key={entry.nomorAntrian}
                className="flex items-center gap-3 px-5"
                style={{
                  padding: "11px 20px",
                  borderBottom: "1px solid #E8EEF4",
                  background: isCalled ? "#E8F5EF" : "transparent",
                  opacity: isDim ? (entry.status === "done" ? 0.45 : 0.35) : 1,
                  transition: "background .2s",
                }}
              >
                {/* Nomor */}
                <div
                  style={{
                    fontFamily: "serif",
                    fontSize: 26,
                    lineHeight: 1,
                    width: 90,
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                    color: isCalled ? "#00875A" : isDim ? "#CBD5E1" : "#334155",
                  }}
                >
                  {entry.nomorAntrian}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div
                    className="font-medium truncate"
                    style={{
                      fontSize: 13,
                      color: entry.namaPasien ? "#334155" : "#94A3B8",
                      fontStyle: entry.namaPasien ? "normal" : "italic",
                    }}
                  >
                    {entry.namaPasien ?? "Belum diisi"}
                  </div>
                  <div
                    className="font-mono mt-0.5"
                    style={{ fontSize: 10, color: "#94A3B8" }}
                  >
                    {jr} · {wkt}
                  </div>
                </div>

                {/* Pill status */}
                <div
                  className="shrink-0 font-semibold uppercase rounded-full"
                  style={{
                    fontSize: 9,
                    letterSpacing: 1.5,
                    padding: "3px 9px",
                    background: pill.bg,
                    color: pill.color,
                  }}
                >
                  {pill.label}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
