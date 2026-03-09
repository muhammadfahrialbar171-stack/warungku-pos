'use client';

import { cn } from '@/lib/utils';

export default function Card({ children, className, hover = true, ...props }) {
    return (
        <div
            className={cn(
                'glass-card p-5 lg:p-6 rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-white/10 shadow-xl',
                hover && 'transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:border-white/20',
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
        indigo: 'from-indigo-500 to-purple-500 shadow-indigo-500/20',
        emerald: 'from-emerald-500 to-green-500 shadow-emerald-500/20',
        amber: 'from-amber-500 to-orange-500 shadow-amber-500/20',
        rose: 'from-rose-500 to-pink-500 shadow-rose-500/20',
        blue: 'from-blue-500 to-cyan-500 shadow-blue-500/20',
    };

    return (
        <Card className={cn('relative overflow-hidden', className)}>
            <div className="flex items-center justify-between gap-2 sm:gap-3 z-10 relative h-full">
                <div className="flex flex-col justify-center h-full space-y-2 flex-1 min-w-0 pr-1">
                    <p className="text-xs sm:text-sm font-medium text-slate-400 truncate" title={title}>{title}</p>
                    <p className="text-xl sm:text-[22px] font-bold text-white tracking-tight drop-shadow-md break-words" title={value}>{value}</p>

                    {/* Render trend if provided */}
                    {trend !== undefined && trend !== null && (
                        <div className={cn(
                            'flex items-center gap-1 text-[10px] sm:text-xs font-semibold w-fit px-2 py-0.5 rounded-full bg-slate-800/50 backdrop-blur-md border',
                            trendUp ? 'text-emerald-400 border-emerald-500/30' : 'text-rose-400 border-rose-500/30'
                        )}>
                            <span>{trendUp ? '▲' : '▼'}</span>
                            <span>{Math.abs(trend)}% vs kemarin</span>
                        </div>
                    )}
                </div>
                {Icon && (
                    <div className={cn('p-2.5 sm:p-3.5 rounded-2xl bg-gradient-to-br shadow-xl ring-1 ring-white/20 group-hover:scale-110 transition-transform duration-300 flex-shrink-0', colorMap[color])}>
                        <Icon size={24} className="text-white drop-shadow-sm" />
                    </div>
                )}
            </div>
            {/* Decorative gradient blur */}
            <div className={cn('absolute -bottom-10 -right-10 w-40 h-40 rounded-full opacity-20 bg-gradient-to-br blur-3xl group-hover:opacity-30 transition-opacity duration-300', colorMap[color])} />
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none" />
        </Card>
    );
}
