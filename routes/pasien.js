// =============================================================
// FILE: routes/pasien.js
// FUNGSI: Menangani permintaan pasien untuk melihat jadwal operasinya sendiri.
//         Pasien harus memasukkan kode akses (bukan nomor rekam medis).
//         Pasien hanya bisa melihat jadwal miliknya sendiri.
// LOKASI: routes/pasien.js
// =============================================================

const express = require('express');
const { db } = require('../db/database');

const router = express.Router();

/**
 * POST /api/pasien/cek-jadwal
 * Body: { kode_akses }
 * Mengembalikan jadwal operasi milik pasien pemilik kode akses.
 *
 * CATATAN KEAMANAN:
 * - Kode akses bersifat rahasia, hanya diketahui pasien.
 * - Nomor rekam medis TIDAK digunakan sebagai pengaman tunggal.
 * - Tetap ditampilkan informasi sensitif terbatas (diagnosis) karena
 *   pasien berhak mengetahui jadwal operasinya sendiri.
 */
router.post('/cek-jadwal', (req, res) => {
  const { kode_akses } = req.body;

  // Validasi input
  if (!kode_akses || kode_akses.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'Kode akses wajib diisi.'
    });
  }

  const kodeTrim = kode_akses.trim();

  // Cari pasien berdasarkan kode akses
  const pasien = db.prepare(`
    SELECT id, kode_akses, nama_lengkap, nomor_rekam_medis, diagnosis
    FROM patients
    WHERE kode_akses = ?
  `).get(kodeTrim);

  if (!pasien) {
    // Pesan generik untuk mencegah enumeration attack
    return res.status(404).json({
      success: false,
      message: 'Kode akses tidak ditemukan. Periksa kembali kode akses Anda.'
    });
  }

  // Ambil semua jadwal operasi pasien ini
  const jadwal = db.prepare(`
    SELECT
      id,
      tanggal_operasi,
      waktu_mulai,
      waktu_selesai,
      ruang_operasi,
      jenis_operasi,
      dokter_bedah,
      status,
      catatan
    FROM schedules
    WHERE patient_id = ?
    ORDER BY tanggal_operasi DESC, waktu_mulai DESC
  `).all(pasien.id);

  // Sembunyikan sebagian nomor rekam medis untuk privasi tambahan
  const rmMasked = pasien.nomor_rekam_medis.length > 4
    ? pasien.nomor_rekam_medis.substring(0, 3) + '***' + pasien.nomor_rekam_medis.substring(pasien.nomor_rekam_medis.length - 2)
    : '***';

  return res.json({
    success: true,
    message: jadwal.length === 0
      ? 'Belum ada jadwal operasi untuk kode akses ini.'
      : 'Jadwal operasi ditemukan.',
    pasien: {
      nama_lengkap: pasien.nama_lengkap,
      nomor_rekam_medis_masked: rmMasked,
      diagnosis: pasien.diagnosis
    },
    jadwal: jadwal
  });
});

module.exports = router;
