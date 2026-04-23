'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

/**
 * Higher-Order Component to protect pages based on user roles
 * Optimized for Zero-Stall production: Synchronous role verification.
 * NO external UI dependencies (Button/Icons) to prevent circular initialization deadlocks.
 */
export function withRBAC(WrappedComponent, allowedRoles = ['owner']) {
    return function ProtectedRoute(props) {
        const { user, loading } = useAuthStore();
        const router = useRouter();

        useEffect(() => {
            if (!loading && !user) {
                router.push('/login');
            }
        }, [user, loading, router]);

        if (loading) return null;
        if (!user) return null;

        const userRole = user.role || 'owner';
        const isAuthorized = allowedRoles.includes(userRole);

        if (!isAuthorized) {
            return (
                <div className="min-h-[80vh] flex flex-col items-center justify-center text-center animate-fade-in px-4">
                    <div className="w-24 h-24 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mb-6 ring-1 ring-rose-500/20">
                        {/* Inline SVG to avoid Lucide initialization issues in HOC */}
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m14.5 9-5 5"/><path d="m9.5 9 5 5"/></svg>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-3">Akses Ditolak</h1>
                    <p className="text-slate-400 max-w-md mb-8">
                        Maaf, akun kasir Anda tidak diizinkan untuk mengakses halaman ini. Halaman ini hanya untuk Pemilik Toko (Owner).
                    </p>
                    <button
                        onClick={() => router.push('/cashier')}
                        style={{
                            background: '#1e293b',
                            color: 'white',
                            padding: '10px 24px',
                            borderRadius: '12px',
                            fontWeight: 'bold',
                            border: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        Kembali ke Kasir
                    </button>
                </div>
            );
        }

        return <WrappedComponent {...props} />;
    };
}
