// ─────────────────────────────────────────────────────────────
//  components/kiosk/PrintTicket.tsx
//
//  Tiket cetak thermal 80mm.
//  hidden di layar, print:block saat window.print() dipanggil.
//
//  Layout (atas → bawah):
//    ┌──────────────────────────┐
//    │  RSUD KOTAMOBAGU         │
//    │  Instalasi Farmasi BPJS  │
//    ├══════════════════════════╡  solid
//    │     NOMOR ANTRIAN        │
//    │                          │
//    │        F-001             │  besar
//    │                          │
//    │   Antrian ke-3           │
//    ├- - - - - - - - - - - - -╡  dashed
//    │  Tgl: Rabu, 11 Apr 2026  │
//    │  Pkl: 09:30:15 WITA      │
//    │  Menunggu: 2 pasien      │
//    ├══════════════════════════╡  solid
//    │  Harap menunggu di       │
//    │  ruang tunggu farmasi.   │
//    │  Data dilengkapi petugas │
//    └──────────────────────────┘
// ─────────────────────────────────────────────────────────────

interface Props {
  nomorAntrian: string;
  nomorUrut: number;
  waktuDaftar: string;    // ISO string dari API
  totalMenunggu: number;  // jumlah pasien menunggu saat tiket diambil
}

// ── Formatter ────────────────────────────────��────────────────
const DAYS   = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
const MONTHS = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

function formatTanggal(iso: string): string {
  const d = new Date(iso);
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function formatJam(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss} WITA`;
}

// ─────────────────────────────��───────────────────────────────
export function PrintTicket({ nomorAntrian, nomorUrut, waktuDaftar, totalMenunggu }: Props) {
  return (
    <div className="hidden print:block">
      <style>{`
        @media print {
          /* ── Halaman: lebar 80mm, tinggi otomatis ── */
          @page {
            size: 80mm auto;
            margin: 0;
          }

          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            box-sizing: border-box;
          }

          html, body {
            background: #fff !important;
            margin: 0;
            padding: 0;
          }

          /* ── Wrapper tiket ── */
          .tk-wrap {
            width: 72mm;          /* 80mm - 4mm padding kiri-kanan */
            margin: 0 auto;
            padding: 4mm 0 6mm;
            font-family: 'Courier New', Courier, monospace;
            font-size: 9pt;
            color: #000;
            text-align: center;
            line-height: 1.4;
          }

          /* ── Header RS ── */
          .tk-rs-name {
            font-size: 11pt;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .tk-rs-unit {
            font-size: 8.5pt;
            margin-top: 1mm;
          }

          /* ── Separator ── */
          .tk-line-solid {
            border: none;
            border-top: 1.5px solid #000;
            margin: 3mm 0;
          }

          .tk-line-dashed {
            border: none;
            border-top: 1px dashed #000;
            margin: 3mm 0;
          }

          .tk-line-double {
            border: none;
            border-top: 3px double #000;
            margin: 3mm 0;
          }

          /* ── Label kecil ── */
          .tk-label {
            font-size: 8pt;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 1mm;
          }

          /* ── Nomor antrian besar ── */
          .tk-nomor {
            font-size: 52pt;
            font-weight: 900;
            letter-spacing: -1px;
            line-height: 1;
            margin: 1mm 0 2mm;
          }

          /* ── Urut pasien ── */
          .tk-urut {
            font-size: 9.5pt;
            font-weight: 700;
          }

          /* ── Baris info (kiri-kanan) ── */
          .tk-info-row {
            display: flex;
            justify-content: space-between;
            text-align: left;
            font-size: 8.5pt;
            margin: 0.5mm 0;
          }

          .tk-info-key {
            color: #000;
            flex-shrink: 0;
          }

          .tk-info-val {
            font-weight: 700;
            text-align: right;
          }

          /* ── Footer ── */
          .tk-footer {
            font-size: 8pt;
            line-height: 1.55;
            margin-top: 1mm;
          }

          .tk-cut-line {
            display: flex;
            align-items: center;
            gap: 1.5mm;
            margin: 4mm 0 0;
            font-size: 7pt;
            color: #555;
            letter-spacing: 1px;
          }

          .tk-cut-line::before,
          .tk-cut-line::after {
            content: '';
            flex: 1;
            border-top: 1px dashed #999;
          }
        }
      `}</style>

      <div className="tk-wrap">

        {/* ── Header ── */}
        <div className="tk-rs-name">RSUD Kotamobagu</div>
        <div className="tk-rs-unit">Instalasi Farmasi — BPJS Kesehatan</div>

        <hr className="tk-line-double" />

        {/* ── Nomor antrian ── */}
        <div className="tk-label">Nomor Antrian</div>
        <div className="tk-nomor">{nomorAntrian}</div>
        <div className="tk-urut">Antrian ke-{nomorUrut}</div>

        <hr className="tk-line-dashed" />

        {/* ── Info detail ── */}
        <div className="tk-info-row">
          <span className="tk-info-key">Tanggal</span>
          <span className="tk-info-val">{formatTanggal(waktuDaftar)}</span>
        </div>
        <div className="tk-info-row">
          <span className="tk-info-key">Pukul</span>
          <span className="tk-info-val">{formatJam(waktuDaftar)}</span>
        </div>
        <div className="tk-info-row">
          <span className="tk-info-key">Menunggu</span>
          <span className="tk-info-val">
            {totalMenunggu} pasien di depan Anda
          </span>
        </div>

        <hr className="tk-line-solid" />

        {/* ── Footer ── */}
        <div className="tk-footer">
          Harap menunggu di ruang tunggu farmasi.<br />
          Nomor akan dipanggil melalui layar display.<br />
          Data akan dilengkapi oleh petugas.
        </div>

        {/* ── Garis potong ── */}
        <div className="tk-cut-line">POTONG DI SINI</div>

      </div>
    </div>
  );
}
