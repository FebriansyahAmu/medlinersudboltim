"use client";

// ─────────────────────────────────────────────────────────────
//  components/display/DisplayFooter.tsx
//
//  Footer display — catatan untuk pasien + indikator live SSE.
// ─────────────────────────────────────────────────────────────

export function DisplayFooter() {
  return (
    <footer
      className="bg-white flex items-center justify-between px-10"
      style={{ height: 40, borderTop: "1px solid #E8EEF4" }}
    >
      <p className="text-[11px] text-[#94A3B8]">
        Nomor Anda akan dipanggil — mohon tidak meninggalkan ruang tunggu
      </p>

      <div
        className="flex items-center gap-1.5 font-mono text-[11px]"
        style={{ color: "#00875A" }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{
            background: "#00875A",
            animation: "blink 1.6s ease-in-out infinite",
          }}
        />
        Live · realtime
        <style>{`
          @keyframes blink {
            0%, 100% { opacity: 1; }
            50%       { opacity: 0.2; }
          }
        `}</style>
      </div>
    </footer>
  );
}
