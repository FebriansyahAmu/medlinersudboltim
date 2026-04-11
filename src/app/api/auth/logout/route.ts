import { NextResponse } from "next/server";
import { deleteSession } from "@/app/lib/sessions";

export async function POST() {
  await deleteSession();

  return NextResponse.json({ message: "Logout Berhasil" });
}
