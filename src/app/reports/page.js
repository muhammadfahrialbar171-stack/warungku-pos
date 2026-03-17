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
import Input from '@/components/ui/Input';
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import PageHeader from '@/components/ui/PageHeader';
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

import { withRBAC } from '@/components/layout/withRBAC';

function ReportsPage() {
    const { user } = useAuthStore();
    const [period, setPeriod] = useState('daily');
    const [dateFrom, setDateFrom] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
    const [dateTo, setDateTo] = useState(dayjs().format('YYYY-MM-DD'));
    const [transactions, setTransactions] = useState([]);
    const [transactionItems, setTransactionItems] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const PAGE_SIZE = 50;
    const [currentPage, setCurrentPage] = useState(1);

    const loadReport = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const fromISO = dayjs(dateFrom).startOf('day').toISOString();
            const toISO = dayjs(dateTo).endOf('day').toISOString();

            // FIX: Fetch transactions and expenses in parallel (no nested subquery)
            const [txRes, expRes] = await Promise.all([
                supabase
                    .from('transactions')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('status', 'completed')
                    .gte('created_at', fromISO)
                    .lte('created_at', toISO)
                    .order('created_at', { ascending: true }),
                supabase
                    .from('expenses')
                    .select('*')
                    .eq('user_id', user.id)
                    .gte('expense_date', dayjs(dateFrom).format('YYYY-MM-DD'))
                    .lte('expense_date', dayjs(dateTo).format('YYYY-MM-DD'))
            ]);

            const txData = txRes.data || [];
            setTransactions(txData);
            setExpenses(expRes.data || []);

            // Fetch transaction_items only if there are transactions to avoid empty IN clause
            if (txData.length > 0) {
                const txIds = txData.map(t => t.id);
                const { data: itemsData } = await supabase
                    .from('transaction_items')
                    .select('transaction_id, quantity, cost_price')
                    .in('transaction_id', txIds);
                setTransactionItems(itemsData || []);
            } else {
                setTransactionItems([]);
            }
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
                backgroundColor: (context) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.4)');
                    gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');
                    return gradient;
                },
                borderColor: 'rgba(99, 102, 241, 1)',
                borderWidth: 3,
                pointBackgroundColor: 'rgba(99, 102, 241, 1)',
                pointBorderColor: '#fff',
                pointRadius: 4,
                pointHoverRadius: 6,
                fill: true,
                tension: 0.5,
            },
        ],
    };

    const countChartData = {
        labels,
        datasets: [
            {
                label: 'Transaksi',
                data: countData,
                backgroundColor: (context) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                    gradient.addColorStop(0, 'rgba(34, 197, 94, 0.8)');
                    gradient.addColorStop(1, 'rgba(34, 197, 94, 0.2)');
                    return gradient;
                },
                borderColor: (context) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                    gradient.addColorStop(0, 'rgba(16, 185, 129, 1)');
                    gradient.addColorStop(1, 'rgba(34, 197, 94, 0.5)');
                    return gradient;
                },
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false,
                barPercentage: 0.6,
                categoryPercentage: 0.8,
                hoverBackgroundColor: 'rgba(34, 197, 94, 0.9)',
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false,
        },
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
                callbacks: {
                    label: (context) => {
                        if (context.dataset.label === 'Penjualan') {
                            return `Penjualan: ${formatRupiah(context.raw)}`;
                        }
                        return `Jumlah: ${context.raw} Transaksi`;
                    }
                }
            }
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { color: '#94a3b8', font: { size: 11, family: "'Inter', sans-serif" } },
                border: { display: false }
            },
            y: {
                grid: { color: 'rgba(255, 255, 255, 0.05)', borderDash: [5, 5], drawBorder: false },
                border: { display: false },
                beginAtZero: true,
                ticks: {
                    color: '#94a3b8',
                    font: { size: 11, family: "'Inter', sans-serif" },
                    padding: 10,
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
            <PageHeader
                title="Laporan Penjualan"
                description="Analisis performa bisnis Anda"
                action={
                    <div className="flex gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            icon={Download}
                            onClick={() => exportTransactionsToExcel(transactions, `laporan-transaksi-${dateFrom}-${dateTo}`)}
                            disabled={transactions.length === 0}
                        >
                            Excel
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            icon={Download}
                            onClick={() => exportTransactionsPDF(transactions, dateFrom, dateTo, user?.store_name, user?.phone)}
                            disabled={transactions.length === 0}
                        >
                            PDF
                        </Button>
                    </div>
                }
            />

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="flex gap-2">
                    <button
                        onClick={() => setPeriod('daily')}
                        className={cn(
                            'px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer',
                            period === 'daily' ? 'bg-indigo-500 text-white' : 'bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--surface-3)]'
                        )}
                    >
                        Harian
                    </button>
                    <button
                        onClick={() => setPeriod('monthly')}
                        className={cn(
                            'px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer',
                            period === 'monthly' ? 'bg-indigo-500 text-white' : 'bg-[var(--surface-2)] text-[var(--text-secondary)] hover:bg-[var(--surface-3)]'
                        )}
                    >
                        Bulanan
                    </button>
                </div>
                <div className="flex gap-3">
                    <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} icon={Calendar} />
                    <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} icon={Calendar} />
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    <Card className="relative overflow-hidden">
                        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">Grafik Penjualan</h3>
                        <div className="h-64">
                            {labels.length > 0 ? (
                                <Line data={chartData} options={chartOptions} />
                            ) : (
                                <div className="h-full flex items-center justify-center text-[var(--text-muted)] text-sm">
                                    Tidak ada data untuk periode ini
                                </div>
                            )}
                        </div>
                    </Card>
                    <Card className="relative overflow-hidden">
                        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">Grafik Transaksi</h3>
                        <div className="h-64">
                            {labels.length > 0 ? (
                                <Bar data={countChartData} options={chartOptions} />
                            ) : (
                                <div className="h-full flex items-center justify-center text-[var(--text-muted)] text-sm">
                                    Tidak ada data untuk periode ini
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            )}

            {/* Sales Table */}
            {!loading && labels.length > 0 && (
                <Card className="!p-0 overflow-hidden mt-6">
                    <div className="flex flex-col sm:flex-row items-center justify-between p-4 md:p-6 border-b border-[var(--surface-border)] gap-4">
                        <h3 className="text-lg font-bold text-[var(--text-primary)]">Ringkasan {period === 'daily' ? 'Harian' : 'Bulanan'}</h3>
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
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Periode</TableHead>
                                <TableHead align="right">Transaksi</TableHead>
                                <TableHead align="right">Pendapatan</TableHead>
                                <TableHead align="right">HPP (Modal)</TableHead>
                                <TableHead align="right">Laba Kotor</TableHead>
                                <TableHead align="right">Pengeluaran</TableHead>
                                <TableHead align="right">Laba Bersih</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {labels.map((label) => (
                                <TableRow key={label}>
                                    <TableCell className="font-semibold">{label}</TableCell>
                                    <TableCell align="right" className="text-[var(--text-secondary)]">{groupedData[label].count}</TableCell>
                                    <TableCell align="right" className="font-bold text-indigo-400">{formatRupiah(groupedData[label].sales)}</TableCell>
                                    <TableCell align="right" className="font-bold text-amber-500">{formatRupiah(groupedData[label].cogs)}</TableCell>
                                    <TableCell align="right" className="font-bold text-emerald-500">{formatRupiah(groupedData[label].gross)}</TableCell>
                                    <TableCell align="right" className="font-bold text-rose-400">{formatRupiah(groupedData[label].expense)}</TableCell>
                                    <TableCell align="right" className="font-bold text-emerald-400">{formatRupiah(groupedData[label].profit)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                        <tfoot>
                            <tr className="border-t border-[var(--surface-border)] bg-[var(--surface-2)]/50">
                                <td className="px-5 py-4 text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">Total</td>
                                <td className="px-5 py-4 text-right text-sm font-bold text-[var(--text-primary)]">{totalTransactions}</td>
                                <td className="px-5 py-4 text-right text-sm font-bold text-indigo-400">{formatRupiah(totalSales)}</td>
                                <td className="px-5 py-4 text-right text-sm font-bold text-amber-500">{formatRupiah(totalCogs)}</td>
                                <td className="px-5 py-4 text-right text-sm font-bold text-emerald-500">{formatRupiah(grossProfit)}</td>
                                <td className="px-5 py-4 text-right text-sm font-bold text-rose-400">{formatRupiah(totalExpenses)}</td>
                                <td className="px-5 py-4 text-right text-sm font-bold text-emerald-400 text-base tracking-tight">{formatRupiah(netProfit)}</td>
                            </tr>
                        </tfoot>
                    </Table>
                </Card>
            )}
        </div>
    );
}

export default withRBAC(ReportsPage, ['owner']);
