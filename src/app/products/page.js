'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    Package,
    Filter,
    Upload,
    Image as ImageIcon,
    X,
    FileSpreadsheet,
    Download,
    Sparkles,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Input, { Select } from '@/components/ui/Input';
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import EmptyState from '@/components/ui/EmptyState';
import PageHeader from '@/components/ui/PageHeader';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { formatRupiah, cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';
import { useDebounce } from '@/hooks/useDebounce';
import Papa from 'papaparse';
import { logActivity } from '@/lib/audit';

import { withRBAC } from '@/components/layout/withRBAC';
import imageCompression from 'browser-image-compression';
import { exportProductsToExcel } from '@/lib/export';

function ProductsPage() {
    const { user } = useAuthStore();
    const toast = useToast();
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, 300);
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterStock, setFilterStock] = useState('all'); // all | low
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [categoryModalOpen, setCategoryModalOpen] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [editProduct, setEditProduct] = useState(null);
    const [saving, setSaving] = useState(false);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const fileInputRef = useRef(null);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    const [selectedIds, setSelectedIds] = useState([]);
    const [bulkSaving, setBulkSaving] = useState(false);
    const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
    const [totalItems, setTotalItems] = useState(0);

    const [importModal, setImportModal] = useState(false);
    const [csvData, setCsvData] = useState([]);
    const [importing, setImporting] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const csvInputRef = useRef(null);

    const [form, setForm] = useState({
        name: '', sku: '', price: '', cost_price: '', stock: '', category_id: '', is_active: true,
        discount: '', discount_type: 'percentage', image_url: '', discount_start: '', discount_end: '',
    });
    const [categoryForm, setCategoryForm] = useState({ name: '' });

    const generateSKU = () => {
        const ts = Date.now().toString(36).toUpperCase().slice(-6);
        return `SKU-${ts}`;
    };

    const handleDownloadTemplate = () => {
        const headers = ['Nama', 'SKU', 'Kategori', 'Harga Jual', 'Harga Modal', 'Stok', 'Stok Minimum'];
        const sampleData = [
            ['Teh Botol Sosro 450ml', 'SKU-SAMPLE-1', 'Minuman', '7500', '5000', '24', '10'],
            ['Indomie Goreng Aceh', 'SKU-SAMPLE-2', 'Makanan', '3500', '2800', '40', '20'],
        ];
        
        const csvContent = [headers, ...sampleData]
            .map(row => row.join(','))
            .join('\n');
            
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'template_produk_warungku.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Template berhasil diunduh');
    };

    const handleImportCSV = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setImporting(true);
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const rows = results.data;
                const imported = [];
                
                try {
                    for (const row of rows) {
                        // Smart Category Match
                        let catId = null;
                        const categoryName = row['Kategori'] || row['category'];
                        if (categoryName) {
                            const match = categories.find(c => c.name.toLowerCase().trim() === categoryName.toLowerCase().trim());
                            if (match) catId = match.id;
                        }

                        imported.push({
                            user_id: user.id,
                            name: row['Nama'] || row['name'],
                            sku: row['SKU'] || row['sku'] || generateSKU(),
                            price: parseInt((row['Harga Jual'] || row['price'] || '0').replace(/[^0-9]/g, '')),
                            cost_price: parseInt((row['Harga Modal'] || row['cost_price'] || '0').replace(/[^0-9]/g, '')),
                            stock: parseInt((row['Stok'] || row['stock'] || '0').replace(/[^0-9]/g, '')),
                            min_stock: parseInt((row['Stok Minimum'] || row['min_stock'] || '10').replace(/[^0-9]/g, '')),
                            category_id: catId,
                            is_active: true
                        });
                    }

                    if (imported.length > 0) {
                        const { error } = await supabase.from('products').insert(imported);
                        if (error) throw error;
                        
                        // Bust products cache for cashier
                        localStorage.removeItem('warungku_products_cached_at');
                        
                        toast.success(`${imported.length} produk berhasil diimpor!`);
                        
                        logActivity('IMPORT_PRODUCT', { count: imported.length }, user.id);
                        
                        setImportModal(false);
                        loadData();
                    }
                } catch (err) {
                    toast.error('Gagal impor: ' + err.message);
                } finally {
                    setImporting(false);
                    if (csvInputRef.current) csvInputRef.current.value = '';
                }
            }
        });
    };

    const loadData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        const safetyTimeout = setTimeout(() => setLoading(false), 8000);

        try {
            const { data: cats } = await supabase.from('categories').select('*').eq('user_id', user.id).order('name');
            setCategories(cats || []);

            let query = supabase
                .from('products')
                .select('*, categories(name)', { count: 'exact' })
                .eq('user_id', user.id)
                .order('name');

            if (debouncedSearch) query = query.ilike('name', `%${debouncedSearch}%`);
            if (filterCategory !== 'all') query = query.eq('category_id', parseInt(filterCategory));
            if (filterStock === 'low') {
                // Supabase/PostgREST doesn't support comparing two columns in .or() 
                // using column names. We'll use a static threshold of 10 as a safe default.
                query = query.lte('stock', 10);
            }

            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;
            const { data: prods, count } = await query.range(from, to);
            
            setProducts(prods || []);
            setTotalItems(count || 0);
        } catch (err) {
            console.error(err);
        } finally {
            clearTimeout(safetyTimeout);
            setLoading(false);
        }
    }, [user?.id, debouncedSearch, filterCategory, filterStock, page, pageSize]);

    useEffect(() => { loadData(); }, [loadData]);
    useEffect(() => { setPage(1); }, [debouncedSearch, filterCategory, filterStock]);

    const totalPages = Math.ceil(totalItems / pageSize);

    const getDiscountedPrice = (product) => {
        if (!product.discount || product.discount <= 0) return product.price;
        if (product.discount_start || product.discount_end) {
            const now = new Date();
            if (product.discount_start && new Date(product.discount_start) > now) return product.price;
            if (product.discount_end && new Date(product.discount_end) < now) return product.price;
        }
        if (product.discount_type === 'percentage') {
            return Math.round(product.price * (1 - product.discount / 100));
        }
        return Math.max(0, product.price - product.discount);
    };

    const openAddModal = () => {
        setEditProduct(null);
        setForm({ name: '', sku: '', price: '', cost_price: '', stock: '', min_stock: '10', category_id: '', is_active: true, discount: '', discount_type: 'percentage', image_url: '', discount_start: '', discount_end: '' });
        setImageFile(null);
        setImagePreview(null);
        setModalOpen(true);
    };

    const openEditModal = (product) => {
        setEditProduct(product);
        setForm({
            name: product.name,
            sku: product.sku || '',
            price: String(product.price),
            cost_price: String(product.cost_price || ''),
            stock: String(product.stock),
            min_stock: String(product.min_stock ?? 10),
            category_id: product.category_id ? String(product.category_id) : '',
            is_active: product.is_active,
            discount: product.discount ? String(product.discount) : '',
            discount_type: product.discount_type || 'percentage',
            image_url: product.image_url || '',
            discount_start: product.discount_start || '',
            discount_end: product.discount_end || '',
        });
        setImageFile(null);
        setImagePreview(product.image_url || null);
        setModalOpen(true);
    };

    const handleImageSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { toast.warning('Ukuran file maksimal 5MB'); return; }
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const uploadImage = async (file) => {
        // Kompresi gambar sebelum upload
        const compressionOptions = {
            maxSizeMB: 0.5,
            maxWidthOrHeight: 1080,
            useWebWorker: true,
            fileType: 'image/webp',
        };
        let compressedFile = file;
        try {
            compressedFile = await imageCompression(file, compressionOptions);
        } catch (err) {
            console.warn('Kompresi gambar gagal, menggunakan file asli:', err);
        }

        const fileName = `${user.id}/${Date.now()}.webp`;
        const { data, error } = await supabase.storage.from('product-images').upload(fileName, compressedFile, { upsert: true });
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(data.path);
        return publicUrl;
    };

    const handleSaveProduct = async () => {
        if (!form.name || !form.price) return;
        setSaving(true);
        try {
            let imageUrl = form.image_url;
            if (imageFile) { setImageFile(null); imageUrl = await uploadImage(imageFile); }

            const sku = form.sku || (!editProduct ? generateSKU() : null);

            const data = {
                user_id: user.id,
                name: form.name,
                sku: sku,
                price: parseInt(form.price),
                cost_price: form.cost_price ? parseInt(form.cost_price) : null,
                stock: parseInt(form.stock || '0'),
                min_stock: parseInt(form.min_stock || '10'),
                category_id: form.category_id ? parseInt(form.category_id) : null,
                is_active: form.is_active,
                discount: form.discount ? parseInt(form.discount) : 0,
                discount_type: form.discount_type,
                image_url: imageUrl || null,
            };

            if (editProduct) {
                const { error } = await supabase.from('products').update(data).eq('id', editProduct.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('products').insert(data);
                if (error) throw error;
            }

            setModalOpen(false);
            loadData();
            
            // Bust products cache for cashier
            localStorage.removeItem('warungku_products_cached_at');
            
            toast.success(editProduct ? 'Produk diperbarui!' : 'Produk ditambahkan!');
            
            logActivity(
                editProduct ? 'EDIT_PRODUCT' : 'ADD_PRODUCT',
                { name: form.name, sku: sku, price: parseInt(form.price) },
                user.id,
                sku
            );
        } catch (err) {
            toast.error('Gagal menyimpan: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await supabase.from('products').delete().eq('id', id);
            
            // Bust products cache for cashier
            localStorage.removeItem('warungku_products_cached_at');
            
            setDeleteConfirm(null);
            loadData();
            
            logActivity('DELETE_PRODUCT', { id: id }, user.id);
        } catch (err) { console.error(err); }
    };

    const handleSaveCategory = async () => {
        if (!categoryForm.name) return;
        try {
            const { error } = await supabase.from('categories').insert({ user_id: user.id, name: categoryForm.name });
            if (error) throw error;
            setCategoryForm({ name: '' });
            
            // Bust products cache for cashier
            localStorage.removeItem('warungku_products_cached_at');
            
            loadData();
            toast.success('Kategori ditambahkan!');
        } catch (err) { toast.error('Gagal: ' + err.message); }
    };

    const handleDeleteCategory = async (id) => {
        try {
            const { error } = await supabase.from('categories').delete().eq('id', id);
            if (error) throw error;
            
            // Bust products cache for cashier
            localStorage.removeItem('warungku_products_cached_at');
            
            toast.success('Kategori berhasil dihapus');
            loadData();
        } catch (err) { 
            toast.error('Gagal menghapus: pastikan tidak ada produk di kategori ini'); 
        }
    };

    const handleAISuggestion = async () => {
        if (!form.name || form.name.trim().length < 3) { 
            toast.warning('Nama produk minimal 3 karakter untuk analisis AI'); 
            return; 
        }
        
        const aiUrl = process.env.NEXT_PUBLIC_AI_API_URL;
        if (!aiUrl) {
            toast.error('Layanan AI Pintar belum konfigurasi (Cek .env)');
            return;
        }

        setIsAnalyzing(true);
        try {
            const labelNames = categories.map(c => c.name);
            const response = await fetch(`${aiUrl}/api/classify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: form.name, labels: labelNames })
            });

            if (!response.ok) throw new Error('AI Server Response Error');
            const data = await response.json();
            const bestCategory = categories.find(c => c.name.toLowerCase().trim() === data.best_match.toLowerCase().trim());
            
            if (bestCategory) {
                setForm(prev => ({ ...prev, category_id: String(bestCategory.id) }));
                toast.success(`AI: Kategori '${data.best_match}' disarankan`);
            } else {
                toast.info(`AI menyarankan kategori baru: ${data.best_match}`);
            }
        } catch (err) { 
            console.error('AI Error:', err);
            toast.error('Gagal menghubungkan ke layanan AI. Pastikan server aktif.'); 
        } finally { 
            setIsAnalyzing(false); 
        }
    };

    const handleBulkDelete = async () => {
        setBulkSaving(true);
        try {
            const { error } = await supabase.from('products').delete().in('id', selectedIds);
            if (error) throw error;
            toast.success(`${selectedIds.length} produk berhasil dihapus`);
            
            logActivity('BULK_DELETE_PRODUCT', { count: selectedIds.length, ids: selectedIds }, user.id);
            
            setSelectedIds([]);
            loadData();
        } catch (err) {
            console.error(err);
            toast.error('Gagal menghapus produk secara masal');
        } finally {
            setBulkSaving(false);
            setBulkDeleteConfirm(false);
        }
    };

    const handleBulkToggleStatus = async (isActive) => {
        setBulkSaving(true);
        try {
            const { error } = await supabase.from('products').update({ is_active: isActive }).in('id', selectedIds);
            if (error) throw error;
            toast.success(`${selectedIds.length} produk berhasil ${isActive ? 'diaktifkan' : 'dinonaktifkan'}`);
            
            logActivity('BULK_EDIT_PRODUCT', { count: selectedIds.length, is_active: isActive }, user.id);
            
            setSelectedIds([]);
            loadData();
        } catch (err) {
            console.error(err);
            toast.error('Gagal memperbarui status produk');
        } finally {
            setBulkSaving(false);
        }
    };

    return (
        <>
        <div className="flex flex-col gap-5 animate-fade-in pb-10">
            <PageHeader
                title="Produk"
                description="Manajemen inventaris toko"
                action={
                    <div className="flex gap-2">
                        <Button variant="secondary" size="sm" onClick={() => setCategoryModalOpen(true)} icon={Filter}>Kategori</Button>
                        <Button variant="secondary" size="sm" onClick={() => setImportModal(true)} icon={FileSpreadsheet}>Impor</Button>
                        <Button variant="secondary" size="sm" onClick={() => exportProductsToExcel(products, `Daftar_Produk_${dayjs().format('YYYYMMDD')}`)} icon={Download} />
                        <Button size="sm" onClick={openAddModal} icon={Plus}>Tambah Produk</Button>
                    </div>
                }
            />

            {/* Unified Minimalist Filter Bar */}
            <div className="sticky top-0 z-40 bg-[var(--surface-0)]/90 backdrop-blur-xl py-2 sm:py-3 -mx-4 px-4 border-b border-[var(--surface-border)]/50 transition-all duration-300">
                <div className="flex flex-col sm:flex-row items-stretch gap-0 bg-[var(--surface-2)]/40 rounded-xl sm:rounded-2xl border border-[var(--surface-border)] overflow-hidden">
                    <div className="flex-1 flex items-center px-3 sm:px-4 group">
                        <Search size={16} className="text-[var(--text-muted)] group-focus-within:text-[var(--color-primary)] transition-colors shrink-0" />
                        <input
                            type="text"
                            placeholder="Cari produk..."
                            className="w-full bg-transparent border-none focus:ring-0 text-sm py-2.5 sm:py-3 px-2 sm:px-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center border-t sm:border-t-0 sm:border-l border-[var(--surface-border)]/30">
                        <div className="flex-1 sm:w-36 flex items-center px-2 group">
                            <Select
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                                className="bg-transparent border-none focus:ring-0 text-[10px] font-black uppercase tracking-widest w-full tabular-nums text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                            >
                                <option value="all">Kategori</option>
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </Select>
                        </div>

                        <div className="flex-1 sm:w-36 flex items-center px-2 group border-l border-[var(--surface-border)]/30">
                            <Select
                                value={filterStock}
                                onChange={(e) => setFilterStock(e.target.value)}
                                className="bg-transparent border-none focus:ring-0 text-[10px] font-black uppercase tracking-widest w-full tabular-nums text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                            >
                                <option value="all">Stok</option>
                                <option value="low">Stok Tipis</option>
                            </Select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="space-y-2">
                    {[...Array(5)].map((_, i) => <div key={i} className="h-16 skeleton rounded-xl" />)}
                </div>
            ) : products.length === 0 ? (
                <EmptyState icon={Package} title="Belum Ada Produk" description="Mari tambahkan koleksi produk Anda." action={<Button size="sm" onClick={openAddModal}>Tambah Produk</Button>} />
            ) : (
                <Card className="!p-0 overflow-visible border-none shadow-none bg-transparent">
                    <Table className="border-separate border-spacing-0">
                        <TableHeader className="sticky top-[74px] z-30 bg-[var(--surface-1)] shadow-sm">
                            <TableRow className="bg-[var(--surface-2)]/80 backdrop-blur-sm">
                                <TableHead className="w-10 sticky top-[74px] z-30 border-b border-[var(--surface-border)]">
                                    <input 
                                        type="checkbox" 
                                        className="rounded border-[var(--surface-border)] bg-[var(--surface-2)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]/20"
                                        checked={selectedIds.length === products.length && products.length > 0}
                                        onChange={(e) => {
                                            if (e.target.checked) setSelectedIds(products.map(p => p.id));
                                            else setSelectedIds([]);
                                        }}
                                    />
                                </TableHead>
                                <TableHead className="sticky top-[74px] z-30 border-b border-[var(--surface-border)]">Produk</TableHead>
                                <TableHead className="hidden md:table-cell sticky top-[74px] z-30 border-b border-[var(--surface-border)]">Kategori</TableHead>
                                <TableHead align="right" className="sticky top-[74px] z-30 border-b border-[var(--surface-border)]">Harga</TableHead>
                                <TableHead align="center" className="sticky top-[74px] z-30 border-b border-[var(--surface-border)]">Stok</TableHead>
                                <TableHead align="center" className="sticky top-[74px] z-30 border-b border-[var(--surface-border)]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {products.map((p) => {
                                const diskon = getDiscountedPrice(p);
                                const hasDiskon = p.discount > 0;
                                return (
                                    <TableRow key={p.id} className={cn(!p.is_active && "bg-[var(--surface-2)]/30")}>
                                        <TableCell>
                                            <input 
                                                type="checkbox" 
                                                className="rounded border-[var(--surface-border)] bg-[var(--surface-2)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]/20"
                                                checked={selectedIds.includes(p.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) setSelectedIds(prev => [...prev, p.id]);
                                                    else setSelectedIds(prev => prev.filter(id => id !== p.id));
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell isFirst className={cn(!p.is_active && "opacity-60")}>
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-[var(--surface-2)] flex-shrink-0 flex items-center justify-center overflow-hidden border border-[var(--surface-border)]",
                                                    !p.is_active && "grayscale"
                                                )}>
                                                    {p.image_url ? <img src={p.image_url} className="w-full h-full object-cover" /> : <Package size={16} className="text-[var(--text-muted)]" />}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-semibold truncate">{p.name}</p>
                                                        {!p.is_active && (
                                                            <Badge variant="default" dot className="bg-amber-500/5 border-amber-500/20 text-amber-600/80 text-[9px] font-black uppercase tracking-widest px-1.5 py-0 scale-90 origin-left">
                                                                Nonaktif
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] text-[var(--text-muted)] font-mono">{p.sku || '-'}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className={cn("hidden md:table-cell", !p.is_active && "opacity-40")}>
                                            <Badge variant="default">{p.categories?.name || '-'}</Badge>
                                        </TableCell>
                                        <TableCell align="right" className={cn(!p.is_active && "opacity-40")}>
                                            <div className="flex flex-col items-end">
                                                <p className="font-bold">{formatRupiah(diskon)}</p>
                                                {hasDiskon && <p className="text-[10px] text-[var(--text-muted)] line-through">{formatRupiah(p.price)}</p>}
                                            </div>
                                        </TableCell>
                                        <TableCell align="center" className={cn(!p.is_active && "opacity-40")}>
                                            <Badge 
                                                variant={p.stock <= (p.min_stock || 10) ? (p.stock <= 0 ? 'danger' : 'warning') : 'success'}
                                                className={cn(p.stock <= 5 && "animate-pulse-red")}
                                            >
                                                {p.stock}
                                            </Badge>
                                        </TableCell>
                                        <TableCell align="center">
                                            <div className="flex gap-1 justify-center">
                                                <button onClick={() => openEditModal(p)} className="p-2 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"><Edit2 size={14} /></button>
                                                <button onClick={() => setDeleteConfirm(p)} className="p-2 rounded-lg hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                    {/* Pagination */}
                    <div className="p-4 border-t border-[var(--surface-border)] flex items-center justify-between">
                        <p className="text-[11px] text-[var(--text-muted)]">Halaman {page} dari {totalPages || 1}</p>
                        <div className="flex gap-2">
                            <Button variant="secondary" size="xs" disabled={page === 1} onClick={() => setPage(p => p - 1)} icon={ChevronLeft} />
                            <Button variant="secondary" size="xs" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} icon={ChevronRight} />
                        </div>
                    </div>
                </Card>
            )}

            {/* Modals */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editProduct ? 'Edit Produk' : 'Tambah Produk'}
                size="lg"
                footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Batal</Button><Button onClick={handleSaveProduct} loading={saving}>Simpan Produk</Button></>}
            >
                <div className="space-y-4">
                    {/* Top Section: Photo + Basic Info */}
                    <div className="flex gap-4">
                        {/* Compact Image Upload */}
                        <div className="flex-shrink-0">
                            <div 
                                onClick={() => fileInputRef.current.click()} 
                                className={cn(
                                    "w-32 h-32 rounded-2xl border-2 border-dashed border-[var(--surface-border)] flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all duration-300 relative bg-gradient-to-br from-[var(--surface-2)]/30 to-[var(--surface-3)]/10 hover:border-[var(--color-primary)]/50 hover:bg-[var(--surface-2)]/50",
                                    imagePreview && "border-solid border-[var(--surface-border)]"
                                )}
                            >
                                {imagePreview ? (
                                    <>
                                        <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                            <Upload size={18} className="text-white" />
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center space-y-1 p-2">
                                        <div className="w-8 h-8 rounded-lg bg-[var(--surface-2)] flex items-center justify-center mx-auto text-[var(--text-muted)] group-hover:text-[var(--color-primary)] transition-colors">
                                            <ImageIcon size={16} />
                                        </div>
                                        <p className="text-[10px] font-semibold text-[var(--text-muted)]">Foto Produk</p>
                                    </div>
                                )}
                            </div>
                            <input ref={fileInputRef} type="file" className="hidden" onChange={handleImageSelect} accept="image/*" />
                        </div>

                        {/* Basic Info Inline */}
                        <div className="flex-1 space-y-3">
                            <Input 
                                label="Nama Produk" 
                                placeholder="Masukkan nama..."
                                value={form.name} 
                                onChange={(e) => setForm({ ...form, name: e.target.value })} 
                                icon={Package}
                                className="py-2"
                            />
                            <Input 
                                label="Barcode / SKU" 
                                placeholder="Ketik atau scan..."
                                value={form.sku} 
                                onChange={(e) => setForm({ ...form, sku: e.target.value })} 
                                icon={Edit2}
                                className="py-2"
                            />
                        </div>
                    </div>

                    {/* Bottom Section: 2 Columns */}
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[var(--surface-border)]/50">
                        <div className="space-y-3">
                            <div className="space-y-1.5 text-left">
                                <div className="flex justify-between items-center">
                                    <label className="text-[11px] font-semibold text-[var(--text-secondary)]">Kategori</label>
                                    <button 
                                        onClick={handleAISuggestion} 
                                        disabled={isAnalyzing}
                                        className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-[9px] font-bold flex items-center gap-1 hover:bg-indigo-500/20 transition-all border border-indigo-500/20"
                                    >
                                        <Sparkles size={9} className={cn(isAnalyzing && "animate-pulse")} /> 
                                        AI
                                    </button>
                                </div>
                                <Select 
                                    value={form.category_id} 
                                    onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                                    className="py-2"
                                >
                                    <option value="">Pilih Kategori</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </Select>
                            </div>
                            <Input 
                                label="Harga Jual" 
                                type="number" 
                                placeholder="0"
                                min="0"
                                value={form.price} 
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === '' || Number(val) >= 0) setForm({ ...form, price: val });
                                }} 
                                icon={() => <span className="text-[10px] font-bold opacity-50">RP</span>}
                                className="py-2"
                            />
                            <Input 
                                label="Harga Modal (HPP)" 
                                type="number" 
                                placeholder="0"
                                min="0"
                                value={form.cost_price} 
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === '' || Number(val) >= 0) setForm({ ...form, cost_price: val });
                                }} 
                                icon={() => <span className="text-[10px] font-bold opacity-50">RP</span>}
                                className="py-2"
                            />
                        </div>

                        <div className="space-y-3">
                            <Input 
                                label="Stok Saat Ini" 
                                type="number" 
                                placeholder="0"
                                min="0"
                                value={form.stock} 
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === '' || Number(val) >= 0) setForm({ ...form, stock: val });
                                }} 
                                icon={Edit2}
                                className="py-2"
                            />
                            <Input 
                                label="Minimal Stok (Alert)" 
                                type="number" 
                                placeholder="10"
                                min="0"
                                value={form.min_stock} 
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === '' || Number(val) >= 0) setForm({ ...form, min_stock: val });
                                }} 
                                icon={Filter}
                                className="py-2"
                            />
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Import Modal */}
            <Modal
                isOpen={importModal}
                onClose={() => setImportModal(false)}
                title="Impor Produk dari Excel/CSV"
                size="lg"
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Step 1: Download */}
                        <div className="p-3.5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex flex-col justify-between">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-indigo-400">
                                    <Sparkles size={16} />
                                    <h3 className="text-[11px] font-bold tracking-tight uppercase">Langkah 1: Siapkan Data</h3>
                                </div>
                                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                                    Gunakan template resmi kami agar data terbaca sempurna oleh sistem.
                                </p>
                            </div>
                            <Button 
                                variant="secondary" 
                                size="sm" 
                                className="w-full mt-3 bg-white/5 border-indigo-500/20 hover:bg-white/10 text-[11px]"
                                onClick={handleDownloadTemplate}
                                icon={Download}
                            >
                                Unduh Template
                            </Button>
                        </div>

                        {/* Step 2: Upload */}
                        <div className="p-3.5 rounded-2xl bg-[var(--surface-2)]/30 border border-[var(--surface-border)]/50 flex flex-col">
                            <div className="flex items-center gap-2 text-[var(--text-muted)] mb-3">
                                <Upload size={16} />
                                <h3 className="text-[11px] font-bold tracking-tight uppercase">Langkah 2: Unggah File</h3>
                            </div>
                            <div 
                                onClick={() => csvInputRef.current?.click()}
                                className={cn(
                                    "flex-1 h-24 rounded-xl border-2 border-dashed border-[var(--surface-border)] flex flex-col items-center justify-center cursor-pointer transition-all duration-300 hover:border-[var(--color-primary)]/50 hover:bg-[var(--surface-2)]/50 group",
                                    importing && "opacity-50 pointer-events-none"
                                )}
                            >
                                {importing ? (
                                    <Sparkles size={20} className="animate-spin text-[var(--color-primary)]" />
                                ) : (
                                    <div className="text-center">
                                        <FileSpreadsheet size={20} className="mx-auto text-[var(--text-muted)] group-hover:text-[var(--color-primary)] mb-1" />
                                        <p className="text-[10px] font-bold text-[var(--text-primary)]">Pilih File CSV</p>
                                    </div>
                                )}
                                <input 
                                    ref={csvInputRef}
                                    type="file" 
                                    className="hidden" 
                                    accept=".csv"
                                    onChange={handleImportCSV} 
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-2 border-t border-[var(--surface-border)]/30">
                        <Button variant="secondary" size="sm" onClick={() => setImportModal(false)}>Batal</Button>
                    </div>
                </div>
            </Modal>

            {/* Category Modal */}
            <Modal
                isOpen={categoryModalOpen}
                onClose={() => setCategoryModalOpen(false)}
                title="Kelola Kategori"
                size="sm"
            >
                <div className="space-y-4">
                    <div className="flex gap-2 items-end">
                        <Input 
                            label="Tambah Kategori Baru" 
                            placeholder="Nama kategori..."
                            value={categoryForm.name} 
                            onChange={(e) => setCategoryForm({ name: e.target.value })} 
                        />
                        <Button onClick={handleSaveCategory} className="mb-0.5">Tambah</Button>
                    </div>
                    
                    <div className="mt-4 border border-[var(--surface-border)] rounded-xl overflow-hidden bg-[var(--surface-1)]">
                        <div className="max-h-60 overflow-y-auto w-full custom-scrollbar">
                            {categories.length === 0 ? (
                                <p className="text-center text-[12px] text-[var(--text-muted)] py-4">Belum ada kategori</p>
                            ) : (
                                <ul className="divide-y divide-[var(--surface-border)]">
                                    {categories.map((cat) => (
                                        <li key={cat.id} className="flex items-center justify-between p-3 hover:bg-[var(--surface-2)]/50 transition-colors">
                                            <span className="text-[13px] font-bold text-[var(--text-primary)]">{cat.name}</span>
                                            <button 
                                                onClick={() => handleDeleteCategory(cat.id)}
                                                className="w-8 h-8 rounded-lg flex flex-shrink-0 items-center justify-center text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                                title="Hapus Kategori"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirm */}
            <Modal
                isOpen={!!deleteConfirm}
                onClose={() => setDeleteConfirm(null)}
                title="Hapus Produk"
                footer={<Button variant="danger" onClick={() => handleDelete(deleteConfirm.id)}>Hapus</Button>}
            >
                <p className="text-sm">Apakah Anda yakin ingin menghapus <strong>{deleteConfirm?.name}</strong>? Tindakan ini tidak dapat dibatalkan.</p>
            </Modal>
            <Modal
                isOpen={bulkDeleteConfirm}
                onClose={() => setBulkDeleteConfirm(false)}
                title="Konfirmasi Hapus Masal"
                size="sm"
                footer={<><Button variant="secondary" onClick={() => setBulkDeleteConfirm(false)}>Batal</Button><Button variant="danger" onClick={handleBulkDelete} loading={bulkSaving}>Hapus Terpilih</Button></>}
            >
                <div className="p-4 flex flex-col items-center text-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
                        <Trash2 size={24} />
                    </div>
                    <p className="text-sm">Apakah Anda yakin ingin menghapus <strong>{selectedIds.length} produk</strong> sekaligus? Tindakan ini tidak dapat dibatalkan.</p>
                </div>
            </Modal>
        </div>

        {/* Bulk Action Bar - Elite Floating Style (Fixed & Independent) */}
        {selectedIds.length > 0 && (
            <div className="fixed bottom-24 sm:bottom-12 left-1/2 -translate-x-1/2 z-[100] bg-[var(--surface-1)]/90 border border-[var(--color-primary)]/40 px-3 sm:px-6 py-3 sm:py-4 rounded-2xl sm:rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] shadow-[var(--color-primary)]/30 animate-in slide-in-from-bottom-10 fade-in duration-500 flex flex-col sm:flex-row items-center gap-3 sm:gap-6 backdrop-blur-xl ring-1 ring-white/10 forced-colors:bg-white text-primary w-[calc(100%-2rem)] sm:w-auto max-w-lg">
                <div className="flex items-center gap-3 pr-6 border-r border-[var(--surface-border)]/50">
                    <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-xs font-black">
                        {selectedIds.length}
                    </div>
                    <span className="text-sm font-bold text-[var(--text-primary)]">Produk Terpilih</span>
                </div>
                <div className="flex items-center gap-2">
                    <Button 
                        variant="secondary" 
                        size="sm" 
                        icon={Plus} 
                        className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20"
                        onClick={() => handleBulkToggleStatus(true)}
                        loading={bulkSaving}
                    >
                        Aktifkan
                    </Button>
                    <Button 
                        variant="secondary" 
                        size="sm" 
                        icon={X} 
                        className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-500/20"
                        onClick={() => handleBulkToggleStatus(false)}
                        loading={bulkSaving}
                    >
                        Nonaktifkan
                    </Button>
                    <Button 
                        variant="secondary" 
                        size="sm" 
                        icon={Trash2} 
                        className="bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-500/20"
                        onClick={() => setBulkDeleteConfirm(true)}
                        loading={bulkSaving}
                    >
                        Hapus
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        onClick={() => setSelectedIds([])}
                    >
                        Batal
                    </Button>
                </div>
            </div>
        )}
    </>
);
}

export default withRBAC(ProductsPage, ['owner']);
