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
    Store,
    Settings,
    Users,
    Wallet,
    Barcode,
    Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

const navSections = [
    {
        label: 'Menu Utama',
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
        label: 'Lainnya',
        items: [
            { href: '/settings', label: 'Pengaturan', icon: Settings },
        ],
    },
];

export default function Sidebar({ collapsed, onToggle }) {
    const pathname = usePathname();
    const { user, logout } = useAuthStore();
    const isOwner = !user?.role || user?.role === 'owner';

    const filterItems = (items) =>
        items.filter(item => {
            if (item.ownerOnly && !isOwner) return false;
            if (item.cashierOnly && isOwner) return false;
            return true;
        });

    return (
        <aside
            className={cn(
                'fixed left-0 top-0 h-full z-40 transition-all duration-300 hidden md:flex flex-col',
                'bg-[var(--surface-1)] border-r border-[var(--surface-border)]',
                collapsed ? 'w-[72px]' : 'w-64'
            )}
        >
            {/* Logo */}
            <div className="h-16 flex items-center gap-3 px-5 border-b border-[var(--surface-border)] flex-shrink-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-500/20">
                    <Store size={18} className="text-white" />
                </div>
                {!collapsed && (
                    <div className="animate-fade-in overflow-hidden">
                        <h1 className="font-bold text-[var(--text-primary)] text-[15px] leading-tight tracking-tight">WarungKu</h1>
                        <p className="text-[10px] text-[var(--text-muted)] font-medium tracking-wide uppercase">POS System</p>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-3 px-3 overflow-y-auto space-y-4">
                {navSections.map((section, sIdx) => {
                    const filteredItems = filterItems(section.items);
                    if (filteredItems.length === 0) return null;

                    return (
                        <div key={sIdx}>
                            {/* Section Label */}
                            {!collapsed && (
                                <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                                    {section.label}
                                </p>
                            )}
                            {collapsed && sIdx > 0 && (
                                <div className="mx-3 mb-2 border-t border-[var(--surface-border)]" />
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
                                                'group flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 relative',
                                                isActive
                                                    ? 'bg-indigo-500/10 text-indigo-400'
                                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)]'
                                            )}
                                        >
                                            {isActive && (
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-indigo-500 rounded-r-full" />
                                            )}
                                            <item.icon
                                                size={18}
                                                className={cn(
                                                    'flex-shrink-0 transition-colors',
                                                    isActive ? 'text-indigo-400' : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]'
                                                )}
                                            />
                                            {!collapsed && <span>{item.label}</span>}
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
                {!collapsed && user && (
                    <div className="px-3 py-2.5 mb-1 animate-fade-in">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-bold text-indigo-400">
                                    {(user.store_name || 'T')[0].toUpperCase()}
                                </span>
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[13px] font-semibold text-[var(--text-primary)] truncate">{user.store_name || 'Toko Saya'}</p>
                                <p className="text-[11px] text-[var(--text-muted)] truncate">{user.email}</p>
                            </div>
                        </div>
                    </div>
                )}

                <button
                    onClick={logout}
                    className={cn(
                        'flex items-center gap-3 w-full px-3 py-2 rounded-lg text-[13px] font-medium text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer',
                    )}
                >
                    <LogOut size={18} className="flex-shrink-0" />
                    {!collapsed && <span>Keluar</span>}
                </button>

                <button
                    onClick={onToggle}
                    className="flex items-center justify-center w-full p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
                >
                    <ChevronLeft
                        size={16}
                        className={cn('transition-transform duration-300', collapsed && 'rotate-180')}
                    />
                </button>
            </div>
        </aside>
    );
}
