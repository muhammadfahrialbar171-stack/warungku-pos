'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { getGreeting } from '@/lib/utils';
import { Search, Download, Sun, Moon, ChevronRight } from 'lucide-react';
import NotificationPanel from '@/components/ui/NotificationPanel';
import { useThemeStore } from '@/store/themeStore';
import { cn } from '@/lib/utils';

const breadcrumbMap = {
    '/dashboard': 'Dashboard',
    '/cashier': 'Kasir',
    '/products': 'Produk',
    '/stock': 'Stok',
    '/transactions': 'Transaksi',
    '/customers': 'Pelanggan',
    '/expenses': 'Pengeluaran',
    '/reports': 'Laporan',
    '/settings': 'Pengaturan',
    '/shifts': 'Data Shift',
    '/barcode': 'Barcode',
};

export default function Header() {
    const { user } = useAuthStore();
    const { theme, toggleTheme, init: initTheme } = useThemeStore();
    const pathname = usePathname();
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isInstallable, setIsInstallable] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const searchRef = useRef(null);

    useEffect(() => { initTheme(); }, [initTheme]);

    useEffect(() => {
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setIsInstallable(true);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    useEffect(() => {
        if (searchOpen && searchRef.current) {
            searchRef.current.focus();
        }
    }, [searchOpen]);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setIsInstallable(false);
            setDeferredPrompt(null);
        }
    };

    // Build breadcrumb
    const currentPage = breadcrumbMap[pathname] || pathname.split('/').pop();

    return (
        <header className="sticky top-0 z-30 bg-[var(--surface-1)]/80 backdrop-blur-xl border-b border-[var(--surface-border)] px-4 md:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
                {/* Left: Breadcrumb */}
                <div className="flex items-center gap-2 min-w-0">
                    <nav className="flex items-center gap-1.5 text-sm">
                        <span className="text-[var(--text-muted)] hidden sm:inline">WarungKu</span>
                        <ChevronRight size={14} className="text-[var(--text-muted)] hidden sm:inline flex-shrink-0" />
                        <span className="font-semibold text-[var(--text-primary)] truncate">
                            {currentPage}
                        </span>
                    </nav>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1.5">
                    {/* Search */}
                    <div className={cn(
                        'hidden md:flex items-center transition-all duration-200',
                        searchOpen ? 'w-56' : 'w-auto'
                    )}>
                        {searchOpen ? (
                            <div className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg bg-[var(--surface-2)] border border-[var(--surface-border)]">
                                <Search size={14} className="text-[var(--text-muted)] flex-shrink-0" />
                                <input
                                    ref={searchRef}
                                    type="text"
                                    placeholder="Cari..."
                                    className="bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none w-full"
                                    onBlur={() => setSearchOpen(false)}
                                />
                            </div>
                        ) : (
                            <button
                                onClick={() => setSearchOpen(true)}
                                className="p-2 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                                title="Cari"
                            >
                                <Search size={18} />
                            </button>
                        )}
                    </div>

                    {/* Install App */}
                    {isInstallable && (
                        <button
                            onClick={handleInstallClick}
                            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors border border-indigo-500/20 text-xs font-medium"
                        >
                            <Download size={14} />
                            Install
                        </button>
                    )}

                    {/* Notifications */}
                    <NotificationPanel />

                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                        title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
                    >
                        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </button>

                    {/* Profile Avatar */}
                    <div className="hidden md:flex items-center gap-2.5 ml-1 pl-2.5 border-l border-[var(--surface-border)]">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                            <span className="text-xs font-bold text-white">
                                {(user?.store_name || 'W')[0].toUpperCase()}
                            </span>
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-[var(--text-primary)] truncate max-w-[120px]">
                                {user?.store_name || 'Warung'}
                            </p>
                            <p className="text-[10px] text-[var(--text-muted)] truncate max-w-[120px]">
                                {user?.role === 'owner' ? 'Owner' : 'Kasir'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
