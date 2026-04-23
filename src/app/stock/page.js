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
import PageHeader from '@/components/ui/PageHeader';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { formatDate, cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { logActivity } from '@/lib/audit';

import { withRBAC } from '@/components/layout/withRBAC';

function StockPage() {
    const { user } = useAuthStore();
    const toast = useToast();
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

        // Safety timeout: Ensure loading spinner disappears after 8s even if DB hangs
        const safetyTimeout = setTimeout(() => {
            setLoading(false);
        }, 8000);

        try {
            // Use storeId so cashier sees data from their owner's store
            const storeId = user.owner_id || user.id;

            const [{ data: prods }, { data: history }] = await Promise.all([
                supabase.from('products').select('*').eq('user_id', storeId).eq('is_active', true).order('name'),
                supabase.from('stock_history').select('*, products(name)').eq('user_id', storeId).order('created_at', { ascending: false }).limit(50),
            ]);
            setProducts(prods || []);
            setStockHistory(history || []);
        } catch (err) {
            console.error(err);
        } finally {
            clearTimeout(safetyTimeout);
            setLoading(false);
        }
    }, [user]);

    useEffect(() => { loadData(); }, [loadData]);

    const lowStockProducts = products.filter((p) => p.stock <= 5);
    const filteredHistory = stockHistory.filter((h) =>
        h.products?.name?.toLowerCase().includes(search.toLowerCase())
    );

    const handleAdjust = async () => {
        if (!form.product_id || !form.quantity) {
            toast.warning('Pilih produk dan masukkan jumlah yang valid.');
            return;
        }
        const qty = parseInt(form.quantity);
        if (isNaN(qty) || qty <= 0) {
            toast.warning('Jumlah harus berupa angka positif.');
            return;
        }

        setSaving(true);
        try {
            const product = products.find((p) => p.id === parseInt(form.product_id));
            if (!product) { toast.error('Produk tidak ditemukan.'); setSaving(false); return; }

            const newStock = form.type === 'in' ? product.stock + qty : product.stock - qty;
            if (newStock < 0) { toast.warning(`Stok tidak cukup! Stok saat ini: ${product.stock}`); setSaving(false); return; }

            // 1. Update Product Stock
            const { error: updateError } = await supabase
                .from('products')
                .update({ stock: newStock, updated_at: new Date().toISOString() })
                .eq('id', product.id);

            if (updateError) throw new Error(`Gagal update stok produk: ${updateError.message}`);

            // 2. Prepare History Entry
            const noteParts = [
                form.notes || (form.type === 'in' ? 'Stok masuk' : 'Stok keluar'),
                form.supplier_name ? `Supplier: ${form.supplier_name}` : '',
                form.purchase_price ? `Harga beli: Rp${parseInt(form.purchase_price).toLocaleString('id-ID')}/unit` : '',
            ].filter(Boolean).join(' | ');

            const storeId = user.owner_id || user.id;
            const historyEntry = {
                product_id: product.id,
                user_id: storeId,
                type: form.type === 'in' ? 'adjustment_in' : 'adjustment_out',
                quantity: form.type === 'in' ? qty : -qty,
                stock_before: product.stock,
                stock_after: newStock,
                notes: noteParts,
            };

            // 3. Insert History with Fallback Logic
            const fullEntry = { ...historyEntry };
            if (form.supplier_name) fullEntry.supplier_name = form.supplier_name;
            if (form.purchase_price) fullEntry.purchase_price = parseInt(form.purchase_price);
            
            const { error: insertError } = await supabase.from('stock_history').insert(fullEntry);

            if (insertError) {
                // FALLBACK: If error is due to missing columns (supplier_name/purchase_price)
                if (insertError.message?.includes('column') || insertError.code === '42703') {
                    console.warn('Fallback: Saving history without supplier columns');
                    const { error: fallbackError } = await supabase.from('stock_history').insert(historyEntry);
                    if (fallbackError) throw new Error(`Gagal simpan riwayat (fallback): ${fallbackError.message}`);
                } else {
                    throw new Error(`Gagal simpan riwayat: ${insertError.message}`);
                }
            }

            // Success Completion
            setForm({ product_id: '', type: 'in', quantity: '', notes: '', supplier_name: '', purchase_price: '' });
            setAdjustModal(false);
            loadData();
            toast.success('Stok dan riwayat berhasil diperbarui!');
            
            logActivity('MANUAL_STOCK_UPDATE', {
                product_id: product.id,
                product_name: product.name,
                type: form.type,
                quantity: qty,
                notes: form.notes
            }, user.id);
        } catch (err) {
            console.error('Stock adjustment error:', err);
            toast.error(err.message || 'Terjadi kesalahan sistem');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <PageHeader
                title="Manajemen Stok"
                description="Kelola stok dan riwayat perubahan"
                action={
                    <Button size="sm" onClick={() => setAdjustModal(true)}>
                        <Plus size={16} className="mr-2" /> Sesuaikan Stok
                    </Button>
                }
            />

            {/* Low Stock Alert */}
            {lowStockProducts.length > 0 && (
                <Card className="border border-amber-500/30 bg-amber-500/5">
                    <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-amber-500/20">
                            <AlertTriangle size={20} className="text-amber-400" />
                        </div>
                        <div>
                            <h3 className="font-medium text-amber-400 mb-1">Stok Rendah!</h3>
                            <p className="text-sm text-[var(--text-secondary)] mb-2">{lowStockProducts.length} produk memiliki stok ≤ 5</p>
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
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
                    <h3 className="text-lg font-bold text-[var(--text-primary)]">Riwayat Stok</h3>
                    <div className="w-full sm:w-60">
                        <Input
                            placeholder="Cari produk..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            icon={Search}
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
                            <div key={entry.id} className="flex items-center gap-3 p-4 rounded-xl bg-[var(--surface-0)] border border-[var(--surface-border)] hover:bg-[var(--surface-2)]/50 transition-colors duration-200 group">
                                <div className={cn(
                                    'p-2.5 rounded-lg border border-[var(--surface-border)]',
                                    entry.quantity > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                                )}>
                                    {entry.quantity > 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-blue-400 transition-colors">{entry.products?.name}</p>
                                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{entry.notes}</p>
                                </div>
                                <div className="text-right">
                                    <p className={cn('text-sm font-bold tracking-tight', entry.quantity > 0 ? 'text-emerald-400' : 'text-rose-400')}>
                                        {entry.quantity > 0 ? '+' : ''}{entry.quantity}
                                    </p>
                                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{entry.stock_before} → {entry.stock_after}</p>
                                </div>
                                <p className="text-xs text-[var(--text-muted)] font-medium hidden sm:block ml-4">{formatDate(entry.created_at, 'DD MMM HH:mm')}</p>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* Adjustment Modal */}
            <Modal
                isOpen={adjustModal}
                onClose={() => setAdjustModal(false)}
                title="Sesuaikan Stok Produk"
                size="md"
            >
                <div className="space-y-3.5 pt-0.5">
                    {/* Main Product Selection */}
                    <Select 
                        label="Produk yang Disesuaikan *" 
                        value={form.product_id} 
                        onChange={(e) => setForm({ ...form, product_id: e.target.value })}
                        className="bg-[var(--surface-2)]/30"
                    >
                        <option value="">Pilih produk...</option>
                        {products.map((p) => (
                            <option key={p.id} value={p.id}>{p.name} (Stok: {p.stock})</option>
                        ))}
                    </Select>

                    {/* Type & Quantity Grid */}
                    <div className="grid grid-cols-2 gap-3.5">
                        <Select label="Tipe Penyesuaian" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                            <option value="in">Stok Masuk (+)</option>
                            <option value="out">Stok Keluar (-)</option>
                        </Select>
                        <Input 
                            label="Jumlah Unit *" 
                            type="number" 
                            value={form.quantity} 
                            onChange={(e) => setForm({ ...form, quantity: e.target.value })} 
                            placeholder="0" 
                            min="1" 
                        />
                    </div>

                    {/* Dynamic Supplier Info - Ultra Compact */}
                    {form.type === 'in' && (
                        <div className="grid grid-cols-2 gap-3.5 p-3 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 animate-in fade-in slide-in-from-top-2 duration-300">
                            <Input label="Nama Supplier" value={form.supplier_name} onChange={(e) => setForm({ ...form, supplier_name: e.target.value })} placeholder="Opsional" />
                            <Input 
                                label="Harga Beli/Unit" 
                                type="number" 
                                value={form.purchase_price} 
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === '' || Number(val) >= 0) setForm({ ...form, purchase_price: val });
                                }} 
                                placeholder="0" 
                                min="0"
                            />
                        </div>
                    )}

                    {/* Optimized Catatan */}
                    <Textarea 
                        label="Catatan / Alasan" 
                        value={form.notes} 
                        onChange={(e) => setForm({ ...form, notes: e.target.value })} 
                        placeholder="Contoh: Barang rusak, Retur supplier, Opname stok..." 
                        rows={2}
                    />

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-2">
                        <Button 
                            variant="secondary" 
                            className="flex-1 rounded-2xl py-2.5" 
                            onClick={() => setAdjustModal(false)}
                        >
                            Batal
                        </Button>
                        <Button 
                            className="flex-[1.5] rounded-2xl py-2.5" 
                            onClick={handleAdjust} 
                            loading={saving}
                        >
                            Simpan Perubahan
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

export default withRBAC(StockPage, ['owner']);
