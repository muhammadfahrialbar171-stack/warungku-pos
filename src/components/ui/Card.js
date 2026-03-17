'use client';

import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function Card({ children, className, hover = true, noPadding = false, ...props }) {
    return (
        <div
            className={cn(
                'bg-[var(--surface-1)] border border-[var(--surface-border)] rounded-xl overflow-hidden',
                !noPadding && 'p-4 sm:p-5',
                hover && 'transition-all duration-200 hover:border-[var(--text-muted)]/30 hover:shadow-[var(--shadow-sm)]',
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}

export function StatCard({ title, value, subtitle, icon: Icon, trend, trendUp, color = 'indigo', className }) {
    const colorMap = {
        indigo: {
            iconBg: 'bg-indigo-500/10',
            iconText: 'text-indigo-400',
            iconBorder: 'border-indigo-500/20',
            accent: 'from-indigo-500/5 to-transparent',
        },
        emerald: {
            iconBg: 'bg-emerald-500/10',
            iconText: 'text-emerald-400',
            iconBorder: 'border-emerald-500/20',
            accent: 'from-emerald-500/5 to-transparent',
        },
        amber: {
            iconBg: 'bg-amber-500/10',
            iconText: 'text-amber-400',
            iconBorder: 'border-amber-500/20',
            accent: 'from-amber-500/5 to-transparent',
        },
        rose: {
            iconBg: 'bg-rose-500/10',
            iconText: 'text-rose-400',
            iconBorder: 'border-rose-500/20',
            accent: 'from-rose-500/5 to-transparent',
        },
        blue: {
            iconBg: 'bg-blue-500/10',
            iconText: 'text-blue-400',
            iconBorder: 'border-blue-500/20',
            accent: 'from-blue-500/5 to-transparent',
        },
    };

    const colors = colorMap[color] || colorMap.indigo;

    return (
        <Card className={cn('relative overflow-hidden group', className)}>
            {/* Subtle gradient accent */}
            <div className={cn('absolute inset-0 bg-gradient-to-br opacity-50 pointer-events-none', colors.accent)} />
            
            <div className="relative z-10 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-1.5">
                    <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">{title}</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)] tracking-tight leading-none" title={value}>
                        {value}
                    </p>

                    {/* Trend indicator */}
                    {trend !== undefined && trend !== null && (
                        <div className="flex items-center gap-1 pt-0.5">
                            {trendUp ? (
                                <TrendingUp size={12} className="text-emerald-400" />
                            ) : (
                                <TrendingDown size={12} className="text-rose-400" />
                            )}
                            <span className={cn(
                                'text-[11px] font-semibold',
                                trendUp ? 'text-emerald-400' : 'text-rose-400'
                            )}>
                                {Math.abs(trend)}%
                            </span>
                            <span className="text-[11px] text-[var(--text-muted)]">vs kemarin</span>
                        </div>
                    )}

                    {subtitle && (
                        <p className="text-[11px] text-[var(--text-muted)]">{subtitle}</p>
                    )}
                </div>

                {Icon && (
                    <div className={cn(
                        'p-2.5 rounded-xl border flex-shrink-0 transition-transform duration-200 group-hover:scale-105',
                        colors.iconBg,
                        colors.iconText,
                        colors.iconBorder
                    )}>
                        <Icon size={20} />
                    </div>
                )}
            </div>
        </Card>
    );
}
