# FasiReport

Aplikasi web pelaporan kerusakan fasilitas perusahaan dengan **tiga peran** (Karyawan, Admin, Teknisi) dan **database PostgreSQL**. Seluruh data tersimpan permanen di server, bukan di browser.

## Alur penanganan

```
Karyawan lapor ──▶ Admin verifikasi & tunjuk Teknisi/Vendor ──▶ Teknisi kerjakan & update ──▶ Karyawan konfirmasi
 (Dilaporkan)            (Ditugaskan / Ditolak)                  (Diproses → Diperbaiki)          (Selesai)
```

- Jika hasil perbaikan belum sesuai, karyawan menekan **Belum Sesuai** dan laporan kembali ke teknisi (tenggat 24 jam).
- Jika teknisi tidak dapat menangani, ia menolak tugas dan laporan kembali ke admin.
- Setiap perubahan status tercatat di riwayat laporan dan log aktivitas.

## Fitur per peran

| Peran | Fitur |
|---|---|
| Karyawan | Buat/edit/batalkan laporan (foto bukti), pantau status, konfirmasi atau tolak hasil perbaikan, komentar, notifikasi, jadwal servis, registrasi mandiri |
| Admin | Dashboard (status, SLA terlambat, biaya, tren, kinerja teknisi, filter periode), verifikasi dan penugasan teknisi/vendor dengan SLA, kelola fasilitas (+riwayat dan penanda kerusakan berulang), jadwal servis, direktori teknisi/vendor, kelola pengguna, log aktivitas, ekspor CSV |
| Teknisi | Dashboard tugas, terima/tolak tugas, catatan progres + foto, tandai selesai dengan material & biaya, riwayat perbaikan, jadwal perawatan sendiri |

## Teknologi

- Frontend: React 19, Vite, Tailwind CSS v4, lucide-react
- Backend: Node.js + Express, PostgreSQL (`pg`), JWT, bcrypt, zod, multer, helmet, express-rate-limit
- Sinkronisasi antar pengguna: polling tiap 8 detik

## Struktur

```
server/            API Express
  db/schema.sql    skema PostgreSQL
  db/seed.js       data contoh (--reset untuk mengosongkan lalu mengisi ulang)
  lib/workflow.js  aturan perpindahan status & hak akses per aksi
  routes/          auth, users, facilities, reports, maintenance, vendors, ...
  test/            tes API end-to-end
src/               aplikasi React
```

## Menjalankan

Prasyarat: Node.js 20+ dan PostgreSQL 14+.

```bash
# 1. Siapkan database (contoh memakai Docker; boleh juga PostgreSQL yang sudah terpasang)
docker run -d --name fasireport-db -p 5432:5432 \
  -e POSTGRES_USER=fasireport -e POSTGRES_PASSWORD=fasireport -e POSTGRES_DB=fasireport postgres:16

# 2. Konfigurasi
cp .env.example .env          # sesuaikan DATABASE_URL dan JWT_SECRET

# 3. Pasang dependensi, buat tabel + data contoh
npm install --legacy-peer-deps
npm run db:reset

# 4. Jalankan API (port 4000) dan frontend (port 3000) bersamaan
npm run dev
```

Buka http://localhost:3000.

### Akun demo (kata sandi `password123`)

| Peran | Email |
|---|---|
| Admin | admin.test@example.com |
| Karyawan | karyawan.test@example.com, karyawan2.test@example.com |
| Teknisi | teknisi.test@example.com, teknisi2.test@example.com |

### Skrip

| Perintah | Fungsi |
|---|---|
| `npm run dev` | API + frontend mode pengembangan |
| `npm run db:migrate` | Membuat tabel (aman diulang) |
| `npm run db:seed` / `db:reset` | Mengisi data contoh / mengosongkan lalu mengisi ulang |
| `npm test` | Tes API (butuh database berisi seed) |
| `npm run build` lalu `npm start` | Produksi: server melayani API dan hasil build dari satu port (4000) |

## Database di Supabase

Database cloud sudah dibuat di project Supabase `fasireport` (region Singapore) lengkap dengan skema, indeks, RLS, dan data demo.
Untuk menghubungkan server:

1. Supabase Dashboard > Project Settings > Database > Connection string (Session pooler).
2. Salin ke `.env` sebagai `DATABASE_URL=...` (isi password database Anda). SSL aktif otomatis.
3. `npm run build && npm start` — data kini tersimpan di Supabase.

RLS aktif tanpa policy: tabel hanya dapat diakses lewat server API, bukan lewat API publik Supabase.
Foto lampiran disimpan di tabel `uploads` (PostgreSQL), bukan di folder server, jadi tidak ada folder yang perlu dibuat dan aman di Windows/macOS/Linux maupun hosting cloud.
Akun demo memakai password `password123`; ubah atau nonaktifkan sebelum dipakai di luar demo.

## Hosting cPanel (Setup Node.js App)

1. Node.js 20 atau lebih baru; **Application startup file: `app.cjs`** (bukan `server/index.js`, kalau tidak situs menjadi 503).
2. Environment variables: `NODE_ENV=production`, `JWT_SECRET` (min. 24 karakter acak), `DATABASE_URL` (Supabase *Session pooler*), `CORS_ORIGIN`.
3. Di terminal: `npm install && npm run build && npm run db:migrate`, lalu Restart aplikasi.
4. Bila 503: lihat `stderr.log` di folder aplikasi atau jalankan `node app.cjs` di terminal; penyebab biasanya variabel di atas belum diisi.

## Keamanan

- Kata sandi di-hash (bcrypt); sesi memakai JWT; akun nonaktif langsung ditolak.
- Hak akses per peran diperiksa di server, bukan hanya disembunyikan di tampilan.
- Validasi input (zod), pembatasan percobaan login, header keamanan (helmet).
- Upload foto hanya JPG/PNG/WEBP/GIF, maksimal 5 MB, nama file diacak.
- Di produksi `JWT_SECRET` wajib diisi (minimal 24 karakter).

## Catatan

Aplikasi tidak lagi dapat dibuka langsung dari `index.html` atau GitHub Pages karena membutuhkan server API dan PostgreSQL.
