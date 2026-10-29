// =============================================================
// FILE: scripts/seed.js
// FUNGSI: Mengisi database dengan data demonstrasi fiktif.
//         Jalankan dengan: node scripts/seed.js
// LOKASI: scripts/seed.js
// =============================================================

const bcrypt = require('bcryptjs');
const { db, initDatabase } = require('../db/database');

console.log('=== MENGINISIALISASI DATABASE DEMONSTRASI ===\n');

// 1. Buat tabel jika belum ada
initDatabase();

// 2. Hapus data lama (hanya untuk keperluan demo - jangan lakukan di produksi)
db.exec('DELETE FROM schedules;');
db.exec('DELETE FROM patients;');
db.exec('DELETE FROM admins;');
db.exec('DELETE FROM settings;');

// Reset autoincrement
db.exec("DELETE FROM sqlite_sequence WHERE name IN ('schedules','patients','admins');");

console.log('[SEED] Data lama dibersihkan.');

// 3. Buat akun admin default
// Username: admin
// Password: admin123
// CATATAN PENTING: Password ini hanya untuk prototipe akademik.
//                  Jangan gunakan password lemah seperti ini di sistem nyata.
const passwordHash = bcrypt.hashSync('admin123', 10);

db.prepare(`
  INSERT INTO admins (username, password_hash, nama_lengkap)
  VALUES (?, ?, ?)
`).run('admin', passwordHash, 'Admin Utama RS Sehat Sentosa');

console.log('[SEED] Akun admin dibuat:');
console.log('       Username: admin');
console.log('       Password: admin123');

// 4. Tambahkan data pasien fiktif
const pasienData = [
  { kode: 'PAS-2024-001', nama: 'Budi Santoso',       rm: 'RM-1001', diagnosa: 'Apendisitis akut',         telp: '0812-1111-1111' },
  { kode: 'PAS-2024-002', nama: 'Siti Aminah',         rm: 'RM-1002', diagnosa: 'Kalkulus kandung empedu',  telp: '0812-2222-2222' },
  { kode: 'PAS-2024-003', nama: 'Andi Wijaya',         rm: 'RM-1003', diagnosa: 'Hernia inguinalis',         telp: '0812-3333-3333' },
  { kode: 'PAS-2024-004', nama: 'Dewi Lestari',        rm: 'RM-1004', diagnosa: 'Mioma uteri',               telp: '0812-4444-4444' },
  { kode: 'PAS-2024-005', nama: 'Rudi Hartono',        rm: 'RM-1005', diagnosa: 'Fraktur tulang radius',      telp: '0812-5555-5555' },
  { kode: 'PAS-2024-006', nama: 'Maya Sari',           rm: 'RM-1006', diagnosa: 'Katarak mata kanan',         telp: '0812-6666-6666' },
  { kode: 'PAS-2024-007', nama: 'Joko Susilo',         rm: 'RM-1007', diagnosa: 'Hemoroid grade III',         telp: '0812-7777-7777' },
  { kode: 'PAS-2024-008', nama: 'Rina Marlina',        rm: 'RM-1008', diagnosa: 'Struma nodusa',              telp: '0812-8888-8888' },
  { kode: 'PAS-2024-009', nama: 'Hendra Gunawan',      rm: 'RM-1009', diagnosa: 'Apendisitis kronik',         telp: '0812-9999-9999' },
  { kode: 'PAS-2024-010', nama: 'Lina Kusuma',         rm: 'RM-1010', diagnosa: 'Kista ovarii',               telp: '0813-1010-1010' },
];

const insertPasien = db.prepare(`
  INSERT INTO patients (kode_akses, nama_lengkap, nomor_rekam_medis, diagnosis, nomor_telepon)
  VALUES (?, ?, ?, ?, ?)
`);

const pasienIds = [];
pasienData.forEach(p => {
  const result = insertPasien.run(p.kode, p.nama, p.rm, p.diagnosa, p.telp);
  pasienIds.push(result.lastInsertRowid);
});
console.log(`[SEED] ${pasienData.length} data pasien fiktif ditambahkan.`);

