// ─────────────────────────────────────────────────────────────
//  POST /api/antrean/[nomor]/farmasi-register
//
//  Daftarkan antrian ke BPJS Farmasi via /antrean/farmasi/add.
//  WAJIB dipanggil SEBELUM kirim task ID (updatewaktu).
//
//  Flow:
//    1. Validasi antrean & kode booking
//    2. Guard: tolak jika sudah pernah didaftarkan
//    3. Call BPJS /antrean/farmasi/add
//    4. Jika sukses → set bpjs_farmasi_registered = true
//    5. Audit log
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { antreanDal } from "@/app/lib/dal/Antrean.dal";
import { requireSession, jsonError } from "@/app/lib/apiHelpers";
import { daftarFarmasiBpjs } from "@/app/lib/bpjsService";
import type { BpjsFarmasiPayload } from "@/app/types/antrianTypes";

interface RouteContext {
  params: Promise<{ nomor: string }>;
}

// Mapping JenisResep lokal → format string BPJS farmasi/add (lowercase)
function toJenisResepFarmasi(jenisResep: string | null): string {
  if (jenisResep === "Racikan") return "racikan";
  if (jenisResep === "Non Racik") return "non racikan";
  return ""; // "Tidak ada" atau null → kosong
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const auth = await requireSession(req);
  if (!auth.ok) return auth.response;

  try {
    const { nomor } = await ctx.params;
    const { unitId, userId } = auth.session;

    const sesi = await antreanDal.findAktifSession(unitId);
    if (!sesi) return jsonError("Sesi tidak ditemukan", 404);

    const antrean = await antreanDal.findAntreanByNomor(nomor, sesi.id);
    if (!antrean) return jsonError("Antrean tidak ditemukan", 404);

    if (!antrean.kodeBooking) {
      return jsonError("Kode booking belum diisi — lengkapi data pasien terlebih dahulu", 400);
    }

    if (antrean.farmasiTerdaftar) {
      return jsonError("Antrian sudah terdaftar di BPJS Farmasi", 409);
    }

    const payload: BpjsFarmasiPayload = {
      kodebooking: antrean.kodeBooking,
      jenisresep: toJenisResepFarmasi(antrean.jenisResep),
      nomorantrean: antrean.nomorUrut,
      keterangan: "",
    };

    const result = await daftarFarmasiBpjs(payload);

    if (result.ok) {
      await antreanDal.setFarmasiRegistered(BigInt(antrean.id));
    }

    antreanDal
      .createAuditLog({
        antreanId: BigInt(antrean.id),
        userId,
        aksi: "DAFTAR_FARMASI_BPJS",
        keterangan: `status=${result.ok ? "sukses" : "gagal"}, latency=${result.latencyMs}ms`,
      })
      .catch(console.error);

    return NextResponse.json({
      ok: result.ok,
      latencyMs: result.latencyMs,
      responseCode: result.responseCode ?? "",
      responseBody: result.responseBody,
    });
  } catch (err) {
    console.error("[POST] /api/antrean/[nomor]/farmasi-register", err);
    return jsonError("Gagal mendaftarkan antrian farmasi ke BPJS", 500);
  }
}
