// =============================================================
// FILE: routes/admin.js
// FUNGSI: Menangani semua operasi admin:
//         - Statistik dashboard
//         - CRUD jadwal operasi (tambah, lihat, ubah, hapus)
//         - Validasi bentrok ruang operasi
//         - Ubah status jadwal
//         - Generate dan unduh QR Code
//         - Laporan (cetak dan CSV)
//         - Pengaturan URL website
// LOKASI: routes/admin.js
// =============================================================

const express = require('express');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const { db } = require('../db/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Semua route di file ini wajib login admin
router.use(requireAdmin);

// Pastikan folder download ada
const downloadFolder = path.join(__dirname, '..', 'download');
if (!fs.existsSync(downloadFolder)) {
  fs.mkdirSync(downloadFolder, { recursive: true });
}

// =====================================================================
// STATISTIK DASHBOARD
// =====================================================================

/**
 * GET /api/admin/stats
 * Mengambil ringkasan statistik untuk dashboard admin.
 */
router.get('/stats', (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  const totalJadwal = db.prepare('SELECT COUNT(*) as total FROM schedules').get().total;
  const jadwalHariIni = db.prepare('SELECT COUNT(*) as total FROM schedules WHERE tanggal_operasi = ?').get(today).total;
  const jadwalMendatang = db.prepare('SELECT COUNT(*) as total FROM schedules WHERE tanggal_operasi > ? AND status = ?').get(today, 'Terjadwal').total;
  const jadwalDitunda = db.prepare("SELECT COUNT(*) as total FROM schedules WHERE status = 'Ditunda'").get().total;
  const jadwalSelesai = db.prepare("SELECT COUNT(*) as total FROM schedules WHERE status = 'Selesai'").get().total;

  return res.json({
    success: true,
    data: {
      total_jadwal: totalJadwal,
      jadwal_hari_ini: jadwalHariIni,
      jadwal_mendatang: jadwalMendatang,
      jadwal_ditunda: jadwalDitunda,
      jadwal_selesai: jadwalSelesai
    }
  });
});

// =====================================================================
// CRUD JADWAL
// =====================================================================

/**
 * GET /api/admin/jadwal
 * Mengambil SEMUA jadwal (termasuk data pasien) untuk dashboard admin.
 * Mendukung filter tanggal, status, dan pencarian.
 */
router.get('/jadwal', (req, res) => {
  const { tanggal, status, q } = req.query;

  let sql = `
    SELECT
      s.id,
      s.tanggal_operasi,
      s.waktu_mulai,
      s.waktu_selesai,
      s.ruang_operasi,
      s.jenis_operasi,
      s.dokter_bedah,
      s.status,
      s.catatan,
      s.created_at,
      s.updated_at,
      p.kode_akses,
      p.nama_lengkap,
      p.nomor_rekam_medis,
      p.diagnosis
    FROM schedules s
    JOIN patients p ON s.patient_id = p.id
    WHERE 1=1
  `;
  const params = [];

  if (tanggal) {
    sql += ' AND s.tanggal_operasi = ?';
    params.push(tanggal);
  }

  if (status && status !== 'semua') {
    sql += ' AND s.status = ?';
    params.push(status);
  }

  if (q && q.trim() !== '') {
    sql += ' AND (s.jenis_operasi LIKE ? OR s.dokter_bedah LIKE ? OR p.nama_lengkap LIKE ? OR p.kode_akses LIKE ?)';
    const keyword = `%${q.trim()}%`;
    params.push(keyword, keyword, keyword, keyword);
  }

  sql += ' ORDER BY s.tanggal_operasi DESC, s.waktu_mulai DESC';

  const jadwal = db.prepare(sql).all(...params);
  return res.json({ success: true, count: jadwal.length, data: jadwal });
});

/**
 * GET /api/admin/jadwal/:id
 * Mengambil detail satu jadwal berdasarkan ID.
 */
router.get('/jadwal/:id', (req, res) => {
  const { id } = req.params;

  const jadwal = db.prepare(`
    SELECT
      s.*,
      p.kode_akses,
      p.nama_lengkap,
      p.nomor_rekam_medis,
      p.diagnosis,
      p.nomor_telepon
    FROM schedules s
    JOIN patients p ON s.patient_id = p.id
    WHERE s.id = ?
  `).get(id);

  if (!jadwal) {
    return res.status(404).json({ success: false, message: 'Jadwal tidak ditemukan.' });
  }

  return res.json({ success: true, data: jadwal });
});

/**
 * POST /api/admin/jadwal
 * Menambahkan jadwal operasi baru.
 * Validasi:
 *   - Semua field wajib diisi
 *   - Waktu selesai harus setelah waktu mulai
 *   - Tidak boleh bentrok dengan jadwal lain di ruang yang sama
 */
router.post('/jadwal', (req, res) => {
  const {
    kode_akses, tanggal_operasi, waktu_mulai, waktu_selesai,
    ruang_operasi, jenis_operasi, dokter_bedah, status, catatan
  } = req.body;

  // === Validasi field wajib ===
  const fieldWajib = { kode_akses, tanggal_operasi, waktu_mulai, waktu_selesai, ruang_operasi, jenis_operasi, dokter_bedah };
  for (const [key, value] of Object.entries(fieldWajib)) {
    if (!value || String(value).trim() === '') {
      return res.status(400).json({
        success: false,
        message: `Field "${key}" wajib diisi.`
      });
    }
  }

  // === Validasi waktu ===
  if (waktu_selesai <= waktu_mulai) {
    return res.status(400).json({
      success: false,
      message: 'Waktu selesai harus lebih besar dari waktu mulai.'
    });
  }

  // === Cari pasien berdasarkan kode akses ===
  const pasien = db.prepare('SELECT id FROM patients WHERE kode_akses = ?').get(kode_akses.trim());
  if (!pasien) {
    return res.status(404).json({
      success: false,
      message: 'Pasien dengan kode akses tersebut tidak ditemukan. Tambahkan pasien terlebih dahulu atau periksa kembali kode aksesnya.'
    });
  }

  // === Validasi bentrok ruang operasi ===
  // Cek apakah ada jadwal lain di ruang yang sama pada tanggal yang sama
  // yang waktunya tumpang tindih dengan jadwal baru.
  const bentrok = db.prepare(`
    SELECT id, waktu_mulai, waktu_selesai, jenis_operasi
    FROM schedules
    WHERE ruang_operasi = ?
      AND tanggal_operasi = ?
      AND status != 'Dibatalkan'
      AND (
        (waktu_mulai < ? AND waktu_selesai > ?)
        OR
        (waktu_mulai < ? AND waktu_selesai > ?)
        OR
        (waktu_mulai >= ? AND waktu_selesai <= ?)
      )
  `).get(ruang_operasi, tanggal_operasi, waktu_selesai, waktu_mulai, waktu_selesai, waktu_mulai, waktu_mulai, waktu_selesai);

  if (bentrok) {
    return res.status(409).json({
      success: false,
      message: `Jadwal bentrok! Ruang "${ruang_operasi}" sudah dipakai pada ${tanggal_operasi} pukul ${bentrok.waktu_mulai}-${bentrok.waktu_selesai} untuk operasi ${bentrok.jenis_operasi}. Silakan pilih ruang atau waktu lain.`
    });
  }

  // === Simpan jadwal baru ===
  const statusFinal = status || 'Terjadwal';
  const catatanFinal = catatan || '';

  try {
    const result = db.prepare(`
      INSERT INTO schedules
        (patient_id, tanggal_operasi, waktu_mulai, waktu_selesai, ruang_operasi, jenis_operasi, dokter_bedah, status, catatan)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      pasien.id, tanggal_operasi, waktu_mulai, waktu_selesai,
      ruang_operasi, jenis_operasi, dokter_bedah, statusFinal, catatanFinal
    );

    return res.json({
      success: true,
      message: 'Jadwal operasi berhasil ditambahkan.',
      data: { id: result.lastInsertRowid }
    });
  } catch (err) {
    console.error('[ADMIN] Gagal menambah jadwal:', err);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server saat menambah jadwal.'
    });
  }
});

/**
 * PUT /api/admin/jadwal/:id
 * Mengubah jadwal operasi yang sudah ada.
 */
router.put('/jadwal/:id', (req, res) => {
  const { id } = req.params;
  const {
    kode_akses, tanggal_operasi, waktu_mulai, waktu_selesai,
    ruang_operasi, jenis_operasi, dokter_bedah, status, catatan
  } = req.body;

  // Cek apakah jadwal dengan ID tersebut ada
  const existing = db.prepare('SELECT * FROM schedules WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Jadwal tidak ditemukan.' });
  }

  // Validasi field wajib
  if (!tanggal_operasi || !waktu_mulai || !waktu_selesai || !ruang_operasi || !jenis_operasi || !dokter_bedah) {
    return res.status(400).json({
      success: false,
      message: 'Semua field wajib diisi.'
    });
  }

  // Validasi waktu
  if (waktu_selesai <= waktu_mulai) {
    return res.status(400).json({
      success: false,
      message: 'Waktu selesai harus lebih besar dari waktu mulai.'
    });
  }

  // Cari pasien (boleh ubah pemilik jadwal jika kode akses diisi)
  let patientId = existing.patient_id;
  if (kode_akses && kode_akses.trim() !== '') {
    const pasien = db.prepare('SELECT id FROM patients WHERE kode_akses = ?').get(kode_akses.trim());
    if (!pasien) {
      return res.status(404).json({
        success: false,
        message: 'Pasien dengan kode akses tersebut tidak ditemukan.'
      });
    }
    patientId = pasien.id;
  }

  // Validasi bentrok (kecuali diri sendiri)
  const bentrok = db.prepare(`
    SELECT id, waktu_mulai, waktu_selesai, jenis_operasi
    FROM schedules
    WHERE ruang_operasi = ?
      AND tanggal_operasi = ?
      AND status != 'Dibatalkan'
      AND id != ?
      AND (
        (waktu_mulai < ? AND waktu_selesai > ?)
        OR
        (waktu_mulai < ? AND waktu_selesai > ?)
        OR
        (waktu_mulai >= ? AND waktu_selesai <= ?)
      )
  `).get(ruang_operasi, tanggal_operasi, id, waktu_selesai, waktu_mulai, waktu_selesai, waktu_mulai, waktu_mulai, waktu_selesai);

  if (bentrok) {
    return res.status(409).json({
      success: false,
      message: `Jadwal bentrok! Ruang "${ruang_operasi}" sudah dipakai pada ${tanggal_operasi} pukul ${bentrok.waktu_mulai}-${bentrok.waktu_selesai} untuk operasi ${bentrok.jenis_operasi}.`
    });
  }

  try {
    db.prepare(`
      UPDATE schedules SET
        patient_id = ?,
        tanggal_operasi = ?,
        waktu_mulai = ?,
        waktu_selesai = ?,
        ruang_operasi = ?,
        jenis_operasi = ?,
        dokter_bedah = ?,
        status = ?,
        catatan = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      patientId, tanggal_operasi, waktu_mulai, waktu_selesai,
      ruang_operasi, jenis_operasi, dokter_bedah,
      status || existing.status, catatan || '', id
    );

    return res.json({
      success: true,
      message: 'Jadwal operasi berhasil diperbarui.'
    });
  } catch (err) {
    console.error('[ADMIN] Gagal mengubah jadwal:', err);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan server saat mengubah jadwal.'
    });
  }
});

