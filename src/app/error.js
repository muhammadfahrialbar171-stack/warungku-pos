'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function Error({ error, reset }) {
    useEffect(() => {
        console.error('Application error:', error);
    }, [error]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-6">
            <div className="text-center max-w-md animate-fade-in">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-red-500/15 flex items-center justify-center mb-6">
                    <AlertTriangle size={40} className="text-red-400" />
                </div>

                <h2 className="text-2xl font-bold text-white mb-2">
                    Oops! Terjadi Kesalahan
                </h2>

                <p className="text-slate-400 text-sm mb-8">
                    Maaf, terjadi kesalahan yang tidak terduga. Silakan coba lagi atau kembali ke halaman utama.
                </p>

                <div className="flex gap-3 justify-center">
                    <button
                        onClick={() => window.location.href = '/dashboard'}
                        className="px-5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-700 transition-all flex items-center gap-2 cursor-pointer"
                    >
                        <Home size={16} />
                        Beranda
                    </button>
                    <button
                        onClick={() => reset()}
                        className="px-5 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-500/25"
                    >
                        <RefreshCw size={16} />
                        Coba Lagi
                    </button>
                </div>
            </div>
        </div>
    );
}
