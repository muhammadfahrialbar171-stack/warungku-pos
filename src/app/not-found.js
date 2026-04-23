import { FileQuestion, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-6">
            <div className="text-center max-w-md animate-fade-in">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-blue-500/15 flex items-center justify-center mb-6">
                    <FileQuestion size={40} className="text-blue-400" />
                </div>

                <h1 className="text-6xl font-extrabold text-white mb-2">404</h1>

                <h2 className="text-xl font-semibold text-white mb-2">
                    Halaman Tidak Ditemukan
                </h2>

                <p className="text-slate-400 text-sm mb-8">
                    Halaman yang Anda cari tidak tersedia atau telah dipindahkan.
                </p>

                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/25"
                >
                    <ArrowLeft size={16} />
                    Kembali ke Dashboard
                </Link>
            </div>
        </div>
    );
}
