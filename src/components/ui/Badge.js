'use client';

import { cn } from '@/lib/utils';

export default function Badge({ children, variant = 'default', dot = false, className }) {
    const variants = {
        default: 'bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--surface-border)]',
        primary: 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/25',
        success: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25',
        warning: 'bg-amber-500/15 text-amber-400 border border-amber-500/25',
        danger: 'bg-red-500/15 text-red-400 border border-red-500/25',
        info: 'bg-blue-500/15 text-blue-400 border border-blue-500/25',
    };

    const dotColors = {
        default: 'bg-[var(--text-muted)]',
        primary: 'bg-indigo-400',
        success: 'bg-emerald-400',
        warning: 'bg-amber-400',
        danger: 'bg-red-400',
        info: 'bg-blue-400',
    };

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold leading-tight',
                variants[variant],
                className
            )}
        >
            {dot && <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dotColors[variant])} />}
            {children}
        </span>
    );
}
