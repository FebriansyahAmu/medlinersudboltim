import type { Antrean } from "@/app/types/antrianTypes";

function fmtWaktu(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

interface Row {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  color?: string;
}

interface Props {
  antrean: Antrean;
}

export function PasienInfo({ antrean }: Props) {
  const rows: Row[] = [
    {
      label: "Nomor Antrian",
      value: antrean.nomorAntrian,
      mono: true,
      color: "#00875A",
    },
    { label: "Nama", value: antrean.namaPasien ?? "—" },
    { label: "Jenis Resep", value: antrean.jenisResep ?? "—" },
  ];

  const wRows: Row[] = [
    { label: "Waktu Daftar", value: fmtWaktu(antrean.waktuDaftar), mono: true },
    {
      label: "Waktu Dipanggil",
      value: fmtWaktu(antrean.WaktuPanggil),
      mono: true,
    },
    {
      label: "Waktu Selesai",
      value: fmtWaktu(antrean.waktuSelesai),
      mono: true,
    },
  ];

  return (
    <div className="bg-white rounded-[18px] shadow-sm p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
        Data Pasien Terpilih
      </h2>

      <div className="space-y-2 text-sm">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between gap-2 items-start">
            <span className="text-xs text-slate-400 shrink-0">{r.label}</span>
            <span
              className={
                r.mono
                  ? "font-mono font-semibold"
                  : "font-medium text-slate-700 text-right"
              }
              style={{ color: r.color ?? (r.mono ? "#334155" : undefined) }}
            >
              {r.value}
            </span>
          </div>
        ))}

        <div className="border-t border-slate-100 pt-2 mt-2">
          <div className="flex justify-between gap-2 items-start mb-1.5">
            <span className="text-xs text-slate-400">Kode Booking</span>
            <span className="font-mono text-sm font-bold text-[#1D6FA4] break-all text-right">
              {antrean.kodeBooking ?? (
                <span className="text-red-400 text-xs font-normal">
                  Belum diisi
                </span>
              )}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Dipakai untuk semua task (5, 6, 7, 99)
          </p>
        </div>

        <div className="border-t border-slate-100 pt-2 mt-2 space-y-1.5">
          {wRows.map((r) => (
            <div key={r.label} className="flex justify-between gap-2">
              <span className="text-xs text-slate-400">{r.label}</span>
              <span className="font-mono text-xs text-slate-600">
                {r.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
