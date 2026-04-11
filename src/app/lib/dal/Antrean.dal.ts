"server-only";

// ─────────────────────────────────────────────────────────────
//  lib/dal/Antrean.dal.ts
//
//  Data Access Layer untuk tabel `antreans`, `queue_sessions`,
//  `bpjs_tasks`, dan `audit_logs`.
//
//  Aturan DAL:
//    - Hanya query Prisma — tidak ada business logic
//    - Tidak throw HTTP error — kembalikan null / data mentah
//    - Tidak tahu soal request / response / cookie / session
//    - Dipanggil oleh Route Handler
// ─────────────────────────────────────────────────────────────

import {
  Prisma,
  type antreans_jenis_resep,
  type antreans_status,
} from "@prisma/client";
import { prisma } from "../prisma";
import type {
  Antrean,
  BpjsTaskInfo,
  StatsHariIni,
  TaskId,
  TaskStatus,
} from "../../types/antrianTypes";

// ─────────────────────────────────────────────────────────────
//  MAPPERS
// ─────────────────────────────────────────────────────────────

function mapJenisResep(v: antreans_jenis_resep | null): Antrean["jenisResep"] {
  if (!v) return null;
  const map: Record<antreans_jenis_resep, Antrean["jenisResep"]> = {
    Non_racikan: "Non Racik",
    Racikan: "Racikan",
    Tidak_ada: "Tidak ada",
  };
  return map[v];
}

export function toDbJenisResep(v: string): antreans_jenis_resep {
  const map: Record<string, antreans_jenis_resep> = {
    "Non Racik": "Non_racikan",
    Racikan: "Racikan",
    "Tidak ada": "Tidak_ada",
  };
  return map[v] ?? "Tidak_ada";
}

// ─────────────────────────────────────────────────────────────
//  SELECT SHAPE (dipakai ulang di semua query antrean)
// ─────────────────────────────────────────────────────────────

const antreanSelect = {
  id: true,
  nomor_antrian: true,
  nomor_urut: true,
  kode_booking: true,
  nama_pasien: true,
  no_sep: true,
  no_bpjs: true,
  jenis_resep: true,
  status: true,
  waktu_daftar: true,
  waktu_panggil: true,
  waktu_selesai: true,
  jumlah_panggilan: true,
  bpjs_farmasi_registered: true,
  dilayani_oleh: true,
  lokets: { select: { nama: true } },
  users: { select: { nama: true } },
} satisfies Prisma.antreansSelect;

type AntreanRow = Prisma.antreansGetPayload<{ select: typeof antreanSelect }>;

function mapAntrean(row: AntreanRow): Antrean {
  return {
    id: Number(row.id),
    nomorAntrian: row.nomor_antrian,
    nomorUrut: row.nomor_urut,
    kodeBooking: row.kode_booking,
    namaPasien: row.nama_pasien,
    noSep: row.no_sep,
    noBPJS: row.no_bpjs,
    jenisResep: mapJenisResep(row.jenis_resep),
    status: row.status as Antrean["status"],
    loket: row.lokets?.nama ?? null,
    petugas: row.users?.nama ?? null,
    dilayaniOlehId:
      row.dilayani_oleh != null ? Number(row.dilayani_oleh) : null,
    waktuDaftar: row.waktu_daftar.toISOString(),
    WaktuPanggil: row.waktu_panggil?.toISOString() ?? null,
    waktuSelesai: row.waktu_selesai?.toISOString() ?? null,
    jumlahPanggilan: row.jumlah_panggilan,
    farmasiTerdaftar: row.bpjs_farmasi_registered,
  };
}

// ─────────────────────────────────────────────────────────────
//  CLASS
// ─────────────────────────────────────────────────────────────

export class AntreanDal {
  constructor(private readonly db: typeof prisma) {}

  // ── QUEUE SESSIONS ──────────────────────────────────────────

  async findAktifSession(unitId: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.db.queue_sessions.findFirst({
      where: {
        unit_id: BigInt(unitId),
        status: "aktif",
        tanggal: { gte: today },
      },
      select: { id: true, unit_id: true, tanggal: true, status: true },
    });
  }

