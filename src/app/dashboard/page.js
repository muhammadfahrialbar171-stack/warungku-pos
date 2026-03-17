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
  Activity,
} from "lucide-react";
import { StatCard } from "@/components/ui/Card";
import { withRBAC } from "@/components/layout/withRBAC";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { formatRupiah, formatRupiahShort, formatDate } from "@/lib/utils";
import dayjs from "dayjs";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
  ArcElement,
  PieController,
  DoughnutController,
  Legend,
  BarController,
} from "chart.js";
import { Line, Doughnut, Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  BarController,
  Filler,
  Tooltip,
  ArcElement,
  PieController,
  DoughnutController,
  Legend,
);

function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    todaySales: 0,
    todayTransactions: 0,
    totalProducts: 0,
    monthSales: 0,
  });
  const [topProducts, setTopProducts] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [categoryData, setCategoryData] = useState({ labels: [], data: [] });
  const [paymentData, setPaymentData] = useState({ labels: [], data: [] });
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const today = dayjs().startOf("day").toISOString();
      const monthStart = dayjs().startOf("month").toISOString();
      const weekStart = dayjs().subtract(6, "day").startOf("day").toISOString();

      // Today's transactions
      const { data: todayTx } = await supabase
        .from("transactions")
        .select("total_amount")
        .eq("user_id", user.id)
        .gte("created_at", today)
        .eq("status", "completed");

      const todaySales =
        todayTx?.reduce((sum, t) => sum + t.total_amount, 0) || 0;

      // Monthly sales
      const { data: monthTx } = await supabase
        .from("transactions")
        .select("id, total_amount, payment_method")
        .eq("user_id", user.id)
        .gte("created_at", monthStart)
        .eq("status", "completed");

      const monthSales =
        monthTx?.reduce((sum, t) => sum + t.total_amount, 0) || 0;

      // Payment Methods Data
      const paymentMethodMap = {};
      (monthTx || []).forEach((tx) => {
        const method =
          tx.payment_method === "cash"
            ? "Cash"
            : tx.payment_method === "qris"
              ? "QRIS"
              : tx.payment_method === "transfer"
                ? "Transfer"
                : tx.payment_method;
        paymentMethodMap[method] =
          (paymentMethodMap[method] || 0) + tx.total_amount;
      });
      setPaymentData({
        labels: Object.keys(paymentMethodMap),
        data: Object.values(paymentMethodMap),
      });

      // Category Analysis
      if (monthTx && monthTx.length > 0) {
        const txIds = monthTx.map((t) => t.id);
        const { data: allProducts } = await supabase
          .from("products")
          .select("id, category_id");
        const { data: allCategories } = await supabase
          .from("categories")
          .select("id, name");

        const productToCategoryMap = {};
        const categoryNameMap = {};
        (allCategories || []).forEach((c) => (categoryNameMap[c.id] = c.name));
        (allProducts || []).forEach((p) => {
          productToCategoryMap[p.id] = p.category_id
            ? categoryNameMap[p.category_id]
            : "Lainnya";
        });

        const { data: items } = await supabase
          .from("transaction_items")
          .select("product_id, quantity, price")
          .in("transaction_id", txIds);

        const categorySalesMap = {};
        (items || []).forEach((item) => {
          const catName =
            productToCategoryMap[item.product_id] || "Lainnya";
          categorySalesMap[catName] =
            (categorySalesMap[catName] || 0) + item.quantity * item.price;
        });

        const sortedCategories = Object.entries(categorySalesMap).sort(
          (a, b) => b[1] - a[1],
        );
        setCategoryData({
          labels: sortedCategories.map((c) => c[0]),
          data: sortedCategories.map((c) => c[1]),
        });
      } else {
        setCategoryData({ labels: [], data: [] });
      }

      // 7-day sales data
      const { data: weekTx } = await supabase
        .from("transactions")
        .select("total_amount, created_at")
        .eq("user_id", user.id)
        .gte("created_at", weekStart)
        .eq("status", "completed");

      const dailyMap = {};
      for (let i = 6; i >= 0; i--) {
        const day = dayjs().subtract(i, "day").format("YYYY-MM-DD");
        dailyMap[day] = 0;
      }
      (weekTx || []).forEach((tx) => {
        const day = dayjs(tx.created_at).format("YYYY-MM-DD");
        if (dailyMap[day] !== undefined) dailyMap[day] += tx.total_amount;
      });
      setWeeklyData(
        Object.entries(dailyMap).map(([date, amount]) => ({
          label: dayjs(date).format("dd"),
          fullDate: dayjs(date).format("DD MMM"),
          amount,
        })),
      );

      // Total products
      const { count: productCount } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_active", true);

      setStats({
        todaySales,
        todayTransactions: todayTx?.length || 0,
        totalProducts: productCount || 0,
        monthSales,
      });

      // Top products
      const { data: products } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(5);
      setTopProducts(products || []);

      // Recent transactions
      const { data: recent } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(6);
      setRecentTransactions(recent || []);
    } catch (err) {
      console.error("Dashboard error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

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
        data: weeklyData.map((d) => d.amount),
        borderColor: "rgba(99, 102, 241, 1)",
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 250);
          gradient.addColorStop(0, "rgba(99, 102, 241, 0.3)");
          gradient.addColorStop(1, "rgba(99, 102, 241, 0)");
          return gradient;
        },
        borderWidth: 2.5,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: "rgba(99, 102, 241, 1)",
        pointHoverBorderColor: "#fff",
        pointHoverBorderWidth: 2,
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
        backgroundColor: "rgba(15, 23, 42, 0.95)",
        borderColor: "rgba(71, 85, 105, 0.5)",
        borderWidth: 1,
        titleColor: "#f1f5f9",
        bodyColor: "#94a3b8",
        cornerRadius: 10,
        padding: 12,
        titleFont: { size: 12, weight: "600" },
        bodyFont: { size: 11 },
        callbacks: {
          title: (items) => weeklyData[items[0]?.dataIndex]?.fullDate || "",
          label: (item) => `Penjualan: ${formatRupiah(item.raw)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: "#64748b", font: { size: 11, weight: "500" } },
      },
      y: {
        grid: { color: "rgba(148, 163, 184, 0.08)", drawBorder: false },
        border: { display: false },
        beginAtZero: true,
        ticks: {
          color: "#64748b",
          font: { size: 10 },
          padding: 8,
          callback: (v) => {
            if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
            if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
            return v;
          },
        },
      },
    },
  };

  const categoryChartData = {
    labels: categoryData.labels,
    datasets: [
      {
        data: categoryData.data,
        backgroundColor: [
          "rgba(99, 102, 241, 0.85)",
          "rgba(16, 185, 129, 0.85)",
          "rgba(245, 158, 11, 0.85)",
          "rgba(236, 72, 153, 0.85)",
          "rgba(139, 92, 246, 0.85)",
          "rgba(6, 182, 212, 0.85)",
          "rgba(244, 63, 94, 0.85)",
        ],
        borderColor: "transparent",
        borderWidth: 0,
        hoverOffset: 6,
        borderRadius: 3,
        spacing: 2,
      },
    ],
  };

  const paymentChartData = {
    labels: paymentData.labels,
    datasets: [
      {
        data: paymentData.data,
        backgroundColor: [
          "rgba(16, 185, 129, 0.85)",
          "rgba(59, 130, 246, 0.85)",
          "rgba(139, 92, 246, 0.85)",
          "rgba(245, 158, 11, 0.85)",
        ],
        borderColor: "transparent",
        borderWidth: 0,
        hoverOffset: 6,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "70%",
    plugins: {
      legend: {
        position: "right",
        labels: {
          color: "#94a3b8",
          font: { size: 11, weight: "500" },
          usePointStyle: true,
          pointStyle: "rectRounded",
          boxWidth: 8,
          boxHeight: 8,
          padding: 12,
        },
      },
      tooltip: {
        backgroundColor: "rgba(15, 23, 42, 0.95)",
        borderColor: "rgba(71, 85, 105, 0.5)",
        borderWidth: 1,
        cornerRadius: 10,
        padding: 10,
        callbacks: {
          label: (item) => ` ${item.label}: ${formatRupiah(item.raw)}`,
        },
      },
    },
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right",
        labels: {
          color: "#94a3b8",
          font: { size: 11, weight: "500" },
          usePointStyle: true,
          pointStyle: "rectRounded",
          boxWidth: 8,
          boxHeight: 8,
          padding: 12,
        },
      },
      tooltip: {
        backgroundColor: "rgba(15, 23, 42, 0.95)",
        borderColor: "rgba(71, 85, 105, 0.5)",
        borderWidth: 1,
        cornerRadius: 10,
        padding: 10,
        callbacks: {
          label: (item) => ` ${item.label}: ${formatRupiah(item.raw)}`,
        },
      },
    },
    scales: {
      x: { display: false },
      y: { display: false },
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
      <div className="space-y-6 animate-fade-in">
        {/* Header skeleton */}
        <div className="space-y-2">
          <div className="skeleton h-7 w-48 rounded-lg" />
          <div className="skeleton h-4 w-64 rounded-lg" />
        </div>
        {/* Stat cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-[120px] rounded-xl" />
          ))}
        </div>
        {/* Chart skeleton */}
        <div className="skeleton h-[320px] rounded-xl" />
        {/* Bottom section skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="skeleton h-[280px] rounded-xl" />
          <div className="skeleton h-[280px] rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ===== Page Header ===== */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight">
            {getGreeting()}, {user?.store_name?.split(' ')[0] || 'User'} 👋
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <CalendarDays size={13} className="text-[var(--text-muted)]" />
            <p className="text-[13px] text-[var(--text-secondary)]">{todayFormatted}</p>
          </div>
        </div>
        <Badge variant="primary" dot>
          <Activity size={12} className="mr-0.5" />
          Live
        </Badge>
      </div>

      {/* ===== Stat Cards ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 stagger-children">
        <StatCard
          title="Penjualan Hari Ini"
          value={formatRupiahShort(stats.todaySales)}
          icon={DollarSign}
          color="indigo"
          trend={todayTrend !== 0 ? Math.abs(todayTrend) : undefined}
          trendUp={todayTrend > 0}
        />
        <StatCard
          title="Transaksi Hari Ini"
          value={stats.todayTransactions}
          icon={ShoppingBag}
          color="emerald"
        />
        <StatCard
          title="Total Produk"
          value={stats.totalProducts}
          icon={Package}
          color="amber"
        />
        <StatCard
          title="Omzet Bulan Ini"
          value={formatRupiahShort(stats.monthSales)}
          icon={TrendingUp}
          color="rose"
        />
      </div>

      {/* ===== Sales Chart ===== */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Tren Penjualan</h3>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">7 hari terakhir</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-lg font-bold text-[var(--text-primary)]">
                {formatRupiahShort(weeklyData.reduce((s, d) => s + d.amount, 0))}
              </p>
              <p className="text-[10px] text-[var(--text-muted)]">Total 7 hari</p>
            </div>
          </div>
        </div>
        <div className="h-56 sm:h-64">
          <Line data={chartData} options={chartOptions} />
        </div>
      </Card>

      {/* ===== Analytics Charts ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Penjualan per Kategori</h3>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Bulan ini</p>
            </div>
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <PieChart className="text-indigo-400" size={16} />
            </div>
          </div>
          <div className="h-48 flex justify-center items-center">
            {categoryData.labels.length > 0 ? (
              <Doughnut data={categoryChartData} options={doughnutOptions} />
            ) : (
              <EmptyState compact icon={PieChart} title="Belum Ada Data" description="Belum ada penjualan bulan ini" />
            )}
          </div>
        </Card>

        {/* Payment Method */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Metode Pembayaran</h3>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Bulan ini</p>
            </div>
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <DollarSign className="text-emerald-400" size={16} />
            </div>
          </div>
          <div className="h-48 flex justify-center items-center">
            {paymentData.labels.length > 0 ? (
              <Bar data={paymentChartData} options={barOptions} />
            ) : (
              <EmptyState compact icon={DollarSign} title="Belum Ada Data" description="Belum ada transaksi bulan ini" />
            )}
          </div>
        </Card>
      </div>

      {/* ===== Bottom Sections ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Products */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Produk Populer</h3>
            <Badge variant="primary">Top 5</Badge>
          </div>
          <div className="space-y-2">
            {topProducts.length === 0 ? (
              <EmptyState compact icon={Package} title="Kosong" description="Belum ada data produk" />
            ) : (
              topProducts.map((product, index) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[var(--surface-2)]/50 transition-colors group"
                >
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center text-xs font-bold text-indigo-400 flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[var(--text-primary)] truncate group-hover:text-indigo-400 transition-colors">
                      {product.name}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Stok: {product.stock}
                    </p>
                  </div>
                  <p className="text-[13px] font-semibold text-[var(--text-primary)] tabular-nums">
                    {formatRupiah(product.price)}
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Transaksi Terakhir</h3>
            <a
              href="/transactions"
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors font-medium"
            >
              Lihat semua <ArrowUpRight size={12} />
            </a>
          </div>
          <div className="space-y-1">
            {recentTransactions.length === 0 ? (
              <EmptyState compact icon={ShoppingBag} title="Kosong" description="Belum ada transaksi" />
            ) : (
              recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-lg hover:bg-[var(--surface-2)]/50 transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-[var(--text-primary)] truncate group-hover:text-indigo-400 transition-colors">
                      {tx.invoice_number}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {formatDate(tx.created_at, "DD MMM, HH:mm")}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[13px] font-semibold text-emerald-400 tabular-nums">
                      {formatRupiah(tx.total_amount)}
                    </p>
                    <Badge
                      variant={tx.status === "completed" ? "success" : "warning"}
                      className="text-[9px] px-1.5 py-0"
                    >
                      {tx.status === "completed" ? "Lunas" : "Pending"}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default withRBAC(DashboardPage, ["owner"]);
