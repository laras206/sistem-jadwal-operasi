// =============================================================
// FILE: public/js/jadwal.js
// FUNGSI: JavaScript untuk halaman Daftar Jadwal (jadwal.html).
//         - Memuat daftar jadwal dari API publik
//         - Mengisi dropdown ruang operasi
//         - Memfilter berdasarkan tanggal, ruang, dan pencarian
// LOKASI: public/js/jadwal.js
// =============================================================

document.addEventListener('DOMContentLoaded', async () => {
  const filterTanggal = document.getElementById('filterTanggal');
  const filterRuang = document.getElementById('filterRuang');
  const filterSearch = document.getElementById('filterSearch');
  const btnFilter = document.getElementById('btnFilter');
  const btnReset = document.getElementById('btnReset');
  const jadwalBody = document.getElementById('jadwalBody');
  const resultCount = document.getElementById('resultCount');

  // Muat daftar ruang operasi untuk dropdown
  async function loadRuang() {
    const res = await api('/jadwal/ruang');
    if (res.success) {
      res.data.forEach(ruang => {
        const opt = document.createElement('option');
        opt.value = ruang;
        opt.textContent = ruang;
        filterRuang.appendChild(opt);
      });
    }
  }

  // Muat dan tampilkan jadwal
  async function loadJadwal() {
    const params = new URLSearchParams();
    if (filterTanggal.value) params.set('tanggal', filterTanggal.value);
    if (filterRuang.value && filterRuang.value !== 'semua') params.set('ruang', filterRuang.value);
    if (filterSearch.value.trim()) params.set('q', filterSearch.value.trim());

    jadwalBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Memuat data...</td></tr>';

    const res = await api('/jadwal?' + params.toString());

    if (!res.success) {
      jadwalBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">${escapeHtml(res.message || 'Gagal memuat data.')}</td></tr>`;
      resultCount.textContent = 'Gagal memuat data.';
      return;
    }

    if (res.data.length === 0) {
      jadwalBody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Tidak ada jadwal yang sesuai dengan filter.</td></tr>';
      resultCount.textContent = 'Tidak ada jadwal ditemukan.';
      return;
    }

    resultCount.textContent = `Menampilkan ${res.data.length} jadwal operasi.`;

    jadwalBody.innerHTML = res.data.map(j => `
      <tr>
        <td>${escapeHtml(formatTanggalPendek(j.tanggal_operasi))}</td>
        <td>${escapeHtml(formatWaktu(j.waktu_mulai))} - ${escapeHtml(formatWaktu(j.waktu_selesai))}</td>
        <td>${escapeHtml(j.ruang_operasi)}</td>
        <td>${escapeHtml(j.jenis_operasi)}</td>
        <td>${escapeHtml(j.dokter_bedah)}</td>
        <td>${badgeStatus(j.status)}</td>
      </tr>
    `).join('');
  }

  // Event listeners
  btnFilter.addEventListener('click', loadJadwal);
  btnReset.addEventListener('click', () => {
    filterTanggal.value = '';
    filterRuang.value = 'semua';
    filterSearch.value = '';
    loadJadwal();
  });

  // Pencarian real-time (debounced)
  let searchTimeout;
  filterSearch.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(loadJadwal, 350);
  });

  // Enter di search langsung filter
  filterSearch.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') loadJadwal();
  });

  // Initial load
  await loadRuang();
  await loadJadwal();
});
