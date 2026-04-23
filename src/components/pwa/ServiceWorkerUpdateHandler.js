'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';

export default function ServiceWorkerUpdateHandler() {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Periksa service worker yang sedang menunggu (waiting)
      navigator.serviceWorker.ready.then((registration) => {
        // Event listener jika ada service worker baru yang terdeteksi
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setWaitingWorker(newWorker);
              setShowUpdatePrompt(true);
            }
          });
        });

        // Cek jika sudah ada yang waiting saat pertama kali load
        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
          setShowUpdatePrompt(true);
        }
      });
    }
  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      try {
        // Kirim message tanpa expect response untuk avoid "listener indicated asynchronous response" error
        waitingWorker.controller?.postMessage?.({ type: 'SKIP_WAITING' });
        navigator.serviceWorker.controller?.postMessage?.({ type: 'SKIP_WAITING' });
      } catch (error) {
        console.error('Failed to send message to service worker:', error);
      }
      
      // Reload setelah service worker baru mengambil alih
      if (waitingWorker.controller) {
        waitingWorker.controller.addEventListener('statechange', (event) => {
          if (event.target.state === 'activated') {
            window.location.reload();
          }
        });
      }
      
      // Reload immediately - service worker update will happen in background
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  };

  if (!showUpdatePrompt) return null;

  return (
    <div className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-96 z-[9999] animate-slide-up">
      <div className="bg-white dark:bg-slate-900 border border-indigo-500/30 rounded-2xl shadow-2xl p-4 flex flex-col gap-3 backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center flex-shrink-0 text-indigo-500">
            <RefreshCw size={20} className="animate-spin-slow" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-slate-800 dark:text-white">Pembaruan Tersedia</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Versi baru aplikasi sudah siap. Muat ulang sekarang untuk mendapatkan fitur terbaru.
            </p>
          </div>
          <button 
            onClick={() => setShowUpdatePrompt(false)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleUpdate}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-500/25 active:scale-95 flex items-center justify-center gap-2"
          >
            <RefreshCw size={14} />
            Update Sekarang
          </button>
        </div>
      </div>
    </div>
  );
}
