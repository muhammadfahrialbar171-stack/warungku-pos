# Smart AI Product Classifier 🚀

Alat bantu cerdas untuk mengklasifikasikan nama produk ke dalam kategori yang dinamis menggunakan model **Zero-Shot Learning** (Deep Learning).

## Fitur Utama
- **Zero-Shot Classification**: Tidak perlu training ulang model. Masukkan kategori apa pun, AI akan memahaminya.
- **Premium UI**: Desain Glassmorphism, animasi mulus, dan responsif.
- **Dynamic Labels**: Tambah/hapus kategori target secara realtime melalui UI.
- **Backend Cepat**: Menggunakan FastAPI dan model DeBERTa terbaru.

## Cara Menjalankan (Local)

### 1. Persiapan Environment
Pastikan Anda memiliki Python 3.8+ terinstal.
Buka terminal di folder `ai-classifier` dan jalankan:
```bash
pip install -r requirements.txt
```

### 2. Jalankan Server
Jalankan file backend:
```bash
python main.py
```

### 3. Akses Aplikasi
Buka browser dan kunjungi:
`http://localhost:8000`

> **Catatan Pertama Kali**: Saat pertama kali dijalankan, sistem akan mendownload model AI (~500MB). Proses ini hanya terjadi sekali.

## Struktur Project
- `main.py`: Backend API (FastAPI + Hugging Face)
- `static/`: Frontend Assets
  - `index.html`: UI Utama
  - `style.css`: Styling Premium
  - `script.js`: Logika UI Dynamic
- `requirements.txt`: Daftar dependency Python
