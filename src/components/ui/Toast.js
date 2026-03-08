'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
};

const STYLES = {
    success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
    error: 'border-red-500/30 bg-red-500/10 text-red-400',
    warning: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
    info: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400',
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
                            className={`flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-xl shadow-black/20 pointer-events-auto min-w-[280px] max-w-[360px] animate-fade-in ${STYLES[toast.type]}`}
                        >
                            <Icon size={18} className="flex-shrink-0 mt-0.5" />
                            <p className="text-sm font-medium flex-1 text-white/90">{toast.message}</p>
                            <button
                                onClick={() => removeToast(toast.id)}
                                className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
                            >
                                <X size={16} />
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
