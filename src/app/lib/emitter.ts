"server-only";

// ─────────────────────────────────────────────────────────────
//  lib/emitter.ts
//
//  SSE event bus berbasis Node.js EventEmitter.
//  Singleton global agar tidak di-reset saat hot-reload dev.
//
//  Dipakai oleh:
//    - Route handler  → publishEvent() setelah DB update
//    - /api/stream    → subscribeEvents() untuk stream ke client
//
//  Catatan:
//    - Cocok untuk single-instance Node.js (tanpa load balancer).
//    - Jika scale ke multi-instance, ganti dengan Redis Pub/Sub
//      dengan API yang sama (publishEvent / subscribeEvents).
// ─────────────────────────────────────────────────────────────

import { EventEmitter } from "events";
import type { AntreanEvent } from "../types/antrianTypes";

const globalForEmitter = global as unknown as {
  __antreanEmitter?: EventEmitter;
};

const emitter: EventEmitter =
  globalForEmitter.__antreanEmitter ?? new EventEmitter();

// Default Node.js limit = 10. Naikkan agar banyak client SSE
// (display TV, petugas, kiosk) bisa subscribe bersamaan tanpa warning.
emitter.setMaxListeners(500);

if (process.env.NODE_ENV !== "production") {
  globalForEmitter.__antreanEmitter = emitter;
}

// Publish event ke semua subscriber unit ini
export function publishEvent(unitId: number, event: AntreanEvent): void {
  emitter.emit(`antrian:${unitId}`, event);
}

// Subscribe event; kembalikan fungsi unsubscribe
export function subscribeEvents(
  unitId: number,
  callback: (event: AntreanEvent) => void
): () => void {
  const channel = `antrian:${unitId}`;
  emitter.on(channel, callback);
  return () => emitter.off(channel, callback);
}
