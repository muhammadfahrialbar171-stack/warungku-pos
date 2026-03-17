'use client';

import { cn } from '@/lib/utils';

export default function Card({ children, className, hover = true, noPadding = false, ...props }) {
    return (
        <div
            className={cn(
                'bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm',
                !noPadding && 'p-5',
                hover && 'transition-all duration-200 hover:border-slate-700 hover:bg-slate-800/30',
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}

export function StatCard({ title, value, icon: Icon, trend, trendUp, color = 'indigo', className }) {
    const colorMap = {
        indigo: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
        emerald: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
        amber: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
        rose: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
        blue: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    };

    return (
        <Card className={cn('relative overflow-hidden', className)}>
            <div className="flex items-center justify-between gap-2 sm:gap-3 z-10 relative h-full">
                <div className="flex flex-col justify-center h-full space-y-1 sm:space-y-2 flex-1 min-w-0 pr-1">
                    <p className="text-xs sm:text-sm font-medium text-slate-400 line-clamp-2 leading-tight" title={title}>{title}</p>
                    <p className="text-xl sm:text-[22px] font-bold text-white tracking-tight drop-shadow-md break-words leading-none" title={value}>{value}</p>

                    {/* Render trend if provided */}
                    {trend !== undefined && trend !== null && (
                        <div className={cn(
                            'flex items-center gap-1 text-[10px] sm:text-xs font-semibold w-fit px-2 py-0.5 rounded-full bg-slate-800/50 backdrop-blur-md border mt-1 sm:mt-0',
                            trendUp ? 'text-emerald-400 border-emerald-500/30' : 'text-rose-400 border-rose-500/30'
                        )}>
                            <span>{trendUp ? '▲' : '▼'}</span>
                            <span>{Math.abs(trend)}% vs kemarin</span>
                        </div>
                    )}
                </div>
                {Icon && (
                    <div className={cn('p-3 rounded-xl transition-transform duration-300 flex-shrink-0 self-start sm:self-center', colorMap[color])}>
                        <Icon size={20} className="drop-shadow-sm" />
                    </div>
                )}
            </div>
        </Card>
    );
}
