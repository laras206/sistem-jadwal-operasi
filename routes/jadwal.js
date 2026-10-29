// =============================================================
// FILE: routes/jadwal.js
// FUNGSI: Menyediakan data jadwal operasi untuk halaman publik.
//         HANYA menampilkan informasi yang aman untuk umum.
//         Data pribadi pasien (nama, RM, diagnosis) TIDAK ditampilkan.
// LOKASI: routes/jadwal.js
// =============================================================

const express = require('express');
const { db } = require('../db/database');

const router = express.Router();

/**
 * GET /api/jadwal
 * Mengambil daftar jadwal operasi untuk halaman publik.
 * Query opsional:
 *   - tanggal: filter berdasarkan tanggal (YYYY-MM-DD)
 *   - ruang: filter berdasarkan ruang operasi
 *   - q: pencarian berdasarkan jenis operasi / dokter
 *
 * PENTING: Hanya tampilkan field yang aman untuk publik.
 */
router.get('/', (req, res) => {
  const { tanggal, ruang, q } = req.query;

  // Bangun query SQL dinamis
  let sql = `
    SELECT
      s.id,
      s.tanggal_operasi,
      s.waktu_mulai,
      s.waktu_selesai,
      s.ruang_operasi,
      s.jenis_operasi,
      s.dokter_bedah,
      s.status
    FROM schedules s
    WHERE 1=1
  `;
  const params = [];

  if (tanggal) {
    sql += ' AND s.tanggal_operasi = ?';
    params.push(tanggal);
  }

  if (ruang && ruang !== 'semua') {
    sql += ' AND s.ruang_operasi = ?';
    params.push(ruang);
  }

  if (q && q.trim() !== '') {
    sql += ' AND (s.jenis_operasi LIKE ? OR s.dokter_bedah LIKE ?)';
    const keyword = `%${q.trim()}%`;
    params.push(keyword, keyword);
  }

  // Urutkan berdasarkan tanggal dan waktu mulai
  sql += ' ORDER BY s.tanggal_operasi ASC, s.waktu_mulai ASC';

  const jadwal = db.prepare(sql).all(...params);

  return res.json({ success: true, count: jadwal.length, data: jadwal });
});

/**
 * GET /api/jadwal/ruang
 * Mengambil daftar ruang operasi unik untuk dropdown filter.
 */
router.get('/ruang', (req, res) => {
  const ruang = db.prepare(`
    SELECT DISTINCT ruang_operasi
    FROM schedules
    ORDER BY ruang_operasi ASC
  `).all();

  return res.json({
    success: true,
    data: ruang.map(r => r.ruang_operasi)
  });
});

module.exports = router;
