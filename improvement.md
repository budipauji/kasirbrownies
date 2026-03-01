# PRD — Improvement & Deployment Plan: Buku Kas App (Next.js → Vercel + Supabase)

> **Versi:** 1.0.0
> **Tanggal:** 2026-03-01
> **Status:** Active
> **Penulis:** Owner / Dev Team
> **Target Audience:** AI IDE Agent (Cursor, Windsurf, GitHub Copilot, dsb.)

---

## 📋 Daftar Isi

1. [Ringkasan Eksekutif](#1-ringkasan-eksekutif)
2. [Tujuan & Sasaran](#2-tujuan--sasaran)
3. [Ruang Lingkup](#3-ruang-lingkup)
4. [Stack Teknologi](#4-stack-teknologi)
5. [Arsitektur Teknis](#5-arsitektur-teknis)
6. [Rencana Migrasi Database](#6-rencana-migrasi-database-sqlite--supabase-postgres)
7. [Konfigurasi Drizzle untuk Postgres](#7-konfigurasi-drizzle-untuk-postgres)
8. [Perubahan src/db/index.ts](#8-perubahan-srcdbindexts-untuk-postgres)
9. [Middleware Proteksi Route](#9-middleware-proteksi-route-nextjs-middlewarets)
10. [Validasi Server-side dengan Zod](#10-validasi-server-side-dengan-zod)
11. [Soft Delete Implementation](#11-soft-delete-implementation)
12. [PWA Setup](#12-pwa-setup)
13. [Environment Variables](#13-environment-variables)
14. [CI/CD & Backup GitHub Actions](#14-cicd--backup-github-actions)
15. [Monitoring & Logging (Sentry)](#15-monitoring--logging-sentry)
16. [Checklist Deploy](#16-checklist-deploy-step-by-step)
17. [Timeline & Milestone](#17-timeline--milestone)
18. [Risiko & Mitigasi](#18-risiko--mitigasi)
19. [Deliverables](#19-deliverables)
20. [Catatan untuk AI Agent](#20-catatan-untuk-ai-agent)

---

## 1. Ringkasan Eksekutif

Aplikasi **Buku Kas** saat ini dibangun menggunakan **Next.js 13 (App Router)** dengan **SQLite** sebagai database lokal via `better-sqlite3` dan `drizzle-orm`. Aplikasi mencakup fitur manajemen bahan baku, produk dengan Bill of Materials (BOM/resep), transaksi penjualan, pencatatan jurnal akuntansi double-entry, dan pelaporan — semua dalam satu repositori full-stack monolith.

Tujuan utama dokumen PRD ini adalah menyusun rencana **improvement backend minimal** dan **deployment production** ke platform gratis:
- **Vercel** sebagai hosting Next.js (front-end + serverless API routes)
- **Supabase** sebagai managed Postgres database (persistent, gratis untuk skala kecil)

Aplikasi akan dapat diakses secara **pribadi** (tidak dipublikasikan ke Play Store) melalui **Android** menggunakan teknologi **PWA (Progressive Web App)** — pengguna Android cukup membuka URL dari Chrome dan memilih "Add to Home Screen".

Target akhir: aplikasi buku kas yang **aman**, **stabil**, **dapat diakses dari HP Android**, berjalan pada **free tier** tanpa domain berbayar, dengan **backup harian otomatis** dan **monitoring error** dasar.

---

## 2. Tujuan & Sasaran

### 2.1 Tujuan Fungsional

| ID | Tujuan | Keterangan |
|----|--------|------------|
| F1 | Semua fitur existing tetap berjalan | Inventory, BOM, kasir, jurnal, laporan tidak boleh regresi |
| F2 | Proteksi akses route | Dashboard dan API hanya bisa diakses user yang terautentikasi |
| F3 | Transaksi atomik | Checkout, update stok, jurnal harus dalam satu DB transaction |
| F4 | Soft delete pada penjualan | Pembatalan transaksi tidak menghapus record, hanya mengubah status |
| F5 | Installable di Android | Aplikasi bisa di-install via Chrome "Add to Home Screen" sebagai PWA |
| F6 | Validasi input di server | Semua payload API divalidasi di server sebelum diproses |

### 2.2 Tujuan Non-Fungsional

| ID | Tujuan | Target |
|----|--------|--------|
| NF1 | Keamanan koneksi | Semua koneksi via TLS/HTTPS (Vercel + Supabase enforced) |
| NF2 | Pengelolaan secret | Semua credentials disimpan di env vars, tidak di-commit ke repo |
| NF3 | Backup harian | Backup DB otomatis setiap hari via GitHub Actions, retensi 7 hari |
| NF4 | Monitoring error | Error runtime tercatat di Sentry secara real-time |
| NF5 | Response time | API p99 < 1.5 detik pada beban ringan (1–2 perangkat simultan) |
| NF6 | RTO (Recovery Time Objective) | < 4 jam jika terjadi kegagalan database |
| NF7 | Uptime | Memanfaatkan free-tier Vercel + Supabase; uptime bergantung SLA provider |

### 2.3 Sasaran Sukses (Definition of Done)

- [ ] Aplikasi ter-deploy di Vercel dan dapat diakses via URL `*.vercel.app`
- [ ] Database berjalan di Supabase Postgres, data migrasi dari SQLite sudah terverifikasi
- [ ] Route `/dashboard/**` dan `/api/**` terlindungi middleware session
- [ ] Validasi Zod aktif pada semua endpoint mutasi (POST/PUT/DELETE)
- [ ] PWA manifest aktif, aplikasi installable di Chrome Android
- [ ] GitHub Actions backup berjalan otomatis tiap malam
- [ ] Sentry menerima error dari production environment
- [ ] Soft delete aktif pada tabel `sales` dan `saleItems`

---

## 3. Ruang Lingkup

### 3.1 In-Scope

- Migrasi database dari SQLite (`better-sqlite3`) ke **Supabase Postgres**
- Konfigurasi ulang `drizzle-orm` untuk dialect Postgres
- Implementasi **Next.js Middleware** untuk proteksi route session
- Implementasi **validasi Zod server-side** pada API route: `sales`, `materials`, `products`
- Implementasi **soft delete** pada entitas transaksi (`sales`, `saleItems`)
- Setup **PWA**: `manifest.json` + `next-pwa` service worker
- **Deploy ke Vercel**: konfigurasi env vars, auto-deploy via GitHub
- **CI/CD Backup**: GitHub Actions workflow nightly dump Postgres
- **Monitoring**: integrasi Sentry pada Next.js (API routes + client)
- **Health check endpoint**: `GET /api/health` untuk ping monitoring

### 3.2 Out-of-Scope

- Rewrite UI ke React Native atau Flutter
- High-availability / multi-region database
- Implementasi offline-first penuh dengan conflict resolution (hanya basic queue)
- Pembelian domain berbayar
- Role-based access control (RBAC) multi-user (di luar scope iterasi ini)
- Background worker / queue system (Celery, BullMQ, dsb.)
- Push notification

---

## 4. Stack Teknologi

| Komponen | Teknologi | Versi | Keterangan |
|----------|-----------|-------|------------|
| Framework | Next.js App Router | 13+ | Full-stack, SSR + API routes |
| Bahasa | TypeScript | 5+ | Type-safe di seluruh codebase |
| ORM | Drizzle ORM | latest | Type-safe query builder, mendukung Postgres |
| Database | Supabase (Postgres) | Postgres 15 | Managed cloud DB, free tier |
| Auth | better-auth | latest | Session-based auth, adapter Drizzle |
| UI | Radix UI + Tailwind CSS | latest | Accessible, utility-first styling |
| Komponen | shadcn/ui | latest | Pre-built Radix + Tailwind components |
| Validasi | Zod | latest | Schema validation server & client |
| Form | react-hook-form | latest | Form state management + Zod resolver |
| Notifikasi | Sonner | latest | Toast notification |
| PWA | next-pwa | latest | Service worker + manifest |
| Hosting | Vercel | - | Serverless, auto-deploy dari GitHub |
| Monitoring | Sentry | latest | Error tracking, performance |
| CI/CD | GitHub Actions | - | Backup DB nightly, deployment |
| Migration | drizzle-kit | latest | Schema migration tooling |

---

## 5. Arsitektur Teknis

### 5.1 Diagram Arsitektur (ASCII)

┌─────────────────────────────────────────────────────────────┐
│                        ANDROID (Chrome)                      │
│                   https://buku-kas.vercel.app                │
│                  [ PWA — Add to Home Screen ]                │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                         VERCEL                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Next.js App Router                       │   │
│  │                                                       │   │
│  │  ┌─────────────────┐   ┌────────────────────────┐   │   │
│  │  │  Frontend Pages  │   │    API Route Handlers   │   │
│  │  │  (React + RSC)   │   │  (Serverless Functions) │   │
│  │  │                  │   │                          │   │
│  │  │ /dashboard       │   │ /api/materials           │   │
│  │  │ /dashboard/sales │   │ /api/products            │   │
│  │  │ /dashboard/inv.. │   │ /api/sales               │   │
│  │  │ /dashboard/rep.. │   │ /api/sales/[id]          │   │
│  │  │ /auth/login      │   │ /api/reports             │   │
│  │  └─────────────────┘   │ /api/health              │   │
│  │                         └────────────┬───────────┘   │   │
│  │  ┌──────────────────────────────┐    │               │   │
│  │  │     src/middleware.ts        │    │               │   │
│  │  │  (Session Guard: semua       │    │               │   │
│  │  │   /dashboard & /api route)   │    │               │   │
│  │  └──────────────────────────────┘    │               │   │
│  └───────────────────────────────────┬──┘               │   │
└──────────────────────────────────────┼──────────────────┘
                                        │ TLS Connection
                                        ▼ (DATABASE_URL env var)
┌─────────────────────────────────────────────────────────────┐
│                        SUPABASE                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            PostgreSQL 15 (Managed)                    │   │
│  │                                                       │   │
│  │  Tables:                                              │   │
│  │  • user, session, account (auth)                      │   │
│  │  • rawMaterials, products, recipes                    │   │
│  │  • sales, saleItems (dengan soft-delete)              │   │
│  │  • journals                                           │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │        Supabase Dashboard & Logs                      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Nightly Backup (GitHub Actions)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    GITHUB ACTIONS                            │
│  • pg_dump → compress → upload artifact (retensi 7 hari)    │
│  • Triggered: cron 02:00 UTC daily                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                       SENTRY                                 │
│  • Error tracking API routes (server-side)                   │
│  • Performance monitoring (p99 latency)                      │
│  • Alerting via email/slack                                  │
└─────────────────────────────────────────────────────────────┘

### 5.2 Penjelasan Layer

**Layer 1 — Client (Android PWA)**
Pengguna mengakses URL Vercel dari Chrome Android. Aplikasi dapat di-install sebagai PWA via "Add to Home Screen". Service worker meng-cache asset statis untuk performa lebih baik dan fallback dasar saat offline.

**Layer 2 — Vercel (Next.js)**
Next.js App Router menangani rendering halaman (React Server Components) dan API routes sebagai serverless functions. Middleware Next.js (`middleware.ts`) menjadi gerbang pertama yang memeriksa session sebelum request masuk ke halaman atau API handler.

**Layer 3 — Supabase (Postgres)**
Database utama yang menyimpan semua data bisnis. Koneksi dilakukan via connection string terenkripsi TLS. Drizzle ORM digunakan sebagai query builder type-safe di atas koneksi Postgres.

**Layer 4 — GitHub Actions (Backup)**
Workflow otomatis yang berjalan setiap malam untuk melakukan `pg_dump` dari Supabase dan menyimpan artifact ke GitHub (retensi 7 hari).

**Layer 5 — Sentry (Monitoring)**
Error dan exception dari API routes (server-side) dan client-side dikumpulkan di Sentry untuk alerting dan debugging.

---

## 6. Rencana Migrasi Database (SQLite → Supabase Postgres)

### 6.1 Persiapan Supabase

1. Buat akun di [supabase.com](https://supabase.com)
2. Buat project baru → pilih region terdekat (mis. Singapore)
3. Catat informasi berikut dari **Settings → Database**:
   - `DATABASE_URL` (connection string format: `postgresql://postgres:[password]@[host]:5432/postgres`)
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (jangan expose ke client)

> ⚠️ **PENTING:** Gunakan `SUPABASE_SERVICE_ROLE_KEY` hanya di server/API routes. Jangan pernah expose ke client browser.

### 6.2 Export Data dari SQLite

# Pastikan sqlite3 CLI terinstall
# Export seluruh schema dan data sebagai SQL dump
sqlite3 ./dev.db .dump > sqlite_dump.sql

# Atau export per tabel ke CSV untuk import manual via Supabase UI
sqlite3 -header -csv ./dev.db "SELECT * FROM rawMaterials;" > rawMaterials.csv
sqlite3 -header -csv ./dev.db "SELECT * FROM products;" > products.csv
sqlite3 -header -csv ./dev.db "SELECT * FROM recipes;" > recipes.csv
sqlite3 -header -csv ./dev.db "SELECT * FROM sales;" > sales.csv
sqlite3 -header -csv ./dev.db "SELECT * FROM saleItems;" > saleItems.csv
sqlite3 -header -csv ./dev.db "SELECT * FROM journals;" > journals.csv
sqlite3 -header -csv ./dev.db "SELECT * FROM user;" > users.csv

echo "Export selesai. Cek folder saat ini untuk file .csv"

### 6.3 Konversi & Bersihkan SQL Dump (jika pakai .sql route)

SQLite dan Postgres memiliki perbedaan tipe data. Jalankan script Python berikut untuk membersihkan dump:

# Jalankan script konversi (simpan sebagai convert_dump.py)
python3 convert_dump.py sqlite_dump.sql > postgres_dump.sql

# convert_dump.py
import re
import sys

def convert(content):
    # Hapus SQLite-specific statements
    content = re.sub(r'BEGIN TRANSACTION;', '', content)
    content = re.sub(r'COMMIT;', '', content)
    content = re.sub(r'PRAGMA.*;', '', content)
    # Ganti tipe data
    content = content.replace('INTEGER PRIMARY KEY AUTOINCREMENT', 'SERIAL PRIMARY KEY')
    content = content.replace(' TEXT', ' VARCHAR')
    content = content.replace(' REAL', ' DOUBLE PRECISION')
    content = content.replace('"', '')
    return content

if __name__ == '__main__':
    with open(sys.argv[1], 'r') as f:
        content = f.read()
    print(convert(content))

### 6.4 Import ke Supabase

**Opsi A — via psql CLI:**

# Install psql client jika belum ada
sudo apt-get install -y postgresql-client  # Linux/WSL
brew install postgresql                     # macOS

# Import SQL dump ke Supabase
psql $DATABASE_URL -f postgres_dump.sql

# Verifikasi jumlah rows
psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"rawMaterials\";"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM sales;"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM journals;"

**Opsi B — via Supabase Dashboard:**
1. Buka Supabase Dashboard → **Table Editor**
2. Per tabel: klik `Insert` → `Import CSV`
3. Upload file CSV yang sudah di-export
4. Map kolom sesuai skema

### 6.5 Verifikasi Data

# Bandingkan jumlah rows SQLite vs Supabase untuk setiap tabel
echo "=== SQLite row counts ==="
sqlite3 ./dev.db "SELECT 'rawMaterials', COUNT(*) FROM rawMaterials;"
sqlite3 ./dev.db "SELECT 'products', COUNT(*) FROM products;"
sqlite3 ./dev.db "SELECT 'sales', COUNT(*) FROM sales;"
sqlite3 ./dev.db "SELECT 'journals', COUNT(*) FROM journals;"

echo "=== Supabase (Postgres) row counts ==="
psql $DATABASE_URL -c "SELECT 'rawMaterials', COUNT(*) FROM \"rawMaterials\";"
psql $DATABASE_URL -c "SELECT 'products', COUNT(*) FROM products;"
psql $DATABASE_URL -c "SELECT 'sales', COUNT(*) FROM sales;"
psql $DATABASE_URL -c "SELECT 'journals', COUNT(*) FROM journals;"

---

## 7. Konfigurasi Drizzle untuk Postgres

Ganti file `drizzle.config.ts` yang ada (saat ini SQLite) dengan konfigurasi Postgres berikut:

// drizzle.config.ts
import type { Config } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle/migrations",
  driver: "pg",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
} satisfies Config;

### 7.1 Update Schema untuk Postgres

Perbarui `src/db/schema.ts` — ganti import dan tipe kolom dari SQLite ke Postgres:

// src/db/schema.ts
import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  doublePrecision,
  boolean,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enum ────────────────────────────────────────────────────────────────────
export const saleStatusEnum = pgEnum("sale_status", [
  "completed",
  "cancelled",
  "pending",
]);

export const journalTypeEnum = pgEnum("journal_type", [
  "debit",
  "credit",
]);

// ─── Auth Tables (better-auth) ────────────────────────────────────────────────
export const user = pgTable("user", {
  id: varchar("id", { length: 128 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const session = pgTable("session", {
  id: varchar("id", { length: 128 }).primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  ipAddress: varchar("ip_address", { length: 64 }),
  userAgent: text("user_agent"),
  userId: varchar("user_id", { length: 128 })
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: varchar("id", { length: 128 }).primaryKey(),
  accountId: varchar("account_id", { length: 255 }).notNull(),
  providerId: varchar("provider_id", { length: 64 }).notNull(),
  userId: varchar("user_id", { length: 128 })
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Business Tables ─────────────────────────────────────────────────────────
export const rawMaterials = pgTable("rawMaterials", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  unit: varchar("unit", { length: 64 }).notNull(),
  stock: doublePrecision("stock").default(0).notNull(),
  costPerUnit: doublePrecision("cost_per_unit").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  // Soft delete
  deletedAt: timestamp("deleted_at"),
  isDeleted: boolean("is_deleted").default(false).notNull(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  price: doublePrecision("price").default(0).notNull(),
  stock: doublePrecision("stock").default(0).notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  // Soft delete
  deletedAt: timestamp("deleted_at"),
  isDeleted: boolean("is_deleted").default(false).notNull(),
});

export const recipes = pgTable("recipes", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  materialId: integer("material_id")
    .notNull()
    .references(() => rawMaterials.id, { onDelete: "cascade" }),
  quantity: doublePrecision("quantity").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  total: doublePrecision("total").notNull(),
  cashierId: varchar("cashier_id", { length: 128 }).references(() => user.id),
  note: text("note"),
  // Soft delete — transaksi tidak pernah dihapus keras
  status: saleStatusEnum("status").default("completed").notNull(),
  cancelledAt: timestamp("cancelled_at"),
  cancelledBy: varchar("cancelled_by", { length: 128 }).references(() => user.id),
  cancelReason: text("cancel_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const saleItems = pgTable("saleItems", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id")
    .notNull()
    .references(() => sales.id, { onDelete: "cascade" }),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  quantity: doublePrecision("quantity").notNull(),
  priceAtSale: doublePrecision("price_at_sale").notNull(),
  subtotal: doublePrecision("subtotal").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const journals = pgTable("journals", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id").references(() => sales.id),
  type: journalTypeEnum("type").notNull(),
  account: varchar("account", { length: 255 }).notNull(),
  amount: doublePrecision("amount").notNull(),
  description: text("description"),
  // Soft delete — jurnal tidak pernah dihapus keras
  isReversed: boolean("is_reversed").default(false).notNull(),
  reversedAt: timestamp("reversed_at"),
  reversedBy: varchar("reversed_by", { length: 128 }).references(() => user.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Relations ───────────────────────────────────────────────────────────────
export const productsRelations = relations(products, ({ many }) => ({
  recipes: many(recipes),
  saleItems: many(saleItems),
}));

export const rawMaterialsRelations = relations(rawMaterials, ({ many }) => ({
  recipes: many(recipes),
}));

export const salesRelations = relations(sales, ({ many }) => ({
  saleItems: many(saleItems),
  journals: many(journals),
}));

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
  sale: one(sales, { fields: [saleItems.saleId], references: [sales.id] }),
  product: one(products, { fields: [saleItems.productId], references: [products.id] }),
}));

### 7.2 Jalankan Migrasi

# Generate migration files berdasarkan schema baru
npx drizzle-kit generate:pg

# Push migration ke database Supabase
npx drizzle-kit push:pg

# Atau apply migration files yang sudah di-generate
npx drizzle-kit migrate

---

## 8. Perubahan src/db/index.ts untuk Postgres

Ganti koneksi `better-sqlite3` dengan koneksi Postgres via `postgres` package:

# Install dependencies Postgres
npm install postgres drizzle-orm
npm uninstall better-sqlite3

# Jika ada @types/better-sqlite3, hapus juga
npm uninstall @types/better-sqlite3

// src/db/index.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL environment variable is not set. " +
    "Tambahkan DATABASE_URL di file .env.local Anda."
  );
}

// Konfigurasi connection pool
// max: batasi koneksi agar tidak melebihi limit free-tier Supabase
const connectionString = process.env.DATABASE_URL;

const client = postgres(connectionString, {
  max: 10,          // max connections dalam pool
  idle_timeout: 20, // tutup koneksi idle setelah 20 detik
  connect_timeout: 10,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

export const db = drizzle(client, { schema, logger: process.env.NODE_ENV === "development" });

// Export type untuk type inference
export type Database = typeof db;

> **Catatan untuk AI Agent:** Ganti semua penggunaan `db` yang sebelumnya menggunakan `BetterSQLite3Database` type menjadi `PostgresJsDatabase` type dari `drizzle-orm/postgres-js`. Pastikan semua query menggunakan syntax Drizzle yang kompatibel dengan Postgres (tidak ada raw SQLite-specific SQL).

---

## 9. Middleware Proteksi Route (Next.js middleware.ts)

Buat file `src/middleware.ts` di root `src/` untuk memproteksi semua route dashboard dan API:

// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Route yang TIDAK memerlukan autentikasi
const PUBLIC_ROUTES = [
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/api/auth",       // better-auth internal routes
  "/api/health",     // health check endpoint
  "/_next",          // Next.js internal
  "/favicon.ico",
  "/manifest.json",
  "/icons",
  "/sw.js",
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Lewati route publik
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Ambil session token dari cookie
  // Sesuaikan nama cookie dengan konfigurasi better-auth Anda
  const sessionToken =
    req.cookies.get("better-auth.session_token")?.value ||
    req.cookies.get("__Secure-better-auth.session_token")?.value;

  // Jika tidak ada session token, redirect ke login
  if (!sessionToken) {
    // Untuk API routes, return 401 JSON
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Session tidak valid atau sudah expired" },
        { status: 401 }
      );
    }

    // Untuk halaman, redirect ke login
    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Tambahkan header untuk digunakan di API route (opsional)
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-session-token", sessionToken);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

// Tentukan route mana yang diproses middleware
export const config = {
  matcher: [
    /*
     * Match semua request path KECUALI:
     * - _next/static (file statis)
     * - _next/image (optimasi gambar Next.js)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

---

## 10. Validasi Server-side dengan Zod

### 10.1 Shared Zod Schemas (`src/lib/validations.ts`)

// src/lib/validations.ts
import { z } from "zod";

// ─── Materials ───────────────────────────────────────────────────────────────
export const createMaterialSchema = z.object({
  name: z
    .string({ required_error: "Nama bahan wajib diisi" })
    .min(2, "Nama minimal 2 karakter")
    .max(255, "Nama maksimal 255 karakter"),
  unit: z
    .string({ required_error: "Satuan wajib diisi" })
    .min(1, "Satuan wajib diisi"),
  stock: z
    .number({ required_error: "Stok wajib diisi" })
    .nonnegative("Stok tidak boleh negatif")
    .default(0),
  costPerUnit: z
    .number({ required_error: "Harga per unit wajib diisi" })
    .nonnegative("Harga tidak boleh negatif")
    .default(0),
});

export const updateMaterialSchema = createMaterialSchema.partial();

// ─── Products ────────────────────────────────────────────────────────────────
export const recipeItemSchema = z.object({
  materialId: z
    .number({ required_error: "Material ID wajib diisi" })
    .int("Material ID harus berupa integer")
    .positive("Material ID harus positif"),
  quantity: z
    .number({ required_error: "Jumlah wajib diisi" })
    .positive("Jumlah harus lebih dari 0"),
});

export const createProductSchema = z.object({
  name: z
    .string({ required_error: "Nama produk wajib diisi" })
    .min(2, "Nama minimal 2 karakter")
    .max(255, "Nama maksimal 255 karakter"),
  price: z
    .number({ required_error: "Harga wajib diisi" })
    .nonnegative("Harga tidak boleh negatif"),
  stock: z
    .number()
    .nonnegative("Stok tidak boleh negatif")
    .default(0),
  imageUrl: z.string().url("URL gambar tidak valid").optional().nullable(),
  recipes: z
    .array(recipeItemSchema)
    .min(1, "Produk harus memiliki minimal 1 bahan baku"),
});

export const updateProductSchema = createProductSchema.partial();

// ─── Sales ───────────────────────────────────────────────────────────────────
export const saleItemSchema = z.object({
  productId: z
    .number({ required_error: "Product ID wajib diisi" })
    .int("Product ID harus berupa integer")
    .positive("Product ID harus positif"),
  quantity: z
    .number({ required_error: "Jumlah wajib diisi" })
    .int("Jumlah harus berupa bilangan bulat")
    .positive("Jumlah harus lebih dari 0"),
  priceAtSale: z
    .number({ required_error: "Harga jual wajib diisi" })
    .nonnegative("Harga jual tidak boleh negatif"),
});

export const createSaleSchema = z.object({
  items: z
    .array(saleItemSchema)
    .min(1, "Penjualan harus memiliki minimal 1 item"),
  note: z.string().max(500, "Catatan maksimal 500 karakter").optional(),
  cashierId: z.string().optional(),
});

export const cancelSaleSchema = z.object({
  cancelReason: z
    .string({ required_error: "Alasan pembatalan wajib diisi" })
    .min(5, "Alasan minimal 5 karakter")
    .max(500, "Alasan maksimal 500 karakter"),
});

// ─── Helper untuk membaca dan memvalidasi JSON body ──────────────────────────
export async function parseAndValidate<T>(
  req: Request,
  schema: z.ZodSchema<T>
): Promise<{ data: T; error: null } | { data: null; error: Response }> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return {
      data: null,
      error: new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      ),
    };
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    return {
      data: null,
      error: new Response(
        JSON.stringify({
          error: "Validation failed",
          details: result.error.flatten().fieldErrors,
        }),
        { status: 422, headers: { "Content-Type": "application/json" } }
      ),
    };
  }

  return { data: result.data, error: null };
}

### 10.2 API Route: Materials (`src/app/api/materials/route.ts`)

// src/app/api/materials/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { rawMaterials } from "@/db/schema";
import { eq, isNull } from "drizzle-orm";
import { createMaterialSchema, parseAndValidate } from "@/lib/validations";
import * as Sentry from "@sentry/nextjs";

// GET /api/materials — ambil semua bahan (exclude soft-deleted)
export async function GET() {
  try {
    const materials = await db
      .select()
      .from(rawMaterials)
      .where(eq(rawMaterials.isDeleted, false));

    return NextResponse.json(materials);
  } catch (error) {
    Sentry.captureException(error);
    console.error("[GET /api/materials]", error);
    return NextResponse.json(
      { error: "Gagal mengambil data bahan baku" },
      { status: 500 }
    );
  }
}

// POST /api/materials — tambah bahan baru
export async function POST(req: Request) {
  const { data, error } = await parseAndValidate(req, createMaterialSchema);
  if (error) return error;

  try {
    const [created] = await db
      .insert(rawMaterials)
      .values({
        name: data.name,
        unit: data.unit,
        stock: data.stock,
        costPerUnit: data.costPerUnit,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    Sentry.captureException(err);
    console.error("[POST /api/materials]", err);
    return NextResponse.json(
      { error: "Gagal menyimpan bahan baku" },
      { status: 500 }
    );
  }
}

### 10.3 API Route: Sales (`src/app/api/sales/route.ts`)

// src/app/api/sales/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { sales, saleItems, products, recipes, rawMaterials, journals } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { createSaleSchema, parseAndValidate } from "@/lib/validations";
import * as Sentry from "@sentry/nextjs";

// GET /api/sales — ambil riwayat penjualan (non-cancelled)
export async function GET() {
  try {
    const allSales = await db
      .select()
      .from(sales)
      .orderBy(sales.createdAt);

    return NextResponse.json(allSales);
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Gagal mengambil data penjualan" }, { status: 500 });
  }
}

// POST /api/sales — buat transaksi penjualan baru
export async function POST(req: Request) {
  const { data, error } = await parseAndValidate(req, createSaleSchema);
  if (error) return error;

  try {
    // Jalankan seluruh operasi dalam satu transaksi DB atomik
    const result = await db.transaction(async (tx) => {
      // 1. Validasi ketersediaan produk dan stok
      const productIds = data.items.map((item) => item.productId);
      const existingProducts = await tx
        .select()
        .from(products)
        .where(inArray(products.id, productIds));

      if (existingProducts.length !== productIds.length) {
        throw new Error("Beberapa produk tidak ditemukan");
      }

      // 2. Hitung total
      let total = 0;
      for (const item of data.items) {
        const product = existingProducts.find((p) => p.id === item.productId);
        if (!product) throw new Error(`Produk ID ${item.productId} tidak ditemukan`);
        if (product.stock < item.quantity) {
          throw new Error(`Stok produk "${product.name}" tidak mencukupi`);
        }
        total += item.priceAtSale * item.quantity;
      }

      // 3. Buat record sale
      const [newSale] = await tx
        .insert(sales)
        .values({
          total,
          cashierId: data.cashierId,
          note: data.note,
          status: "completed",
        })
        .returning();

      // 4. Buat sale items & update stok produk
      const itemsToInsert = data.items.map((item) => ({
        saleId: newSale.id,
        productId: item.productId,
        quantity: item.quantity,
        priceAtSale: item.priceAtSale,
        subtotal: item.priceAtSale * item.quantity,
      }));

      await tx.insert(saleItems).values(itemsToInsert);

      for (const item of data.items) {
        const product = existingProducts.find((p) => p.id === item.productId)!;
        await tx
          .update(products)
          .set({ stock: product.stock - item.quantity })
          .where(eq(products.id, item.productId));
      }

      // 5. Kurangi stok bahan baku berdasarkan resep
      for (const item of data.items) {
        const productRecipes = await tx
          .select()
          .from(recipes)
          .where(eq(recipes.productId, item.productId));

        for (const recipe of productRecipes) {
          const material = await tx
            .select()
            .from(rawMaterials)
            .where(eq(rawMaterials.id, recipe.materialId))
            .then((res) => res[0]);

          if (material) {
            await tx
              .update(rawMaterials)
              .set({ stock: material.stock - recipe.quantity * item.quantity })
              .where(eq(rawMaterials.id, recipe.materialId));
          }
        }
      }

      // 6. Catat jurnal akuntansi (double-entry)
      await tx.insert(journals).values([
        {
          saleId: newSale.id,
          type: "debit",
          account: "Kas",
          amount: total,
          description: `Penerimaan kas dari penjualan #${newSale.id}`,
        },
        {
          saleId: newSale.id,
          type: "credit",
          account: "Pendapatan Penjualan",
          amount: total,
          description: `Pendapatan dari penjualan #${newSale.id}`,
        },
      ]);

      return newSale;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    Sentry.captureException(err);
    console.error("[POST /api/sales]", err);
    return NextResponse.json(
      { error: err.message || "Gagal memproses transaksi penjualan" },
      { status: 400 }
    );
  }
}

### 10.4 API Route: Cancel Sale (`src/app/api/sales/[id]/route.ts`)

// src/app/api/sales/[id]/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { sales, saleItems, products, journals, rawMaterials, recipes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { cancelSaleSchema, parseAndValidate } from "@/lib/validations";
import * as Sentry from "@sentry/nextjs";

// DELETE/PATCH /api/sales/[id] — soft cancel penjualan
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const saleId = parseInt(params.id, 10);
  if (isNaN(saleId)) {
    return NextResponse.json({ error: "ID penjualan tidak valid" }, { status: 400 });
  }

  const { data, error } = await parseAndValidate(req, cancelSaleSchema);
  if (error) return error;

  try {
    await db.transaction(async (tx) => {
      // 1. Ambil data penjualan
      const [sale] = await tx
        .select()
        .from(sales)
        .where(eq(sales.id, saleId));

      if (!sale) throw new Error("Penjualan tidak ditemukan");
      if (sale.status === "cancelled") throw new Error("Penjualan sudah dibatalkan sebelumnya");

      // 2. Soft cancel sale (bukan hard delete)
      await tx
        .update(sales)
        .set({
          status: "cancelled",
          cancelledAt: new Date(),
          cancelReason: data.cancelReason,
          updatedAt: new Date(),
        })
        .where(eq(sales.id, saleId));

      // 3. Ambil sale items untuk reversal stok
      const items = await tx
        .select()
        .from(saleItems)
        .where(eq(saleItems.saleId, saleId));

      // 4. Kembalikan stok produk
      for (const item of items) {
        const [product] = await tx
          .select()
          .from(products)
          .where(eq(products.id, item.productId));

        if (product) {
          await tx
            .update(products)
            .set({ stock: product.stock + item.quantity })
            .where(eq(products.id, item.productId));
        }

        // 5. Kembalikan stok bahan baku
        const productRecipes = await tx
          .select()
          .from(recipes)
          .where(eq(recipes.productId, item.productId));

        for (const recipe of productRecipes) {
          const [material] = await tx
            .select()
            .from(rawMaterials)
            .where(eq(rawMaterials.id, recipe.materialId));

          if (material) {
            await tx
              .update(rawMaterials)
              .set({ stock: material.stock + recipe.quantity * item.quantity })
              .where(eq(rawMaterials.id, recipe.materialId));
          }
        }
      }

      // 6. Mark jurnal sebagai reversed (bukan dihapus)
      await tx
        .update(journals)
        .set({
          isReversed: true,
          reversedAt: new Date(),
        })
        .where(eq(journals.saleId, saleId));

      // 7. Buat jurnal reversal
      await tx.insert(journals).values([
        {
          saleId: saleId,
          type: "credit",
          account: "Kas",
          amount: sale.total,
          description: `Reversal kas — pembatalan penjualan #${saleId}. Alasan: ${data.cancelReason}`,
        },
        {
          saleId: saleId,
          type: "debit",
          account: "Pendapatan Penjualan",
          amount: sale.total,
          description: `Reversal pendapatan — pembatalan penjualan #${saleId}. Alasan: ${data.cancelReason}`,
        },
      ]);
    });

    return NextResponse.json({ message: "Penjualan berhasil dibatalkan", saleId });
  } catch (err: any) {
    Sentry.captureException(err);
    console.error("[PATCH /api/sales/:id]", err);
    return NextResponse.json(
      { error: err.message || "Gagal membatalkan penjualan" },
      { status: 400 }
    );
  }
}

### 10.5 Health Check Endpoint (`src/app/api/health/route.ts`)

// src/app/api/health/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    // Ping database
    await db.execute(sql`SELECT 1`);
    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      database: "connected",
    });
  } catch {
    return NextResponse.json(
      { status: "error", database: "disconnected" },
      { status: 503 }
    );
  }
}

---

## 11. Soft Delete Implementation

### 11.1 Konsep

Untuk aplikasi buku kas / akuntansi, **data transaksi tidak boleh pernah dihapus secara permanen (hard delete)**. Setiap penghapusan harus meninggalkan jejak audit (*audit trail*). Solusinya adalah **soft delete**: record tetap ada di database, hanya ditandai sebagai dihapus/dibatalkan.

### 11.2 Kolom yang Ditambahkan ke Schema

| Tabel | Kolom | Tipe | Keterangan |
|-------|-------|------|------------|
| `sales` | `status` | enum | `completed`, `cancelled`, `pending` |
| `sales` | `cancelledAt` | timestamp | Waktu pembatalan |
| `sales` | `cancelledBy` | varchar | ID user yang membatalkan |
| `sales` | `cancelReason` | text | Alasan pembatalan |
| `journals` | `isReversed` | boolean | Apakah jurnal sudah di-reverse |
| `journals` | `reversedAt` | timestamp | Waktu reversal |
| `journals` | `reversedBy` | varchar | ID user yang me-reverse |
| `rawMaterials` | `isDeleted` | boolean | Soft delete flag |
| `rawMaterials` | `deletedAt` | timestamp | Waktu soft delete |
| `products` | `isDeleted` | boolean | Soft delete flag |
| `products` | `deletedAt` | timestamp | Waktu soft delete |

### 11.3 Helper Query untuk Filter Soft Deleted

// src/lib/db-helpers.ts
import { eq } from "drizzle-orm";
import { rawMaterials, products } from "@/db/schema";

// Gunakan helper ini di semua query GET untuk exclude soft-deleted records
export const notDeleted = <T extends { isDeleted: typeof rawMaterials.isDeleted }>(
  table: T
) => eq(table.isDeleted, false);

// Contoh penggunaan:
// await db.select().from(rawMaterials).where(notDeleted(rawMaterials))
// await db.select().from(products).where(notDeleted(products))

---

## 12. PWA Setup

### 12.1 Install next-pwa

npm install next-pwa
npm install --save-dev @types/next-pwa

### 12.2 Update next.config.ts

// next.config.ts
import type { NextConfig } from "next";
const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "supabase-cache",
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 24 jam
        },
      },
    },
    {
      urlPattern: /\/api\/.*/i,
      handler: "NetworkOnly", // API selalu dari network, tidak di-cache
    },
    {
      urlPattern: /^https?.*/,
      handler: "NetworkFirst",
      options: {
        cacheName: "general-cache",
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 hari
        },
      },
    },
  ],
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-XSS-Protection", value: "1; mode=block" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ],
    },
  ],
};

module.exports = withPWA(nextConfig);

### 12.3 Manifest JSON (`public/manifest.json`)

```json
{
  "name": "Buku Kas — Aplikasi Kasir",
  "short_name": "Buku Kas",
  "description": "Aplikasi kasir dan buku kas untuk manajemen penjualan, inventori, dan jurnal akuntansi",
  "start_url": "/dashboard",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#ffffff",
  "theme_color": "#0f172a",
  "lang": "id",
  "categories": ["business", "finance", "productivity"],
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "/icons/icon-384x384.png