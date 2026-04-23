'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Store, Mail, Lock, ArrowRight, Eye, EyeOff, User, AlertCircle, KeyRound, CheckCircle2, ChevronLeft } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

// Mode constants
const MODE_LOGIN    = 'login';
const MODE_REGISTER = 'register';
const MODE_FORGOT   = 'forgot';

export default function LoginPage() {
    const [email, setEmail]               = useState('');
    const [password, setPassword]         = useState('');
    const [error, setError]               = useState('');
    const [loading, setLoading]           = useState(false);
    const [mode, setMode]                 = useState(MODE_LOGIN);
    const [fullName, setFullName]         = useState('');
    const [storeName, setStoreName]       = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [forgotSent, setForgotSent]     = useState(false);
    const [theme, setTheme]               = useState('blue');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedTheme = localStorage.getItem('pos_theme_color');
            if (savedTheme) setTheme(savedTheme);
        }
    }, []);

    const themeColors = {
        indigo: '#6366f1',
        rose: '#f43f5e',
        emerald: '#10b981',
        amber: '#fbbf24',
        blue: '#2563eb',
        slate: '#475569'
    };

    const primaryColor = themeColors[theme] || themeColors.blue;

    // Debounce ref: prevents rapid repeated submissions
    const debounceRef = useRef(null);

    const { login, register, resetPassword } = useAuthStore();
    const router = useRouter();

    const isRegister = mode === MODE_REGISTER;

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        setError('');

        // Debounce: ignore if a request is already in-flight
        if (debounceRef.current) return;
        debounceRef.current = setTimeout(() => { debounceRef.current = null; }, 1500);

        // Forgot password mode
        if (mode === MODE_FORGOT) {
            if (!email) { setError('Masukkan alamat email kamu.'); return; }
            setLoading(true);
            try {
                await resetPassword(email);
                setForgotSent(true);
            } catch (err) {
                setError(err.message || 'Gagal mengirim email. Coba lagi.');
            } finally {
                setLoading(false);
            }
            return;
        }

        if (!email || !password || (isRegister && (!fullName || !storeName))) {
            setError('Mohon lengkapi semua field yang wajib diisi.');
            return;
        }
        setLoading(true);
        try {
            if (isRegister) await register(email, password, fullName, storeName);
            else await login(email, password);
            router.push('/dashboard');
        } catch (err) {
            setError(err.message || 'Terjadi kesalahan. Silakan coba lagi.');
        } finally {
            setLoading(false);
        }
    }, [mode, email, password, isRegister, fullName, storeName, login, register, resetPassword]);

    const switchMode = (newMode) => {
        setMode(newMode);
        setError('');
        setForgotSent(false);
    };

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Inter:wght@400;500;600&display=swap');

                :root {
                  --primary: ${primaryColor};
                  --primary-rgb: ${theme === 'indigo' ? '99, 102, 241' : theme === 'rose' ? '244, 63, 94' : theme === 'emerald' ? '16, 185, 129' : theme === 'amber' ? '245, 158, 11' : '37, 99, 235'};
                  --primary-hover: ${primaryColor}dd;
                  --bg: #0b0f1a;
                  --text-main: #ffffff;
                  --text-sub: #94a3b8;
                  --border: rgba(255,255,255,0.08);
                  --card-bg: rgba(15, 23, 42, 0.8);
                }

                * { box-sizing: border-box; margin: 0; padding: 0; }

                .auth-page {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--bg);
                    font-family: 'Outfit', 'Inter', sans-serif;
                    position: relative;
                    overflow: hidden;
                    padding: 20px;
                }

                /* Elegant mesh gradient background */
                .auth-bg {
                    position: absolute;
                    inset: 0;
                    background-color: var(--bg);
                    background-image: 
                        radial-gradient(at 0% 0%, rgba(var(--primary-rgb), 0.15) 0px, transparent 50%),
                        radial-gradient(at 100% 0%, rgba(var(--primary-rgb), 0.1) 0px, transparent 50%),
                        radial-gradient(at 100% 100%, rgba(var(--primary-rgb), 0.15) 0px, transparent 50%),
                        radial-gradient(at 0% 100%, rgba(var(--primary-rgb), 0.1) 0px, transparent 50%);
                    pointer-events: none;
                }

                .auth-bg::after {
                    content: "";
                    position: absolute;
                    inset: 0;
                    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
                    opacity: 0.03;
                    mix-blend-mode: overlay;
                    pointer-events: none;
                }

                .auth-card {
                    position: relative;
                    z-index: 10;
                    width: 100%;
                    max-width: 440px;
                    background: var(--card-bg);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border: 1px solid var(--border);
                    border-radius: 28px;
                    padding: 44px 40px;
                    box-shadow: 
                        0 25px 50px -12px rgba(0, 0, 0, 0.5),
                        0 0 0 1px rgba(255, 255, 255, 0.05) inset;
                    animation: cardEntrance 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
                }

                @keyframes cardEntrance {
                    from { opacity: 0; transform: translateY(20px) scale(0.98); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }

                .auth-header {
                    text-align: center;
                    margin-bottom: 24px;
                }

                .logo-box {
                    width: 44px;
                    height: 44px;
                    background: linear-gradient(135deg, var(--primary), #3b82f6);
                    border-radius: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 12px;
                    box-shadow: 0 8px 16px rgba(37, 99, 235, 0.2);
                    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    position: relative;
                    overflow: hidden;
                    animation: logoBreath 3s ease-in-out infinite;
                }

                /* Logo Shine Effect */
                .logo-box::after {
                    content: '';
                    position: absolute;
                    top: -50%;
                    left: -50%;
                    width: 200%;
                    height: 200%;
                    background: linear-gradient(
                        45deg,
                        transparent 45%,
                        rgba(255, 255, 255, 0.3) 50%,
                        transparent 55%
                    );
                    animation: logoShine 4s infinite;
                }

                @keyframes logoBreath {
                    0%, 100% { transform: translateY(0) scale(1); }
                    50% { transform: translateY(-3px) scale(1.02); }
                }

                @keyframes logoShine {
                    0% { transform: translate(-100%, -100%) rotate(0deg); }
                    20%, 100% { transform: translate(100%, 100%) rotate(0deg); }
                }

                .logo-box:hover {
                    animation-play-state: paused;
                    transform: translateY(-4px) rotate(8deg) scale(1.1);
                    box-shadow: 0 12px 24px rgba(37, 99, 235, 0.3);
                }

                .auth-title {
                    font-size: 22px;
                    font-weight: 700;
                    color: var(--text-main);
                    letter-spacing: -0.02em;
                    margin-bottom: 8px;
                }
                .auth-subtitle {
                    font-size: 14px;
                    color: var(--text-sub);
                    line-height: 1.5;
                }

                .auth-form {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .form-label {
                    font-size: 12px;
                    font-weight: 700;
                    color: rgba(255, 255, 255, 0.5);
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    margin-left: 4px;
                }

                .input-container {
                    position: relative;
                    display: flex;
                    align-items: center;
                }

                .input-field {
                    width: 100%;
                    height: 46px;
                    padding: 0 16px 0 44px;
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 14px;
                    font-size: 14px;
                    font-family: 'Inter', sans-serif;
                    color: #ffffff;
                    outline: none;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .input-field::placeholder { color: rgba(255, 255, 255, 0.2); }
                .input-field:focus {
                    background: rgba(255, 255, 255, 0.06);
                    border-color: var(--primary);
                    box-shadow: 0 0 0 4px rgba(var(--primary-rgb), 0.15);
                }

                .input-icon {
                    position: absolute;
                    left: 14px;
                    color: #94a3b8;
                    display: flex;
                    align-items: center;
                    pointer-events: none;
                    transition: color 0.2s;
                }
                .input-container:focus-within .input-icon { color: var(--primary); }

                .password-toggle {
                    position: absolute;
                    right: 12px;
                    background: none;
                    border: none;
                    color: #cbd5e1;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    padding: 4px;
                    border-radius: 6px;
                }
                .password-toggle:hover { color: #64748b; background: rgba(0,0,0,0.02); }

                .error-message {
                    padding: 10px 14px;
                    background: #fff1f2;
                    border: 1px solid #ffe4e6;
                    border-left: 3px solid #f43f5e;
                    border-radius: 8px;
                    color: #be123c;
                    font-size: 13px;
                    font-family: 'Inter', sans-serif;
                    font-weight: 500;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 18px;
                    animation: errorEntrance 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
                }
                .error-icon {
                    flex-shrink: 0;
                    color: #f43f5e;
                }

                @keyframes errorEntrance {
                    from { opacity: 0; transform: translateY(-8px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .submit-button {
                    height: 48px;
                    margin-top: 8px;
                    background: var(--primary);
                    color: #ffffff;
                    border: none;
                    border-radius: 14px;
                    font-size: 15px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    box-shadow: 0 10px 20px -5px rgba(var(--primary-rgb), 0.4);
                }
                .submit-button:hover:not(:disabled) {
                    background: var(--primary-hover);
                    transform: translateY(-2px);
                    box-shadow: 0 15px 30px -5px rgba(var(--primary-rgb), 0.5);
                }
                .submit-button:active:not(:disabled) { transform: translateY(0); }
                .submit-button:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .form-footer {
                    margin-top: 16px;
                    text-align: center;
                    font-size: 14px;
                    color: var(--text-sub);
                }

                .switch-button {
                    background: none;
                    border: none;
                    color: var(--primary);
                    font-weight: 600;
                    cursor: pointer;
                    padding: 4px 8px;
                    border-radius: 6px;
                    transition: background 0.2s;
                }
                .switch-button:hover {
                    color: var(--primary-hover);
                    text-decoration: underline;
                }

                .forgot-link {
                    display: block;
                    text-align: right;
                    font-size: 12px;
                    font-weight: 600;
                    color: var(--primary);
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 2px 0;
                    transition: color 0.2s;
                    margin-top: -6px;
                }
                .forgot-link:hover { color: var(--primary-hover); text-decoration: underline; }

                .back-link {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 13px;
                    font-weight: 600;
                    color: var(--text-sub);
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 4px 0;
                    margin-bottom: 8px;
                    transition: color 0.2s;
                }
                .back-link:hover { color: var(--text-main); }

                .success-card {
                    text-align: center;
                    padding: 20px;
                    background: #f0fdf4;
                    border: 1px solid #bbf7d0;
                    border-radius: 16px;
                    animation: cardEntrance 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
                }
                .success-icon-wrap {
                    width: 52px; height: 52px;
                    background: #dcfce7; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    margin: 0 auto 12px;
                }
                .success-title { font-size: 17px; font-weight: 700; color: #15803d; margin-bottom: 8px; }
                .success-desc  { font-size: 13px; color: #166534; line-height: 1.6; }

                .auth-footer {
                    position: absolute;
                    bottom: 24px;
                    font-size: 12px;
                    color: #94a3b8;
                    letter-spacing: 0.03em;
                }

                .spinner {
                    width: 20px;
                    height: 20px;
                    border: 2.5px solid rgba(255,255,255,0.3);
                    border-top-color: #ffffff;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }
                @keyframes spin { to { transform: rotate(360deg); } }

                .register-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                }

                @media (max-width: 480px) {
                    .auth-card { padding: 32px 24px; }
                    .register-grid { grid-template-columns: 1fr; }
                }
            `}</style>

            <div className="auth-page">
                <div className="auth-bg" />

                <div className="auth-card">
                    <header className="auth-header">
                        <div className="logo-box">
                            <Store size={24} color="white" />
                        </div>
                        <h1 className="auth-title">WarungKu POS</h1>
                        <p className="auth-subtitle">
                            {mode === MODE_FORGOT
                             ? 'Masukkan email kamu untuk menerima link reset password.'
                             : mode === MODE_REGISTER
                             ? 'Mulai kelola bisnis Anda dengan sistem kasir terbaik.'
                             : 'Kelola stok, penjualan, dan laporan dalam satu aplikasi.'}
                        </p>
                    </header>

                    {error && (
                        <div className="error-message">
                            <AlertCircle className="error-icon" size={16} />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* ===== FORGOT PASSWORD MODE ===== */}
                    {mode === MODE_FORGOT ? (
                        forgotSent ? (
                            <div className="success-card">
                                <div className="success-icon-wrap">
                                    <CheckCircle2 size={28} color="#16a34a" />
                                </div>
                                <p className="success-title">Email Terkirim!</p>
                                <p className="success-desc">
                                    Cek inbox <strong>{email}</strong>.<br />
                                    Klik link di email dan ikuti instruksi untuk membuat password baru.
                                </p>
                                <button
                                    type="button"
                                    className="switch-button"
                                    style={{ marginTop: 16, display: 'block', margin: '16px auto 0' }}
                                    onClick={() => switchMode(MODE_LOGIN)}
                                >
                                    Kembali ke Login
                                </button>
                            </div>
                        ) : (
                            <form className="auth-form" onSubmit={handleSubmit} noValidate>
                                <button type="button" className="back-link" onClick={() => switchMode(MODE_LOGIN)}>
                                    <ChevronLeft size={15} /> Kembali ke Login
                                </button>

                                <div className="form-group">
                                    <label className="form-label" htmlFor="forgot-email">Alamat Email</label>
                                    <div className="input-container">
                                        <span className="input-icon"><Mail size={16} /></span>
                                        <input
                                            className="input-field"
                                            id="forgot-email"
                                            type="email"
                                            placeholder="admin@warungku.com"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <button className="submit-button" type="submit" disabled={loading}>
                                    {loading ? <div className="spinner" /> : (
                                        <>
                                            <span>Kirim Link Reset</span>
                                            <KeyRound size={18} />
                                        </>
                                    )}
                                </button>
                            </form>
                        )
                    ) : (
                    /* ===== LOGIN & REGISTER MODE ===== */
                    <>
                        <form className="auth-form" onSubmit={handleSubmit} noValidate>
                            {mode === MODE_REGISTER && (
                                <div className="register-grid">
                                    <div className="form-group">
                                        <label className="form-label" htmlFor="fullName">Nama Lengkap</label>
                                        <div className="input-container">
                                            <span className="input-icon"><User size={16} /></span>
                                            <input 
                                                className="input-field"
                                                id="fullName" 
                                                type="text" 
                                                placeholder="John Doe"
                                                value={fullName}
                                                onChange={e => setFullName(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label" htmlFor="storeName">Nama Toko</label>
                                        <div className="input-container">
                                            <span className="input-icon"><Store size={16} /></span>
                                            <input 
                                                className="input-field"
                                                id="storeName" 
                                                type="text" 
                                                placeholder="Warung Berkah"
                                                value={storeName}
                                                onChange={e => setStoreName(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="form-group">
                                <label className="form-label" htmlFor="email">Alamat Email</label>
                                <div className="input-container">
                                    <span className="input-icon"><Mail size={16} /></span>
                                    <input 
                                        className="input-field"
                                        id="email" 
                                        type="email" 
                                        placeholder="admin@warungku.com"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="password">Password</label>
                                <div className="input-container">
                                    <span className="input-icon"><Lock size={16} /></span>
                                    <input 
                                        className="input-field"
                                        id="password" 
                                        type={showPassword ? 'text' : 'password'} 
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                    />
                                    <button 
                                        type="button" 
                                        className="password-toggle"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                {mode === MODE_LOGIN && (
                                    <button
                                        type="button"
                                        className="forgot-link"
                                        onClick={() => switchMode(MODE_FORGOT)}
                                    >
                                        Lupa Password?
                                    </button>
                                )}
                            </div>

                            <button className="submit-button" type="submit" disabled={loading}>
                                {loading ? <div className="spinner" /> : (
                                    <>
                                        <span>{isRegister ? 'Daftar Sekarang' : 'Masuk ke Aplikasi'}</span>
                                        <ArrowRight size={18} />
                                    </>
                                )}
                            </button>
                        </form>

                        <footer className="form-footer">
                            <p>
                                {isRegister ? 'Sudah punya akun?' : 'Belum punya akun?'}
                                <button 
                                    className="switch-button" 
                                    type="button"
                                    onClick={() => switchMode(isRegister ? MODE_LOGIN : MODE_REGISTER)}
                                >
                                    {isRegister ? 'Masuk di sini' : 'Daftar gratis'}
                                </button>
                            </p>
                        </footer>
                    </>
                    )}
                </div>

                <div className="auth-footer">
                    © 2026 WarungKu • Modern POS System
                </div>
            </div>
        </>
    );
}
