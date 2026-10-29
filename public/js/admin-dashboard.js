// =============================================================
// FILE: public/js/admin-dashboard.js
// FUNGSI: JavaScript untuk Dashboard Admin (admin-dashboard.html).
//         Mengatur seluruh fitur admin:
//         - Navigasi sidebar antar section
//         - Statistik dashboard
//         - CRUD jadwal (tambah, edit, hapus, ubah status)
//         - Generate & download QR Code
//         - Laporan (filter, cetak, CSV)
//         - Pengaturan URL website
//         - Logout
// LOKASI: public/js/admin-dashboard.js
// =============================================================

document.addEventListener('DOMContentLoaded', async () => {
  // ====== CEK LOGIN ======
  const checkRes = await api('/auth/check');
  if (!checkRes.isLoggedIn) {
    window.location.href = '/admin-login.html';
    return;
  }

  // Tampilkan info admin
  document.getElementById('adminName').textContent = checkRes.admin.nama;
  document.getElementById('adminUsername').textContent = '@' + checkRes.admin.username;

  // Tampilkan tanggal hari ini di topbar
  const today = new Date();
  document.getElementById('todayDate').textContent = today.toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  // ============================================================
  // NAVIGASI SIDEBAR
  // ============================================================
  const sidebarLinks = document.querySelectorAll('.sidebar-link');
  const sections = document.querySelectorAll('.admin-section');
  const pageTitle = document.getElementById('pageTitle');
  const pageTitles = {
    dashboard: 'Dashboard',
    kelola: 'Kelola Jadwal',
    tambah: 'Tambah Jadwal',
    qr: 'QR Code',
    laporan: 'Laporan',
    pengaturan: 'Pengaturan'
  };

  function showSection(name) {
    sections.forEach(s => s.classList.remove('active'));
    const target = document.getElementById('section-' + name);
    if (target) target.classList.add('active');

    sidebarLinks.forEach(l => l.classList.remove('active'));
    const link = document.querySelector(`.sidebar-link[data-section="${name}"]`);
    if (link) link.classList.add('active');

    pageTitle.textContent = pageTitles[name] || 'Dashboard';

    // Muat data sesuai section
    if (name === 'dashboard') loadDashboard();
    if (name === 'kelola') loadAdminJadwal();
    if (name === 'qr') loadQrInfo();
    if (name === 'laporan') { /* jangan auto-load, tunggu klik */ }
    if (name === 'pengaturan') loadSettings();

    // Tutup sidebar di mobile
    document.getElementById('sidebar').classList.remove('show');
  }

  sidebarLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      showSection(link.dataset.section);
    });
  });

  // Tombol-tombol dengan data-section-link
  document.querySelectorAll('[data-section-link]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      showSection(btn.dataset.sectionLink);
    });
  });

  // Toggle sidebar di mobile
  document.getElementById('sidebarToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('show');
  });

  // ============================================================
  // LOGOUT
  // ============================================================
  document.getElementById('btnLogout').addEventListener('click', async () => {
    if (!confirm('Apakah Anda yakin ingin logout?')) return;
    await api('/auth/logout', { method: 'POST' });
    window.location.href = '/admin-login.html';
  });

  // ============================================================
  // SECTION: DASHBOARD (statistik)
  // ============================================================
  async function loadDashboard() {
    // Statistik
    const statsRes = await api('/admin/stats');
    if (statsRes.success) {
      document.getElementById('statTotal').textContent = statsRes.data.total_jadwal;
      document.getElementById('statHariIni').textContent = statsRes.data.jadwal_hari_ini;
      document.getElementById('statMendatang').textContent = statsRes.data.jadwal_mendatang;
      document.getElementById('statDitunda').textContent = statsRes.data.jadwal_ditunda;
    }

    // Jadwal hari ini
    const todayStr = new Date().toISOString().split('T')[0];
    const todayRes = await api('/admin/jadwal?tanggal=' + todayStr);
    const tbody = document.getElementById('todayTableBody');

    if (!todayRes.success || todayRes.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Tidak ada operasi hari ini.</td></tr>';
      return;
    }

    tbody.innerHTML = todayRes.data.map(j => `
      <tr>
        <td>${escapeHtml(formatWaktu(j.waktu_mulai))} - ${escapeHtml(formatWaktu(j.waktu_selesai))}</td>
        <td>${escapeHtml(j.ruang_operasi)}</td>
        <td>${escapeHtml(j.jenis_operasi)}</td>
        <td>${escapeHtml(j.nama_lengkap)}</td>
        <td>${escapeHtml(j.dokter_bedah)}</td>
        <td>${badgeStatus(j.status)}</td>
      </tr>
    `).join('');
  }

  // ============================================================
  // SECTION: KELOLA JADWAL
  // ============================================================
  const adminFilterTanggal = document.getElementById('adminFilterTanggal');
  const adminFilterStatus = document.getElementById('adminFilterStatus');
  const adminFilterSearch = document.getElementById('adminFilterSearch');
  const adminBtnFilter = document.getElementById('adminBtnFilter');
  const adminBtnReset = document.getElementById('adminBtnReset');
  const adminJadwalBody = document.getElementById('adminJadwalBody');
  const adminResultCount = document.getElementById('adminResultCount');

  async function loadAdminJadwal() {
    const params = new URLSearchParams();
    if (adminFilterTanggal.value) params.set('tanggal', adminFilterTanggal.value);
    if (adminFilterStatus.value && adminFilterStatus.value !== 'semua') params.set('status', adminFilterStatus.value);
    if (adminFilterSearch.value.trim()) params.set('q', adminFilterSearch.value.trim());

    adminJadwalBody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">Memuat data...</td></tr>';

    const res = await api('/admin/jadwal?' + params.toString());

    if (!res.success) {
      adminJadwalBody.innerHTML = `<tr><td colspan="9" class="text-center text-danger">${escapeHtml(res.message || 'Gagal memuat data.')}</td></tr>`;
      return;
    }

    adminResultCount.textContent = res.count;

    if (res.data.length === 0) {
      adminJadwalBody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">Tidak ada jadwal yang sesuai filter.</td></tr>';
      return;
    }

    adminJadwalBody.innerHTML = res.data.map(j => `
      <tr>
        <td>${j.id}</td>
        <td>${escapeHtml(formatTanggalPendek(j.tanggal_operasi))}</td>
        <td>${escapeHtml(formatWaktu(j.waktu_mulai))} - ${escapeHtml(formatWaktu(j.waktu_selesai))}</td>
        <td>${escapeHtml(j.ruang_operasi)}</td>
        <td>${escapeHtml(j.jenis_operasi)}</td>
        <td>${escapeHtml(j.nama_lengkap)}<br><small class="text-muted">${escapeHtml(j.kode_akses)}</small></td>
        <td>${escapeHtml(j.dokter_bedah)}</td>
        <td>
          <select class="form-input form-input-sm status-select" data-id="${j.id}" style="font-size: 0.8rem; padding: 0.25rem 0.5rem;">
            <option value="Terjadwal" ${j.status === 'Terjadwal' ? 'selected' : ''}>Terjadwal</option>
            <option value="Ditunda" ${j.status === 'Ditunda' ? 'selected' : ''}>Ditunda</option>
            <option value="Selesai" ${j.status === 'Selesai' ? 'selected' : ''}>Selesai</option>
            <option value="Dibatalkan" ${j.status === 'Dibatalkan' ? 'selected' : ''}>Dibatalkan</option>
          </select>
        </td>
        <td style="white-space: nowrap;">
          <button class="btn btn-sm btn-secondary btn-edit" data-id="${j.id}" title="Edit">&#9998;</button>
          <button class="btn btn-sm btn-danger btn-hapus" data-id="${j.id}" title="Hapus">&#128465;</button>
        </td>
      </tr>
    `).join('');

    // Event listener untuk tombol edit & hapus
    document.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => editJadwal(btn.dataset.id));
    });
    document.querySelectorAll('.btn-hapus').forEach(btn => {
      btn.addEventListener('click', () => confirmHapus(btn.dataset.id));
    });

    // Event listener untuk select status (ubah status cepat)
    document.querySelectorAll('.status-select').forEach(sel => {
      sel.addEventListener('change', () => ubahStatus(sel.dataset.id, sel.value));
    });
  }

  adminBtnFilter.addEventListener('click', loadAdminJadwal);
  adminBtnReset.addEventListener('click', () => {
    adminFilterTanggal.value = '';
    adminFilterStatus.value = 'semua';
    adminFilterSearch.value = '';
    loadAdminJadwal();
  });

  // Debounced search
  let searchTimeout;
  adminFilterSearch.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(loadAdminJadwal, 350);
  });

  // ============================================================
  // SECTION: TAMBAH / EDIT JADWAL
  // ============================================================
  const formJadwal = document.getElementById('formJadwal');
  const formTitle = document.getElementById('formTitle');
  const jadwalId = document.getElementById('jadwalId');
  const fKodeAkses = document.getElementById('kodeAkses');
  const fTanggal = document.getElementById('tanggalOperasi');
  const fWaktuMulai = document.getElementById('waktuMulai');
  const fWaktuSelesai = document.getElementById('waktuSelesai');
  const fRuang = document.getElementById('ruangOperasi');
  const fStatus = document.getElementById('status');
  const fJenis = document.getElementById('jenisOperasi');
  const fDokter = document.getElementById('dokterBedah');
  const fCatatan = document.getElementById('catatan');
  const btnSimpan = document.getElementById('btnSimpan');
  const btnBatal = document.getElementById('btnBatal');

  // Muat daftar kode akses untuk datalist
  async function loadKodeAksesList() {
    const res = await api('/admin/jadwal?limit=999');
    if (!res.success) return;
    const list = document.getElementById('kodeAksesList');
    const seen = new Set();
    res.data.forEach(j => {
      if (!seen.has(j.kode_akses)) {
        seen.add(j.kode_akses);
        const opt = document.createElement('option');
        opt.value = j.kode_akses;
        list.appendChild(opt);
      }
    });
  }
  loadKodeAksesList();

  function resetForm() {
    formJadwal.reset();
    jadwalId.value = '';
    formTitle.textContent = 'Tambah Jadwal Operasi Baru';
    btnSimpan.innerHTML = '<span class="icon">&#128190;</span> Simpan Jadwal';
  }

  btnBatal.addEventListener('click', () => {
    resetForm();
    showSection('kelola');
  });

  formJadwal.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      kode_akses: fKodeAkses.value.trim(),
      tanggal_operasi: fTanggal.value,
      waktu_mulai: fWaktuMulai.value,
      waktu_selesai: fWaktuSelesai.value,
      ruang_operasi: fRuang.value,
      jenis_operasi: fJenis.value.trim(),
      dokter_bedah: fDokter.value.trim(),
      status: fStatus.value,
      catatan: fCatatan.value.trim()
    };

    // Validasi sederhana di frontend
    if (!payload.kode_akses || !payload.tanggal_operasi || !payload.waktu_mulai ||
        !payload.waktu_selesai || !payload.ruang_operasi || !payload.jenis_operasi ||
        !payload.dokter_bedah) {
      showAlert('globalAlert', 'danger', 'Semua field bertanda * wajib diisi.');
      return;
    }

    if (payload.waktu_selesai <= payload.waktu_mulai) {
      showAlert('globalAlert', 'danger', 'Waktu selesai harus lebih besar dari waktu mulai.');
      return;
    }

    btnSimpan.disabled = true;
    btnSimpan.innerHTML = '<span class="icon">&#8987;</span> Menyimpan...';

    const isEdit = jadwalId.value !== '';
    const endpoint = isEdit ? `/admin/jadwal/${jadwalId.value}` : '/admin/jadwal';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await api(endpoint, { method, body: payload });

    btnSimpan.disabled = false;
    btnSimpan.innerHTML = '<span class="icon">&#128190;</span> Simpan Jadwal';

    if (!res.success) {
      showAlert('globalAlert', 'danger', `<strong>&#10060;</strong> ${escapeHtml(res.message)}`);
      return;
    }

    showAlert('globalAlert', 'success', `<strong>&#9989;</strong> ${escapeHtml(res.message)}`, 4000);
    resetForm();
    showSection('kelola');
  });

  // Edit jadwal
  async function editJadwal(id) {
    const res = await api(`/admin/jadwal/${id}`);
    if (!res.success) {
      showAlert('globalAlert', 'danger', res.message);
      return;
    }

    const j = res.data;
    jadwalId.value = j.id;
    fKodeAkses.value = j.kode_akses;
    fTanggal.value = j.tanggal_operasi;
    fWaktuMulai.value = j.waktu_mulai;
    fWaktuSelesai.value = j.waktu_selesai;
    fRuang.value = j.ruang_operasi;
    fStatus.value = j.status;
    fJenis.value = j.jenis_operasi;
    fDokter.value = j.dokter_bedah;
    fCatatan.value = j.catatan || '';

    formTitle.textContent = `Edit Jadwal #${j.id}`;
    btnSimpan.innerHTML = '<span class="icon">&#128190;</span> Update Jadwal';
    showSection('tambah');

    // Scroll ke atas
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Ubah status cepat
  async function ubahStatus(id, status) {
    const res = await api(`/admin/jadwal/${id}/status`, {
      method: 'PATCH',
      body: { status }
    });
    if (res.success) {
      showAlert('globalAlert', 'success', `<strong>&#9989;</strong> ${escapeHtml(res.message)}`, 3000);
    } else {
      showAlert('globalAlert', 'danger', `<strong>&#10060;</strong> ${escapeHtml(res.message)}`, 4000);
      loadAdminJadwal();
    }
  }

  // ============================================================
  // HAPUS JADWAL
  // ============================================================
  const modalHapus = document.getElementById('modalHapus');
  const modalHapusDetail = document.getElementById('modalHapusDetail');
  const btnBatalHapus = document.getElementById('btnBatalHapus');
  const btnKonfirmasiHapus = document.getElementById('btnKonfirmasiHapus');
  let jadwalHapusId = null;

  async function confirmHapus(id) {
    const res = await api(`/admin/jadwal/${id}`);
    if (!res.success) {
      showAlert('globalAlert', 'danger', res.message);
      return;
    }
    const j = res.data;
    jadwalHapusId = id;
    modalHapusDetail.innerHTML = `
      <strong>ID:</strong> ${j.id}<br>
      <strong>Tanggal:</strong> ${escapeHtml(formatTanggal(j.tanggal_operasi))}<br>
      <strong>Waktu:</strong> ${escapeHtml(j.waktu_mulai)} - ${escapeHtml(j.waktu_selesai)}<br>
      <strong>Ruang:</strong> ${escapeHtml(j.ruang_operasi)}<br>
      <strong>Jenis Operasi:</strong> ${escapeHtml(j.jenis_operasi)}<br>
      <strong>Pasien:</strong> ${escapeHtml(j.nama_lengkap)}
    `;
    modalHapus.style.display = 'flex';
  }

  btnBatalHapus.addEventListener('click', () => {
    modalHapus.style.display = 'none';
    jadwalHapusId = null;
  });

  modalHapus.querySelector('.modal-overlay').addEventListener('click', () => {
    modalHapus.style.display = 'none';
    jadwalHapusId = null;
  });

  btnKonfirmasiHapus.addEventListener('click', async () => {
    if (!jadwalHapusId) return;
    btnKonfirmasiHapus.disabled = true;
    btnKonfirmasiHapus.innerHTML = '<span class="icon">&#8987;</span> Menghapus...';

    const res = await api(`/admin/jadwal/${jadwalHapusId}`, { method: 'DELETE' });

    btnKonfirmasiHapus.disabled = false;
    btnKonfirmasiHapus.innerHTML = 'Ya, Hapus';
    modalHapus.style.display = 'none';

    if (res.success) {
      showAlert('globalAlert', 'success', `<strong>&#9989;</strong> ${escapeHtml(res.message)}`, 3000);
      jadwalHapusId = null;
      loadAdminJadwal();
    } else {
      showAlert('globalAlert', 'danger', `<strong>&#10060;</strong> ${escapeHtml(res.message)}`);
    }
  });

  // ============================================================
  // SECTION: QR CODE
  // ============================================================
  const qrTarget = document.getElementById('qrTarget');
  const btnGenerateQr = document.getElementById('btnGenerateQr');
  const btnDownloadQr = document.getElementById('btnDownloadQr');
  const qrPreview = document.getElementById('qrPreview');
  const qrInfo = document.getElementById('qrInfo');
  let lastQrUrl = '';

  async function loadQrInfo() {
    const res = await api('/admin/settings');
    if (res.success) {
      qrInfo.innerHTML = `<strong>&#8505;</strong> URL website saat ini: <code>${escapeHtml(res.data.site_url || '-')}</code><br>Anda dapat mengubah URL di <a href="#pengaturan" data-section-link="pengaturan">Pengaturan</a>.`;
      qrInfo.style.display = 'block';

      // Update link di section-link setelah render ulang
      document.querySelectorAll('[data-section-link]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          showSection(btn.dataset.sectionLink);
        });
      });
    }
  }

  btnGenerateQr.addEventListener('click', async () => {
    btnGenerateQr.disabled = true;
    btnGenerateQr.innerHTML = '<span class="icon">&#8987;</span> Membuat...';

    const target = qrTarget.value;
    const res = await api(`/admin/qr-code?format=dataurl&target=${target}`);

    btnGenerateQr.disabled = false;
    btnGenerateQr.innerHTML = '<span class="icon">&#128247;</span> Generate QR Code';

    if (!res.success) {
      showAlert('globalAlert', 'danger', res.message);
      return;
    }

    lastQrUrl = res.url;
    qrPreview.innerHTML = `<img src="${res.dataUrl}" alt="QR Code" style="max-width: 280px;">`;
    btnDownloadQr.disabled = false;
    showAlert('globalAlert', 'success', `<strong>&#9989;</strong> QR Code berhasil dibuat. URL: <code>${escapeHtml(res.url)}</code>`, 4000);
  });

  btnDownloadQr.addEventListener('click', () => {
    if (!lastQrUrl) return;
    const target = qrTarget.value;
    // Trigger unduh PNG langsung dari backend
    window.location.href = `/api/admin/qr-code?format=png&target=${target}`;
  });

  // ============================================================
  // SECTION: LAPORAN
  // ============================================================
  const laporanDari = document.getElementById('laporanDari');
  const laporanSampai = document.getElementById('laporanSampai');
  const laporanStatus = document.getElementById('laporanStatus');
  const btnLoadLaporan = document.getElementById('btnLoadLaporan');
  const btnPrintLaporan = document.getElementById('btnPrintLaporan');
  const btnDownloadCsv = document.getElementById('btnDownloadCsv');
  const laporanBody = document.getElementById('laporanBody');
  const laporanCount = document.getElementById('laporanCount');

  btnLoadLaporan.addEventListener('click', async () => {
    const params = new URLSearchParams();
    if (laporanDari.value) params.set('dari', laporanDari.value);
    if (laporanSampai.value) params.set('sampai', laporanSampai.value);
    if (laporanStatus.value && laporanStatus.value !== 'semua') params.set('status', laporanStatus.value);

    laporanBody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Memuat data...</td></tr>';

    const res = await api('/admin/laporan?' + params.toString());

    if (!res.success) {
      laporanBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">${escapeHtml(res.message)}</td></tr>`;
      return;
    }

    laporanCount.textContent = res.count;

    if (res.data.length === 0) {
      laporanBody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Tidak ada data pada rentang ini.</td></tr>';
      return;
    }

    laporanBody.innerHTML = res.data.map(j => `
      <tr>
        <td>${escapeHtml(formatTanggalPendek(j.tanggal_operasi))}</td>
        <td>${escapeHtml(formatWaktu(j.waktu_mulai))} - ${escapeHtml(formatWaktu(j.waktu_selesai))}</td>
        <td>${escapeHtml(j.ruang_operasi)}</td>
        <td>${escapeHtml(j.jenis_operasi)}</td>
        <td>${escapeHtml(j.dokter_bedah)}</td>
        <td>${escapeHtml(j.nama_lengkap)}</td>
        <td>${badgeStatus(j.status)}</td>
      </tr>
    `).join('');
  });

  btnPrintLaporan.addEventListener('click', () => {
    window.print();
  });

  btnDownloadCsv.addEventListener('click', () => {
    const params = new URLSearchParams();
    if (laporanDari.value) params.set('dari', laporanDari.value);
    if (laporanSampai.value) params.set('sampai', laporanSampai.value);
    if (laporanStatus.value && laporanStatus.value !== 'semua') params.set('status', laporanStatus.value);
    window.location.href = '/api/admin/laporan/csv?' + params.toString();
  });

  // ============================================================
  // SECTION: PENGATURAN
  // ============================================================
  const formPengaturan = document.getElementById('formPengaturan');
  const siteUrl = document.getElementById('siteUrl');

  async function loadSettings() {
    const res = await api('/admin/settings');
    if (res.success && res.data.site_url) {
      siteUrl.value = res.data.site_url;
    }
  }

  formPengaturan.addEventListener('submit', async (e) => {
    e.preventDefault();
    const res = await api('/admin/settings', {
      method: 'PUT',
      body: { site_url: siteUrl.value.trim() }
    });
    if (res.success) {
      showAlert('globalAlert', 'success', `<strong>&#9989;</strong> ${escapeHtml(res.message)}`, 3000);
    } else {
      showAlert('globalAlert', 'danger', `<strong>&#10060;</strong> ${escapeHtml(res.message)}`);
    }
  });

  // ============================================================
  // INITIAL LOAD
  // ============================================================
  loadDashboard();
});
