"use client";

// ─────────────────────────────────────────────────────────────
//  useAntreanStream.ts
//
//  Hook SSE (Server-Sent Events) untuk menerima update antrian
//  secara realtime dari server.
//
//  Cara kerja:
//    1. Buka koneksi ke GET /api/stream
//       (cookie httpOnly otomatis terbawa — tidak perlu kirim token)
//    2. Server kirim event tiap ada perubahan (petugas panggil,
//       pasien ambil nomor, dll)
//    3. Setiap event → invalidate query TanStack Query yang relevan
//       → UI update otomatis tanpa refresh
//    4. Browser native auto-reconnect jika koneksi putus
//
//  Dipakai di:
//    - Display antrian (layar TV)          → semua event
//    - Halaman petugas panggil             → semua event
//    - Kiosk ambil antrian                 → NOMOR_BARU, STATS_UPDATE
//    - Halaman kirim task BPJS             → TASK_BPJS_TERKIRIM
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { AntreanEvent } from "../types/antrianTypes";
import { queryKeys } from "./useAntrean";

// ── Opsi hook ─────────────────────────────────────────────────
interface UseAntreanStreamOptions {
  // unitId dipakai untuk isolasi cache queryKeys — bukan dikirim ke server.
  // Server baca unitId dari JWT cookie (petugas) atau display_token (display).
  unitId: number;

  // Display token untuk akses publik (tanpa session cookie).
  // Jika diisi, dikirim sebagai ?token=xxx ke /api/stream.
  token?: string;

  // Callback opsional — dipanggil setiap event masuk.
  onEvent?: (event: AntreanEvent) => void;

  // Jika false, SSE tidak dibuka (misal: unitId belum diketahui).
  enabled?: boolean;
}

//Return Type
interface UseAntreanStreamReturn {
  //Status koneksi SSE
  status: "connecting" | "connected" | "disconnected" | "error";
}

export function useAntreanStream({
  unitId,
  token,
  onEvent,
  enabled = true,
}: UseAntreanStreamOptions): UseAntreanStreamReturn {
  const queryClient = useQueryClient();
  const esRef = useRef<EventSource | null>(null);
  const statusRef = useRef<UseAntreanStreamReturn["status"]>("disconnected");
  const onEventRef = useRef(onEvent);

  //Selalu gunakan ref terbaru untuk onEvent agar tidak stale closure
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const handleEvent = useCallback(
    (event: AntreanEvent) => {
      onEventRef.current?.(event);

      switch (event.type) {
        //pasien baru ambil nomor
        // -> update stats (counter menunggu naik)

        case "NOMOR_BARU":
          queryClient.invalidateQueries({ queryKey: queryKeys.stats(unitId) });
          //Tambahkan antrian baru ke cache list secara optimitstis
          //daripada refetch seluruh list
          queryClient.invalidateQueries({ queryKey: queryKeys.list(unitId) });
          break;

        //Petugas klik panggil / panggil berikutnya
        // -> update antrian yang dipanggil  + stats
        case "DIPANGGIL":
          queryClient.invalidateQueries({ queryKey: queryKeys.list(unitId) });
          queryClient.invalidateQueries({ queryKey: queryKeys.stats(unitId) });
          //update detail antrian yang bersangukan secara targeted
          queryClient.invalidateQueries({
            queryKey: queryKeys.detail(unitId, event.data.nomorAntrian),
          });
          break;

        //petugas klik panggil ulang
        // -> tidak ada perubahan data, hanya UI feedback TTS
        // -> tidak perlu invalidate query apapun

        case "PANGGIL_ULANG":
          break;

        //Petugas klik Tandai Selesai
        // -> updat4e status antrian + stats (Selesai Dipanggil)
        case "SELESAI":
          queryClient.invalidateQueries({ queryKey: queryKeys.list(unitId) });
          queryClient.invalidateQueries({ queryKey: queryKeys.stats(unitId) });
          queryClient.invalidateQueries({
            queryKey: queryKeys.detail(unitId, event.data.nomorAntrian),
          });
          break;

        //Petugas Klik Lewati (pasien tidak hadir)
        // -> sama seperti SELESAI
        case "TIDAK_HADIR":
          queryClient.invalidateQueries({ queryKey: queryKeys.list(unitId) });
          queryClient.invalidateQueries({ queryKey: queryKeys.stats(unitId) });
          break;

        //Petugas selesai isi modal Lengkapi Data
        //-> update nama, jenisResep, kodeBooking di list
        case "DATA_DILENGKAPI":
          queryClient.invalidateQueries({ queryKey: queryKeys.list(unitId) });
          queryClient.invalidateQueries({
            queryKey: queryKeys.detail(unitId, event.data.nomorAntrian),
          });
          break;

        //Stats update eksplisit dari server (misal: saat sesi dibuka/ditutup)
        //-> set langsung ke cache tanpa refetch, lebih efisien
        case "STATS_UPDATE":
          queryClient.setQueryData(queryKeys.stats(unitId), event.data);
          break;

        case "TASK_BPJS_TERKIRIM":
          queryClient.invalidateQueries({
            queryKey: queryKeys.bpjsTask(unitId, event.data.nomorAntrian),
          });
          break;
      }
    },
    [queryClient, unitId],
  );

  useEffect(() => {
    if (!enabled) return;

    // Flag untuk mencegah double-processing saat React StrictMode
    // menjalankan effect dua kali (mount → cleanup → mount).
    // EventSource lama bisa menerima event sebelum browser selesai
    // memproses close() — flag ini mencegah handler lama tetap aktif.
    let active = true;

    const url = token ? `/api/stream?token=${token}` : `/api/stream`;

    const es = new EventSource(url);
    esRef.current = es;
    statusRef.current = "connecting";

    es.onopen = () => {
      statusRef.current = "connected";
    };

    // Server mengirim event sebagai JSON dalam field `data`
    // Format: data: {"type":"DIPANGGIL","data":{...}}\n\n
    es.onmessage = (e: MessageEvent<string>) => {
      if (!active) return;
      if (!e.data || e.data.trim() === "") return;

      try {
        const event = JSON.parse(e.data) as AntreanEvent;
        handleEvent(event);
      } catch {
        console.warn("[SSE] Failed to parse event:", e.data);
      }
    };

    es.onerror = () => {
      statusRef.current = "error";
      // EventSource browser akan otomatis reconnect setelah error.
      // Tidak perlu manual retry — ini perilaku bawaan spec SSE.
      // Jika server mati, browser coba lagi tiap ~3 detik.
    };

    return () => {
      active = false;
      es.close();
      esRef.current = null;
      statusRef.current = "disconnected";
    };
  }, [unitId, enabled, handleEvent]);

  return { status: statusRef.current };
}
