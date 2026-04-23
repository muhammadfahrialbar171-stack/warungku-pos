'use client';

import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function Card({ children, className, hover = true, noPadding = false, ...props }) {
    return (
        <div
            className={cn(
                'bg-[var(--surface-1)] border border-[var(--surface-border)] rounded-xl overflow-hidden',
                !noPadding && 'p-4 sm:p-5',
                hover && 'transition-colors duration-150 hover:border-[var(--surface-3)]',
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}

export function StatCard({ title, value, subtitle, icon: Icon, trend, trendUp, color = 'blue', className }) {
    const colorMap = {
        blue: { iconBg: 'bg-blue-500/10', iconText: 'text-blue-500' },
        emerald: { iconBg: 'bg-emerald-500/10', iconText: 'text-emerald-500' },
        amber: { iconBg: 'bg-amber-500/10', iconText: 'text-amber-500' },
        rose: { iconBg: 'bg-rose-500/10', iconText: 'text-rose-500' },
        indigo: { iconBg: 'bg-indigo-500/10', iconText: 'text-indigo-500' },
        violet: { iconBg: 'bg-violet-500/10', iconText: 'text-violet-500' },
        cyan: { iconBg: 'bg-cyan-500/10', iconText: 'text-cyan-500' },
        slate: { iconBg: 'bg-zinc-500/10', iconText: 'text-zinc-400' },
    };

    const colors = colorMap[color] || colorMap.blue;

    return (
        <div className={cn(
            'glass-card group relative min-h-[160px] p-6 flex flex-col items-center justify-center text-center overflow-hidden',
            className
        )}>
            {/* Background decoration centered */}
            <div className={cn(
                'absolute w-32 h-32 rounded-full blur-3xl opacity-10 transition-opacity group-hover:opacity-20 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
                colors.iconBg
            )} />

            <div className="flex flex-col items-center gap-4 relative z-10 w-full">
                {Icon && (
                    <div className={cn(
                        'w-12 h-12 rounded-full flex items-center justify-center transition-transform duration-500 group-hover:rotate-[360deg] shadow-sm mb-1',
                        colors.iconBg,
                        colors.iconText
                    )}>
                        <Icon size={24} strokeWidth={2.5} />
                    </div>
                )}
                
                <div className="flex flex-col items-center w-full">
                    <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-[0.2em] mb-2 opacity-80">
                        {title}
                    </p>
                    <div className="flex flex-col items-center gap-1.5">
                        <h3 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tracking-tighter tabular-nums" title={value}>
                            {value}
                        </h3>
                        
                        {/* Subtitle/Status message */}
                        {subtitle && (
                            <p className="text-[11px] font-medium text-[var(--text-secondary)] leading-tight opacity-70 max-w-[150px]">
                                {subtitle}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Section: Trend centered */}
            {trend !== undefined && trend !== null && (
                <div className="flex items-center justify-center gap-2 mt-5 pt-3 border-t border-white/5 w-full relative z-10">
                    <div className={cn(
                        'flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black',
                        trendUp ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                    )}>
                        {trendUp ? <TrendingUp size={10} strokeWidth={3} /> : <TrendingDown size={10} strokeWidth={3} />}
                        {Math.abs(trend)}%
                    </div>
                    <span className="text-[10px] font-bold text-[var(--text-muted)] tracking-wider">vs kemarin</span>
                </div>
            )}
        </div>
    );
}
