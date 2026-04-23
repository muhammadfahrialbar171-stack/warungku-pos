'use client';

import { useState, useEffect } from 'react';
import { Clock, Search, Filter, AlertTriangle, CheckCircle2, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { formatRupiah, cn } from '@/lib/utils';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import EmptyState from '@/components/ui/EmptyState';
import PageHeader from '@/components/ui/PageHeader';
import { useDebounce } from '@/hooks/useDebounce';
import { exportShiftsToExcel } from '@/lib/export';

dayjs.locale('id');

export default function ShiftsPage() {
    const { user } = useAuthStore();
    const isOwner = !user?.role || user?.role === 'owner';
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

    const totalShifts = shifts.length;
    const activeShifts = shifts.filter(s => s.status === 'open').length;
    const totalDiff = shifts.reduce((acc, s) => {
        if (s.status === 'closed' && s.actual_cash !== null) {
            return acc + (s.actual_cash - s.expected_cash);
        }
        return acc;
    }, 0);

    return (
        <div className="space-y-6 animate-fade-in relative z-10">
            {/* Header */}
            <PageHeader
                title="Histori Shift"
                description="Pantau riwayat buka-tutup shift dan laporan kas per kasir"
                icon={<Clock size={28} className="text-blue-400" />}
                action={
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        <div className="w-full sm:w-64">
                            <Input
                                placeholder="Cari nama kasir..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                icon={Search}
                            />
                        </div>
                        <Button
                            variant="secondary"
                            onClick={() => exportShiftsToExcel(shifts, `Histori_Shift_${dayjs().format('YYYYMMDD')}`)}
                            icon={Download}
                            disabled={shifts.length === 0}
                        >
                            Excel
                        </Button>
                    </div>
                }
            />

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="overflow-hidden relative">
                    <div className="relative">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center mb-3 text-blue-400">
                            <Clock size={20} />
                        </div>
                        <p className="text-sm font-medium text-[var(--text-secondary)] mb-1">Total Shift</p>
                        <h3 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">{totalShifts}</h3>
                    </div>
                </Card>
                <Card className="overflow-hidden relative">
                    <div className="relative">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-3 text-emerald-400">
                            <CheckCircle2 size={20} />
                        </div>
                        <p className="text-sm font-medium text-[var(--text-secondary)] mb-1">Shift Aktif</p>
                        <h3 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">{activeShifts}</h3>
                    </div>
                </Card>
                <Card className="overflow-hidden relative">
                    <div className={cn(
                        "relative",
                        totalDiff < 0 ? "text-rose-400" : totalDiff > 0 ? "text-amber-400" : "text-emerald-400"
                    )}>
                        <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center mb-3",
                            totalDiff < 0 ? "bg-rose-500/20" : totalDiff > 0 ? "bg-amber-500/20" : "bg-emerald-500/20"
                        )}>
                            <AlertTriangle size={20} />
                        </div>
                        <p className="text-sm font-medium text-[var(--text-secondary)] mb-1">Total Selisih Kas</p>
                        <h3 className="text-3xl font-bold tracking-tight">
                            {totalDiff > 0 ? '+' : ''}{formatRupiah(totalDiff)}
                        </h3>
                    </div>
                </Card>
            </div>

            {/* List */}
            <Card className="!p-0 overflow-hidden">
                {loading ? (
                    <div className="space-y-4 text-center py-20">
                        <div className="flex justify-center mb-4">
                            <Clock className="animate-spin text-blue-500" size={40} />
                        </div>
                        <p className="text-[var(--text-secondary)]">Memuat data shift...</p>
                    </div>
                ) : shifts.length === 0 ? (
                    <EmptyState
                        icon={Clock}
                        title="Belum ada riwayat shift"
                        description={search ? `Tidak ada hasil untuk "${search}"` : "Belum ada riwayat shift yang tercatat di toko ini."}
                    />
                ) : (
                    <div className="table-container mb-0 border-none">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="pl-6 text-[10px] font-black uppercase tracking-widest">Kasir & Waktu</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Status</TableHead>
                                    <TableHead align="right" className="text-[10px] font-black uppercase tracking-widest">Modal Awal</TableHead>
                                    <TableHead align="right" className="text-[10px] font-black uppercase tracking-widest">Sistem (Tunai)</TableHead>
                                    <TableHead align="right" className="text-[10px] font-black uppercase tracking-widest">Aktual Kasir</TableHead>
                                    <TableHead align="right" className="pr-6 text-[10px] font-black uppercase tracking-widest">Selisih</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {shifts.map((shift) => {
                                    const diff = shift.actual_cash !== null ? shift.actual_cash - shift.expected_cash : null;
                                    const isOpen = shift.status === 'open';

                                    return (
                                        <TableRow key={shift.id}>
                                            <TableCell className="pl-6">
                                                <div className="font-bold text-[var(--text-primary)] mb-1">
                                                    {shift.users?.full_name || shift.users?.email || 'Kasir'}
                                                </div>
                                                <div className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-tertiary)] flex flex-col gap-0.5">
                                                    <span>In: {dayjs(shift.start_time).format('DD/MM/YY HH:mm')}</span>
                                                    {shift.end_time && (
                                                        <span>Out: {dayjs(shift.end_time).format('DD/MM/YY HH:mm')}</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={isOpen ? 'primary' : 'success'}
                                                    className="uppercase text-[9px] font-bold tracking-widest px-2 py-0.5"
                                                >
                                                    {isOpen ? 'Aktif' : 'Selesai'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell align="right" className="text-[var(--text-secondary)] font-medium">
                                                {formatRupiah(shift.starting_cash)}
                                            </TableCell>
                                            <TableCell align="right" className="text-[var(--text-secondary)] font-medium">
                                                {isOpen ? '-' : formatRupiah(shift.expected_cash)}
                                            </TableCell>
                                            <TableCell align="right" className="font-bold text-[var(--text-primary)]">
                                                {isOpen ? '-' : formatRupiah(shift.actual_cash)}
                                            </TableCell>
                                            <TableCell align="right" className="pr-6 font-extrabold uppercase text-[10px] tracking-tight">
                                                {isOpen || diff === null ? (
                                                    <span className="text-[var(--text-muted)]">-</span>
                                                ) : diff === 0 ? (
                                                    <span className="text-emerald-400 flex items-center justify-end gap-1">
                                                        <CheckCircle2 size={12} /> Pas
                                                    </span>
                                                ) : diff > 0 ? (
                                                    <span className="text-amber-500">
                                                        +{formatRupiah(diff)}
                                                    </span>
                                                ) : (
                                                    <span className="text-rose-400 flex items-center justify-end gap-1">
                                                        <AlertTriangle size={12} /> {formatRupiah(diff)}
                                                    </span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </Card>
        </div>
    );
}