  async createSession(unitId: number, openedBy: number | null = null) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.db.queue_sessions.create({
      data: {
        unit_id: BigInt(unitId),
        tanggal: today,
        status: "aktif",
        dibuka_oleh: openedBy ? BigInt(openedBy) : null,
        opened_at: new Date(),
      },
      select: { id: true, unit_id: true, tanggal: true, status: true },
    });
  }

  // Ambil sesi aktif hari ini; buat baru jika belum ada.
  async findOrCreateSession(unitId: number, openedBy: number | null = null) {
    const existing = await this.findAktifSession(unitId);
    if (existing) return existing;
    return this.createSession(unitId, openedBy);
  }

  // ── UNIT ────────────────────────────────────────────────────

  async findUnit(unitId: number) {
    return this.db.units.findUnique({
      where: { id: BigInt(unitId) },
      select: { id: true, kode: true, nama: true },
    });
  }

  // ── COUNT / NOMOR GENERATION ─────────────────────────────────

  async countAntreanDalamSesi(sessionId: bigint): Promise<number> {
    return this.db.antreans.count({
      where: { session_id: sessionId },
    });
  }

  // ── ANTREAN — CREATE ─────────────────────────────────────────

  async createAntrean(data: {
    sessionId: bigint;
    nomorAntrian: string;
    nomorUrut: number;
  }): Promise<Antrean> {
    const row = await this.db.antreans.create({
      data: {
        session_id: data.sessionId,
        nomor_antrian: data.nomorAntrian,
        nomor_urut: data.nomorUrut,
        status: "waiting",
      },
      select: antreanSelect,
    });
    return mapAntrean(row);
  }

  // ── ANTREAN — READ ───────────────────────────────────────────

  async findAntreans(
    sessionId: bigint,
    filters: { status?: antreans_status[]; search?: string } = {},
  ): Promise<Antrean[]> {
    const rows = await this.db.antreans.findMany({
      where: {
        session_id: sessionId,
        deleted_at: null,
        ...(filters.status?.length ? { status: { in: filters.status } } : {}),
        ...(filters.search
          ? {
              OR: [
                { nama_pasien: { contains: filters.search } },
                { nomor_antrian: { contains: filters.search } },
                { kode_booking: { contains: filters.search } },
              ],
            }
          : {}),
      },
      select: antreanSelect,
      orderBy: { nomor_urut: "asc" },
    });
    return rows.map(mapAntrean);
  }

  async findAntreanByNomor(
    nomorAntrian: string,
    sessionId: bigint,
  ): Promise<Antrean | null> {
    const row = await this.db.antreans.findFirst({
      where: {
        nomor_antrian: nomorAntrian,
        session_id: sessionId,
        deleted_at: null,
      },
      select: antreanSelect,
    });
    return row ? mapAntrean(row) : null;
  }

  // Versi ringan untuk operasi mutasi (hanya id + status)
  async findAntreanRawByNomor(nomorAntrian: string, sessionId: bigint) {
    return this.db.antreans.findFirst({
      where: {
        nomor_antrian: nomorAntrian,
        session_id: sessionId,
        deleted_at: null,
      },
      select: { id: true, status: true, nomor_antrian: true },
    });
  }

  // Antrian waiting paling awal (untuk panggil berikutnya)
  async findFirstWaiting(sessionId: bigint) {
    return this.db.antreans.findFirst({
      where: { session_id: sessionId, status: "waiting", deleted_at: null },
      orderBy: { nomor_urut: "asc" },
      select: { id: true, nomor_antrian: true, nomor_urut: true },
    });
  }

  // ── ANTREAN — MUTATIONS ──────────────────────────────────────

  async panggilAntrean(
    id: bigint,
    userId: number,
    loketId?: number,
  ): Promise<Antrean> {
    const row = await this.db.antreans.update({
      where: { id },
      data: {
        status: "called",
        waktu_panggil: new Date(),
        dilayani_oleh: BigInt(userId),
        ...(loketId ? { loket_id: BigInt(loketId) } : {}),
        jumlah_panggilan: { increment: 1 },
        updated_at: new Date(),
      },
      select: antreanSelect,
    });
    return mapAntrean(row);
  }

  async panggilUlangAntrean(id: bigint): Promise<{ jumlahPanggilan: number }> {
    const row = await this.db.antreans.update({
      where: { id },
      data: {
        jumlah_panggilan: { increment: 1 },
        updated_at: new Date(),
      },
      select: { jumlah_panggilan: true },
    });
    return { jumlahPanggilan: row.jumlah_panggilan };
  }

  async selesaiAntrean(id: bigint): Promise<Antrean> {
    const row = await this.db.antreans.update({
      where: { id },
      data: {
        status: "done",
        waktu_selesai: new Date(),
        updated_at: new Date(),
      },
      select: antreanSelect,
    });
    return mapAntrean(row);
  }

  async lewatiAntrean(id: bigint): Promise<Antrean> {
    const row = await this.db.antreans.update({
      where: { id },
      data: { status: "absent", updated_at: new Date() },
      select: antreanSelect,
    });
    return mapAntrean(row);
  }

  async lengkapiDataAntrean(
    id: bigint,
    data: {
      kodeBooking: string;
      namaPasien: string;
      jenisResep: string;
      noSep?: string | null;
      noBpjs?: string | null;
    },
  ): Promise<Antrean> {
    const row = await this.db.antreans.update({
      where: { id },
      data: {
        kode_booking: data.kodeBooking,
        nama_pasien: data.namaPasien,
        jenis_resep: toDbJenisResep(data.jenisResep),
        ...(data.noSep != null ? { no_sep: data.noSep } : {}),
        ...(data.noBpjs != null ? { no_bpjs: data.noBpjs } : {}),
        updated_at: new Date(),
      },
      select: antreanSelect,
    });
    return mapAntrean(row);
  }

  async setFarmasiRegistered(id: bigint): Promise<void> {
    await this.db.antreans.update({
      where: { id },
      data: {
        bpjs_farmasi_registered: true,
        bpjs_farmasi_at: new Date(),
        updated_at: new Date(),
      },
    });
  }

  // ── STATS ────────────────────────────────────────────────────

  async getStatsHariIni(
    sessionId: bigint,
    unitId: number,
  ): Promise<StatsHariIni> {
    const [grouped, doneAntreans] = await Promise.all([
      this.db.antreans.groupBy({
        by: ["status"],
        where: { session_id: sessionId, deleted_at: null },
        _count: { id: true },
      }),
      this.db.antreans.findMany({
        where: {
          session_id: sessionId,
          status: "done",
          waktu_panggil: { not: null },
          waktu_selesai: { not: null },
          deleted_at: null,
        },
        select: { waktu_panggil: true, waktu_selesai: true },
      }),
    ]);

    const countByStatus = (s: antreans_status) =>
      grouped.find((g) => g.status === s)?._count.id ?? 0;

    const total = grouped.reduce((sum, g) => sum + g._count.id, 0);
    const menunggu = countByStatus("waiting");
    const dipanggil = countByStatus("called");
    const selesai = countByStatus("done");
    const tidakHadir = countByStatus("absent") + countByStatus("batal");

    let rataLamaLayananMenit: number | null = null;
    if (doneAntreans.length > 0) {
      const totalMs = doneAntreans.reduce((sum, a) => {
        if (!a.waktu_panggil || !a.waktu_selesai) return sum;
        return sum + (a.waktu_selesai.getTime() - a.waktu_panggil.getTime());
      }, 0);
      rataLamaLayananMenit =
        Math.round((totalMs / doneAntreans.length / 60_000) * 10) / 10;
    }

    return {
      unitId,
      total,
      menunggu,
      dipanggil,
      selesai,
      tidakHadir,
      rataLamaLayananMenit,
    };
  }

  // ── BPJS TASKS ───────────────────────────────────────────────

  async getBpjsTasks(antreanId: bigint): Promise<BpjsTaskInfo[]> {
    const tasks = await this.db.bpjs_tasks.findMany({
      where: { antrean_id: antreanId },
      orderBy: { dikirim_at: "desc" },
      select: {
        task_id: true,
        status: true,
        response_code: true,
        waktu_event: true,
        dikirim_at: true,
        latency_ms: true,
      },
    });

    // Satu entry per taskId — ambil yang paling baru (sudah sorted desc)
    const latest = new Map<number, (typeof tasks)[0]>();
    for (const t of tasks) {
      if (!latest.has(t.task_id)) latest.set(t.task_id, t);
    }

    return Array.from(latest.values()).map((t) => ({
      taskId: t.task_id as TaskId,
      status: t.status as TaskStatus,
      responseCode: t.response_code,
      waktuEvent: t.waktu_event.toISOString(),
      dikirimAt: t.dikirim_at.toISOString(),
      latencyMs: t.latency_ms,
    }));
  }

  async createBpjsTask(data: {
    antreanId: bigint;
    taskId: number;
    kodeBooking: string;
    jenisResep: string | null;
    waktuEvent: Date;
    requestPayload: object;
    httpStatus: number | null;
    responseCode: string | null;
    responseBody: object | null;
    latencyMs: number | null;
    status: "sukses" | "gagal" | "pending";
    errorMessage: string | null;
    dikirimOleh: number | null;
  }) {
    return this.db.bpjs_tasks.create({
      data: {
        antrean_id: data.antreanId,
        task_id: data.taskId,
        kode_booking: data.kodeBooking,
        jenis_resep: data.jenisResep,
        waktu_event: data.waktuEvent,
        request_payload: data.requestPayload as Prisma.InputJsonObject,
        http_status: data.httpStatus,
        response_code: data.responseCode,
        response_body: data.responseBody ?? Prisma.JsonNull,
        latency_ms: data.latencyMs,
        status: data.status,
        error_message: data.errorMessage,
        dikirim_oleh: data.dikirimOleh ? BigInt(data.dikirimOleh) : null,
      },
      select: { id: true, task_id: true, status: true },
    });
  }

  // ── AUDIT LOG ────────────────────────────────────────────────

  async createAuditLog(data: {
    antreanId: bigint;
    userId: number | null;
    aksi: string;
    statusSebelum?: string | null;
    statusSesudah?: string | null;
    keterangan?: string;
  }): Promise<void> {
    await this.db.audit_logs.create({
      data: {
        antrean_id: data.antreanId,
        user_id: data.userId ? BigInt(data.userId) : null,
        aksi: data.aksi,
        status_sebelum: data.statusSebelum ?? null,
        status_sesudah: data.statusSesudah ?? null,
        keterangan: data.keterangan ?? null,
      },
    });
  }
}

export const antreanDal = new AntreanDal(prisma);
