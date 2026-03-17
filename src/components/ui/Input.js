'use client';

import { cn } from '@/lib/utils';

export default function Input({
    label,
    error,
    hint,
    icon: Icon,
    className,
    ...props
}) {
    return (
        <div className="space-y-1.5">
            {label && (
                <label className="block text-[13px] font-medium text-[var(--text-secondary)]">
                    {label}
                </label>
            )}
            <div className="relative">
                {Icon && (
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                        <Icon size={16} className="text-[var(--text-muted)]" />
                    </div>
                )}
                <input
                    className={cn(
                        'w-full bg-[var(--surface-1)] border border-[var(--surface-border)] focus:border-indigo-500 rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all',
                        Icon && 'pl-10',
                        error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
                        className
                    )}
                    {...props}
                />
            </div>
            {hint && !error && <p className="text-[11px] text-[var(--text-muted)]">{hint}</p>}
            {error && <p className="text-[11px] text-red-400 font-medium">{error}</p>}
        </div>
    );
}

export function Select({ label, error, children, className, ...props }) {
    return (
        <div className="space-y-1.5">
            {label && (
                <label className="block text-[13px] font-medium text-[var(--text-secondary)]">
                    {label}
                </label>
            )}
            <select
                className={cn(
                    'w-full bg-[var(--surface-1)] border border-[var(--surface-border)] focus:border-indigo-500 rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer appearance-none',
                    error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
                    className
                )}
                {...props}
            >
                {children}
            </select>
            {error && <p className="text-[11px] text-red-400 font-medium">{error}</p>}
        </div>
    );
}

export function Textarea({ label, error, className, ...props }) {
    return (
        <div className="space-y-1.5">
            {label && (
                <label className="block text-[13px] font-medium text-[var(--text-secondary)]">
                    {label}
                </label>
            )}
            <textarea
                className={cn(
                    'w-full bg-[var(--surface-1)] border border-[var(--surface-border)] focus:border-indigo-500 rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none',
                    error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
                    className
                )}
                rows={3}
                {...props}
            />
            {error && <p className="text-[11px] text-red-400 font-medium">{error}</p>}
        </div>
    );
}
