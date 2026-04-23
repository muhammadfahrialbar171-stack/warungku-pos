'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Search, Download, Sun, Moon, Command, CloudOff, Cloud } from 'lucide-react';
import NotificationPanel from '@/components/ui/NotificationPanel';
import { getOfflineTransactionsQueue, processOfflineSync } from '@/lib/indexedDB';
import { useThemeStore } from '@/store/themeStore';
import { useUIStore } from '@/store/uiStore';
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
    '/forecast': 'AI Forecast',
};

export default function Header() {
    const { user } = useAuthStore();
    const { theme, toggleTheme, init: initTheme } = useThemeStore();
    const { setCommandPaletteOpen } = useUIStore();
    const pathname = usePathname();
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isInstallable, setIsInstallable] = useState(false);

    useEffect(() => { initTheme(); }, [initTheme]);

    const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
    const [pendingCount, setPendingCount] = useState(0);

    // Initial check & Network listeners
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Polling IndexedDB to get pending offline transactions length & Syncing
    useEffect(() => {
        let isSyncing = false;
        
        const checkQueue = async () => {
            try {
                if (navigator.onLine && !isSyncing) {
                    isSyncing = true;
                    // Processes any pending transaction in the queue
                    await processOfflineSync();
                    isSyncing = false;
                }
                const queue = await getOfflineTransactionsQueue();
                setPendingCount(queue.length);
            } catch (e) {
                console.error('Error fetching/syncing offline queue:', e);
                isSyncing = false;
            }
        };

        checkQueue();
        const interval = setInterval(checkQueue, 4000); // Poll every 4 seconds
        return () => clearInterval(interval);
    }, []);

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

    const currentPage = breadcrumbMap[pathname] || pathname.split('/').pop();
    const initials = (user?.store_name || user?.full_name || 'W')[0].toUpperCase();

    return (
        <header className="flex-shrink-0 z-30 bg-[var(--surface-1)]/80 backdrop-blur-lg border-b border-[var(--surface-border)] px-4 md:px-5 lg:px-6">
            <div className="flex items-center justify-between h-14">
                {/* Left: Page Title */}
                <div className="flex items-center gap-2 min-w-0">
                    <h1 className="font-semibold text-[var(--text-primary)] text-[15px] tracking-tight truncate">
                        {currentPage}
                    </h1>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1">
                    {/* Search */}
                    <button
                        onClick={() => setCommandPaletteOpen(true)}
                        className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-[var(--surface-2)] border border-[var(--surface-border)] hover:border-[var(--color-primary)]/50 transition-all cursor-pointer group"
                    >
                        <Search size={14} className="text-[var(--text-muted)] group-hover:text-[var(--color-primary)] transition-colors" />
                        <span className="text-[12px] text-[var(--text-muted)] mr-8">Cari apapun...</span>
                        <div className="flex items-center gap-1 px-1 rounded bg-[var(--surface-3)] border border-[var(--surface-border)] text-[9px] text-[var(--text-muted)] font-bold">
                            <Command size={9} /> K
                        </div>
                    </button>

                    {/* Search (Mobile) */}
                    <button
                        onClick={() => setCommandPaletteOpen(true)}
                        className="md:hidden p-2 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                        title="Cari"
                    >
                        <Search size={16} />
                    </button>

                    {/* Install App */}
                    {isInstallable && (
                        <button
                            onClick={handleInstallClick}
                            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/15 transition-colors text-xs font-medium"
                        >
                            <Download size={13} />
                            Install
                        </button>
                    )}

                    {/* Notifications */}
                    <NotificationPanel />

                    {/* Sync Indicator */}
                    <div className="flex items-center mx-0.5">
                        {!isOnline ? (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20" title={`Offline Mode: ${pendingCount} Nota Tertunda`}>
                                <CloudOff size={14} className="animate-pulse" />
                                <span className="text-[10px] font-bold">{pendingCount}</span>
                            </div>
                        ) : pendingCount > 0 ? (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20" title="Sedang Sinkronisasi ke Server...">
                                <Cloud size={14} className="animate-pulse" />
                                <span className="text-[10px] font-bold">{pendingCount}</span>
                            </div>
                        ) : (
                            <div className="flex items-center p-2 rounded-lg text-emerald-500/80" title="Aman (Koneksi Stabil)">
                                <Cloud size={16} />
                            </div>
                        )}
                    </div>

                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                        title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
                    >
                        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                    </button>

                    {/* Profile */}
                    <div className="hidden md:flex items-center gap-2.5 ml-1.5 pl-3 border-l border-[var(--surface-border)] py-0.5">
                        <div className="w-8 h-8 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center overflow-hidden">
                            {user?.logo_url ? (
                                <img src={user.logo_url} alt="Store Logo" className="w-full h-full object-contain p-1" />
                            ) : (
                                <span className="text-xs font-semibold text-[var(--color-primary)]">{initials}</span>
                            )}
                        </div>
                        <div className="min-w-0 flex flex-col justify-center">
                            <p className="text-[12px] font-semibold text-[var(--text-primary)] truncate max-w-[100px] leading-tight">
                                {user?.store_name || 'WarungKu'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
