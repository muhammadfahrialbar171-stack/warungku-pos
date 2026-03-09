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
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <div className="text-center space-y-4 animate-fade-in">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 animate-pulse">
                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <p className="text-slate-400 text-sm">Memuat...</p>
                </div>
            </div>
        );
    }

    // Public routes: no layout wrapper
    if (isPublicRoute) {
        return <>{children}</>;
    }

    // Authenticated layout

    // Theme setup
    const themeColor = user?.theme_color || 'rose';

    // Convert Tailwind colors to RGB for CSS variables
    const themeVariables = {
        'rose': '', // Default is rose, no override needed unless we mapped everything to a generic var
        'indigo': '--color-primary: 99 102 241; --color-primary-hover: 79 70 229;',
        'emerald': '--color-primary: 16 185 129; --color-primary-hover: 5 150 105;',
        'amber': '--color-primary: 245 158 11; --color-primary-hover: 217 119 6;',
        'sky': '--color-primary: 14 165 233; --color-primary-hover: 2 132 199;',
        'purple': '--color-primary: 168 85 247; --color-primary-hover: 147 51 234;',
    };

    return (
        <div className={`min-h-screen bg-slate-900 theme-${themeColor}`}>
            <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
            <div className={cn(
                'transition-all duration-300 pb-20 md:pb-0',
                sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'
            )}>
                <Header />
                <main className="page-container">
                    {children}
                </main>
            </div>
            <MobileNav />
        </div>
    );
}
