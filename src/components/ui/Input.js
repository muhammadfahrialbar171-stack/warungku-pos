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
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                        <Icon size={18} className="text-slate-500" />
                    </div>
                )}
                <input
                    className={cn(
                        'w-full bg-slate-900 border border-slate-700 focus:border-indigo-500 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-shadow transition-colors shadow-sm',
                        Icon && 'pl-10',
                        error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
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
                    'w-full bg-slate-900 border border-slate-700 focus:border-indigo-500 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-shadow transition-colors cursor-pointer shadow-sm appearance-none',
                    error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
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
                    'w-full bg-slate-900 border border-slate-700 focus:border-indigo-500 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-shadow transition-colors resize-none shadow-sm',
                    error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
                    className
                )}
                rows={3}
                {...props}
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
    );
}
