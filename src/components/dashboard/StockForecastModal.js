'use client';

import React, { useState, useMemo } from 'react';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import {
  Sparkles, ShoppingCart, AlertCircle, CheckCircle2,
  Search, SlidersHorizontal, ChevronDown, ChevronUp, TrendingUp, TrendingDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Filler, Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

const RISK_TABS = [
  { key: 'ALL', label: 'Semua', color: 'text-[var(--text-primary)]', activeBg: 'bg-[var(--surface-2)]' },
  { key: 'CRITICAL', label: 'Kritis', color: 'text-red-400', activeBg: 'bg-red-500/10' },
  { key: 'HIGH', label: 'Tinggi', color: 'text-amber-400', activeBg: 'bg-amber-500/10' },
  { key: 'LOW', label: 'Rendah', color: 'text-blue-400', activeBg: 'bg-blue-500/10' },
  { key: 'SAFE', label: 'Aman', color: 'text-emerald-400', activeBg: 'bg-emerald-500/10' },
];

const SORT_OPTIONS = [
  { key: 'daysLeft', label: 'Hari Tersisa' },
  { key: 'name', label: 'Nama Produk' },
  { key: 'stock', label: 'Stok' },
  { key: 'riskLevel', label: 'Risk Level' },
];

const RISK_ORDER = { CRITICAL: 0, HIGH: 1, LOW: 2, SAFE: 3 };

function Sparkline({ data }) {
  const max = Math.max(...data, 1);
  const chartData = {
    labels: ['', '', '', '', '', '', ''],
    datasets: [{
      data,
      borderColor: 'rgba(99,102,241,0.8)',
      backgroundColor: 'rgba(99,102,241,0.08)',
      borderWidth: 1.5,
      fill: true,
      tension: 0.4,
      pointRadius: 0,
    }],
  };
  const opts = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    scales: {
      x: { display: false },
      y: { display: false, min: 0, max: max * 1.2 },
    },
  };
  return (
    <div className="h-8 w-20">
      <Line data={chartData} options={opts} />
    </div>
  );
}

