'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Store } from 'lucide-react';
import { Suspense } from 'react';

function AuthCallbackInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState('Memverifikasi sesi...');

    useEffect(() => {
        // Supabase automatically processes the hash/code in the URL.
        // Listen for the auth state change to know when it's done.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (event === 'PASSWORD_RECOVERY') {
                    setStatus('Sesi reset terdeteksi. Mengarahkan...');
                    setTimeout(() => router.replace('/reset-password'), 800);
                } else if (event === 'SIGNED_IN' && session) {
                    const next = searchParams.get('next') || '/dashboard';
                    setStatus('Login berhasil. Mengarahkan...');
                    setTimeout(() => router.replace(next), 800);
                }
            }
        );

        // Safety fallback: if nothing triggers in 5s, go to login
        const fallback = setTimeout(() => {
            setStatus('Terjadi masalah. Kembali ke login...');
            setTimeout(() => router.replace('/login'), 1500);
        }, 5000);

        return () => {
            subscription.unsubscribe();
            clearTimeout(fallback);
        };
    }, [router, searchParams]);

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'Outfit', sans-serif",
            background: '#fdfdfd',
            gap: 16,
        }}>
            <div style={{
                width: 44, height: 44,
                background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                borderRadius: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 16px rgba(37,99,235,0.2)',
            }}>
                <Store size={24} color="white" />
            </div>
            <div style={{
                width: 24, height: 24,
                border: '2.5px solid #e2e8f0',
                borderTopColor: '#2563eb',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ fontSize: 14, color: '#64748b', fontWeight: 500 }}>{status}</p>
        </div>
    );
}

export default function AuthCallbackPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <AuthCallbackInner />
        </Suspense>
    );
}
