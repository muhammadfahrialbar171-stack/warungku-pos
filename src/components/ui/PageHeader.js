'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function PageHeader({ title, description, action, backUrl, badge, className }) {
    return (
        <div className={cn('flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6', className)}>
            <div className="flex items-center gap-3 min-w-0">
                {backUrl && (
                    <Link href={backUrl} className="p-2 hover:bg-[var(--surface-2)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors border border-transparent hover:border-[var(--surface-border)] flex-shrink-0">
                        <ArrowLeft size={18} />
                    </Link>
                )}
                <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight truncate">{title}</h1>
                        {badge}
                    </div>
                    {description && (
                        <p className="text-[13px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">{description}</p>
                    )}
                </div>
            </div>
            {action && <div className="w-full sm:w-auto flex-shrink-0">{action}</div>}
        </div>
    );
}
