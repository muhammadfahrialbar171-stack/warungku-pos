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
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import Input, { Select } from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import PageHeader from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/Toast';
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

import { withRBAC } from '@/components/layout/withRBAC';

function ExpensesPage() {
    const { user, session } = useAuthStore();
    const toast = useToast();
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
        // Prevent event objects from being treated as expense data
        const isEvent = expense && expense.nativeEvent;
        const data = isEvent ? null : expense;

        if (data) {
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
        setModal({ isOpen: true, data });
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

            if (!res.ok) {
                const errData = await res.json().catch(() => null);
                throw new Error(errData?.error || 'Gagal menyimpan pengeluaran');
            }

            setModal({ isOpen: false, data: null });
            loadExpenses();
            toast.success(modal.data ? 'Pengeluaran berhasil diperbarui!' : 'Pengeluaran berhasil dicatat!');
        } catch (error) {
            toast.error(error.message);
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
            toast.success('Pengeluaran berhasil dihapus.');
        } catch (error) {
            toast.error(error.message);
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
            <PageHeader
                title="Pengeluaran"
                description="Catat dan pantau pengeluaran operasional toko"
                icon={<Wallet size={28} className="text-rose-400" />}
                action={
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto relative">
                        <div className="relative w-full sm:w-auto">
                            <Input
                                type="month"
                                value={month}
                                onChange={(e) => setMonth(e.target.value)}
                                icon={Calendar}
                            />
                        </div>
                        {isOwner && (
                            <Button onClick={() => openModal()} className="relative w-full sm:w-auto justify-center">
                                <Plus size={18} className="mr-2" />
                                Tambah
                            </Button>
                        )}
                    </div>
                }
            />

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="overflow-hidden relative">
                    <div className="relative">
                        <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center mb-3 text-rose-400">
                            <Wallet size={20} />
                        </div>
                        <p className="text-sm font-medium text-[var(--text-secondary)] mb-1">Total Pengeluaran Bulan Ini</p>
                        <h3 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">{formatRupiah(totalExpenses)}</h3>
                    </div>
                </Card>
                <Card className="overflow-hidden relative">
                    <div className="relative">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center mb-3 text-indigo-400">
                            <Tag size={20} />
                        </div>
                        <p className="text-sm font-medium text-[var(--text-secondary)] mb-1">Jumlah Transaksi</p>
                        <h3 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">{expenses.length}</h3>
                    </div>
                </Card>
            </div>

            {/* Actions & List */}
            <Card className="!p-0 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tanggal</TableHead>
                            <TableHead>Keterangan</TableHead>
                            <TableHead>Kategori</TableHead>
                            <TableHead align="right">Jumlah</TableHead>
                            {isOwner && <TableHead align="right">Aksi</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            [...Array(3)].map((_, i) => (
                                <TableRow key={i} className="animate-pulse">
                                    <TableCell><div className="h-4 bg-[var(--surface-border)] rounded w-24"></div></TableCell>
                                    <TableCell><div className="h-4 bg-[var(--surface-border)] rounded w-48"></div></TableCell>
                                    <TableCell><div className="h-4 bg-[var(--surface-border)] rounded w-24"></div></TableCell>
                                    <TableCell align="right"><div className="h-4 bg-[var(--surface-border)] rounded w-32 ml-auto"></div></TableCell>
                                    {isOwner && <TableCell align="right"><div className="h-8 bg-[var(--surface-border)] rounded w-20 ml-auto"></div></TableCell>}
                                </TableRow>
                            ))
                        ) : expenses.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={isOwner ? 5 : 4}>
                                    <EmptyState
                                        icon={Wallet}
                                        title="Belum Ada Pengeluaran"
                                        description={`Tidak ada catatan pengeluaran di bulan ${dayjs(month).format('MMMM YYYY')}.`}
                                        action={isOwner ? <Button onClick={() => openModal()} variant="secondary" className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10">Tambah Pengeluaran</Button> : null}
                                    />
                                </TableCell>
                            </TableRow>
                        ) : (
                            expenses.map((expense) => (
                                <TableRow key={expense.id}>
                                    <TableCell className="text-sm text-[var(--text-secondary)] font-medium whitespace-nowrap">
                                        {dayjs(expense.expense_date).format('DD MMM YYYY')}
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium text-[var(--text-primary)]">{expense.title}</div>
                                        {expense.notes && (
                                            <div className="text-xs text-[var(--text-muted)] mt-1 truncate max-w-xs">{expense.notes}</div>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="bg-[var(--surface-2)] text-[var(--text-secondary)] border-[var(--surface-border)]">
                                            {getCategoryLabel(expense.category)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell align="right">
                                        <div className="font-bold text-rose-400">{formatRupiah(expense.amount)}</div>
                                    </TableCell>
                                    {isOwner && (
                                        <TableCell align="right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => openModal(expense)}
                                                    className="p-2 text-[var(--text-secondary)] hover:text-indigo-400 hover:bg-[var(--surface-2)] rounded-lg transition-colors cursor-pointer"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteModal({ isOpen: true, id: expense.id })}
                                                    className="p-2 text-[var(--text-secondary)] hover:text-rose-400 hover:bg-[var(--surface-2)] rounded-lg transition-colors cursor-pointer"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* Add/Edit Modal */}
            <Modal
                isOpen={modal.isOpen}
                onClose={() => !saving && setModal({ isOpen: false, data: null })}
                title={modal.data ? 'Edit Pengeluaran' : 'Catat Pengeluaran Baru'}
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
                <form id="expense-form" onSubmit={handleSave} className="space-y-4">
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
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Catatan Tambahan (Opsional)</label>
                        <textarea
                            className="w-full bg-[var(--surface-0)] border border-[var(--surface-border)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all placeholder-[var(--text-muted)] resize-none shadow-sm"
                            placeholder="Detail pengeluaran..."
                            rows={3}
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>
                </form>
            </Modal>

            {/* Delete Modal */}
            <Modal
                isOpen={deleteModal.isOpen}
                onClose={() => !saving && setDeleteModal({ isOpen: false, id: null })}
                title="Hapus Pengeluaran"
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
                <div>
                    <p className="text-[var(--text-secondary)] mb-6 mt-2">
                        Apakah Anda yakin ingin menghapus catatan pengeluaran ini? Laporan laba rugi mungkin akan terpengaruh.
                    </p>
                </div>
            </Modal>
        </div>
    );
}

export default withRBAC(ExpensesPage, ['owner']);
