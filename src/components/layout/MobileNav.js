'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
    LayoutDashboard,
    ShoppingCart,
    Package,
    Receipt,
    Settings,
    Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

const mobileNavItems = [
    { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
    { href: '/products', label: 'Produk', icon: Package, ownerOnly: true },
    { href: '/cashier', label: 'Kasir', icon: ShoppingCart },
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
                        className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[var(--color-primary)] text-white shadow-lg text-xs font-medium"
                    >
                        <Download size={14} />
                        Install Aplikasi
                    </button>
                </div>
            )}

            {/* Mobile Bottom Nav */}
            <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[var(--surface-1)]/95 backdrop-blur-lg border-t border-[var(--surface-border)]"
                style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            >
                <div className="flex items-center justify-around px-2 h-14">
                    {filteredItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => {
                                    if (typeof navigator !== 'undefined' && navigator.vibrate) {
                                        navigator.vibrate(8);
                                    }
                                }}
                                className={cn(
                                    'flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-colors min-w-[48px]',
                                    isActive ? 'text-[var(--color-primary)]' : 'text-[var(--text-muted)]'
                                )}
                            >
                                <item.icon size={20} strokeWidth={isActive ? 2.2 : 1.6} />
                                <span className={cn(
                                    'text-[10px]',
                                    isActive ? 'font-semibold' : 'font-normal'
                                )}>{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </>
    );
}
