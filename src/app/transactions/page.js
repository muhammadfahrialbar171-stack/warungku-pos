'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Receipt,
    Search,
    Calendar,
    Eye,
    ChevronDown,
    Download,
    Printer,
    Share2,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import EmptyState from '@/components/ui/EmptyState';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { formatRupiah, formatDateTime, formatDate } from '@/lib/utils';
import { printReceipt, shareReceiptWhatsApp } from '@/lib/receipt';
import { exportTransactionsToExcel } from '@/lib/export';
import dayjs from 'dayjs';
import PageHeader from '@/components/ui/PageHeader';

export default function TransactionsPage() {
    const { user } = useAuthStore();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [detailModal, setDetailModal] = useState(null);
    const [detailItems, setDetailItems] = useState([]);
    const [dateFrom, setDateFrom] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
    const [dateTo, setDateTo] = useState(dayjs().format('YYYY-MM-DD'));
    const [search, setSearch] = useState('');

    const loadTransactions = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data } = await supabase
                .from('transactions')
                .select('*, customers(name)')
                .eq('user_id', user.id)
                .gte('created_at', dayjs(dateFrom).startOf('day').toISOString())
                .lte('created_at', dayjs(dateTo).endOf('day').toISOString())
                .order('created_at', { ascending: false });

            setTransactions(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [user, dateFrom, dateTo]);

    useEffect(() => { loadTransactions(); }, [loadTransactions]);

    const viewDetail = async (tx) => {
        setDetailModal(tx);
        const { data } = await supabase
            .from('transaction_items')
            .select('*')
            .eq('transaction_id', tx.id);
        setDetailItems(data || []);
    };

    const filtered = transactions.filter((tx) =>
        tx.invoice_number.toLowerCase().includes(search.toLowerCase())
    );

    const totalAmount = filtered.reduce((sum, tx) => sum + tx.total_amount, 0);

    const paymentMethodLabel = (m) => {
        const map = { cash: 'Tunai', debit: 'Debit', qris: 'QRIS' };
        return map[m] || m;
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <PageHeader
                title="Riwayat Transaksi"
                description="Lihat semua transaksi yang telah dilakukan"
                action={
                    <Button
                        variant="secondary"
                        icon={Download}
                        onClick={() => exportTransactionsToExcel(filtered, `transaksi-${dateFrom}-${dateTo}`)}
                        disabled={filtered.length === 0}
                    >
                        Export Excel
                    </Button>
                }
            />

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                    <Input
                        placeholder="Cari nomor invoice..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        icon={Search}
                    />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <div className="flex-1 sm:w-40">
                        <Input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            icon={Calendar}
                        />
                    </div>
                    <div className="flex-1 sm:w-40">
                        <Input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            icon={Calendar}
                        />
                    </div>
                </div>
            </div>

            {/* Summary */}
            <div className="flex gap-4 flex-wrap">
                <Card className="flex-1 min-w-[180px]">
                    <p className="text-sm text-[var(--text-secondary)]">Total Transaksi</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{filtered.length}</p>
                </Card>
                <Card className="flex-1 min-w-[180px]">
                    <p className="text-sm text-[var(--text-secondary)]">Total Penjualan</p>
                    <p className="text-2xl font-bold text-emerald-400 mt-1">{formatRupiah(totalAmount)}</p>
                </Card>
            </div>

            {/* Transaction List */}
            {loading ? (
                <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>
            ) : filtered.length === 0 ? (
                <EmptyState icon={Receipt} title="Belum ada transaksi" description="Transaksi akan muncul di sini setelah checkout dari kasir." />
            ) : (
                <Card className="!p-0 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Invoice</TableHead>
                                <TableHead className="hidden sm:table-cell">Pelanggan</TableHead>
                                <TableHead className="hidden sm:table-cell">Tanggal</TableHead>
                                <TableHead className="hidden md:table-cell">Pembayaran</TableHead>
                                <TableHead align="right">Total</TableHead>
                                <TableHead align="right">Status</TableHead>
                                <TableHead align="right"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map((tx) => (
                                <TableRow key={tx.id}>
                                    <TableCell className="font-medium">{tx.invoice_number}</TableCell>
                                    <TableCell className="hidden sm:table-cell text-[var(--text-secondary)]">{tx.customers?.name || '-'}</TableCell>
                                    <TableCell className="hidden sm:table-cell text-[var(--text-secondary)]">{formatDateTime(tx.created_at)}</TableCell>
                                    <TableCell className="hidden md:table-cell">
                                        <Badge variant="info">{paymentMethodLabel(tx.payment_method)}</Badge>
                                    </TableCell>
                                    <TableCell align="right" className="font-semibold">{formatRupiah(tx.total_amount)}</TableCell>
                                    <TableCell align="right">
                                        <Badge variant={tx.status === 'completed' ? 'success' : 'warning'}>
                                            {tx.status === 'completed' ? 'Lunas' : 'Pending'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell align="right">
                                        <button onClick={() => viewDetail(tx)} className="p-2 rounded-lg bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer">
                                            <Eye size={16} />
                                        </button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            )}

            {/* Detail Modal */}
            <Modal isOpen={!!detailModal} onClose={() => setDetailModal(null)} title="Detail Transaksi" size="md">
                {detailModal && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div><p className="text-[var(--text-muted)]">Invoice</p><p className="text-[var(--text-primary)] font-medium">{detailModal.invoice_number}</p></div>
                            <div><p className="text-[var(--text-muted)]">Pelanggan</p><p className="text-[var(--text-primary)]">{detailModal.customers?.name || '-'}</p></div>
                            <div><p className="text-[var(--text-muted)]">Tanggal</p><p className="text-[var(--text-primary)]">{formatDateTime(detailModal.created_at)}</p></div>
                            <div><p className="text-[var(--text-muted)]">Pembayaran</p><p className="text-[var(--text-primary)]">{paymentMethodLabel(detailModal.payment_method)}</p></div>
                        </div>

                        <div className="border-t border-[var(--surface-border)] pt-4">
                            <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-3">Item Transaksi</h4>
                            <div className="space-y-2">
                                {detailItems.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-0)] border border-[var(--surface-border)]">
                                        <div>
                                            <p className="text-sm text-[var(--text-primary)]">{item.product_name}</p>
                                            <p className="text-xs text-[var(--text-muted)]">{formatRupiah(item.price)} x {item.quantity}</p>
                                        </div>
                                        <p className="text-sm font-semibold text-[var(--text-primary)]">{formatRupiah(item.subtotal)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="border-t border-[var(--surface-border)] pt-4 space-y-4">
                            <div className="flex justify-between text-lg font-bold">
                                <span className="text-[var(--text-secondary)]">Total</span>
                                <span className="text-emerald-400">{formatRupiah(detailModal.total_amount)}</span>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    icon={Printer}
                                    className="flex-1"
                                    onClick={() => printReceipt({
                                        storeName: user?.store_name,
                                        invoiceNumber: detailModal.invoice_number,
                                        customerName: detailModal.customers?.name,
                                        items: detailItems,
                                        totalAmount: detailModal.total_amount,
                                        totalItems: detailModal.total_items,
                                        paymentMethod: detailModal.payment_method,
                                        createdAt: detailModal.created_at,
                                        logoUrl: user?.logo_url,
                                    })}
                                >
                                    Cetak Struk
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    icon={Share2}
                                    className="flex-1"
                                    onClick={() => shareReceiptWhatsApp({
                                        storeName: user?.store_name,
                                        invoiceNumber: detailModal.invoice_number,
                                        customerName: detailModal.customers?.name,
                                        items: detailItems,
                                        totalAmount: detailModal.total_amount,
                                        paymentMethod: detailModal.payment_method,
                                        createdAt: detailModal.created_at,
                                    })}
                                >
                                    WhatsApp
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
