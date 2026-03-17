'use client';

import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function EmptyState({
    icon: Icon = Package,
    title = 'Tidak ada data',
    description = 'Belum ada data yang tersedia.',
    action,
    compact = false,
    className
}) {
    return (
        <div className={cn(
            'flex flex-col items-center justify-center text-center rounded-xl',
            compact
                ? 'p-6'
                : 'p-8 lg:p-12 border-dashed border border-[var(--surface-border)] bg-[var(--surface-1)]/50',
            className
        )}>
            <div className={cn(
                'rounded-xl flex items-center justify-center mb-3',
                compact ? 'w-10 h-10 bg-[var(--surface-2)]' : 'w-12 h-12 bg-[var(--surface-2)] ring-1 ring-[var(--surface-border)]'
            )}>
                <Icon size={compact ? 20 : 24} className="text-[var(--text-muted)]" />
            </div>
            <h3 className={cn(
                'font-semibold text-[var(--text-primary)] tracking-tight mb-1',
                compact ? 'text-xs' : 'text-sm'
            )}>
                {title}
            </h3>
            <p className={cn(
                'text-[var(--text-muted)] max-w-xs leading-relaxed',
                compact ? 'text-[11px] mb-3' : 'text-xs mb-5'
            )}>
                {description}
            </p>
            {action && <div>{action}</div>}
        </div>
    );
}
