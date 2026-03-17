'use client';

import { cn } from '@/lib/utils';

const variants = {
    primary: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm ring-1 ring-inset ring-indigo-500/20',
    secondary: 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow-sm',
    danger: 'bg-red-600 hover:bg-red-500 text-white shadow-sm ring-1 ring-inset ring-red-500/20',
    success: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm ring-1 ring-inset ring-emerald-500/20',
    ghost: 'hover:bg-slate-800 text-slate-300',
    outline: 'border border-slate-700 hover:bg-slate-800 text-slate-300',
};

const sizes = {
    sm: 'px-2.5 py-1.5 text-xs inline-flex items-center',
    md: 'px-3.5 py-2 text-sm inline-flex items-center',
    lg: 'px-4 py-2.5 text-sm inline-flex items-center',
    xl: 'px-5 py-3 text-base inline-flex items-center',
};

export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    className,
    disabled,
    loading,
    icon: Icon,
    ...props
}) {
    return (
        <button
            className={cn(
                'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 cursor-pointer',
                variants[variant],
                sizes[size],
                className
            )}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            ) : Icon ? (
                <Icon size={18} />
            ) : null}
            {children}
        </button>
    );
}
