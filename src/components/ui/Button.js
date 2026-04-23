'use client';

import { cn } from '@/lib/utils';

const variants = {
    primary: 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white',
    secondary: 'bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text-primary)] border border-[var(--surface-border)]',
    danger: 'bg-red-600 hover:bg-red-500 text-white',
    success: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    ghost: 'hover:bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
    outline: 'border border-[var(--surface-border)] hover:bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
};

const sizes = {
    xs: 'px-2 py-1 text-[11px] gap-1',
    sm: 'px-2.5 py-1.5 text-xs gap-1.5',
    md: 'px-3.5 py-2 text-sm gap-2',
    lg: 'px-4 py-2.5 text-sm gap-2',
    xl: 'px-5 py-3 text-base gap-2.5',
    icon: 'p-2',
};

export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    className,
    disabled,
    loading,
    icon: Icon,
    iconRight: IconRight,
    ...props
}) {
    return (
        <button
            className={cn(
                'inline-flex items-center justify-center font-medium rounded-lg transition-colors duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 cursor-pointer select-none',
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
                <Icon size={size === 'xs' ? 14 : size === 'sm' ? 15 : 18} className="flex-shrink-0" />
            ) : null}
            {children}
            {IconRight && !loading && (
                <IconRight size={size === 'xs' ? 14 : size === 'sm' ? 15 : 18} className="flex-shrink-0" />
            )}
        </button>
    );
}
