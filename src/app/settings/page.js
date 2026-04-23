'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    User,
    Store,
    Phone,
    Mail,
    Save,
    Shield,
    UserPlus,
    Trash2,
    Copy,
    Eye,
    EyeOff,
    CheckCircle,
    Users,
    Upload,
    Palette,
    RotateCcw,
    Database,
    Zap,
    KeyRound,
    Pencil,
    ChevronDown,
    AlertCircle,
    CheckCircle2,
    LogIn,
    LogOut,
    Plus,
    History,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import PageHeader from '@/components/ui/PageHeader';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import dayjs from 'dayjs';
import { useDashboardStore } from '@/store/dashboardStore';
import { clearAllOfflineData } from '@/lib/indexedDB';
import imageCompression from 'browser-image-compression';

import { withRBAC } from '@/components/layout/withRBAC';
import { logActivity } from '@/lib/audit';

function SettingsPage() {
    const { user, updateUser } = useAuthStore();
    const toast = useToast();
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [receiptSize, setReceiptSize] = useState('80mm');

    const [showResetModal, setShowResetModal] = useState(false);
    const [resetConfirmation, setResetConfirmation] = useState('');
    const [resetting, setResetting] = useState(false);

    const [showHistoricalResetModal, setShowHistoricalResetModal] = useState(false);
    const [historicalResetConfirmation, setHistoricalResetConfirmation] = useState('');
    const [resettingHistorical, setResettingHistorical] = useState(false);


    // Password change state
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
    const [savingPw, setSavingPw] = useState(false);
    const [showPwFields, setShowPwFields] = useState({ current: false, newPw: false, confirm: false });

    // --- Password Strength Helper ---
    const getPasswordStrength = (password) => {
        if (!password) return { score: 0, label: '', color: '', width: '0%' };
        let score = 0;
        if (password.length >= 6) score++;
        if (password.length >= 8) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;

        const levels = [
            { label: 'Sangat Lemah', color: 'bg-red-500', textColor: 'text-red-400', width: '20%' },
            { label: 'Lemah', color: 'bg-orange-500', textColor: 'text-orange-400', width: '40%' },
            { label: 'Sedang', color: 'bg-amber-500', textColor: 'text-amber-400', width: '60%' },
            { label: 'Kuat', color: 'bg-emerald-500', textColor: 'text-emerald-400', width: '80%' },
            { label: 'Sangat Kuat', color: 'bg-emerald-400', textColor: 'text-emerald-300', width: '100%' },
        ];
        const idx = Math.min(score, 5) - 1;
        if (idx < 0) return { score: 0, label: 'Terlalu Pendek', color: 'bg-red-500', textColor: 'text-red-400', width: '5%' };
        return { score, ...levels[idx] };
    };

    const pwStrength = useMemo(() => getPasswordStrength(pwForm.newPw), [pwForm.newPw]);
    const isPasswordStrong = pwStrength.score >= 2;

    const handleChangePassword = async () => {
        if (!pwForm.newPw || pwForm.newPw.length < 6) {
            toast.error('Password baru minimal 6 karakter');
            return;
        }
        if (!isPasswordStrong) {
            toast.error('Password terlalu lemah. Tambahkan angka, huruf kapital, atau karakter spesial.');
            return;
        }
        if (pwForm.newPw !== pwForm.confirm) {
            toast.error('Konfirmasi password tidak cocok');
            return;
        }
        setSavingPw(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: pwForm.newPw });
            if (error) throw error;
            toast.success('Password berhasil diperbarui!');
            setPwForm({ current: '', newPw: '', confirm: '' });
            setShowPasswordModal(false);
        } catch (err) {
            toast.error('Gagal mengubah password: ' + err.message);
        } finally {
            setSavingPw(false);
        }
    };
    const [profile, setProfile] = useState({
        full_name: '',
        store_name: '',
        phone: '',
        email: '',
        receipt_header: '',
        receipt_footer: '',
        logo_url: '',
        theme_color: 'rose',
        tax_rate: 0,
    });

    const THEME_COLORS = [
        { id: 'rose', name: 'Rose', color: 'bg-rose-500' },
        { id: 'blue', name: 'blue', color: 'bg-blue-500' },
        { id: 'emerald', name: 'Emerald', color: 'bg-emerald-500' },
        { id: 'amber', name: 'Amber', color: 'bg-amber-500' },
        { id: 'sky', name: 'Sky Blue', color: 'bg-sky-500' },
        { id: 'purple', name: 'Purple', color: 'bg-purple-500' }
    ];

    const [uploadingLogo, setUploadingLogo] = useState(false);

    // Multi-user state
    const [cashiers, setCashiers] = useState([]);
    const [addCashierModal, setAddCashierModal] = useState(false);
    const [cashierForm, setCashierForm] = useState({ email: '', password: '', full_name: '' });
    const [addingCashier, setAddingCashier] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [showPassword, setShowPassword] = useState(false);

    // Edit Cashier state
    const [editCashierModal, setEditCashierModal] = useState(false);
    const [editCashierForm, setEditCashierForm] = useState({ id: '', full_name: '' });
    const [editingCashier, setEditingCashier] = useState(false);

    useEffect(() => {
        if (user) {
            setProfile({
                full_name: user.full_name || '',
                store_name: user.store_name || '',
                phone: user.phone || '',
                email: user.email || '',
                receipt_header: user.receipt_header || '',
                receipt_footer: user.receipt_footer || '',
                logo_url: user.logo_url || '',
                theme_color: user.theme_color || 'rose',
                tax_rate: user.tax_rate || 0,
            });
            if (typeof window !== 'undefined') {
                setReceiptSize(localStorage.getItem('pos_receipt_size') || '80mm');
            }
            loadCashiers();
        }
    }, [user]);

    const loadCashiers = async () => {
        if (!user || user.role === 'cashier') return;
        const { data } = await supabase
            .from('users')
            .select('*')
            .eq('owner_id', user.id)
            .order('created_at', { ascending: false });
        setCashiers(data || []);
    };

    const [activities, setActivities] = useState([]);
    const [loadingActivities, setLoadingActivities] = useState(false);

    const loadActivities = async () => {
        if (!user || user.role === 'cashier') return;
        setLoadingActivities(true);
        try {
            // First get all cashier IDs belonging to this owner
            const { data: cashiersData } = await supabase
                .from('users')
                .select('id')
                .eq('owner_id', user.id);
            
            const userIds = [user.id, ...(cashiersData?.map(c => c.id) || [])];

            const { data } = await supabase
                .from('system_activities')
                .select('*')
                .in('user_id', userIds)
                .order('created_at', { ascending: false })
                .limit(10);
            setActivities(data || []);
        } catch (err) {
            console.error('Failed to load activities:', err);
        } finally {
            setLoadingActivities(false);
        }
    };

    useEffect(() => {
        loadActivities();
    }, [user?.id]);

    const handleSaveProfile = async () => {
        // #6 — Phone validation
        const phone = profile.phone.trim();
        if (phone && !/^(\+62|62|08)\d{8,13}$/.test(phone)) {
            toast.error('Format nomor telepon tidak valid. Contoh: 08123456789 atau +628123456789');
            return;
        }

        setSaving(true);
        try {
            const { error } = await supabase
                .from('users')
                .update({
                    full_name: profile.full_name,
                    store_name: profile.store_name,
                    phone: profile.phone,
                    receipt_header: profile.receipt_header,
                    receipt_footer: profile.receipt_footer,
                    logo_url: profile.logo_url,
                    theme_color: profile.theme_color,
                    tax_rate: parseFloat(profile.tax_rate) || 0,
                })
                .eq('id', user.id);

            if (error) throw error;
            
            // Instantly update the global user state so Theme, Logo, and Store Name reflect immediately
            updateUser({
                full_name: profile.full_name,
                store_name: profile.store_name,
                phone: profile.phone,
                receipt_header: profile.receipt_header,
                receipt_footer: profile.receipt_footer,
                logo_url: profile.logo_url,
                theme_color: profile.theme_color,
                tax_rate: parseFloat(profile.tax_rate) || 0,
            });

            if (typeof window !== 'undefined') {
                localStorage.setItem('pos_receipt_size', receiptSize);
                localStorage.setItem('pos_theme_color', profile.theme_color);
            }

            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
            toast.success('Profil & Pengaturan berhasil disimpan!');
            
            logActivity('UPDATE_PROFILE', { store_name: profile.store_name, theme: profile.theme_color }, user.id);
            loadActivities();
        } catch (err) {
            console.error(err);
            toast.error('Gagal menyimpan profil: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleResetHistoricalData = async () => {
        if (historicalResetConfirmation !== 'HAPUS RIWAYAT DATA') return;
        setResettingHistorical(true);
        try {
            const storeId = user.id;

            // 1. Delete transactions & items (Items first because of FK)
            const { data: txs } = await supabase.from('transactions').select('id').eq('user_id', storeId);
            if (txs && txs.length > 0) {
                const txIds = txs.map(t => t.id);
                // First delete items belonging to these transactions
                await supabase.from('transaction_items').delete().in('transaction_id', txIds);
                // Then delete transactions
                await supabase.from('transactions').delete().in('id', txIds);
            }

            // 2. Delete expenses, shifts, history, activities
            await Promise.all([
                supabase.from('expenses').delete().eq('user_id', storeId),
                supabase.from('shifts').delete().eq('store_id', storeId),
                supabase.from('stock_history').delete().eq('user_id', storeId),
                supabase.from('system_activities').delete().eq('user_id', storeId)
            ]);

            toast.success('Seluruh riwayat data berhasil dibersihkan!');
            setShowHistoricalResetModal(false);
            setHistoricalResetConfirmation('');
            
            // Reload dashboard cache
            useDashboardStore.getState().clearCache(); 
            loadActivities();
            
            // Log this major cleanup
            logActivity('RESET_ALL_DATA', { reason: 'Clean launch preparation' }, user.id);
        } catch (err) {
            console.error(err);
            toast.error('Gagal mereset data: ' + err.message);
        } finally {
            setResettingHistorical(false);
        }
    };


    const handleUploadLogo = async (e) => {
        try {
            if (!e.target.files || e.target.files.length === 0) return;
            let file = e.target.files[0];

            // Validasi ukuran file (maks 5MB sebelum kompresi)
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Ukuran file melebihi 5MB. Pilih gambar yang lebih kecil.');
                return;
            }

            setUploadingLogo(true);

            // Kompresi gambar sebelum upload
            const compressionOptions = {
                maxSizeMB: 0.5,        // Maksimal 500KB setelah kompresi
                maxWidthOrHeight: 1080, // Resolusi maks 1080px
                useWebWorker: true,
                fileType: 'image/webp', // Konversi ke WebP untuk ukuran lebih kecil
            };

            try {
                file = await imageCompression(file, compressionOptions);
            } catch (compressionError) {
                console.warn('Kompresi gagal, menggunakan file asli:', compressionError);
                // Fallback: jika kompresi gagal, cek ukuran file asli
                if (file.size > 2 * 1024 * 1024) {
                    toast.error('Gagal mengompresi dan file melebihi 2MB.');
                    return;
                }
            }

            const fileExt = 'webp'; // Selalu gunakan webp karena sudah dikonversi
            const fileName = `logo_${user.id}_${Date.now()}.${fileExt}`;

            // Upload ke bucket 'product-images' yang sudah ada di Supabase
            const { error: uploadError } = await supabase.storage
                .from('product-images')
                .upload(fileName, file, { upsert: true });

            if (uploadError) throw uploadError;

            // Dapatkan public URL
            const { data: { publicUrl } } = supabase.storage
                .from('product-images')
                .getPublicUrl(fileName);

            setProfile(prev => ({ ...prev, logo_url: publicUrl }));
            const originalKB = Math.round(e.target.files[0].size / 1024);
            const compressedKB = Math.round(file.size / 1024);
            toast.success(`Logo diunggah! (${originalKB}KB → ${compressedKB}KB). Jangan lupa Simpan.`);
        } catch (error) {
            toast.error('Gagal mengunggah logo: ' + error.message);
        } finally {
            setUploadingLogo(false);
            if (e.target) e.target.value = null;
        }
    };


    const handleAddCashier = async () => {
        if (!cashierForm.email || !cashierForm.password || !cashierForm.full_name) return;
        setAddingCashier(true);
        try {
            // Register new user via Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: cashierForm.email,
                password: cashierForm.password,
            });
            if (authError) throw authError;

            // Update the auto-created profile with role and owner info
            const { error: profileError } = await supabase
                .from('users')
                .upsert({
                    id: authData.user.id,
                    email: cashierForm.email,
                    full_name: cashierForm.full_name,
                    store_name: user.store_name,
                    role: 'cashier',
                    owner_id: user.id,
                }, { onConflict: 'id' });

            if (profileError) throw profileError;

            setCashierForm({ email: '', password: '', full_name: '' });
            setAddCashierModal(false);
            loadCashiers();
            toast.success('Akun kasir berhasil dibuat!');
            
            logActivity('ADD_CASHIER', { email: cashierForm.email, name: cashierForm.full_name }, user.id);
            loadActivities();
        } catch (err) {
            console.error(err);
            toast.error('Gagal menambah kasir: ' + err.message);
        } finally {
            setAddingCashier(false);
        }
    };

    const handleDeleteCashier = async (cashierId) => {
        try {
            // Delete from users table
            const { error: dbError } = await supabase.from('users').delete().eq('id', cashierId);
            if (dbError) throw dbError;

            // Note: Since we are moving to Static Export, deleting from auth.users 
            // requires a Service Role key which cannot be exposed to the frontend.
            // Deleting from the 'users' table is enough to revoke POS access.
            // manual cleanup in Supabase Auth recommended for ID: cashierId

            setDeleteConfirm(null);
            loadCashiers();
            toast.success('Akun kasir berhasil dihapus.');
            
            logActivity('DELETE_CASHIER', { id: cashierId }, user.id);
            loadActivities();
        } catch (err) {
            console.error(err);
            toast.error('Gagal menghapus kasir: ' + err.message);
        }
    };

    const handleEditCashier = async () => {
        if (!editCashierForm.full_name.trim()) {
            toast.error('Nama kasir tidak boleh kosong.');
            return;
        }
        setEditingCashier(true);
        try {
            const { error } = await supabase
                .from('users')
                .update({ full_name: editCashierForm.full_name.trim() })
                .eq('id', editCashierForm.id);
            if (error) throw error;
            setEditCashierModal(false);
            loadCashiers();
            toast.success('Data kasir berhasil diperbarui!');
        } catch (err) {
            console.error(err);
            toast.error('Gagal memperbarui kasir: ' + err.message);
        } finally {
            setEditingCashier(false);
        }
    };



    const handleResetApp = async () => {
        if (resetConfirmation !== 'HAPUS') {
            toast.error('Silakan ketik HAPUS untuk mengonfirmasi.');
            return;
        }
        setResetting(true);
        try {
            // 1. Clear IndexedDB (Products, Customers, Categories)
            await clearAllOfflineData();

            // 2. Clear Dashboard Store (Zustand Cache)
            useDashboardStore.getState().clearCache();

            // 3. Clear LocalStorage TTL keys
            localStorage.removeItem('warungku_products_cached_at');

            // 4. Clear CacheStorage (PWA)
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
            }

            // 5. Unregister Service Workers
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(registrations.map(reg => reg.unregister()));
            }

            toast.success('Sinkronisasi data berhasil! Memuat ulang...');
            
            logActivity('RESET_APP_CACHE', {}, user.id);
            
            // 6. Reload everything
            setTimeout(() => {
                window.location.reload(true);
            }, 1500);
        } catch (error) {
            console.error('Reset error:', error);
            toast.error('Gagal sinkron data: ' + error.message);
            setResetting(false);
        }
    };

    const isOwner = !user?.role || user?.role === 'owner';

    return (
        <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
            <PageHeader
                title="Pengaturan"
                description="Kelola profil, pengaturan aplikasi, dan tim toko Anda"
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Profile Card */}
                <div className="lg:col-span-8 space-y-6">
                    <Card>
                        <div className="flex items-center gap-6 mb-10 overflow-hidden relative">
                            {/* Decorative Background for Header */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                            
                            <div className="relative group shrink-0">
                                <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 text-indigo-400 border border-indigo-500/20 flex items-center justify-center text-2xl font-black shadow-inner ring-1 ring-white/5">
                                    {profile.full_name ? profile.full_name.charAt(0).toUpperCase() : '?'}
                                </div>
                            </div>

                            <div className="flex-1 space-y-1.5 relative z-10">
                                <h2 className="text-2xl font-black text-white tracking-tight">Profil Toko</h2>
                                <div className="flex flex-wrap items-center gap-2.5">
                                    <Badge variant={isOwner ? 'primary' : 'info'} className="px-3 py-1 font-black uppercase text-[9px] tracking-[0.15em] shadow-lg shadow-indigo-500/10 mb-1 sm:mb-0">
                                        {isOwner ? 'Store Owner' : 'Staff Kasir'}
                                    </Badge>
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                                        <Zap size={10} className="text-amber-400" />
                                        Bergabung: {user?.created_at && dayjs(user.created_at).format('MMM YYYY')}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <Input
                                    label="Nama Lengkap"
                                    icon={User}
                                    value={profile.full_name}
                                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                                    placeholder="Nama Anda"
                                />
                                <Input
                                    label="Nama Toko"
                                    icon={Store}
                                    value={profile.store_name}
                                    onChange={(e) => setProfile({ ...profile, store_name: e.target.value })}
                                    placeholder="Nama toko Anda"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <Input
                                    label="No. Telepon"
                                    icon={Phone}
                                    value={profile.phone}
                                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                    placeholder="08xxxxxxxxxx"
                                />
                                <Input
                                    label="Email"
                                    icon={Mail}
                                    value={profile.email}
                                    disabled
                                />
                            </div>

                            {isOwner && (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                                        <div>
                                            <Input
                                                label="Slogan / Header Struk"
                                                value={profile.receipt_header}
                                                onChange={(e) => setProfile({ ...profile, receipt_header: e.target.value })}
                                                placeholder="Cth: Belanja Hemat Harga Merakyat"
                                                maxLength={100}
                                            />
                                            <p className={`text-[10px] mt-1 font-medium tracking-tight ${profile.receipt_header.length >= 90 ? 'text-amber-400' : 'text-[var(--text-muted)]'}`}>
                                                {profile.receipt_header.length}/100 karakter
                                            </p>
                                        </div>
                                        <div>
                                            <Input
                                                label="Pesan Penutup / Footer Struk"
                                                value={profile.receipt_footer}
                                                onChange={(e) => setProfile({ ...profile, receipt_footer: e.target.value })}
                                                placeholder="Cth: Terima Kasih Atas Kunjungan Anda"
                                                maxLength={100}
                                            />
                                            <p className={`text-[10px] mt-1 font-medium tracking-tight ${profile.receipt_footer.length >= 90 ? 'text-amber-400' : 'text-[var(--text-muted)]'}`}>
                                                {profile.receipt_footer.length}/100 karakter
                                            </p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <Input
                                            type="number"
                                            label="Pajak PPN (%)"
                                            value={profile.tax_rate}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === '' || Number(val) >= 0) {
                                                    setProfile({ ...profile, tax_rate: val });
                                                }
                                            }}
                                            placeholder="Cth: 11"
                                            min="0"
                                        />
                                        <div>
                                            <label className="block text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                                                Ukuran Kertas Struk <span className="opacity-60 font-medium">(Printer Kasir)</span>
                                            </label>
                                            <div className="relative">
                                                <select
                                                    value={receiptSize}
                                                    onChange={(e) => setReceiptSize(e.target.value)}
                                                    className="w-full bg-[var(--surface-2)] border border-[var(--surface-border)] rounded-2xl px-4 py-3 text-[13px] font-medium text-[var(--text-primary)] focus:outline-none focus:ring-2 border-transparent focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]/50 transition-all cursor-pointer appearance-none"
                                                >
                                                    <option value="80mm">Standar Besar (80mm)</option>
                                                    <option value="58mm">Kecil Portable (58mm)</option>
                                                </select>
                                                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                                                    <ChevronDown size={14} className="text-[var(--text-muted)]" />
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-[var(--text-muted)] mt-1.5 leading-relaxed">
                                                *Pengaturan kertas disimpan lokal pada perangkat ini saja.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-6 pt-8 mt-4 border-t border-[var(--surface-border)]">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                                            <div>
                                                <h3 className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-[0.15em] mb-4 flex items-center gap-2">
                                                    <Upload size={14}/> Logo Toko
                                                </h3>
                                                <div className="flex items-center gap-5">
                                                    <div className="w-24 h-24 rounded-2xl bg-[var(--surface-2)] border-2 border-dashed border-[var(--surface-border)] flex items-center justify-center overflow-hidden transition-all hover:border-blue-500/50 group">
                                                        {profile.logo_url ? (
                                                            <img 
                                                                src={profile.logo_url} 
                                                                alt="Logo Toko" 
                                                                className="w-full h-full object-contain p-2" 
                                                                onError={(e) => {
                                                                    e.target.onerror = null;
                                                                    e.target.src = ''; // Fallback
                                                                }}
                                                            />
                                                        ) : (
                                                            <Store size={32} className="text-[var(--text-disabled)] transition-colors group-hover:text-blue-500/50" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1">
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={handleUploadLogo}
                                                            disabled={uploadingLogo}
                                                            id="logoUpload"
                                                            className="hidden"
                                                        />
                                                        <label
                                                            htmlFor="logoUpload"
                                                            className="inline-flex items-center px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 text-xs font-bold rounded-lg cursor-pointer transition-all uppercase tracking-wider"
                                                        >
                                                            {uploadingLogo ? 'Mengunggah...' : 'Pilih Gambar'}
                                                        </label>
                                                        <p className="text-[10px] leading-relaxed text-[var(--text-tertiary)] mt-2 font-medium">Resolusi 1:1 disarankan. Maksimal 2MB.</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <h3 className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-[0.15em] mb-4 flex items-center gap-2">
                                                    <Palette size={14}/> Tema Aplikasi
                                                </h3>
                                                <div className="flex flex-wrap gap-2.5">
                                                    {THEME_COLORS.map(theme => (
                                                        <button
                                                            key={theme.id}
                                                            onClick={() => setProfile({ ...profile, theme_color: theme.id })}
                                                            className={`w-9 h-9 rounded-full ${theme.color} border-4 transition-all ${profile.theme_color === theme.id ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100 hover:scale-105 cursor-pointer'}`}
                                                            title={theme.name}
                                                        />
                                                    ))}
                                                </div>
                                                <p className="text-[10px] text-[var(--text-tertiary)] mt-3 font-medium uppercase tracking-tight">Identitas visual toko Anda.</p>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className="flex flex-col sm:flex-row items-center gap-4 pt-6 mt-4 border-t border-[var(--surface-border)]">
                                <Button className="w-full sm:w-auto px-8" onClick={handleSaveProfile} loading={saving} icon={Save}>
                                    Simpan Perubahan
                                </Button>
                                {saved && (
                                    <div className="flex items-center justify-center sm:justify-start gap-1.5 text-emerald-400 text-xs font-bold uppercase tracking-widest animate-fade-in">
                                        <CheckCircle size={14} />
                                        <span>Berhasil Disimpan</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Sidebar Cards - Fixed Sticky Container */}
                <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-20">
                    {/* Team Management - Owner only */}
                    {isOwner ? (
                        <Card className="!p-0 overflow-hidden">
                            <div className="p-5 border-b border-[var(--surface-border)] flex items-center justify-between bg-[var(--surface-0)]/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0">
                                        <Users size={18} />
                                    </div>
                                    <h3 className="text-[15px] font-bold text-[var(--text-primary)]">Tim Kasir</h3>
                                </div>
                                <button 
                                    onClick={() => setAddCashierModal(true)}
                                    className="p-2 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500 text-xs font-bold hover:text-white transition-all transition-colors cursor-pointer"
                                >
                                    <UserPlus size={16} />
                                </button>
                            </div>

                            <div className="p-5">
                                {cashiers.length === 0 ? (
                                    <div className="text-center py-6">
                                        <div className="w-12 h-12 mx-auto bg-[var(--surface-2)] rounded-full flex items-center justify-center mb-3 text-[var(--text-muted)] opacity-50">
                                            <Users size={20} />
                                        </div>
                                        <p className="text-[var(--text-tertiary)] font-bold text-[11px] uppercase tracking-widest">Belum Ada Kasir</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {cashiers.map((cashier) => (
                                            <div
                                                key={cashier.id}
                                                className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-2)]/30 border border-[var(--surface-border)] group"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-9 h-9 rounded-full bg-[var(--surface-1)] border border-[var(--surface-border)] flex items-center justify-center text-xs font-bold text-blue-400 flex-shrink-0 shadow-sm">
                                                        {cashier.full_name ? cashier.full_name.charAt(0).toUpperCase() : '?'}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-[var(--text-primary)] truncate">{cashier.full_name}</p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                                                            <p className="text-[10px] font-medium text-[var(--text-tertiary)] truncate tracking-tight">{cashier.email}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => {
                                                            setEditCashierForm({ id: cashier.id, full_name: cashier.full_name || '' });
                                                            setEditCashierModal(true);
                                                        }}
                                                        className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-blue-500 transition-colors cursor-pointer"
                                                        title="Edit Kasir"
                                                    >
                                                        <Pencil size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteConfirm(cashier)}
                                                        className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-rose-500 transition-colors cursor-pointer"
                                                        title="Hapus Kasir"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </Card>
                    ) : (
                        <Card>
                            <div className="flex items-center gap-4">
                                <Shield size={24} className="text-amber-400" />
                                <div>
                                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Akses Terbatas</h3>
                                    <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Hanya Owner yang dapat mengelola tim.</p>
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* Change Password Card */}
                    <Card className="!p-0 overflow-hidden">
                        <div className="p-5 border-b border-[var(--surface-border)] flex items-center gap-3 bg-[var(--surface-0)]/50">
                            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center flex-shrink-0">
                                <KeyRound size={18} />
                            </div>
                            <h3 className="text-[15px] font-bold text-[var(--text-primary)]">Password</h3>
                        </div>
                        <div className="p-5">
                            <div className="flex items-start gap-4">
                                <div className="flex-1">
                                    <p className="text-[11px] text-[var(--text-tertiary)] leading-relaxed font-medium mb-4">
                                        Ganti password akun Anda secara berkala untuk menjaga keamanan.
                                    </p>
                                    <button
                                        onClick={() => setShowPasswordModal(true)}
                                        className="inline-flex items-center text-[11px] font-extrabold text-blue-500 hover:text-blue-400 uppercase tracking-widest transition-all gap-1.5 cursor-pointer"
                                    >
                                        Ganti Password &rarr;
                                    </button>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Maintenance Card */}
                    <Card className="!p-0 overflow-hidden">
                        <div className="p-5 border-b border-[var(--surface-border)] flex items-center gap-3 bg-[var(--surface-0)]/50">
                            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0">
                                <Zap size={18} />
                            </div>
                            <h3 className="text-[15px] font-bold text-[var(--text-primary)]">Sistem</h3>
                        </div>
                        
                        <div className="p-5">
                            <div className="flex items-start gap-4">
                                <div className="w-9 h-9 rounded-full bg-[var(--surface-2)] flex items-center justify-center flex-shrink-0 text-blue-400">
                                    <RotateCcw size={16} />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-[13px] font-bold text-[var(--text-primary)]">Reset Cache Aplikasi</h4>
                                    <p className="text-[11px] text-[var(--text-tertiary)] mt-1.5 leading-relaxed font-medium">
                                        Perbaiki masalah sinkronisasi atau pembaruan yang tertunda dengan membersihkan cache lokal.
                                    </p>
                                    <button
                                        onClick={() => setShowResetModal(true)}
                                        className="mt-4 inline-flex items-center text-[11px] font-extrabold text-blue-500 hover:text-blue-400 uppercase tracking-widest transition-all gap-1.5 cursor-pointer"
                                    >
                                        Bersihkan Sekarang &rarr;
                                    </button>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Audit Log / Recent Activity Section */}
            {isOwner && (
                <div className="space-y-4 pt-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-500/10 rounded-xl">
                                <Database className="text-indigo-400" size={18} />
                            </div>
                            <h2 className="text-lg font-black text-[var(--text-primary)] tracking-tight uppercase">Log Aktivitas Sistem</h2>
                        </div>
                        <Button variant="ghost" size="sm" onClick={loadActivities} loading={loadingActivities} icon={RotateCcw} className="text-[10px] font-bold tracking-widest uppercase">Refresh</Button>
                    </div>
                    
                    <Card className="!p-0 overflow-hidden border-indigo-500/10 bg-indigo-500/[0.02]">
                        {activities.length === 0 ? (
                            <div className="py-16 text-center">
                                <div className="w-16 h-16 rounded-full bg-[var(--surface-2)] flex items-center justify-center mx-auto mb-4 opacity-20">
                                    <History size={32} />
                                </div>
                                <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] opacity-80">Belum ada aktivitas tercatat</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-[var(--surface-border)]/30">
                                {activities.map((act) => {
                                    const getActionConfig = (action) => {
                                        if (action.includes('LOGIN')) return { icon: LogIn, color: 'text-blue-400', bg: 'bg-blue-500/10' };
                                        if (action.includes('LOGOUT')) return { icon: LogOut, color: 'text-orange-400', bg: 'bg-orange-500/10' };
                                        if (action.includes('DELETE')) return { icon: Trash2, color: 'text-rose-400', bg: 'bg-rose-500/10' };
                                        if (action.includes('CREATE') || action.includes('ADD') || action.includes('IMPORT')) return { icon: Plus, color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
                                        if (action.includes('UPDATE') || action.includes('EDIT')) return { icon: Pencil, color: 'text-amber-400', bg: 'bg-amber-500/10' };
                                        return { icon: History, color: 'text-indigo-400', bg: 'bg-indigo-500/10' };
                                    };
                                    
                                    const config = getActionConfig(act.action);
                                    
                                    return (
                                        <div key={act.id} className="p-5 flex items-start justify-between hover:bg-white/[0.02] transition-all group relative">
                                            <div className="flex items-start gap-4">
                                                {/* Icon with timeline dot */}
                                                <div className="relative">
                                                    <div className={cn(
                                                        "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm transition-transform group-hover:scale-110",
                                                        config.bg, config.color
                                                    )}>
                                                        <config.icon size={18} strokeWidth={2.5} />
                                                    </div>
                                                </div>

                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="text-[13px] font-black text-[var(--text-primary)] tracking-tight uppercase leading-none">
                                                            {act.action.replace(/_/g, ' ')}
                                                        </p>
                                                        {act.target_resource && (
                                                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20 uppercase tracking-tighter">
                                                                {act.target_resource}
                                                            </span>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-3">
                                                        <p className="text-[11px] text-[var(--text-muted)] font-bold flex items-center gap-1.5">
                                                            <Clock size={12} className="opacity-50" />
                                                            {dayjs(act.created_at).format('DD MMM • HH:mm')}
                                                        </p>
                                                        <span className="w-1 h-1 rounded-full bg-[var(--surface-border)]" />
                                                        <p className="text-[10px] text-[var(--text-muted)] font-mono opacity-50 flex items-center gap-1">
                                                            UID: <span className="text-[var(--text-tertiary)]">{act.user_id.slice(0, 8)}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Hover Details Panel */}
                                            <div className="hidden lg:flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
                                                <div className="text-[10px] font-mono text-[var(--text-tertiary)] bg-white/[0.03] border border-white/5 py-2 px-3 rounded-xl max-w-[240px] truncate shadow-sm">
                                                    {JSON.stringify(act.details)}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        <div className="p-6 bg-red-500/[0.03] border-t border-red-500/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex-1">
                                <h4 className="text-sm font-black text-[var(--text-primary)] tracking-tight uppercase">Zona Berbahaya: Reset Riwayat Store</h4>
                                <p className="text-[11px] text-[var(--text-muted)] mt-1">Gunakan ini untuk membersihkan semua data testing (transaksi, shift, dll) sebelum mulai secara resmi. <strong>Katalog produk & akun kasir tidak akan dihapus.</strong></p>
                            </div>
                            <Button 
                                variant="danger" 
                                size="sm" 
                                icon={Trash2} 
                                onClick={() => setShowHistoricalResetModal(true)}
                                className="text-[10px] font-bold tracking-widest uppercase"
                            >
                                Reset Riwayat Data
                            </Button>
                        </div>
                        <div className="p-4 bg-[var(--surface-2)]/30 border-t border-[var(--surface-border)]">
                            <p className="text-[9px] text-[var(--text-muted)] text-center font-bold uppercase tracking-[0.2em]">Data ini bersifat permanen dan hanya dapat diakses oleh Pemilik Toko</p>
                        </div>
                    </Card>
                </div>
            )}


            {/* Change Password Modal */}
            <Modal
                isOpen={showPasswordModal}
                onClose={() => {
                    setShowPasswordModal(false);
                    setPwForm({ current: '', newPw: '', confirm: '' });
                }}
                title="Ganti Password"
                size="sm"
                footer={
                    <div className="flex justify-end gap-3 w-full">
                        <Button variant="secondary" onClick={() => setShowPasswordModal(false)} disabled={savingPw}>Batal</Button>
                        <Button onClick={handleChangePassword} loading={savingPw} icon={KeyRound} disabled={!isPasswordStrong || pwForm.newPw !== pwForm.confirm || !pwForm.confirm}>Simpan Password</Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                        <p className="text-xs text-blue-300">Password baru minimal 6 karakter, kombinasikan huruf kapital, angka, dan simbol.</p>
                    </div>
                    {/* New Password */}
                    <div className="relative">
                        <Input
                            label="Password Baru *"
                            type={showPwFields.newPw ? 'text' : 'password'}
                            value={pwForm.newPw}
                            onChange={(e) => setPwForm({ ...pwForm, newPw: e.target.value })}
                            placeholder="Min. 6 karakter"
                        />
                        <button type="button" onClick={() => setShowPwFields(p => ({ ...p, newPw: !p.newPw }))}
                            className="absolute right-3 top-9 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
                            {showPwFields.newPw ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                    {/* Password Strength Indicator */}
                    {pwForm.newPw && (
                        <div className="space-y-1.5 px-1">
                            <div className="w-full h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ease-out ${pwStrength.color}`}
                                    style={{ width: pwStrength.width }}
                                />
                            </div>
                            <div className="flex justify-between items-center">
                                <p className={`text-[10px] font-bold uppercase tracking-widest ${pwStrength.textColor}`}>
                                    {pwStrength.label}
                                </p>
                                <div className="flex gap-1.5 text-[9px] text-[var(--text-muted)] font-medium">
                                    <span className={/[A-Z]/.test(pwForm.newPw) ? 'text-emerald-400' : ''}>ABC</span>
                                    <span className={/[0-9]/.test(pwForm.newPw) ? 'text-emerald-400' : ''}>123</span>
                                    <span className={/[^A-Za-z0-9]/.test(pwForm.newPw) ? 'text-emerald-400' : ''}>@#$</span>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* Confirm Password */}
                    <div className="relative">
                        <Input
                            label="Konfirmasi Password Baru *"
                            type={showPwFields.confirm ? 'text' : 'password'}
                            value={pwForm.confirm}
                            onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
                            placeholder="Ulangi password baru"
                        />
                        <button type="button" onClick={() => setShowPwFields(p => ({ ...p, confirm: !p.confirm }))}
                            className="absolute right-3 top-9 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
                            {showPwFields.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                    {/* Realtime match indicator */}
                    {pwForm.confirm && (
                        <p className={`text-[11px] font-semibold flex items-center gap-1.5 ${
                            pwForm.newPw === pwForm.confirm ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                            {pwForm.newPw === pwForm.confirm
                                ? <><CheckCircle size={12} /> Password cocok!</>
                                : '✗ Password tidak cocok'}
                        </p>
                    )}
                </div>
            </Modal>

            {/* Reset App Modal */}
            <Modal
                isOpen={showResetModal}
                onClose={() => {
                    setShowResetModal(false);
                    setResetConfirmation('');
                }}
                title="Reset Cache Aplikasi?"
                size="sm"
                footer={
                    <div className="flex justify-end gap-3 w-full">
                        <Button variant="secondary" onClick={() => {
                            setShowResetModal(false);
                            setResetConfirmation('');
                        }} disabled={resetting}>Batal</Button>
                        <Button variant="primary" onClick={handleResetApp} loading={resetting} disabled={resetConfirmation !== 'HAPUS'} icon={RotateCcw}>Ya, Bersihkan</Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <p className="text-[var(--text-secondary)] text-sm">
                        Aplikasi akan membersihkan file sampah (cache) dan melakukan muat ulang otomatis.
                    </p>
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <p className="text-xs text-amber-300 italic">
                            Catatan: Ini tidak akan menghapus data penjualan atau produk Anda.
                        </p>
                    </div>
                    <div className="pt-2">
                        <p className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-tertiary)] mb-2">Ketik &quot;HAPUS&quot; untuk konfirmasi</p>
                        <Input 
                            value={resetConfirmation}
                            onChange={(e) => setResetConfirmation(e.target.value)}
                            placeholder="HAPUS"
                            className="bg-[var(--surface-2)]"
                        />
                    </div>
                </div>
            </Modal>

            {/* Reset Historical Data Modal (ULTIMATE) */}
            <Modal
                isOpen={showHistoricalResetModal}
                onClose={() => {
                    setShowHistoricalResetModal(false);
                    setHistoricalResetConfirmation('');
                }}
                title="HAPUS SEMUA RIWAYAT DATA?"
                size="md"
                footer={
                    <div className="flex justify-end gap-3 w-full">
                        <Button variant="secondary" onClick={() => {
                            setShowHistoricalResetModal(false);
                            setHistoricalResetConfirmation('');
                        }} disabled={resettingHistorical}>Batal</Button>
                        <Button variant="danger" onClick={handleResetHistoricalData} loading={resettingHistorical} disabled={historicalResetConfirmation !== 'HAPUS RIWAYAT DATA'} icon={Trash2}>Ya, Hapus Permanen</Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                        <p className="text-sm font-bold text-red-500 flex items-center gap-2 mb-2">
                            <AlertCircle size={18} /> PERINGATAN KRITIS
                        </p>
                        <p className="text-xs text-red-500/80 leading-relaxed">
                            Tindakan ini akan **MENGHAPUS PERMANEN** semua data Transaksi, Pengeluaran, Riwayat Stok, dan Shift dari database. Data yang sudah dihapus **TIDAK DAPAT DIKEMBALIKAN**.
                        </p>
                    </div>
                    
                    <ul className="space-y-2 px-1">
                        <li className="flex items-center gap-2 text-xs text-[var(--text-secondary)]"><CheckCircle2 size={14} className="text-emerald-500" /> Katalog produk & Stok saat ini tetap disimpan.</li>
                        <li className="flex items-center gap-2 text-xs text-[var(--text-secondary)]"><CheckCircle2 size={14} className="text-emerald-500" /> Akun kasir Anda tetap aman.</li>
                        <li className="flex items-center gap-2 text-xs text-[var(--text-secondary)]"><CheckCircle2 size={14} className="text-emerald-500" /> Laporan statistik akan direset menjadi nol.</li>
                    </ul>

                    <div className="pt-4 border-t border-[var(--surface-border)]">
                        <p className="text-[10px] uppercase tracking-widest font-black text-red-500 mb-2">Ketik &quot;HAPUS RIWAYAT DATA&quot; untuk mengonfirmasi</p>
                        <Input 
                            value={historicalResetConfirmation}
                            onChange={(e) => setHistoricalResetConfirmation(e.target.value)}
                            placeholder="HAPUS RIWAYAT DATA"
                            className="bg-red-500/[0.03] border-red-500/20 focus:border-red-500"
                        />
                    </div>
                </div>
            </Modal>

            {/* Add Cashier Modal */}
            <Modal
                isOpen={addCashierModal}
                onClose={() => setAddCashierModal(false)}
                title="Tambah Akun Kasir"
                size="md"
                footer={
                    <div className="flex justify-end gap-3 w-full">
                        <Button variant="secondary" onClick={() => setAddCashierModal(false)}>Batal</Button>
                        <Button onClick={handleAddCashier} loading={addingCashier}>Buat Akun</Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 mb-4">
                        <p className="text-xs text-blue-300">Buat akun agar karyawan Anda dapat login dan menggunakan POS.</p>
                    </div>
                    <Input
                        label="Nama Kasir *"
                        icon={User}
                        value={cashierForm.full_name}
                        onChange={(e) => setCashierForm({ ...cashierForm, full_name: e.target.value })}
                        placeholder="Nama karyawan"
                    />
                    <Input
                        label="Email *"
                        icon={Mail}
                        type="email"
                        value={cashierForm.email}
                        onChange={(e) => setCashierForm({ ...cashierForm, email: e.target.value })}
                        placeholder="email@kasir.com"
                    />
                    <div className="relative">
                        <Input
                            label="Password *"
                            type={showPassword ? 'text' : 'password'}
                            value={cashierForm.password}
                            onChange={(e) => setCashierForm({ ...cashierForm, password: e.target.value })}
                            placeholder="Min. 6 karakter"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-9 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                        >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Delete Cashier Confirm */}
            <Modal
                isOpen={!!deleteConfirm}
                onClose={() => setDeleteConfirm(null)}
                title="Hapus Kasir?"
                size="sm"
                footer={
                    <div className="flex justify-end gap-3 w-full">
                        <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Batal</Button>
                        <Button variant="danger" onClick={() => handleDeleteCashier(deleteConfirm.id)}>Hapus</Button>
                    </div>
                }
            >
                <p className="text-[var(--text-secondary)] text-sm">
                    Hapus akun kasir <strong className="text-[var(--text-primary)]">{deleteConfirm?.full_name}</strong>? Akun ini tidak akan bisa login lagi.
                </p>
            </Modal>

            {/* Edit Cashier Modal */}
            <Modal
                isOpen={editCashierModal}
                onClose={() => setEditCashierModal(false)}
                title="Edit Data Kasir"
                size="sm"
                footer={
                    <div className="flex justify-end gap-3 w-full">
                        <Button variant="secondary" onClick={() => setEditCashierModal(false)} disabled={editingCashier}>Batal</Button>
                        <Button onClick={handleEditCashier} loading={editingCashier} icon={Save}>Simpan</Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <Input
                        label="Nama Kasir *"
                        icon={User}
                        value={editCashierForm.full_name}
                        onChange={(e) => setEditCashierForm({ ...editCashierForm, full_name: e.target.value })}
                        placeholder="Nama karyawan"
                    />
                </div>
            </Modal>

            {/* Version Display */}
            <div className="flex flex-col items-center justify-center pt-8 pb-4 opacity-30 select-none pointer-events-none">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-tertiary)]">WarungKu POS Pro</p>
                <p className="text-[9px] font-bold text-[var(--text-tertiary)] mt-1">Versi 7.0-launch (Stable)</p>
            </div>
        </div>
    );
}

export default withRBAC(SettingsPage, ['owner']);
