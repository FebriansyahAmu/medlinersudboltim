import type { Antrean } from "@/app/types/antrianTypes";

interface Props {
  antrean: Antrean | null;
  animate: boolean;
}

// ── JR pill ───────────────────────────────────────────────────
const JR_COLORS: Record<string, [string, string]> = {
  "Non racikan": ["#E8F5EF", "#00875A"],
  Racikan: ["#FEF3C7", "#B45309"],
  "Tidak ada": ["#F1F5F9", "#64748B"],
};

export function CallingDisplay({ antrean, animate }: Props) {
  const hasActive = !!antrean;
  const [jrBg, jrC] = antrean?.jenisResep
    ? (JR_COLORS[antrean.jenisResep] ?? ["#F1F5F9", "#64748B"])
    : ["", ""];

  return (
    <>
      {/* Status label */}
      <div
        className="flex items-center gap-2 mb-7"
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: 3,
          textTransform: "uppercase",
          color: "#94A3B8",
        }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{
            background: hasActive ? "#00875A" : "#94A3B8",
            animation: hasActive ? "blink 1.6s ease-in-out infinite" : "none",
          }}
        />
        <span>{hasActive ? "Sedang Dipanggil" : "Belum Ada Panggilan"}</span>
      </div>

      {/* Nomor besar */}
      <div
        className={animate ? "animate-fade-slide-up" : ""}
        style={{
          fontFamily: "serif",
          fontSize: "clamp(100px, 16vw, 180px)",
          lineHeight: 0.88,
          letterSpacing: -3,
          textAlign: "center",
          color: hasActive ? "#00875A" : "#CBD5E1",
          transition: "color .3s",
        }}
      >
        {antrean?.nomorAntrian ?? "—"}
      </div>

      {/* Garis divider */}
      <div
        className="rounded-full mx-auto my-6"
        style={{
          width: 60,
          height: 3,
          background: hasActive ? "#00875A" : "#E2E8F0",
          transition: "background .3s",
        }}
      />

      {/* Nama pasien */}
      <div
        style={{
          fontSize: "clamp(16px, 2.2vw, 24px)",
          fontWeight: 400,
          color: hasActive ? "#334155" : "#94A3B8",
          fontStyle: hasActive ? "normal" : "italic",
          textAlign: "center",
          letterSpacing: 0.2,
          maxWidth: 420,
        }}
      >
        {hasActive
          ? (antrean.namaPasien ?? "—")
          : "Silakan menunggu, petugas akan memanggil nomor Anda"}
      </div>

      {/* Jenis resep tag */}
      {hasActive && antrean.jenisResep && (
        <div
          className="mt-3.5 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold"
          style={{ background: jrBg, color: jrC }}
        >
          {antrean.jenisResep}
        </div>
      )}

      {/* CSS animasi nomor baru */}
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-slide-up {
          animation: fadeSlideUp .4s ease-out;
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.2; }
        }
      `}</style>
    </>
  );
}
