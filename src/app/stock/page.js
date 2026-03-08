'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Boxes,
    TrendingDown,
    TrendingUp,
    Plus,
    Minus,
    AlertTriangle,
    Search,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Input, { Select, Textarea } from '@/components/ui/Input';
import EmptyState from '@/components/ui/EmptyState';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { formatDate, cn } from '@/lib/utils';

export default function StockPage() {
    const { user } = useAuthStore();
    const [products, setProducts] = useState([]);
    const [stockHistory, setStockHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [adjustModal, setAdjustModal] = useState(false);
    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        product_id: '', type: 'in', quantity: '', notes: '', supplier_name: '', purchase_price: '',
    });

    const loadData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [{ data: prods }, { data: history }] = await Promise.all([
                supabase.from('products').select('*').eq('user_id', user.id).eq('is_active', true).order('name'),
                supabase.from('stock_history').select('*, products(name)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
            ]);
            setProducts(prods || []);
            setStockHistory(history || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => { loadData(); }, [loadData]);

    const lowStockProducts = products.filter((p) => p.stock <= 5);
    const filteredHistory = stockHistory.filter((h) =>
        h.products?.name?.toLowerCase().includes(search.toLowerCase())
    );

    const handleAdjust = async () => {
        if (!form.product_id || !form.quantity) return;
        setSaving(true);
        try {
            const product = products.find((p) => p.id === parseInt(form.product_id));
            if (!product) return;

            const qty = parseInt(form.quantity);
            const newStock = form.type === 'in' ? product.stock + qty : product.stock - qty;
            if (newStock < 0) { alert('Stok tidak boleh minus!'); setSaving(false); return; }

            await supabase.from('products').update({ stock: newStock, updated_at: new Date().toISOString() }).eq('id', product.id);
            await supabase.from('stock_history').insert({
                product_id: product.id,
                user_id: user.id,
                type: form.type === 'in' ? 'adjustment_in' : 'adjustment_out',
                quantity: form.type === 'in' ? qty : -qty,
                stock_before: product.stock,
                stock_after: newStock,
                notes: form.notes || (form.type === 'in' ? 'Stok masuk' : 'Stok keluar'),
                supplier_name: form.supplier_name || null,
                purchase_price: form.purchase_price ? parseInt(form.purchase_price) : null,
            });

            setForm({ product_id: '', type: 'in', quantity: '', notes: '', supplier_name: '', purchase_price: '' });
            setAdjustModal(false);
            loadData();
        } catch (err) {
            console.error(err);
            alert('Gagal update stok');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Manajemen Stok</h1>
                    <p className="text-slate-400 text-sm mt-1">Kelola stok dan riwayat perubahan</p>
                </div>
                <Button size="sm" onClick={() => setAdjustModal(true)}>
                    <Plus size={16} /> Sesuaikan Stok
                </Button>
            </div>

            {/* Low Stock Alert */}
            {lowStockProducts.length > 0 && (
                <Card className="!border-amber-500/30 !bg-amber-500/5">
                    <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-amber-500/20">
                            <AlertTriangle size={20} className="text-amber-400" />
                        </div>
                        <div>
                            <h3 className="font-medium text-amber-400 mb-1">Stok Rendah!</h3>
                            <p className="text-sm text-slate-400 mb-2">{lowStockProducts.length} produk memiliki stok ≤ 5</p>
                            <div className="flex flex-wrap gap-2">
                                {lowStockProducts.map((p) => (
                                    <Badge key={p.id} variant={p.stock <= 0 ? 'danger' : 'warning'}>
                                        {p.name}: {p.stock}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            {/* Stock History */}
            <Card>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Riwayat Stok</h3>
                    <div className="relative w-60">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text" placeholder="Cari produk..." value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}</div>
                ) : filteredHistory.length === 0 ? (
                    <EmptyState icon={Boxes} title="Belum ada riwayat" description="Riwayat stok akan muncul di sini setelah ada perubahan." />
                ) : (
                    <div className="space-y-2">
                        {filteredHistory.map((entry) => (
                            <div key={entry.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 hover:bg-slate-800/50 transition-colors">
                                <div className={cn(
                                    'p-2 rounded-lg',
                                    entry.quantity > 0 ? 'bg-emerald-500/15' : 'bg-red-500/15'
                                )}>
                                    {entry.quantity > 0 ? <TrendingUp size={18} className="text-emerald-400" /> : <TrendingDown size={18} className="text-red-400" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white">{entry.products?.name}</p>
                                    <p className="text-xs text-slate-500">
                                        {entry.notes}
                                        {entry.supplier_name && <span className="ml-1 text-indigo-400">• Supplier: {entry.supplier_name}</span>}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className={cn('text-sm font-bold', entry.quantity > 0 ? 'text-emerald-400' : 'text-red-400')}>
                                        {entry.quantity > 0 ? '+' : ''}{entry.quantity}
                                    </p>
                                    <p className="text-xs text-slate-500">{entry.stock_before} → {entry.stock_after}</p>
                                </div>
                                <p className="text-xs text-slate-600 hidden sm:block">{formatDate(entry.created_at, 'DD MMM HH:mm')}</p>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* Adjustment Modal */}
            <Modal isOpen={adjustModal} onClose={() => setAdjustModal(false)} title="Sesuaikan Stok" size="md">
                <div className="space-y-4">
                    <Select label="Produk *" value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })}>
                        <option value="">Pilih produk</option>
                        {products.map((p) => (
                            <option key={p.id} value={p.id}>{p.name} (Stok: {p.stock})</option>
                        ))}
                    </Select>
                    <div className="grid grid-cols-2 gap-4">
                        <Select label="Tipe" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                            <option value="in">Stok Masuk</option>
                            <option value="out">Stok Keluar</option>
                        </Select>
                        <Input label="Jumlah *" type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="0" min="1" />
                    </div>
                    <Textarea label="Catatan" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Alasan perubahan stok..." />
                    {form.type === 'in' && (
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Nama Supplier" value={form.supplier_name} onChange={(e) => setForm({ ...form, supplier_name: e.target.value })} placeholder="Opsional" />
                            <Input label="Harga Beli/Unit" type="number" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} placeholder="0" />
                        </div>
                    )}
                    <div className="flex gap-3 pt-2">
                        <Button variant="secondary" className="flex-1" onClick={() => setAdjustModal(false)}>Batal</Button>
                        <Button className="flex-1" onClick={handleAdjust} loading={saving}>Simpan</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
