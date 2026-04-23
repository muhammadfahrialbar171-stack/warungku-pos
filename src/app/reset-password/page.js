'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff, CheckCircle2, Store, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
    const [password, setPassword]         = useState('');
    const [confirm, setConfirm]           = useState('');
    const [showPass, setShowPass]         = useState(false);
    const [showConfirm, setShowConfirm]   = useState(false);
    const [loading, setLoading]           = useState(false);
    const [error, setError]               = useState('');
    const [success, setSuccess]           = useState(false);

    const { updatePassword } = useAuthStore();
    const router = useRouter();

    useEffect(() => {
        // Redundancy check: ensure user has a session (likely from reset link)
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.replace('/login');
            }
        };
        checkSession();
    }, [router]);

    // Password strength
    const strength = (() => {
        if (!password) return 0;
        let s = 0;
        if (password.length >= 8) s++;
        if (/[A-Z]/.test(password)) s++;
        if (/[0-9]/.test(password)) s++;
        if (/[^A-Za-z0-9]/.test(password)) s++;
        return s;
    })();

    const strengthLabel = ['', 'Lemah', 'Cukup', 'Kuat', 'Sangat Kuat'][strength];
    const strengthColor = ['', '#ef4444', '#f59e0b', '#3b82f6', '#10b981'][strength];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password.length < 8) {
            setError('Password minimal 8 karakter.');
            return;
        }
        if (password !== confirm) {
            setError('Konfirmasi password tidak cocok.');
            return;
        }

        setLoading(true);
        try {
            await updatePassword(password);
            setSuccess(true);
            setTimeout(() => router.push('/login'), 3000);
        } catch (err) {
            setError(err.message || 'Gagal mengubah password. Coba lagi.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Inter:wght@400;500;600&display=swap');

                :root {
                  --primary: #2563eb;
                  --primary-hover: #1d4ed8;
                  --bg: #fdfdfd;
                  --text-main: #0f172a;
                  --text-sub: #64748b;
                  --border: rgba(0,0,0,0.06);
                }

                * { box-sizing: border-box; margin: 0; padding: 0; }

                .rp-page {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #fdfdfd;
                    font-family: 'Outfit', 'Inter', sans-serif;
                    position: relative;
                    overflow: hidden;
                    padding: 20px;
                }

                .rp-bg {
                    position: absolute;
                    inset: 0;
                    background-color: #ffffff;
                    background-image: 
                        radial-gradient(at 0% 0%, rgba(37,99,235,0.03) 0px, transparent 50%),
                        radial-gradient(at 100% 100%, rgba(37,99,235,0.03) 0px, transparent 50%);
                    pointer-events: none;
                }

                .rp-card {
                    position: relative;
                    z-index: 10;
                    width: 100%;
                    max-width: 420px;
                    background: #ffffff;
                    border: 1px solid var(--border);
                    border-radius: 24px;
                    padding: 36px 40px;
                    box-shadow: 
                        0 4px 6px -1px rgba(0,0,0,0.01),
                        0 10px 15px -3px rgba(0,0,0,0.03),
                        0 20px 25px -5px rgba(0,0,0,0.02);
                    animation: cardIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
                }

                @keyframes cardIn {
                    from { opacity: 0; transform: translateY(20px) scale(0.98); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }

                .rp-header { text-align: center; margin-bottom: 28px; }

                .logo-box {
                    width: 44px; height: 44px;
                    background: linear-gradient(135deg, var(--primary), #3b82f6);
                    border-radius: 14px;
                    display: flex; align-items: center; justify-content: center;
                    margin: 0 auto 12px;
                    box-shadow: 0 8px 16px rgba(37,99,235,0.2);
                    animation: logoBreath 3s ease-in-out infinite;
                }
                @keyframes logoBreath {
                    0%, 100% { transform: translateY(0) scale(1); }
                    50%       { transform: translateY(-3px) scale(1.02); }
                }

                .rp-title {
                    font-size: 22px; font-weight: 700;
                    color: var(--text-main); letter-spacing: -0.02em; margin-bottom: 6px;
                }
                .rp-subtitle { font-size: 14px; color: var(--text-sub); line-height: 1.5; }

                .form-group  { display: flex; flex-direction: column; gap: 6px; }
                .form-label  { font-size: 13px; font-weight: 600; color: #475569; margin-left: 2px; }

                .input-wrap  { position: relative; display: flex; align-items: center; }
                .input-icon  {
                    position: absolute; left: 14px;
                    color: #94a3b8; display: flex; align-items: center;
                    pointer-events: none; transition: color 0.2s;
                }
                .input-wrap:focus-within .input-icon { color: var(--primary); }

                .input-field {
                    width: 100%; height: 42px;
                    padding: 0 42px 0 44px;
                    background: #f8fafc;
                    border: 1.5px solid #edf2f7;
                    border-radius: 12px;
                    font-size: 14px; font-family: 'Inter', sans-serif;
                    color: var(--text-main); outline: none;
                    transition: all 0.2s ease;
                }
                .input-field::placeholder { color: #cbd5e1; }
                .input-field:focus {
                    background: #ffffff;
                    border-color: var(--primary);
                    box-shadow: 0 0 0 4px rgba(37,99,235,0.08);
                }

                .eye-btn {
                    position: absolute; right: 12px;
                    background: none; border: none;
                    color: #cbd5e1; cursor: pointer;
                    display: flex; align-items: center;
                    padding: 4px; border-radius: 6px;
                    transition: color 0.2s;
                }
                .eye-btn:hover { color: #64748b; }

                /* Strength bar */
                .strength-bar-wrap {
                    height: 4px; background: #edf2f7;
                    border-radius: 4px; overflow: hidden; margin-top: 6px;
                    transition: all 0.3s;
                }
                .strength-bar-fill {
                    height: 100%; border-radius: 4px;
                    transition: width 0.4s ease, background 0.4s ease;
                }
                .strength-label {
                    font-size: 11px; font-weight: 600;
                    margin-top: 4px; transition: color 0.3s;
                }

                .error-msg {
                    padding: 10px 14px;
                    background: #fff1f2; border: 1px solid #ffe4e6;
                    border-left: 3px solid #f43f5e;
                    border-radius: 8px;
                    color: #be123c; font-size: 13px; font-weight: 500;
                    animation: errIn 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
                }
                @keyframes errIn {
                    from { opacity: 0; transform: translateY(-8px); }
                    to   { opacity: 1; transform: translateY(0); }
                }

                .success-card {
                    text-align: center; padding: 16px;
                    background: #f0fdf4; border: 1px solid #bbf7d0;
                    border-radius: 16px;
                    animation: cardIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
                }
                .success-icon-wrap {
                    width: 52px; height: 52px;
                    background: #dcfce7; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    margin: 0 auto 12px;
                }
                .success-title { font-size: 17px; font-weight: 700; color: #15803d; margin-bottom: 6px; }
                .success-desc  { font-size: 13px; color: #166534; line-height: 1.5; }

                .submit-btn {
                    height: 44px; margin-top: 4px;
                    background: var(--primary); color: #ffffff;
                    border: none; border-radius: 12px;
                    font-size: 15px; font-weight: 600;
                    cursor: pointer; width: 100%;
                    display: flex; align-items: center; justify-content: center; gap: 8px;
                    transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
                    box-shadow: 0 4px 12px rgba(37,99,235,0.2);
                }
                .submit-btn:hover:not(:disabled) {
                    background: var(--primary-hover);
                    transform: translateY(-1px);
                    box-shadow: 0 8px 20px rgba(37,99,235,0.25);
                }
                .submit-btn:active:not(:disabled) { transform: translateY(0); }
                .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }

                .spinner {
                    width: 20px; height: 20px;
                    border: 2.5px solid rgba(255,255,255,0.3);
                    border-top-color: #fff;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }
                @keyframes spin { to { transform: rotate(360deg); } }

                .rp-footer {
                    position: absolute; bottom: 24px;
                    font-size: 12px; color: #94a3b8; letter-spacing: 0.03em;
                }

                .rp-form { display: flex; flex-direction: column; gap: 16px; }

                @media (max-width: 480px) {
                    .rp-card { padding: 32px 24px; }
                }
            `}</style>

            <div className="rp-page">
                <div className="rp-bg" />

                <div className="rp-card">
                    <header className="rp-header">
                        <div className="logo-box">
                            <Store size={24} color="white" />
                        </div>
                        <h1 className="rp-title">Buat Password Baru</h1>
                        <p className="rp-subtitle">Masukkan password baru untuk akun WarungKu kamu.</p>
                    </header>

                    {success ? (
                        <div className="success-card">
                            <div className="success-icon-wrap">
                                <CheckCircle2 size={28} color="#16a34a" />
                            </div>
                            <p className="success-title">Password Berhasil Diubah!</p>
                            <p className="success-desc">
                                Kamu akan diarahkan ke halaman login dalam beberapa detik...
                            </p>
                        </div>
                    ) : (
                        <form className="rp-form" onSubmit={handleSubmit} noValidate>
                            {error && <div className="error-msg">{error}</div>}

                            {/* New Password */}
                            <div className="form-group">
                                <label className="form-label" htmlFor="new-password">Password Baru</label>
                                <div className="input-wrap">
                                    <span className="input-icon"><Lock size={16} /></span>
                                    <input
                                        className="input-field"
                                        id="new-password"
                                        type={showPass ? 'text' : 'password'}
                                        placeholder="Min. 8 karakter"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                    />
                                    <button type="button" className="eye-btn" onClick={() => setShowPass(v => !v)}>
                                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>

                                {/* Strength indicator */}
                                {password && (
                                    <>
                                        <div className="strength-bar-wrap">
                                            <div
                                                className="strength-bar-fill"
                                                style={{
                                                    width: `${(strength / 4) * 100}%`,
                                                    background: strengthColor,
                                                }}
                                            />
                                        </div>
                                        <p className="strength-label" style={{ color: strengthColor }}>
                                            Kekuatan: {strengthLabel}
                                        </p>
                                    </>
                                )}
                            </div>

                            {/* Confirm Password */}
                            <div className="form-group">
                                <label className="form-label" htmlFor="confirm-password">Konfirmasi Password</label>
                                <div className="input-wrap">
                                    <span className="input-icon">
                                        <ShieldCheck size={16} color={confirm && confirm === password ? '#10b981' : undefined} />
                                    </span>
                                    <input
                                        className="input-field"
                                        id="confirm-password"
                                        type={showConfirm ? 'text' : 'password'}
                                        placeholder="Ulangi password baru"
                                        value={confirm}
                                        onChange={e => setConfirm(e.target.value)}
                                        style={confirm && confirm !== password
                                            ? { borderColor: '#f43f5e', boxShadow: '0 0 0 3px rgba(244,63,94,0.08)' }
                                            : confirm && confirm === password
                                            ? { borderColor: '#10b981', boxShadow: '0 0 0 3px rgba(16,185,129,0.08)' }
                                            : {}
                                        }
                                    />
                                    <button type="button" className="eye-btn" onClick={() => setShowConfirm(v => !v)}>
                                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <button className="submit-btn" type="submit" disabled={loading}>
                                {loading ? <div className="spinner" /> : (
                                    <>
                                        <span>Simpan Password Baru</span>
                                        <ArrowRight size={18} />
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>

                <div className="rp-footer">© 2026 WarungKu • Modern POS System</div>
            </div>
        </>
    );
}
