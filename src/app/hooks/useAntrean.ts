"use client";
// ─────────────────────────────────────────────────────────────
//  useAntrean.ts
//
//  Semua TanStack Query hooks untuk antrian farmasi.
//
//  Berisi:
//    queryKeys              — key factory terpusat (satu tempat)
//    useAntreanList         — list antrian (halaman petugas, display)
//    useAntreanDetail       — satu antrian by nomorAntrian
//    useStatsHariIni        — counter strip (Menunggu/Dipanggil/Selesai)
//    useBpjsTaskStatus      — status task BPJS per antrian
//
//    usePanggilBerikutnya   — mutation: panggil antrian berikutnya
//    usePanggilNomor        — mutation: panggil nomor spesifik dari tabel
//    usePanggilUlang        — mutation: panggil ulang nomor aktif
//    useLewati              — mutation: lewati (pasien tidak hadir)
//    useTandaiSelesai       — mutation: tandai selesai dilayani
//    useLengkapiData        — mutation: isi kodeBooking + nama + jenisResep
//    useAmbilNomor          — mutation: pasien ambil nomor di kiosk
//    useKirimTaskBpjs       — mutation: kirim task ke API BPJS
//
//  Pola yang dipakai:
//    - Optimistic update untuk aksi petugas (UI langsung berubah
//      sebelum server confirm) → pengalaman terasa instan
//    - onError rollback ke data sebelumnya jika server gagal
//    - invalidateQueries setelah sukses untuk sinkronisasi akhir
//    - SSE (useAntreanStream) yang menginvalidate query secara
//      realtime dari sisi server
// ─────────────────────────────────────────────────────────────

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";

import type {
  Antrean,
  AntreanListParams,
  AntreanStatus,
  BpjsTaskInfo,
  BpjsTaskPayload,
  JenisResep,
  StatsHariIni,
  TaskId,
} from "../types/antrianTypes";

// ─────────────────────────────────────────────────────────────
//  BASE URL
//  unitId tidak perlu di URL — diambil dari session login
//  petugas di sisi server.
// ─────────────────────────────────────────────────────────────
const base = `/api/antrean`;

// ─────────────────────────────────────────────────────────────
//  QUERY KEYS
// ─────────────────────────────────────────────────────────────
export const queryKeys = {
  all: (unitId: number) => ["antrean", unitId] as const,

  list: (unitId: number, params?: Partial<AntreanListParams>) =>
    ["antrean", unitId, "list", params ?? {}] as const,

  detail: (unitId: number, nomorAntrian: string) =>
    ["antrean", unitId, "detail", nomorAntrian] as const,

  stats: (unitId: number) => ["antrean", unitId, "stats"] as const,

  bpjsTask: (unitId: number, nomorAntrian: string) =>
    ["antrean", unitId, "bpjs-task", nomorAntrian] as const,
};

// ─────────────────────────────────────────────────────────────
//  FETCH HELPER
// ─────────────────────────────────────────────────────────────
async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─────────────────────────────────────────────────────────────
//  QUERIES (READ)
// ─────────────────────────────────────────────────────────────

// GET /api/antrean?status=waiting,called&search=ahmad
// Petugas: pakai session cookie (tidak perlu token/unitId di URL).
// Display: pakai ?token=xxx (tidak punya session).
export function useAntreanList(
  params: AntreanListParams,
  options?: Omit<UseQueryOptions<Antrean[]>, "queryKey" | "queryFn">,
) {
  const { unitId, token, status, search } = params;

  const query = new URLSearchParams();
  if (token) query.set("token", token);
  if (status) {
    const val = Array.isArray(status) ? status.join(",") : status;
    query.set("status", val);
  }
  if (search) query.set("search", search);

  return useQuery<Antrean[]>({
    queryKey: queryKeys.list(unitId, { status, search }),
    queryFn: () => apiFetch<Antrean[]>(`${base}?${query.toString()}`),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    ...options,
  });
}

// GET /api/antrean/:nomor
export function useAntreanDetail(
  unitId: number,
  nomor: string | null,
  options?: Omit<UseQueryOptions<Antrean>, "queryKey" | "queryFn">,
) {
  return useQuery<Antrean>({
    queryKey: queryKeys.detail(unitId, nomor ?? ""),
    queryFn: () => apiFetch<Antrean>(`${base}/${nomor}`),
    enabled: !!nomor,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    ...options,
  });
}

// GET /api/antrean/stats
// token opsional — untuk display publik (tanpa session cookie).
export function useStatsHariIni(
  unitId: number,
  options?: Omit<UseQueryOptions<StatsHariIni>, "queryKey" | "queryFn">,
  token?: string,
) {
  const qs = token ? `?token=${token}` : "";
  return useQuery<StatsHariIni>({
    queryKey: queryKeys.stats(unitId),
    queryFn: () => apiFetch<StatsHariIni>(`${base}/stats${qs}`),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    ...options,
  });
}

