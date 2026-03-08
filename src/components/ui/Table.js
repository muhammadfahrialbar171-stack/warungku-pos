'use client';

import { cn } from '@/lib/utils';

export default function Table({ children, className, ...props }) {
    return (
        <table
            className={cn(
                'w-full text-sm',
                className
            )}
            {...props}
        >
            {children}
        </table>
    );
}
