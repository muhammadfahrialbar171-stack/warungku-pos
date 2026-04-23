'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Bell,
    Package,
    TrendingUp,
    ShoppingBag,
    AlertTriangle,
    XCircle,
    Target,
    X,
    Award,
    ImageOff,
    Sparkles,
    BrainCog,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { formatRupiah } from '@/lib/utils';
import dayjs from 'dayjs';

const DAILY_TARGET = 1000000; // Target Rp 1.000.000/hari (bisa diubah nanti)

export default function NotificationPanel() {
    const { user } = useAuthStore();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const panelRef = useRef(null);

    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        setLoading(true);

        try {
            const notifs = [];
            const today = dayjs().startOf('day').toISOString();

            // 1. Fetch low stock products
            const { data: lowStockProducts } = await supabase
                .from('products')
                .select('id, name, stock')
                .eq('user_id', user.id)
                .eq('is_active', true)
                .lte('stock', 5)
                .order('stock', { ascending: true })
                .limit(10);

            if (lowStockProducts) {
                lowStockProducts.forEach((p) => {
                    if (p.stock <= 0) {
                        notifs.push({
                            id: `stock-out-${p.id}`,
                            type: 'danger',
                            icon: XCircle,
                            title: 'Stok Habis',
                            message: `${p.name} — stok 0`,
                            category: 'stock',
                        });
                    } else {
                        notifs.push({
                            id: `stock-low-${p.id}`,
                            type: 'warning',
                            icon: AlertTriangle,
                            title: 'Stok Menipis',
                            message: `${p.name} — sisa ${p.stock}`,
                            category: 'stock',
                        });
                    }
                });
            }

            // 2. Today's transaction summary
            const { data: todayTx } = await supabase
                .from('transactions')
                .select('total_amount')
                .eq('user_id', user.id)
                .gte('created_at', today)
                .eq('status', 'completed');

            const txCount = todayTx?.length || 0;
            const txTotal = todayTx?.reduce((sum, t) => sum + t.total_amount, 0) || 0;

            notifs.push({
                id: 'today-summary',
                type: 'info',
                icon: ShoppingBag,
                title: 'Transaksi Hari Ini',
                message: `${txCount} transaksi — ${formatRupiah(txTotal)}`,
                category: 'transaction',
            });

            // 3. Daily revenue target
            const percentage = Math.min(100, Math.round((txTotal / DAILY_TARGET) * 100));
            const isAchieved = txTotal >= DAILY_TARGET;

            notifs.push({
                id: 'daily-target',
                type: isAchieved ? 'success' : 'default',
                icon: isAchieved ? TrendingUp : Target,
                title: isAchieved ? '🎉 Target Tercapai!' : 'Target Harian',
                message: isAchieved
                    ? `Omzet ${formatRupiah(txTotal)} melampaui target ${formatRupiah(DAILY_TARGET)}`
                    : `${formatRupiah(txTotal)} / ${formatRupiah(DAILY_TARGET)} (${percentage}%)`,
                percentage: isAchieved ? 100 : percentage,
                category: 'target',
            });

            // 4. BIG Transaction Alert (> 200rb)
            const bigTransactions = todayTx?.filter(t => t.total_amount >= 200000) || [];
            if (bigTransactions.length > 0) {
                // Find the single biggest transaction
                const maxTx = bigTransactions.reduce((prev, current) => (prev.total_amount > current.total_amount) ? prev : current);
                notifs.push({
                    id: 'big-tx',
                    type: 'success',
                    icon: Award,
                    title: 'Pesanan Besar! 🚀',
                    message: `Transaksi senilai ${formatRupiah(maxTx.total_amount)} hari ini.`,
                    category: 'achievement',
                });
            }

            // 5. Incomplete product data (missing category or image)
            const { count: missingImageCount } = await supabase
                .from('products')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .is('image_url', null);

            if (missingImageCount && missingImageCount > 0) {
                notifs.push({
                    id: 'incomplete-products',
                    type: 'warning',
                    icon: ImageOff,
                    title: 'Data Etalase Kurang',
                    message: `Ada ${missingImageCount} produk yang belum memiliki gambar.`,
                    category: 'alert',
                });
            }

            // 6. AI Forecast Alerts — detect HIGH/CRITICAL risk products
            try {
                const thirtyDaysAgo = dayjs().subtract(30, 'day').toISOString();
                const sevenDaysAgo = dayjs().subtract(7, 'day').toISOString();

                const { data: txHistAI } = await supabase
                    .from('transactions')
                    .select('id, created_at')
                    .eq('user_id', user.id)
                    .gte('created_at', thirtyDaysAgo)
                    .eq('status', 'completed');

                if (txHistAI && txHistAI.length > 0) {
                    const txIds = txHistAI.map(t => t.id);
                    const txDateMap = {};
                    txHistAI.forEach(t => { txDateMap[t.id] = t.created_at; });

                    let aiItems = [];
                    const chunks = [];
                    for (let i = 0; i < txIds.length; i += 200) chunks.push(txIds.slice(i, i + 200));
                    for (const chunk of chunks) {
                        const { data: ci } = await supabase
                            .from('transaction_items')
                            .select('product_id, quantity, transaction_id')
                            .in('transaction_id', chunk);
                        if (ci) aiItems = aiItems.concat(ci);
                    }

                    const qtyRecent = {}, qtyBaseline = {};
                    aiItems.forEach(item => {
                        const d = txDateMap[item.transaction_id];
                        if (!d) return;
                        if (dayjs(d).isAfter(sevenDaysAgo)) {
                            qtyRecent[item.product_id] = (qtyRecent[item.product_id] || 0) + item.quantity;
                        } else {
                            qtyBaseline[item.product_id] = (qtyBaseline[item.product_id] || 0) + item.quantity;
                        }
                    });

                    const { data: activeProds } = await supabase
                        .from('products')
                        .select('id, name, stock')
                        .eq('user_id', user.id)
                        .eq('is_active', true);

                    const urgentProds = (activeProds || []).map(p => {
                        const wAvg = ((qtyRecent[p.id] || 0) / 7) * 0.7 + ((qtyBaseline[p.id] || 0) / 23) * 0.3;
                        const daysLeft = wAvg > 0 ? Math.floor(p.stock / wAvg) : Infinity;
                        const orderSuggestion = Math.max(0, Math.ceil(wAvg * 14) - p.stock);
                        let riskLevel = 'SAFE';
                        if (daysLeft !== Infinity && daysLeft <= 1) riskLevel = 'CRITICAL';
                        else if (daysLeft !== Infinity && daysLeft <= 3) riskLevel = 'HIGH';
                        return { ...p, daysLeft, riskLevel, orderSuggestion, wAvg };
                    }).filter(p => (p.riskLevel === 'CRITICAL' || p.riskLevel === 'HIGH') && p.wAvg > 0)
                      .sort((a, b) => a.daysLeft - b.daysLeft)
                      .slice(0, 5);

                    urgentProds.forEach(p => {
                        notifs.push({
                            id: `ai-forecast-${p.id}`,
                            type: p.riskLevel === 'CRITICAL' ? 'danger' : 'warning',
                            icon: p.riskLevel === 'CRITICAL' ? Sparkles : BrainCog,
                            title: p.riskLevel === 'CRITICAL' ? '🚨 AI: Stok Kritis' : '⚠️ AI: Risiko Tinggi',
                            message: `${p.name} — habis dalam ±${p.daysLeft === 0 ? 'Hari ini' : p.daysLeft + ' hari'} (saran: +${p.orderSuggestion})`,
                            category: 'forecast',
                        });
                    });
                }
            } catch (aiErr) {
                console.warn('AI forecast notification error (non-fatal):', aiErr);
            }

            setNotifications(notifs);
        } catch (err) {
            console.error('Notification fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    // Fetch on open
    useEffect(() => {
        if (open) fetchNotifications();
    }, [open, fetchNotifications]);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        if (open) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    const stockAlerts = notifications.filter((n) => n.category === 'stock');
    const forecastAlerts = notifications.filter((n) => n.category === 'forecast');
    const badgeCount = stockAlerts.length + forecastAlerts.length;

    const typeStyles = {
        danger: 'bg-red-500/10 border-red-500/20 text-red-400',
        warning: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
        info: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
        success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
        default: 'bg-[var(--surface-2)] border-[var(--surface-border)] text-[var(--text-secondary)]',
    };

    const iconStyles = {
        danger: 'text-red-400',
        warning: 'text-amber-400',
        info: 'text-blue-400',
        success: 'text-emerald-400',
        default: 'text-[var(--text-tertiary)]',
    };

    return (
        <div className="relative" ref={panelRef}>
            {/* Bell Button */}
            <button
                onClick={() => setOpen(!open)}
                className="p-2.5 rounded-xl hover:bg-[var(--surface-2)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer relative"
            >
                <Bell size={20} />
                {badgeCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white animate-scale-in">
                        {badgeCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {open && (
                <div className="absolute right-[-10px] sm:right-0 top-14 w-[90vw] max-w-[320px] sm:w-[420px] sm:max-w-none bg-[var(--surface-1)] backdrop-blur-2xl border border-[var(--surface-border)] rounded-2xl shadow-xl z-50 animate-scale-in overflow-hidden">
                    {/* Panel Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--surface-border)] bg-[var(--surface-2)]/30">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                <Bell size={16} className="text-blue-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-[var(--text-primary)] text-sm leading-none">Notifikasi</h3>
                                <p className="text-[10px] text-[var(--text-muted)] mt-1 font-medium">Informasi toko Anda hari ini</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setOpen(false)}
                            className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Notification List */}
                    <div className="max-h-[480px] overflow-y-auto custom-scrollbar">
                        {loading ? (
                            <div className="p-5 space-y-4">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="skeleton h-20 rounded-2xl" />
                                ))}
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="py-16 px-8 text-center">
                                <div className="w-16 h-16 mx-auto rounded-full bg-[var(--surface-2)] flex items-center justify-center mb-4">
                                    <Bell size={32} className="text-[var(--text-muted)] opacity-40" />
                                </div>
                                <p className="text-sm font-semibold text-[var(--text-secondary)]">Tidak Ada Notifikasi</p>
                                <p className="text-[11px] text-[var(--text-muted)] mt-1">Kami akan memberi tahu Anda jika ada aktivitas baru.</p>
                            </div>
                        ) : (
                            <div className="p-4 space-y-5">
                                {/* Stock Alerts Section */}
                                {stockAlerts.length > 0 && (
                                    <div className="space-y-2.5">
                                        <div className="flex items-center justify-between px-1">
                                            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.1em]">
                                                Peringatan Stok ({stockAlerts.length})
                                            </p>
                                        </div>
                                        {stockAlerts.map((notif) => (
                                            <div
                                                key={notif.id}
                                                className={`flex items-start gap-4 p-3.5 rounded-2xl border transition-all hover:scale-[1.01] bg-[var(--surface-1)] ${typeStyles[notif.type]}`}
                                            >
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-white/5`}>
                                                    <notif.icon size={18} className={iconStyles[notif.type]} />
                                                </div>
                                                <div className="min-w-0 pt-0.5">
                                                    <p className="text-xs font-bold leading-none mb-1 text-[var(--text-primary)]">{notif.title}</p>
                                                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed truncate">{notif.message}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* AI Forecast Alerts Section */}
                                {forecastAlerts.length > 0 && (
                                    <div className="space-y-2.5">
                                        <div className="flex items-center gap-2 px-1">
                                            <Sparkles size={10} className="text-indigo-400" />
                                            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.1em]">
                                                AI Forecast Alert ({forecastAlerts.length})
                                            </p>
                                        </div>
                                        {forecastAlerts.map((notif) => (
                                            <div
                                                key={notif.id}
                                                className={`flex items-start gap-4 p-3.5 rounded-2xl border transition-all hover:scale-[1.01] bg-[var(--surface-1)] ${typeStyles[notif.type]}`}
                                            >
                                                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-indigo-500/10">
                                                    <notif.icon size={18} className="text-indigo-400" />
                                                </div>
                                                <div className="min-w-0 pt-0.5">
                                                    <p className="text-xs font-bold leading-none mb-1 text-[var(--text-primary)]">{notif.title}</p>
                                                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{notif.message}</p>
                                                </div>
                                            </div>
                                        ))}
                                        <a href="/forecast" className="block text-center text-[10px] text-indigo-400 font-bold py-1 hover:underline">
                                            Lihat Laporan Forecast Lengkap →
                                        </a>
                                    </div>
                                )}

                                {/* Transaction & Target Section */}
                                <div className="space-y-2.5">
                                    <div className="flex items-center justify-between px-1">
                                        <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.1em]">
                                            Aktivitas Hari Ini
                                        </p>
                                    </div>
                                    {notifications
                                        .filter((n) => n.category !== 'stock' && n.category !== 'forecast')
                                        .map((notif) => (
                                            <div
                                                key={notif.id}
                                                className={`flex items-start gap-4 p-3.5 rounded-2xl border transition-all hover:scale-[1.01] bg-[var(--surface-1)] ${typeStyles[notif.type]}`}
                                            >
                                                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-white/5">
                                                    <notif.icon size={18} className={iconStyles[notif.type]} />
                                                </div>
                                                <div className="flex-1 min-w-0 pt-0.5">
                                                    <p className="text-xs font-bold leading-none mb-1 text-[var(--text-primary)]">{notif.title}</p>
                                                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{notif.message}</p>
                                                    {/* Progress bar for target */}
                                                    {notif.percentage !== undefined && (
                                                        <div className="mt-3 w-full bg-[var(--surface-2)] rounded-full h-1.5 overflow-hidden border border-[var(--surface-border)]">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-700 ease-out ${notif.percentage >= 100
                                                                    ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]'
                                                                    : notif.percentage >= 50
                                                                        ? 'bg-amber-400'
                                                                        : 'bg-blue-400'
                                                                    }`}
                                                                style={{ width: `${notif.percentage}%` }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
