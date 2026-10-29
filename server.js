// =============================================================
// FILE: server.js
// FUNGSI: File utama yang menjalankan server Express.
//         Server ini:
//         1. Melayani file statis (HTML, CSS, JS) dari folder public/
//         2. Menyediakan API backend (login, jadwal publik, pasien, admin)
//         3. Mengaktifkan session untuk autentikasi admin
//         4. Menginisialisasi database saat pertama kali dijalankan
// LOKASI: server.js (di root proyek)
// =============================================================

const express = require('express');
const session = require('express-session');
const path = require('path');
const os = require('os');
const { initDatabase } = require('./db/database');

// Import route API
const authRoutes = require('./routes/auth');
const jadwalRoutes = require('./routes/jadwal');
const pasienRoutes = require('./routes/pasien');
const adminRoutes = require('./routes/admin');

// Inisialisasi aplikasi Express
const app = express();
const PORT = process.env.PORT || 3000;

// =====================================================
// KONFIGURASI MIDDLEWARE
// =====================================================

// 1. Parse body JSON (untuk req.body dari fetch POST/PUT)
app.use(express.json());

// 2. Parse body URL-encoded (untuk form HTML tradisional)
app.use(express.urlencoded({ extended: true }));

// 3. Konfigurasi session
//    Session digunakan untuk menyimpan status login admin di server.
//    Cookie dikirim ke browser untuk mengidentifikasi sesi.
app.use(session({
  secret: 'rs-sehat-sentosa-prototype-secret-key-2024', // Kunci rahasia untuk menandatangani cookie
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,     // Cookie tidak bisa diakses via JavaScript (anti XSS)
    maxAge: 1000 * 60 * 60 * 8  // Berlaku 8 jam
  }
}));

// 4. Layani file statis dari folder public/
//    Semua file di folder public/ bisa diakses langsung via browser.
//    Contoh: public/css/style.css -> http://localhost:3000/css/style.css
app.use(express.static(path.join(__dirname, 'public')));

// =====================================================
// ROUTE API
// =====================================================

app.use('/api/auth', authRoutes);
app.use('/api/jadwal', jadwalRoutes);
app.use('/api/pasien', pasienRoutes);
app.use('/api/admin', adminRoutes);

// =====================================================
// ROUTE UTAMA
// =====================================================

// Halaman utama -> tampilkan index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check (untuk pengecekan server aktif)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server berjalan dengan baik.' });
});

// 404 handler untuk API yang tidak ditemukan
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint API tidak ditemukan.' });
});

// =====================================================
// JALANKAN SERVER
// =====================================================

// Inisialisasi database sebelum server mulai
initDatabase();

app.listen(PORT, '0.0.0.0', () => {
  console.log('==========================================================');
  console.log('  SISTEM INFORMASI JADWAL OPERASI PASIEN');
  console.log('  RS Sehat Sentosa - Prototipe Akademik');
  console.log('==========================================================');
  console.log(`\n  Server berjalan di port: ${PORT}`);
  console.log(`\n  Akses dari laptop (browser):`);
  console.log(`    -> http://localhost:${PORT}`);
  console.log(`\n  Akses dari HP (jika HP dan laptop 1 WiFi):`);

  // Tampilkan IP lokal agar mudah diakses dari HP
  const interfaces = os.networkInterfaces();
  Object.values(interfaces).forEach(iface => {
    iface.forEach(addr => {
      if (addr.family === 'IPv4' && !addr.internal) {
        console.log(`    -> http://${addr.address}:${PORT}`);
      }
    });
  });

  console.log('\n  Tekan Ctrl + C untuk menghentikan server.');
  console.log('==========================================================\n');
});