// GET /api/antrean/:nomor/tasks
export function useBpjsTaskStatus(
  unitId: number,
  nomor: string | null,
  options?: Omit<UseQueryOptions<BpjsTaskInfo[]>, "queryKey" | "queryFn">,
) {
  return useQuery<BpjsTaskInfo[]>({
    queryKey: queryKeys.bpjsTask(unitId, nomor ?? ""),
    queryFn: () => apiFetch<BpjsTaskInfo[]>(`${base}/${nomor}/tasks`),
    enabled: !!nomor,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    ...options,
  });
}

// ─────────────────────────────────────────────────────────────
//  MUTATIONS (WRITE)
// ─────────────────────────────────────────────────────────────

// POST /api/antrean
export function useAmbilNomor(unitId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<Pick<Antrean, "nomorAntrian" | "nomorUrut" | "waktuDaftar">>(base, {
        method: "POST",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.stats(unitId) });
      qc.invalidateQueries({ queryKey: queryKeys.list(unitId) });
    },
  });
}

// PATCH /api/antrean/:nomor
interface LengkapiDataInput {
  nomorAntrian: string;
  kodeBooking: string;
  namaPasien: string;
  jenisResep: JenisResep;
}

export function useLengkapiData(unitId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ nomorAntrian, ...body }: LengkapiDataInput) =>
      apiFetch<Antrean>(`${base}/${nomorAntrian}`, {
        method: "PATCH",
        body: JSON.stringify({
          kodeBooking: body.kodeBooking,
          namaPasien: body.namaPasien,
          jenisResep: body.jenisResep,
        }),
      }),

    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: queryKeys.list(unitId) });
      const snapshot = qc.getQueryData<Antrean[]>(queryKeys.list(unitId));

      qc.setQueryData<Antrean[]>(
        queryKeys.list(unitId),
        (old) =>
          old?.map((a) =>
            a.nomorAntrian === input.nomorAntrian ? { ...a, ...input } : a,
          ) ?? [],
      );

      return { snapshot };
    },

    onError: (_e, _i, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(queryKeys.list(unitId), ctx.snapshot);
    },

    onSettled: (_d, _e, input) => {
      qc.invalidateQueries({ queryKey: queryKeys.list(unitId) });
      qc.invalidateQueries({
        queryKey: queryKeys.detail(unitId, input.nomorAntrian),
      });
    },
  });
}

// POST /api/antrean/panggil
export function usePanggilBerikutnya(unitId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { loketId?: number } = {}) =>
      apiFetch<Antrean>(`${base}/panggil`, {
        method: "POST",
        body: JSON.stringify(body),
      }),

    onMutate: async () => {
      await qc.cancelQueries({ queryKey: queryKeys.list(unitId) });
      const snapshot = qc.getQueryData<Antrean[]>(queryKeys.list(unitId));

      qc.setQueryData<Antrean[]>(queryKeys.list(unitId), (old) => {
        if (!old) return old;
        const first = old.find((a) => a.status === "waiting");
        if (!first) return old;
        return old.map((a) =>
          a.nomorAntrian === first.nomorAntrian
            ? {
                ...a,
                status: "called" as AntreanStatus,
                waktuPanggil: new Date().toISOString(),
              }
            : a,
        );
      });

      return { snapshot };
    },

    onError: (_e, _i, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(queryKeys.list(unitId), ctx.snapshot);
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.list(unitId) });
      qc.invalidateQueries({ queryKey: queryKeys.stats(unitId) });
    },
  });
}

// POST /api/antrean/:nomor/panggil
export function usePanggilNomor(unitId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (nomorAntrian: string) =>
      apiFetch<Antrean>(`${base}/${nomorAntrian}/panggil`, {
        method: "POST",
      }),

    onMutate: async (nomor) => {
      await qc.cancelQueries({ queryKey: queryKeys.list(unitId) });
      const snapshot = qc.getQueryData<Antrean[]>(queryKeys.list(unitId));

      qc.setQueryData<Antrean[]>(
        queryKeys.list(unitId),
        (old) =>
          old?.map((a) =>
            a.nomorAntrian === nomor
              ? {
                  ...a,
                  status: "called" as AntreanStatus,
                  waktuPanggil: new Date().toISOString(),
                }
              : a,
          ) ?? [],
      );

      return { snapshot };
    },

    onError: (_e, _i, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(queryKeys.list(unitId), ctx.snapshot);
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.list(unitId) });
      qc.invalidateQueries({ queryKey: queryKeys.stats(unitId) });
    },
  });
}

// POST /api/antrean/:nomor/panggil-ulang
export function usePanggilUlang(unitId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (nomorAntrian: string) =>
      apiFetch<{ jumlahPanggilan: number }>(
        `${base}/${nomorAntrian}/panggil-ulang`,
        { method: "POST" },
      ),
    onSuccess: (_d, nomor) => {
      qc.invalidateQueries({ queryKey: queryKeys.detail(unitId, nomor) });
    },
  });
}

