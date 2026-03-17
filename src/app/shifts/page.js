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
import Card from '@/components/ui/Card';
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import EmptyState from '@/components/ui/EmptyState';
import PageHeader from '@/components/ui/PageHeader';
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
        <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
            {/* Header */}
            <PageHeader
                title="Histori Shift"
                description="Pantau riwayat buka-tutup shift dan laporan kas per kasir"
            />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex w-full md:w-auto gap-3">
                    <div className="relative flex-1 md:w-64">
                        <Input
                            placeholder="Cari nama kasir..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            icon={Search}
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
                    <p className="text-[var(--text-secondary)]">Memuat data shift...</p>
                </div>
            ) : shifts.length === 0 ? (
                <EmptyState
                    icon={Clock}
                    title="Belum ada riwayat shift"
                />
            ) : (
                <Card className="!p-0 overflow-hidden shadow-xl shadow-black/20">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="pl-6">Kasir & Waktu</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Modal Awal</TableHead>
                                <TableHead>Sistem (Tunai)</TableHead>
                                <TableHead>Aktual Kasir</TableHead>
                                <TableHead align="right" className="pr-6">Selisih</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {shifts.map((shift) => {
                                const diff = shift.actual_cash !== null ? shift.actual_cash - shift.expected_cash : null;
                                const isOpen = shift.status === 'open';

                                return (
                                    <TableRow key={shift.id}>
                                        <TableCell className="pl-6">
                                            <div className="font-medium text-[var(--text-primary)] mb-1">
                                                {shift.users?.full_name || shift.users?.email || 'Kasir'}
                                            </div>
                                            <div className="text-xs text-[var(--text-secondary)] flex flex-col gap-0.5">
                                                <span>Mulai: {dayjs(shift.start_time).format('DD MMM YYYY, HH:mm')}</span>
                                                {shift.end_time && (
                                                    <span>Selesai: {dayjs(shift.end_time).format('DD MMM YYYY, HH:mm')}</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={isOpen ? 'primary' : 'success'}
                                                className="uppercase text-[10px] tracking-widest"
                                            >
                                                {isOpen ? 'Aktif' : 'Selesai'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-[var(--text-secondary)]">
                                            {formatRupiah(shift.starting_cash)}
                                        </TableCell>
                                        <TableCell className="text-[var(--text-secondary)]">
                                            {isOpen ? '-' : formatRupiah(shift.expected_cash)}
                                        </TableCell>
                                        <TableCell className="font-medium text-[var(--text-primary)]">
                                            {isOpen ? '-' : formatRupiah(shift.actual_cash)}
                                        </TableCell>
                                        <TableCell align="right" className="pr-6 font-bold">
                                            {isOpen || diff === null ? (
                                                <span className="text-[var(--text-muted)]">-</span>
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
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </Card>
            )}
        </div>
    );
}
