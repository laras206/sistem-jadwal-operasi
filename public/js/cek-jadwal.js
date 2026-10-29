// =============================================================
// FILE: public/js/cek-jadwal.js
// FUNGSI: JavaScript untuk halaman Cek Jadwal Saya (cek-jadwal.html).
//         - Mengirim kode akses ke backend
//         - Menampilkan jadwal operasi pasien
//         - Menampilkan pesan error jika kode salah
// LOKASI: public/js/cek-jadwal.js
// =============================================================

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('formCekJadwal');
  const kodeAkses = document.getElementById('kodeAkses');
  const btnCek = document.getElementById('btnCek');
  const hasilSection = document.getElementById('hasilSection');
  const hasilAlert = document.getElementById('hasilAlert');
  const hasilContent = document.getElementById('hasilContent');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const kode = kodeAkses.value.trim();

    if (!kode) {
      hasilSection.style.display = 'block';
      hasilAlert.innerHTML = '<div class="alert alert-danger">Kode akses wajib diisi.</div>';
      hasilContent.innerHTML = '';
      return;
    }

    // Tampilkan loading
    btnCek.disabled = true;
    btnCek.innerHTML = '<span class="icon">&#8987;</span> Memeriksa...';
    hasilSection.style.display = 'block';
    hasilAlert.innerHTML = '<div class="alert alert-info">Sedang memeriksa kode akses...</div>';
    hasilContent.innerHTML = '';

    // Panggil API
    const res = await api('/pasien/cek-jadwal', {
      method: 'POST',
      body: { kode_akses: kode }
    });

    btnCek.disabled = false;
    btnCek.innerHTML = '<span class="icon">&#128269;</span> Periksa Jadwal';

    if (!res.success) {
      hasilAlert.innerHTML = `<div class="alert alert-danger"><strong>&#10060;</strong> ${escapeHtml(res.message)}</div>`;
      hasilContent.innerHTML = '';
      return;
    }

    // Sukses - tampilkan data pasien dan jadwal
    hasilAlert.innerHTML = '<div class="alert alert-success"><strong>&#9989;</strong> Jadwal operasi Anda berhasil ditemukan.</div>';

    const p = res.pasien;
    const jadwalList = res.jadwal || [];

    let html = `
      <div class="hasil-card">
        <div class="hasil-card-header">
          <span class="icon">&#128100;</span>
          <div>
            <h3>${escapeHtml(p.nama_lengkap)}</h3>
            <p>No. Rekam Medis: ${escapeHtml(p.nomor_rekam_medis_masked)} &middot; Diagnosis: ${escapeHtml(p.diagnosis || '-')}</p>
          </div>
        </div>
        <div class="hasil-pasien-info">
          <div class="hasil-pasien-info-item">
            <label>Nama Lengkap</label>
            <strong>${escapeHtml(p.nama_lengkap)}</strong>
          </div>
          <div class="hasil-pasien-info-item">
            <label>No. Rekam Medis</label>
            <strong>${escapeHtml(p.nomor_rekam_medis_masked)}</strong>
          </div>
          <div class="hasil-pasien-info-item">
            <label>Diagnosis</label>
            <strong>${escapeHtml(p.diagnosis || '-')}</strong>
          </div>
          <div class="hasil-pasien-info-item">
            <label>Total Jadwal</label>
            <strong>${jadwalList.length} jadwal</strong>
          </div>
        </div>
    `;

    if (jadwalList.length === 0) {
      html += '<p class="text-center text-muted">Belum ada jadwal operasi untuk Anda.</p>';
    } else {
      html += `
        <h4 style="margin-bottom: 1rem; color: var(--color-primary);">Daftar Jadwal Operasi Anda</h4>
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Waktu</th>
                <th>Ruang</th>
                <th>Jenis Operasi</th>
                <th>Dokter</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${jadwalList.map(j => `
                <tr>
                  <td>${escapeHtml(formatTanggal(j.tanggal_operasi))}</td>
                  <td>${escapeHtml(formatWaktu(j.waktu_mulai))} - ${escapeHtml(formatWaktu(j.waktu_selesai))}</td>
                  <td>${escapeHtml(j.ruang_operasi)}</td>
                  <td>${escapeHtml(j.jenis_operasi)}</td>
                  <td>${escapeHtml(j.dokter_bedah)}</td>
                  <td>${badgeStatus(j.status)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

      // Tampilkan catatan jika ada
      const denganCatatan = jadwalList.filter(j => j.catatan && j.catatan.trim());
      if (denganCatatan.length > 0) {
        html += `
          <h4 style="margin-top: 1.5rem; margin-bottom: 0.5rem; color: var(--color-primary);">Catatan Administratif</h4>
          <ul class="info-list" style="margin-top: 0.5rem;">
            ${denganCatatan.map(j => `
              <li><strong>${escapeHtml(formatTanggal(j.tanggal_operasi))}:</strong> ${escapeHtml(j.catatan)}</li>
            `).join('')}
          </ul>
        `;
      }
    }

    html += '</div>';
    hasilContent.innerHTML = html;
  });

  // Reset hasil saat tombol reset diklik
  document.getElementById('btnReset').addEventListener('click', () => {
    hasilSection.style.display = 'none';
    hasilAlert.innerHTML = '';
    hasilContent.innerHTML = '';
  });
});
