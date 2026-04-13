// ─────────────────────────────────────────────────────────────
//  GET  /api/antrean/[nomor]/tasks  → list status task BPJS
//  POST /api/antrean/[nomor]/tasks  → kirim task ke BPJS Antrol
//
//  Body POST (BpjsTaskPayload):
//    { kodebooking, taskid, waktu, jenisresep? }
//
//  Flow POST:
//    1. Validasi body & cari antrean
//    2. Call BPJS API via bpjsService (mock saat dev)
//    3. Simpan hasil ke tabel bpjs_tasks
//    4. Audit log + publish SSE TASK_BPJS_TERKIRIM
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { antreanDal } from "@/app/lib/dal/Antrean.dal";
import { requireSession, jsonError, parseTanggal, isToday } from "@/app/lib/apiHelpers";
import { publishEvent } from "@/app/lib/emitter";
import { kirimTaskBpjs } from "@/app/lib/bpjsService";
import type { BpjsTaskPayload, TaskId, TaskStatus } from "@/app/types/antrianTypes";

const VALID_TASK_IDS: TaskId[] = [5, 6, 7, 99];

interface RouteContext {
  params: Promise<{ nomor: string }>;
}

// ─────────────────────────────────────────────────────────────
//  GET — riwayat task per antrean
// ─────────────────────────────────────────────────────────────
export async function GET(req: NextRequest, ctx: RouteContext) {
  const auth = await requireSession(req);
  if (!auth.ok) return auth.response;

  try {
    const { nomor } = await ctx.params;
    const unitId = auth.session.unitId;

    const tanggal = parseTanggal(new URL(req.url).searchParams.get("tanggal"));

    let existing;
    if (tanggal && !isToday(tanggal)) {
      existing = await antreanDal.findAntreanRawByNomorAndDate(nomor, unitId, tanggal);
    } else {
      const sesi = await antreanDal.findAktifSession(unitId);
      if (!sesi) return NextResponse.json([]);
      existing = await antreanDal.findAntreanRawByNomor(nomor, sesi.id);
    }
    if (!existing) return NextResponse.json([]);

    const tasks = await antreanDal.getBpjsTasks(existing.id);
    return NextResponse.json(tasks);
  } catch (err) {
    console.error("[GET] /api/antrean/[nomor]/tasks", err);
    return jsonError("Gagal mengambil status task BPJS", 500);
  }
}

// ─────────────────────────────────────────────────────────────
//  POST — kirim task ke BPJS
// ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest, ctx: RouteContext) {
  const auth = await requireSession(req);
  if (!auth.ok) return auth.response;

  try {
    const { nomor } = await ctx.params;
    const { unitId, userId } = auth.session;

    const body = (await req.json().catch(() => null)) as BpjsTaskPayload | null;
    if (!body) return jsonError("Body tidak valid", 400);

    if (typeof body.kodebooking !== "string" || !body.kodebooking.trim()) {
      return jsonError("kodebooking wajib diisi", 400);
    }
    if (!VALID_TASK_IDS.includes(body.taskid)) {
      return jsonError("taskid tidak valid (harus 5/6/7/99)", 400);
    }
    if (typeof body.waktu !== "number" || body.waktu <= 0) {
      return jsonError("waktu (unix ms) tidak valid", 400);
    }

    const tanggalPost = parseTanggal(new URL(req.url).searchParams.get("tanggal"));

    let existing;
    if (tanggalPost && !isToday(tanggalPost)) {
      existing = await antreanDal.findAntreanRawByNomorAndDate(nomor, unitId, tanggalPost);
    } else {
      const sesi = await antreanDal.findAktifSession(unitId);
      if (!sesi) return jsonError("Sesi tidak ditemukan", 404);
      existing = await antreanDal.findAntreanRawByNomor(nomor, sesi.id);
    }
    if (!existing) return jsonError("Antrean tidak ditemukan", 404);

    // Kirim ke BPJS (mock kalau env BPJS_API_URL kosong)
    const result = await kirimTaskBpjs(body);

    const status: TaskStatus = result.ok ? "sukses" : "gagal";

    await antreanDal.createBpjsTask({
      antreanId: existing.id,
      taskId: body.taskid,
      kodeBooking: body.kodebooking,
      jenisResep: body.jenisresep ?? null,
      waktuEvent: new Date(body.waktu),
      requestPayload: body as unknown as object,
      httpStatus: result.httpStatus,
      responseCode: result.responseCode,
      responseBody: result.responseBody,
      latencyMs: result.latencyMs,
      status,
      errorMessage: result.errorMessage,
      dikirimOleh: userId,
    });

    antreanDal
      .createAuditLog({
        antreanId: existing.id,
        userId,
        aksi: "KIRIM_TASK_BPJS",
        keterangan: `taskId=${body.taskid}, status=${status}, latency=${result.latencyMs}ms`,
      })
      .catch(console.error);

    publishEvent(unitId, {
      type: "TASK_BPJS_TERKIRIM",
      data: {
        nomorAntrian: nomor,
        taskId: body.taskid,
        status,
        waktuEvent: new Date(body.waktu).toISOString(),
      },
    });

    return NextResponse.json({
      ok: result.ok,
      latencyMs: result.latencyMs,
      responseCode: result.responseCode ?? "",
    });
  } catch (err) {
    console.error("[POST] /api/antrean/[nomor]/tasks", err);
    return jsonError("Gagal mengirim task BPJS", 500);
  }
}
