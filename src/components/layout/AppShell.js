'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import MobileNav from '@/components/layout/MobileNav';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

export default function AppShell({ children }) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const { user, loading, initialize } = useAuthStore();
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        initialize();
    }, [initialize]);

    // Public routes that don't need auth
    const publicRoutes = ['/login', '/register'];
    const isPublicRoute = publicRoutes.includes(pathname);

    useEffect(() => {
        if (!loading) {
            if (!user && !isPublicRoute) {
                router.push('/login');
            }
            if (user && isPublicRoute) {
                router.push('/dashboard');
            }
        }
    }, [user, loading, isPublicRoute, router]);

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--surface-0)]">
                <div className="text-center space-y-4 animate-fade-in">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <svg className="w-7 h-7 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[var(--text-primary)] text-sm font-semibold">WarungKu</p>
                        <p className="text-[var(--text-muted)] text-xs">Memuat aplikasi...</p>
                    </div>
                </div>
            </div>
        );
    }

    // Public routes: no layout wrapper
    if (isPublicRoute) {
        return <>{children}</>;
    }

    // Theme setup
    const themeColor = user?.theme_color || 'indigo';

    return (
        <div className={`min-h-screen bg-[var(--surface-0)] theme-${themeColor}`}>
            <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
            <div className={cn(
                'transition-all duration-300 min-h-screen flex flex-col pb-20 md:pb-0',
                sidebarCollapsed ? 'md:ml-[72px]' : 'md:ml-64'
            )}>
                <Header />
                <main className="page-container flex-1">
                    {children}
                </main>
            </div>
            <MobileNav />
        </div>
    );
}
