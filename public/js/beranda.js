// =============================================================
// FILE: public/js/beranda.js
// FUNGSI: JavaScript untuk halaman beranda (index.html).
//         Mengambil statistik publik (total jadwal & jadwal hari ini)
//         dan menampilkannya di hero card.
// LOKASI: public/js/beranda.js
// =============================================================

document.addEventListener('DOMContentLoaded', async () => {
  // Ambil statistik dari endpoint publik jadwal
  // Kita hitung dari total jadwal dan jadwal hari ini
  const today = new Date().toISOString().split('T')[0];

  // Ambil semua jadwal
  const allRes = await api('/jadwal');
  const todayRes = await api('/jadwal?tanggal=' + today);

  const elTotal = document.getElementById('statTotalJadwal');
  const elHariIni = document.getElementById('statHariIni');

  if (allRes.success && elTotal) {
    elTotal.textContent = allRes.count;
  } else if (elTotal) {
    elTotal.textContent = '-';
  }

  if (todayRes.success && elHariIni) {
    elHariIni.textContent = todayRes.count;
  } else if (elHariIni) {
    elHariIni.textContent = '-';
  }
});
