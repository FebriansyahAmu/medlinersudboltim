// ─────────────────────────────────────────────────────────────
//  src/proxy.ts
//
//  Next.js 16 Proxy (pengganti `middleware.ts`).
//  Docs: https://nextjs.org/docs/app/api-reference/file-conventions/proxy
//
//  Runtime: Node.js — aman import `lib/sessions.ts` langsung
//  (tidak seperti middleware lama yang Edge-only).
//
//  Tugas:
//    1. Baca cookie session → verifikasi JWT (via lib/sessions)
//    2. Routing rules:
//        · "/"              : login page, kalau sudah login → /petugas-panggil
//        · PUBLIC_ROUTES    : selalu boleh (display, kiosk, ambil-antrean)
//        · PROTECTED_ROUTES : butuh session + role cocok; kalau tidak
//                             redirect ke "/" dengan ?next=<path>
//        · /api/*           : DI-SKIP — route handler punya requireSession
//                             sendiri di apiHelpers.ts
// ─────────────────────────────────────────────────────────────

import { NextResponse, type NextRequest } from "next/server";
import { getSessionFromRequest } from "@/app/lib/sessions";
import type { SessionPayload } from "@/app/lib/interfaces/sessionPayload";

type Role = SessionPayload["role"];

// ── Route config ──────────────────────────────────────────────

const LOGIN_PATH = "/";

// Halaman landing default per role. Dipakai saat:
//   1. User sudah login lalu akses "/" → langsung ke halaman kerjanya
//   2. User login tapi akses halaman yang role-nya tidak diizinkan
//      → dilempar ke landing-nya sendiri (bukan ke "/" yang bisa bikin loop)
function landingForRole(role: Role): string {
  switch (role) {
    case "kiosk":
      return "/kiosk";
    case "admin":
    case "apoteker":
    case "asisten_apoteker":
    case "operator":
    default:
      return "/petugas-panggil";
  }
}

// Halaman publik — tidak butuh login.
const PUBLIC_ROUTES: readonly string[] = [
  "/display", // papan antrian untuk TV
  "/kiosk", // kiosk ambil nomor (auth fisik; kiosk role menyusul)
  "/ambil-antrean", // ambil nomor antrian
];

// Halaman yang butuh login. `roles` = whitelist role yang boleh akses.
const PROTECTED_ROUTES: readonly { prefix: string; roles?: Role[] }[] = [
  {
    prefix: "/petugas-panggil",
    roles: ["admin", "apoteker", "asisten_apoteker", "operator"],
  },
  {
    prefix: "/pengaturan",
    roles: ["admin"],
  },
];

// ── Helpers ───────────────────────────────────────────────────

function matchPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix + "/");
}

function isPublic(pathname: string): boolean {
  return PUBLIC_ROUTES.some((r) => matchPrefix(pathname, r));
}

function findProtected(pathname: string) {
  return PROTECTED_ROUTES.find((r) => matchPrefix(pathname, r.prefix));
}

function redirectToLogin(req: NextRequest) {
  return NextResponse.redirect(new URL(LOGIN_PATH, req.url));
}

// ── Proxy entrypoint ──────────────────────────────────────────

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await getSessionFromRequest(req);

  // ── Login page ─────────────────────────────────────────────
  // Kalau sudah login, langsung lempar ke landing page sesuai role.
  if (pathname === LOGIN_PATH) {
    if (session) {
      return NextResponse.redirect(
        new URL(landingForRole(session.role), req.url),
      );
    }
    return NextResponse.next();
  }

  // ── Public ─────────────────────────────────────────────────
  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  // ── Protected ──────────────────────────────────────────────
  const rule = findProtected(pathname);
  if (rule) {
    if (!session) {
      return redirectToLogin(req);
    }

    if (rule.roles && !rule.roles.includes(session.role)) {
      // Role tidak cocok — lempar ke landing sesuai role (bukan ke "/"
      // karena "/" akan redirect balik ke sini dan bikin loop tak hingga).
      return NextResponse.redirect(
        new URL(landingForRole(session.role), req.url),
      );
    }

    return NextResponse.next();
  }

  // Default: pass-through untuk path yang tidak di-config
  // (halaman marketing, 404, dsb.)
  return NextResponse.next();
}

// ── Matcher ───────────────────────────────────────────────────
// Skip:
//   - /api/*              → route handler punya requireSession sendiri
//   - /_next/static, /_next/image, /favicon.ico, static assets
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|svg|ico|css|js|map|woff|woff2|ttf|eot)).*)",
  ],
};
