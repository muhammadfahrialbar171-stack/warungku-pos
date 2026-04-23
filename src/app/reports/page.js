'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    BarChart3,
    Calendar,
    TrendingUp,
    DollarSign,
    ShoppingBag,
    Download,
    Wallet,
    PiggyBank,
    ShieldAlert,
    ChevronDown,
    FileText,
    Grid,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
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
    BarController,
    LineController,
    Title,
    Tooltip,
    Legend,
    Filler,
    ArcElement,
} from 'chart.js';

ChartJS.register(
    CategoryScale, 
    LinearScale, 
    BarElement, 
    LineElement, 
    PointElement, 
    BarController,
    LineController,
    Title, 
    Tooltip, 
    Legend, 
    Filler, 
    ArcElement
);

import { Bar, Doughnut, Chart } from 'react-chartjs-2';


import { withRBAC } from '@/components/layout/withRBAC';

function ReportsPage() {
    const { user } = useAuthStore();
    const toast = useToast();
    const [activePeriod, setActivePeriod] = useState('monthly');
    const [period, setPeriod] = useState('daily');
    const [dateFrom, setDateFrom] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
    const [dateTo, setDateTo] = useState(dayjs().format('YYYY-MM-DD'));
    const [transactions, setTransactions] = useState([]);
    const [transactionItems, setTransactionItems] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const PAGE_SIZE = 50;
    const [currentPage, setCurrentPage] = useState(1);
    const [exportOpen, setExportOpen] = useState(false);

    useEffect(() => {
        if (activePeriod === 'weekly') {
            setDateFrom(dayjs().subtract(6, 'day').format('YYYY-MM-DD'));
            setDateTo(dayjs().format('YYYY-MM-DD'));
            setPeriod('daily');
        } else if (activePeriod === 'monthly') {
            setDateFrom(dayjs().startOf('month').format('YYYY-MM-DD'));
            setDateTo(dayjs().format('YYYY-MM-DD'));
            setPeriod('daily');
        } else if (activePeriod === 'yearly') {
            setDateFrom(dayjs().startOf('year').format('YYYY-MM-DD'));
            setDateTo(dayjs().format('YYYY-MM-DD'));
            setPeriod('monthly');
        }
    }, [activePeriod]);

    const loadReport = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const fromISO = dayjs(dateFrom).startOf('day').toISOString();
            const toISO = dayjs(dateTo).endOf('day').toISOString();
            const storeId = user.owner_id || user.id;

            const [txRes, expRes, prodRes] = await Promise.all([
                supabase
                    .from('transactions')
                    .select('*')
                    .eq('user_id', storeId)
                    .eq('status', 'completed')
                    .gte('created_at', fromISO)
                    .lte('created_at', toISO)
                    .order('created_at', { ascending: true }),
                supabase
                    .from('expenses')
                    .select('*')
                    .eq('user_id', storeId)
                    .gte('expense_date', dayjs(dateFrom).format('YYYY-MM-DD'))
                    .lte('expense_date', dayjs(dateTo).format('YYYY-MM-DD')),
                supabase
                    .from('products')
                    .select('id, cost_price')
                    .eq('user_id', storeId)
            ]);

            const txData = txRes.data || [];
            setTransactions(txData);
            setExpenses(expRes.data || []);
            setProducts(prodRes.data || []);

            if (txData.length > 0) {
                const txIds = txData.map(t => t.id);
                // Fetch items in parallel chunks to maximize performance and avoid query limits
                const chunks = [];
                for (let i = 0; i < txIds.length; i += 200) chunks.push(txIds.slice(i, i + 200));

                const chunkPromises = chunks.map(chunk =>
                    supabase
                        .from('transaction_items')
                        .select('*, products(cost_price)')
                        .in('transaction_id', chunk)
                );

                const chunkResults = await Promise.all(chunkPromises);
                let allItems = [];
                chunkResults.forEach(res => {
                    if (res.data) allItems = allItems.concat(res.data);
                });
                setTransactionItems(allItems);
            } else {
                setTransactionItems([]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [user?.id, user?.owner_id, dateFrom, dateTo]);

    useEffect(() => { loadReport(); }, [loadReport]);

    const totalSalesWithTax = transactions.reduce((sum, t) => sum + t.total_amount, 0);
    const totalTax = transactions.reduce((sum, t) => sum + (t.tax_amount || 0), 0);
    const totalNetRevenue = totalSalesWithTax - totalTax;
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    const productCostMap = products.reduce((acc, p) => {
        // Use string keys to ensure consistent matching regardless of Postgres ID type
        acc[String(p.id)] = p.cost_price || 0;
        return acc;
    }, {});

    let totalCogs = 0;
    const cogsPerTx = {};
    transactionItems.forEach(item => {
        // Fallback hierarchy: 
        // 1. item.cost_price (if DB column exists) 
        // 2. data from DB join (item.products.cost_price)
        // 3. lookup by product_id string match (if products state available)
        // 4. default to 0
        const pid = item.product_id ? String(item.product_id) : null;
        const joinedCost = item.products?.cost_price;
        const costPrice = item.cost_price || joinedCost || (pid ? productCostMap[pid] : 0) || 0;
        
        const itemCogs = Number(costPrice) * (item.quantity || 1);
        
        totalCogs += itemCogs;
        if (!cogsPerTx[item.transaction_id]) cogsPerTx[item.transaction_id] = 0;
        cogsPerTx[item.transaction_id] += itemCogs;
    });

    const grossProfit = totalNetRevenue - totalCogs;
    const netProfit = grossProfit - totalExpenses;
    const totalTransactions = transactions.length;

    const paymentMethods = transactions.reduce((acc, tx) => {
        const method = tx.payment_method || 'other';
        acc[method] = (acc[method] || 0) + tx.total_amount;
        return acc;
    }, {});

    const paymentLabels = Object.keys(paymentMethods).map(k => k.toUpperCase());
    const paymentColors = {
        CASH: '#22c55e',
        QRIS: '#3b82f6',
        DEBIT: '#f59e0b',
        OTHER: '#71717a'
    };

    const paymentChartData = {
        labels: paymentLabels,
        datasets: [{
            data: Object.values(paymentMethods),
            backgroundColor: paymentLabels.map(l => paymentColors[l] || paymentColors.OTHER),
            borderWidth: 0,
            hoverOffset: 8,
            borderRadius: 4,
            spacing: 2
        }]
    };

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
        groupedData[key].profit = (groupedData[key].gross || 0) - (groupedData[key].expense || 0);
    });

    const labels = Object.keys(groupedData).sort((a, b) => {
        if (period === 'monthly') {
            return dayjs(a, 'MMM YYYY').valueOf() - dayjs(b, 'MMM YYYY').valueOf();
        }
        return dayjs(a, 'DD MMM').valueOf() - dayjs(b, 'DD MMM').valueOf();
    });
    
    const salesData = labels.map((key) => groupedData[key].sales);
    const countData = labels.map((key) => groupedData[key].count);
    const profitData = labels.map((key) => groupedData[key].profit);

    const chartData = {
        labels,
        datasets: [
            {
                type: 'line',
                label: 'Laba Bersih',
                data: profitData,
                borderColor: '#22c55e',
                borderWidth: 2,
                pointBackgroundColor: '#22c55e',
                pointBorderColor: 'transparent',
                pointRadius: 3,
                fill: false,
                tension: 0.4,
                order: 1,
            },
            {
                type: 'bar',
                label: 'Penjualan',
                data: salesData,
                backgroundColor: 'rgba(59, 130, 246, 0.12)',
                borderRadius: 4,
                maxBarThickness: 32,
                order: 2,
            },
        ],
    };

    const countChartData = {
        labels,
        datasets: [
            {
                label: 'Transaksi',
                data: countData,
                backgroundColor: 'rgba(34, 197, 94, 0.12)',
                borderRadius: 4,
                maxBarThickness: 40,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(9, 9, 11, 0.9)',
                borderColor: 'rgba(39, 39, 42, 0.5)',
                borderWidth: 1,
                cornerRadius: 8,
                padding: 10,
                bodyFont: { size: 12, weight: '600', family: 'Inter' },
                callbacks: {
                    label: (context) => ` ${context.dataset.label || ''}: ${formatRupiah(context.raw)}`
                }
            }
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { color: '#71717a', font: { size: 10, weight: '500', family: 'Inter' } },
                border: { display: false }
            },
            y: {
                grid: { color: 'rgba(39, 39, 42, 0.3)', drawBorder: false },
                border: { display: false },
                beginAtZero: true,
                ticks: {
                    color: '#71717a',
                    font: { size: 10, weight: '500', family: 'Inter' },
                    callback: (value) => {
                        if (value >= 1000000) return `${(value / 1000000).toFixed(0)}jt`;
                        if (value >= 1000) return `${(value / 1000).toFixed(0)}rb`;
                        return value;
                    },
                },
            },
        },
    };

    const handleExportExcel = () => {
        exportDailySummaryToExcel(
            groupedData, 
            labels, 
            `Laporan_Keuangan_${activePeriod}_${dayjs().format('YYYYMMDD')}`
        );
        toast.success('Excel berhasil diunduh!');
        setExportOpen(false);
    };

    const handleExportPDF = () => {
        exportDailySummaryPDF(
            groupedData, 
            labels, 
            dateFrom, 
            dateTo, 
            user?.store_name || 'WarungKu POS',
            user?.phone || ''
        );
        toast.success('PDF berhasil diunduh!');
        setExportOpen(false);
    };

    return (
        <div className="space-y-5 animate-fade-in pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <PageHeader
                    title="Laporan"
                    description="Analisis performa keuangan bisnis Anda"
                />
                
                <div className="relative">
                    <Button 
                        variant="secondary" 
                        size="sm" 
                        icon={Download}
                        onClick={() => setExportOpen(!exportOpen)}
                        className="gap-2"
                    >
                        Unduh Laporan
                        <ChevronDown size={14} className={cn("transition-transform", exportOpen && "rotate-180")} />
                    </Button>
                    
                    {exportOpen && (
                        <div className="absolute top-full right-0 mt-2 w-48 bg-[var(--surface-1)] border border-[var(--surface-border)] rounded-xl shadow-xl z-50 p-1.5 animate-scale-in">
                            <button 
                                onClick={handleExportPDF}
                                className="w-full text-left px-3 py-2 text-[13px] hover:bg-[var(--surface-2)] rounded-lg transition-colors flex items-center gap-3"
                            >
                                <FileText size={16} className="text-red-500" />
                                Dokumen PDF
                            </button>
                            <button 
                                onClick={handleExportExcel}
                                className="w-full text-left px-3 py-2 text-[13px] hover:bg-[var(--surface-2)] rounded-lg transition-colors flex items-center gap-3"
                            >
                                <Grid size={16} className="text-emerald-500" />
                                File Excel
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4 p-2 bg-[var(--surface-1)] rounded-xl border border-[var(--surface-border)]">
                <div className="flex bg-[var(--surface-2)] p-1 rounded-lg w-full lg:w-auto">
                    {[
                        { id: 'weekly', label: 'Mingguan' },
                        { id: 'monthly', label: 'Bulanan' },
                        { id: 'yearly', label: 'Tahunan' },
                        { id: 'custom', label: 'Kustom' }
                    ].map((t) => (
                        <button
                            key={t.id}
                            onClick={() => setActivePeriod(t.id)}
                            className={cn(
                                'flex-1 px-4 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer',
                                activePeriod === t.id 
                                    ? 'bg-[var(--surface-1)] text-[var(--color-primary)] shadow-sm' 
                                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                            )}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
                
                {activePeriod === 'custom' ? (
                    <div className="flex gap-2 items-center w-full lg:w-auto">
                        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} size="sm" className="h-9" />
                        <span className="text-[var(--text-muted)] text-[10px] font-bold">s/d</span>
                        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} size="sm" className="h-9" />
                    </div>
                ) : (
                    <div className="px-3 py-1.5 bg-[var(--surface-2)]/50 rounded-lg text-[11px] font-medium text-[var(--text-secondary)] border border-[var(--surface-border)]">
                        {dayjs(dateFrom).format('D MMM')} — {dayjs(dateTo).format('D MMM YYYY')}
                    </div>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 stagger-children">
                <StatCard title="Omzet Total" value={formatRupiah(totalSalesWithTax)} icon={DollarSign} color="blue" />
                <StatCard title="Pajak" value={formatRupiah(totalTax)} icon={ShieldAlert} color="rose" />
                <StatCard title="Omzet Bersih" value={formatRupiah(totalNetRevenue)} icon={DollarSign} color="blue" />
                <StatCard title="HPP" value={formatRupiah(totalCogs)} icon={Wallet} color="amber" />
                <StatCard title="Laba Kotor" value={formatRupiah(grossProfit)} icon={TrendingUp} color="emerald" subtitle={totalNetRevenue > 0 ? `${Math.round((grossProfit / totalNetRevenue) * 100)}% Margin` : undefined} />
                <StatCard title="Biaya" value={formatRupiah(totalExpenses)} icon={Wallet} color="rose" />
                <StatCard title="Laba Bersih" value={formatRupiah(netProfit)} icon={PiggyBank} color={netProfit < 0 ? 'rose' : 'blue'} subtitle={totalNetRevenue > 0 ? `${Math.round((netProfit / totalNetRevenue) * 100)}% Net` : undefined} />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <Card className="lg:col-span-2">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-sm font-semibold">Tren Penjualan</h3>
                            <p className="text-[11px] text-[var(--text-muted)]">Perbandingan laba & rugi</p>
                        </div>
                        <div className="flex bg-[var(--surface-2)] p-1 rounded-lg">
                            <button onClick={() => setPeriod('daily')} className={cn('px-3 py-1 rounded-md text-[10px] font-medium transition-all', period === 'daily' ? 'bg-[var(--surface-1)] text-[var(--color-primary)]' : 'text-[var(--text-muted)]')}>Harian</button>
                            <button onClick={() => setPeriod('monthly')} className={cn('px-3 py-1 rounded-md text-[10px] font-medium transition-all', period === 'monthly' ? 'bg-[var(--surface-1)] text-[var(--color-primary)]' : 'text-[var(--text-muted)]')}>Bulanan</button>
                        </div>
                    </div>
                    <div className="h-64">
                        {loading ? <div className="h-full skeleton rounded-lg" /> : labels.length > 0 ? <Chart type="bar" data={chartData} options={chartOptions} /> : <div className="h-full flex items-center justify-center text-[var(--text-muted)] text-xs">Data tidak tersedia</div>}
                    </div>
                </Card>

                <Card>
                    <h3 className="text-sm font-semibold mb-6">Metode Pembayaran</h3>
                    <div className="h-64 flex items-center justify-center">
                        {loading ? <div className="h-40 w-40 skeleton rounded-full" /> : transactions.length > 0 ? (
                            <Doughnut 
                                data={paymentChartData} 
                                options={{
                                    ...chartOptions,
                                    cutout: '80%',
                                    plugins: {
                                        ...chartOptions.plugins,
                                        legend: { display: true, position: 'bottom', labels: { color: '#71717a', usePointStyle: true, pointStyle: 'circle', font: { size: 10, family: 'Inter' } } }
                                    }
                                }} 
                            />
                        ) : <div className="text-[11px] text-[var(--text-muted)]">Belum ada transaksi</div>}
                    </div>
                </Card>
            </div>

            {/* Table */}
            {!loading && labels.length > 0 && (
                <Card className="!p-0 overflow-hidden">
                    <div className="p-4 border-b border-[var(--surface-border)] flex items-center justify-between">
                        <h3 className="text-sm font-semibold">Ringkasan Data {period === 'daily' ? 'Harian' : 'Bulanan'}</h3>
                        <div className="flex gap-2">
                            <Button variant="secondary" size="xs" icon={Download} onClick={handleExportExcel}>Excel</Button>
                            <Button variant="secondary" size="xs" icon={Download} onClick={handleExportPDF}>PDF</Button>
                        </div>
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Periode</TableHead>
                                <TableHead align="right">Tx</TableHead>
                                <TableHead align="right">Pendapatan</TableHead>
                                <TableHead align="right">HPP</TableHead>
                                <TableHead align="right">Laba Kotor</TableHead>
                                <TableHead align="right">Beban</TableHead>
                                <TableHead align="right">Laba Bersih</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {labels.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((label) => (
                                <TableRow key={label}>
                                    <TableCell isFirst>{label}</TableCell>
                                    <TableCell align="right">{groupedData[label].count}</TableCell>
                                    <TableCell align="right">{formatRupiah(groupedData[label].sales)}</TableCell>
                                    <TableCell align="right">{formatRupiah(groupedData[label].cogs)}</TableCell>
                                    <TableCell align="right" className="text-emerald-500 font-medium">{formatRupiah(groupedData[label].gross)}</TableCell>
                                    <TableCell align="right" className="text-rose-500">{formatRupiah(groupedData[label].expense)}</TableCell>
                                    <TableCell align="right" className="font-bold text-[var(--text-primary)]">{formatRupiah(groupedData[label].profit)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {labels.length > PAGE_SIZE && (
                        <div className="p-4 border-t border-[var(--surface-border)] flex justify-between items-center bg-[var(--surface-1)]">
                            <span className="text-[10px] text-[var(--text-muted)]">Halaman {currentPage} dari {Math.ceil(labels.length / PAGE_SIZE)}</span>
                            <div className="flex gap-2">
                                <Button variant="secondary" size="xs" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Prev</Button>
                                <Button variant="secondary" size="xs" disabled={currentPage >= Math.ceil(labels.length / PAGE_SIZE)} onClick={() => setCurrentPage(p => p + 1)}>Next</Button>
                            </div>
                        </div>
                    )}
                </Card>
            )}
        </div>
    );
}

export default withRBAC(ReportsPage, ["owner"]);
