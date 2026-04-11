"use client";

// ─────────────────────────────────────────────────────────────
//  components/kiosk/AmbilButton.tsx
//
//  Tombol besar "Ambil Nomor Antrian".
//  Saat isLoading: tampilkan spinner, tombol disabled.
//  Saat idle: tampilkan ikon tiket + teks.
// ─────────────────────────────────────────────────────────────

interface Props {
  isLoading: boolean;
  onClick: () => void;
}

export function AmbilButton({ isLoading, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className="
        w-full px-6 py-7 rounded-[20px] text-white border-none cursor-pointer
        disabled:cursor-not-allowed disabled:opacity-80
        active:scale-[.98] transition-all duration-150
        [-webkit-tap-highlight-color:transparent]
      "
      style={{
        background: "linear-gradient(135deg, #00875A 0%, #00A670 100%)",
        boxShadow: isLoading
          ? "0 4px 14px rgba(0,135,90,.3)"
          : "0 8px 28px rgba(0,135,90,.38)",
      }}
    >
      {/* Icon area */}
      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-2.5">
        {isLoading ? (
          <svg
            className="animate-spin"
            width="22"
            height="22"
            fill="none"
            stroke="#fff"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        ) : (
          <svg
            width="22"
            height="22"
            fill="none"
            stroke="#fff"
            viewBox="0 0 24 24"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
          </svg>
        )}
      </div>

      {/* Text */}
      <span className="block text-xl font-bold tracking-tight">
        {isLoading ? "Memproses..." : "Ambil Nomor Antrian"}
      </span>
      <span className="block text-xs opacity-75 mt-1">
        {isLoading ? "Mohon tunggu sebentar" : "Tiket akan dicetak otomatis"}
      </span>
    </button>
  );
}
