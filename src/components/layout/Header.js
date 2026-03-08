'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { getGreeting } from '@/lib/utils';
import { Search, Download } from 'lucide-react';
import NotificationPanel from '@/components/ui/NotificationPanel';

export default function Header() {
    const { user } = useAuthStore();
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
        <header className="sticky top-0 z-30 glass border-b border-slate-800 px-4 md:px-6 py-3">
            <div className="flex items-center justify-between">
                {/* Greeting */}
                <div>
                    <h2 className="text-lg font-semibold text-white">
                        {getGreeting()} 👋
                    </h2>
                    <p className="text-sm text-slate-400">
                        {user?.store_name || 'Toko Saya'}
                    </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    {isInstallable && (
                        <button
                            onClick={handleInstallClick}
                            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors border border-indigo-500/20 text-sm font-medium"
                        >
                            <Download size={16} />
                            Install App
                        </button>
                    )}
                    <NotificationPanel />
                    <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-xl border border-slate-700">
                        <Search size={16} className="text-slate-500" />
                        <input
                            type="text"
                            placeholder="Cari..."
                            className="bg-transparent text-sm text-white placeholder-slate-500 outline-none w-40"
                        />
                    </div>
                </div>
            </div>
        </header>
    );
}
