// =============================================================
// FILE: public/js/admin-login.js
// FUNGSI: JavaScript untuk halaman Login Admin (admin-login.html).
//         - Mengirim kredensial ke backend
//         - Jika berhasil, arahkan ke dashboard
//         - Mengecek apakah admin sudah login (auto-redirect)
// LOKASI: public/js/admin-login.js
// =============================================================

document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('formLogin');
  const btnLogin = document.getElementById('btnLogin');
  const loginAlert = document.getElementById('loginAlert');

  // Cek apakah admin sudah login
  const checkRes = await api('/auth/check');
  if (checkRes.isLoggedIn) {
    window.location.href = '/admin-dashboard.html';
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!username || !password) {
      loginAlert.innerHTML = '<div class="alert alert-danger">Username dan password wajib diisi.</div>';
      return;
    }

    // Loading state
    btnLogin.disabled = true;
    btnLogin.innerHTML = '<span class="icon">&#8987;</span> Memproses...';
    loginAlert.innerHTML = '<div class="alert alert-info">Sedang memproses login...</div>';

    // Panggil API login
    const res = await api('/auth/login', {
      method: 'POST',
      body: { username, password }
    });

    btnLogin.disabled = false;
    btnLogin.innerHTML = '<span class="icon">&#128272;</span> Masuk';

    if (!res.success) {
      loginAlert.innerHTML = `<div class="alert alert-danger"><strong>&#10060;</strong> ${escapeHtml(res.message || 'Login gagal.')}</div>`;
      return;
    }

    // Login berhasil - arahkan ke dashboard
    loginAlert.innerHTML = '<div class="alert alert-success"><strong>&#9989;</strong> Login berhasil! Mengarahkan ke dashboard...</div>';
    setTimeout(() => {
      window.location.href = '/admin-dashboard.html';
    }, 800);
  });
});
