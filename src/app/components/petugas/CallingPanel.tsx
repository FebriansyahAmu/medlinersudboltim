import type { Antrean } from "@/app/types/antrianTypes";

// ── JR Pill helper ────────────────────────────────────────────
const JR_COLORS: Record<string, [string, string]> = {
  "Non racikan": ["#E8F3FB", "#1D6FA4"],
  Racikan: ["#FEF3C7", "#D97706"],
  "Tidak ada": ["#F1F5F9", "#64748B"],
};

function JrPill({ jenisResep }: { jenisResep: string | null }) {
  if (!jenisResep) return null;
  const [bg, c] = JR_COLORS[jenisResep] ?? ["#F1F5F9", "#64748B"];
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ background: bg, color: c }}
    >
      {jenisResep}
    </span>
  );
}

// ── Format waktu dari ISO string ──────────────────────────────
function fmtWaktu(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

// ─────────────────────────────────────────────────────────────
interface Props {
  antrean?: Antrean | null;
  onPanggilBerikutnya: () => void;
  onPanggilUlang: () => void;
  onLewati: () => void;
  onSelesai: () => void;
  isLoading?: boolean;
}

export function CallingPanel({
  antrean,
  onPanggilBerikutnya,
  onPanggilUlang,
  onLewati,
  onSelesai,
  isLoading,
}: Props) {
  const hasActive = !!antrean;

  return (
    <div className="space-y-4">
      {/* ── Nomor dipanggil ── */}
      <div
        className="bg-white rounded-[18px] shadow-sm p-5"
        style={{
          border: hasActive ? "2px solid #00875A" : "2px solid transparent",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Sedang Dipanggil
          </p>
          {hasActive && (
            <span
              className="w-2 h-2 rounded-full bg-[#00875A]"
              style={{ animation: "pulse-dot 2s ease-in-out infinite" }}
            />
          )}
        </div>

        {/* Nomor besar */}
        <div className="text-center py-1">
          <p
            className="font-mono font-bold leading-none"
            style={{
              fontSize: "5rem",
              color: hasActive ? "#00875A" : "#94A3B8",
              letterSpacing: "-3px",
              fontWeight: 700,
            }}
          >
            {antrean?.nomorAntrian ?? "—"}
          </p>

          <p className="text-base font-semibold text-slate-700 mt-2 truncate px-2">
            {antrean?.namaPasien ?? "Belum ada"}
          </p>

          {/* Tags */}
          <div className="flex justify-center gap-2 mt-2 flex-wrap">
            {antrean?.jenisResep && <JrPill jenisResep={antrean.jenisResep} />}
            {hasActive && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: "#E3F5EF", color: "#00875A" }}
              >
                BPJS
              </span>
            )}
          </div>
        </div>

        {/* Detail info */}
        <div className="border-t border-slate-100 mt-4 pt-3 space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-400">Kode Booking</span>
            <span className="font-mono font-semibold text-slate-600">
              {antrean?.kodeBooking ?? "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Dipanggil pukul</span>
            <span className="font-mono font-semibold text-slate-600">
              {fmtWaktu(antrean?.WaktuPanggil)}
            </span>
          </div>
          {(antrean?.jumlahPanggilan ?? 0) > 1 && (
            <div className="flex justify-between">
              <span className="text-slate-400">Dipanggil ulang</span>
              <span className="font-mono font-semibold text-amber-600">
                {antrean!.jumlahPanggilan}×
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Tombol aksi ── */}
      <div className="space-y-3">
        {/* Panggil Berikutnya */}
        <button
          onClick={onPanggilBerikutnya}
          disabled={isLoading}
          className="w-full py-5 text-base rounded-2xl font-bold text-white flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(135deg, #00875A, #00A86B)",
            boxShadow: "0 6px 20px rgba(0,135,90,.35)",
          }}
        >
          {isLoading ? (
            <svg
              className="w-5 h-5 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          ) : (
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          )}
          Panggil Berikutnya
        </button>

        {/* Panggil Ulang + Lewati */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onPanggilUlang}
            disabled={!hasActive}
            className="py-3 text-sm rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(135deg,#D97706,#F59E0B)",
              boxShadow: "0 4px 14px rgba(217,119,6,.3)",
            }}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Panggil Ulang
          </button>

          <button
            onClick={onLewati}
            disabled={!hasActive}
            className="py-3 text-sm rounded-xl font-semibold text-red-600 border-2 border-red-200 bg-white flex items-center justify-center gap-2 transition-all hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 5l7 7-7 7M5 5l7 7-7 7"
              />
            </svg>
            Lewati
          </button>
        </div>

        {/* Tandai Selesai */}
        <button
          onClick={onSelesai}
          disabled={!hasActive}
          className="w-full py-3 text-sm rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(135deg,#1D6FA4,#2563EB)",
            boxShadow: "0 4px 14px rgba(29,111,164,.3)",
          }}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Tandai Selesai Dilayani
        </button>
      </div>
    </div>
  );
}
