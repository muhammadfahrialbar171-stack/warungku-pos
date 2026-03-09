'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { ShieldAlert } from 'lucide-react';
import Button from '@/components/ui/Button';

/**
 * Higher-Order Component to protect pages based on user roles
 * @param {React.Component} WrappedComponent - The page component to wrap
 * @param {string[]} allowedRoles - Array of roles allowed to access ('owner', 'cashier')
 */
export function withRBAC(WrappedComponent, allowedRoles = ['owner']) {
    return function ProtectedRoute(props) {
        const { user, loading } = useAuthStore();
        const router = useRouter();
        const [isAuthorized, setIsAuthorized] = useState(false);
        const [checking, setChecking] = useState(true);

        useEffect(() => {
            if (!loading) {
                if (!user) {
                    // Not logged in, handled by AppShell mostly, but let's be safe
                    router.push('/login');
                    return;
                }

                // If user doesn't have a role string, we assume they are an owner (legacy data)
                const userRole = user.role || 'owner';

                if (allowedRoles.includes(userRole)) {
                    setIsAuthorized(true);
                } else {
                    setIsAuthorized(false);
                }
                setChecking(false);
            }
        }, [user, loading, router, allowedRoles]);

        if (loading || checking) {
            return (
                <div className="min-h-[60vh] flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                </div>
            );
        }

        if (!isAuthorized) {
            return (
                <div className="min-h-[80vh] flex flex-col items-center justify-center text-center animate-fade-in px-4">
                    <div className="w-24 h-24 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mb-6 ring-1 ring-rose-500/20">
                        <ShieldAlert size={48} />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-3">Akses Ditolak</h1>
                    <p className="text-slate-400 max-w-md mb-8">
                        Maaf, akun kasir Anda tidak diizinkan untuk mengakses halaman ini. Halaman ini hanya untuk Pemilik Toko (Owner).
                    </p>
                    <Button
                        onClick={() => router.push('/cashier')}
                        className="bg-slate-800 hover:bg-slate-700 text-white border-0 shadow-lg"
                    >
                        Kembali ke Kasir
                    </Button>
                </div>
            );
        }

        return <WrappedComponent {...props} />;
    };
}
