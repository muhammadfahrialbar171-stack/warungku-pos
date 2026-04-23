'use client';

import { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

export default function PWAInstallBanner() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showBanner, setShowBanner] = useState(false);
    const [isInstalled, setIsInstalled] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia('(display-mode: standalone)').matches || 
               window.navigator.standalone === true;
    });

    useEffect(() => {
        if (isInstalled) return;

        // Check if user has dismissed the banner before (within 7 days)
        const dismissed = localStorage.getItem('pwa_banner_dismissed');
        if (dismissed) {
            const dismissedAt = parseInt(dismissed, 10);
            const sevenDays = 7 * 24 * 60 * 60 * 1000;
            if (Date.now() - dismissedAt < sevenDays) return;
        }

        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            // Show banner with a small delay for better UX
            setTimeout(() => setShowBanner(true), 1500);
        };

        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setIsInstalled(true);
        }
        setShowBanner(false);
        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        setShowBanner(false);
        localStorage.setItem('pwa_banner_dismissed', Date.now().toString());
    };

    if (!showBanner || isInstalled) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[9998] md:hidden"
                onClick={handleDismiss}
            />

            {/* Banner */}
            <div
                className="fixed bottom-0 left-0 right-0 z-[9999] md:hidden animate-slide-up"
                style={{
                    animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both'
                }}
            >
                <style>{`
                    @keyframes slideUp {
                        from { transform: translateY(100%); opacity: 0; }
                        to { transform: translateY(0); opacity: 1; }
                    }
                `}</style>

                <div className="m-3 mb-4 rounded-2xl bg-[var(--surface-1)] border border-[var(--surface-border)] shadow-2xl overflow-hidden">
                    {/* Drag Handle */}
                    <div className="flex justify-center pt-3 pb-1">
                        <div className="w-10 h-1 rounded-full bg-[var(--surface-border)]" />
                    </div>

                    <div className="p-5">
                        <div className="flex items-start gap-4">
                            {/* App Icon */}
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                                <Smartphone size={26} className="text-white" />
                            </div>

                            {/* Text */}
                            <div className="flex-1 min-w-0">
                                <p className="text-[15px] font-bold text-[var(--text-primary)] leading-tight">
                                    Pasang WarungKu di HP
                                </p>
                                <p className="text-[12px] text-[var(--text-muted)] mt-1 leading-relaxed">
                                    Buka lebih cepat tanpa buka browser. Bisa dipakai saat offline!
                                </p>
                            </div>

                            {/* Close */}
                            <button
                                onClick={handleDismiss}
                                className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-muted)] transition-colors flex-shrink-0"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={handleDismiss}
                                className="flex-1 py-2.5 rounded-xl border border-[var(--surface-border)] text-[13px] font-medium text-[var(--text-muted)] hover:bg-[var(--surface-2)] transition-colors"
                            >
                                Nanti saja
                            </button>
                            <button
                                onClick={handleInstall}
                                className="flex-[2] py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-[13px] font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"
                            >
                                <Download size={15} />
                                Pasang Sekarang
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
