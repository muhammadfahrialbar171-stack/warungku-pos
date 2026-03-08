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
    { href: '/settings', label: 'Settings', icon: Settings },
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

    return (
        <>
            {/* Floating Install App Button for Mobile */}
            {isInstallable && (
                <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 md:hidden pb-safe">
                    <button
                        onClick={handleInstallClick}
                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 text-sm font-medium animate-bounce"
                    >
                        <Download size={16} />
                        Install Aplikasi
                    </button>
                </div>
            )}

            <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden glass border-t border-slate-800 pb-safe">
                <div className="flex items-center justify-around px-2 py-1">
                    {mobileNavItems
                        .filter(item => !item.ownerOnly || isOwner)
                        .map((item) => {
                            const isActive = pathname === item.href;

                            if (item.primary) {
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className="relative -top-4"
                                    >
                                        <div className={cn(
                                            'w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all',
                                            isActive
                                                ? 'bg-gradient-to-br from-indigo-500 to-purple-500 shadow-indigo-500/40 scale-110'
                                                : 'bg-gradient-to-br from-indigo-500 to-purple-500 shadow-indigo-500/25'
                                        )}>
                                            <item.icon size={24} className="text-white" />
                                        </div>
                                    </Link>
                                );
                            }

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        'flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-colors',
                                        isActive ? 'text-indigo-400' : 'text-slate-500'
                                    )}
                                >
                                    <item.icon size={20} />
                                    <span className="text-[10px] font-medium">{item.label}</span>
                                </Link>
                            );
                        })}
                </div>
            </nav>
        </>
    );
}