// 5. Tambahkan jadwal operasi fiktif
// Untuk tanggal, gunakan tanggal hari ini, kemarin, dan beberapa hari ke depan
const today = new Date();
function tanggal(n) {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

const jadwalData = [
  // Hari ini
  { pid: 0, tgl: tanggal(0),  mulai: '08:00', selesai: '10:00', ruang: 'Ruang Operasi 1 (Cendana)', jenis: 'Apendektomi',         dokter: 'dr. Andi Pratama, Sp.B',     status: 'Terjadwal', catatan: 'Pasien dipuasa sejak pukul 22.00' },
  { pid: 1, tgl: tanggal(0),  mulai: '10:30', selesai: '12:30', ruang: 'Ruang Operasi 2 (Mawar)',  jenis: 'Kolesistektomi',     dokter: 'dr. Sari Dewi, Sp.B-KBD',    status: 'Terjadwal', catatan: 'Premedikasi 30 menit sebelum operasi' },
  { pid: 2, tgl: tanggal(0),  mulai: '13:00', selesai: '14:30', ruang: 'Ruang Operasi 1 (Cendana)', jenis: 'Hernioplasti',       dokter: 'dr. Bambang Sutrisno, Sp.B', status: 'Ditunda',  catatan: 'Ditunda karena pasien demam' },
  // Besok
  { pid: 3, tgl: tanggal(1),  mulai: '08:00', selesai: '11:00', ruang: 'Ruang Operasi 3 (Melati)', jenis: 'Histerektomi',       dokter: 'dr. Rina Wulandari, Sp.OG',  status: 'Terjadwal', catatan: 'Pasien sudah menjalani pre-op' },
  { pid: 4, tgl: tanggal(1),  mulai: '09:00', selesai: '10:30', ruang: 'Ruang Operasi 2 (Mawar)',  jenis: 'ORIF Radius',        dokter: 'dr. Hendra Kusuma, Sp.OT',   status: 'Terjadwal', catatan: 'Pasien dari IGD' },
  // Lusa
  { pid: 5, tgl: tanggal(2),  mulai: '07:30', selesai: '09:00', ruang: 'Ruang Operasi 4 (Anggrek)', jenis: 'Fakoemulsifikasi',   dokter: 'dr. Maya Anggraini, Sp.M',   status: 'Terjadwal', catatan: 'Persiapan tetes mata sebelum operasi' },
  { pid: 6, tgl: tanggal(2),  mulai: '10:00', selesai: '11:00', ruang: 'Ruang Operasi 1 (Cendana)', jenis: 'Hemoroidektomi',     dokter: 'dr. Andi Pratama, Sp.B',     status: 'Terjadwal', catatan: '' },
  // 3 hari lagi
  { pid: 7, tgl: tanggal(3),  mulai: '08:00', selesai: '11:00', ruang: 'Ruang Operasi 3 (Melati)', jenis: 'Tiroidectomy',       dokter: 'dr. Sari Dewi, Sp.B-KBD',    status: 'Terjadwal', catatan: 'Pasien menjalani USG tiroid' },
  { pid: 8, tgl: tanggal(3),  mulai: '12:00', selesai: '13:00', ruang: 'Ruang Operasi 2 (Mawar)',  jenis: 'Apendektomi',        dokter: 'dr. Bambang Sutrisno, Sp.B', status: 'Terjadwal', catatan: 'Penundaan dari jadwal sebelumnya' },
  // 4 hari lagi
  { pid: 9, tgl: tanggal(4),  mulai: '09:00', selesai: '12:00', ruang: 'Ruang Operasi 3 (Melati)', jenis: 'Kistektomi Ovarii',  dokter: 'dr. Rina Wulandari, Sp.OG',  status: 'Terjadwal', catatan: 'Pasien menjalani konsultasi anestesi' },
  // Sudah selesai (kemarin)
  { pid: 0, tgl: tanggal(-1), mulai: '08:00', selesai: '09:30', ruang: 'Ruang Operasi 1 (Cendana)', jenis: 'Apendektomi',       dokter: 'dr. Andi Pratama, Sp.B',     status: 'Selesai',  catatan: 'Operasi berjalan lancar' },
  { pid: 2, tgl: tanggal(-1), mulai: '10:00', selesai: '11:30', ruang: 'Ruang Operasi 2 (Mawar)',  jenis: 'Hernioplasti',       dokter: 'dr. Bambang Sutrisno, Sp.B', status: 'Selesai',  catatan: 'Pasien pulang sembuh' },
];

const insertJadwal = db.prepare(`
  INSERT INTO schedules (patient_id, tanggal_operasi, waktu_mulai, waktu_selesai, ruang_operasi, jenis_operasi, dokter_bedah, status, catatan)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

jadwalData.forEach(j => {
  insertJadwal.run(
    pasienIds[j.pid],
    j.tgl, j.mulai, j.selesai, j.ruang, j.jenis, j.dokter, j.status, j.catatan
  );
});
console.log(`[SEED] ${jadwalData.length} data jadwal operasi fiktif ditambahkan.`);

// 6. Simpan pengaturan default URL website untuk QR code
// Default: gunakan localhost. Ganti dengan URL sebenarnya saat sudah di-hosting.
db.prepare(`
  INSERT INTO settings (key, value) VALUES ('site_url', 'http://localhost:3000')
`).run();
console.log('[SEED] Pengaturan URL website untuk QR Code disimpan.');

console.log('\n=== SEED DATABASE SELESAI ===');
console.log('Anda sekarang dapat menjalankan server dengan: npm start');
