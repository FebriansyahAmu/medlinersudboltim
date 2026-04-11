"server-only";

import { PrismaClient } from "@prisma/client";
import type { SessionPayload } from "../interfaces/sessionPayload";
import { prisma } from "../prisma";

export type SafeUser = {
  id: number;
  username: string;
  nama: string;
  email: string | null;
  role: SessionPayload["role"];
  unitId: number | null;
  isActive: boolean;
  lastLoginAt: Date | null;
};

export class AuthDal {
  constructor(private readonly db: PrismaClient) {}

  //retuyrn user dengan password_hash untuk verifikasi bcrypts
  async findUserByUsername(username: string) {
    return this.db.users.findUnique({
      where: { username, deleted_at: null, is_active: true },
      select: {
        id: true,
        username: true,
        nama: true,
        email: true,
        role: true,
        unit_id: true,
        password_hash: true,
      },
    });
  }

  //finduserbyID tidak return passwordhash, ini tuh buat di get auth me useAuth hooks
  async findUserById(id: number): Promise<SafeUser | null> {
    const row = await this.db.users.findUnique({
      where: {
        id,
        deleted_at: null,
        is_active: true,
      },
      select: {
        id: true,
        username: true,
        nama: true,
        email: true,
        role: true,
        unit_id: true,
        is_active: true,
        last_login_at: true,
      },
    });

    if (!row) return null;

    return {
      id: Number(row.id),
      username: row.username,
      nama: row.nama,
      email: row.email,
      role: row.role as SafeUser["role"],
      unitId: row.unit_id != null ? Number(row.unit_id) : null,
      isActive: row.is_active,
      lastLoginAt: row.last_login_at,
    };
  }

  //updateLastLogin
  async updateLastLogin(userId: number): Promise<void> {
    await this.db.users.update({
      where: { id: userId },
      data: { last_login_at: new Date() },
    });
  }
}

//singleton instance
export const authDal = new AuthDal(prisma);
