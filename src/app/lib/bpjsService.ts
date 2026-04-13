"server-only";

// ─────────────────────────────────────────────────────────────
//  lib/bpjsService.ts
//
//  Service untuk kirim task ke API BPJS Antrol (Antrian Online).
//
//  Header wajib per request (sesuai spesifikasi BPJS):
//    X-cons-id   : consumer ID dari BPJS Kesehatan  (BPJS_CONS_ID)
//    X-timestamp : Unix timestamp UTC dalam detik   (generated)
//    X-signature : HMAC-SHA256("{cons_id}&{timestamp}", secret)
//                  lalu di-encode Base64             (BPJS_SECRET_KEY)
//    user_key    : user key untuk akses webservice   (BPJS_USER_KEY)
// ─────────────────────────────────────────────────────────────

import { createHmac } from "node:crypto";
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
//  buildHeaders — buat header standar BPJS untuk setiap request
//
//  Signature formula (sesuai spek BPJS Antrol):
//    message   = "{BPJS_CONS_ID}&{timestamp}"
//    signature = Base64( HMAC-SHA256( BPJS_SECRET_KEY, message ) )
// ─────────────────────────────────────────────────────────────
function buildHeaders(): Record<string, string> {
  const consId    = process.env.BPJS_CONS_ID    ?? "";
  const secretKey = process.env.BPJS_SECRET_KEY ?? "";
  const userKey   = process.env.BPJS_USER_KEY   ?? "";

  // Unix timestamp UTC dalam detik
  const timestamp = String(Math.floor(Date.now() / 1000));

  const message   = `${consId}&${timestamp}`;
  const signature = createHmac("sha256", secretKey)
    .update(message)
    .digest("base64");

  return {
    "Content-Type": "application/json",
    "X-cons-id":    consId,
    "X-timestamp":  timestamp,
    "X-signature":  signature,
    "user_key":     userKey,
  };
}

// ─────────────────────────────────────────────────────────────
//  Daftarkan antrian ke BPJS Farmasi (farmasi/add)
//  Harus dipanggil SEBELUM kirim task ID via updatewaktu
// ─────────────────────────────────────────────────────────────
export async function daftarFarmasiBpjs(
  payload: BpjsFarmasiPayload
): Promise<BpjsCallResult> {
  const url   = process.env.BPJS_API_URL;
  const start = Date.now();

  if (!url) throw new Error("BPJS_API_URL belum di-set di environment");

  try {
    const res = await fetch(`${url}/antrean/farmasi/add`, {
      method:  "POST",
      headers: buildHeaders(),
      body:    JSON.stringify(payload),
    });

    const body = await res.json().catch(() => null);
    const responseCode =
      (body?.metaData?.code as string | undefined) ??
      (body?.metadata?.code as string | undefined) ??
      null;

    return {
      ok:           res.ok && responseCode === "200",
      httpStatus:   res.status,
      responseCode: responseCode ? String(responseCode) : null,
      responseBody: body,
      latencyMs:    Date.now() - start,
      errorMessage: res.ok ? null : `HTTP ${res.status}`,
    };
  } catch (err) {
    return {
      ok:           false,
      httpStatus:   null,
      responseCode: null,
      responseBody: null,
      latencyMs:    Date.now() - start,
      errorMessage: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// ─────────────────────────────────────────────────────────────
//  Kirim task ID ke BPJS Antrol (antrean/updatewaktu)
// ─────────────────────────────────────────────────────────────
export async function kirimTaskBpjs(
  payload: BpjsTaskPayload
): Promise<BpjsCallResult> {
  const url   = process.env.BPJS_API_URL;
  const start = Date.now();

  if (!url) throw new Error("BPJS_API_URL belum di-set di environment");

  try {
    const res = await fetch(`${url}/antrean/updatewaktu`, {
      method:  "POST",
      headers: buildHeaders(),
      body:    JSON.stringify(payload),
    });

    const body = await res.json().catch(() => null);
    const responseCode =
      (body?.metaData?.code as string | undefined) ??
      (body?.metadata?.code as string | undefined) ??
      null;

    return {
      ok:           res.ok && responseCode === "200",
      httpStatus:   res.status,
      responseCode: responseCode ? String(responseCode) : null,
      responseBody: body,
      latencyMs:    Date.now() - start,
      errorMessage: res.ok ? null : `HTTP ${res.status}`,
    };
  } catch (err) {
    return {
      ok:           false,
      httpStatus:   null,
      responseCode: null,
      responseBody: null,
      latencyMs:    Date.now() - start,
      errorMessage: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
