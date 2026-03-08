import "./globals.css";
import { Inter } from "next/font/google";
import { ToastProvider } from "@/components/ui/Toast";
import ErrorBoundary from "@/components/ErrorBoundary";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata = {
  title: "WarungKu POS - Aplikasi Kasir & Manajemen Toko",
  description: "Aplikasi kasir dan manajemen toko modern untuk UMKM Indonesia. Kelola penjualan, produk, stok, dan laporan dengan mudah.",
  keywords: "POS, kasir, warung, toko, UMKM, manajemen toko, point of sale",
  manifest: "/manifest.json",
  themeColor: "#6366f1",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "WarungKu",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={inter.variable}>
      <body className={`${inter.className} antialiased`}>
        <ToastProvider>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </ToastProvider>
      </body>
    </html>
  );
}
