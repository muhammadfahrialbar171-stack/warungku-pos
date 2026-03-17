'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Store, Mail, Lock, LogIn, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isRegister, setIsRegister] = useState(false);
    const [fullName, setFullName] = useState('');
    const [storeName, setStoreName] = useState('');

    const { login, register } = useAuthStore();
    const router = useRouter();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isRegister) {
                await register(email, password, fullName, storeName);
            } else {
                await login(email, password);
            }
            router.push('/dashboard');
        } catch (err) {
            setError(err.message || 'Terjadi kesalahan. Silakan coba lagi.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[var(--surface-0)]">
            {/* Background decoration */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-float" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float-delayed" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl animate-float-slow" />
            </div>

            <div className="relative w-full max-w-md animate-scale-in z-10">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-4">
                        <Store size={28} className="text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-1">WarungKu</h1>
                    <p className="text-[var(--text-secondary)] text-sm">Aplikasi Kasir Modern untuk UMKM</p>
                </div>

                {/* Form Card */}
                <div className="bg-[var(--surface-1)]/80 backdrop-blur-xl border border-[var(--surface-border)] rounded-2xl p-6 md:p-8 shadow-xl">
                    <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-6">
                        {isRegister ? 'Buat Akun Baru' : 'Masuk ke Akun Anda'}
                    </h2>

                    {error && (
                        <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm animate-fade-in flex items-start gap-2">
                            <div className="mt-0.5">•</div>
                            <div>{error}</div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {isRegister && (
                            <>
                                <Input
                                    label="Nama Lengkap"
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="Nama lengkap Anda"
                                    required
                                />
                                <Input
                                    label="Nama Toko"
                                    type="text"
                                    value={storeName}
                                    onChange={(e) => setStoreName(e.target.value)}
                                    placeholder="Nama toko Anda"
                                    icon={Store}
                                    required
                                />
                            </>
                        )}

                        <Input
                            label="Email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="email@example.com"
                            icon={Mail}
                            required
                        />

                        <Input
                            label="Password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            icon={Lock}
                            required
                        />

                        <div className="pt-2">
                            <Button
                                type="submit"
                                variant="primary"
                                className="w-full py-2.5 text-sm"
                                loading={loading}
                                iconRight={ArrowRight}
                            >
                                {isRegister ? 'Daftar' : 'Masuk'}
                            </Button>
                        </div>
                    </form>

                    {/* Toggle */}
                    <div className="mt-6 pt-6 border-t border-[var(--surface-border)] text-center">
                        <p className="text-sm text-[var(--text-secondary)]">
                            {isRegister ? 'Sudah punya akun?' : 'Belum punya akun?'}
                            {' '}
                            <button
                                type="button"
                                onClick={() => { setIsRegister(!isRegister); setError(''); }}
                                className="text-indigo-500 font-medium hover:text-indigo-400 transition-colors"
                            >
                                {isRegister ? 'Masuk sekarang' : 'Daftar sekarang'}
                            </button>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-[var(--text-muted)] mt-8">
                    © 2026 WarungKu POS. Dibuat untuk UMKM Indonesia.
                </p>
            </div>
        </div>
    );
}
