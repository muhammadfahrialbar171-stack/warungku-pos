'use client';

import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export default function Input({
    label,
    error,
    hint,
    icon: Icon,
    className,
    ...props
}) {
    return (
        <div className="space-y-1.5 w-full">
            {label && (
                <label className="block text-[12px] font-semibold text-[var(--text-secondary)] tracking-tight">
                    {label}
                </label>
            )}
            <div className="relative group">
                {Icon && (
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                        <Icon size={16} className="text-[var(--text-muted)] group-focus-within:text-[var(--color-primary)] transition-colors" />
                    </div>
                )}
                <input
                    className={cn(
                        'w-full bg-[var(--surface-1)] border border-[var(--surface-border)] hover:border-[var(--text-muted)]/40 rounded-xl px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-all outline-none shadow-sm',
                        'focus:border-[var(--color-primary)] focus:bg-[var(--surface-0)] focus:ring-4 focus:ring-[var(--color-primary)]/15',
                        'placeholder:text-[var(--text-muted)]/70',
                        Icon && 'pl-10',
                        error && 'border-red-500 focus:border-red-500 focus:ring-red-500/10',
                        className
                    )}
                    {...props}
                />
            </div>
            {hint && !error && <p className="text-[11px] text-[var(--text-muted)] px-1">{hint}</p>}
            {error && <p className="text-[11px] text-red-500 font-medium px-1">{error}</p>}
        </div>
    );
}

export function Select({ label, error, children, className, ...props }) {
    return (
        <div className="space-y-1.5 w-full">
            {label && (
                <label className="block text-[12px] font-semibold text-[var(--text-secondary)] tracking-tight">
                    {label}
                </label>
            )}
            <div className="relative">
                <select
                    className={cn(
                        'w-full bg-[var(--surface-1)] border border-[var(--surface-border)] hover:border-[var(--text-muted)]/40 rounded-xl px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] appearance-none pr-10 outline-none transition-all shadow-sm',
                        'focus:border-[var(--color-primary)] focus:bg-[var(--surface-0)] focus:ring-4 focus:ring-[var(--color-primary)]/15',
                        error && 'border-red-500 focus:border-red-500 focus:ring-red-500/10',
                        className
                    )}
                    {...props}
                >
                    {children}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <ChevronDown size={16} className="text-[var(--text-muted)]" />
                </div>
            </div>
            {error && <p className="text-[11px] text-red-500 font-medium px-1">{error}</p>}
        </div>
    );
}

export function Textarea({ label, error, className, ...props }) {
    return (
        <div className="space-y-1.5 w-full">
            {label && (
                <label className="block text-[12px] font-semibold text-[var(--text-secondary)] tracking-tight">
                    {label}
                </label>
            )}
            <textarea
                className={cn(
                    'w-full bg-[var(--surface-1)] border border-[var(--surface-border)] hover:border-[var(--text-muted)]/40 rounded-xl px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] placeholder-[var(--text-muted)]/70 outline-none transition-all resize-none shadow-sm',
                    'focus:border-[var(--color-primary)] focus:bg-[var(--surface-0)] focus:ring-4 focus:ring-[var(--color-primary)]/15',
                    error && 'border-red-500 focus:border-red-500 focus:ring-red-500/10',
                    className
                )}
                rows={3}
                {...props}
            />
            {error && <p className="text-[11px] text-red-500 font-medium px-1">{error}</p>}
        </div>
    );
}
