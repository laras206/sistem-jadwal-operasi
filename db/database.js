// =============================================================
// FILE: db/database.js
// FUNGSI: Mengatur koneksi dan pembuatan tabel database SQLite.
//         File ini akan otomatis membuat file database jika belum ada.
// LOKASI: db/database.js
// =============================================================

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Pastikan folder db ada
const dbFolder = path.join(__dirname);
if (!fs.existsSync(dbFolder)) {
  fs.mkdirSync(dbFolder, { recursive: true });
}

// Lokasi file database SQLite
const dbPath = path.join(dbFolder, 'jadwal_operasi.db');

// Buka koneksi ke database (otomatis dibuat jika belum ada)
const db = new Database(dbPath);

// Aktifkan foreign key agar relasi tabel berfungsi
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/**
 * Inisialisasi tabel-tabel database jika belum ada.
 * Fungsi ini aman dipanggil berkali-kali (CREATE TABLE IF NOT EXISTS).
 */
function initDatabase() {
  // Tabel admin: menyimpan akun petugas/admin rumah sakit
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      nama_lengkap TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Tabel patients: menyimpan data pribadi pasien
  // PENTING: Data di tabel ini TIDAK boleh ditampilkan di halaman publik
  db.exec(`
    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kode_akses TEXT UNIQUE NOT NULL,
      nama_lengkap TEXT NOT NULL,
      nomor_rekam_medis TEXT NOT NULL,
      diagnosis TEXT,
      nomor_telepon TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Tabel schedules: menyimpan jadwal operasi
  db.exec(`
    CREATE TABLE IF NOT EXISTS schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      tanggal_operasi DATE NOT NULL,
      waktu_mulai TIME NOT NULL,
      waktu_selesai TIME NOT NULL,
      ruang_operasi TEXT NOT NULL,
      jenis_operasi TEXT NOT NULL,
      dokter_bedah TEXT NOT NULL,
      status TEXT DEFAULT 'Terjadwal',
      catatan TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
    );
  `);

  // Tabel settings: menyimpan pengaturan aplikasi (mis. URL website untuk QR)
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  console.log('[DATABASE] Tabel berhasil diinisialisasi.');
}

// Export modul
module.exports = { db, initDatabase, dbPath };
