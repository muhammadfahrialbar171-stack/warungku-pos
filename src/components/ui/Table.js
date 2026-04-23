'use client';

import { cn } from '@/lib/utils';

export default function Table({ children, className }) {
    return (
        <div className="table-container">
            <table className={cn('w-full text-left border-separate border-spacing-0', className)}>
                {children}
            </table>
        </div>
    );
}

export function TableHeader({ children, className }) {
    return (
        <thead className={cn('bg-[var(--surface-2)]', className)}>
            {children}
        </thead>
    );
}

export function TableBody({ children, className }) {
    return (
        <tbody className={cn('bg-[var(--surface-1)]', className)}>
            {children}
        </tbody>
    );
}

export function TableRow({ children, className, onClick, hover = true }) {
    return (
        <tr 
            onClick={onClick}
            className={cn(
                'transition-colors',
                hover && 'hover:bg-[var(--surface-2)]/40',
                onClick && 'cursor-pointer',
                className
            )}
        >
            {children}
        </tr>
    );
}

export function TableHead({ children, className, align = 'left' }) {
    const alignClasses = {
        left: 'text-left',
        center: 'text-center',
        right: 'text-right',
    };

    return (
        <th className={cn(
            'px-2 sm:px-4 py-2.5 sm:py-3 text-[10px] sm:text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider border-b border-[var(--surface-border)] first:pl-3 sm:first:pl-6 last:pr-3 sm:last:pr-6',
            alignClasses[align],
            className
        )}>
            {children}
        </th>
    );
}

export function TableCell({ children, className, isFirst = false, align = 'left' }) {
    const alignClasses = {
        left: 'text-left',
        center: 'text-center',
        right: 'text-right',
    };

    return (
        <td className={cn(
            'px-2 sm:px-4 py-2.5 sm:py-3.5 text-[12px] sm:text-[13px] text-[var(--text-secondary)] border-b border-[var(--surface-border)] first:pl-3 sm:first:pl-6 last:pr-3 sm:last:pr-6',
            isFirst && 'font-medium text-[var(--text-primary)]',
            alignClasses[align],
            className
        )}>
            {children}
        </td>
    );
}
