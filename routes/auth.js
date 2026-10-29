// =============================================================
// FILE: routes/auth.js
// FUNGSI: Menangani login, logout, dan pemeriksaan sesi admin.
// LOKASI: routes/auth.js
// =============================================================

const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../db/database');

const router = express.Router();

/**
 * POST /api/auth/login
 * Body: { username, password }
 * Memeriksa kredensial admin dan membuat sesi login.
 */
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Validasi input
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Username dan password wajib diisi.'
    });
  }

  // Cari admin di database berdasarkan username
  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);

  if (!admin) {
    return res.status(401).json({
      success: false,
      message: 'Username atau password salah.'
    });
  }

  // Bandingkan password yang dimasukkan dengan hash di database
  // bcrypt.compareSync aman terhadap serangan timing attack
  const passwordCocok = bcrypt.compareSync(password, admin.password_hash);

  if (!passwordCocok) {
    return res.status(401).json({
      success: false,
      message: 'Username atau password salah.'
    });
  }

  // Simpan informasi admin di session
  req.session.isAdmin = true;
  req.session.adminId = admin.id;
  req.session.adminUsername = admin.username;
  req.session.adminNama = admin.nama_lengkap;

  return res.json({
    success: true,
    message: 'Login berhasil.',
    admin: {
      id: admin.id,
      username: admin.username,
      nama: admin.nama_lengkap
    }
  });
});

/**
 * POST /api/auth/logout
 * Menghapus sesi admin.
 */
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Gagal logout. Coba lagi.'
      });
    }
    res.clearCookie('connect.sid');
    return res.json({ success: true, message: 'Logout berhasil.' });
  });
});

/**
 * GET /api/auth/check
 * Memeriksa apakah admin sedang login.
 */
router.get('/check', (req, res) => {
  if (req.session && req.session.isAdmin) {
    return res.json({
      isLoggedIn: true,
      admin: {
        id: req.session.adminId,
        username: req.session.adminUsername,
        nama: req.session.adminNama
      }
    });
  }
  return res.json({ isLoggedIn: false });
});

module.exports = router;
