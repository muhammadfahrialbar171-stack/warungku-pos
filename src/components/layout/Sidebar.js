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

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/cashier', label: 'Kasir', icon: ShoppingCart },
    { href: '/products', label: 'Produk', icon: Package, ownerOnly: true },
    { href: '/stock', label: 'Stok', icon: Boxes, ownerOnly: true },
    { href: '/transactions', label: 'Transaksi', icon: Receipt },
    { href: '/shifts', label: 'Shift Kasir', icon: Clock },
    { href: '/customers', label: 'Pelanggan', icon: Users },
    { href: '/expenses', label: 'Pengeluaran', icon: Wallet },
    { href: '/reports', label: 'Laporan', icon: BarChart3, ownerOnly: true },
    { href: '/barcode', label: 'Barcode', icon: Barcode, ownerOnly: true },
    { href: '/settings', label: 'Pengaturan', icon: Settings },
];

export default function Sidebar({ collapsed, onToggle }) {
    const pathname = usePathname();
    const { user, logout } = useAuthStore();

    return (
        <aside
            className={cn(
                'fixed left-0 top-0 h-full bg-slate-900/80 backdrop-blur-2xl border-r border-white/5 shadow-2xl z-40 transition-all duration-300 hidden md:flex flex-col',
                collapsed ? 'w-20' : 'w-64'
            )}
        >
            {/* Logo */}
            <div className="p-5 border-b border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 flex-shrink-0">
                        <Store size={20} className="text-white" />
                    </div>
                    {!collapsed && (
                        <div className="animate-fade-in">
                            <h1 className="font-bold text-white text-lg leading-tight">WarungKu</h1>
                            <p className="text-xs text-slate-500">POS System</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
                {navItems
                    .filter(item => !item.ownerOnly || !user?.role || user?.role === 'owner')
                    .map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 group relative overflow-hidden',
                                    isActive
                                        ? 'text-white bg-slate-800/80 shadow-lg shadow-indigo-500/10'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                                )}
                            >
                                {isActive && (
                                    <>
                                        {/* Glowing Left Border */}
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-3/4 bg-indigo-500 rounded-r-md shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
                                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent pointer-events-none" />
                                    </>
                                )}
                                <item.icon
                                    size={20}
                                    className={cn(
                                        'flex-shrink-0 transition-all duration-300 z-10 relative',
                                        isActive ? 'text-indigo-400 scale-110 drop-shadow-md' : 'text-slate-500 group-hover:text-slate-300 group-hover:scale-110'
                                    )}
                                />
                                {!collapsed && <span className="z-10 relative">{item.label}</span>}
                            </Link>
                        );
                    })}
            </nav>

            {/* User Info & Collapse */}
            <div className="p-3 border-t border-slate-800 space-y-2">
                {!collapsed && user && (
                    <div className="px-3 py-2 animate-fade-in">
                        <p className="text-sm font-medium text-white truncate">{user.store_name || 'Toko Saya'}</p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>
                )}

                <button
                    onClick={logout}
                    className={cn(
                        'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer',
                    )}
                >
                    <LogOut size={20} className="flex-shrink-0" />
                    {!collapsed && <span>Keluar</span>}
                </button>

                <button
                    onClick={onToggle}
                    className="flex items-center justify-center w-full p-2 rounded-xl text-slate-500 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                    <ChevronLeft
                        size={18}
                        className={cn('transition-transform duration-300', collapsed && 'rotate-180')}
                    />
                </button>
            </div>
        </aside>
    );
}
