import type { Antrean } from "@/app/types/antrianTypes";

interface Props {
  data: Antrean[];
  onLengkapi: (nomor: string) => void;
}

export function NextPreview({ data, onLengkapi }: Props) {
  const waiting = data.filter((a) => a.status === "waiting").slice(0, 3);

  return (
    <div className="bg-white rounded-[18px] shadow-sm p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
        Antrian Berikutnya
      </p>

      <div className="space-y-2">
        {waiting.length === 0 ? (
          <p className="text-xs text-slate-300 text-center py-3">
            Tidak ada antrian menunggu
          </p>
        ) : (
          waiting.map((entry, i) => {
            const hasData = !!(
              entry.namaPasien &&
              entry.kodeBooking &&
              entry.jenisResep
            );
            return (
              <div
                key={entry.nomorAntrian}
                className="flex items-center justify-between p-3 rounded-xl"
                style={{ background: i === 0 ? "#FEF3C7" : "#F8FAFC" }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="font-mono text-base font-bold tabular-nums"
                    style={{
                      color: i === 0 ? "#D97706" : "#94A3B8",
                      fontWeight: 700,
                    }}
                  >
                    {entry.nomorAntrian}
                  </span>
                  <div>
                    <p
                      className={`text-sm font-medium ${entry.namaPasien ? "text-slate-700" : "text-slate-300 italic"}`}
                    >
                      {entry.namaPasien ?? "Data belum lengkap"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {entry.jenisResep ?? "—"}
                    </p>
                  </div>
                </div>

                {!hasData && (
                  <button
                    onClick={() => onLengkapi(entry.nomorAntrian)}
                    className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                    style={{ background: "#FEF3C7", color: "#D97706" }}
                  >
                    ⚠ Lengkapi
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
