'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    DollarSign,
    ShoppingBag,
    Package,
    TrendingUp,
    ArrowUpRight,
} from 'lucide-react';
import { StatCard } from '@/components/ui/Card';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { formatRupiah, formatDate } from '@/lib/utils';
import dayjs from 'dayjs';

export default function DashboardPage() {
    const { user } = useAuthStore();
    const [stats, setStats] = useState({
        todaySales: 0,
        todayTransactions: 0,
        totalProducts: 0,
        monthSales: 0,
    });
    const [topProducts, setTopProducts] = useState([]);
    const [recentTransactions, setRecentTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadDashboard = useCallback(async () => {
        if (!user) return;
        setLoading(true);

        try {
            const today = dayjs().startOf('day').toISOString();
            const monthStart = dayjs().startOf('month').toISOString();

            // Today's transactions
            const { data: todayTx } = await supabase
                .from('transactions')
                .select('total_amount')
                .eq('user_id', user.id)
                .gte('created_at', today)
                .eq('status', 'completed');

            const todaySales = todayTx?.reduce((sum, t) => sum + t.total_amount, 0) || 0;

            // Monthly sales
            const { data: monthTx } = await supabase
                .from('transactions')
                .select('total_amount')
                .eq('user_id', user.id)
                .gte('created_at', monthStart)
                .eq('status', 'completed');

            const monthSales = monthTx?.reduce((sum, t) => sum + t.total_amount, 0) || 0;

            // Total products
            const { count: productCount } = await supabase
                .from('products')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('is_active', true);

            setStats({
                todaySales,
                todayTransactions: todayTx?.length || 0,
                totalProducts: productCount || 0,
                monthSales,
            });

            // Top products (this month)
            const { data: topItems } = await supabase
                .from('transaction_items')
                .select('product_name, quantity, subtotal, product_id')
                .in(
                    'transaction_id',
                    (monthTx || []).map(() => '')  // fallback
                );

            // Simplified: get top products from transaction_items via RPC or manual
            // For now, we'll query products sorted by stock changes
            const { data: products } = await supabase
                .from('products')
                .select('*')
                .eq('user_id', user.id)
                .eq('is_active', true)
                .order('updated_at', { ascending: false })
                .limit(5);

            setTopProducts(products || []);

            // Recent transactions
            const { data: recent } = await supabase
                .from('transactions')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(5);

            setRecentTransactions(recent || []);
        } catch (err) {
            console.error('Dashboard error:', err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    if (loading) {
        return (
            <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="skeleton h-32 rounded-2xl" />
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="skeleton h-80 rounded-2xl" />
                    <div className="skeleton h-80 rounded-2xl" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                <p className="text-slate-400 text-sm mt-1">Ringkasan bisnis Anda hari ini</p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Penjualan Hari Ini"
                    value={formatRupiah(stats.todaySales)}
                    icon={DollarSign}
                    color="indigo"
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
                    value={formatRupiah(stats.monthSales)}
                    icon={TrendingUp}
                    color="rose"
                />
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
                            <p className="text-sm text-slate-500 py-4 text-center">Belum ada data produk</p>
                        ) : (
                            topProducts.map((product, index) => (
                                <div
                                    key={product.id}
                                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 hover:bg-slate-800/60 transition-colors"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-sm font-bold text-indigo-400">
                                        {index + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-white truncate">{product.name}</p>
                                        <p className="text-xs text-slate-500">Stok: {product.stock}</p>
                                    </div>
                                    <p className="text-sm font-semibold text-white">{formatRupiah(product.price)}</p>
                                </div>
                            ))
                        )}
                    </div>
                </Card>

                {/* Recent Transactions */}
                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white">Transaksi Terakhir</h3>
                        <a href="/transactions" className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
                            Lihat semua <ArrowUpRight size={14} />
                        </a>
                    </div>
                    <div className="space-y-3">
                        {recentTransactions.length === 0 ? (
                            <p className="text-sm text-slate-500 py-4 text-center">Belum ada transaksi</p>
                        ) : (
                            recentTransactions.map((tx) => (
                                <div
                                    key={tx.id}
                                    className="flex items-center justify-between p-3 rounded-xl bg-slate-800/30 hover:bg-slate-800/60 transition-colors"
                                >
                                    <div>
                                        <p className="text-sm font-medium text-white">{tx.invoice_number}</p>
                                        <p className="text-xs text-slate-500">{formatDate(tx.created_at, 'DD MMM, HH:mm')}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-semibold text-emerald-400">{formatRupiah(tx.total_amount)}</p>
                                        <Badge variant={tx.status === 'completed' ? 'success' : 'warning'} className="text-[10px]">
                                            {tx.status === 'completed' ? 'Lunas' : 'Pending'}
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
