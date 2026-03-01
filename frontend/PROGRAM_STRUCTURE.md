# Struktur Program

Dokumen ini menjelaskan arsitektur dan struktur proyek Next.js 13
(App Router) yang sedang dikembangkan. Aplikasi menggabungkan front-end,
back-end, dan basis data SQLite dalam satu repositori.

## 1. Konfigurasi Proyek

- `package.json`: daftar dependensi berikut versi seperti `next`,
  `radix-ui`, `drizzle-orm`, `better-auth`, `sonner`, `tailwindcss`,
  dan lain-lain.
- `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, dan
  `.gitignore` -- konfigurasi untuk TypeScript, Next.js, Tailwind, dsb.
- `drizzle.config.ts`: konfigurasi untuk `drizzle-kit` (migrasi dan
  skema), menetapkan dialek `sqlite` dan lokasi file.

## 2. Struktur Kode (`src/`)

### a. Primitif UI

Di dalam `src/components/ui/` terdapat komponen berbasis
Radix-UI yang telah ditata ulang menggunakan Tailwind. Semua
komponen ini bersifat generik dan digunakan kembali di seluruh
aplikasi.

Contoh komponen:

- `button.tsx` – `Button` dan varian kelas.
- `card.tsx`, `table.tsx`, `select.tsx`, `tooltip.tsx`, dll.

Komponen khusus aplikasi seperti `app-sidebar.tsx` juga berada di
sini.

### b. Utilitas dan Hook

- `src/lib/utils.ts`: helper `cn` untuk gabungkan kelas Tailwind.
- `src/lib/auth.ts`: inisialisasi `better-auth` dengan adapter
  `drizzle` dan tabel otentikasi.
- `src/lib/auth-client.ts`: wrapper klien untuk autentikasi dari
  sisi browser.
- `src/hooks/use-mobile.ts`: hook reaktif yang mendeteksi apakah
  tampilan dalam mode mobile.

### c. Lapisan Database

- `src/db/schema.ts`: definisi skema `drizzle-orm` untuk tabel
  `user`, `session`, `account`, `rawMaterials`, `products`,
  `recipes`, `sales`, `saleItems`, `journals`, dsb.
- `src/db/index.ts`: membuat instance `better-sqlite3` lalu
  mengekspor objek `drizzle` untuk query.
- `src/scripts/seed.ts`: skrip populasi data awal (bahan,
  produk, resep).

Migrasi database dikelola lewat perintah `drizzle-kit`.

## 3. Route API (`src/app/api/`)

Setiap folder di dalam `api/` merepresentasikan endpoint REST
besar:

- `materials/route.ts`: GET semua bahan, POST bahan baru.
- `products/route.ts`: GET produk beserta resep, POST produk
  dan BOM.
- `sales/route.ts`: logika checkout; update stok, buat jurnal,
  hitung total, semua dalam transaksi.
- `sales/[id]/route.ts`: menghapus penjualan; membalikkan
  perubahan statistik dan jurnal.
- `reports/route.ts`: agregasi data untuk dashboard.

Route menggunakan objek `db` dan helper `drizzle-orm` untuk
query.

## 4. Halaman Front-end (`src/app/`)

Aplikasi diatur dengan *app router* Next.js. Halaman utama:

- `src/app/layout.tsx`: layout root dengan CSS global,
  provider tooltip, dan `Toaster` dari `sonner`.
- `src/app/page.tsx`: redirect ke `/dashboard`.

### Autentikasi

- `/auth/login`: formulir login yang memanfaatkan `react-hook-form`
  dan `zod`, memanggil klien autentikasi.

### Area Dashboard

Semua halaman dashboard berada di dalam segmen `(dashboard)`.
Layout `src/app/(dashboard)/layout.tsx` menyediakan sidebar  dan
header.

Halaman utama dashboard:

- `/dashboard`: ringkasan metrik (panggilan ke `/api/reports`).
- `/dashboard/inventory`: pengelolaan bahan baku dan produk/BOM.
- `/dashboard/sales`: antarmuka kasir.
- `/dashboard/reports`: tampilan riwayat penjualan dan jurnal.

Semua halaman memanfaatkan komponen UI umum dan utilitas seperti
`formatRp` dan `formatDate`.

## 5. Styling dan Desain

- Konfigurasi Tailwind di `src/app/globals.css`, meliputi warna,
  variabel CSS, dan dukungan `dark mode`.
- `components.json` menunjukkan penggunaan generator dari
  shadcn untuk struktur impor komponen.

## 6. Autentikasi dan Keamanan

- `src/lib/auth.ts` mengatur `better-auth` agar menyimpan user dan
  sesi dalam basis data SQLite.
- Halaman login memanfaatkan modul `auth-client`.

## 7. Aliran Data

1. **Klien** mengirim `fetch` ke endpoint `api` dengan data
   input; menerima respons JSON.
2. **API Next.js** memvalidasi permintaan, menjalankan logika
   bisnis (mis. checkout, laporan), dan berinteraksi dengan
   database.
3. **Database** SQLite menyimpan data; semua query dilakukan
   melalui `drizzle`.
4. **Efek samping** seperti pengurangan stok dan pencatatan
   jurnal dikelola di dalam transaksi pada handler `sales`.

---

Struktur ini mempermudah pengembangan: tambahkan tabel baru di
skema, rute API baru di `app/api`, dan komponen/halaman di
`src/app/` tanpa mengganggu bagian lain. Komponen UI menjaga
konsistensi tampilan dan utilitas `cn` memastikan kelas Tailwind
rapi.
