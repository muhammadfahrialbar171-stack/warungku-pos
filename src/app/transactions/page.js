'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Receipt,
    Search,
    Calendar,
    Eye,
    Download,
    Printer,
    Share2,
    ChevronDown,
} from 'lucide-react';
import Card, { StatCard } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input, { Select } from '@/components/ui/Input';
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import EmptyState from '@/components/ui/EmptyState';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { formatRupiah, formatDateTime } from '@/lib/utils';
import { printReceipt, shareReceiptWhatsApp } from '@/lib/receipt';
import { exportTransactionsToExcel } from '@/lib/export';
import dayjs from 'dayjs';
import PageHeader from '@/components/ui/PageHeader';

const PAGE_SIZE = 50;

import { withRBAC } from '@/components/layout/withRBAC';

function TransactionsPage() {
    const { user } = useAuthStore();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [detailModal, setDetailModal] = useState(null);
    const [detailItems, setDetailItems] = useState([]);
    const [dateFrom, setDateFrom] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
    const [dateTo, setDateTo] = useState(dayjs().format('YYYY-MM-DD'));
    const [search, setSearch] = useState('');
    const [paymentFilter, setPaymentFilter] = useState('all');
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [totalCount, setTotalCount] = useState(0);

    const loadTransactions = useCallback(async (reset = true) => {
        if (!user) return;
        const currentPage = reset ? 0 : page;
        if (reset) {
            setLoading(true);
            setTransactions([]);
            setPage(0);
        } else {
            setLoadingMore(true);
        }
        const safetyTimeout = setTimeout(() => {
            setLoading(false);
            setLoadingMore(false);
        }, 8000);

        try {
            const from = currentPage * PAGE_SIZE;
            const to = from + PAGE_SIZE - 1;

            const { data, count } = await supabase
                .from('transactions')
                .select('*, customers(name)', { count: 'exact' })
                .eq('user_id', user.owner_id || user.id)
                .gte('created_at', dayjs(dateFrom).startOf('day').toISOString())
                .lte('created_at', dayjs(dateTo).endOf('day').toISOString())
                .order('created_at', { ascending: false })
                .range(from, to);

            const newData = data || [];
            if (reset) {
                setTransactions(newData);
            } else {
                setTransactions(prev => [...prev, ...newData]);
            }
            setTotalCount(count || 0);
            setHasMore(newData.length === PAGE_SIZE);
            setPage(currentPage + 1);
        } catch (err) {
            console.error(err);
        } finally {
            clearTimeout(safetyTimeout);
            setLoading(false);
            setLoadingMore(false);
        }
    }, [user?.id, user?.owner_id, dateFrom, dateTo]);

    useEffect(() => { loadTransactions(true); }, [loadTransactions]);

    const viewDetail = async (tx) => {
        setDetailModal(tx);
        const { data } = await supabase
            .from('transaction_items')
            .select('*')
            .eq('transaction_id', tx.id);
        setDetailItems(data || []);
    };

    const filtered = transactions.filter((tx) => {
        const q = search.toLowerCase();
        const matchesSearch = !q ||
            tx.invoice_number.toLowerCase().includes(q) ||
            tx.customers?.name?.toLowerCase().includes(q);
        const matchesPayment = paymentFilter === 'all' || tx.payment_method === paymentFilter;
        return matchesSearch && matchesPayment;
    });

    const totalAmount = filtered.reduce((sum, tx) => sum + tx.total_amount, 0);

    const paymentMethodLabel = (m) => {
        const map = { cash: 'Tunai', debit: 'Debit', qris: 'QRIS' };
        return map[m] || m;
    };

    return (
        <div className="space-y-5 animate-fade-in pb-10">
            <PageHeader
                title="Transaksi"
                description={`${totalCount.toLocaleString('id-ID')} transaksi ditemukan`}
                action={
                    <Button
                        variant="secondary"
                        icon={Download}
                        size="sm"
                        onClick={() => exportTransactionsToExcel(filtered, `transaksi-${dateFrom}-${dateTo}`)}
                        disabled={filtered.length === 0}
                    >
                        Excel
                    </Button>
                }
            />

            {/* Filters */}
            <div className="bg-[var(--surface-1)] border border-[var(--surface-border)] p-2 rounded-xl flex flex-col lg:flex-row gap-2">
                <div className="flex-1">
                    <Input
                        placeholder="Cari nomor invoice..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        icon={Search}
                        className="bg-transparent border-none focus:ring-0"
                    />
                </div>
                <div className="flex flex-wrap lg:flex-nowrap gap-2">
                    <Select
                        className="bg-transparent border-none focus:ring-0 text-sm"
                        value={paymentFilter}
                        onChange={(e) => setPaymentFilter(e.target.value)}
                    >
                        <option value="all">Semua Metode</option>
                        <option value="cash">Tunai</option>
                        <option value="qris">QRIS</option>
                        <option value="debit">Debit</option>
                    </Select>
                    <div className="flex items-center gap-2 bg-[var(--surface-2)]/50 px-3 rounded-lg border border-[var(--surface-border)]">
                        <Input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="bg-transparent border-none p-0 h-9 text-xs"
                        />
                        <span className="text-[var(--text-muted)]">-</span>
                        <Input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="bg-transparent border-none p-0 h-9 text-xs"
                        />
                    </div>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard title="Total Penjualan" value={formatRupiah(totalAmount)} color="blue" subtitle={`${filtered.length} Transaksi`} />
                <StatCard title="Rata-rata / Tx" value={formatRupiah(filtered.length > 0 ? totalAmount / filtered.length : 0)} color="emerald" />
                <StatCard title="Metode Tunai" value={formatRupiah(filtered.filter(t => t.payment_method === 'cash').reduce((s,t) => s + t.total_amount, 0))} color="amber" />
                <StatCard title="Metode Non-Tunai" value={formatRupiah(filtered.filter(t => t.payment_method !== 'cash').reduce((s,t) => s + t.total_amount, 0))} color="indigo" />
            </div>

            {/* Transaction List */}
            {loading ? (
                <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-20 skeleton rounded-xl" />)}</div>
            ) : filtered.length === 0 ? (
                <EmptyState icon={Receipt} title="Belum Ada Transaksi" description="Data transaksi akan muncul di sini setelah penjualan." />
            ) : (
                <>
                <Card className="!p-0 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Invoice</TableHead>
                                <TableHead className="hidden sm:table-cell">Pelanggan</TableHead>
                                <TableHead className="hidden sm:table-cell">Tanggal</TableHead>
                                <TableHead className="hidden md:table-cell" align="center">Pembayaran</TableHead>
                                <TableHead align="right">Total</TableHead>
                                <TableHead align="center">Status</TableHead>
                                <TableHead align="center"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map((tx) => (
                                <TableRow key={tx.id}>
                                    <TableCell isFirst>{tx.invoice_number}</TableCell>
                                    <TableCell className="hidden sm:table-cell text-[var(--text-secondary)]">{tx.customers?.name || '-'}</TableCell>
                                    <TableCell className="hidden sm:table-cell text-[var(--text-secondary)] text-xs">{formatDateTime(tx.created_at)}</TableCell>
                                    <TableCell className="hidden md:table-cell" align="center">
                                        <Badge variant="info">{paymentMethodLabel(tx.payment_method)}</Badge>
                                    </TableCell>
                                    <TableCell align="right" className="font-bold text-[var(--text-primary)]">{formatRupiah(tx.total_amount)}</TableCell>
                                    <TableCell align="center">
                                        <Badge variant={tx.status === 'completed' ? 'success' : 'warning'}>
                                            {tx.status === 'completed' ? 'Lunas' : 'Pending'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell align="center">
                                        <button onClick={() => viewDetail(tx)} className="p-2 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer">
                                            <Eye size={16} />
                                        </button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>

                {/* Load More */}
                {hasMore && (
                    <div className="flex justify-center pt-2">
                        <Button
                            variant="secondary"
                            icon={ChevronDown}
                            onClick={() => loadTransactions(false)}
                            loading={loadingMore}
                        >
                            {loadingMore ? 'Memuat...' : `Muat Lebih Banyak`}
                        </Button>
                    </div>
                )}
                {!hasMore && transactions.length > 0 && (
                    <p className="text-center text-[11px] text-[var(--text-muted)] font-medium py-2">
                        Menampilkan {filtered.length} dari {totalCount.toLocaleString('id-ID')} transaksi
                    </p>
                )}
                </>
            )}

            {/* Detail Modal */}
            <Modal isOpen={!!detailModal} onClose={() => setDetailModal(null)} title="Detail Transaksi" size="md">
                {detailModal && (
                    <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div><p className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Nomor Invoice</p><p className="text-sm font-bold">{detailModal.invoice_number}</p></div>
                            <div><p className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Pelanggan</p><p className="text-sm">{detailModal.customers?.name || '-'}</p></div>
                            <div><p className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Waktu</p><p className="text-sm">{formatDateTime(detailModal.created_at)}</p></div>
                            <div><p className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Pembayaran</p><p className="text-sm font-semibold text-[var(--color-primary)]">{paymentMethodLabel(detailModal.payment_method)}</p></div>
                        </div>

                        <div className="pt-4 border-t border-[var(--surface-border)]">
                            <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Item Belanja</h4>
                            <div className="space-y-2">
                                {detailItems.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-2)]/50 border border-[var(--surface-border)]">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold truncate">{item.product_name}</p>
                                            <p className="text-[11px] text-[var(--text-muted)]">{formatRupiah(item.price)} x {item.quantity}</p>
                                        </div>
                                        <p className="text-sm font-bold">{formatRupiah(item.subtotal)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="pt-4 border-t border-[var(--surface-border)] space-y-4">
                            <div className="flex justify-between items-center bg-[var(--surface-2)] p-4 rounded-xl">
                                <span className="font-bold">Total Pembayaran</span>
                                <span className="text-xl font-bold text-[var(--color-primary)]">{formatRupiah(detailModal.total_amount)}</span>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="secondary"
                                    className="flex-1"
                                    icon={Printer}
                                    onClick={() => printReceipt({
                                        storeName: user?.store_name,
                                        invoiceNumber: detailModal.invoice_number,
                                        customerName: detailModal.customers?.name,
                                        items: detailItems,
                                        totalAmount: detailModal.total_amount,
                                        totalItems: detailModal.total_items,
                                        paymentMethod: detailModal.payment_method,
                                        paidAmount: detailModal.paid_amount,
                                        change: detailModal.change_amount,
                                        taxAmount: detailModal.tax_amount,
                                        discountAmount: detailModal.discount_amount,
                                        createdAt: detailModal.created_at,
                                        logoUrl: user?.logo_url,
                                        receiptHeader: user?.receipt_header,
                                        receiptFooter: user?.receipt_footer,
                                    })}
                                >
                                    Cetak
                                </Button>
                                <Button
                                    variant="secondary"
                                    className="flex-1"
                                    icon={Share2}
                                    onClick={() => shareReceiptWhatsApp({
                                        storeName: user?.store_name,
                                        invoiceNumber: detailModal.invoice_number,
                                        customerName: detailModal.customers?.name,
                                        items: detailItems,
                                        totalAmount: detailModal.total_amount,
                                        taxAmount: detailModal.tax_amount,
                                        discountAmount: detailModal.discount_amount,
                                        paymentMethod: detailModal.payment_method,
                                        createdAt: detailModal.created_at,
                                        receiptHeader: user?.receipt_header,
                                        receiptFooter: user?.receipt_footer,
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

export default withRBAC(TransactionsPage, ['owner']);
