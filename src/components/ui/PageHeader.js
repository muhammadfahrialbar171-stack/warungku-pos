'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function PageHeader({ title, description, action, backUrl }) {
    return (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex items-center gap-3">
                {backUrl && (
                    <Link href={backUrl} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors border border-transparent hover:border-slate-700">
                        <ArrowLeft size={20} />
                    </Link>
                )}
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">{title}</h1>
                    {description && <p className="text-sm text-slate-400 mt-1 leading-relaxed">{description}</p>}
                </div>
            </div>
            {action && <div className="w-full sm:w-auto mt-2 sm:mt-0">{action}</div>}
        </div>
    );
}
