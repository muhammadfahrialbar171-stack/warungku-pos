# 🚀 Panduan Peluncuran WarungKu POS

Selamat! Aplikasi WarungKu POS Anda sudah siap digunakan secara nyata. Gunakan panduan ini untuk memulai operasional toko Anda.

---

## 📱 1. Cara Instalasi di Android / iPhone
Aplikasi ini berbasis **PWA (Progressive Web App)**, artinya Anda bisa menginstalnya tanpa perlu lewat Play Store.

1.  Buka browser (Chrome di Android / Safari di iPhone).
2.  Akses alamat URL aplikasi Anda.
3.  Klik tombol **"Install Aplikasi"** yang muncul di layar (atau tekan menu titik tiga di Chrome > **Tambahkan ke Layar Utama**).
4.  Ikon WarungKu akan muncul di daftar aplikasi Anda seperti aplikasi biasa.

## 🖨️ 2. Cara Setting Printer Thermal
Sistem ini menggunakan printer thermal USB atau Bluetooth yang terbaca di sistem (Windows/Android).

1.  Pastikan printer sudah menyala dan terhubung.
2.  Lakukan transaksi percobaan di Kasir.
3.  Saat tombol **"Cetak Struk"** ditekan, jendela print akan muncul.
4.  **Penting**: Pada pengaturan Print (Destination), pilih nama printer thermal Anda.
5.  Di bagian **More Settings**, pastikan:
    -   **Margins**: None atau Minimum.
    -   **Headers and Footers**: Uncheck (Matikan) agar tidak muncul tulisan URL di kertas.
    -   **Scale**: Default (atau sesuaikan jika teks terlalu kecil/besar).

## 🕒 3. Alur Shift Kasir
Untuk menjaga keamanan uang laci, pastikan kasir mengikuti alur ini:

1.  **Buka Shift**: Kasir memasukkan jumlah Modal Awal (Cash in Drawer).
2.  **Operasional**: Semua transaksi tunai akan terekam otomatis ke dalam shift tersebut.
3.  **Tutup Shift**: Di akhir hari, kasir menghitung uang fisik dan memasukkannya ke sistem.
4.  **Laporan**: Owner bisa mengecek di menu **"Histori Shift"** jika ada selisih uang (Selisih Kas).

## 💾 4. Backup & Keamanan Data
Data Anda tersimpan aman di **Supabase**.

1.  Semua transaksi offline akan otomatis terkirim saat internet menyala.
2.  Pastikan untuk **TIDAK** menghapus Cache browser secara sembarangan jika masih ada transaksi yang belum tersinkron (cek tombol "Sync" di Kasir).
3.  Untuk backup manual, Anda bisa mengekspor data transaksi melalui menu **"Laporan"** ke format Excel/CSV.

---

**WarungKu POS** - *Partner Digital Toko Modern Anda.*
