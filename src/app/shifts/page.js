'use client';

import { useState, useEffect } from 'react';
import { Clock, Search, Filter, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { formatRupiah, cn } from '@/lib/utils';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { useDebounce } from '@/hooks/useDebounce';

dayjs.locale('id');

export default function ShiftsPage() {
    const { user, isOwner } = useAuthStore();
    const [shifts, setShifts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, 300);

    useEffect(() => {
        loadShifts();
    }, [user, debouncedSearch]);

    const loadShifts = async () => {
        if (!user) return;
        setLoading(true);
        try {
            // Load shifts matching the owner's store. If not owner, they can only see their own.
            // But normally this page is `ownerOnly` as set in Sidebar.
            const query = supabase
                .from('shifts')
                .select('*')
                .order('start_time', { ascending: false });

            // Depending on role (handle if non-owner accesses for some reason)
            if (isOwner) {
                query.eq('store_id', user.id);
            } else {
                query.eq('user_id', user.id);
            }

            const { data, error } = await query;
            if (error) throw error;

            // Fetch users manually to avoid PGRST200 relation errors
            const userIds = [...new Set((data || []).map(s => s.user_id))].filter(Boolean);
            let usersMap = {};
            if (userIds.length > 0) {
                const { data: usersInfo } = await supabase
                    .from('users')
                    .select('id, full_name, email')
                    .in('id', userIds);
                if (usersInfo) {
                    usersInfo.forEach(u => usersMap[u.id] = u);
                }
            }

            let filteredData = (data || []).map(shift => ({
                ...shift,
                users: usersMap[shift.user_id] || null
            }));

            if (debouncedSearch) {
                const lowerSearch = debouncedSearch.toLowerCase();
                filteredData = filteredData.filter(s =>
                    s.users?.full_name?.toLowerCase().includes(lowerSearch) ||
                    s.users?.email?.toLowerCase().includes(lowerSearch)
                );
            }

            setShifts(filteredData);
        } catch (error) {
            console.error('Error loading shifts:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 md:p-8 space-y-8 animate-fade-in max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        <Clock className="text-indigo-500" size={32} />
                        Histori Shift
                    </h1>
                    <p className="text-slate-400 mt-2 text-sm md:text-base">
                        Pantau riwayat buka-tutup shift dan laporan kas per kasir
                    </p>
                </div>

                <div className="flex w-full md:w-auto gap-3">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <Input
                            placeholder="Cari nama kasir..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="space-y-4 text-center py-20">
                    <div className="flex justify-center mb-4">
                        <Clock className="animate-spin text-indigo-500" size={40} />
                    </div>
                    <p className="text-slate-400">Memuat data shift...</p>
                </div>
            ) : shifts.length === 0 ? (
                <div className="text-center py-20 bg-slate-900/50 rounded-2xl border border-slate-800">
                    <Clock className="text-slate-600 mx-auto mb-4" size={48} />
                    <p className="text-slate-400 text-lg">Belum ada riwayat shift</p>
                </div>
            ) : (
                <div className="bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden shadow-xl shadow-black/20">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-800 bg-slate-900/80 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                                    <th className="p-4 pl-6">Kasir & Waktu</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Modal Awal</th>
                                    <th className="p-4">Sistem (Tunai)</th>
                                    <th className="p-4">Aktual Kasir</th>
                                    <th className="p-4 pr-6 text-right">Selisih</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {shifts.map((shift) => {
                                    const diff = shift.actual_cash !== null ? shift.actual_cash - shift.expected_cash : null;
                                    const isOpen = shift.status === 'open';

                                    return (
                                        <tr key={shift.id} className="hover:bg-slate-800/30 transition-colors">
                                            <td className="p-4 pl-6">
                                                <div className="font-medium text-white mb-1">
                                                    {shift.users?.full_name || shift.users?.email || 'Kasir'}
                                                </div>
                                                <div className="text-xs text-slate-400 flex flex-col gap-0.5">
                                                    <span>Mulai: {dayjs(shift.start_time).format('DD MMM YYYY, HH:mm')}</span>
                                                    {shift.end_time && (
                                                        <span>Selesai: {dayjs(shift.end_time).format('DD MMM YYYY, HH:mm')}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <Badge
                                                    variant={isOpen ? 'primary' : 'success'}
                                                    className="uppercase text-[10px] tracking-widest"
                                                >
                                                    {isOpen ? 'Aktif' : 'Selesai'}
                                                </Badge>
                                            </td>
                                            <td className="p-4 text-slate-300">
                                                {formatRupiah(shift.starting_cash)}
                                            </td>
                                            <td className="p-4 text-slate-300">
                                                {isOpen ? '-' : formatRupiah(shift.expected_cash)}
                                            </td>
                                            <td className="p-4 font-medium text-white">
                                                {isOpen ? '-' : formatRupiah(shift.actual_cash)}
                                            </td>
                                            <td className="p-4 pr-6 text-right font-bold">
                                                {isOpen || diff === null ? (
                                                    <span className="text-slate-500">-</span>
                                                ) : diff === 0 ? (
                                                    <span className="text-emerald-400 flex items-center justify-end gap-1">
                                                        <CheckCircle2 size={14} /> Pas
                                                    </span>
                                                ) : diff > 0 ? (
                                                    <span className="text-amber-400 flex items-center justify-end gap-1">
                                                        +{formatRupiah(diff)}
                                                    </span>
                                                ) : (
                                                    <span className="text-rose-400 flex items-center justify-end gap-1">
                                                        <AlertTriangle size={14} /> {formatRupiah(diff)}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
