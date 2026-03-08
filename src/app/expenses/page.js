'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import {
    Wallet,
    Calendar,
    Plus,
    Edit2,
    Trash2,
    Save,
    Tag,
} from 'lucide-react';
import { formatRupiah, formatDateTime } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Table from '@/components/ui/Table';
import Input, { Select } from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import dayjs from 'dayjs';

const EXPENSE_CATEGORIES = [
    { id: 'bahan_baku', label: 'Bahan Baku & Stok' },
    { id: 'gaji', label: 'Gaji Karyawan' },
    { id: 'listrik_air', label: 'Listrik & Air' },
    { id: 'sewa', label: 'Sewa Tempat' },
    { id: 'operasional', label: 'Operasional Lainnya' },
    { id: 'pajak', label: 'Pajak & Retribusi' },
    { id: 'lainnya', label: 'Lain-lain' },
];

export default function ExpensesPage() {
    const { user, session } = useAuthStore();
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [month, setMonth] = useState(dayjs().format('YYYY-MM'));
    const [modal, setModal] = useState({ isOpen: false, data: null });
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });
    const [saving, setSaving] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        amount: '',
        category: 'lainnya',
        notes: '',
        expense_date: dayjs().format('YYYY-MM-DD'),
    });

    const isOwner = !user?.role || user?.role === 'owner';

    const loadExpenses = useCallback(async () => {
        if (!session) return;
        try {
            setLoading(true);
            const res = await fetch(`/api/expenses?month=${month}`, {
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                },
            });
            if (!res.ok) throw new Error('Gagal mengambil data pengeluaran');
            const data = await res.json();
            setExpenses(data);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    }, [session, month]);

    useEffect(() => {
        loadExpenses();
    }, [loadExpenses]);

    const openModal = (expense = null) => {
        if (expense) {
            setFormData({
                title: expense.title,
                amount: expense.amount.toString(),
                category: expense.category,
                notes: expense.notes || '',
                expense_date: expense.expense_date,
            });
        } else {
            setFormData({
                title: '',
                amount: '',
                category: 'lainnya',
                notes: '',
                expense_date: dayjs().format('YYYY-MM-DD'),
            });
        }
        setModal({ isOpen: true, data: expense });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const isEdit = !!modal.data;
            const url = isEdit ? `/api/expenses/${modal.data.id}` : '/api/expenses';
            const method = isEdit ? 'PUT' : 'POST';

            // Clean amount input (remove formatting if any)
            const cleanAmount = parseInt(formData.amount.replace(/\D/g, ''), 10);

            if (isNaN(cleanAmount) || cleanAmount <= 0) {
                throw new Error('Jumlah pengeluaran tidak valid');
            }

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    ...formData,
                    amount: cleanAmount,
                }),
            });

            if (!res.ok) throw new Error('Gagal menyimpan pengeluaran');

            setModal({ isOpen: false, data: null });
            loadExpenses();
        } catch (error) {
            alert(error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/expenses/${deleteModal.id}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                },
            });
            if (!res.ok) throw new Error('Gagal menghapus pengeluaran');
            setDeleteModal({ isOpen: false, id: null });
            loadExpenses();
        } catch (error) {
            alert(error.message);
        } finally {
            setSaving(false);
        }
    };

    const getCategoryLabel = (catId) => {
        const cat = EXPENSE_CATEGORIES.find(c => c.id === catId);
        return cat ? cat.label : catId;
    };

    const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);

    return (
        <div className="space-y-6 animate-fade-in relative z-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row shadow-lg glass border border-slate-800 rounded-2xl p-4 md:p-6 gap-4 justify-between items-start sm:items-center relative overflow-hidden bg-slate-900/60">
                <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />

                <div className="relative">
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Wallet size={28} className="text-rose-400" />
                        Pengeluaran
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">Catat dan pantau pengeluaran operasional toko</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto relative">
                    <div className="relative w-full sm:w-auto">
                        <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type="month"
                            value={month}
                            onChange={(e) => setMonth(e.target.value)}
                            className="w-full sm:w-auto bg-slate-800/50 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-white outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 transition-all shadow-inner"
                        />
                    </div>
                    {isOwner && (
                        <Button onClick={() => openModal()} className="relative w-full sm:w-auto shadow-lg shadow-rose-500/20 bg-rose-600 hover:bg-rose-500 text-white border-0">
                            <Plus size={18} className="mr-2" />
                            Tambah
                        </Button>
                    )}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="glass border-slate-800/60 shadow-xl overflow-hidden relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative">
                        <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center mb-3 text-rose-400">
                            <Wallet size={20} />
                        </div>
                        <p className="text-sm font-medium text-slate-400 mb-1">Total Pengeluaran Bulan Ini</p>
                        <h3 className="text-3xl font-bold text-white tracking-tight">{formatRupiah(totalExpenses)}</h3>
                    </div>
                </Card>
                <Card className="glass border-slate-800/60 shadow-xl overflow-hidden relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center mb-3 text-indigo-400">
                            <Tag size={20} />
                        </div>
                        <p className="text-sm font-medium text-slate-400 mb-1">Jumlah Transaksi</p>
                        <h3 className="text-3xl font-bold text-white tracking-tight">{expenses.length}</h3>
                    </div>
                </Card>
            </div>

            {/* Actions & List */}
            <Card className="p-0 overflow-hidden border-slate-800/60 shadow-xl shadow-black/10">
                <div className="overflow-x-auto">
                    <Table>
                        <thead>
                            <tr className="bg-slate-800/40 text-left">
                                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Tanggal</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Keterangan</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Kategori</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Jumlah</th>
                                {isOwner && <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Aksi</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                            {loading ? (
                                [...Array(3)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-800 rounded w-24"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-800 rounded w-48"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-800 rounded w-24"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-800 rounded w-32 ml-auto"></div></td>
                                        {isOwner && <td className="px-6 py-4"><div className="h-8 bg-slate-800 rounded w-20 ml-auto"></div></td>}
                                    </tr>
                                ))
                            ) : expenses.length === 0 ? (
                                <tr>
                                    <td colSpan={isOwner ? 5 : 4}>
                                        <EmptyState
                                            icon={Wallet}
                                            title="Belum Ada Pengeluaran"
                                            description={`Tidak ada catatan pengeluaran di bulan ${dayjs(month).format('MMMM YYYY')}.`}
                                            action={isOwner ? <Button onClick={() => openModal()} variant="secondary" className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10">Tambah Pengeluaran</Button> : null}
                                        />
                                    </td>
                                </tr>
                            ) : (
                                expenses.map((expense) => (
                                    <tr
                                        key={expense.id}
                                        className="hover:bg-slate-800/30 transition-colors group"
                                    >
                                        <td className="px-6 py-4 text-sm text-slate-300 font-medium whitespace-nowrap">
                                            {dayjs(expense.expense_date).format('DD MMM YYYY')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-white">{expense.title}</div>
                                            {expense.notes && (
                                                <div className="text-xs text-slate-500 mt-1 truncate max-w-xs">{expense.notes}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant="secondary" className="bg-slate-800 text-slate-300 border-slate-700">
                                                {getCategoryLabel(expense.category)}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="font-bold text-rose-400">{formatRupiah(expense.amount)}</div>
                                        </td>
                                        {isOwner && (
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => openModal(expense)}
                                                        className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors cursor-pointer"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteModal({ isOpen: true, id: expense.id })}
                                                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </Table>
                </div>
            </Card>

            {/* Add/Edit Modal */}
            <Modal
                isOpen={modal.isOpen}
                onClose={() => !saving && setModal({ isOpen: false, data: null })}
                title={modal.data ? 'Edit Pengeluaran' : 'Catat Pengeluaran Baru'}
            >
                <form onSubmit={handleSave} className="space-y-4">
                    <Input
                        label="Judul/Keterangan Singkat"
                        placeholder="Contoh: Beli sabun cuci, Bayar listrik"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Select
                            label="Kategori"
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        >
                            {EXPENSE_CATEGORIES.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.label}</option>
                            ))}
                        </Select>

                        <Input
                            label="Tanggal"
                            type="date"
                            value={formData.expense_date}
                            onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                            required
                        />
                    </div>

                    <Input
                        label="Jumlah (Rp)"
                        type="text"
                        placeholder="0"
                        value={formData.amount}
                        onChange={(e) => {
                            // Only allow numbers
                            const val = e.target.value.replace(/\D/g, '');
                            // Format with thousand separator if needed, or just plain number
                            setFormData({ ...formData, amount: val });
                        }}
                        icon={Wallet}
                        required
                    />
                    {formData.amount && (
                        <p className="text-xs text-rose-400 mt-1 pl-1">
                            Format: {formatRupiah(parseInt(formData.amount || 0, 10))}
                        </p>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Catatan Tambahan (Opsional)</label>
                        <textarea
                            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all placeholder-slate-500 resize-none"
                            placeholder="Detail pengeluaran..."
                            rows={3}
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                        <Button type="button" variant="secondary" onClick={() => setModal({ isOpen: false, data: null })} disabled={saving}>
                            Batal
                        </Button>
                        <Button type="submit" loading={saving} icon={Save} className="bg-rose-600 hover:bg-rose-500 text-white border-0">
                            Simpan
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Modal */}
            <Modal
                isOpen={deleteModal.isOpen}
                onClose={() => !saving && setDeleteModal({ isOpen: false, id: null })}
                title="Hapus Pengeluaran"
                size="sm"
            >
                <div>
                    <p className="text-slate-400 mb-6 mt-2">
                        Apakah Anda yakin ingin menghapus catatan pengeluaran ini? Laporan laba rugi mungkin akan terpengaruh.
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
