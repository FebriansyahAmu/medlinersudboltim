"use client";

type Props = {
  loading: boolean;
  onClick: () => void;
};

export default function AmbilButton({ loading, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full py-7 bg-gradient-to-br from-emerald-700 to-emerald-500 text-white rounded-2xl shadow-lg hover:-translate-y-1 transition"
    >
      <div className="flex flex-col items-center gap-1">
        <span className="text-lg font-bold">
          {loading ? "Memproses..." : "Ambil Nomor Antrian"}
        </span>

        <span className="text-xs opacity-80">Tiket akan dicetak otomatis</span>
      </div>
    </button>
  );
}
