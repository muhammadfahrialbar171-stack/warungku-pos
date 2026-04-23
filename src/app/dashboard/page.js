"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DollarSign,
  ShoppingBag,
  Package,
  TrendingUp,
  ArrowUpRight,
  PieChart,
  CalendarDays,
  Sparkles,
  Clock,
  TrendingDown,
  BarChart3,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { StatCard } from "@/components/ui/Card";
import { withRBAC } from "@/components/layout/withRBAC";
import PushNotificationManager from "@/components/dashboard/PushNotificationManager";
import StockForecastModal from "@/components/dashboard/StockForecastModal";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { useDashboardStore } from "@/store/dashboardStore";
import { formatRupiah, formatRupiahShort, formatDate } from "@/lib/utils";
import dayjs from "dayjs";
import dynamic from 'next/dynamic';
import { calculateStockForecasting, calculatePeakHour } from "@/lib/analytics";

const DashboardChart = dynamic(() => import('@/components/dashboard/LazyChart').then(mod => mod.DashboardChart), { 
  ssr: false, 
  loading: () => <div className="skeleton w-full h-full rounded-xl" /> 
});
const DashboardDoughnut = dynamic(() => import('@/components/dashboard/LazyChart').then(mod => mod.DashboardDoughnut), { 
  ssr: false, 
  loading: () => <div className="skeleton w-full h-full rounded-full" /> 
});

const EXPENSE_CATEGORIES = [
  { id: 'bahan_baku', label: 'Bahan Baku & Stok' },
  { id: 'gaji', label: 'Gaji Karyawan' },
  { id: 'listrik_air', label: 'Listrik & Air' },
  { id: 'sewa', label: 'Sewa Tempat' },
  { id: 'operasional', label: 'Operasional Lainnya' },
  { id: 'pajak', label: 'Pajak & Retribusi' },
  { id: 'lainnya', label: 'Lain-lain' },
];

