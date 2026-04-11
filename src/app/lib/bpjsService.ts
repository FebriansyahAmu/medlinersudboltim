"server-only";

// ─────────────────────────────────────────────────────────────
//  lib/bpjsService.ts
//
//  Service untuk kirim task ke API BPJS Antrol (Antrian Online).
//
//  Behavior:
//    - Jika BPJS_API_URL tidak di-set di env → mock mode
//      (return sukses palsu, untuk dev tanpa kredensial BPJS)
//    - Jika di-set → kirim HTTP request ke endpoint BPJS
//
//  Return shape selalu sama agar route handler bisa
//  langsung simpan ke tabel `bpjs_tasks`.
// ─────────────────────────────────────────────────────────────

import type { BpjsFarmasiPayload, BpjsTaskPayload } from "../types/antrianTypes";

export interface BpjsCallResult {
  ok: boolean;
  httpStatus: number | null;
  responseCode: string | null;
  responseBody: object | null;
  latencyMs: number;
  errorMessage: string | null;
}

// ─────────────────────────────────────────────────────────────
//  Daftarkan antrian ke BPJS Farmasi (farmasi/add)
//  Harus dipanggil SEBELUM kirim task ID via updatewaktu
// ─────────────────────────────────────────────────────────────
export async function daftarFarmasiBpjs(
  payload: BpjsFarmasiPayload
): Promise<BpjsCallResult> {
  const url = process.env.BPJS_API_URL;
  const start = Date.now();

  if (!url) {
    return {
      ok: true,
      httpStatus: 200,
      responseCode: "00",
      responseBody: {
        metadata: { code: 200, message: "OK (mock)" },
        response: { kodebooking: payload.kodebooking },
      },
      latencyMs: Date.now() - start,
      errorMessage: null,
    };
  }

  try {
    const res = await fetch(`${url}/antrean/farmasi/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Cons-Id": process.env.BPJS_CONS_ID ?? "",
        "X-Timestamp": String(Math.floor(Date.now() / 1000)),
        "X-Signature": "", // TODO: generate HMAC SHA256 sesuai spec BPJS
      },
      body: JSON.stringify(payload),
    });

    const body = await res.json().catch(() => null);
    const responseCode =
      (body?.metaData?.code as string | undefined) ??
      (body?.metadata?.code as string | undefined) ??
      null;

    return {
      ok: res.ok && responseCode === "200",
      httpStatus: res.status,
      responseCode: responseCode ? String(responseCode) : null,
      responseBody: body,
      latencyMs: Date.now() - start,
      errorMessage: res.ok ? null : `HTTP ${res.status}`,
    };
  } catch (err) {
    return {
      ok: false,
      httpStatus: null,
      responseCode: null,
      responseBody: null,
      latencyMs: Date.now() - start,
      errorMessage: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// ─────────────────────────────────────────────────────────────
export async function kirimTaskBpjs(
  payload: BpjsTaskPayload
): Promise<BpjsCallResult> {
  const url = process.env.BPJS_API_URL;
  const start = Date.now();

  // Mock mode — tidak ada kredensial BPJS
  if (!url) {
    return {
      ok: true,
      httpStatus: 200,
      responseCode: "00",
      responseBody: {
        metadata: { code: 200, message: "OK (mock)" },
        response: { taskid: payload.taskid },
      },
      latencyMs: Date.now() - start,
      errorMessage: null,
    };
  }

  try {
    const res = await fetch(`${url}/antrean/updatewaktu`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Cons-Id": process.env.BPJS_CONS_ID ?? "",
        "X-Timestamp": String(Math.floor(Date.now() / 1000)),
        "X-Signature": "", // TODO: generate HMAC SHA256 sesuai spec BPJS
      },
      body: JSON.stringify(payload),
    });

    const body = await res.json().catch(() => null);
    const responseCode =
      (body?.metaData?.code as string | undefined) ??
      (body?.metadata?.code as string | undefined) ??
      null;

    return {
      ok: res.ok && responseCode === "200",
      httpStatus: res.status,
      responseCode: responseCode ? String(responseCode) : null,
      responseBody: body,
      latencyMs: Date.now() - start,
      errorMessage: res.ok ? null : `HTTP ${res.status}`,
    };
  } catch (err) {
    return {
      ok: false,
      httpStatus: null,
      responseCode: null,
      responseBody: null,
      latencyMs: Date.now() - start,
      errorMessage: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