/**
 * PATCH /api/admin/jadwal/:id/status
 * Mengubah hanya status jadwal (Terjadwal / Ditunda / Selesai / Dibatalkan).
 */
router.patch('/jadwal/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const statusValid = ['Terjadwal', 'Ditunda', 'Selesai', 'Dibatalkan'];
  if (!statusValid.includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Status tidak valid. Pilih: ' + statusValid.join(', ')
    });
  }

  const existing = db.prepare('SELECT id FROM schedules WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Jadwal tidak ditemukan.' });
  }

  db.prepare(`
    UPDATE schedules SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(status, id);

  return res.json({
    success: true,
    message: `Status jadwal berhasil diubah menjadi "${status}".`
  });
});

/**
 * DELETE /api/admin/jadwal/:id
 * Menghapus jadwal operasi.
 */
router.delete('/jadwal/:id', (req, res) => {
  const { id } = req.params;

  const existing = db.prepare('SELECT id FROM schedules WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Jadwal tidak ditemukan.' });
  }

  db.prepare('DELETE FROM schedules WHERE id = ?').run(id);

  return res.json({
    success: true,
    message: 'Jadwal operasi berhasil dihapus.'
  });
});

// =====================================================================
// QR CODE
// =====================================================================

/**
 * GET /api/admin/qr-code
 * Menghasilkan QR Code yang berisi URL halaman jadwal publik.
 * Query:
 *   - format: 'png' (default) atau 'dataurl'
 *   - target: 'jadwal' (default), 'scan', atau 'beranda'
 *
 * QR Code akan berisi URL lengkap, contoh:
 *   http://localhost:3000/jadwal.html
 *
 * Saat di-scan dengan HP, browser HP akan otomatis membuka URL tersebut.
 */
router.get('/qr-code', async (req, res) => {
  try {
    const format = req.query.format || 'png';
    const target = req.query.target || 'jadwal';

    // Ambil URL website dari settings
    let setting = db.prepare("SELECT value FROM settings WHERE key = 'site_url'").get();
    let baseUrl = setting ? setting.value : 'http://localhost:3000';

    // Hapus trailing slash jika ada
    baseUrl = baseUrl.replace(/\/$/, '');

    // Tentukan path berdasarkan target
    let pathTarget = '/jadwal.html';
    if (target === 'scan') pathTarget = '/scan.html';
    if (target === 'beranda') pathTarget = '/';

    const fullUrl = baseUrl + pathTarget;

    if (format === 'dataurl') {
      // Kembalikan sebagai data URL (base64) untuk ditampilkan di <img>
      const dataUrl = await QRCode.toDataURL(fullUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: '#0d3b66',
          light: '#ffffff'
        }
      });
      return res.json({
        success: true,
        url: fullUrl,
        dataUrl: dataUrl
      });
    }

    // Format PNG: unduh sebagai file gambar
    const pngBuffer = await QRCode.toBuffer(fullUrl, {
      type: 'png',
      width: 400,
      margin: 2,
      color: {
        dark: '#0d3b66',
        light: '#ffffff'
      }
    });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="qr-code-${target}.png"`);
    return res.send(pngBuffer);
  } catch (err) {
    console.error('[ADMIN] Gagal membuat QR Code:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal membuat QR Code.'
    });
  }
});

