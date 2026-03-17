"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DollarSign,
  ShoppingBag,
  Package,
  TrendingUp,
  ArrowUpRight,
  PieChart,
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
  Filler,
  Tooltip,
  ArcElement,
  PieController,
  DoughnutController,
  Legend,
} from "chart.js";
import { Line, Doughnut, Pie } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
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

  // New States for Analytics
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

      // Monthly sales (for stats and pie chart)
      const { data: monthTx } = await supabase
        .from("transactions")
        .select("id, total_amount, payment_method")
        .eq("user_id", user.id)
        .gte("created_at", monthStart)
        .eq("status", "completed");

      const monthSales =
        monthTx?.reduce((sum, t) => sum + t.total_amount, 0) || 0;

      // Calculate Payment Methods Data
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

      // Fetch Transaction Items & Products for Category Analysis
      if (monthTx && monthTx.length > 0) {
        const txIds = monthTx.map((t) => t.id);

        // Get all products to map category
        const { data: allProducts } = await supabase
          .from("products")
          .select("id, category_id");

        // Get all categories to map name
        const { data: allCategories } = await supabase
          .from("categories")
          .select("id, name");

        // Create product to category mapping
        const productToCategoryMap = {};
        const categoryNameMap = {};

        (allCategories || []).forEach((c) => (categoryNameMap[c.id] = c.name));

        (allProducts || []).forEach((p) => {
          productToCategoryMap[p.id] = p.category_id
            ? categoryNameMap[p.category_id]
            : "Uncategorized";
        });

        // Fetch Items
        const { data: items } = await supabase
          .from("transaction_items")
          .select("product_id, quantity, price")
          .in("transaction_id", txIds);

        const categorySalesMap = {};
        (items || []).forEach((item) => {
          const catName =
            productToCategoryMap[item.product_id] || "Uncategorized";
          const curSales = item.quantity * item.price;
          categorySalesMap[catName] =
            (categorySalesMap[catName] || 0) + curSales;
        });

        // Sort by sales (desc)
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

      // 7-day sales data for chart
      const { data: weekTx } = await supabase
        .from("transactions")
        .select("total_amount, created_at")
        .eq("user_id", user.id)
        .gte("created_at", weekStart)
        .eq("status", "completed");

      // Group by day
      const dailyMap = {};
      for (let i = 6; i >= 0; i--) {
        const day = dayjs().subtract(i, "day").format("YYYY-MM-DD");
        dailyMap[day] = 0;
      }
      (weekTx || []).forEach((tx) => {
        const day = dayjs(tx.created_at).format("YYYY-MM-DD");
        if (dailyMap[day] !== undefined) {
          dailyMap[day] += tx.total_amount;
        }
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
        .limit(5);

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

  // General Line Chart config
  const chartData = {
    labels: weeklyData.map((d) => d.label),
    datasets: [
      {
        data: weeklyData.map((d) => d.amount),
        borderColor: "rgba(99, 102, 241, 1)",
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, "rgba(99, 102, 241, 0.4)");
          gradient.addColorStop(1, "rgba(99, 102, 241, 0)");
          return gradient;
        },
        borderWidth: 3,
        fill: true,
        tension: 0.5,
        pointRadius: 4,
        pointBackgroundColor: "rgba(99, 102, 241, 1)",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointHoverRadius: 6,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#1e293b",
        borderColor: "#475569",
        borderWidth: 1,
        titleColor: "#f1f5f9",
        bodyColor: "#94a3b8",
        cornerRadius: 12,
        padding: 12,
        callbacks: {
          title: (items) => weeklyData[items[0]?.dataIndex]?.fullDate || "",
          label: (item) => `Penjualan: ${formatRupiah(item.raw)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#64748b", font: { size: 11 } },
      },
      y: {
        grid: { color: "rgba(255, 255, 255, 0.05)", borderDash: [5, 5] },
        border: { dash: [5, 5] },
        beginAtZero: true,
        ticks: {
          color: "#64748b",
          font: { size: 10 },
          callback: (v) => {
            if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
            if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
            return v;
          },
        },
      },
    },
  };

  // Category Doughnut Chart Config
  const categoryChartData = {
    labels: categoryData.labels,
    datasets: [
      {
        data: categoryData.data,
        backgroundColor: [
          "rgba(99, 102, 241, 0.8)", // Indigo
          "rgba(16, 185, 129, 0.8)", // Emerald
          "rgba(245, 158, 11, 0.8)", // Amber
          "rgba(236, 72, 153, 0.8)", // Pink
          "rgba(139, 92, 246, 0.8)", // Violet
          "rgba(6, 182, 212, 0.8)", // Cyan
          "rgba(244, 63, 94, 0.8)", // Rose
        ],
        borderColor: "rgba(30, 41, 59, 1)", // match bg-slate-800
        borderWidth: 2,
        hoverOffset: 4,
      },
    ],
  };

  // Payment Method Pie Chart Config
  const paymentChartData = {
    labels: paymentData.labels,
    datasets: [
      {
        data: paymentData.data,
        backgroundColor: [
          "rgba(16, 185, 129, 0.8)", // Cash - Emerald
          "rgba(59, 130, 246, 0.8)", // Transfer - Blue
          "rgba(139, 92, 246, 0.8)", // QRIS - Violet
        ],
        borderColor: "rgba(30, 41, 59, 1)",
        borderWidth: 2,
        hoverOffset: 4,
      },
    ],
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right",
        labels: {
          color: "#94a3b8",
          font: { size: 11 },
          usePointStyle: true,
          boxWidth: 8,
        },
      },
      tooltip: {
        backgroundColor: "#1e293b",
        borderColor: "#475569",
        borderWidth: 1,
        callbacks: {
          label: (item) => ` ${item.label}: ${formatRupiah(item.raw)}`,
        },
      },
    },
  };

  // Yesterday comparison
  const yesterdaySales =
    weeklyData.length >= 2 ? weeklyData[weeklyData.length - 2].amount : 0;
  const todayTrend =
    yesterdaySales > 0
      ? Math.round(((stats.todaySales - yesterdaySales) / yesterdaySales) * 100)
      : 0;

  // Get time-based greeting
  const getGreeting = () => {
    const hour = dayjs().hour();
    if (hour < 11) return "Selamat Pagi 🌅";
    if (hour < 15) return "Selamat Siang ☀️";
    if (hour < 18) return "Selamat Sore 🌤️";
    return "Selamat Malam 🌙";
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="skeleton h-80 rounded-xl" />
          <div className="skeleton h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          {getGreeting()}
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Ringkasan bisnis Anda hari ini
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* 7-day Chart */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Tren Penjualan</h3>
            <p className="text-xs text-slate-500">7 hari terakhir</p>
          </div>
          <Badge variant="primary">
            {formatRupiah(weeklyData.reduce((s, d) => s + d.amount, 0))}
          </Badge>
        </div>
        <div className="h-52">
          <Line data={chartData} options={chartOptions} />
        </div>
      </Card>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales By Category */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white">
                Penjualan per Kategori
              </h3>
              <p className="text-xs text-slate-500">Bulan Ini</p>
            </div>
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <PieChart className="text-indigo-400" size={18} />
            </div>
          </div>
          <div className="h-48 flex justify-center items-center">
            {categoryData.labels.length > 0 ? (
              <Doughnut data={categoryChartData} options={pieOptions} />
            ) : (
              <div className="scale-75 origin-top w-full">
                 <EmptyState icon={PieChart} title="Belum Ada Data" description="Belum ada penjualan bulan ini" />
              </div>
            )}
          </div>
        </Card>

        {/* Sales by Payment Method */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white">
                Metode Pembayaran
              </h3>
              <p className="text-xs text-slate-500">Bulan Ini</p>
            </div>
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <DollarSign className="text-emerald-400" size={18} />
            </div>
          </div>
          <div className="h-48 flex justify-center items-center">
            {paymentData.labels.length > 0 ? (
              <Pie data={paymentChartData} options={pieOptions} />
            ) : (
              <div className="scale-75 origin-top w-full">
                 <EmptyState icon={DollarSign} title="Belum Ada Data" description="Belum ada transaksi bulan ini" />
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Bottom Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Produk Populer</h3>
            <Badge variant="primary">Bulan ini</Badge>
          </div>
          <div className="space-y-3">
            {topProducts.length === 0 ? (
              <EmptyState icon={Package} title="Kosong" description="Belum ada data produk" />
            ) : (
              topProducts.map((product, index) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800/50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-sm font-bold text-indigo-400">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {product.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      Stok: {product.stock}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-white">
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
            <h3 className="text-lg font-semibold text-white">
              Transaksi Terakhir
            </h3>
            <a
              href="/transactions"
              className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
            >
              Lihat semua <ArrowUpRight size={14} />
            </a>
          </div>
          <div className="space-y-3">
            {recentTransactions.length === 0 ? (
              <EmptyState icon={ShoppingBag} title="Kosong" description="Belum ada transaksi" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[400px]">
                  <thead>
                    <tr className="border-b border-slate-700/50 text-xs text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 px-2 font-medium">Invoice</th>
                      <th className="pb-3 px-2 font-medium">Waktu</th>
                      <th className="pb-3 px-2 font-medium text-right">Total</th>
                      <th className="pb-3 px-2 font-medium text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {recentTransactions.map((tx) => (
                      <tr
                        key={tx.id}
                        className="hover:bg-slate-800/50 transition-colors group"
                      >
                        <td className="py-3 px-2">
                          <span className="text-sm font-semibold text-white group-hover:text-indigo-400 transition-colors">
                            {tx.invoice_number}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-xs text-slate-400">
                          {formatDate(tx.created_at, "DD MMM, HH:mm")}
                        </td>
                        <td className="py-3 px-2 text-sm font-medium text-emerald-400 text-right">
                          {formatRupiah(tx.total_amount)}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <Badge
                            variant={
                              tx.status === "completed" ? "success" : "warning"
                            }
                            className="text-[10px] px-2 py-0.5"
                          >
                            {tx.status === "completed" ? "Lunas" : "Pending"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default withRBAC(DashboardPage, ["owner"]);
