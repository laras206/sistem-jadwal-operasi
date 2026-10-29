// =============================================================
// FILE: middleware/auth.js
// FUNGSI: Middleware untuk memeriksa apakah admin sudah login.
//         Halaman admin (dashboard, CRUD jadwal) wajib melalui middleware ini.
// LOKASI: middleware/auth.js
// =============================================================

/**
 * Middleware: cek apakah admin sudah login.
 * Jika belum, kirim respons 401 Unauthorized.
 */
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  // Jika request mengharapkan JSON (API call), kirim 401
  if (req.headers.accept && req.headers.accept.includes('application/json')) {
    return res.status(401).json({ success: false, message: 'Anda harus login sebagai admin.' });
  }
  // Jika request dari browser, arahkan ke halaman login
  return res.redirect('/admin-login.html');
}

module.exports = { requireAdmin };