// =====================================================================
// PENGATURAN URL WEBSITE
// =====================================================================

/**
 * GET /api/admin/settings
 * Mengambil pengaturan aplikasi.
 */
router.get('/settings', (req, res) => {
  const settings = db.prepare('SELECT key, value FROM settings').all();
  const obj = {};
  settings.forEach(s => { obj[s.key] = s.value; });
  return res.json({ success: true, data: obj });
});

/**
 * PUT /api/admin/settings
 * Memperbarui URL website (digunakan untuk QR Code).
 */
router.put('/settings', (req, res) => {
  const { site_url } = req.body;

  if (!site_url || site_url.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'URL website wajib diisi.'
    });
  }

  // Validasi format URL sederhana
  try {
    new URL(site_url);
  } catch (e) {
    return res.status(400).json({
      success: false,
      message: 'Format URL tidak valid. Contoh yang benar: http://localhost:3000 atau https://jadwal-operasi.example.com'
    });
  }

  db.prepare(`
    INSERT INTO settings (key, value) VALUES ('site_url', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(site_url.trim());

  return res.json({
    success: true,
    message: 'URL website berhasil diperbarui. QR Code baru akan menggunakan URL ini.'
  });
});

// =====================================================================
// LAPORAN
// =====================================================================

/**
 * GET /api/admin/laporan
 * Mengambil data laporan jadwal operasi.
 * Query:
 *   - dari: tanggal awal (YYYY-MM-DD)
 *   - sampai: tanggal akhir (YYYY-MM-DD)
 *   - status: filter status
 */
router.get('/laporan', (req, res) => {
  const { dari, sampai, status } = req.query;

  let sql = `
    SELECT
      s.id,
      s.tanggal_operasi,
      s.waktu_mulai,
      s.waktu_selesai,
      s.ruang_operasi,
      s.jenis_operasi,
      s.dokter_bedah,
      s.status,
      s.catatan,
      p.kode_akses,
      p.nama_lengkap,
      p.nomor_rekam_medis
    FROM schedules s
    JOIN patients p ON s.patient_id = p.id
    WHERE 1=1
  `;
  const params = [];

  if (dari) {
    sql += ' AND s.tanggal_operasi >= ?';
    params.push(dari);
  }
  if (sampai) {
    sql += ' AND s.tanggal_operasi <= ?';
    params.push(sampai);
  }
  if (status && status !== 'semua') {
    sql += ' AND s.status = ?';
    params.push(status);
  }

  sql += ' ORDER BY s.tanggal_operasi ASC, s.waktu_mulai ASC';

  const data = db.prepare(sql).all(...params);

  return res.json({ success: true, count: data.length, data });
});

/**
 * GET /api/admin/laporan/csv
 * Mengunduh laporan dalam format CSV.
 */
router.get('/laporan/csv', (req, res) => {
  const { dari, sampai, status } = req.query;

  let sql = `
    SELECT
      s.id, s.tanggal_operasi, s.waktu_mulai, s.waktu_selesai,
      s.ruang_operasi, s.jenis_operasi, s.dokter_bedah, s.status, s.catatan,
      p.kode_akses, p.nama_lengkap, p.nomor_rekam_medis
    FROM schedules s
    JOIN patients p ON s.patient_id = p.id
    WHERE 1=1
  `;
  const params = [];

  if (dari) {
    sql += ' AND s.tanggal_operasi >= ?';
    params.push(dari);
  }
  if (sampai) {
    sql += ' AND s.tanggal_operasi <= ?';
    params.push(sampai);
  }
  if (status && status !== 'semua') {
    sql += ' AND s.status = ?';
    params.push(status);
  }

  sql += ' ORDER BY s.tanggal_operasi ASC, s.waktu_mulai ASC';

  const data = db.prepare(sql).all(...params);

  // Bangun CSV secara manual (sederhana, cukup untuk data ini)
  const headers = [
    'ID', 'Tanggal Operasi', 'Waktu Mulai', 'Waktu Selesai',
    'Ruang Operasi', 'Jenis Operasi', 'Dokter Bedah', 'Status',
    'Kode Akses', 'Nama Pasien', 'No. Rekam Medis', 'Catatan'
  ];

  function escapeCSV(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  const csvLines = [headers.join(',')];
  data.forEach(row => {
    csvLines.push([
      row.id,
      row.tanggal_operasi,
      row.waktu_mulai,
      row.waktu_selesai,
      row.ruang_operasi,
      row.jenis_operasi,
      row.dokter_bedah,
      row.status,
      row.kode_akses,
      row.nama_lengkap,
      row.nomor_rekam_medis,
      row.catatan
    ].map(escapeCSV).join(','));
  });

  const csvContent = '\uFEFF' + csvLines.join('\n'); // BOM agar Excel membaca UTF-8

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="laporan-jadwal-operasi-${new Date().toISOString().split('T')[0]}.csv"`);

  return res.send(csvContent);
});

module.exports = router;
