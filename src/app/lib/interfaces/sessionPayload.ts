export interface SessionPayload {
  userId: number;
  username: string;
  nama: string;

  //Akses kontrol
  role: "admin" | "apoteker" | "asisten_apoteker" | "operator" | "kiosk";

  //Unit penugasan - dipake untuk semua hook
  unitId: number;

  iat?: number;
  exp?: number;
}
