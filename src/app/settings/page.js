'use client';

import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { formatDate } from '@/lib/utils';

export default function SettingsPage() {
    const { user } = useAuthStore();
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [profile, setProfile] = useState({
        full_name: '',
        store_name: '',
        phone: '',
        email: '',
        receipt_header: '',
        receipt_footer: '',
    });

    // Multi-user state
    const [cashiers, setCashiers] = useState([]);
    const [addCashierModal, setAddCashierModal] = useState(false);
    const [cashierForm, setCashierForm] = useState({ email: '', password: '', full_name: '' });
    const [addingCashier, setAddingCashier] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (user) {
            setProfile({
                full_name: user.full_name || '',
                store_name: user.store_name || '',
                phone: user.phone || '',
                email: user.email || '',
                receipt_header: user.receipt_header || '',
                receipt_footer: user.receipt_footer || '',
            });
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

    const handleSaveProfile = async () => {
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
                })
                .eq('id', user.id);

            if (error) throw error;
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            console.error(err);
            alert('Gagal menyimpan profil: ' + err.message);
        } finally {
            setSaving(false);
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
        } catch (err) {
            console.error(err);
            alert('Gagal menambah kasir: ' + err.message);
        } finally {
            setAddingCashier(false);
        }
    };

    const handleDeleteCashier = async (cashierId) => {
        try {
            await supabase.from('users').delete().eq('id', cashierId);
            setDeleteConfirm(null);
            loadCashiers();
        } catch (err) {
            console.error(err);
            alert('Gagal menghapus kasir: ' + err.message);
        }
    };

    const isOwner = !user?.role || user?.role === 'owner';

    return (
        <div className="space-y-6 animate-fade-in max-w-3xl">
            <div>
                <h1 className="text-2xl font-bold text-white">Pengaturan</h1>
                <p className="text-slate-400 text-sm mt-1">Kelola profil dan pengaturan toko Anda</p>
            </div>

            {/* Profile Card */}
            <Card>
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold">
                        {profile.full_name ? profile.full_name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-white">Profil Toko</h2>
                        <div className="flex items-center gap-2">
                            <Badge variant={isOwner ? 'primary' : 'info'}>
                                {isOwner ? 'Owner' : 'Kasir'}
                            </Badge>
                            <span className="text-xs text-slate-500">Bergabung {user?.created_at && formatDate(user.created_at)}</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                            <Input
                                label="Slogan / Header Struk"
                                value={profile.receipt_header}
                                onChange={(e) => setProfile({ ...profile, receipt_header: e.target.value })}
                                placeholder="Cth: Belanja Hemat Harga Merakyat"
                            />
                            <Input
                                label="Pesan Penutup / Footer Struk"
                                value={profile.receipt_footer}
                                onChange={(e) => setProfile({ ...profile, receipt_footer: e.target.value })}
                                placeholder="Cth: Terima Kasih Atas Kunjungan Anda"
                            />
                        </div>
                    )}

                    <div className="flex items-center gap-3 pt-2">
                        <Button onClick={handleSaveProfile} loading={saving} icon={Save}>
                            Simpan Profil
                        </Button>
                        {saved && (
                            <div className="flex items-center gap-1.5 text-emerald-400 text-sm animate-fade-in">
                                <CheckCircle size={16} />
                                <span>Tersimpan!</span>
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            {/* Team Management - Owner only */}
            {isOwner && (
                <Card>
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                                <Users size={20} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-white">Tim Kasir</h2>
                                <p className="text-sm text-slate-400">Kelola akun karyawan kasir</p>
                            </div>
                        </div>
                        <Button size="sm" icon={UserPlus} onClick={() => setAddCashierModal(true)}>
                            Tambah Kasir
                        </Button>
                    </div>

                    {cashiers.length === 0 ? (
                        <div className="text-center py-8">
                            <Users size={40} className="mx-auto text-slate-600 mb-3" />
                            <p className="text-slate-500 text-sm">Belum ada kasir</p>
                            <p className="text-slate-600 text-xs mt-1">Tambah akun kasir agar karyawan bisa mengoperasikan POS</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {cashiers.map((cashier) => (
                                <div
                                    key={cashier.id}
                                    className="flex items-center justify-between p-4 rounded-xl bg-slate-700/20 border border-slate-700"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-slate-700 flex items-center justify-center text-white text-sm font-bold">
                                            {cashier.full_name ? cashier.full_name.charAt(0).toUpperCase() : '?'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-white">{cashier.full_name}</p>
                                            <p className="text-xs text-slate-500">{cashier.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="info">Kasir</Badge>
                                        <button
                                            onClick={() => setDeleteConfirm(cashier)}
                                            className="p-2 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            )}

            {/* Cashier info */}
            {!isOwner && (
                <Card>
                    <div className="flex items-center gap-3">
                        <Shield size={20} className="text-amber-400" />
                        <div>
                            <h3 className="text-sm font-medium text-white">Mode Kasir</h3>
                            <p className="text-xs text-slate-400">Anda login sebagai kasir. Beberapa fitur seperti produk, laporan, dan pengaturan hanya bisa diakses oleh owner.</p>
                        </div>
                    </div>
                </Card>
            )}

            {/* Add Cashier Modal */}
            <Modal isOpen={addCashierModal} onClose={() => setAddCashierModal(false)} title="Tambah Akun Kasir" size="md">
                <div className="space-y-4">
                    <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                        <p className="text-xs text-indigo-300">Buat akun baru untuk karyawan Anda. Mereka hanya dapat mengakses halaman Kasir dan Dashboard.</p>
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
                            className="absolute right-3 top-9 text-slate-500 hover:text-white cursor-pointer"
                        >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <Button variant="secondary" className="flex-1" onClick={() => setAddCashierModal(false)}>Batal</Button>
                        <Button className="flex-1" onClick={handleAddCashier} loading={addingCashier}>Buat Akun Kasir</Button>
                    </div>
                </div>
            </Modal>

            {/* Delete Cashier Confirm */}
            <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Hapus Kasir?" size="sm">
                <div className="space-y-4">
                    <p className="text-slate-300 text-sm">
                        Hapus akun kasir <strong className="text-white">{deleteConfirm?.full_name}</strong> ({deleteConfirm?.email})? Akun ini tidak akan bisa login lagi.
                    </p>
                    <div className="flex gap-3">
                        <Button variant="secondary" className="flex-1" onClick={() => setDeleteConfirm(null)}>Batal</Button>
                        <Button variant="danger" className="flex-1" onClick={() => handleDeleteCashier(deleteConfirm.id)}>Hapus</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
