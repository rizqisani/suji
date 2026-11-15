<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/42e15e65-9c42-4186-a142-e135540a5157

## Run Locally

**Prerequisites:** Node.js 22+ and PostgreSQL


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
