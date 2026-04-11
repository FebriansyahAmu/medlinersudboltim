// ─────────────────────────────────────────────────────────────
//  GET /api/stream
//
//  Server-Sent Events (SSE) endpoint untuk realtime update.
//  unitId tidak perlu di query string — diambil dari JWT cookie.
//
//  Behavior:
//    - Subscribe ke EventEmitter channel `antrian:{unitId}`
//    - Setiap event di-flush sebagai "data: {json}\n\n"
//    - Heartbeat tiap 25 detik agar koneksi tidak idle-close
//    - Auto-cleanup saat client disconnect (req.signal.abort)
//
//  Format event sesuai kontrak useAntreanStream.ts (client).
// ─────────────────────────────────────────────────────────────

import { NextRequest } from "next/server";
import { resolvePublicUnitId } from "@/app/lib/apiHelpers";
import { subscribeEvents } from "@/app/lib/emitter";
import type { AntreanEvent } from "@/app/types/antrianTypes";

// SSE harus selalu dynamic (jangan di-cache / di-prerender)
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const unitId = await resolvePublicUnitId(req);
  if (unitId === null) return new Response("Unauthorized", { status: 401 });
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;

      const safeEnqueue = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // controller sudah ditutup — abaikan
        }
      };

      // Initial comment — flush header agar EventSource fire `onopen`
      safeEnqueue(": connected\n\n");

      // Subscribe ke event bus
      const unsubscribe = subscribeEvents(unitId, (event: AntreanEvent) => {
        safeEnqueue(`data: ${JSON.stringify(event)}\n\n`);
      });

      // Heartbeat 25s — cegah proxy/load-balancer drop koneksi idle
      const heartbeat = setInterval(() => {
        safeEnqueue(`: heartbeat ${Date.now()}\n\n`);
      }, 25_000);

      // Cleanup saat client putus koneksi
      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // sudah ditutup
        }
      };

      req.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // disable proxy buffering (Nginx)
    },
  });
}
