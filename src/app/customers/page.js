'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { formatDateTime, formatRupiah, cn } from '@/lib/utils';
import {
    Users, Search, Plus, Edit2, Trash2, Save, MapPin, Phone, Star,
    ChevronDown, ChevronUp, ShoppingBag, Loader2
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Table from '@/components/ui/Table';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';

export default function CustomersPage() {
    const { user, session } = useAuthStore();
    const toast = useToast();
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [modal, setModal] = useState({ isOpen: false, data: null });
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });
    const [saving, setSaving] = useState(false);
    const [expandedCustomer, setExpandedCustomer] = useState(null);
    const [txHistory, setTxHistory] = useState({});
    const [txLoading, setTxLoading] = useState({});

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        address: '',
    });

    const isOwner = !user?.role || user?.role === 'owner';

    const loadCustomers = useCallback(async () => {
        if (!session) return;
        try {
            setLoading(true);
            const res = await fetch(`/api/customers?search=${encodeURIComponent(search)}`, {
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                },
            });
            if (!res.ok) throw new Error('Gagal mengambil data pelanggan');
            const data = await res.json();
            setCustomers(data);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    }, [session, search]);

    useEffect(() => {
        const debounce = setTimeout(loadCustomers, 300);
        return () => clearTimeout(debounce);
    }, [loadCustomers]);

    const openModal = (customer = null) => {
        if (customer) {
            setFormData({
                name: customer.name,
                phone: customer.phone || '',
                address: customer.address || '',
            });
        } else {
            setFormData({ name: '', phone: '', address: '' });
        }
        setModal({ isOpen: true, data: customer });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const isEdit = !!modal.data;
            const url = isEdit ? `/api/customers/${modal.data.id}` : '/api/customers';
            const method = isEdit ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => null);
                throw new Error(errData?.error || 'Gagal menyimpan pelanggan');
            }

            setModal({ isOpen: false, data: null });
            loadCustomers();
            toast.success(modal.data ? 'Data pelanggan diperbarui!' : 'Pelanggan berhasil ditambahkan!');
        } catch (error) {
            toast.error(error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/customers/${deleteModal.id}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                },
            });
            if (!res.ok) throw new Error('Gagal menghapus pelanggan');
            setDeleteModal({ isOpen: false, id: null });
            loadCustomers();
            toast.success('Pelanggan berhasil dihapus.');
        } catch (error) {
            toast.error(error.message);
        } finally {
            setSaving(false);
        }
    };

    const loadTxHistory = async (customerId) => {
        if (txHistory[customerId]) {
            // Toggle: collapse if already expanded
            setExpandedCustomer(prev => prev === customerId ? null : customerId);
            return;
        }
        setExpandedCustomer(customerId);
        setTxLoading(prev => ({ ...prev, [customerId]: true }));
        try {
            const res = await fetch(`/api/customers/${customerId}/transactions`, {
                headers: { Authorization: `Bearer ${session?.access_token}` },
            });
            const data = await res.json();
            setTxHistory(prev => ({ ...prev, [customerId]: data }));
        } catch (e) {
            console.error(e);
        } finally {
            setTxLoading(prev => ({ ...prev, [customerId]: false }));
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row shadow-sm glass border border-slate-800 rounded-2xl p-4 md:p-6 gap-4 justify-between items-start sm:items-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />

                <div className="relative">
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Users size={28} className="text-indigo-400" />
                        Pelanggan (CRM)
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">Kelola data pelanggan dan poin member</p>
                </div>

                {isOwner && (
                    <Button onClick={() => openModal()} className="relative w-full sm:w-auto bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 border-0 shadow-lg shadow-indigo-500/25">
                        <Plus size={18} className="mr-2" />
                        Tambah Pelanggan
                    </Button>
                )}
            </div>

            {/* Actions & List */}
            <Card className="!p-0 overflow-hidden bg-slate-800/20 backdrop-blur-xl border-white/5 shadow-xl shadow-black/10">
                <div className="p-4 md:p-6 border-b border-white/5 bg-slate-800/40">
                    <div className="relative max-w-md">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                            placeholder="Cari nama atau no WA pelanggan..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="bg-slate-800/40 backdrop-blur-md border hover:border-slate-600 border-slate-700/50 shadow-inner"
                            icon={Search}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-800/40 border-b border-white/5 text-left">
                                <th className="px-6 py-4 text-xs font-semibold text-slate-300 uppercase tracking-wider">Info Pelanggan</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-300 uppercase tracking-wider">Kontak & Alamat</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-300 uppercase tracking-wider">Poin</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-300 uppercase tracking-wider">Terdaftar Sejak</th>
                                {isOwner && <th className="px-6 py-4 text-xs font-semibold text-slate-300 uppercase tracking-wider text-right">Aksi</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                [...Array(3)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-800 rounded w-3/4"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-800 rounded w-1/2"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-800 rounded w-1/4"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-800 rounded w-2/3"></div></td>
                                        {isOwner && <td className="px-6 py-4"><div className="h-8 bg-slate-800 rounded w-20 ml-auto"></div></td>}
                                    </tr>
                                ))
                            ) : customers.length === 0 ? (
                                <tr>
                                    <td colSpan={isOwner ? 5 : 4}>
                                        <EmptyState
                                            icon={Users}
                                            title="Belum Ada Pelanggan"
                                            description="Data pelanggan yang ditambahkan akan muncul di sini."
                                            action={isOwner ? <Button onClick={() => openModal()} variant="secondary" className="bg-slate-800/50 backdrop-blur-md border-slate-700/50 hover:bg-slate-700/50 shadow-sm">Tambah Pelanggan</Button> : null}
                                        />
                                    </td>
                                </tr>
                            ) : (
                                customers.map((customer) => (
                                    <React.Fragment key={customer.id}>
                                        <tr
                                            className="hover:bg-slate-800/40 transition-colors duration-200 group"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-white/5 text-indigo-400 flex items-center justify-center font-bold flex-shrink-0">
                                                        {customer.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <button
                                                            onClick={() => loadTxHistory(customer.id)}
                                                            className="text-sm font-semibold text-white hover:text-indigo-300 transition-colors flex items-center gap-1 cursor-pointer"
                                                        >
                                                            {customer.name}
                                                            {expandedCustomer === customer.id
                                                                ? <ChevronUp size={14} className="text-indigo-400" />
                                                                : <ChevronDown size={14} className="text-slate-500" />
                                                            }
                                                        </button>
                                                        <p className="text-xs text-slate-500 mt-0.5">Klik untuk lihat riwayat</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 space-y-1">
                                                <div className="flex items-center gap-2 text-sm text-slate-400">
                                                    <Phone size={14} className="text-emerald-400 flex-shrink-0" />
                                                    <span>{customer.phone || '-'}</span>
                                                </div>
                                                <div className="flex items-start gap-2 text-sm text-slate-400">
                                                    <MapPin size={14} className="text-rose-400 flex-shrink-0 mt-0.5" />
                                                    <span className="truncate max-w-[200px]">{customer.address || '-'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant="warning" className="flex items-center gap-1 w-max shadow-sm">
                                                    <Star size={12} className="fill-amber-400 text-amber-400" />
                                                    {customer.total_points || 0} Poin
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-slate-500">
                                                {formatDateTime(customer.created_at)}
                                            </td>
                                            {isOwner && (
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                        <button
                                                            onClick={() => openModal(customer)}
                                                            className="p-2 rounded-xl bg-slate-700/50 hover:bg-indigo-500/20 text-slate-300 hover:text-indigo-400 transition-all cursor-pointer"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => setDeleteModal({ isOpen: true, id: customer.id })}
                                                            className="p-2 rounded-xl bg-slate-700/50 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 transition-all cursor-pointer"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                        {/* Transaction History Expansion Row */}
                                        {expandedCustomer === customer.id && (
                                            <tr className="bg-slate-800/30">
                                                <td colSpan={isOwner ? 5 : 4} className="px-6 py-4">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <ShoppingBag size={16} className="text-indigo-400" />
                                                        <span className="text-sm font-semibold text-indigo-300">Riwayat Transaksi</span>
                                                    </div>
                                                    {txLoading[customer.id] ? (
                                                        <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
                                                            <Loader2 size={16} className="animate-spin" /> Memuat...
                                                        </div>
                                                    ) : !txHistory[customer.id] || txHistory[customer.id].length === 0 ? (
                                                        <p className="text-sm text-slate-500 py-2">Tidak ada riwayat transaksi.</p>
                                                    ) : (
                                                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                                            {txHistory[customer.id].map(tx => (
                                                                <div key={tx.id} className="flex items-center justify-between bg-slate-800/50 rounded-xl px-4 py-2.5 border border-white/5">
                                                                    <div>
                                                                        <p className="text-sm font-medium text-white">{tx.invoice_number}</p>
                                                                        <p className="text-xs text-slate-500">{formatDateTime(tx.created_at)}</p>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <p className="text-sm font-bold text-emerald-400">{formatRupiah(tx.total_amount)}</p>
                                                                        <p className="text-xs text-slate-500 capitalize">{tx.payment_method}</p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Add/Edit Modal */}
            <Modal
                isOpen={modal.isOpen}
                onClose={() => !saving && setModal({ isOpen: false, data: null })}
                title={modal.data ? 'Edit Pelanggan' : 'Tambah Pelanggan Baru'}
            >
                <form onSubmit={handleSave} className="space-y-4">
                    <Input
                        label="Nama Pelanggan"
                        placeholder="Masukkan nama pelanggan..."
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />
                    <Input
                        label="Nomor WhatsApp"
                        placeholder="Contoh: 08123456789"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Alamat</label>
                        <textarea
                            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all placeholder-slate-500 resize-none"
                            placeholder="Alamat pelanggan..."
                            rows={3}
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                        <Button type="button" variant="secondary" onClick={() => setModal({ isOpen: false, data: null })} disabled={saving}>
                            Batal
                        </Button>
                        <Button type="submit" loading={saving} icon={Save}>
                            Simpan
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Modal */}
            <Modal
                isOpen={deleteModal.isOpen}
                onClose={() => !saving && setDeleteModal({ isOpen: false, id: null })}
                title="Hapus Pelanggan"
                size="sm"
            >
                <div>
                    <p className="text-slate-400 mb-6">
                        Apakah Anda yakin ingin menghapus pelanggan ini? Data riwayat poin mungkin akan terpengaruh.
                    </p>
                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" onClick={() => setDeleteModal({ isOpen: false, id: null })} disabled={saving}>
                            Batal
                        </Button>
                        <Button variant="danger" onClick={handleDelete} loading={saving}>
                            Ya, Hapus
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
