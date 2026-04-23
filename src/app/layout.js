import { Inter } from "next/font/google";
import "./globals.css";
import AuthInitializer from "@/components/layout/AuthInitializer";
import ServiceWorkerUpdateHandler from "@/components/pwa/ServiceWorkerUpdateHandler";
import SplashScreen from "@/components/layout/SplashScreen";
import { ToastProvider } from "@/components/ui/Toast";
import ErrorBoundary from "@/components/ErrorBoundary";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata = {
  title: "WarungKu POS - Aplikasi Kasir & Manajemen Toko",
  description: "Solusi Point of Sale (POS) modern untuk UMKM Indonesia. Kelola stok, transaksi, dan laporan bisnis Anda dengan mudah.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.png",
    apple: "/icon-192x192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "WarungKu POS",
  },
  applicationName: "WarungKu POS",
};

export const viewport = {
  themeColor: "#0b0f19",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={inter.variable}>
      <head>
      </head>
      <body className={`${inter.className} antialiased`} data-version="v7.0-launch-ready">
        <ToastProvider>
          <ErrorBoundary>
            <AuthInitializer>
              <SplashScreen />
              <ServiceWorkerUpdateHandler />
              {children}
            </AuthInitializer>
          </ErrorBoundary>
        </ToastProvider>
      </body>
    </html>
  );
}
