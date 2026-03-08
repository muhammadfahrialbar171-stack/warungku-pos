'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Barcode, Search, Printer, Package, Download, Check } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Barcode Generator</h1>
                    <p className="text-slate-400 text-sm mt-1">Generate dan cetak label barcode produk</p>
                </div>
                <div className="flex gap-2">
                    <select
                        value={labelSize}
                        onChange={(e) => setLabelSize(e.target.value)}
                        className="bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
                    >
                        <option value="small">Kecil</option>
                        <option value="medium">Sedang</option>
                        <option value="large">Besar</option>
                    </select>
                    <Button
                        icon={Printer}
                        onClick={handlePrint}
                        disabled={selected.length === 0}
                    >
                        Cetak {selected.length > 0 && `(${selected.length})`}
                    </Button>
                </div>
            </div>

            {/* Search & Select All */}
            <div className="flex gap-3">
                <div className="relative flex-1">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Cari produk atau SKU..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
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
                                        ? 'bg-indigo-500/10 border-indigo-500/40'
                                        : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                                    }`}
                            >
                                {isSelected && (
                                    <div className="absolute top-2 right-2 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center animate-scale-in">
                                        <Check size={14} className="text-white" />
                                    </div>
                                )}
                                <p className="text-sm font-medium text-white truncate">{product.name}</p>
                                <p className="text-xs text-slate-500 mt-0.5">SKU: {product.sku || 'N/A'}</p>
                                <p className="text-sm font-bold text-indigo-400 mt-1">{formatRupiah(product.price)}</p>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Preview */}
            {selectedProducts.length > 0 && (
                <Card>
                    <h3 className="text-lg font-semibold text-white mb-4">Preview Barcode ({selectedProducts.length} produk)</h3>
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
