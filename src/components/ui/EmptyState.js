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
        <div className={cn('flex flex-col items-center justify-center p-8 lg:p-12 text-center rounded-xl border-dashed border border-slate-700 bg-slate-900/50', className)}>
            <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center mb-4 ring-1 ring-slate-700">
                <Icon size={24} className="text-slate-400" />
            </div>
            <h3 className="text-sm font-semibold text-white tracking-tight mb-1">{title}</h3>
            <p className="text-sm text-slate-400 max-w-sm mb-6 leading-relaxed">{description}</p>
            {action && <div>{action}</div>}
        </div>
    );
}
