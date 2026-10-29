// =============================================================
// FILE: public/js/common.js
// FUNGSI: Berisi fungsi-fungsi yang dipakai bersama oleh semua halaman.
//         - Fetch wrapper untuk memanggil API backend
//         - Format tanggal dan waktu
//         - Tampilkan alert
//         - Navigasi mobile
// LOKASI: public/js/common.js
// =============================================================

// Base URL untuk API (relatif terhadap domain website)
const API_BASE = '/api';

/**
 * Fungsi pembungkus fetch untuk memudahkan pemanggilan API.
 *
 * @param {string} endpoint - Path endpoint API, contoh: '/jadwal'
 * @param {object} options - Opsi fetch (method, body, headers, dll.)
 * @returns {Promise<object>} - Respons JSON dari server
 */
async function api(endpoint, options = {}) {
  const url = API_BASE + endpoint;
  const defaultHeaders = { 'Content-Type': 'application/json' };

  const config = {
    method: options.method || 'GET',
    headers: { ...defaultHeaders, ...(options.headers || {}) },
    credentials: 'same-origin',  // penting untuk mengirim cookie session
    ...options
  };

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    config.body = JSON.stringify(options.body);
  } else if (options.body) {
    config.body = options.body;
  }

  try {
    const response = await fetch(url, config);
    let data;
    try {
      data = await response.json();
    } catch (e) {
      data = { success: false, message: 'Respons server tidak valid.' };
    }

    if (!response.ok && !data.message) {
      data.message = `Terjadi kesalahan (HTTP ${response.status}).`;
    }

    return data;
  } catch (err) {
    console.error('API Error:', err);
    return {
      success: false,
      message: 'Tidak dapat terhubung ke server. Pastikan server berjalan.'
    };
  }
}

/**
 * Format tanggal "YYYY-MM-DD" menjadi "Senin, 1 Januari 2024"
 */
function formatTanggal(tanggalStr) {
  if (!tanggalStr) return '-';
  const hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const bulan = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const d = new Date(tanggalStr + 'T00:00:00');
  if (isNaN(d.getTime())) return tanggalStr;
  return `${hari[d.getDay()]}, ${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Format waktu "HH:MM:SS" menjadi "HH:MM"
 */
function formatWaktu(waktuStr) {
  if (!waktuStr) return '-';
  return waktuStr.substring(0, 5);
}

/**
 * Format tanggal pendek "YYYY-MM-DD" -> "1 Jan 2024"
 */
function formatTanggalPendek(tanggalStr) {
  if (!tanggalStr) return '-';
  const bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const d = new Date(tanggalStr + 'T00:00:00');
  if (isNaN(d.getTime())) return tanggalStr;
  return `${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Tampilkan alert di dalam elemen tertentu.
 *
 * @param {string} elementId - ID elemen tempat alert ditampilkan
 * @param {string} type - Tipe alert: 'success' | 'danger' | 'warning' | 'info'
 * @param {string} message - Pesan yang ditampilkan
 * @param {number} autoClose - Tutup otomatis setelah X ms (0 = tidak ditutup)
 */
function showAlert(elementId, type, message, autoClose = 0) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
  if (autoClose > 0) {
    setTimeout(() => { el.innerHTML = ''; }, autoClose);
  }
}

/**
 * Buat badge HTML berdasarkan status jadwal.
 */
function badgeStatus(status) {
  return `<span class="badge badge-${status}">${status}</span>`;
}

/**
 * Toggle menu navigasi mobile.
 */
function setupNavToggle() {
  const toggle = document.getElementById('navToggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      links.classList.toggle('show');
    });
  }
}

/**
 * Escape HTML untuk mencegah XSS.
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Inisialisasi saat halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
  setupNavToggle();
});
