// =============================================================
// FILE: public/js/scan.js
// FUNGSI: JavaScript untuk halaman Scan QR Code (scan.html).
//         - Mengaktifkan kamera untuk memindai QR Code
//         - Menggunakan library html5-qrcode (dimuat via CDN)
//         - Menampilkan QR Code demo yang mengarah ke halaman jadwal
// LOKASI: public/js/scan.js
// =============================================================

document.addEventListener('DOMContentLoaded', async () => {
  const btnStartScan = document.getElementById('btnStartScan');
  const btnStopScan = document.getElementById('btnStopScan');
  const readerDiv = document.getElementById('qr-reader');
  const statusDiv = document.getElementById('qr-reader-status');
  const resultDiv = document.getElementById('scanResult');
  const demoQrDiv = document.getElementById('demoQrCode');
  const demoQrUrl = document.getElementById('demoQrUrl');

  let html5QrCode = null;
  let isScanning = false;

  // ========== TAMPILKAN DEMO QR CODE ==========
  // QR Code demo dibuat di sisi klien menggunakan library qrcode (lewat endpoint API admin)
  // Untuk halaman publik, kita generate sendiri menggunakan library qrcode dari CDN.
  // Cara yang lebih sederhana: panggil endpoint admin? Bukan, karena butuh login.
  // Kita gunakan pendekatan lain: generate QR di server via endpoint publik.

  // Karena backend belum menyediakan endpoint publik untuk QR, kita akan
  // menggunakan library jsdelivr untuk generate QR di frontend.
  // Library: qrcode.js (via CDN)

  // Load library qrcode dari CDN
  function loadQrLibrary() {
    return new Promise((resolve, reject) => {
      if (window.QRCode) { resolve(); return; }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  try {
    await loadQrLibrary();
    // Generate QR Code demo yang mengarah ke halaman jadwal
    const demoUrl = window.location.origin + '/jadwal.html';
    demoQrUrl.textContent = demoUrl;

    // Hapus isi lama
    demoQrDiv.innerHTML = '';
    new QRCode(demoQrDiv, {
      text: demoUrl,
      width: 220,
      height: 220,
      colorDark: '#0d3b66',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H
    });
  } catch (err) {
    console.error('Gagal memuat library QR:', err);
    demoQrDiv.innerHTML = '<p class="text-muted">Gagal memuat QR Code demo.</p>';
  }

  // ========== SCANNER KAMERA ==========
  // Cek apakah library html5-qrcode tersedia
  if (typeof Html5Qrcode === 'undefined') {
    statusDiv.innerHTML = '<span class="text-danger">Library pemindai QR Code tidak tersedia. Pastikan Anda terhubung ke internet.</span>';
    btnStartScan.disabled = true;
    return;
  }

  btnStartScan.addEventListener('click', async () => {
    if (isScanning) return;

    try {
      html5QrCode = new Html5Qrcode('qr-reader');

      // Konfigurasi scanner
      const config = {
        fps: 10,
        qrbox: { width: 220, height: 220 },
        aspectRatio: 1.0
      };

      // Mulai kamera
      await html5QrCode.start(
        { facingMode: 'environment' },  // kamera belakang (HP)
        config,
        (decodedText) => {
          // QR Code berhasil dipindai
          handleScanResult(decodedText);
        },
        (errorMessage) => {
          // Diabaikan: ini dipanggil terus-menerus saat tidak ada QR terdeteksi
        }
      );

      isScanning = true;
      btnStartScan.disabled = true;
      btnStopScan.disabled = false;
      statusDiv.innerHTML = '<span class="text-success">&#9989; Kamera aktif. Arahkan ke QR Code.</span>';
      resultDiv.style.display = 'none';

    } catch (err) {
      console.error('Gagal memulai kamera:', err);
      statusDiv.innerHTML = `<span class="text-danger">&#10060; Gagal mengakses kamera: ${escapeHtml(err.message || err)}<br>Pastikan browser diizinkan mengakses kamera, dan halaman diakses via HTTPS atau localhost.</span>`;
    }
  });

  btnStopScan.addEventListener('click', async () => {
    if (!isScanning || !html5QrCode) return;

    try {
      await html5QrCode.stop();
      await html5QrCode.clear();
      isScanning = false;
      btnStartScan.disabled = false;
      btnStopScan.disabled = true;
      statusDiv.innerHTML = 'Kamera dimatikan.';
    } catch (err) {
      console.error('Gagal menghentikan kamera:', err);
    }
  });

  // Handle hasil scan
  function handleScanResult(decodedText) {
    resultDiv.style.display = 'block';
    resultDiv.className = 'scan-result alert alert-success';

    // Cek apakah hasil scan adalah URL website ini
    let isUrl = false;
    try {
      const url = new URL(decodedText);
      isUrl = true;

      // Jika URL adalah halaman website ini, arahkan otomatis
      if (url.origin === window.location.origin) {
        resultDiv.innerHTML = `
          <strong>&#9989; QR Code terdeteksi!</strong><br>
          URL: <code>${escapeHtml(decodedText)}</code><br>
          <p>Mengarahkan otomatis dalam 2 detik...</p>
        `;
        // Stop kamera
        if (html5QrCode && isScanning) {
          html5QrCode.stop().then(() => {
            html5QrCode.clear();
            isScanning = false;
          }).catch(() => {});
        }
        // Redirect
        setTimeout(() => {
          window.location.href = decodedText;
        }, 2000);
      } else {
        // URL eksternal, tampilkan tombol manual
        resultDiv.innerHTML = `
          <strong>&#9989; QR Code terdeteksi!</strong><br>
          URL: <code>${escapeHtml(decodedText)}</code><br>
          <a href="${escapeHtml(decodedText)}" target="_blank" class="btn btn-sm btn-primary" style="margin-top: 0.5rem;">
            Buka URL
          </a>
        `;
      }
    } catch (e) {
      // Bukan URL, tampilkan sebagai teks
      resultDiv.innerHTML = `
        <strong>&#9989; QR Code terdeteksi!</strong><br>
        Isi: <code>${escapeHtml(decodedText)}</code>
      `;
    }
  }
});
