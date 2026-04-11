# Sistem Antrian Farmasi BPJS

### RSUD BOLTIM

Sistem manajemen antrian instalasi farmasi BPJS Kesehatan berbasis web. Dibangun dengan Next.js App Router, TypeScript, Prisma + MySQL, dan SSE (Server-Sent Events) untuk pembaruan data secara realtime.

---

## Daftar Isi

- [Gambaran Sistem](#gambaran-sistem)
- [Alur Lengkap](#alur-lengkap)
- [Tech Stack](#tech-stack)
- [Struktur Proyek](#struktur-proyek)
- [Arsitektur Layer](#arsitektur-layer)
- [Halaman & Komponen](#halaman--komponen)
- [API Endpoints](#api-endpoints)
- [Database](#database)
- [Realtime (SSE)](#realtime-sse)
- [Auth & Session](#auth--session)
- [Status Pengerjaan](#status-pengerjaan)
- [Setup & Instalasi](#setup--instalasi)
- [Variabel Environment](#variabel-environment)

---

## Gambaran Sistem

```
┌─────────────┐    ┌──────────────────┐    ┌─────────────────┐
│    KIOSK    │    │  PETUGAS PANGGIL │    │   DISPLAY TV    │
│  (publik)   │    │    (login)       │    │   (publik)      │
│             │    │                  │    │                 │
│ Pasien ambil│    │ • Panggil nomor  │    │ • Nomor besar   │
│ nomor &     │    │ • Lengkapi data  │    │ • Daftar antrian│
│ cetak tiket │    │ • Tandai selesai │    │ • Statistik     │
└──────┬──────┘    └────────┬─────────┘    └────────┬────────┘
       │                    │                        │
       └────────────────────┼────────────────────────┘
                            │  Next.js App Router
                    ┌───────▼────────┐
                    │   API Routes   │
                    │   (13 endpoint)│
                    └───────┬────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
       ┌──────▼──────┐ ┌────▼────┐ ┌─────▼──────┐
       │   Prisma    │ │ Emitter │ │ BPJS API   │
       │   + MySQL   │ │  (SSE)  │ │ (external) │
       └─────────────┘ └─────────┘ └────────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
       ┌──────▼──┐   ┌──────▼──┐  ┌──────▼──┐
       │  Kiosk  │   │Petugas  │  │Display  │
       │ (SSE ←) │   │(SSE ←)  │  │(SSE ←)  │
       └─────────┘   └─────────┘  └─────────┘
```

---

## Alur Lengkap

### 1. Pasien Ambil Nomor (Kiosk)

```
Pasien tekan tombol
        │
        ▼
POST /api/antrean
        │
        ├─ DAL: getOrCreateActiveSession(unitId)
        ├─ DAL: getNextNomorUrut(sessionId)   ← MAX() dari DB
        ├─ DAL: createAntrean(F-001, waiting)
        ├─ DAL: createAuditLog("AMBIL_NOMOR")
        │
        ├─ publishToUnit → SSE: NOMOR_BARU
        │         └─ Display TV: counter terupdate
        │         └─ Petugas: daftar terupdate
        │
        └─ return { nomorAntrian: "F-001", waktuDaftar: ISO }
                   │
                   ▼
           Tiket dicetak (window.print)
```

### 2. Petugas Login

```
LoginForm → POST /api/auth/login { username, password }
                    │
                    ├─ authDal.findUserByUsername()
                    ├─ bcrypt.compare(password, hash)
                    ├─ createSession() → set cookie "session" httpOnly
                    ├─ authDal.updateLastLogin()  ← fire & forget
                    │
                    └─ return { message: "Login berhasil." }
                               │
                               ▼
                    router.push("/petugas/panggil")
                               │
                    useAuth → GET /api/auth/me
                               └─ return { unitId, role, nama, ... }
```

### 3. Petugas Lengkapi Data Pasien

```
Petugas buka modal → isi kodeBooking, namaPasien, jenisResep
        │
        ▼
PATCH /api/antrean/:nomor
        │
        ├─ Validasi: kodeBooking, namaPasien, jenisResep wajib
        ├─ DAL: updateLengkapiData(id, { ... })
        ├─ DAL: createAuditLog("LENGKAPI_DATA")
        ├─ publishToUnit → SSE: DATA_DILENGKAPI
        │
        └─ return Antrean (updated)
```

### 4. Petugas Panggil Antrian

```
Petugas klik "Panggil Berikutnya"
        │
        ▼
POST /api/antrean/panggil
        │
        ├─ DAL: findActiveSession(unitId)
        ├─ DAL: panggilBerikutnya(sessionId)   ← antrian waiting urut terkecil
        │        └─ UPDATE status = "called", waktuPanggil = NOW()
        ├─ DAL: createAuditLog("PANGGIL")
        │
        ├─ publishToUnit → SSE: DIPANGGIL
        │         └─ Display TV: nomor besar berubah + TTS
        │         └─ Petugas: CallingPanel terupdate
        │
        └─ return Antrean (called)
```

### 5. Petugas Tandai Selesai

```
Petugas klik "Tandai Selesai"
        │
        ▼
POST /api/antrean/:nomor/selesai
        │
        ├─ DAL: selesai(id)
        │        └─ UPDATE status = "done", waktuSelesai = NOW()
        ├─ DAL: createAuditLog("SELESAI")
        ├─ publishToUnit → SSE: SELESAI
        │
        └─ return Antrean (done)
```

### 6. Kirim Task ke API BPJS

```
Petugas klik tombol Task (5 / 6 / 7 / 99)
        │
        ▼
POST /api/antrean/:nomor/tasks
  body: { kodebooking, taskid, waktu, jenisresep? }
        │
        ├─ Validasi body
        ├─ Build payload BPJS
        │
        ├─ fetch(BPJS_API_URL, payload)     ← ke server BPJS eksternal
        │         └─ timeout 10 detik
        │         └─ dev mode: simulasi sukses
        │
        ├─ DAL: createBpjsTask(...)         ← catat hasil (append-only)
        ├─ publishToUnit → SSE: TASK_BPJS_TERKIRIM
        │
        └─ return { ok, latencyMs, responseCode }

Waktu per task (dari resolveWaktuTask):
  Task 5  → waktuDaftar   (pasien masuk antrian farmasi)
  Task 6  → waktuPanggil  (dipanggil petugas)
  Task 7  → waktuSelesai  (obat selesai)
  Task 99 → waktuPanggil  (tidak hadir / batal)
```

### 7. Realtime SSE

```
Browser (kiosk / petugas / display)
        │
        │  GET /api/stream?unitId=1   ← EventSource
        ▼
SSE Route Handler
        │
        ├─ subscribe ke emitter channel "antrian:1"
        ├─ kirim heartbeat tiap 25 detik
        │
        └─ Saat ada event dari route handler lain:
                   publishToUnit(unitId, event)
                           │
                           ▼
                    emitter.emit("antrian:1", event)
                           │
                           ▼
                    SSE stream → browser
                           │
                    useAntreanStream.onEvent(event)
                           │
                    ├─ invalidateQueries  ← refetch data terbaru
                    └─ onEvent callback   ← side effect (TTS, log)
```

---

## Tech Stack

| Kategori      | Teknologi                         |
| ------------- | --------------------------------- |
| Framework     | Next.js 14+ (App Router)          |
| Language      | TypeScript                        |
| Styling       | Tailwind CSS                      |
| ORM           | Prisma                            |
| Database      | MySQL 8+                          |
| Auth          | JWT (jose) + httpOnly Cookie      |
| Password      | bcryptjs                          |
| Realtime      | Server-Sent Events (EventEmitter) |
| Data Fetching | TanStack Query v5                 |
| Runtime       | Node.js 20+                       |

---

## Struktur Proyek

```
antrian-farmasi/
│
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts          ✅ POST — login petugas
│   │   │   ├── logout/route.ts         ✅ POST — logout
│   │   │   └── me/route.ts             ✅ GET  — data user aktif
│   │   ├── antrean/
│   │   │   ├── route.ts                ✅ GET (list) + POST (ambil nomor)
│   │   │   ├── stats/route.ts          ✅ GET  — statistik hari ini
│   │   │   ├── panggil/route.ts        ✅ POST — panggil berikutnya
│   │   │   └── [nomor]/
│   │   │       ├── route.ts            ✅ GET (detail) + PATCH (lengkapi)
│   │   │       ├── panggil/route.ts    ✅ POST — panggil nomor spesifik
│   │   │       ├── panggil-ulang/route.ts ✅ POST — panggil ulang
│   │   │       ├── lewati/route.ts     ✅ POST — tidak hadir
│   │   │       ├── selesai/route.ts    ✅ POST — tandai selesai
│   │   │       └── tasks/route.ts      ✅ GET (status) + POST (kirim BPJS)
│   │   └── stream/route.ts             ✅ GET  — SSE endpoint
│   │
│   ├── login/page.tsx                  ✅ Halaman login (SSR + redirect)
│   ├── kiosk/page.tsx                  ✅ Halaman ambil nomor antrian
│   ├── display/page.tsx                ✅ Layar TV antrian
│   ├── petugas/
│   │   ├── panggil/page.tsx            ✅ Halaman petugas panggil
│   │   └── task-bpjs/page.tsx          ✅ Halaman kirim task BPJS
│   ├── layout.tsx                      ✅ Root layout + Providers
│   ├── providers.tsx                   ✅ QueryClientProvider
│   └── globals.css                     ✅ Global styles + animasi
│
├── components/
│   ├── auth/
│   │   └── LoginForm.tsx               ✅ Form login (client)
│   ├── kiosk/
│   │   ├── AmbilButton.tsx             ✅ Tombol ambil nomor + loading
│   │   ├── CounterStrip.tsx            ✅ Counter menunggu / total
│   │   └── PrintTicket.tsx             ✅ Area cetak tiket thermal 80mm
│   ├── display/
│   │   ├── DisplayHeader.tsx           ✅ Header + jam realtime
│   │   ├── CallingDisplay.tsx          ✅ Nomor besar + nama pasien
│   │   ├── QueueSidebar.tsx            ✅ Daftar antrian + stats
│   │   ├── Ticker.tsx                  ✅ Marquee berjalan
│   │   └── DisplayFooter.tsx           ✅ Footer + indikator live
│   ├── petugas/
│   │   ├── CallingPanel.tsx            ✅ Panel nomor sedang dipanggil
│   │   ├── QueueTable.tsx              ✅ Tabel antrian + tab filter
│   │   ├── ModalLengkapi.tsx           ✅ Modal input data pasien
│   │   ├── NextPreview.tsx             ✅ Preview antrian berikutnya
│   │   ├── StatsStrip.tsx              ✅ Strip statistik harian
│   │   ├── ActivityLog.tsx             ✅ Log aktivitas realtime
│   │   └── Clock.tsx                   ✅ Jam digital
│   └── task-bpjs/
│       ├── PasienGrid.tsx              ✅ Grid pilih pasien + search
│       ├── PasienInfo.tsx              ✅ Detail info pasien terpilih
│       ├── TaskTimeline.tsx            ✅ Timeline progress task 5→6→7/99
│       ├── TaskCardList.tsx            ✅ 4 card task + status sent/locked
│       └── ResponsePanel.tsx           ✅ Response BPJS + riwayat log
│
├── hooks/
│   ├── useAntrean.ts                   ✅ Semua query & mutation antrian
│   ├── useAntreanStream.ts             ✅ SSE client + invalidate cache
│   └── useAuth.ts                      ✅ Baca data user dari /api/auth/me
│
├── lib/
│   ├── dal/
│   │   ├── auth.dal.ts                 ✅ DAL users (class + singleton)
│   │   └── antrean.dal.ts              ✅ DAL antrian + tasks + audit
│   ├── interfaces/
│   │   └── sessionPayload.ts           ✅ Interface JWT payload
│   ├── emitter.ts                      ✅ Global EventEmitter untuk SSE
│   ├── prisma.ts                       ✅ Prisma client singleton
│   └── session.ts                      ✅ JWT encrypt/verify/cookie
│
├── middleware.ts                        ✅ Auth guard + inject header
│
├── prisma/
│   └── schema.prisma                   ❌ Belum dibuat
│
├── types/
│   └── antrianTypes.ts                 ❌ Belum dibuat (masih di hooks/)
│
├── .env.example                        ❌ Belum dibuat
├── tailwind.config.ts                  ❌ Belum dibuat
├── tsconfig.json                       ❌ Belum dibuat
└── package.json                        ❌ Belum dibuat
```

---

## Arsitektur Layer

```
┌─────────────────────────────────────────────────────┐
│                   CLIENT (Browser)                   │
│  Pages (RSC/Client) → Hooks (TanStack Query) → SSE  │
└────────────────────────┬────────────────────────────┘
                         │ HTTP + Cookie
┌────────────────────────▼────────────────────────────┐
│                    MIDDLEWARE                         │
│  Verifikasi JWT → inject x-unit-id / x-user-id      │
└────────────────────────┬────────────────────────────┘
                         │ Request + Headers
┌────────────────────────▼────────────────────────────┐
│                ROUTE HANDLERS (API)                  │
│  Validasi → Business Logic → Emit SSE               │
└───────────┬──────────────────────┬──────────────────┘
            │                      │
┌───────────▼──────┐    ┌──────────▼──────────┐
│   DAL (Class)    │    │   Emitter           │
│  auth.dal.ts     │    │  publishToUnit()    │
│  antrean.dal.ts  │    │  → SSE broadcast    │
└───────────┬──────┘    └─────────────────────┘
            │ Prisma
┌───────────▼──────────────────────────────────────────┐
│                   MySQL Database                      │
│  units, lokets, users, queue_sessions, antreans,     │
│  bpjs_tasks, audit_logs, display_configs             │
└──────────────────────────────────────────────────────┘
```

### Prinsip Arsitektur

**DAL (Data Access Layer)** — semua query Prisma ada di class `AuthDal` dan `AntreanDal`. Route handler tidak pernah import `prisma` langsung.

**Emitter** — `publishToUnit(unitId, event)` dipanggil di route handler setelah DB berhasil di-update. SSE handler subscribe ke channel unit masing-masing.

**Middleware** — verifikasi JWT sekali di middleware, inject `x-unit-id` ke header. Route handler tidak perlu verify ulang, cukup baca header.

**Server-only** — `lib/*.ts` dan `lib/dal/*.ts` ditandai `"server-only"` agar tidak bocor ke client bundle.

---

## Halaman & Komponen

### `/login` — Halaman Login

- Server Component: redirect ke `/petugas/panggil` jika sudah login
- `LoginForm` (Client): form username + password, redirect setelah `200 OK`

### `/kiosk` — Kiosk Ambil Nomor

- Akses publik (tidak perlu login)
- `CounterStrip`: menampilkan counter Menunggu / Total realtime via SSE
- `AmbilButton`: tombol besar + loading state
- `PrintTicket`: area cetak tiket thermal 80mm (hidden di layar, tampil saat print)

### `/display` — Layar TV Antrian

- Akses publik, `unitId` dari query param `?unitId=1`
- `CallingDisplay`: nomor besar + animasi + TTS saat nomor baru dipanggil
- `QueueSidebar`: daftar semua antrian hari ini + stats strip
- `Ticker`: marquee berjalan di bagian bawah
- Update realtime via SSE tanpa polling

### `/petugas/panggil` — Petugas Panggil

- Wajib login, `unitId` dari JWT
- `CallingPanel`: nomor sedang dipanggil + tombol aksi
- `QueueTable`: tabel antrian dengan tab filter (Menunggu / Dipanggil / Selesai / Absen)
- `ModalLengkapi`: modal input kodeBooking + namaPasien + jenisResep
- `StatsStrip`: strip 4 statistik harian
- `ActivityLog`: log aksi realtime
- `NextPreview`: preview antrian berikutnya

### `/petugas/task-bpjs` — Kirim Task BPJS

- Wajib login
- `PasienGrid`: pilih pasien dari daftar + search
- `PasienInfo`: detail pasien + waktu layanan
- `TaskTimeline`: progress timeline task 5 → 6 → 7 / 99
- `TaskCardList`: 4 card task dengan lock logic (task 6 butuh 5, task 7 butuh 6)
- `ResponsePanel + SendLog`: response API BPJS + riwayat pengiriman

---

## API Endpoints

### Auth

| Method | Endpoint           | Auth | Keterangan                |
| ------ | ------------------ | ---- | ------------------------- |
| `POST` | `/api/auth/login`  | ✗    | Login, set cookie session |
| `POST` | `/api/auth/logout` | ✓    | Hapus cookie session      |
| `GET`  | `/api/auth/me`     | ✓    | Data user aktif           |

### Antrian

| Method  | Endpoint                            | Auth | Keterangan                      |
| ------- | ----------------------------------- | ---- | ------------------------------- |
| `POST`  | `/api/antrean`                      | ✗    | Kiosk ambil nomor               |
| `GET`   | `/api/antrean`                      | ✓    | List antrian `?status=&search=` |
| `GET`   | `/api/antrean/stats`                | ✓    | Statistik hari ini              |
| `POST`  | `/api/antrean/panggil`              | ✓    | Panggil antrian berikutnya      |
| `GET`   | `/api/antrean/:nomor`               | ✓    | Detail satu antrian             |
| `PATCH` | `/api/antrean/:nomor`               | ✓    | Lengkapi data pasien            |
| `POST`  | `/api/antrean/:nomor/panggil`       | ✓    | Panggil nomor spesifik          |
| `POST`  | `/api/antrean/:nomor/panggil-ulang` | ✓    | Panggil ulang                   |
| `POST`  | `/api/antrean/:nomor/lewati`        | ✓    | Tandai tidak hadir              |
| `POST`  | `/api/antrean/:nomor/selesai`       | ✓    | Tandai selesai dilayani         |
| `GET`   | `/api/antrean/:nomor/tasks`         | ✓    | Status task BPJS                |
| `POST`  | `/api/antrean/:nomor/tasks`         | ✓    | Kirim task ke BPJS              |

### Realtime

| Method | Endpoint               | Auth | Keterangan           |
| ------ | ---------------------- | ---- | -------------------- |
| `GET`  | `/api/stream?unitId=1` | ✗/✓  | SSE — event realtime |

---

## Database

### Tabel (8)

| Tabel             | Keterangan                             |
| ----------------- | -------------------------------------- |
| `units`           | Master unit (farmasi + poli)           |
| `lokets`          | Loket pelayanan per unit               |
| `users`           | Akun petugas / login                   |
| `queue_sessions`  | Sesi antrian per hari per unit         |
| `antreans`        | Data antrian (inti)                    |
| `bpjs_tasks`      | Log pengiriman task BPJS (append-only) |
| `audit_logs`      | Log semua aksi petugas (append-only)   |
| `display_configs` | Konfigurasi layar display per unit     |

### View (3)

| View               | Dipakai oleh                    |
| ------------------ | ------------------------------- |
| `antrian_aktif`    | `GET /api/antrean`              |
| `bpjs_task_status` | `GET /api/antrean/:nomor/tasks` |
| `stats_hari_ini`   | `GET /api/antrean/stats`        |

### ENUM Penting

```sql
-- Harus match AntreanStatus di types.ts
status: 'waiting' | 'called' | 'done' | 'absent' | 'batal'

-- Harus match JenisResep di types.ts (label asli, bukan snake_case)
jenis_resep: 'Non racikan' | 'Racikan' | 'Tidak ada'

-- Harus match TaskStatus di types.ts
bpjs_tasks.status: 'sukses' | 'gagal' | 'pending'
```

---

## Realtime (SSE)

### Event Types

| Event                | Dikirim saat                  | Handler di client       |
| -------------------- | ----------------------------- | ----------------------- |
| `NOMOR_BARU`         | Pasien ambil nomor di kiosk   | Invalidate list + stats |
| `DIPANGGIL`          | Petugas panggil antrian       | Invalidate list + TTS   |
| `PANGGIL_ULANG`      | Petugas panggil ulang         | TTS saja                |
| `SELESAI`            | Petugas tandai selesai        | Invalidate list + stats |
| `TIDAK_HADIR`        | Petugas lewati antrian        | Invalidate list + stats |
| `DATA_DILENGKAPI`    | Petugas isi data pasien       | Invalidate list         |
| `STATS_UPDATE`       | Setiap perubahan stats        | Update cache stats      |
| `TASK_BPJS_TERKIRIM` | Task berhasil dikirim ke BPJS | Invalidate tasks        |

### Pola Invalidasi Cache

```
SSE Event masuk di useAntreanStream
        │
        ├─ invalidateQueries(queryKeys.list)    ← refetch daftar antrian
        ├─ invalidateQueries(queryKeys.stats)   ← refetch statistik
        └─ onEvent callback (opsional)          ← side effect UI / TTS
```

---

## Auth & Session

```
Login berhasil
    │
    ▼
JWT payload di-sign dengan SESSION_SECRET (HS256, expire 2 hari)
    │
    ▼
Disimpan di cookie httpOnly "session"
    │
    ▼
Setiap request → middleware.ts verify JWT
    │
    ├─ Valid   → inject x-unit-id, x-user-id, x-user-role ke header
    └─ Invalid → redirect /login (page) atau 401 (API)
```

### JWT Payload (SessionPayload)

```typescript
{
  userId: number; // users.id
  username: string; // untuk display
  nama: string; // nama lengkap
  role: "admin" | "apoteker" | "asisten_apoteker" | "operator" | "kiosk";
  unitId: number; // unit penugasan — scope data semua query
}
```

---

## Status Pengerjaan

### ✅ Selesai

#### Frontend

- [x] Halaman login (SSR + redirect)
- [x] Halaman kiosk ambil nomor + cetak tiket thermal
- [x] Halaman display TV antrian (realtime, publik)
- [x] Halaman petugas panggil antrian
- [x] Halaman kirim task BPJS
- [x] Semua komponen (21 komponen)
- [x] Hooks: `useAntrean`, `useAntreanStream`, `useAuth`
- [x] `QueryClientProvider` + providers

#### Backend

- [x] Auth: login, logout, me
- [x] Middleware: auth guard + header injection
- [x] JWT session: encrypt, verify, cookie
- [x] DAL: `AuthDal` + `AntreanDal` (class + singleton)
- [x] `POST /api/antrean` — kiosk ambil nomor
- [x] `GET /api/antrean` — list antrian + filter
- [x] `GET /api/antrean/stats` — statistik harian
- [x] `GET + PATCH /api/antrean/:nomor` — detail + lengkapi data
- [x] `POST /api/antrean/panggil` — panggil berikutnya
- [x] `POST /api/antrean/:nomor/panggil` — panggil spesifik
- [x] `POST /api/antrean/:nomor/panggil-ulang`
- [x] `POST /api/antrean/:nomor/lewati`
- [x] `POST /api/antrean/:nomor/selesai`
- [x] `GET + POST /api/antrean/:nomor/tasks` — BPJS tasks
- [x] `GET /api/stream` — SSE endpoint
- [x] EventEmitter untuk broadcast SSE

#### Database

- [x] Schema MySQL v3 (`schema_v3.sql`)
- [x] 8 tabel + 3 view + seed data

---

### ❌ Belum Dibuat

#### Konfigurasi Proyek

- [ ] `prisma/schema.prisma` — Prisma schema dari `schema_v3.sql`
- [ ] `types/antrianTypes.ts` — pindah dari `hooks/types.ts` ke `types/`
- [ ] `.env.example` — template variabel environment
- [ ] `package.json` — dependencies
- [ ] `tailwind.config.ts` — konfigurasi Tailwind
- [ ] `tsconfig.json` — konfigurasi TypeScript

#### Fitur Tambahan (Opsional)

- [ ] Halaman admin (manajemen user, buka/tutup sesi)
- [ ] `GET /api/antrean/:nomor/audit` — riwayat aksi per antrian
- [ ] Export laporan harian (PDF / Excel)
- [ ] Konfigurasi teks ticker dari DB (`display_configs`)
- [ ] Notifikasi browser (Web Push) saat nomor dipanggil
- [ ] Multi-loket (loket berbeda bisa panggil independen)
