'use client';

import { cn } from '@/lib/utils';

/**
 * Reusable Table component with subcomponents.
 * Usage:
 * <Table>
 *   <TableHeader>
 *     <TableRow>
 *       <TableHead>Name</TableHead>
 *     </TableRow>
 *   </TableHeader>
 *   <TableBody>
 *     <TableRow>
 *       <TableCell>John</TableCell>
 *     </TableRow>
 *   </TableBody>
 * </Table>
 */

export default function Table({ children, className, ...props }) {
    return (
        <div className="overflow-x-auto rounded-lg">
            <table
                className={cn('w-full text-sm border-collapse', className)}
                {...props}
            >
                {children}
            </table>
        </div>
    );
}

export function TableHeader({ children, className, ...props }) {
    return (
        <thead className={cn('', className)} {...props}>
            {children}
        </thead>
    );
}

export function TableBody({ children, className, ...props }) {
    return (
        <tbody className={cn('divide-y divide-[var(--surface-border)]', className)} {...props}>
            {children}
        </tbody>
    );
}

export function TableRow({ children, className, clickable = false, ...props }) {
    return (
        <tr
            className={cn(
                'transition-colors group',
                clickable && 'cursor-pointer',
                'hover:bg-[var(--surface-2)]/50',
                className
            )}
            {...props}
        >
            {children}
        </tr>
    );
}

export function TableHead({ children, className, align = 'left', ...props }) {
    return (
        <th
            className={cn(
                'pb-3 pt-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]',
                align === 'right' && 'text-right',
                align === 'center' && 'text-center',
                className
            )}
            {...props}
        >
            {children}
        </th>
    );
}

export function TableCell({ children, className, align = 'left', ...props }) {
    return (
        <td
            className={cn(
                'py-3 px-3',
                align === 'right' && 'text-right',
                align === 'center' && 'text-center',
                className
            )}
            {...props}
        >
            {children}
        </td>
    );
}
