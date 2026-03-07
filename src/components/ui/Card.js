'use client';

import { cn } from '@/lib/utils';

export default function Card({ children, className, hover = true, ...props }) {
    return (
        <div
            className={cn(
                'glass-card p-5 rounded-2xl',
                hover && 'transition-all duration-300',
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
            <div className="flex items-start justify-between">
                <div className="space-y-2">
                    <p className="text-sm text-slate-400 font-medium">{title}</p>
                    <p className="text-2xl font-bold text-white">{value}</p>
                    {trend !== undefined && (
                        <div className={cn('flex items-center gap-1 text-xs font-medium', trendUp ? 'text-emerald-400' : 'text-rose-400')}>
                            <span>{trendUp ? '↑' : '↓'}</span>
                            <span>{trend}% dari kemarin</span>
                        </div>
                    )}
                </div>
                {Icon && (
                    <div className={cn('p-3 rounded-xl bg-gradient-to-br shadow-lg', colorMap[color])}>
                        <Icon size={22} className="text-white" />
                    </div>
                )}
            </div>
            {/* Decorative gradient blur */}
            <div className={cn('absolute -bottom-4 -right-4 w-24 h-24 rounded-full opacity-10 bg-gradient-to-br blur-2xl', colorMap[color])} />
        </Card>
    );
}
