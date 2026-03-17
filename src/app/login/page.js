'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Store, Mail, Lock, LogIn, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import Button from '@/components/ui/Button';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isRegister, setIsRegister] = useState(false);
    const [fullName, setFullName] = useState('');
    const [storeName, setStoreName] = useState('');
    const [showPassword, setShowPassword] = useState(false);

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

    const inputClass = "w-full bg-[#0a0f1e] border border-[#2a3352] rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200";
    const inputWithIconClass = `${inputClass} pl-11`;
    const labelClass = "block text-sm font-medium text-slate-300 mb-1.5";

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #111827 50%, #0f172a 100%)' }}>
            {/* Animated background orbs */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-600/8 rounded-full blur-[120px]" style={{ animation: 'float 8s ease-in-out infinite' }} />
                <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-600/8 rounded-full blur-[100px]" style={{ animation: 'float 8s ease-in-out infinite 4s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[140px]" style={{ animation: 'float 10s ease-in-out infinite 2s' }} />
                {/* Grid pattern */}
                <div className="absolute inset-0 opacity-[0.02]" style={{
                    backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
                    backgroundSize: '60px 60px'
                }} />
            </div>

            <div className="relative w-full max-w-[420px] z-10" style={{ animation: 'scaleIn 0.5s ease-out' }}>
                {/* Logo Section */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/30 mb-5 ring-4 ring-indigo-500/10">
                        <Store size={28} className="text-white drop-shadow-lg" />
                    </div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight mb-1">WarungKu</h1>
                    <p className="text-slate-400 text-sm">Aplikasi Kasir Modern untuk UMKM</p>
                </div>

                {/* Form Card - Premium glassmorphism */}
                <div className="relative rounded-2xl overflow-hidden">
                    {/* Card border gradient effect */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-slate-700/50 to-slate-800/20 p-[1px]">
                        <div className="w-full h-full rounded-2xl bg-[#111827]/95" />
                    </div>

                    <div className="relative backdrop-blur-xl p-7 sm:p-8">
                        <h2 className="text-lg font-bold text-white mb-6">
                            {isRegister ? 'Buat Akun Baru' : 'Masuk ke Akun Anda'}
                        </h2>

                        {error && (
                            <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/25 rounded-xl text-red-400 text-sm flex items-start gap-2.5">
                                <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-xs">!</span>
                                </div>
                                <div>{error}</div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {isRegister && (
                                <>
                                    <div>
                                        <label className={labelClass}>Nama Lengkap</label>
                                        <input
                                            type="text"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            placeholder="Nama lengkap Anda"
                                            className={inputClass}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Nama Toko</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                                <Store size={16} className="text-slate-500" />
                                            </div>
                                            <input
                                                type="text"
                                                value={storeName}
                                                onChange={(e) => setStoreName(e.target.value)}
                                                placeholder="Nama toko Anda"
                                                className={inputWithIconClass}
                                                required
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            <div>
                                <label className={labelClass}>Email</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                        <Mail size={16} className="text-slate-500" />
                                    </div>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="email@example.com"
                                        className={inputWithIconClass}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className={labelClass}>Password</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                        <Lock size={16} className="text-slate-500" />
                                    </div>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className={`${inputWithIconClass} pr-11`}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <div className="pt-3">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full relative overflow-hidden bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-600/25 hover:shadow-indigo-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            {isRegister ? 'Daftar' : 'Masuk'}
                                            <ArrowRight size={16} />
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>

                        {/* Toggle */}
                        <div className="mt-6 pt-5 border-t border-slate-800 text-center">
                            <p className="text-sm text-slate-400">
                                {isRegister ? 'Sudah punya akun?' : 'Belum punya akun?'}
                                {' '}
                                <button
                                    type="button"
                                    onClick={() => { setIsRegister(!isRegister); setError(''); }}
                                    className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors cursor-pointer"
                                >
                                    {isRegister ? 'Masuk sekarang' : 'Daftar sekarang'}
                                </button>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-slate-600 mt-8">
                    © 2026 WarungKu POS. Dibuat untuk UMKM Indonesia.
                </p>
            </div>

            <style jsx>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-30px); }
                }
                @keyframes scaleIn {
                    0% { opacity: 0; transform: scale(0.95) translateY(10px); }
                    100% { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>
        </div>
    );
}
