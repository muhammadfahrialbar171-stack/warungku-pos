'use client';

import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { playAudio } from '@/lib/audio';

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
    info: 'border-blue-500/25 bg-blue-500/10',
};

const ICON_COLORS = {
    success: 'text-emerald-400',
    error: 'text-red-400',
    warning: 'text-amber-400',
    info: 'text-blue-400',
};

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback(({ title, description, type = 'info', duration }) => {
        const id = Date.now() + Math.random();
        
        // Ensure duration is a number or undefined
        const dur = typeof duration === 'number' ? duration : undefined;
        
        // Dynamic duration based on type if not specified
        // Error & Warning get 8s, others get 5s
        const finalDuration = dur || (type === 'error' || type === 'warning' ? 8000 : 5000);
        
        setToasts(prev => [...prev, { id, title, description, type, duration: finalDuration }]);

        // Play audio based on type
        if (type === 'success') playAudio('success');
        else if (type === 'error') playAudio('error');
        else if (type === 'warning') playAudio('warning');

        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, finalDuration);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={addToast}>
            {children}
            {/* Toast Container */}
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-3 pointer-events-none" aria-live="polite">
                {toasts.map(toast => {
                    const Icon = ICONS[toast.type];
                    return (
                        <div
                            key={toast.id}
                            className={cn(
                                'flex items-start gap-4 px-5 py-4 rounded-2xl border backdrop-blur-2xl shadow-2xl pointer-events-auto min-w-[320px] max-w-[420px] animate-scale-in relative overflow-hidden group',
                                STYLES[toast.type]
                            )}
                        >
                            <div className={cn(
                                'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                                toast.type === 'success' ? 'bg-emerald-500/20' :
                                toast.type === 'error' ? 'bg-red-500/20' :
                                toast.type === 'warning' ? 'bg-amber-500/20' :
                                'bg-blue-500/20'
                            )}>
                                <Icon size={20} className={cn(ICON_COLORS[toast.type])} />
                            </div>
                            
                            <div className="flex-1 pt-0.5">
                                <p className="text-[14px] font-bold text-[var(--text-primary)] leading-tight uppercase tracking-wider">
                                    {toast.title || (
                                        toast.type === 'success' ? 'Sukses' : 
                                        toast.type === 'error' ? 'Gagal' :  
                                        toast.type === 'warning' ? 'Peringatan' :
                                        'Informasi'
                                    )}
                                </p>
                                {toast.description && (
                                    <p className="text-[12px] font-medium text-[var(--text-secondary)] mt-1.5 leading-relaxed opacity-90">
                                        {toast.description}
                                    </p>
                                )}
                            </div>

                            <button
                                onClick={() => removeToast(toast.id)}
                                className="flex-shrink-0 p-1.5 -mr-1 rounded-lg hover:bg-white/10 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                            >
                                <X size={16} />
                            </button>

                            {/* Progress Bar */}
                            <div 
                                className={cn(
                                    'absolute bottom-0 left-0 h-[3px] bg-current opacity-30',
                                    ICON_COLORS[toast.type]
                                )}
                                style={{ 
                                    animation: `toast-progress ${toast.duration}ms linear forwards` 
                                }}
                            />
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

    return useMemo(() => ({
        success: (title, description, duration) => addToast({ title, description, type: 'success', duration }),
        error: (title, description, duration) => addToast({ title, description, type: 'error', duration }),
        warning: (title, description, duration) => addToast({ title, description, type: 'warning', duration }),
        info: (title, description, duration) => addToast({ title, description, type: 'info', duration }),
    }), [addToast]);
}
