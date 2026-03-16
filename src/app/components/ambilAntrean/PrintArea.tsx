type Props = {
  nomor: string;
  waktu: string;
};

export default function PrintArea({ nomor, waktu }: Props) {
  return (
    <div className="hidden print:block w-[80mm] mx-auto text-center font-mono">
      <div className="text-sm font-bold uppercase">RSUD BOLTIM</div>

      <div className="text-xs">Instalasi Farmasi — BPJS</div>

      <hr className="border-t-2 border-black my-4" />

      <div className="text-xs uppercase">Nomor Antrian</div>

      <div className="text-6xl font-bold">{nomor}</div>

      <hr className="border-dashed border-black my-4" />

      <div className="text-xs">{waktu}</div>
    </div>
  );
}
