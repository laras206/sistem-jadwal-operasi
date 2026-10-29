# Sistem Informasi Jadwal Operasi Pasien Berbasis Web dengan Integrasi QR Code

> **Prototipe Akademik — RS Sehat Sentosa (Fiktif)**
> UAS Mata Kuliah Rekayasa Perangkat Lunak
> Program Studi S1 Teknik Biomedis

---

## Daftar Isi

1. [Gambaran Umum](#1-gambaran-umum)
2. [Teknologi yang Digunakan](#2-teknologi-yang-digunakan)
3. [Persiapan Software](#3-persiapan-software)
4. [Struktur Folder](#4-struktur-folder)
5. [Panduan Instalasi dari Nol](#5-panduan-instalasi-dari-nol)
6. [Menjalankan Website](#6-menjalankan-website)
7. [Panduan Pengujian](#7-panduan-pengujian)
8. [Menguji QR Code dari HP](#8-menguji-qr-code-dari-hp)
9. [Mengatasi Error Umum](#9-mengatasi-error-umum)
10. [Dokumentasi untuk UAS](#10-dokumentasi-untuk-uas)
11. [Kredensial Demo](#11-kredensial-demo)

---

## 1. Gambaran Umum

Website ini merupakan **prototipe akademik** Sistem Informasi Jadwal Operasi Pasien untuk rumah
sakit fiktif **RS Sehat Sentosa**. Tujuannya:

- Memudahkan pasien melihat informasi jadwal operasi yang aman dipublikasikan.
- Memudahkan pasien memeriksa jadwal operasinya sendiri dengan kode akses.
- Memudahkan admin mengelola jadwal operasi (tambah, ubah, hapus, ubah status).
- Menghasilkan QR Code yang dapat dipindai untuk membuka halaman jadwal.
- Membantu petugas membuat laporan (cetak dan CSV).

### Halaman Website

1. **Beranda** (`/`) — pengenalan sistem dan statistik ringkas.
2. **Daftar Jadwal Operasi** (`/jadwal.html`) — daftar publik dengan filter.
3. **Cek Jadwal Saya** (`/cek-jadwal.html`) — akses pasien via kode akses.
4. **Scan QR Code** (`/scan.html`) — pemindai QR Code dengan kamera HP/laptop.
5. **Login Admin** (`/admin-login.html`) — halaman login petugas.
6. **Dashboard Admin** (`/admin-dashboard.html`) — panel kelola jadwal + QR + laporan.

### ⚠️ Peringatan Penting

Website ini **belum lulus uji keamanan** dan **tidak boleh digunakan** untuk menyimpan data pasien
nyata. Seluruh data yang ditampilkan adalah **data fiktif** untuk demonstrasi akademik.

---

## 2. Teknologi yang Digunakan

| Teknologi | Fungsi |
|-----------|--------|
| **HTML** | Struktur halaman website |
| **CSS** | Desain tampilan (warna, layout, animasi) |
| **JavaScript** | Interaksi di sisi klien (browser) |
| **Node.js** | Runtime untuk menjalankan JavaScript di server |
| **Express** | Framework untuk membuat server HTTP dan API |
| **better-sqlite3** | Driver untuk mengakses database SQLite |
| **express-session** | Mengelola sesi login admin |
| **bcryptjs** | Meng-hash password admin |
| **qrcode** | Membuat QR Code (di server) |
| **html5-qrcode** | Memindai QR Code via kamera (di browser) |

---

## 3. Persiapan Software

### 3.1 Software yang Wajib Diinstal

1. **Node.js** (versi 18 LTS atau lebih baru)
   - Tautan: <https://nodejs.org>
   - Pilih versi "LTS" (Long Term Support).
   - Saat instalasi, **centang** opsi "Add to PATH".

2. **Visual Studio Code (VS Code)**
   - Tautan: <https://code.visualstudio.com>
   - Editor untuk menulis kode.

3. **Browser Modern** (Chrome, Edge, atau Firefox)
   - Untuk membuka website dan menguji.

### 3.2 Cek Instalasi Node.js

Buka **Command Prompt** (Windows) atau **Terminal** (Mac/Linux), lalu ketik:

```bash
node --version
npm --version
```

Jika berhasil, akan muncul nomor versi (mis. `v20.11.0` dan `10.2.4`).

---

## 4. Struktur Folder

```
sistem-jadwal-operasi/
├── package.json              # Konfigurasi proyek dan daftar dependensi
├── server.js                 # File utama untuk menjalankan server Express
├── .gitignore                # Daftar file yang diabaikan oleh Git
├── README.md                 # Dokumentasi proyek (file ini)
│
├── db/                       # Folder database
│   ├── database.js           # Modul koneksi dan inisialisasi SQLite
│   └── jadwal_operasi.db     # File database (otomatis dibuat saat server jalan)
│
├── middleware/               # Folder middleware
│   └── auth.js               # Middleware cek login admin
│
├── routes/                   # Folder route API backend
│   ├── auth.js               # API login, logout, cek sesi
│   ├── jadwal.js             # API jadwal publik
│   ├── pasien.js             # API cek jadwal pasien (kode akses)
│   └── admin.js              # API admin (CRUD, QR, laporan, settings)
│
├── scripts/                  # Folder skrip pendukung
│   └── seed.js               # Skrip untuk mengisi data demonstrasi
│
├── public/                   # Folder file statis (frontend)
│   ├── index.html            # Halaman Beranda
│   ├── jadwal.html           # Halaman Daftar Jadwal Operasi
│   ├── cek-jadwal.html       # Halaman Cek Jadwal Saya
│   ├── scan.html             # Halaman Scan QR Code
│   ├── admin-login.html      # Halaman Login Admin
│   ├── admin-dashboard.html  # Halaman Dashboard Admin
│   │
│   ├── css/
│   │   └── style.css         # Styling semua halaman
│   │
│   ├── js/                   # JavaScript frontend
│   │   ├── common.js         # Fungsi utilitas bersama
│   │   ├── beranda.js        # JS untuk Beranda
│   │   ├── jadwal.js         # JS untuk Daftar Jadwal
│   │   ├── cek-jadwal.js     # JS untuk Cek Jadwal Saya
│   │   ├── scan.js           # JS untuk Scan QR Code
│   │   ├── admin-login.js    # JS untuk Login Admin
│   │   └── admin-dashboard.js# JS untuk Dashboard Admin
│   │
│   └── img/
│       └── logo.svg          # Logo RS Sehat Sentosa
│
└── download/                 # Folder output (kosong, untuk file yang dihasilkan)
```

---

## 5. Panduan Instalasi dari Nol

### LANGKAH 1: Persiapan Software

Instal **Node.js** dan **VS Code** mengikuti panduan di Bagian 3.

### LANGKAH 2: Membuat Folder Proyek

1. Buka **File Explorer**.
2. Buat folder baru di lokasi yang mudah dijangkau, misalnya:
   - `D:\Kuliah\UAS-RPL\sistem-jadwal-operasi`
3. Buka **VS Code**.
4. Klik menu **File → Open Folder...** dan pilih folder yang baru dibuat.

### LANGKAH 3: Membuka Terminal di VS Code

1. Di VS Code, klik menu **Terminal → New Terminal**.
2. Terminal akan terbuka di bagian bawah VS Code.
3. Terminal akan otomatis berada di folder proyek Anda.

### LANGKAH 4: Inisialisasi Proyek Node.js

Di terminal, jalankan perintah berikut satu per satu:

```bash
npm init -y
```

**Fungsi:** Membuat file `package.json` yang berisi konfigurasi proyek.
**Opsi `-y`**: menggunakan jawaban default untuk semua pertanyaan.

### LANGKAH 5: Memasang Library (Dependensi)

Jalankan perintah berikut untuk memasang semua library yang dibutuhkan:

```bash
npm install express express-session better-sqlite3 bcryptjs qrcode
```

**Penjelasan tiap library:**
- `express` — membuat server HTTP.
- `express-session` — mengelola sesi login admin.
- `better-sqlite3` — driver database SQLite (lebih mudah daripada `sqlite3`).
- `bcryptjs` — meng-hash password admin.
- `qrcode` — membuat QR Code di server.

### LANGKAH 6: Membuat File Proyek

Buat semua file sesuai struktur folder di Bagian 4. Untuk membuat file di VS Code:
1. Klik kanan di panel kiri (Explorer) → **New File**.
2. Beri nama file sesuai struktur (mis. `server.js`).
3. Salin kode dari bagian **Source Code** di bawah.

### LANGKAH 7: Mengisi Database Demonstrasi

Setelah semua file dibuat, jalankan perintah berikut di terminal:

```bash
node scripts/seed.js
```

**Fungsi:** Mengisi database dengan data pasien dan jadwal operasi fiktif agar website tidak kosong
saat pertama dijalankan. Anda hanya perlu menjalankan perintah ini **sekali**.

---

## 6. Menjalankan Website

### Menjalankan Server

Di terminal VS Code, jalankan perintah:

```bash
npm start
```

atau

```bash
node server.js
```

Jika berhasil, akan muncul pesan:

```
==========================================================
  SISTEM INFORMASI JADWAL OPERASI PASIEN
  RS Sehat Sentosa - Prototipe Akademik
==========================================================

  Server berjalan di port: 3000

  Akses dari laptop (browser):
    -> http://localhost:3000

  Akses dari HP (jika HP dan laptop 1 WiFi):
    -> http://192.168.x.x:3000
```

### Membuka Website di Browser

Buka browser, lalu akses: **<http://localhost:3000>**

### Menghentikan Server

Di terminal, tekan tombol **Ctrl + C**.

---

## 7. Panduan Pengujian

Berikut daftar pengujian yang dapat dilakukan:

| # | Skenario Pengujian | Hasil yang Diharapkan |
|---|--------------------|------------------------|
| 1 | Buka beranda di `http://localhost:3000` | Halaman beranda tampil dengan logo, statistik, dan tombol |
| 2 | Klik "Lihat Jadwal Operasi" | Halaman daftar jadwal tampil dengan tabel |
| 3 | Filter jadwal berdasarkan tanggal | Tabel terfilter sesuai tanggal |
| 4 | Filter jadwal berdasarkan ruang | Tabel terfilter sesuai ruang |
| 5 | Cari jadwal di kotak pencarian | Tabel terfilter sesuai keyword |
| 6 | Buka "Cek Jadwal Saya", masukkan `PAS-2024-001` | Tampil jadwal Budi Santoso |
| 7 | Buka "Cek Jadwal Saya", masukkan kode salah | Tampil pesan "Kode akses tidak ditemukan" |
| 8 | Buka "Login Admin", masukkan `admin` / `admin123` | Berhasil login, masuk dashboard |
| 9 | Login dengan password salah | Tampil pesan "Username atau password salah" |
| 10 | Di dashboard, klik "Tambah Jadwal" | Form tambah jadwal tampil |
| 11 | Isi form, klik "Simpan" | Jadwal tersimpan, muncul di tabel |
| 12 | Coba tambah jadwal yang bentrok ruang/waktu | Tampil pesan "Jadwal bentrok!" |
| 13 | Klik tombol edit (✎) di tabel jadwal | Form terisi data jadwal tersebut |
| 14 | Ubah data, klik "Update" | Data jadwal berubah |
| 15 | Klik tombol hapus (🗑) di tabel | Modal konfirmasi muncul |
| 16 | Klik "Ya, Hapus" | Jadwal terhapus |
| 17 | Ubah status via dropdown di tabel | Status berubah, pesan sukses muncul |
| 18 | Refresh halaman | Data tetap ada (tersimpan di database) |
| 19 | Buka section "QR Code", klik "Generate" | QR Code muncul di preview |
| 20 | Klik "Download PNG" | File QR Code terunduh |
| 21 | Buka section "Laporan", klik "Tampilkan" | Tabel laporan muncul |
| 22 | Klik "Cetak Laporan" | Dialog print browser muncul |
| 23 | Klik "Download CSV" | File CSV terunduh |
| 24 | Buka section "Pengaturan", ubah URL | URL tersimpan, QR Code baru pakai URL baru |
| 25 | Klik "Logout" | Kembali ke halaman login |
| 26 | Coba akses `/admin-dashboard.html` tanpa login | Otomatis diarahkan ke login |

---

## 8. Menguji QR Code dari HP

### Cara 1: Scan dengan Kamera Bawaan HP

1. Generate QR Code di Dashboard Admin → section "QR Code".
2. Tampilkan QR Code di layar laptop.
3. Buka aplikasi **Kamera** di HP.
4. Arahkan kamera ke QR Code di layar laptop.
5. Notifikasi akan muncul di HP → ketuk untuk membuka.

### Cara 2: Scan via Halaman Website

1. Buka `http://localhost:3000/scan.html` di HP (pastikan 1 WiFi dengan laptop).
2. Klik "Mulai Kamera".
3. Izinkan akses kamera.
4. Arahkan ke QR Code.

### Cara 3: Akses Website dari HP (Local Network)

Karena website berjalan di laptop, HP bisa mengaksesnya melalui **WiFi yang sama**:

1. Pastikan HP dan laptop terhubung ke WiFi yang sama.
2. Jalankan server di laptop (`npm start`).
3. Catat IP laptop yang ditampilkan di terminal (mis. `http://192.168.1.5:3000`).
4. Buka browser HP, akses URL tersebut.

### Mengubah URL untuk QR Code

1. Login sebagai admin.
2. Buka section "Pengaturan".
3. Ganti URL ke URL publik (mis. `https://jadwal-rs.example.com`).
4. Klik "Simpan".
5. Generate QR Code baru — URL baru akan digunakan.

---

## 9. Mengatasi Error Umum

### Error: `node: command not found`

**Sebab:** Node.js belum diinstal atau belum ditambahkan ke PATH.
**Solusi:**
- Instal Node.js dari <https://nodejs.org>.
- Restart terminal VS Code.
- Saat instalasi, centang "Add to PATH".

### Error: `Cannot find module 'express'`

**Sebab:** Dependensi belum dipasang.
**Solusi:** Jalankan `npm install` di folder proyek.

### Error: `EADDRINUSE: address already in use :::3000`

**Sebab:** Port 3000 sudah dipakai aplikasi lain (atau server sudah jalan).
**Solusi:**
- Tutup server lain yang memakai port 3000, ATAU
- Ubah port di `server.js` (baris `const PORT = ...`) ke angka lain (mis. 3001).

### Error: `better-sqlite3: native build failed`

**Sebab:** Library native butuh compiler.
**Solusi (Windows):** Instal **Visual Studio Build Tools** dari
<https://visualstudio.microsoft.com/downloads/> (pilih "Build Tools for Visual Studio"),
lalu pilih workload "Desktop development with C++".
**Solusi (alternatif):** Ganti `better-sqlite3` dengan `sqlite3` (perlu penyesuaian kode).

### Database tidak terisi / data kosong

**Solusi:** Jalankan ulang seed:
```bash
node scripts/seed.js
```

### Login admin selalu gagal

**Sebab:** Database belum di-seed, atau admin belum dibuat.
**Solusi:** Jalankan `node scripts/seed.js` untuk membuat admin default.

### QR Code tidak muncul di halaman scan

**Sebab:** Library `html5-qrcode` gagal dimuat (butuh internet).
**Solusi:** Pastikan laptop/HP terhubung internet saat pertama membuka halaman scan.

### Kamera tidak bisa diakses

**Sebab:** Browser memblokir akses kamera.
**Solusi:**
- Buka via `https://` atau `http://localhost` (bukan IP).
- Jika via IP, gunakan `http://` (Chrome kadang blok kamera di HTTP non-localhost).
- Beri izin kamera di pengaturan browser.

### Perubahan data tidak tersimpan

**Sebab:** Anda mungkin menjalankan 2 instance server, atau database di-reset.
**Solusi:**
- Pastikan hanya 1 server berjalan.
- Jangan jalankan `seed.js` berulang-ulang (akan menghapus data lama).

---

## 10. Dokumentasi untuk UAS

### 10.1 Fungsi Setiap Halaman

| Halaman | Fungsi |
|---------|--------|
| Beranda | Menampilkan informasi umum sistem, statistik, dan tombol akses cepat |
| Daftar Jadwal | Menampilkan jadwal operasi publik dengan filter |
| Cek Jadwal Saya | Pasien melihat jadwalnya sendiri via kode akses |
| Scan QR Code | Memindai QR Code dengan kamera HP/laptop |
| Login Admin | Halaman autentikasi petugas |
| Dashboard Admin | Panel kelola jadwal + QR code + laporan |

### 10.2 Fungsi Frontend dan Backend

**Frontend** (folder `public/`):
- Menampilkan antarmuka pengguna (HTML/CSS).
- Mengirim permintaan ke backend via `fetch()`.
- Menampilkan data yang diterima dari backend.

**Backend** (folder `routes/` + `server.js`):
- Menerima permintaan HTTP dari frontend.
- Memproses logika bisnis (validasi, cek bentrok, dll.).
- Membaca/menulis ke database.
- Mengembalikan respons JSON ke frontend.

### 10.3 Fungsi Database

Database SQLite (`db/jadwal_operasi.db`) menyimpan:
- **Tabel `admins`** — akun petugas (username + password hash).
- **Tabel `patients`** — data pasien (kode akses, nama, RM, diagnosis).
- **Tabel `schedules`** — jadwal operasi (tanggal, waktu, ruang, dokter, status).
- **Tabel `settings`** — pengaturan aplikasi (mis. URL untuk QR).

Database bersifat **persisten** — data tetap ada walaupun server dimatikan.

### 10.4 Cara Kerja QR Code

1. Admin membuka section "QR Code" di dashboard.
2. Frontend memanggil endpoint `GET /api/admin/qr-code?format=dataurl&target=jadwal`.
3. Backend mengambil URL website dari tabel `settings`.
4. Backend menggunakan library `qrcode` untuk membuat gambar QR Code.
5. QR Code dikembalikan sebagai data URL (base64).
6. Frontend menampilkan QR Code di tag `<img>`.
7. Saat "Download PNG" diklik, backend mengirim QR Code sebagai file `.png`.
8. Saat QR Code di-scan dengan HP, browser HP membuka URL yang tertera.

### 10.5 Alur Penggunaan oleh Pasien

```
Pasien datang ke RS
      ↓
Lihat jadwal operasi di layar informasi / scan QR Code
      ↓
Buka halaman "Cek Jadwal Saya"
      ↓
Masukkan kode akses (mis. PAS-2024-001)
      ↓
Lihat detail jadwal operasi pribadi
```

### 10.6 Alur Pengelolaan Jadwal oleh Admin

```
Admin login
      ↓
Buka section "Tambah Jadwal"
      ↓
Isi form (kode akses pasien, tanggal, ruang, dokter, dll.)
      ↓
Sistem validasi (cek field, cek bentrok ruang)
      ↓
Jadwal tersimpan di database
      ↓
Bisa diubah status / diedit / dihapus
      ↓
Bisa dibuat laporan (cetak / CSV)
```

### 10.7 Fitur Keamanan Dasar

1. **Password admin di-hash** dengan bcrypt (tidak disimpan teks biasa).
2. **Autentikasi via backend** — frontend tidak menyimpan password.
3. **Session terlindungi** — cookie `httpOnly` (anti XSS).
4. **Middleware `requireAdmin`** — semua endpoint admin wajib login.
5. **Pasien hanya lihat jadwalnya sendiri** — butuh kode akses yang unik per pasien.
6. **Halaman publik tidak menampilkan** nama pasien, RM, atau diagnosis.
7. **Validasi input** di backend (cek field wajib, format waktu, dll.).
8. **Pencegahan bentrok** — sistem cek tumpang tindih waktu + ruang otomatis.
9. **Nomor rekam medis disembunyikan sebagian** saat ditampilkan ke pasien.
10. **Escape HTML** di frontend untuk mencegah XSS.

### 10.8 Cara Mengambil Screenshot untuk Laporan

1. **Screenshot beranda**: Tekan `PrtSc` atau `Win + Shift + S` di Windows.
2. **Screenshot dashboard admin**: Login dulu, lalu capture.
3. **Screenshot tabel jadwal**: Pastikan tabel terlihat lengkap.
4. **Screenshot QR Code**: Generate dulu, lalu capture.
5. **Screenshot form tambah jadwal**: Isi form dengan data demo, capture.
6. **Screenshot halaman scan QR**: Buka `scan.html` di HP, capture layar HP.

Simpan screenshot dalam folder `screenshots/` untuk dimasukkan ke laporan.

### 10.9 Keterbatasan Prototipe (Wajib Disebut di Laporan)

1. Password demo menggunakan password lemah (`admin123`).
2. Session secret masih hardcoded di `server.js`.
3. Belum menerapkan HTTPS (perlu reverse proxy seperti Nginx).
4. Belum ada audit log untuk aktivitas admin.
5. Rate limiting belum diterapkan pada endpoint login.
6. Belum ada enkripsi data sensitif di database.
7. Kode akses pasien belum memiliki masa kedaluwarsa.
8. Belum ada mekanisme reset kode akses jika hilang.

---

## 11. Kredensial Demo

### Admin
- **Username:** `admin`
- **Password:** `admin123`

### Kode Akses Pasien (10 pasien fiktif)

| Kode Akses | Nama Pasien |
|------------|-------------|
| PAS-2024-001 | Budi Santoso |
| PAS-2024-002 | Siti Aminah |
| PAS-2024-003 | Andi Wijaya |
| PAS-2024-004 | Dewi Lestari |
| PAS-2024-005 | Rudi Hartono |
| PAS-2024-006 | Maya Sari |
| PAS-2024-007 | Joko Susilo |
| PAS-2024-008 | Rina Marlina |
| PAS-2024-009 | Hendra Gunawan |
| PAS-2024-010 | Lina Kusuma |

---

**Akhir Dokumentasi**
