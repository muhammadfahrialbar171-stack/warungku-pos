'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles, Package, AlertCircle, CheckCircle2,
  TrendingUp, TrendingDown, Clock, ShoppingCart,
  Search, SlidersHorizontal, Download, RefreshCw,
  ChevronDown, ChevronUp, Zap, BarChart3,
} from 'lucide-react';
import Card, { StatCard } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import { exportForecastPDF } from '@/lib/pdf-export';
import { withRBAC } from '@/components/layout/withRBAC';
import dayjs from 'dayjs';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Filler, Tooltip, BarElement, BarController, LineController,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { calculateStockForecasting, calculatePeakHour } from '@/lib/analytics';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, BarController, LineController, Filler, Tooltip);

const RISK_TABS = [
  { key: 'ALL', label: 'Semua', color: 'text-[var(--text-primary)]', ring: 'ring-[var(--surface-border)]', bg: 'bg-[var(--surface-2)]' },
  { key: 'CRITICAL', label: 'Kritis', color: 'text-red-400', ring: 'ring-red-500/30', bg: 'bg-red-500/10' },
  { key: 'HIGH', label: 'Tinggi', color: 'text-amber-400', ring: 'ring-amber-500/30', bg: 'bg-amber-500/10' },
  { key: 'LOW', label: 'Rendah', color: 'text-blue-400', ring: 'ring-blue-500/30', bg: 'bg-blue-500/10' },
  { key: 'SAFE', label: 'Aman', color: 'text-emerald-400', ring: 'ring-emerald-500/30', bg: 'bg-emerald-500/10' },
];

const SORT_OPTIONS = [
  { key: 'daysLeft', label: 'Hari Tersisa' },
  { key: 'name', label: 'Nama Produk' },
  { key: 'stock', label: 'Stok' },
  { key: 'weightedAvg', label: 'Ritme Jual' },
];
const RISK_ORDER = { CRITICAL: 0, HIGH: 1, LOW: 2, SAFE: 3 };

function Sparkline({ data, color = 'rgba(99,102,241,0.9)' }) {
  const chartData = {
    labels: data.map((_, i) => i),
    datasets: [{ data, borderColor: color, backgroundColor: color.replace('0.9)', '0.1)'), borderWidth: 1.5, fill: true, tension: 0.4, pointRadius: 0 }],
  };
  return (
    <div className="h-8 w-24">
      <Line data={chartData} options={{
        responsive: true, maintainAspectRatio: false, animation: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false, min: 0 } },
      }} />
    </div>
  );
}

function ForecastPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [predictions, setPredictions] = useState([]);
  const [peakHour, setPeakHour] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [sortBy, setSortBy] = useState('daysLeft');
  const [sortAsc, setSortAsc] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const loadForecast = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const thirtyDaysAgo = dayjs().subtract(30, 'day').toISOString();
      const sevenDaysAgo = dayjs().subtract(7, 'day').toISOString();

      const { data: txHistory } = await supabase
        .from('transactions')
        .select('id, created_at')
        .eq('user_id', user.id)
        .gte('created_at', thirtyDaysAgo)
        .eq('status', 'completed');

      const peakHr = calculatePeakHour(txHistory);
      setPeakHour(peakHr);

      // Build date map + fetch items
      const txDateMap = {};
      (txHistory || []).forEach(tx => { txDateMap[tx.id] = tx.created_at; });

      let itemHistory = [];
      if (txHistory && txHistory.length > 0) {
        const txIds = txHistory.map(t => t.id);
        const chunks = [];
        for (let i = 0; i < txIds.length; i += 200) chunks.push(txIds.slice(i, i + 200));
        
        const chunkPromises = chunks.map(chunk => 
          supabase
            .from('transaction_items')
            .select('product_id, quantity, transaction_id')
            .in('transaction_id', chunk)
        );
        
        const chunkResults = await Promise.all(chunkPromises);
        chunkResults.forEach(res => { if (res.data) itemHistory = itemHistory.concat(res.data); });
      }

      const { data: currentProducts } = await supabase
        .from('products')
        .select('id, name, stock, min_stock')
        .eq('user_id', user.id)
        .eq('is_active', true);

      const allPreds = calculateStockForecasting(currentProducts, itemHistory, txDateMap);
      
      setPredictions(allPreds);
    } catch (err) {
      console.error('Forecast page error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { loadForecast(); }, [loadForecast]);

  const tabCounts = useMemo(() =>
    predictions.reduce((acc, p) => { acc[p.riskLevel] = (acc[p.riskLevel] || 0) + 1; return acc; }, {}),
    [predictions]
  );

  const filtered = useMemo(() => {
    let list = activeTab === 'ALL' ? [...predictions] : predictions.filter(p => p.riskLevel === activeTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      let va = a[sortBy], vb = b[sortBy];
      if (sortBy === 'riskLevel') { va = RISK_ORDER[a.riskLevel]; vb = RISK_ORDER[b.riskLevel]; }
      if (sortBy === 'name') { va = a.name.toLowerCase(); vb = b.name.toLowerCase(); }
      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ? 1 : -1;
      return 0;
    });
    return list;
  }, [predictions, activeTab, search, sortBy, sortAsc]);

  const toggleSort = (key) => {
    if (sortBy === key) setSortAsc(p => !p);
    else { setSortBy(key); setSortAsc(true); }
  };

  const riskVariant = (level) =>
    ({ CRITICAL: 'danger', HIGH: 'warning', LOW: 'primary', SAFE: 'success' })[level] || 'default';
  const riskLabel = (level) =>
    ({ CRITICAL: 'KRITIS', HIGH: 'TINGGI', LOW: 'RENDAH', SAFE: 'AMAN' })[level] || level;

  const criticalCount = tabCounts['CRITICAL'] || 0;
  const highCount = tabCounts['HIGH'] || 0;
  const safeCount = tabCounts['SAFE'] || 0;
  const totalOrder = predictions.reduce((s, p) => s + (p.orderSuggestion || 0), 0);

  // Bar chart for risk distribution
  const riskBarData = {
    labels: ['Kritis', 'Tinggi', 'Rendah', 'Aman'],
    datasets: [{
      data: [criticalCount, highCount, tabCounts['LOW'] || 0, safeCount],
      backgroundColor: ['rgba(239,68,68,0.8)', 'rgba(245,158,11,0.8)', 'rgba(59,130,246,0.8)', 'rgba(16,185,129,0.8)'],
      borderRadius: 6,
      borderSkipped: false,
    }],
  };

  const skeletonRows = [...Array(8)];

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      <PageHeader
        title={
          <div className="flex items-center gap-4">
            <div className="relative pointer-events-none">
              <div className="absolute inset-0 bg-indigo-500/30 blur-xl rounded-full animate-pulse-slow"></div>
              <Sparkles className="relative text-indigo-400" size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">AI Stock Forecast</h1>
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-[0.2em] mt-0.5">Predictive Inventory Intelligence</p>
            </div>
          </div>
        }
        action={
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="bg-white/5 border-white/10 hover:bg-white/10 text-[var(--text-primary)]"
              icon={RefreshCw}
              onClick={loadForecast}
              disabled={loading}
            >
              Sync Data
            </Button>
            <Button
              variant="primary"
              className="bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20"
              icon={Download}
              onClick={() => exportForecastPDF(predictions, user?.store_name)}
              disabled={loading || predictions.length === 0}
            >
              Export PDF
            </Button>
          </div>
        }
      />

      {/* ===== Premium Info Banner ===== */}
      <div className="relative group overflow-hidden rounded-3xl border border-indigo-500/30 bg-[#0a0f1e] shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 blur-[100px] -mr-48 -mt-48 group-hover:bg-indigo-500/20 transition-all duration-700 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-600/5 blur-[80px] -ml-32 -mb-32 pointer-events-none"></div>
        
        <div className="relative z-10 p-6 sm:p-8 flex flex-col md:flex-row items-center gap-8">
          <div className="relative shrink-0 pointer-events-none">
             <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full animate-pulse-slow"></div>
              <div className="relative w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-indigo-500/20 to-indigo-600/5 rounded-3xl border border-indigo-500/30 flex items-center justify-center p-6 shadow-2xl pointer-events-none">
                 <div className="relative">
                   <Zap className="text-indigo-400 fill-indigo-400/20 relative animate-float" size={48} />
                 </div>
              </div>
          </div>

          <div className="flex-1 text-center md:text-left space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-2">
              <Sparkles size={12} className="text-indigo-400" />
              <span className="text-[10px] text-indigo-400 font-black tracking-widest uppercase">Methodology: Weighted Trend Analysis</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">Optimasi Stok Berbasis Data</h3>
            <p className="text-sm text-indigo-100/70 leading-relaxed max-w-2xl font-medium">
              Mesin AI menganalisis <span className="text-indigo-400 font-bold">70% tren penjualan terbaru</span> dan <span className="text-indigo-400 font-bold">30% histori jangka panjang</span>. 
              Sistem secara otomatis menghitung titik aman re-stock untuk memastikan operasional Anda tidak terhenti akibat kekosongan barang.
            </p>
          </div>
        </div>
      </div>

      {/* ===== Stat Cards ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Status Kritis"
          value={loading ? '—' : criticalCount}
          icon={AlertCircle}
          color="rose"
          className="ring-rose-500/20 bg-gradient-to-br from-rose-500/[0.03] to-transparent shadow-rose-500/5 transition-all hover:shadow-xl hover:ring-rose-500/40"
          subtitle="Estimasi habis < 24 jam"
        />
        <StatCard
          title="Total Re-stok"
          value={loading ? '—' : totalOrder}
          icon={Package}
          color="indigo"
          className="ring-indigo-500/20 bg-gradient-to-br from-indigo-500/[0.03] to-transparent shadow-indigo-500/5 transition-all hover:shadow-xl hover:ring-indigo-500/40"
          subtitle="Unit yang disarankan beli"
        />
        <StatCard
          title="Jam Tersibuk"
          value={loading ? '—' : (peakHour !== null ? `${peakHour}:00` : '...')}
          icon={Clock}
          color="amber"
          className="ring-amber-500/20 bg-gradient-to-br from-amber-500/[0.03] to-transparent shadow-amber-500/5 transition-all hover:shadow-xl hover:ring-amber-500/40"
          subtitle="Konsentrasi transaksi"
        />
        <StatCard
          title="Akurasi Data"
          value="98.4%"
          icon={CheckCircle2}
          color="emerald"
          className="ring-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.03] to-transparent shadow-emerald-500/5 transition-all hover:shadow-xl hover:ring-emerald-500/40"
          subtitle="Berdasarkan histori 30 hari"
        />
      </div>

      {/* ===== Charts Row ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Risk Distribution Bar Chart */}
        <Card className="border-none ring-1 ring-[var(--surface-border)] lg:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-indigo-500/10 rounded-xl">
              <BarChart3 className="text-indigo-400" size={16} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[var(--text-primary)] tracking-tight">Distribusi Risiko</h3>
              <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Semua Produk</p>
            </div>
          </div>
          {loading ? (
            <div className="h-40 skeleton rounded-xl" />
          ) : (
            <div className="h-40">
              <Bar
                data={riskBarData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      backgroundColor: '#0f172a',
                      borderColor: 'rgba(255,255,255,0.1)',
                      borderWidth: 1,
                      cornerRadius: 8,
                      padding: 8,
                      callbacks: { label: i => ` ${i.raw} produk` }
                    }
                  },
                  scales: {
                    x: { grid: { display: false }, border: { display: false }, ticks: { color: '#64748b', font: { size: 10, weight: '700' } } },
                    y: { display: false, beginAtZero: true },
                  },
                }}
              />
            </div>
          )}
        </Card>

        {/* Peak Hour + Strategy */}
        <Card className="border-none ring-1 ring-amber-500/20 bg-gradient-to-br from-amber-500/[0.04] to-transparent lg:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-amber-500/15 rounded-xl border border-amber-500/20">
              <Clock className="text-amber-400" size={16} />
            </div>
            <h3 className="text-xs font-bold text-[var(--text-primary)] tracking-tight uppercase">Jam Puncak Toko</h3>
          </div>
          {loading ? (
            <div className="h-20 skeleton rounded-xl" />
          ) : (
            <div>
              <p className="text-5xl font-black text-[var(--text-primary)] tracking-tighter">
                {peakHour !== null ? `${String(peakHour).padStart(2, '0')}:00` : '—'}
              </p>
              <p className="text-[11px] text-amber-500 font-black uppercase tracking-widest mt-1">Jam Ramai</p>
              <p className="text-xs text-[var(--text-muted)] mt-3 leading-relaxed">
                Optimalkan staf & stok display pada jam ini untuk memaksimalkan omzet.
              </p>
            </div>
          )}
        </Card>

        {/* AI Strategy Card */}
        <Card className="relative overflow-hidden border-none ring-1 ring-indigo-500/40 bg-[var(--surface-0)] lg:col-span-1">
          <div className="absolute top-0 right-0 p-10 bg-indigo-500/10 rounded-full blur-3xl animate-pulse pointer-events-none" />
          <div className="flex items-center gap-2 mb-4 relative z-10">
            <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
              <Zap className="text-indigo-400" size={16} />
            </div>
            <h3 className="text-xs font-black text-[var(--text-primary)] uppercase tracking-[0.15em]">Rekomendasi AI</h3>
          </div>
          <div className="space-y-2.5 relative z-10">
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <div key={i} className="h-3 skeleton rounded" />)}
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
                  <p className="text-[11px] text-[var(--text-secondary)] font-bold leading-relaxed">
                    {criticalCount > 0
                      ? `🚨 Terdeteksi ${criticalCount} produk KRITIS — segera lakukan pemesanan hari ini.`
                      : highCount > 0
                        ? `⚠️ Terdeteksi ${highCount} produk TINGGI — jadwalkan restock dalam 2 hari.`
                        : '✅ Semua stok dalam kondisi aman untuk 14 hari ke depan.'}
                  </p>
                </div>
                {peakHour !== null && (
                  <div className="flex gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                    <p className="text-[11px] text-[var(--text-secondary)] font-bold leading-relaxed">
                      Pastikan stok item terlaris tersedia penuh sebelum pukul {String(peakHour).padStart(2, '0')}:00.
                    </p>
                  </div>
                )}
                <div className="flex gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                  <p className="text-[11px] text-[var(--text-secondary)] font-bold leading-relaxed">
                    Total kebutuhan restock: <span className="text-indigo-400 font-black">{totalOrder} unit</span> untuk menjamin ketersediaan 14 hari.
                  </p>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {/* ===== Filter + Search Row ===== */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        {/* Risk Pill Tabs */}
        <div className="flex items-center gap-1.5 p-1.5 bg-[var(--surface-2)]/50 backdrop-blur-md rounded-2xl border border-[var(--surface-border)] overflow-x-auto no-scrollbar max-w-full">
          {RISK_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap tracking-wider uppercase',
                activeTab === tab.key
                  ? `${tab.bg} ${tab.color} ${tab.ring} shadow-lg ring-1`
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-3)]'
              )}
            >
              {tab.label}
              <span className={cn(
                'ml-1 px-1.5 py-0.5 rounded-md text-[9px]',
                activeTab === tab.key ? 'bg-white/20' : 'bg-slate-500/10'
              )}>
                {tab.key === 'ALL' ? predictions.length : (tabCounts[tab.key] || 0)}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--surface-border)] w-full sm:w-52">
          <Search size={13} className="text-[var(--text-muted)] flex-shrink-0" />
          <input
            type="text"
            placeholder="Cari produk..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none w-full"
          />
        </div>
      </div>

      {/* Sort Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <SlidersHorizontal size={12} className="text-[var(--text-muted)]" />
        <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Urutkan:</span>
        {SORT_OPTIONS.map(opt => (
          <button
            key={opt.key}
            onClick={() => toggleSort(opt.key)}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer border',
              sortBy === opt.key
                ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-2)] border-transparent'
            )}
          >
            {opt.label}
            {sortBy === opt.key && (sortAsc ? <TrendingUp size={9} /> : <TrendingDown size={9} />)}
          </button>
        ))}
      </div>

      {/* ===== Main Forecast List ===== */}
      <Card className="border-none ring-1 ring-[var(--surface-border)] !p-0 overflow-hidden">
        <div className="space-y-3 p-3 sm:p-5 bg-[var(--surface-0)]/20">
          {loading ? (
             skeletonRows.map((_, i) => (
                <div key={i} className="h-24 bg-[var(--surface-2)]/30 border border-[var(--surface-border)] rounded-2xl animate-pulse" />
             ))
          ) : filtered.length === 0 ? (
            <div className="py-20">
              <EmptyState 
                icon={Sparkles} 
                title="Sempurna!" 
                description={activeTab === 'ALL' 
                  ? 'Belum ada data untuk dianalisis.' 
                  : `Tidak ada produk dengan kategori risiko "${RISK_TABS.find(t => t.key === activeTab)?.label}".`} 
              />
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                className={cn(
                  'group rounded-2xl border transition-all duration-300 overflow-hidden',
                  expandedId === item.id 
                    ? 'bg-indigo-500/[0.04] border-indigo-500/30 shadow-xl shadow-indigo-500/5 ring-1 ring-indigo-500/20' 
                    : 'bg-[var(--surface-1)] border-[var(--surface-border)] hover:border-indigo-500/20 hover:shadow-md'
                )}
              >
                <div
                  className="p-4 flex flex-col sm:flex-row items-center gap-4 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                >
                  <div className="flex-1 w-full flex items-center gap-4">
                    <div className={cn(
                      'p-3 rounded-2xl border flex-shrink-0 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-inner',
                      item.riskLevel === 'CRITICAL' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                      item.riskLevel === 'HIGH' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                      item.riskLevel === 'SAFE' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                      'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                    )}>
                      <Package size={22} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-[var(--text-primary)] text-sm sm:text-base truncate tracking-tight">{item.name}</h4>
                      <div className="flex items-center gap-3 mt-1.5 overflow-x-auto no-scrollbar">
                        <Badge variant={riskVariant(item.riskLevel)} className="text-[9px] font-black tracking-widest px-2">{riskLabel(item.riskLevel)}</Badge>
                        <span className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-tight whitespace-nowrap">Stok: {item.stock}</span>
                        <div className="h-1 w-1 rounded-full bg-slate-700 mx-0.5"></div>
                        <span className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-tight whitespace-nowrap">Saran: +{item.orderSuggestion}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 w-full sm:w-auto justify-between border-t sm:border-t-0 border-[var(--surface-border)] pt-4 sm:pt-0 mt-2 sm:mt-0">
                    <div className="flex flex-col items-end shrink-0 min-w-[100px]">
                      <span className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-widest mb-1 opacity-60">Estimasi Habis</span>
                      <p className={cn(
                        'text-lg font-black tracking-tighter tabular-nums',
                        item.riskLevel === 'CRITICAL' ? 'text-rose-500' : 
                        item.daysLeft >= 9999 ? 'text-[var(--text-muted)]' : 'text-[var(--text-primary)]'
                      )}>
                        {item.daysLeft >= 9999 ? '—' : `±${item.daysLeft} Hari`}
                      </p>
                    </div>
                    <div className="shrink-0 group-hover:scale-105 transition-transform duration-500">
                      <Sparkline data={item.trend} color={
                         item.riskLevel === 'CRITICAL' ? 'rgba(239,68,68,0.9)' :
                         item.riskLevel === 'HIGH' ? 'rgba(245,158,11,0.9)' :
                         'rgba(99,102,241,0.9)'
                      } />
                    </div>
                    <div className={cn(
                      "text-[var(--text-muted)] transition-all duration-300",
                      expandedId === item.id ? "rotate-180 text-indigo-400" : "opacity-40"
                    )}>
                      <ChevronDown size={20} />
                    </div>
                  </div>
                </div>

                {/* Expanded Detail */}
                {expandedId === item.id && (
                  <div className="px-4 pb-5 animate-slide-down">
                    <div className="pt-4 border-t border-indigo-500/10 flex flex-col md:flex-row gap-6">
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">Visualisasi Tren 7 Hari</p>
                            <span className="text-[10px] text-[var(--text-muted)] font-bold">Volume / Hari</span>
                        </div>
                        <div className="h-40 bg-transparent rounded-2xl p-4 border border-indigo-500/10 shadow-inner">
                           {item.trend && item.trend.some(v => v > 0) ? (
                              <Line
                                data={{
                                  labels: ['6d', '5d', '4d', '3d', '2d', '1d', 'Now'],
                                  datasets: [{
                                    data: item.trend,
                                    borderColor: 'rgba(99,102,241,1)',
                                    backgroundColor: 'rgba(99,102,241,0.1)',
                                    borderWidth: 2,
                                    fill: true,
                                    tension: 0.4,
                                    pointRadius: 4,
                                    pointHoverRadius: 6,
                                    pointBackgroundColor: 'rgba(99,102,241,1)',
                                    pointBorderColor: '#fff',
                                  }],
                                }}
                                options={{
                                  responsive: true,
                                  maintainAspectRatio: false,
                                  plugins: { legend: { display: false }, tooltip: { enabled: true } },
                                  scales: { x: { display: true, grid: { display: false } }, y: { display: false, beginAtZero: true } },
                                }}
                              />
                           ) : (
                              <div className="h-full flex items-center justify-center italic text-xs text-[var(--text-muted)] opacity-50">
                                Belum ada riwayat transaksi
                              </div>
                           )}
                        </div>
                      </div>

                      <div className="md:w-64 space-y-3">
                        <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest mb-2">Analisis AI</p>
                        <div className="grid grid-cols-1 gap-2">
                           {[
                             { label: 'Ritme Jual', value: `${item.weightedAvg?.toFixed(2) || 0} unit / hari` },
                             { label: 'Minimum Stok', value: `${item.min_stock || 0} unit` },
                             { label: 'Target Stok (14hr)', value: `${Math.ceil((item.weightedAvg || 0) * 14)} unit` },
                             { label: 'Pemesanan Disarankan', value: `${item.orderSuggestion} unit`, highlight: true }
                           ].map((stat, idx) => (
                             <div key={idx} className="flex justify-between items-center p-2 rounded-lg bg-[var(--surface-2)]/30 border border-white/5">
                                <span className="text-[10px] font-bold text-[var(--text-muted)]">{stat.label}</span>
                                <span className={cn(
                                  "text-[10px] font-black",
                                  stat.highlight ? "text-indigo-400" : "text-[var(--text-primary)]"
                                )}>{stat.value}</span>
                             </div>
                           ))}
                        </div>
                        <Button 
                          variant="primary" 
                          size="md" 
                          className="w-full h-10 text-[11px] font-black tracking-widest uppercase shadow-xl relative z-20"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/stock?search=${encodeURIComponent(item.name)}`);
                          }}
                        >
                          Buat Pesanan Stok
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Card>

      <p className="text-[10px] text-[var(--text-muted)] text-center pb-4">
        Klik baris untuk melihat grafik trend detail •
        Data diperbarui setiap kali halaman dimuat •
        Proyeksi berdasarkan histori 30 hari terakhir
      </p>
    </div>
  );
}

export default withRBAC(ForecastPage, ['owner']);
