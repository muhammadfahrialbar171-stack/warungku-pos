'use client';

import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function EmptyState({
    icon: Icon = Package,
    title = 'Tidak ada data',
    description = 'Belum ada data yang tersedia.',
    action,
    className
}) {
    return (
        <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
            <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700 mb-4">
                <Icon size={40} className="text-slate-500" />
            </div>
            <h3 className="text-lg font-medium text-slate-300 mb-1">{title}</h3>
            <p className="text-sm text-slate-500 max-w-sm">{description}</p>
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}
