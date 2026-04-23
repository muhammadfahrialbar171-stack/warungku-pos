'use client';

import { cn } from '@/lib/utils';

export default function Badge({ children, variant = 'default', dot = false, className }) {
    const variants = {
        default: 'bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--surface-border)]',
        primary: 'bg-blue-500/10 text-blue-500 border border-blue-500/15',
        success: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/15',
        warning: 'bg-amber-500/10 text-amber-500 border border-amber-500/15',
        danger: 'bg-red-500/10 text-red-500 border border-red-500/15',
        info: 'bg-blue-500/10 text-blue-500 border border-blue-500/15',
    };

    const dotColors = {
        default: 'bg-[var(--text-muted)]',
        primary: 'bg-blue-500',
        success: 'bg-emerald-500',
        warning: 'bg-amber-500',
        danger: 'bg-red-500',
        info: 'bg-blue-500',
    };

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium leading-tight',
                variants[variant],
                className
            )}
        >
            {dot && <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dotColors[variant])} />}
            {children}
        </span>
    );
}
