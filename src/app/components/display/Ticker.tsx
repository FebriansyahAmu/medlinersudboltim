// ─────────────────────────────────────────────────────────────
//  components/display/Ticker.tsx
//
//  Ticker/marquee berjalan di bagian bawah panel kiri.
//  Teks diulang dua kali agar animasi seamless.
// ─────────────────────────────────────────────────────────────

const TEXT =
  "Selamat datang di Instalasi Farmasi BPJS Kesehatan RSUD BOLTIM \u00a0·\u00a0 " +
  "Silakan ambil nomor antrian dan menunggu dengan tertib \u00a0·\u00a0 " +
  "Obat jadi \u2264 30 menit \u00a0·\u00a0 Racikan \u2264 60 menit \u00a0·\u00a0 " +
  "Terima kasih atas kesabaran Anda \u00a0\u00a0\u00a0\u00a0";

export function Ticker() {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 flex items-center overflow-hidden"
      style={{ height: 36, background: "#00875A" }}
    >
      <div
        className="flex whitespace-nowrap"
        style={{ animation: "ticker 32s linear infinite" }}
      >
        <span
          className="font-medium"
          style={{
            fontSize: 11.5,
            color: "rgba(255,255,255,.85)",
            letterSpacing: 0.5,
            paddingRight: 80,
          }}
        >
          {TEXT}
        </span>
        {/* Duplikat untuk seamless loop */}
        <span
          className="font-medium"
          style={{
            fontSize: 11.5,
            color: "rgba(255,255,255,.85)",
            letterSpacing: 0.5,
            paddingRight: 80,
          }}
        >
          {TEXT}
        </span>
      </div>

      <style>{`
        @keyframes ticker {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
