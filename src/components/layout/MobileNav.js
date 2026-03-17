'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
    LayoutDashboard,
    ShoppingCart,
    Package,
    Receipt,
    BarChart3,
    Settings,
    Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

const mobileNavItems = [
    { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
    { href: '/products', label: 'Produk', icon: Package, ownerOnly: true },
    { href: '/cashier', label: 'Kasir', icon: ShoppingCart, primary: true },
    { href: '/transactions', label: 'Transaksi', icon: Receipt },
    { href: '/settings', label: 'Lainnya', icon: Settings },
];

export default function MobileNav() {
    const pathname = usePathname();
    const { user } = useAuthStore();
    const isOwner = !user?.role || user?.role === 'owner';
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isInstallable, setIsInstallable] = useState(false);

    useEffect(() => {
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setIsInstallable(true);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setIsInstallable(false);
            setDeferredPrompt(null);
        }
    };

    const filteredItems = mobileNavItems.filter(item => !item.ownerOnly || isOwner);

    return (
        <>
            {/* Floating Install Button */}
            {isInstallable && (
                <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 md:hidden">
                    <button
                        onClick={handleInstallClick}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30 text-xs font-semibold animate-bounce"
                    >
                        <Download size={14} />
                        Install Aplikasi
                    </button>
                </div>
            )}

            {/* Mobile Bottom Nav */}
            <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[var(--surface-1)]/95 backdrop-blur-xl border-t border-[var(--surface-border)]"
                style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            >
                <div className="flex items-center justify-around px-1 h-16">
                    {filteredItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

                        if (item.primary) {
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className="relative -top-3"
                                >
                                    <div className={cn(
                                        'w-13 h-13 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-200',
                                        isActive
                                            ? 'bg-gradient-to-br from-indigo-500 to-violet-600 shadow-indigo-500/30 scale-105'
                                            : 'bg-[var(--surface-2)] border border-[var(--surface-border)] shadow-sm'
                                    )}>
                                        <item.icon size={22} className={isActive ? "text-white" : "text-[var(--text-secondary)]"} />
                                    </div>
                                    {isActive && (
                                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-400" />
                                    )}
                                </Link>
                            );
                        }

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    'flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-colors min-w-[52px]',
                                    isActive ? 'text-indigo-400' : 'text-[var(--text-muted)]'
                                )}
                            >
                                <item.icon size={20} />
                                <span className="text-[10px] font-medium">{item.label}</span>
                                {isActive && (
                                    <div className="w-4 h-0.5 rounded-full bg-indigo-400 mt-0.5" />
                                )}
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </>
    );
}
