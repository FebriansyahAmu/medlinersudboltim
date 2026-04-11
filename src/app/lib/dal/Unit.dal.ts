"server-only";

// ─────────────────────────────────────────────────────────────
//  lib/dal/Unit.dal.ts
//
//  Data Access Layer untuk tabel `units`.
// ─────────────────────────────────────────────────────────────

import { prisma } from "../prisma";

export interface UnitPublicInfo {
  id: number;
  kode: string;
  nama: string;
}

export interface UnitWithToken extends UnitPublicInfo {
  jenis: string;
  lantai: number | null;
  hasToken: boolean;
  tokenPreview: string | null; // 8 char pertama untuk preview
}

export const unitDal = {
  // List semua unit aktif dengan status token (untuk halaman pengaturan admin).
  // Token asli tidak dikembalikan — hanya preview 8 char pertama.
  async getAllWithTokenStatus(): Promise<UnitWithToken[]> {
    const rows = await prisma.units.findMany({
      where: { is_active: true, deleted_at: null },
      select: {
        id: true,
        kode: true,
        nama: true,
        jenis: true,
        lantai: true,
        display_token: true,
      },
      orderBy: [{ jenis: "asc" }, { nama: "asc" }],
    });

    return rows.map((r) => ({
      id: Number(r.id),
      kode: r.kode,
      nama: r.nama,
      jenis: r.jenis,
      lantai: r.lantai ?? null,
      hasToken: r.display_token !== null,
      tokenPreview: r.display_token ? String(r.display_token).slice(0, 8) + "..." : null,
    }));
  },

  // Cari unit berdasarkan display_token.
  // Return null jika token tidak ditemukan atau unit tidak aktif.
  async findByDisplayToken(token: string): Promise<UnitPublicInfo | null> {
    const row = await prisma.units.findFirst({
      where: { display_token: token, is_active: true, deleted_at: null },
      select: { id: true, kode: true, nama: true },
    });
    if (!row) return null;
    return { id: Number(row.id), kode: row.kode, nama: row.nama };
  },

  // Generate token baru untuk unit, simpan ke DB, return token.
  async generateDisplayToken(unitId: number): Promise<string> {
    const { randomBytes } = await import("crypto");
    const token = randomBytes(32).toString("hex"); // 64 hex chars
    await prisma.units.update({
      where: { id: BigInt(unitId) },
      data: { display_token: token },
    });
    return token;
  },

  // Hapus token (invalidate semua link display yang sudah dibuat).
  async revokeDisplayToken(unitId: number): Promise<void> {
    await prisma.units.update({
      where: { id: BigInt(unitId) },
      data: { display_token: null },
    });
  },
};
