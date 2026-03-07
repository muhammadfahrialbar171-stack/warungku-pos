'use client';

import { cn } from '@/lib/utils';

export default function Input({
    label,
    error,
    icon: Icon,
    className,
    ...props
}) {
    return (
        <div className="space-y-1.5">
            {label && (
                <label className="block text-sm font-medium text-slate-300">
                    {label}
                </label>
            )}
            <div className="relative">
                {Icon && (
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Icon size={18} className="text-slate-500" />
                    </div>
                )}
                <input
                    className={cn(
                        'w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-200',
                        Icon && 'pl-10',
                        error && 'border-red-500 focus:ring-red-500/50 focus:border-red-500',
                        className
                    )}
                    {...props}
                />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
    );
}

export function Select({ label, error, children, className, ...props }) {
    return (
        <div className="space-y-1.5">
            {label && (
                <label className="block text-sm font-medium text-slate-300">
                    {label}
                </label>
            )}
            <select
                className={cn(
                    'w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-200 cursor-pointer',
                    error && 'border-red-500',
                    className
                )}
                {...props}
            >
                {children}
            </select>
            {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
    );
}

export function Textarea({ label, error, className, ...props }) {
    return (
        <div className="space-y-1.5">
            {label && (
                <label className="block text-sm font-medium text-slate-300">
                    {label}
                </label>
            )}
            <textarea
                className={cn(
                    'w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-200 resize-none',
                    error && 'border-red-500',
                    className
                )}
                rows={3}
                {...props}
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
    );
}
