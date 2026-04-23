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
            'flex flex-col items-center justify-center text-center rounded-lg',
            compact
                ? 'py-6 px-4'
                : 'py-10 px-6',
            className
        )}>
            <div className={cn(
                'rounded-lg flex items-center justify-center mb-3 bg-[var(--surface-2)]',
                compact ? 'w-9 h-9' : 'w-11 h-11'
            )}>
                <Icon size={compact ? 18 : 22} className="text-[var(--text-muted)]" />
            </div>
            <h3 className={cn(
                'font-medium text-[var(--text-primary)] mb-0.5',
                compact ? 'text-xs' : 'text-sm'
            )}>
                {title}
            </h3>
            <p className={cn(
                'text-[var(--text-muted)] max-w-xs leading-relaxed',
                compact ? 'text-[11px] mb-3' : 'text-xs mb-4'
            )}>
                {description}
            </p>
            {action && <div>{action}</div>}
        </div>
    );
}
