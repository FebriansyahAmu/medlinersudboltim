"use client";

// ─────────────────────────────────────────────────────────────
//  app/providers.tsx
//
//  Wrapper client-side untuk semua provider yang dibutuhkan:
//    - QueryClientProvider  → TanStack Query
//    - ReactQueryDevtools   → hanya di development
//
//  Kenapa dipisah dari layout.tsx?
//  layout.tsx adalah Server Component by default di Next.js
//  App Router. QueryClientProvider butuh 'use client', jadi
//  harus dipisah ke file ini lalu di-wrap di layout.tsx.
//
//  QueryClient dibuat dengan useState agar setiap user/session
//  dapat instance sendiri — tidak di-share antar request.
// ─────────────────────────────────────────────────────────────

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data dianggap fresh selama 30 detik
            // SSE yang akan invalidate jika ada perubahan lebih cepat
            staleTime: 30_000,

            // Tidak refetch saat user alt+tab balik ke halaman
            // SSE sudah handle update realtime
            refetchOnWindowFocus: false,

            // Coba ulang 1x saja jika gagal
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* DevTools hanya muncul di development — tidak di production */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
