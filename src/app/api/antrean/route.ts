// ─────────────────────────────────────────────────────────────
//  GET  /api/antrean        → list antrean (filter status & search)
//  POST /api/antrean        → kiosk: pasien ambil nomor baru
//
//  Auth   : wajib (cookie session)
//  unitId : diambil dari JWT (tidak via query string)
//  Sesi   : auto find-or-create untuk hari ini
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import type { antreans_status } from "@prisma/client";
import { antreanDal } from "@/app/lib/dal/Antrean.dal";
import { requireSession, resolvePublicUnitId, jsonError, generateNomorAntrian, parseTanggal, isToday } from "@/app/lib/apiHelpers";
import { getSessionFromRequest } from "@/app/lib/sessions";
import { publishEvent } from "@/app/lib/emitter";

const VALID_STATUSES: antreans_status[] = [
  "waiting",
  "called",
  "done",
  "absent",
  "batal",
];

function parseStatusParam(raw: string | null): antreans_status[] | undefined {
  if (!raw) return undefined;
  const list = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is antreans_status =>
      VALID_STATUSES.includes(s as antreans_status)
    );
  return list.length ? list : undefined;
}

// ─────────────────────────────────────────────────────────────
//  GET /api/antrean
//  Auth: session cookie (petugas) ATAU ?token=xxx (display publik)
// ─────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const unitId = await resolvePublicUnitId(req);
  if (unitId === null) return jsonError("Unauthorized", 401);

  try {
    const url = new URL(req.url);
    const tanggal = parseTanggal(url.searchParams.get("tanggal"));
    const isPast = tanggal !== null && !isToday(tanggal);

    const authSession = await getSessionFromRequest(req);

    const search = url.searchParams.get("search") ?? undefined;

    if (isPast) {
      // Past date — query langsung by waktu_daftar datetime range.
      // Tidak lewat queue_sessions.tanggal (DATE) agar bebas dari
      // masalah timezone UTC vs. lokal.
      const list = await antreanDal.findAntreansByDate(unitId, tanggal!, { search });
      return NextResponse.json(list);
    }

    // Today, petugas  → auto-create sesi jika belum ada
    // Today, display  → hanya baca, tidak buat sesi baru
    const sesi = authSession
      ? await antreanDal.findOrCreateSession(unitId, authSession.userId)
      : await antreanDal.findAktifSession(unitId);

    if (!sesi) return NextResponse.json([]);

    const status = parseStatusParam(url.searchParams.get("status"));

    const list = await antreanDal.findAntreans(sesi.id, { status, search });
    return NextResponse.json(list);
  } catch (err) {
    console.error("[GET] /api/antrean", err);
    return jsonError("Gagal mengambil data antrean", 500);
  }
}

// ─────────────────────────────────────────────────────────────
//  POST /api/antrean  (kiosk ambil nomor)
// ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await requireSession(req);
  if (!auth.ok) return auth.response;

  try {
    const unitId = auth.session.unitId;

    const [unit, sesi] = await Promise.all([
      antreanDal.findUnit(unitId),
      antreanDal.findOrCreateSession(unitId, auth.session.userId),
    ]);

    if (!unit) return jsonError("Unit tidak ditemukan", 404);

    const count = await antreanDal.countAntreanDalamSesi(sesi.id);
    const nomorUrut = count + 1;
    const nomorAntrian = generateNomorAntrian(unit.kode, nomorUrut);

    const antrean = await antreanDal.createAntrean({
      sessionId: sesi.id,
      nomorAntrian,
      nomorUrut,
    });

    // Audit log (fire & forget — tidak block respons)
    antreanDal
      .createAuditLog({
        antreanId: BigInt(antrean.id),
        userId: auth.session.userId,
        aksi: "AMBIL_NOMOR",
        statusSesudah: "waiting",
        keterangan: `Ambil nomor via kiosk: ${nomorAntrian}`,
      })
      .catch(console.error);

    // Publish SSE event
    const total = count + 1;
    publishEvent(unitId, {
      type: "NOMOR_BARU",
      data: {
        nomorAntrian: antrean.nomorAntrian,
        totalMenunggu: total, // approximation; client akan invalidate stats
        total,
      },
    });

    return NextResponse.json(antrean, { status: 201 });
  } catch (err) {
    console.error("[POST] /api/antrean", err);
    return jsonError("Gagal mengambil nomor antrean", 500);
  }
}
