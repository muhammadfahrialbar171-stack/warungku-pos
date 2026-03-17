'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const ToastContext = createContext(null);

const ICONS = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
};

const STYLES = {
    success: 'border-emerald-500/25 bg-emerald-500/10',
    error: 'border-red-500/25 bg-red-500/10',
    warning: 'border-amber-500/25 bg-amber-500/10',
    info: 'border-indigo-500/25 bg-indigo-500/10',
};

const ICON_COLORS = {
    success: 'text-emerald-400',
    error: 'text-red-400',
    warning: 'text-amber-400',
    info: 'text-indigo-400',
};

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback(({ message, type = 'info', duration = 4000 }) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, duration);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={addToast}>
            {children}
            {/* Toast Container */}
            <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none" aria-live="polite">
                {toasts.map(toast => {
                    const Icon = ICONS[toast.type];
                    return (
                        <div
                            key={toast.id}
                            className={cn(
                                'flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-xl pointer-events-auto min-w-[280px] max-w-[380px] animate-slide-right',
                                STYLES[toast.type]
                            )}
                        >
                            <Icon size={18} className={cn('flex-shrink-0 mt-0.5', ICON_COLORS[toast.type])} />
                            <p className="text-[13px] font-medium flex-1 text-[var(--text-primary)]">{toast.message}</p>
                            <button
                                onClick={() => removeToast(toast.id)}
                                className="flex-shrink-0 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const addToast = useContext(ToastContext);
    if (!addToast) throw new Error('useToast must be used within ToastProvider');

    return {
        success: (message, duration) => addToast({ message, type: 'success', duration }),
        error: (message, duration) => addToast({ message, type: 'error', duration }),
        warning: (message, duration) => addToast({ message, type: 'warning', duration }),
        info: (message, duration) => addToast({ message, type: 'info', duration }),
    };
}