// POST /api/antrean/:nomor/lewati
export function useLewati(unitId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (nomorAntrian: string) =>
      apiFetch<Antrean>(`${base}/${nomorAntrian}/lewati`, {
        method: "POST",
      }),

    onMutate: async (nomor) => {
      await qc.cancelQueries({ queryKey: queryKeys.list(unitId) });
      const snapshot = qc.getQueryData<Antrean[]>(queryKeys.list(unitId));

      qc.setQueryData<Antrean[]>(
        queryKeys.list(unitId),
        (old) =>
          old?.map((a) =>
            a.nomorAntrian === nomor
              ? { ...a, status: "absent" as AntreanStatus }
              : a,
          ) ?? [],
      );

      return { snapshot };
    },

    onError: (_e, _i, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(queryKeys.list(unitId), ctx.snapshot);
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.list(unitId) });
      qc.invalidateQueries({ queryKey: queryKeys.stats(unitId) });
    },
  });
}

// POST /api/antrean/:nomor/selesai
export function useTandaiSelesai(unitId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (nomorAntrian: string) =>
      apiFetch<Antrean>(`${base}/${nomorAntrian}/selesai`, {
        method: "POST",
      }),

    onMutate: async (nomor) => {
      await qc.cancelQueries({ queryKey: queryKeys.list(unitId) });
      const snapshot = qc.getQueryData<Antrean[]>(queryKeys.list(unitId));

      qc.setQueryData<Antrean[]>(
        queryKeys.list(unitId),
        (old) =>
          old?.map((a) =>
            a.nomorAntrian === nomor
              ? {
                  ...a,
                  status: "done" as AntreanStatus,
                  waktuSelesai: new Date().toISOString(),
                }
              : a,
          ) ?? [],
      );

      return { snapshot };
    },

    onError: (_e, _i, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(queryKeys.list(unitId), ctx.snapshot);
    },

    onSettled: (_d, _e, nomor) => {
      qc.invalidateQueries({ queryKey: queryKeys.list(unitId) });
      qc.invalidateQueries({ queryKey: queryKeys.stats(unitId) });
      qc.invalidateQueries({ queryKey: queryKeys.detail(unitId, nomor) });
    },
  });
}

// POST /api/antrean/:nomor/farmasi-register
export function useDaftarFarmasiBpjs(unitId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (nomorAntrian: string) =>
      apiFetch<{ ok: boolean; latencyMs: number; responseCode: string; responseBody: object }>(
        `${base}/${nomorAntrian}/farmasi-register`,
        { method: "POST" },
      ),
    onSettled: (_d, _e, nomorAntrian) => {
      // Refresh detail agar farmasiTerdaftar terupdate di UI
      qc.invalidateQueries({ queryKey: queryKeys.detail(unitId, nomorAntrian) });
      qc.invalidateQueries({ queryKey: queryKeys.list(unitId) });
    },
  });
}

// POST /api/antrean/:nomor/tasks
interface KirimTaskInput {
  nomorAntrian: string;
  payload: BpjsTaskPayload;
}

export function useKirimTaskBpjs(unitId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ nomorAntrian, payload }: KirimTaskInput) =>
      apiFetch<{ ok: boolean; latencyMs: number; responseCode: string }>(
        `${base}/${nomorAntrian}/tasks`,
        { method: "POST", body: JSON.stringify(payload) },
      ),

    onMutate: async ({ nomorAntrian, payload }) => {
      const key = queryKeys.bpjsTask(unitId, nomorAntrian);
      await qc.cancelQueries({ queryKey: key });
      const snapshot = qc.getQueryData<BpjsTaskInfo[]>(key);

      qc.setQueryData<BpjsTaskInfo[]>(key, (old) => [
        ...(old?.filter((t) => t.taskId !== payload.taskid) ?? []),
        {
          taskId: payload.taskid as TaskId,
          status: "pending",
          responseCode: null,
          waktuEvent: new Date(payload.waktu).toISOString(),
          dikirimAt: new Date().toISOString(),
          latencyMs: null,
        },
      ]);

      return { snapshot };
    },

    onError: (_e, { nomorAntrian }, ctx) => {
      if (ctx?.snapshot)
        qc.setQueryData(queryKeys.bpjsTask(unitId, nomorAntrian), ctx.snapshot);
    },

    onSettled: (_d, _e, { nomorAntrian }) => {
      qc.invalidateQueries({
        queryKey: queryKeys.bpjsTask(unitId, nomorAntrian),
      });
    },
  });
}

// ─────────────────────────────────────────────────────────────
//  HELPER: resolveWaktuTask
//
//  task 5  → waktuDaftar   (selesai poli, mulai tunggu farmasi)
//  task 6  → waktuPanggil  (dipanggil / mulai buat obat)
//  task 7  → waktuSelesai  (obat selesai dibuat)
//  task 99 → waktuPanggil  (tidak hadir / batal)
// ─────────────────────────────────────────────────────────────
export function resolveWaktuTask(taskId: TaskId, antrean: Antrean): number {
  const toMs = (iso: string | null) =>
    iso ? new Date(iso).getTime() : Date.now();

  switch (taskId) {
    case 5:
      return toMs(antrean.waktuDaftar);
    case 6:
      return toMs(antrean.WaktuPanggil);
    case 7:
      return toMs(antrean.waktuSelesai);
    case 99:
      return toMs(antrean.WaktuPanggil);
  }
}
