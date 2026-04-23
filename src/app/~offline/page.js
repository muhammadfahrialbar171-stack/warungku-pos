'use client';
import { WifiOff, RotateCcw } from 'lucide-react';
import Link from 'next/link';

export default function OfflinePage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center bg-[var(--surface-0)] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-rose-500/5 to-purple-500/5 z-0" />
            
            <div className="z-10 animate-scale-in">
                <div className="w-24 h-24 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-500">
                    <WifiOff size={48} strokeWidth={1.5} />
                </div>
                
                <h1 className="text-3xl font-black text-[var(--text-primary)] mb-3 tracking-tight">Koneksi Terputus</h1>
                <p className="text-[var(--text-secondary)] mb-8 max-w-sm mx-auto">
                    Sepertinya Anda sedang offline atau koneksi internet terputus. PWA memerlukan koneksi internet untuk memuat halaman baru ini.
                </p>
                
                <div className="flex gap-4 justify-center">
                    <button 
                        onClick={() => window.location.reload()}
                        className="px-6 py-3 rounded-xl font-bold bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-600 transition flex items-center gap-2"
                    >
                        <RotateCcw size={18} />
                        Coba Lagi
                    </button>
                    <Link 
                        href="/dashboard"
                        className="px-6 py-3 rounded-xl font-bold bg-[var(--surface-2)] text-[var(--text-primary)] hover:bg-[var(--surface-3)] transition border border-[var(--surface-border)]"
                    >
                        Ke Dashboard
                    </Link>
                </div>
            </div>
        </div>
    );
}
