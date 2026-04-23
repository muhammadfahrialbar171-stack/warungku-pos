'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Barcode, Search, Printer, Package, Download, Check, AlertTriangle } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Input, { Select } from '@/components/ui/Input';
import EmptyState from '@/components/ui/EmptyState';
import PageHeader from '@/components/ui/PageHeader';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import BarcodeComponent from 'react-barcode';

export default function BarcodePage() {
    const { user } = useAuthStore();
    const [products, setProducts] = useState([]);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState([]);
    const [loading, setLoading] = useState(true);
    const [labelSize, setLabelSize] = useState('medium');
    const printRef = useRef(null);

    const loadProducts = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data } = await supabase
                .from('products')
                .select('*')
                .eq('user_id', user.id)
                .eq('is_active', true)
                .order('name');
            setProducts(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => { loadProducts(); }, [loadProducts]);

    const filtered = products.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()))
    );

    const toggleSelect = (id) => {
        setSelected((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    };

    const selectAll = () => {
        setSelected(selected.length === filtered.length ? [] : filtered.map((p) => p.id));
    };

    const selectedProducts = products.filter((p) => selected.includes(p.id));

    const formatRupiah = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

    const barcodeSize = {
        small: { width: 1, height: 30, fontSize: 10 },
        medium: { width: 1.5, height: 40, fontSize: 12 },
        large: { width: 2, height: 50, fontSize: 14 },
    };

    const handlePrint = () => {
        const content = printRef.current;
        if (!content) return;
        const printWindow = window.open('', '_blank', 'width=600,height=800');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html><head><title>Barcode Labels</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: sans-serif; }
                .grid { display: flex; flex-wrap: wrap; gap: 8px; padding: 10px; }
                .label { border: 1px dashed #ccc; padding: 8px; text-align: center; break-inside: avoid; }
                .name { font-size: 10px; font-weight: bold; margin-bottom: 4px; }
                .price { font-size: 9px; color: #666; margin-top: 2px; }
                @media print { .label { border: 1px dashed #eee; } }
            </style></head><body>
            <div class="grid">${content.innerHTML}</div>
            </body></html>
        `);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 300);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <PageHeader
                title="Barcode Generator"
                description="Generate dan cetak label barcode produk"
                action={
                    <div className="flex gap-2">
                        <Select
                            value={labelSize}
                            onChange={(e) => setLabelSize(e.target.value)}
                        >
                            <option value="small">Kecil</option>
                            <option value="medium">Sedang</option>
                            <option value="large">Besar</option>
                        </Select>
                        <Button
                            icon={Printer}
                            onClick={handlePrint}
                            disabled={selected.length === 0}
                        >
                            Cetak {selected.length > 0 && `(${selected.length})`}
                        </Button>
                    </div>
                }
            />

            {/* Search & Select All */}
            <div className="flex gap-3">
                <div className="flex-1">
                    <Input
                        placeholder="Cari produk atau SKU..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        icon={Search}
                    />
                </div>
                <Button variant="secondary" size="sm" onClick={selectAll}>
                    {selected.length === filtered.length ? 'Batal Semua' : 'Pilih Semua'}
                </Button>
            </div>

            {/* Products Grid */}
            {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {[...Array(8)].map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
                </div>
            ) : filtered.length === 0 ? (
                <EmptyState icon={Package} title="Tidak ada produk" description="Tambah produk terlebih dahulu untuk generate barcode." />
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {filtered.map((product) => {
                        const isSelected = selected.includes(product.id);
                        return (
                            <button
                                key={product.id}
                                onClick={() => toggleSelect(product.id)}
                                className={`relative p-4 rounded-2xl border text-left transition-all cursor-pointer ${isSelected
                                        ? 'bg-blue-500/10 border-blue-500/40'
                                        : 'bg-[var(--surface-0)] border-[var(--surface-border)] hover:border-blue-500/30'
                                    }`}
                            >
                                {isSelected && (
                                    <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center animate-scale-in">
                                        <Check size={14} className="text-white" />
                                    </div>
                                )}
                                <p className="text-sm font-medium text-[var(--text-primary)] truncate">{product.name}</p>
                                <p className={`text-xs mt-0.5 ${product.sku ? 'text-[var(--text-muted)]' : 'text-amber-400 font-semibold'}`}>
                                    SKU: {product.sku || 'Belum ada'}
                                    {!product.sku && <AlertTriangle size={10} className="inline ml-1 mb-0.5" />}
                                </p>
                                <p className="text-sm font-bold text-blue-400 mt-1">{formatRupiah(product.price)}</p>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Preview */}
            {selectedProducts.length > 0 && (
                <Card>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Preview Barcode ({selectedProducts.length} produk)</h3>
                    {selectedProducts.some(p => !p.sku) && (
                        <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
                            <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-300 font-medium">
                                Beberapa produk belum memiliki SKU. Barcode menggunakan ID internal sebagai fallback.
                                Sebaiknya tambahkan SKU di halaman Produk agar scanner kasir bisa membaca dengan benar.
                            </p>
                        </div>
                    )}
                    <div ref={printRef} className="flex flex-wrap gap-4">
                        {selectedProducts.map((product) => (
                            <div key={product.id} className="label p-3 rounded-xl bg-white text-center">
                                <p className="name text-xs font-bold text-slate-800 mb-1">{product.name}</p>
                                <BarcodeComponent
                                    value={product.sku || `P${product.id}`}
                                    width={barcodeSize[labelSize].width}
                                    height={barcodeSize[labelSize].height}
                                    fontSize={barcodeSize[labelSize].fontSize}
                                    margin={2}
                                    displayValue={true}
                                />
                                <p className="price text-[10px] text-slate-600 mt-1">{formatRupiah(product.price)}</p>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );
}
