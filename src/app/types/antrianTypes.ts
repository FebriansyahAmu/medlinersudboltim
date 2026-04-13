// ── Status antrian ────────────────────────────────────────────
// 'waiting'  → pasien ambil nomor, belum dipanggil
// 'called'   → petugas klik Panggil / Panggil Berikutnya
// 'done'     → petugas klik Tandai Selesai
// 'absent'   → petugas klik Lewati (tidak hadir)
// 'batal'    → dibatalkan admin sebelum dipanggil

export type AntreanStatus = "waiting" | "called" | "done" | "absent" | "batal";

// ── Jenis resep ───────────────────────────────────────────────
// Nilai ini dipakai sebagai label langsung di UI
export type JenisResep = "Non Racik" | "Racikan" | "Tidak ada";

// ── Status task BPJS ──────────────────────────────────────────
export type TaskStatus = "sukses" | "gagal" | "pending";

// ── Task ID BPJS ─────────────────────────────────────────────
// 5  → selesai poli, mulai tunggu farmasi  (waktu = waktuDaftar)
// 6  → dipanggil / mulai buat obat         (waktu = waktuPanggil)
// 7  → obat selesai dibuat                 (waktu = waktuSelesai)
// 99 → tidak hadir / batal                 (waktu = waktuPanggil)
export type TaskId = 5 | 6 | 7 | 99;

// ── Data satu antrian ─────────────────────────────────────────
// Representasi satu baris dari tabel `antreans` + view `antrian_aktif`
export interface Antrean {
  id: number;
  nomorAntrian: string; //Contoh: 'F-001','F-002'
  nomorUrut: number; //untuk sorting

  //Data BPJS - NULL samapai petugas lengkapi
  kodeBooking: string | null;
  namaPasien: string | null;
  noSep: string | null;
  noBPJS: string | null;

  jenisResep: JenisResep | null;
  status: AntreanStatus;

  //Relasi (dari JOIN di view antrean_aktif)
  loket: string | null;
  petugas: string | null; //nama petugas yang melayani
  dilayaniOlehId: number | null; //id user petugas — untuk derive "sedang dipanggil oleh saya"

  //Timestamp - string ISO dari API, null jika belum terjadi
  waktuDaftar: string;
  WaktuPanggil: string | null;
  waktuSelesai: string | null;

  jumlahPanggilan: number;
  farmasiTerdaftar: boolean; // true setelah /antrean/farmasi/add berhasil dikirim ke BPJS
}

// ── Data stats harian ─────────────────────────────────────────
// Dari view `stats_hari_ini`
export interface StatsHariIni {
  unitId: number;
  total: number;
  menunggu: number;
  dipanggil: number;
  selesai: number;
  tidakHadir: number;
  rataLamaLayananMenit: number | null;
}

// ── Status task BPJS per antrean ──────────────────────────────
// Dari view `bpjs_task_status`
// Menggantikan struktur { 5: ts, 6: ts } di localStorage
export interface BpjsTaskInfo {
  taskId: TaskId;
  status: TaskStatus;
  responseCode: string | null; //'00' = sukses, '99' gagal
  waktuEvent: string; //ISO timestamp
  dikirimAt: string; //ISO timestamp
  latencyMs: number | null;
}

// ── Record task BPJS (untuk riwayat pengiriman) ───────────────
export interface BpjsTaskRecord extends BpjsTaskInfo {
  id: number;
  antreanId: number;
  kodeBooking: string;
  jenisResep: string | null;
  httpStatus: number | null;
  errorMessage: string | null;
  dikirimOleh: string | null; //nama petugas
}

// ── Payload daftar antrian farmasi BPJS ──────────────────────
// Sesuai spesifikasi /antrean/farmasi/add
// Harus dipanggil SEBELUM kirim task ID via updatewaktu
export interface BpjsFarmasiPayload {
  kodebooking: string;
  jenisresep: string; // "racikan" | "non racikan" | "" (Tidak ada)
  nomorantrean: number; // nomorUrut antrian lokal
  keterangan: string;
}

// ── Payload kirim task BPJS ───────────────────────────────────
// Sesuai spesifikasi /antrean/updatewaktu
export interface BpjsTaskPayload {
  kodebooking: string;
  taskid: TaskId;
  waktu: number; //Unix ms - dari waktuDaftar/Panggil/Selesai
  jenisresep?: JenisResep;
}

// ── SSE Events ────────────────────────────────────────────────
// Event yang di-publish ke Redis dan diterima client lewat SSE.
// Setiap event type punya shape data yang spesifik.
export type AntreanEvent =
  | {
      type: "NOMOR_BARU";
      data: {
        nomorAntrian: string;
        totalMenunggu: number;
        total: number;
      };
    }
  | {
      type: "DIPANGGIL";
      data: {
        nomorAntrian: string;
        namaPasien: string | null;
        jenisResep: JenisResep | null;
        loket: string | null;
        waktuPanggil: string; // ISO
      };
    }
  | {
      type: "PANGGIL_ULANG";
      data: {
        nomorAntrian: string;
        namaPasien: string | null;
      };
    }
  | {
      type: "SELESAI";
      data: {
        nomorAntrian: string;
        waktuSelesai: string; // ISO
      };
    }
  | {
      type: "TIDAK_HADIR";
      data: {
        nomorAntrian: string;
      };
    }
  | {
      type: "DATA_DILENGKAPI";
      data: {
        nomorAntrian: string;
        namaPasien: string;
        jenisResep: JenisResep;
        kodeBooking: string;
      };
    }
  | {
      type: "STATS_UPDATE";
      data: StatsHariIni;
    }
  | {
      type: "TASK_BPJS_TERKIRIM";
      data: {
        nomorAntrian: string;
        taskId: TaskId;
        status: TaskStatus;
        waktuEvent: string;
      };
    };

// ── Query params ──────────────────────────────────────────────
export interface AntreanListParams {
  unitId: number;
  token?: string;    // display token untuk akses publik (tanpa session)
  status?: AntreanStatus | AntreanStatus[];
  search?: string;
  tanggal?: string;  // "YYYY-MM-DD" — undefined/kosong = hari ini
}