function DashboardPage() {
  const { user } = useAuthStore();
  const {
    stats, topProducts, lowStockProducts, recentTransactions,
    weeklyData, weeklyProfitData, weeklyExpenseData,
    categoryData, expenseData, aiInsights,
    isCacheValid, setDashboardData, invalidateCache,
  } = useDashboardStore();

  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(true);
  const [showForecastModal, setShowForecastModal] = useState(false);

  const loadDashboard = useCallback(async (forceRefresh = false) => {
    if (!user) return;

    // ✅ Use cache if valid (and not forced refresh)
    if (!forceRefresh && isCacheValid()) {
      setLoading(false);
      setAiLoading(false);
      return;
    }

    setLoading(true);
    setAiLoading(true);
    const storeId = user.owner_id || user.id;

    // Safety timeout: Ensure loading spinner disappears after 8s even if DB hangs
    const safetyTimeout = setTimeout(() => {
        setLoading(false);
        setAiLoading(false);
    }, 8000);

    try {
      const today = dayjs().startOf("day").toISOString();
      const monthStart = dayjs().startOf("month").toISOString();
      const weekStart = dayjs().subtract(6, "day").startOf("day").toISOString();

      // Today's transactions
      const { data: todayTx } = await supabase
        .from("transactions")
        .select("total_amount")
        .eq("user_id", storeId)
        .gte("created_at", today)
        .eq("status", "completed");

      const todaySales =
        todayTx?.reduce((sum, t) => sum + t.total_amount, 0) || 0;

      // Monthly sales
      const { data: monthTx } = await supabase
        .from("transactions")
        .select("id, total_amount, payment_method")
        .eq("user_id", storeId)
        .gte("created_at", monthStart)
        .eq("status", "completed");

      const monthSales =
        monthTx?.reduce((sum, t) => sum + t.total_amount, 0) || 0;

      // Expenses Data & Profit Calculation
      const { data: monthExpenses } = await supabase
        .from("expenses")
        .select("amount, category, expense_date")
        .eq("user_id", storeId)
        .gte("expense_date", dayjs().startOf("month").format("YYYY-MM-DD"));

      const totalExpenses = monthExpenses?.reduce((sum, e) => sum + e.amount, 0) || 0;

      // Map Expenses for Chart
      const expenseMap = {};
      (monthExpenses || []).forEach(e => {
        const cat = EXPENSE_CATEGORIES.find(c => c.id === e.category)?.label || e.category || 'Lainnya';
        expenseMap[cat] = (expenseMap[cat] || 0) + e.amount;
      });
      // expenseData is now handled in setDashboardData below

      // Calculate HPP (COGS) & Category Analysis
      let totalHPP = 0;

      // 1. Fetch metadata needed for mapping (Moved out of monthTx scope)
      const [{ data: allProducts }, { data: allCategories }] = await Promise.all([
        supabase.from("products").select("id, category_id, cost_price").eq("user_id", storeId),
        supabase.from("categories").select("id, name")
      ]);

      const productToCategoryMap = {};
      const productToCostMap = {};
      const categoryNameMap = {};
      
      (allCategories || []).forEach((c) => (categoryNameMap[c.id] = c.name));
      (allProducts || []).forEach((p) => {
        productToCostMap[p.id] = p.cost_price || 0;
        productToCategoryMap[p.id] = p.category_id
          ? categoryNameMap[p.category_id]
          : "Lainnya";
      });

      // Declare categorySalesMap in outer scope so setDashboardData can access it
      const categorySalesMap = {};

      if (monthTx && monthTx.length > 0) {
        const txIds = monthTx.map((t) => t.id);

        // 2. Fetch items in parallel chunks to maximize performance
        const chunks = [];
        for (let i = 0; i < txIds.length; i += 200) chunks.push(txIds.slice(i, i + 200));

        const chunkPromises = chunks.map(chunk => 
          supabase
            .from("transaction_items")
            .select("product_id, quantity, price, cost_price, transaction_id")
            .in("transaction_id", chunk)
        );

        const chunkResults = await Promise.all(chunkPromises);
        let monthItems = [];
        chunkResults.forEach(res => {
          if (res.data) monthItems = monthItems.concat(res.data);
        });

        // 3. Process in single pass
        monthItems.forEach((item) => {
          // Accurate HPP Calculation using Snapshot
          totalHPP += (item.quantity * (item.cost_price || 0));
          
          // Category Analysis
          const catName = productToCategoryMap[item.product_id] || "Lainnya";
          categorySalesMap[catName] = (categorySalesMap[catName] || 0) + item.quantity * item.price;
        });
      }

      // 7-day sales, EXPENSES & PROFIT data
      const [{ data: weekTx }, { data: weekExpenses }] = await Promise.all([
        supabase
          .from("transactions")
          .select("id, total_amount, created_at")
          .eq("user_id", storeId)
          .gte("created_at", weekStart)
          .eq("status", "completed"),
        supabase
          .from("expenses")
          .select("amount, expense_date")
          .eq("user_id", storeId)
          .gte("expense_date", dayjs().subtract(6, "day").format("YYYY-MM-DD"))
      ]);

      // To calculate daily profit, we need cost prices for those week items
      const dailyMap = {};
      const dailyProfitMap = {};
      const dailyExpenseMap = {};
      
      for (let i = 6; i >= 0; i--) {
        const day = dayjs().subtract(i, "day").format("YYYY-MM-DD");
        dailyMap[day] = 0;
        dailyProfitMap[day] = 0;
        dailyExpenseMap[day] = 0;
      }

      // Calculate expenses per day
      (weekExpenses || []).forEach(e => {
         const date = dayjs(e.expense_date).format("YYYY-MM-DD");
         if (dailyExpenseMap[date] !== undefined) {
             dailyExpenseMap[date] += e.amount;
         }
      });

      if (weekTx && weekTx.length > 0) {
        const txIds = weekTx.map(t => t.id);
        const { data: weekItems } = await supabase
            .from("transaction_items")
            .select("product_id, quantity, price, cost_price, transaction_id")
            .in("transaction_id", txIds);

        const txToDateMap = {};
        weekTx.forEach(t => txToDateMap[t.id] = dayjs(t.created_at).format("YYYY-MM-DD"));

        (weekItems || []).forEach(item => {
            const date = txToDateMap[item.transaction_id];
            const salesVal = item.quantity * item.price;
            const costVal = item.quantity * (item.cost_price || 0); // Precise Historical Cost
            
            if (dailyMap[date] !== undefined) {
                dailyMap[date] += salesVal;
                dailyProfitMap[date] += (salesVal - costVal);
            }
        });
      }

      // Deduct daily expenses AFTER gross profit is calculated
      for (let i = 6; i >= 0; i--) {
        const day = dayjs().subtract(i, "day").format("YYYY-MM-DD");
        dailyProfitMap[day] -= dailyExpenseMap[day];
      }

      // weeklyData, weeklyProfitData, weeklyExpenseData all handled in setDashboardData below

      // Restore missing state calculations
      const { data: activeProducts, count: productCount } = await supabase
          .from("products")
          .select("*", { count: "exact" })
          .eq("user_id", storeId)
          .eq("is_active", true);

      const lowStock = (activeProducts || [])
          .filter(p => p.stock <= (p.min_stock ?? 5))
          .sort((a, b) => a.stock - b.stock)
          .slice(0, 5);

      const netProfit = monthSales - totalHPP - totalExpenses;
      const marginPercent = monthSales > 0 ? (netProfit / monthSales) * 100 : 0;

      // Recent transactions
      const { data: recent } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", storeId)
        .order("created_at", { ascending: false })
        .limit(6);      // ===== AI Insights Calculation (Using Centralized Library) =====
      const thirtyDaysAgo = dayjs().subtract(30, "day").toISOString();
      const { data: txHistory } = await supabase
        .from("transactions")
        .select("id, created_at")
        .eq("user_id", storeId)
        .gte("created_at", thirtyDaysAgo)
        .eq("status", "completed");

      const peakHr = calculatePeakHour(txHistory);

      // Fetch items for forecasting
      let itemHistory = [];
      if (txHistory && txHistory.length > 0) {
        const txIds = txHistory.map(t => t.id);
        const chunks = [];
        for (let i = 0; i < txIds.length; i += 200) chunks.push(txIds.slice(i, i + 200));
        
        const chunkPromises = chunks.map(chunk => 
          supabase
            .from("transaction_items")
            .select("product_id, quantity, transaction_id")
            .in("transaction_id", chunk)
        );

        const chunkResults = await Promise.all(chunkPromises);
        chunkResults.forEach(res => { if (res.data) itemHistory = itemHistory.concat(res.data); });
      }

      const { data: currentProducts } = await supabase
        .from("products")
        .select("id, name, stock, is_active")
        .eq("user_id", storeId);

      const txDateMap = {};
      (txHistory || []).forEach(tx => { txDateMap[tx.id] = tx.created_at; });

      const allProductPredictions = calculateStockForecasting(currentProducts, itemHistory, txDateMap);

      // Predictions for display: only urgently at-risk (<=14 days & actually selling)
      const predictions = allProductPredictions
        .filter(p => p.is_active && p.daysLeft <= 14 && p.weightedAvg > 0)
        .slice(0, 10);

      // Top products BY VOLUME (Last 30 Days)
      const volumeMap = {};
      itemHistory.forEach(item => {
        volumeMap[item.product_id] = (volumeMap[item.product_id] || 0) + item.quantity;
      });

      const top5Volume = Object.entries(volumeMap)
        .sort((a,b) => b[1] - a[1])
        .slice(0, 5);
      
      const top5Products = top5Volume.map(([pid, vol]) => {
        const p = allProductPredictions.find(ap => String(ap.id) === String(pid));
        return {
            id: pid,
            name: p?.name || 'Produk Terhapus',
            volume: vol
        };
      });

      // ===== Commit all data to the cache store =====
      setDashboardData({
        stats: {
          todaySales,
          todayTransactions: todayTx?.length || 0,
          monthSales,
          totalExpenses,
          netProfit,
          margin: Math.round(marginPercent),
          activeProducts: productCount
        },
        topProducts: top5Products,
        lowStockProducts: lowStock || [],
        recentTransactions: recent || [],
        weeklyData: Object.entries(dailyMap).map(([date, amount]) => ({
          label: dayjs(date).format("dd"),
          fullDate: dayjs(date).format("DD MMM"),
          amount,
        })),
        weeklyProfitData: Object.values(dailyProfitMap),
        weeklyExpenseData: Object.values(dailyExpenseMap),
        categoryData: {
          labels: Object.entries(categorySalesMap)
            .sort((a, b) => b[1] - a[1])
            .map(c => c[0]),
          data: Object.entries(categorySalesMap)
            .sort((a, b) => b[1] - a[1])
            .map(c => c[1]),
        },
        expenseData: {
          labels: Object.keys(expenseMap),
          data: Object.values(expenseMap),
        },
        aiInsights: {
          lowStockPredictions: predictions.slice(0, 5),
          allPredictions: allProductPredictions,
          urgentPredictions: predictions,
          peakHour: peakHr,
          totalRevenueLastMonth: monthSales,
        },
      });

    } catch (err) {
        console.error("Dashboard Load Error:", err);
    } finally {
      clearTimeout(safetyTimeout);
      setLoading(false);
      setAiLoading(false);
    }
  }, [isCacheValid, setDashboardData, user]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // ===== Refresh handler =====
  const handleRefresh = useCallback(() => {
    loadDashboard(true);
  }, [loadDashboard]);

  // ===== Realtime Subscription =====
  useEffect(() => {
    if (!user) return;
    const storeId = user.owner_id || user.id;

    const channel = supabase.channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${storeId}` }, () => {
          handleRefresh();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: `user_id=eq.${storeId}` }, () => {
          handleRefresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, handleRefresh]);

  // Yesterday comparison
  const yesterdaySales =
    weeklyData.length >= 2 ? weeklyData[weeklyData.length - 2].amount : 0;
  const todayTrend =
    yesterdaySales > 0
      ? Math.round(((stats.todaySales - yesterdaySales) / yesterdaySales) * 100)
      : 0;

  // ===== Chart Configs =====
  const chartData = {
    labels: weeklyData.map((d) => d.label),
    datasets: [
      {
        type: "line",
        label: "Profit",
        data: weeklyProfitData,
        borderColor: "rgb(16, 185, 129)", // Emerald
        borderWidth: 4,
        pointBackgroundColor: "#ffffff",
        pointBorderColor: "rgb(16, 185, 129)",
        pointRadius: 0,
        pointHoverRadius: 6,
        fill: false,
        tension: 0.4,
        order: 1,
      },
      {
        type: "line",
        label: "Pengeluaran",
        data: weeklyExpenseData,
        borderColor: "#ef4444",
        borderWidth: 2,
        pointBackgroundColor: "#ef4444",
        pointBorderColor: "transparent",
        pointRadius: 0,
        pointHoverRadius: 4,
        fill: false,
        tension: 0.4,
        order: 2,
      },
      {
        type: "line",
        label: "Omzet",
        data: weeklyData.map((d) => d.amount),
        borderColor: "rgb(59, 130, 246)",
        borderWidth: 3,
        pointBackgroundColor: "rgb(59, 130, 246)",
        pointBorderColor: "rgba(255,255,255,0.5)",
        pointRadius: 0,
        pointHoverRadius: 6,
        fill: false,
        tension: 0.4,
        order: 3,
      },
      {
        type: "bar",
        label: "Penjualan",
        data: weeklyData.map((d) => d.amount),
        backgroundColor: "rgba(59, 130, 246, 0.25)",
        hoverBackgroundColor: "rgba(59, 130, 246, 0.4)",
        borderRadius: 4,
        maxBarThickness: 32,
        order: 3,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(9, 9, 11, 0.9)",
        borderColor: "rgba(39, 39, 42, 0.5)",
        borderWidth: 1,
        titleColor: "#a1a1aa",
        bodyColor: "#fafafa",
        cornerRadius: 8,
        padding: 10,
        boxPadding: 4,
        usePointStyle: true,
        titleFont: { size: 10, weight: "500", family: 'Inter' },
        bodyFont: { size: 12, weight: "600", family: 'Inter' },
        callbacks: {
          title: (items) => weeklyData[items[0]?.dataIndex]?.fullDate || "",
          label: (item) => ` ${item.dataset.label}: ${formatRupiah(item.raw)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: "#71717a", font: { size: 11, weight: "500", family: 'Inter' } },
      },
      y: {
        grid: { color: "rgba(39, 39, 42, 0.3)", drawBorder: false },
        border: { display: false },
        beginAtZero: true,
        ticks: {
          color: "#71717a",
          font: { size: 11, weight: "500", family: 'Inter' },
          padding: 8,
          callback: (v) => {
            if (v >= 1000000) return `${(v / 1000000).toFixed(1)}jt`;
            if (v >= 1000) return `${(v / 1000).toFixed(0)}rb`;
            return v;
          },
        },
      },
    },
  };

  const categoryDataConfig = {
    labels: categoryData.labels,
    datasets: [
      {
        data: categoryData.data,
        backgroundColor: [
          "#3b82f6", // Blue
          "#10b981", // Emerald
          "#8b5cf6", // Purple
          "#f59e0b", // Amber
          "#ec4899", // Pink
          "#06b6d4", // Cyan
          "#f43f5e", // Rose
          "#6366f1", // Indigo
          "#84cc16"  // Lime
        ],
        hoverBackgroundColor: function(context) {
            return context.dataset.backgroundColor;
        },
        borderWidth: 0,
        hoverOffset: 8,
        borderRadius: 4,
        spacing: 2,
      },
    ],
  };

  const expenseDataConfig = {
    labels: expenseData.labels,
    datasets: [
      {
        data: expenseData.data,
        backgroundColor: [
          "#ef4444", // Red
          "#f97316", // Orange
          "#eab308", // Yellow
          "#14b8a6", // Teal
          "#8b5cf6", // Purple
          "#0ea5e9", // Sky Blue
          "#d946ef", // Fuchsia
          "#10b981", // Emerald
          "#64748b"  // Slate
        ],
        hoverBackgroundColor: function(context) {
            return context.dataset.backgroundColor;
        },
        borderWidth: 0,
        hoverOffset: 8,
        borderRadius: 4,
        spacing: 2,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "78%",
    plugins: {
      legend: {
        position: "right",
        labels: {
          color: "#a1a1aa",
          font: { size: 10, weight: "500", family: 'Inter' },
          usePointStyle: true,
          pointStyle: "circle",
          padding: 12,
        },
      },
      tooltip: {
        backgroundColor: "rgba(9, 9, 11, 0.9)",
        borderColor: "rgba(39, 39, 42, 0.5)",
        borderWidth: 1,
        cornerRadius: 8,
        padding: 10,
        boxPadding: 4,
        bodyFont: { size: 12, weight: "600" },
        callbacks: {
          label: (item) => ` ${item.label}: ${formatRupiah(item.raw)}`,
        },
      },
    },
  };

  // ===== Greeting =====
  const getGreeting = () => {
    const hour = dayjs().hour();
    if (hour < 11) return "Selamat Pagi";
    if (hour < 15) return "Selamat Siang";
    if (hour < 18) return "Selamat Sore";
    return "Selamat Malam";
  };

  const todayFormatted = dayjs().format("dddd, DD MMMM YYYY");

  // ===== Loading Skeleton =====
  if (loading) {
    return (
      <div className="space-y-5 animate-fade-in">
        <div className="space-y-2">
          <div className="skeleton h-6 w-48 rounded-lg" />
          <div className="skeleton h-4 w-56 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-24 rounded-xl" />
          ))}
        </div>
        <div className="skeleton h-72 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="skeleton h-64 rounded-xl" />
          <div className="skeleton h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 animate-fade-in text-[var(--text-primary)]">
      {/* ===== Page Header ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-[0.2em] mb-1">
            {getGreeting()}
          </p>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl sm:text-4xl font-black text-[var(--text-primary)] tracking-tight">
                {user?.store_name || 'TokoKU'}
            </h1>
            <span className="text-2xl animate-float">👋</span>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--surface-2)]/50 border border-[var(--surface-border)] backdrop-blur-sm">
              <CalendarDays size={12} className="text-[var(--color-primary-light)]" />
              <p className="text-[11px] font-bold text-[var(--text-secondary)] tracking-wide">{todayFormatted}</p>
            </div>
          </div>
        </div>
        {/* Header Actions */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <PushNotificationManager />
          <button
            onClick={handleRefresh}
            disabled={loading}
            title="Perbarui data dashboard"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--surface-2)]/50 border border-[var(--surface-border)] text-[var(--text-secondary)] text-[12px] font-semibold hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* ===== Stat Cards ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 stagger-children">
        <StatCard
          title="Penjualan Hari Ini"
          value={formatRupiahShort(stats.todaySales)}
          icon={DollarSign}
          color="blue"
          trend={todayTrend !== 0 ? Math.abs(todayTrend) : undefined}
          trendUp={todayTrend > 0}
        />
        <StatCard
          title="Transaksi Hari Ini"
          value={stats.todayTransactions}
          icon={ShoppingBag}
          color="amber"
          subtitle="Aktivitas hari ini"
        />
        <StatCard
          title="Laba Bersih (Bulan)"
          value={formatRupiahShort(stats.netProfit)}
          icon={stats.netProfit < 0 ? TrendingDown : TrendingUp}
          color={stats.netProfit < 0 ? 'rose' : 'emerald'}
          subtitle={`${stats.netProfit < 0 ? 'Waspada rugi' : 'Pertumbuhan stabil'} • Margin ${stats.margin || 0}%`}
        />
        <StatCard
          title="Omzet Bulan Ini"
          value={formatRupiahShort(stats.monthSales)}
          icon={BarChart3}
          color="violet"
          subtitle="Total pendapatan kotor"
        />
      </div>

      {/* ===== Sales Chart ===== */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Tren Penjualan</h3>
            <p className="text-[12px] text-[var(--text-muted)] mt-0.5">7 hari terakhir</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-[var(--text-primary)] tabular-nums">
              {formatRupiahShort(weeklyData.reduce((s, d) => s + d.amount, 0))}
            </p>
            <p className="text-[11px] text-[var(--text-muted)]">Total Mingguan</p>
          </div>
        </div>
        <div className="h-64">
          <DashboardChart data={chartData} options={chartOptions} />
        </div>
      </Card>

      {/* ===== Analytics Charts ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category */}
        <Card>
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Penjualan per Kategori</h3>
            <p className="text-[12px] text-[var(--text-muted)] mt-0.5">Bulan berjalan</p>
          </div>
          <div className="h-48 flex justify-center items-center">
            {categoryData.labels.length > 0 ? (
              <DashboardDoughnut data={categoryDataConfig} options={doughnutOptions} />
            ) : (
              <EmptyState compact icon={PieChart} title="Belum Ada Data" description="Belum ada transaksi kategori" />
            )}
          </div>
        </Card>

        {/* Expenses Distribution */}
        <Card>
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Distribusi Pengeluaran</h3>
            <p className="text-[12px] text-[var(--text-muted)] mt-0.5">Bulan berjalan</p>
          </div>
          <div className="h-48 flex justify-center items-center">
            {expenseData.labels.length > 0 ? (
              <DashboardDoughnut data={expenseDataConfig} options={doughnutOptions} />
            ) : (
              <EmptyState compact icon={Package} title="Belum Ada Data" description="Belum ada catatan biaya" />
            )}
          </div>
        </Card>
      </div>

      {/* ===== AI Insights Section ===== */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--surface-border)]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-blue-500/10">
              <Sparkles className="text-blue-500" size={16} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">AI Insights</h2>
              <p className="text-[11px] text-[var(--text-muted)]">Analisis otomatis berdasarkan data toko</p>
            </div>
          </div>
        </div>

        {stats.todayTransactions < 30 && recentTransactions.length < 10 ? (
          <Card className="text-center">
            <div className="max-w-sm mx-auto py-4">
              <div className="w-10 h-10 bg-[var(--surface-2)] rounded-lg flex items-center justify-center mx-auto mb-3">
                <RefreshCw className="text-[var(--text-muted)] animate-spin-slow" size={20} />
              </div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Mengumpulkan Data</h3>
              <p className="text-[12px] text-[var(--text-muted)] leading-relaxed mb-4">
                Butuh sekitar <strong className="text-[var(--text-secondary)]">{30 - recentTransactions.length} transaksi lagi</strong> untuk prediksi stok yang akurat.
              </p>
              <div className="max-w-xs mx-auto">
                <div className="flex items-center justify-between mb-1.5 px-0.5">
                  <span className="text-[10px] font-medium text-[var(--text-muted)]">Progress</span>
                  <span className="text-[10px] font-medium text-[var(--text-secondary)]">{recentTransactions.length}/30</span>
                </div>
                <div className="h-1.5 w-full bg-[var(--surface-2)] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, (recentTransactions.length / 30) * 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </Card>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Prediction Card */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Prediksi Stok</h3>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Estimasi habis</p>
              </div>
              {aiInsights.lowStockPredictions.length > 0 && (
                <button 
                  onClick={() => setShowForecastModal(true)}
                  className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  <ArrowUpRight size={14} />
                </button>
              )}
            </div>

            <div className="space-y-2">
              {aiLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-12 skeleton rounded-lg" />
                  ))}
                </div>
              ) : aiInsights.lowStockPredictions.length === 0 ? (
                <div className="py-5 text-center">
                    <div className="w-8 h-8 bg-[var(--surface-2)] rounded-lg flex items-center justify-center mx-auto mb-2">
                      <CheckCircle2 className="text-emerald-500" size={16} />
                    </div>
                    <p className="text-[12px] text-[var(--text-muted)]">Stok aman untuk 14 hari ke depan.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                    {aiInsights.lowStockPredictions.map(p => (
                    <div key={p.id} className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-[var(--surface-2)]/50 hover:bg-[var(--surface-2)] transition-colors">
                        <div className="min-w-0 flex-1">
                            <p className="text-[12px] font-medium text-[var(--text-primary)] truncate">{p.name}</p>
                            <p className="text-[11px] text-[var(--text-muted)]">
                                {p.daysLeft === 0 ? 'Habis hari ini' : `~${p.daysLeft} hari lagi`}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {p.orderSuggestion > 0 && (
                                <span className="text-[10px] font-medium text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded">
                                    +{p.orderSuggestion}
                                </span>
                            )}
                            <div className={cn(
                              "h-2 w-2 rounded-full",
                              p.riskLevel === 'CRITICAL' ? 'bg-red-500' : p.riskLevel === 'HIGH' ? 'bg-amber-500' : 'bg-blue-500'
                            )}></div>
                        </div>
                    </div>
                    ))}
                </div>
              )}
            </div>
          </Card>

          {/* Peak Hour Card */}
          <Card>
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Jam Ramai</h3>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Waktu puncak transaksi</p>
            </div>

            <div className="flex flex-col items-center justify-center py-4">
              {aiLoading ? (
                <div className="h-14 w-28 skeleton rounded-lg"></div>
              ) : aiInsights.peakHour !== null ? (
                <>
                  <div className="text-4xl font-bold text-[var(--text-primary)] tracking-tight tabular-nums mb-2">
                    {aiInsights.peakHour < 10 ? `0${aiInsights.peakHour}` : aiInsights.peakHour}<span className="text-[var(--text-muted)]">:00</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] font-medium">Rata-rata terpadat</p>
                </>
              ) : (
                <p className="text-sm text-[var(--text-muted)]">Data sedang diolah...</p>
              )}
            </div>
            
            <div className="mt-4 pt-3 border-t border-[var(--surface-border)]">
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Pastikan stok barang terlaris sudah siap sebelum jam puncak dimulai.
              </p>
            </div>
          </Card>

          {/* Strategy Card */}
          <Card>
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Rekomendasi</h3>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Saran berdasarkan tren</p>
            </div>

            <div className="space-y-3">
              {aiLoading ? (
                <div className="space-y-2">
                  <div className="h-4 skeleton rounded w-full" />
                  <div className="h-4 skeleton rounded w-3/4" />
                </div>
              ) : (
                <>
                  <div className="flex gap-2.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
                    <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
                      {aiInsights.lowStockPredictions.length > 0 
                        ? `Fokus restock ${aiInsights.lowStockPredictions[0].name} — berisiko habis dalam waktu dekat.` 
                        : "Sirkulasi stok Anda optimal. Pertahankan performa restock saat ini."}
                    </p>
                  </div>
                  <div className="flex gap-2.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
                    <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
                      Tambah variasi produk di kategori terlaku untuk meningkatkan rata-rata belanja per pelanggan.
                    </p>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>
        )}

        <StockForecastModal 
            isOpen={showForecastModal} 
            onClose={() => setShowForecastModal(false)}
            predictions={aiInsights.allPredictions}
        />
      </div>


      {/* ===== Bottom Sections ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Low Stock Alert */}
        <Card>
          <div className="flex items-center justify-between mb-4 gap-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Stok Menipis</h3>
            {lowStockProducts.length > 0 ? (
              <Badge variant="danger">Perlu Restock</Badge>
            ) : (
              <Badge variant="success">Aman</Badge>
            )}
          </div>
          <div className="space-y-2">
            {lowStockProducts.length === 0 ? (
              <EmptyState compact icon={Package} title="Stok Aman" description="Semua stok produk tersedia." />
            ) : (
              lowStockProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center gap-4 p-3 rounded-xl bg-[var(--surface-2)]/20 border border-white/5 hover:bg-[var(--surface-2)]/40 transition-all group"
                >
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0 shadow-sm transition-transform group-hover:scale-110",
                    product.stock <= 5 ? "bg-red-500/20 text-red-500 animate-pulse-red" : "bg-rose-500/10 text-rose-500"
                  )}>
                    !
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-[var(--text-primary)] truncate tracking-tight">
                      {product.name}
                    </p>
                    <p className={cn("text-[11px] font-semibold", product.stock <= 5 ? "text-red-500" : "text-rose-500/80")}>
                      Tersisa: {product.stock} unit
                    </p>
                  </div>
                  <Badge variant="danger" className={cn("text-[9px] font-black uppercase tracking-wider", product.stock <= 5 && "animate-pulse-red")}>{product.stock <= 0 ? 'Habis' : 'Kritis'}</Badge>
                </div>
              ))
            )}
            {lowStockProducts.length > 0 && (
                <a href="/products" className="block text-center text-[11px] font-black text-blue-500 uppercase tracking-[0.1em] py-2 hover:text-blue-400 transition-colors">Kelola Inventaris &rarr;</a>
            )}
          </div>
        </Card>

        {/* Top Products Chart (UPGRADED) */}
        <Card>
          <div className="flex items-center justify-between mb-4 gap-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Produk Terpopuler</h3>
            <Badge variant="primary">30 Hari Terakhir</Badge>
          </div>
          <div className="h-48 flex justify-center items-center">
            {topProducts.length > 0 ? (
              <Doughnut 
                data={{
                  labels: topProducts.map(p => p.name),
                  datasets: [{
                    data: topProducts.map(p => p.volume),
                    backgroundColor: [
                        "#8b5cf6", // Violet
                        "#ec4899", // Pink
                        "#f43f5e", // Rose
                        "#f97316", // Orange
                        "#eab308", // Yellow
                    ],
                    hoverBackgroundColor: function(context) {
                        return context.dataset.backgroundColor;
                    },
                    borderWidth: 0,
                    hoverOffset: 8,
                    spacing: 4,
                    borderRadius: 10
                  }]
                }} 
                options={{
                  ...doughnutOptions,
                  plugins: {
                    ...doughnutOptions.plugins,
                    legend: {
                        position: 'right',
                        labels: {
                            color: '#a1a1aa',
                            font: { size: 9, weight: '500' },
                            usePointStyle: true,
                            padding: 8
                        }
                    },
                    tooltip: {
                      callbacks: {
                        label: (item) => ` ${item.label}: ${item.raw} unit terjual`
                      }
                    }
                  }
                }} 
              />
            ) : (
              <EmptyState compact icon={Package} title="Kosong" description="Belum ada data penjualan" />
            )}
          </div>
        </Card>
      </div>

      {/* ===== Recent Transactions ===== */}
      <Card>
        <div className="flex items-center justify-between mb-5 gap-3 pb-4 border-b border-[var(--surface-border)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Transaksi Terakhir</h3>
          <a
            href="/transactions"
            className="text-[12px] text-blue-500 hover:text-blue-400 flex items-center gap-1 transition-colors font-medium"
          >
            Lihat semua <ArrowUpRight size={12} />
          </a>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {recentTransactions.length === 0 ? (
            <div className="col-span-full"><EmptyState compact icon={ShoppingBag} title="Kosong" description="Belum ada transaksi" /></div>
          ) : (
            recentTransactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between gap-4 p-4 rounded-xl bg-[var(--surface-2)]/20 border border-white/5 hover:bg-[var(--surface-2)]/40 transition-all group"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-[var(--text-primary)] truncate tracking-tight group-hover:text-blue-400 transition-colors">
                    {tx.invoice_number}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1 text-[11px] font-semibold text-[var(--text-muted)]">
                    <Clock size={10} />
                    {formatDate(tx.created_at, "DD MMM, HH:mm")}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[14px] font-black text-emerald-500 tabular-nums">
                    {formatRupiah(tx.total_amount)}
                  </p>
                  <div className="flex justify-end mt-1.5">
                    <Badge
                      variant={tx.status === "completed" ? "success" : "warning"}
                      className="text-[9px] font-black px-2 py-0.5 uppercase tracking-widest"
                    >
                      {tx.status === "completed" ? "Lunas" : "Pending"}
                    </Badge>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

export default withRBAC(DashboardPage, ["owner"]);
