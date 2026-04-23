'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';
import CommandPalette from '@/components/ui/CommandPalette';
import PWAInstallBanner from '@/components/ui/PWAInstallBanner';
import { useUIStore } from '@/store/uiStore';
import { useCartStore } from '@/store/cartStore';
import { ShoppingCart } from 'lucide-react';

export default function AppShell({ children }) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [showFailsafe, setShowFailsafe] = useState(false);
    const [forceShow, setForceShow] = useState(false);
    const { user, loading } = useAuthStore();
    const pathname = usePathname();
    const router = useRouter();

    const publicRoutes = ['/login', '/register'];
    const normalizedPath = (pathname || '').replace(/\/$/, '') || '/';
    const isPublicRoute = publicRoutes.includes(normalizedPath);
    const isCashierRoute = normalizedPath === '/cashier';

    const cashierCartOpen = useUIStore(state => state.cashierCartOpen);
    const cartItemsCount = useCartStore(state => state.items.reduce((sum, i) => sum + i.quantity, 0));

    // EMERGENCY BYPASS: Force render the application after 4 seconds regardless of global loading state.
    // This prevents the application from being trapped in an infinite spinner if initialize() hangs.
    useEffect(() => {
        const timer = setTimeout(() => {
            if (loading) {
                console.warn('🚨 [Emergency] Loading took > 4s. Activating Emergency Bypass.');
                setForceShow(true);
            }
        }, 4000);
        return () => clearTimeout(timer);
    }, [loading]);

    // Secondary Failsafe: Reset button after 12s
    useEffect(() => {
        if (loading && !isPublicRoute && !forceShow) {
            const timer = setTimeout(() => setShowFailsafe(true), 12000);
            return () => clearTimeout(timer);
        } else if (showFailsafe) {
            // Use animation frame to avoid synchronous state update in effect body
            const frame = requestAnimationFrame(() => setShowFailsafe(false));
            return () => cancelAnimationFrame(frame);
        }
    }, [loading, isPublicRoute, forceShow, showFailsafe]);

    const handleHardRefresh = () => {
        if (typeof window !== 'undefined') {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/login?reset=1';
        }
    };

    const isCashier = pathname?.startsWith('/cashier');

    useEffect(() => {
        if (!loading || forceShow) {
            if (!user && !isPublicRoute) {
                router.push('/login');
            }
            if (user && isPublicRoute) {
                router.push('/dashboard');
            }
        }
    }, [user, loading, forceShow, isPublicRoute, router]);

    const themeColor = user?.theme_color || 'blue';

    if (isPublicRoute) {
        return <div className={`theme-${themeColor}`}>{children}</div>;
    }

    // Only show global spinner if NOT forced.
    if (loading && !forceShow) {
        return (
            <div className={`h-screen h-[100dvh] overflow-hidden bg-[#0b0f19] theme-${themeColor} flex flex-col items-center justify-center gap-6`}>
                <div className="w-10 h-10 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                
                {showFailsafe && (
                    <div className="flex flex-col items-center gap-3 animate-fade-in px-6 text-center">
                        <p className="text-sm text-slate-400 max-w-xs">
                            Hubungkan akun atau bersihkan cache?
                        </p>
                        <button 
                            onClick={handleHardRefresh}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 px-6 rounded-xl transition-all shadow-lg shadow-blue-500/25 active:scale-95 flex items-center gap-2 cursor-pointer"
                        >
                            Reset & Muat Ulang
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div 
            className={cn(
                'fixed inset-0 w-full flex flex-col md:flex-row overflow-hidden bg-[var(--surface-0)]',
                `theme-${themeColor}`,
            )}
        >
            {/* Sidebar: fixed-width flex child, hidden on mobile */}
            {!isPublicRoute && <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />}

            {/* Content area: Stable flex layout — header fixed, main fills rest */}
            <div 
                className="flex-1 min-w-0 flex flex-col min-h-0 overflow-hidden"
            >
                <Header />
                {/* Scrollable main content area */}
                <main 
                    id="main-scroller"
                    className={cn(
                        'flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden pb-16 md:pb-0',
                        !isPublicRoute ? 'bg-[var(--surface-0)]' : 'bg-transparent'
                    )}
                >
                    <div className={cn(
                        isCashierRoute ? "w-full h-full relative" : "page-container relative"
                    )}>
                        {children}
                        {/* Final spacer for ultra-deep scrolling on mobile */}
                        {!isPublicRoute && !isCashierRoute && <div className="h-20 md:hidden" aria-hidden="true" />}
                    </div>
                </main>
                {!isPublicRoute && <MobileNav />}
            </div>
            {!isPublicRoute && <CommandPalette />}
            {!isPublicRoute && <PWAInstallBanner />}

            {/* Global Floating Cart Button (Cashier Only) */}
            {isCashierRoute && (
                <button
                    onClick={() => useUIStore.getState().setCashierCartOpen(true)}
                    className={cn(
                        "lg:hidden fixed right-6 w-14 h-14 bg-[var(--color-primary)] text-white rounded-full shadow-2xl flex items-center justify-center z-50 transition-all duration-300 animate-scale-in active:scale-90",
                        cashierCartOpen 
                            ? "translate-x-32 opacity-0" 
                            : "translate-x-0 opacity-100 bottom-24"
                    )}
                >
                    <div className="relative">
                        <ShoppingCart size={24} />
                        <span className="absolute -top-3 -right-3 min-w-[20px] h-5 bg-red-500 text-[10px] font-bold rounded-full border-2 border-[var(--color-primary)] flex items-center justify-center px-1 animate-pulse">
                            {cartItemsCount}
                        </span>
                    </div>
                </button>
            )}
        </div>
    );
}
