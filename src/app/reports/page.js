'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    BarChart3,
    Calendar,
    TrendingUp,
    DollarSign,
    ShoppingBag,
    Download,
    Wallet,
    PiggyBank,
} from 'lucide-react';
import { StatCard } from '@/components/ui/Card';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { formatRupiah, formatDate, cn } from '@/lib/utils';
import { exportTransactionsToExcel, exportDailySummaryToExcel } from '@/lib/export';
import { exportTransactionsPDF, exportDailySummaryPDF } from '@/lib/pdf-export';
import dayjs from 'dayjs';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler);

export default function ReportsPage() {
    const { user } = useAuthStore();
    const [period, setPeriod] = useState('daily');
    const [dateFrom, setDateFrom] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
    const [dateTo, setDateTo] = useState(dayjs().format('YYYY-MM-DD'));
    const [transactions, setTransactions] = useState([]);
    const [transactionItems, setTransactionItems] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadReport = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [txRes, txItemsRes, expRes] = await Promise.all([
                supabase
                    .from('transactions')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('status', 'completed')
                    .gte('created_at', dayjs(dateFrom).startOf('day').toISOString())
                    .lte('created_at', dayjs(dateTo).endOf('day').toISOString())
                    .order('created_at', { ascending: true }),
                // also fetch transaction_items to calculate COGS
                supabase
                    .from('transaction_items')
                    .select('transaction_id, quantity, cost_price')
                    .in('transaction_id', (
                        await supabase
                            .from('transactions')
                            .select('id')
                            .eq('user_id', user.id)
                            .eq('status', 'completed')
                            .gte('created_at', dayjs(dateFrom).startOf('day').toISOString())
                            .lte('created_at', dayjs(dateTo).endOf('day').toISOString())
                    ).data?.map(t => t.id) || []),
                supabase
                    .from('expenses')
                    .select('*')
                    .eq('user_id', user.id)
                    .gte('expense_date', dayjs(dateFrom).format('YYYY-MM-DD'))
                    .lte('expense_date', dayjs(dateTo).format('YYYY-MM-DD'))
            ]);

            setTransactions(txRes.data || []);
            setTransactionItems(txItemsRes.data || []);
            setExpenses(expRes.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [user, dateFrom, dateTo]);

    useEffect(() => { loadReport(); }, [loadReport]);

    // Aggregate data
    const totalSales = transactions.reduce((sum, t) => sum + t.total_amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    // COGS calculation
    let totalCogs = 0;
    const cogsPerTx = {};
    transactionItems.forEach(item => {
        const itemCogs = (item.cost_price || 0) * (item.quantity || 1);
        totalCogs += itemCogs;
        if (!cogsPerTx[item.transaction_id]) cogsPerTx[item.transaction_id] = 0;
        cogsPerTx[item.transaction_id] += itemCogs;
    });

    const grossProfit = totalSales - totalCogs;
    const netProfit = grossProfit - totalExpenses;

    const totalTransactions = transactions.length;
    const totalItems = transactions.reduce((sum, t) => sum + (t.total_items || 0), 0);
    const avgTransaction = totalTransactions > 0 ? Math.round(totalSales / totalTransactions) : 0;

    // Chart data
    const groupedData = {};
    transactions.forEach((tx) => {
        const key = period === 'daily'
            ? dayjs(tx.created_at).format('DD MMM')
            : dayjs(tx.created_at).format('MMM YYYY');

        if (!groupedData[key]) {
            groupedData[key] = { sales: 0, count: 0, cogs: 0, expense: 0, gross: 0, profit: 0 };
        }
        groupedData[key].sales += tx.total_amount;
        groupedData[key].count += 1;
        groupedData[key].cogs += (cogsPerTx[tx.id] || 0);
        groupedData[key].gross = groupedData[key].sales - groupedData[key].cogs;
        groupedData[key].profit = groupedData[key].gross - groupedData[key].expense;
    });

    expenses.forEach((exp) => {
        const key = period === 'daily'
            ? dayjs(exp.expense_date).format('DD MMM')
            : dayjs(exp.expense_date).format('MMM YYYY');

        if (!groupedData[key]) {
            groupedData[key] = { sales: 0, count: 0, cogs: 0, expense: 0, gross: 0, profit: 0 };
        }
        groupedData[key].expense += exp.amount;
        groupedData[key].profit = groupedData[key].gross - groupedData[key].expense;
    });

    const labels = Object.keys(groupedData).sort((a, b) => dayjs(a, period === 'daily' ? 'DD MMM' : 'MMM YYYY').valueOf() - dayjs(b, period === 'daily' ? 'DD MMM' : 'MMM YYYY').valueOf());
    const salesData = labels.map((key) => groupedData[key].sales);
    const countData = labels.map((key) => groupedData[key].count);

    const chartData = {
        labels,
        datasets: [
            {
                label: 'Penjualan',
                data: salesData,
                backgroundColor: 'rgba(99, 102, 241, 0.3)',
                borderColor: 'rgba(99, 102, 241, 1)',
                borderWidth: 2,
                borderRadius: 8,
                fill: true,
                tension: 0.4,
            },
        ],
    };

    const countChartData = {
        labels,
        datasets: [
            {
                label: 'Transaksi',
                data: countData,
                backgroundColor: 'rgba(34, 197, 94, 0.3)',
                borderColor: 'rgba(34, 197, 94, 1)',
                borderWidth: 2,
                borderRadius: 8,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#1e293b',
                borderColor: '#475569',
                borderWidth: 1,
                titleColor: '#f1f5f9',
                bodyColor: '#94a3b8',
                cornerRadius: 12,
                padding: 12,
            },
        },
        scales: {
            x: {
                grid: { color: 'rgba(71, 85, 105, 0.2)' },
                ticks: { color: '#94a3b8', font: { size: 11 } },
            },
            y: {
                grid: { color: 'rgba(71, 85, 105, 0.2)' },
                ticks: {
                    color: '#94a3b8',
                    font: { size: 11 },
                    callback: (value) => {
                        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                        if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                        return value;
                    },
                },
            },
        },
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Laporan Penjualan</h1>
                    <p className="text-slate-400 text-sm mt-1">Analisis performa bisnis Anda</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="secondary"
                        icon={Download}
                        onClick={() => exportTransactionsToExcel(transactions, `laporan-transaksi-${dateFrom}-${dateTo}`)}
                        disabled={transactions.length === 0}
                    >
                        Excel
                    </Button>
                    <Button
                        variant="secondary"
                        icon={Download}
                        onClick={() => exportTransactionsPDF(transactions, dateFrom, dateTo, user?.store_name)}
                        disabled={transactions.length === 0}
                    >
                        PDF
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="flex gap-2">
                    <button
                        onClick={() => setPeriod('daily')}
                        className={cn(
                            'px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer',
                            period === 'daily' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        )}
                    >
                        Harian
                    </button>
                    <button
                        onClick={() => setPeriod('monthly')}
                        className={cn(
                            'px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer',
                            period === 'monthly' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        )}
                    >
                        Bulanan
                    </button>
                </div>
                <div className="flex gap-2">
                    <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                        className="bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                    <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                        className="bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 xl:grid-cols-6">
                <StatCard title="Total Pendapatan" value={formatRupiah(totalSales)} icon={DollarSign} color="indigo" />
                <StatCard title="Total HPP (Modal)" value={formatRupiah(totalCogs)} icon={Wallet} color="amber" />
                <StatCard title="Laba Kotor" value={formatRupiah(grossProfit)} icon={TrendingUp} color="emerald" />
                <StatCard title="Total Pengeluaran" value={formatRupiah(totalExpenses)} icon={Wallet} color="rose" />
                <StatCard title="Laba Bersih" value={formatRupiah(netProfit)} icon={PiggyBank} color="emerald" />
                <StatCard title="Transaksi" value={totalTransactions} icon={ShoppingBag} color="blue" />
            </div>

            {/* Charts */}
            {loading ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="skeleton h-80 rounded-2xl" />
                    <div className="skeleton h-80 rounded-2xl" />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                        <h3 className="text-lg font-semibold text-white mb-4">Grafik Penjualan</h3>
                        <div className="h-64">
                            {labels.length > 0 ? (
                                <Line data={chartData} options={chartOptions} />
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                                    Tidak ada data untuk periode ini
                                </div>
                            )}
                        </div>
                    </Card>
                    <Card>
                        <h3 className="text-lg font-semibold text-white mb-4">Grafik Transaksi</h3>
                        <div className="h-64">
                            {labels.length > 0 ? (
                                <Bar data={countChartData} options={chartOptions} />
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                                    Tidak ada data untuk periode ini
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            )}

            {/* Sales Table */}
            {!loading && labels.length > 0 && (
                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white">Ringkasan {period === 'daily' ? 'Harian' : 'Bulanan'}</h3>
                        <div className="flex gap-2">
                            <Button
                                variant="secondary"
                                size="sm"
                                icon={Download}
                                onClick={() => exportDailySummaryToExcel(groupedData, labels, `ringkasan-${period}-${dateFrom}-${dateTo}`)}
                            >
                                Excel
                            </Button>
                            <Button
                                variant="secondary"
                                size="sm"
                                icon={Download}
                                onClick={() => exportDailySummaryPDF(groupedData, labels, dateFrom, dateTo, user?.store_name)}
                            >
                                PDF
                            </Button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-700">
                                    <th className="text-left text-xs font-medium text-slate-400 uppercase px-4 py-3">Periode</th>
                                    <th className="text-right text-xs font-medium text-slate-400 uppercase px-4 py-3">Transaksi</th>
                                    <th className="text-right text-xs font-medium text-slate-400 uppercase px-4 py-3">Pendapatan</th>
                                    <th className="text-right text-xs font-medium text-slate-400 uppercase px-4 py-3">HPP (Modal)</th>
                                    <th className="text-right text-xs font-medium text-slate-400 uppercase px-4 py-3">Laba Kotor</th>
                                    <th className="text-right text-xs font-medium text-slate-400 uppercase px-4 py-3">Pengeluaran</th>
                                    <th className="text-right text-xs font-medium text-slate-400 uppercase px-4 py-3">Laba Bersih</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {labels.map((label) => (
                                    <tr key={label} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-4 py-3 text-sm text-white">{label}</td>
                                        <td className="px-4 py-3 text-right text-sm text-slate-400">{groupedData[label].count}</td>
                                        <td className="px-4 py-3 text-right text-sm font-medium text-indigo-400">{formatRupiah(groupedData[label].sales)}</td>
                                        <td className="px-4 py-3 text-right text-sm font-medium text-amber-500">{formatRupiah(groupedData[label].cogs)}</td>
                                        <td className="px-4 py-3 text-right text-sm font-medium text-emerald-500">{formatRupiah(groupedData[label].gross)}</td>
                                        <td className="px-4 py-3 text-right text-sm font-medium text-rose-400">{formatRupiah(groupedData[label].expense)}</td>
                                        <td className="px-4 py-3 text-right text-sm font-bold text-emerald-400">{formatRupiah(groupedData[label].profit)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t border-slate-600 bg-slate-800/50">
                                    <td className="px-4 py-3 text-sm font-bold text-white">Total</td>
                                    <td className="px-4 py-3 text-right text-sm font-bold text-white">{totalTransactions}</td>
                                    <td className="px-4 py-3 text-right text-sm font-bold text-indigo-400">{formatRupiah(totalSales)}</td>
                                    <td className="px-4 py-3 text-right text-sm font-bold text-amber-500">{formatRupiah(totalCogs)}</td>
                                    <td className="px-4 py-3 text-right text-sm font-bold text-emerald-500">{formatRupiah(grossProfit)}</td>
                                    <td className="px-4 py-3 text-right text-sm font-bold text-rose-400">{formatRupiah(totalExpenses)}</td>
                                    <td className="px-4 py-3 text-right text-sm font-bold text-emerald-400">{formatRupiah(netProfit)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    );
}
