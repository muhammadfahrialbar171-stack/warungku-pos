import "./globals.css";

export const metadata = {
  title: "WarungKu POS - Aplikasi Kasir & Manajemen Toko",
  description: "Aplikasi kasir dan manajemen toko modern untuk UMKM Indonesia. Kelola penjualan, produk, stok, dan laporan dengan mudah.",
  keywords: "POS, kasir, warung, toko, UMKM, manajemen toko, point of sale",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
