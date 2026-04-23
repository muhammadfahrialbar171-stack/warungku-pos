'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    ShoppingCart,
    Package,
    Boxes,
    Receipt,
    BarChart3,
    LogOut,
    ChevronLeft,
    Settings,
    Users,
    Wallet,
    Barcode,
    Clock,
    BrainCog,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { getOfflineTransactionsQueue } from '@/lib/indexedDB';
import { useState, useEffect } from 'react';

const navSections = [
    {
        label: 'Utama',
        items: [
            { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { href: '/cashier', label: 'Kasir', icon: ShoppingCart },
        ],
    },
    {
        label: 'Manajemen',
        items: [
            { href: '/products', label: 'Produk', icon: Package, ownerOnly: true },
            { href: '/stock', label: 'Stok', icon: Boxes, ownerOnly: true },
            { href: '/forecast', label: 'AI Forecast', icon: BrainCog, ownerOnly: true },
            { href: '/customers', label: 'Pelanggan', icon: Users },
            { href: '/barcode', label: 'Barcode', icon: Barcode, ownerOnly: true },
        ],
    },
    {
        label: 'Keuangan',
        items: [
            { href: '/transactions', label: 'Transaksi', icon: Receipt },
            { href: '/expenses', label: 'Pengeluaran', icon: Wallet },
            { href: '/shifts', label: 'Data Shift', icon: Clock, ownerOnly: true },
            { href: '/reports', label: 'Laporan', icon: BarChart3, ownerOnly: true },
        ],
    },
    {
        label: 'Sistem',
        items: [
            { href: '/settings', label: 'Pengaturan', icon: Settings, ownerOnly: true },
        ],
    },
];

export default function Sidebar({ collapsed, onToggle }) {
    const pathname = usePathname();
    const { user, logout } = useAuthStore();
    const isOwner = !user?.role || user?.role === 'owner';
    const [offlineCount, setOfflineCount] = useState(0);

    useEffect(() => {
        const checkQueue = async () => {
            const queue = await getOfflineTransactionsQueue();
            setOfflineCount(queue.length);
        };
        checkQueue();
        const interval = setInterval(checkQueue, 5000); // Check every 5s
        return () => clearInterval(interval);
    }, []);

    const filterItems = (items) =>
        items.filter(item => {
            if (item.ownerOnly && !isOwner) return false;
            if (item.cashierOnly && isOwner) return false;
            return true;
        });

    const initials = (user?.store_name || user?.full_name || 'W')[0].toUpperCase();

    return (
        <aside
            className={cn(
                'h-full transition-all duration-300 hidden md:flex flex-col flex-shrink-0 select-none bg-[var(--surface-1)] border-r border-[var(--surface-border)]',
                collapsed ? 'w-[72px]' : 'w-60'
            )}
        >
            {/* Logo */}
            <div className="h-14 flex items-center gap-3 px-5 border-b border-[var(--surface-border)] flex-shrink-0">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)] border border-white/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {user?.logo_url ? (
                        <img src={user.logo_url} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-white text-xs font-bold w-full h-full flex items-center justify-center">{initials}</span>
                    )}
                </div>
                {!collapsed && (
                    <div className="animate-fade-in overflow-hidden">
                        <h1 className="font-semibold text-[var(--text-primary)] text-[14px] leading-tight tracking-tight">WarungKu</h1>
                        <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Point of Sale</p>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 min-h-0 py-4 px-3 overflow-y-auto space-y-5">
                {navSections.map((section, sIdx) => {
                    const filteredItems = filterItems(section.items);
                    if (filteredItems.length === 0) return null;

                    return (
                        <div key={sIdx}>
                            {/* Section Label */}
                            {!collapsed && (
                                <p className="px-3 mb-2 text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                                    {section.label}
                                </p>
                            )}
                            {collapsed && sIdx > 0 && (
                                <div className="mx-3 mb-3 border-t border-[var(--surface-border)]" />
                            )}

                            {/* Nav Items */}
                            <div className="space-y-0.5">
                                {filteredItems.map((item) => {
                                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            title={collapsed ? item.label : undefined}
                                            className={cn(
                                                'group flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all duration-150 relative',
                                                isActive
                                                    ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-semibold'
                                                    : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)]'
                                            )}
                                        >
                                            {/* Icon */}
                                            <item.icon
                                                size={18}
                                                strokeWidth={isActive ? 2.2 : 1.8}
                                                className="flex-shrink-0 transition-colors duration-150"
                                            />

                                            {/* Label */}
                                            {!collapsed && (
                                                <div className="flex-1 flex items-center justify-between min-w-0">
                                                    <span className="truncate">{item.label}</span>
                                                    {item.href === '/transactions' && offlineCount > 0 && (
                                                        <span className="flex-shrink-0 ml-2 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-black animate-pulse shadow-sm">
                                                            {offlineCount}
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Tooltip for collapsed */}
                                            {collapsed && (
                                                <span className="absolute left-full ml-3 px-2.5 py-1 rounded-md bg-[var(--surface-2)] text-[var(--text-primary)] text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-lg border border-[var(--surface-border)] z-50">
                                                    {item.label}
                                                </span>
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </nav>

            {/* Bottom section */}
            <div className="p-3 border-t border-[var(--surface-border)] space-y-1 flex-shrink-0">
                {/* User Profile Card */}
                {!collapsed && user && (
                    <div className="mb-2 px-3 py-2.5 rounded-lg bg-[var(--surface-2)]/50 animate-fade-in">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                {user?.logo_url ? (
                                    <img src={user.logo_url} alt="Logo" className="w-full h-full object-contain p-1" />
                                ) : (
                                    <span className="text-sm font-semibold text-[var(--color-primary)]">{initials}</span>
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[12px] font-semibold text-[var(--text-primary)] truncate leading-tight">
                                    {user.store_name || 'WarungKu'}
                                </p>
                                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                                    {isOwner ? 'Owner' : 'Kasir'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Collapsed avatar */}
                {collapsed && user && (
                    <div className="flex justify-center mb-2 px-2">
                        <div className="w-9 h-9 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center cursor-pointer overflow-hidden">
                            {user?.logo_url ? (
                                <img src={user.logo_url} alt="Logo" className="w-full h-full object-contain p-1" />
                            ) : (
                                <span className="text-sm font-semibold text-[var(--color-primary)]">{initials}</span>
                            )}
                        </div>
                    </div>
                )}

                {/* Logout */}
                <button
                    onClick={logout}
                    className={cn(
                        'flex items-center gap-3 w-full px-3 py-2 rounded-lg text-[13px] text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/5 transition-colors cursor-pointer',
                        collapsed && 'justify-center'
                    )}
                    title={collapsed ? 'Keluar' : undefined}
                >
                    <LogOut size={17} className="flex-shrink-0" />
                    {!collapsed && <span>Keluar</span>}
                </button>

                {/* Collapse toggle */}
                <button
                    onClick={onToggle}
                    className="flex items-center justify-center w-full p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
                    title={collapsed ? 'Perluas' : 'Ciutkan'}
                >
                    <ChevronLeft
                        size={15}
                        className={cn('transition-transform duration-300', collapsed && 'rotate-180')}
                    />
                </button>
            </div>
        </aside>
    );
}
