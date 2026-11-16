<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# SI-Ujian

SI-Ujian dapat dijalankan sebagai aplikasi web yang sudah ada atau sebagai aplikasi desktop mandiri.

## Aplikasi desktop

Aplikasi desktop membungkus UI dan server lokal dalam satu aplikasi Electron. Node.js, PostgreSQL, dan browser terpisah tidak diperlukan. Pada peluncuran pertama, aplikasi memeriksa sistem dan akses penyimpanan, lalu meminta izin sebelum membuat database SQLite lokal dan kunci enkripsinya. Database dan konfigurasi AI disimpan di direktori data pengguna OS (bukan di samping executable); setiap komputer memiliki datanya sendiri dan tidak tersinkron otomatis. Fitur non-AI dapat digunakan lokal, sedangkan pembuatan soal AI memerlukan koneksi internet dan layanan AI yang dikonfigurasi.

Paket tersedia untuk Windows (installer dan portable `.exe`), macOS (`.dmg`), serta Linux (`.AppImage` dan `.deb`). Aplikasi memeriksa GitHub Releases saat dibuka dan meminta persetujuan sebelum mengunduh serta memasang versi baru. Pada Windows portable, pembaruan mengganti executable setelah aplikasi ditutup dan menyimpan cadangan versi sebelumnya dengan akhiran `.previous`; folder executable harus dapat ditulisi.

Untuk membuat rilis lintas platform, push tag versi berikutnya, misalnya `v2.0.1`. Workflow GitHub Actions membangun paket tiap OS lalu menerbitkan artefak dan metadata updater. Paket Windows/macOS saat ini belum ditandatangani, sehingga SmartScreen/Gatekeeper dapat menampilkan peringatan; siapkan sertifikat code-signing dan notarization sebelum distribusi publik yang tepercaya.

Simpan cadangan database `suji.sqlite` dan `encryption.key` bersama-sama. Kunci tersebut diperlukan untuk membaca konfigurasi AI terenkripsi. Data lama di server PostgreSQL tidak dipindahkan otomatis ke instalasi desktop.

### Build desktop dari source

**Prerequisites:** Node.js 22+ dan npm. PostgreSQL tidak diperlukan untuk mode desktop.

```bash
npm ci
npm test
npm run dist:desktop
```

Artefak dibuat di folder `release/`. Build desktop hanya menghasilkan paket untuk sistem operasi yang sedang digunakan; workflow GitHub Actions membangun ketiga sistem operasi.

## Menjalankan aplikasi web

**Prerequisites:** Node.js 22+ dan PostgreSQL.

1. Install dependencies:
   `npm install`
2. Install and start PostgreSQL in WSL:
   `sudo apt update && sudo apt install -y postgresql`
3. Create the app database and user (replace the password with a strong one):
   ```bash
   sudo -u postgres psql <<'SQL'
   CREATE USER siujian WITH PASSWORD 'ganti-dengan-password-kuat';
   CREATE DATABASE siujian OWNER siujian;
   SQL
   ```
4. Configure the environment:
   ```bash
   cp .env.example .env
   openssl rand -hex 32
   ```
   Put the PostgreSQL URL, `APP_USERNAME`, `APP_PASSWORD`, and two separate random 64-character hex values in `.env`: one for `SESSION_SECRET`, one for `APP_ENCRYPTION_KEY`. `GEMINI_API_KEY` is optional if using an AI gateway.
5. Run the app:
   `npm run dev`

The first login should be from the browser that currently contains your bank-soal data. If the server database is empty, the app imports that browser's saved data. Other browsers then load and sync the shared server data after login.

## Menggunakan API Gateway AI

Aplikasi mendukung gateway dengan format **OpenAI-compatible Chat Completions**, termasuk gateway agregator model seperti Ciora. Dari tombol **AI Gateway** di aplikasi, masukkan Base URL, nama model yang tersedia di gateway, dan API key. Base URL biasanya berakhiran `/v1`; aplikasi menambahkan `/chat/completions` secara otomatis.

Gunakan tombol **Uji koneksi** untuk mengirim permintaan singkat ke model sebelum menyimpan konfigurasi. Jika gagal, aplikasi menampilkan penyebab umum seperti Base URL/model tidak ditemukan, API key ditolak, kuota habis, atau server gateway tidak dapat dijangkau. Pengujian memakai sedikit kuota API.

Konfigurasi dan API key gateway disinkronkan ke server; API key dienkripsi di database menggunakan `APP_ENCRYPTION_KEY`. Hapus konfigurasi melalui tombol **Hapus konfigurasi** untuk kembali memakai Gemini dari `GEMINI_API_KEY`.

## Migrasi dari WSL ke live server

Gunakan PostgreSQL yang sama pada kedua lingkungan. Cadangkan database WSL dengan `pg_dump` dan pulihkan di PostgreSQL live dengan `pg_restore`, lalu atur `DATABASE_URL`, `APP_USERNAME`, `APP_PASSWORD`, `SESSION_SECRET`, dan `APP_ENCRYPTION_KEY` pada server live. **Pertahankan `APP_ENCRYPTION_KEY` yang sama**, karena tanpanya API key gateway yang sudah tersimpan tidak dapat didekripsi. Pasang HTTPS sebelum mengakses login dari jaringan publik.
