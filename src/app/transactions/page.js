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
import EmptyState from '@/components/ui/EmptyState';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { formatRupiah, formatDateTime, formatDate } from '@/lib/utils';
import { printReceipt, shareReceiptWhatsApp } from '@/lib/receipt';
import { exportTransactionsToExcel } from '@/lib/export';
import dayjs from 'dayjs';

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
                .select('*')
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Riwayat Transaksi</h1>
                    <p className="text-slate-400 text-sm mt-1">Lihat semua transaksi yang telah dilakukan</p>
                </div>
                <Button
                    variant="secondary"
                    icon={Download}
                    onClick={() => exportTransactionsToExcel(filtered, `transaksi-${dateFrom}-${dateTo}`)}
                    disabled={filtered.length === 0}
                >
                    Export Excel
                </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text" placeholder="Cari nomor invoice..." value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    />
                </div>
                <div className="flex gap-2">
                    <div className="relative">
                        <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                            className="bg-slate-800/50 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                    </div>
                    <div className="relative">
                        <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                            className="bg-slate-800/50 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                    </div>
                </div>
            </div>

            {/* Summary */}
            <div className="flex gap-4 flex-wrap">
                <Card className="flex-1 min-w-[180px]">
                    <p className="text-sm text-slate-400">Total Transaksi</p>
                    <p className="text-2xl font-bold text-white mt-1">{filtered.length}</p>
                </Card>
                <Card className="flex-1 min-w-[180px]">
                    <p className="text-sm text-slate-400">Total Penjualan</p>
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
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-700">
                                    <th className="text-left text-xs font-medium text-slate-400 uppercase px-5 py-3">Invoice</th>
                                    <th className="text-left text-xs font-medium text-slate-400 uppercase px-5 py-3 hidden sm:table-cell">Tanggal</th>
                                    <th className="text-left text-xs font-medium text-slate-400 uppercase px-5 py-3 hidden md:table-cell">Pembayaran</th>
                                    <th className="text-right text-xs font-medium text-slate-400 uppercase px-5 py-3">Total</th>
                                    <th className="text-right text-xs font-medium text-slate-400 uppercase px-5 py-3">Status</th>
                                    <th className="text-right text-xs font-medium text-slate-400 uppercase px-5 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {filtered.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-5 py-3.5 text-sm font-medium text-white">{tx.invoice_number}</td>
                                        <td className="px-5 py-3.5 text-sm text-slate-400 hidden sm:table-cell">{formatDateTime(tx.created_at)}</td>
                                        <td className="px-5 py-3.5 hidden md:table-cell">
                                            <Badge variant="info">{paymentMethodLabel(tx.payment_method)}</Badge>
                                        </td>
                                        <td className="px-5 py-3.5 text-right text-sm font-semibold text-white">{formatRupiah(tx.total_amount)}</td>
                                        <td className="px-5 py-3.5 text-right">
                                            <Badge variant={tx.status === 'completed' ? 'success' : 'warning'}>
                                                {tx.status === 'completed' ? 'Lunas' : 'Pending'}
                                            </Badge>
                                        </td>
                                        <td className="px-5 py-3.5 text-right">
                                            <button onClick={() => viewDetail(tx)} className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer">
                                                <Eye size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Detail Modal */}
            <Modal isOpen={!!detailModal} onClose={() => setDetailModal(null)} title="Detail Transaksi" size="md">
                {detailModal && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div><p className="text-slate-500">Invoice</p><p className="text-white font-medium">{detailModal.invoice_number}</p></div>
                            <div><p className="text-slate-500">Tanggal</p><p className="text-white">{formatDateTime(detailModal.created_at)}</p></div>
                            <div><p className="text-slate-500">Pembayaran</p><p className="text-white">{paymentMethodLabel(detailModal.payment_method)}</p></div>
                            <div><p className="text-slate-500">Status</p><Badge variant="success">Lunas</Badge></div>
                        </div>

                        <div className="border-t border-slate-700 pt-4">
                            <h4 className="text-sm font-medium text-slate-300 mb-3">Item Transaksi</h4>
                            <div className="space-y-2">
                                {detailItems.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-700/30">
                                        <div>
                                            <p className="text-sm text-white">{item.product_name}</p>
                                            <p className="text-xs text-slate-500">{formatRupiah(item.price)} x {item.quantity}</p>
                                        </div>
                                        <p className="text-sm font-semibold text-white">{formatRupiah(item.subtotal)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="border-t border-slate-700 pt-3 space-y-3">
                            <div className="flex justify-between text-lg font-bold">
                                <span className="text-slate-300">Total</span>
                                <span className="text-white">{formatRupiah(detailModal.total_amount)}</span>
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
                                        items: detailItems,
                                        totalAmount: detailModal.total_amount,
                                        totalItems: detailModal.total_items,
                                        paymentMethod: detailModal.payment_method,
                                        createdAt: detailModal.created_at,
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
