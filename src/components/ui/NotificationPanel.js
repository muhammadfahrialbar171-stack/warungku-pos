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
    const badgeCount = stockAlerts.length;

    const typeStyles = {
        danger: 'bg-red-500/10 border-red-500/20 text-red-400',
        warning: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
        info: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
        success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
        default: 'bg-slate-700/30 border-slate-700 text-slate-300',
    };

    const iconStyles = {
        danger: 'text-red-400',
        warning: 'text-amber-400',
        info: 'text-blue-400',
        success: 'text-emerald-400',
        default: 'text-slate-400',
    };

    return (
        <div className="relative" ref={panelRef}>
            {/* Bell Button */}
            <button
                onClick={() => setOpen(!open)}
                className="p-2.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer relative"
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
                <div className="absolute right-0 top-12 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl shadow-black/40 z-50 animate-scale-in overflow-hidden">
                    {/* Panel Header */}
                    <div className="flex items-center justify-between p-4 border-b border-slate-800">
                        <div className="flex items-center gap-2">
                            <Bell size={18} className="text-indigo-400" />
                            <h3 className="font-semibold text-white text-sm">Notifikasi</h3>
                        </div>
                        <button
                            onClick={() => setOpen(false)}
                            className="p-1 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-white transition-colors cursor-pointer"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Notification List */}
                    <div className="max-h-[400px] overflow-y-auto">
                        {loading ? (
                            <div className="p-4 space-y-3">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="skeleton h-16 rounded-xl" />
                                ))}
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">
                                <Bell size={32} className="mx-auto mb-2 opacity-30" />
                                <p className="text-sm">Tidak ada notifikasi</p>
                            </div>
                        ) : (
                            <div className="p-3 space-y-2">
                                {/* Stock Alerts Section */}
                                {stockAlerts.length > 0 && (
                                    <>
                                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-1 pt-1">
                                            Peringatan Stok ({stockAlerts.length})
                                        </p>
                                        {stockAlerts.map((notif) => (
                                            <div
                                                key={notif.id}
                                                className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${typeStyles[notif.type]}`}
                                            >
                                                <notif.icon size={18} className={`flex-shrink-0 mt-0.5 ${iconStyles[notif.type]}`} />
                                                <div className="min-w-0">
                                                    <p className="text-xs font-semibold">{notif.title}</p>
                                                    <p className="text-xs opacity-80 truncate">{notif.message}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </>
                                )}

                                {/* Transaction & Target Section */}
                                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-1 pt-2">
                                    Aktivitas Hari Ini
                                </p>
                                {notifications
                                    .filter((n) => n.category !== 'stock')
                                    .map((notif) => (
                                        <div
                                            key={notif.id}
                                            className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${typeStyles[notif.type]}`}
                                        >
                                            <notif.icon size={18} className={`flex-shrink-0 mt-0.5 ${iconStyles[notif.type]}`} />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold">{notif.title}</p>
                                                <p className="text-xs opacity-80">{notif.message}</p>
                                                {/* Progress bar for target */}
                                                {notif.percentage !== undefined && (
                                                    <div className="mt-2 w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-500 ${notif.percentage >= 100
                                                                ? 'bg-emerald-400'
                                                                : notif.percentage >= 50
                                                                    ? 'bg-amber-400'
                                                                    : 'bg-indigo-400'
                                                                }`}
                                                            style={{ width: `${notif.percentage}%` }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
