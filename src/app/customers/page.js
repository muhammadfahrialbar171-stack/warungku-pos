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
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import Input, { Textarea } from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import PageHeader from '@/components/ui/PageHeader';

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
            <PageHeader
                title="Pelanggan (CRM)"
                description="Kelola data pelanggan dan poin member"
                action={
                    isOwner && (
                        <Button onClick={() => openModal()} className="relative w-full sm:w-auto">
                            <Plus size={18} className="mr-2" />
                            Tambah Pelanggan
                        </Button>
                    )
                }
            />

            {/* Actions & List */}
            <Card className="!p-0 overflow-hidden">
                <div className="p-4 md:p-6 border-b border-[var(--surface-border)] bg-[var(--surface-0)]">
                    <div className="max-w-md">
                        <Input
                            placeholder="Cari nama atau no WA pelanggan..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            icon={Search}
                        />
                    </div>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Info Pelanggan</TableHead>
                            <TableHead>Kontak & Alamat</TableHead>
                            <TableHead>Poin</TableHead>
                            <TableHead>Terdaftar Sejak</TableHead>
                            {isOwner && <TableHead align="right">Aksi</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            [...Array(3)].map((_, i) => (
                                <TableRow key={i} className="animate-pulse">
                                    <TableCell><div className="h-4 bg-[var(--surface-2)] rounded w-3/4"></div></TableCell>
                                    <TableCell><div className="h-4 bg-[var(--surface-2)] rounded w-1/2"></div></TableCell>
                                    <TableCell><div className="h-4 bg-[var(--surface-2)] rounded w-1/4"></div></TableCell>
                                    <TableCell><div className="h-4 bg-[var(--surface-2)] rounded w-2/3"></div></TableCell>
                                    {isOwner && <TableCell><div className="h-8 bg-[var(--surface-2)] rounded w-20 ml-auto"></div></TableCell>}
                                </TableRow>
                            ))
                        ) : customers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={isOwner ? 5 : 4}>
                                    <EmptyState
                                        icon={Users}
                                        title="Belum Ada Pelanggan"
                                        description="Data pelanggan yang ditambahkan akan muncul di sini."
                                        action={isOwner ? <Button onClick={() => openModal()} variant="secondary">Tambah Pelanggan</Button> : null}
                                    />
                                </TableCell>
                            </TableRow>
                        ) : (
                            customers.map((customer) => (
                                <React.Fragment key={customer.id}>
                                    <TableRow>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-[var(--surface-2)] border border-[var(--surface-border)] text-indigo-400 flex items-center justify-center font-bold flex-shrink-0">
                                                    {customer.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <button
                                                        onClick={() => loadTxHistory(customer.id)}
                                                        className="text-sm font-semibold text-[var(--text-primary)] hover:text-indigo-400 transition-colors flex items-center gap-1 cursor-pointer"
                                                    >
                                                        {customer.name}
                                                        {expandedCustomer === customer.id
                                                            ? <ChevronUp size={14} className="text-indigo-400" />
                                                            : <ChevronDown size={14} className="text-[var(--text-muted)]" />
                                                        }
                                                    </button>
                                                    <p className="text-xs text-[var(--text-muted)] mt-0.5">Klik untuk lihat riwayat</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] mb-1">
                                                <Phone size={14} className="text-emerald-400 flex-shrink-0" />
                                                <span>{customer.phone || '-'}</span>
                                            </div>
                                            <div className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                                                <MapPin size={14} className="text-rose-400 flex-shrink-0 mt-0.5" />
                                                <span className="truncate max-w-[200px]">{customer.address || '-'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="warning" className="flex items-center gap-1 w-max shadow-sm">
                                                <Star size={12} className="fill-amber-400 text-amber-400" />
                                                {customer.total_points || 0} Poin
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm font-medium text-[var(--text-secondary)]">
                                            {formatDateTime(customer.created_at)}
                                        </TableCell>
                                        {isOwner && (
                                            <TableCell align="right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => openModal(customer)}
                                                        className="p-2 rounded-lg bg-[var(--surface-2)] hover:bg-indigo-500/20 text-[var(--text-secondary)] hover:text-indigo-400 transition-colors cursor-pointer"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteModal({ isOpen: true, id: customer.id })}
                                                        className="p-2 rounded-lg bg-[var(--surface-2)] hover:bg-rose-500/20 text-[var(--text-secondary)] hover:text-rose-400 transition-colors cursor-pointer"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                    
                                    {/* Transaction History Expansion Row */}
                                    {expandedCustomer === customer.id && (
                                        <TableRow className="bg-[var(--surface-2)]/30 hover:bg-[var(--surface-2)]/30">
                                            <TableCell colSpan={isOwner ? 5 : 4}>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <ShoppingBag size={16} className="text-indigo-400" />
                                                    <span className="text-sm font-semibold text-indigo-400">Riwayat Transaksi</span>
                                                </div>
                                                {txLoading[customer.id] ? (
                                                    <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm py-2">
                                                        <Loader2 size={16} className="animate-spin" /> Memuat...
                                                    </div>
                                                ) : !txHistory[customer.id] || !Array.isArray(txHistory[customer.id]) || txHistory[customer.id].length === 0 ? (
                                                    <p className="text-sm text-[var(--text-muted)] py-2">Tidak ada riwayat transaksi.</p>
                                                ) : (
                                                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                                        {txHistory[customer.id].map(tx => (
                                                            <div key={tx.id} className="flex items-center justify-between bg-[var(--surface-1)] rounded-xl px-4 py-2.5 border border-[var(--surface-border)]">
                                                                <div>
                                                                    <p className="text-sm font-medium text-[var(--text-primary)]">{tx.invoice_number}</p>
                                                                    <p className="text-xs text-[var(--text-muted)]">{formatDateTime(tx.created_at)}</p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-sm font-bold text-emerald-400">{formatRupiah(tx.total_amount)}</p>
                                                                    <p className="text-xs text-[var(--text-muted)] capitalize">{tx.payment_method}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </React.Fragment>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* Add/Edit Modal */}
            <Modal
                isOpen={modal.isOpen}
                onClose={() => !saving && setModal({ isOpen: false, data: null })}
                title={modal.data ? 'Edit Pelanggan' : 'Tambah Pelanggan Baru'}
                footer={
                    <div className="flex justify-end gap-3 w-full">
                        <Button type="button" variant="secondary" onClick={() => setModal({ isOpen: false, data: null })} disabled={saving}>
                            Batal
                        </Button>
                        <Button type="button" onClick={handleSave} loading={saving} icon={Save}>
                            Simpan
                        </Button>
                    </div>
                }
            >
                <form id="customer-form" onSubmit={handleSave} className="space-y-4">
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
                    <Textarea
                        label="Alamat"
                        placeholder="Alamat pelanggan..."
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                </form>
            </Modal>

            {/* Delete Modal */}
            <Modal
                isOpen={deleteModal.isOpen}
                onClose={() => !saving && setDeleteModal({ isOpen: false, id: null })}
                title="Hapus Pelanggan"
                size="sm"
                footer={
                    <div className="flex justify-end gap-3 w-full">
                        <Button variant="secondary" onClick={() => setDeleteModal({ isOpen: false, id: null })} disabled={saving}>
                            Batal
                        </Button>
                        <Button variant="danger" onClick={handleDelete} loading={saving}>
                            Ya, Hapus
                        </Button>
                    </div>
                }
            >
                <p className="text-[var(--text-secondary)]">
                    Apakah Anda yakin ingin menghapus pelanggan ini? Data riwayat poin mungkin akan terpengaruh.
                </p>
            </Modal>
        </div>
    );
}