export default function StockForecastModal({ isOpen, onClose, predictions, loading = false }) {
  const [activeTab, setActiveTab] = useState('ALL');
  const [sortBy, setSortBy] = useState('daysLeft');
  const [sortAsc, setSortAsc] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const tabCounts = useMemo(() => {
    if (!predictions) return {};
    return predictions.reduce((acc, p) => {
      acc[p.riskLevel] = (acc[p.riskLevel] || 0) + 1;
      return acc;
    }, {});
  }, [predictions]);

  const filtered = useMemo(() => {
    if (!predictions) return [];
    let list = [...predictions];
    if (activeTab !== 'ALL') list = list.filter(p => p.riskLevel === activeTab);
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
    level === 'CRITICAL' ? 'danger' : level === 'HIGH' ? 'warning' : level === 'LOW' ? 'primary' : 'success';

  const riskLabel = (level) =>
    ({ CRITICAL: 'KRITIS', HIGH: 'TINGGI', LOW: 'RENDAH', SAFE: 'AMAN' })[level] || level;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Sparkles className="text-indigo-400" size={18} />
          <span>Smart Stock Forecast</span>
        </div>
      }
      size="xl"
    >
      <div className="space-y-4">
        {/* Info Banner */}
        <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-indigo-500/10 rounded-xl flex-shrink-0">
              <ShoppingCart className="text-indigo-400" size={22} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[var(--text-primary)] mb-1">Strategi Restok AI</h4>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Berdasarkan tren penjualan tertimbang <span className="text-indigo-400 font-bold">(70% tren terkini + 30% baseline)</span>, kami sarankan segera restok item{' '}
                <span className="text-red-400 font-bold">KRITIS</span> dan{' '}
                <span className="text-amber-400 font-bold">TINGGI</span> untuk mencegah kekosongan stok 14 hari ke depan.
              </p>
            </div>
          </div>
        </div>

        {/* Filter Tabs + Search Row */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          {/* Tabs */}
          <div className="flex items-center gap-1 flex-wrap">
            {RISK_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer border',
                  activeTab === tab.key
                    ? `${tab.activeBg} ${tab.color} border-current/20`
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-2)]'
                )}
              >
                {tab.label}
                {tab.key !== 'ALL' && tabCounts[tab.key] > 0 && (
                  <span className={cn(
                    'text-[9px] font-black px-1 py-0.5 rounded-full',
                    activeTab === tab.key ? 'bg-current/10' : 'bg-[var(--surface-2)]'
                  )}>
                    {tabCounts[tab.key]}
                  </span>
                )}
                {tab.key === 'ALL' && (
                  <span className="text-[9px] font-black px-1 py-0.5 rounded-full bg-[var(--surface-2)]">
                    {predictions?.length || 0}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--surface-2)] border border-[var(--surface-border)] w-full sm:w-48">
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
                'flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer',
                sortBy === opt.key
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-2)] border border-transparent'
              )}
            >
              {opt.label}
              {sortBy === opt.key && (
                sortAsc ? <TrendingUp size={9} /> : <TrendingDown size={9} />
              )}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-hidden border border-[var(--surface-border)] rounded-2xl">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 skeleton rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle2 size={32} className="mx-auto text-emerald-400 mb-3 opacity-60" />
              <p className="text-sm font-bold text-[var(--text-secondary)]">
                {activeTab === 'ALL' ? 'Belum ada data peramalan.' : `Tidak ada produk dengan status "${RISK_TABS.find(t=>t.key===activeTab)?.label}".`}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-[var(--surface-1)]">
                  <TableHead className="text-[10px] uppercase font-bold tracking-widest pl-4">Produk</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold tracking-widest">Stok</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold tracking-widest hidden sm:table-cell">Tren 7 Hari</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold tracking-widest hidden md:table-cell">Ritme/Hari</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold tracking-widest text-center">Status</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold tracking-widest text-right pr-4">Saran Order</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => {
                  const isExpanded = expandedId === p.id;
                  const hasTrend = p.trend && p.trend.some(v => v > 0);
                  return (
                    <React.Fragment key={p.id}>
                      <TableRow
                        className={cn(
                          'cursor-pointer hover:bg-[var(--surface-2)]/40 transition-colors',
                          isExpanded && 'bg-indigo-500/[0.03]'
                        )}
                        onClick={() => setExpandedId(isExpanded ? null : p.id)}
                      >
                        <TableCell className="pl-4">
                          <div className="flex items-center gap-2">
                            <div>
                              <div className="font-bold text-[var(--text-primary)] text-sm leading-tight">{p.name}</div>
                              <div className="text-[10px] text-[var(--text-muted)] font-medium mt-0.5">
                                {p.daysLeft >= 9999 ? 'Tidak ada data jual' : `±${p.daysLeft} hari tersisa`}
                              </div>
                            </div>
                            {isExpanded ? <ChevronUp size={12} className="text-indigo-400 ml-1 flex-shrink-0" /> : <ChevronDown size={12} className="text-[var(--text-muted)] ml-1 flex-shrink-0 opacity-0 group-hover:opacity-100" />}
                          </div>
                        </TableCell>
                        <TableCell className="font-bold text-[var(--text-secondary)]">
                          {p.stock} <span className="text-[10px] font-medium text-[var(--text-muted)]">unit</span>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {hasTrend ? <Sparkline data={p.trend} /> : (
                            <span className="text-[10px] text-[var(--text-muted)] italic">No data</span>
                          )}
                        </TableCell>
                        <TableCell className="text-indigo-400 font-bold hidden md:table-cell">
                          {p.weightedAvg > 0 ? p.weightedAvg.toFixed(2) : (
                            <span className="text-[var(--text-muted)] font-medium text-xs italic">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={riskVariant(p.riskLevel)}
                            className="text-[9px] font-black tracking-tighter"
                          >
                            {p.riskLevel === 'CRITICAL' && <AlertCircle size={9} className="mr-1" />}
                            {p.riskLevel === 'SAFE' && <CheckCircle2 size={9} className="mr-1" />}
                            {riskLabel(p.riskLevel)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          {p.orderSuggestion > 0 ? (
                            <div className="inline-flex flex-col items-end">
                              <span className="text-sm font-black text-indigo-400">+{p.orderSuggestion}</span>
                              <span className="text-[8px] text-indigo-400/50 font-bold uppercase tracking-widest">Unit Baru</span>
                            </div>
                          ) : (
                            <span className="text-[var(--text-muted)] font-bold text-xs">Cukup</span>
                          )}
                        </TableCell>
                      </TableRow>

                      {/* Expanded Row — sparkline detail */}
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={6} className="px-4 pb-4 pt-0 bg-indigo-500/[0.02]">
                            <div className="flex flex-col sm:flex-row gap-4 pt-2 border-t border-indigo-500/10">
                              {/* Chart */}
                              <div className="flex-1">
                                <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest mb-2">Tren Penjualan 7 Hari Terakhir</p>
                                {hasTrend ? (
                                  <div className="h-28 bg-indigo-500/[0.02] rounded-xl p-2 border border-indigo-500/10">
                                    <Line
                                      data={{
                                        labels: ['6 hari lalu', '5 hari lalu', '4 hari lalu', '3 hari lalu', '2 hari lalu', 'Kemarin', 'Hari ini'],
                                        datasets: [{
                                          data: p.trend,
                                          borderColor: 'rgba(99,102,241,0.9)',
                                          backgroundColor: 'rgba(99,102,241,0.1)',
                                          borderWidth: 2,
                                          fill: true,
                                          tension: 0.4,
                                          pointRadius: 3,
                                          pointHoverRadius: 5,
                                          pointBackgroundColor: 'rgba(99,102,241,1)',
                                          pointBorderColor: '#fff',
                                          pointBorderWidth: 1.5,
                                        }],
                                      }}
                                      options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        animation: { duration: 400 },
                                        plugins: {
                                          legend: { display: false },
                                          tooltip: {
                                            backgroundColor: '#0f172a',
                                            borderColor: 'rgba(255,255,255,0.1)',
                                            borderWidth: 1,
                                            cornerRadius: 8,
                                            padding: 8,
                                            callbacks: { label: i => ` ${i.raw} unit terjual` }
                                          }
                                        },
                                        scales: {
                                          x: { display: false },
                                          y: { display: false, beginAtZero: true },
                                        },
                                      }}
                                    />
                                  </div>
                                ) : (
                                  <p className="text-xs text-[var(--text-muted)] italic py-4">Belum ada histori penjualan produk ini.</p>
                                )}
                              </div>
                              {/* Stats Detail */}
                              <div className="sm:w-48 space-y-2">
                                <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Detail Analisis</p>
                                <div className="space-y-1.5">
                                  <div className="flex justify-between items-center py-1.5 border-b border-[var(--surface-border)]">
                                    <span className="text-xs text-[var(--text-muted)]">Ritme Jual/Hari</span>
                                    <span className="text-xs font-bold text-indigo-400">{p.weightedAvg > 0 ? p.weightedAvg.toFixed(2) : '—'} unit</span>
                                  </div>
                                  <div className="flex justify-between items-center py-1.5 border-b border-[var(--surface-border)]">
                                    <span className="text-xs text-[var(--text-muted)]">Stok Saat Ini</span>
                                    <span className="text-xs font-bold text-[var(--text-primary)]">{p.stock} unit</span>
                                  </div>
                                  <div className="flex justify-between items-center py-1.5 border-b border-[var(--surface-border)]">
                                    <span className="text-xs text-[var(--text-muted)]">Prediksi Habis</span>
                                    <span className={cn('text-xs font-bold', p.daysLeft <= 3 ? 'text-red-400' : p.daysLeft <= 7 ? 'text-amber-400' : 'text-emerald-400')}>
                                      {p.daysLeft >= 9999 ? 'Tidak diketahui' : `±${p.daysLeft} hari`}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center py-1.5">
                                    <span className="text-xs text-[var(--text-muted)]">Saran Order</span>
                                    <span className="text-xs font-black text-indigo-400">+{p.orderSuggestion} unit</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Footer note */}
        <p className="text-[10px] text-[var(--text-muted)] text-center">
          Klik baris untuk melihat grafik trend detail • Data diperbarui setiap kali dashboard dimuat
        </p>
      </div>
    </Modal>
  );
}
