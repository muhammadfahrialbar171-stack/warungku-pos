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
    Percent,
    Tag,
    X,
    FileSpreadsheet,
    Download,
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

import { withRBAC } from '@/components/layout/withRBAC';

function ProductsPage() {
    const { user } = useAuthStore();
    const toast = useToast();
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, 300);
    const [filterCategory, setFilterCategory] = useState('all');
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

    // CSV Import state
    const [importModal, setImportModal] = useState(false);
    const [csvData, setCsvData] = useState([]);
    const [importing, setImporting] = useState(false);
    const csvInputRef = useRef(null);

    const [form, setForm] = useState({
        name: '', sku: '', price: '', cost_price: '', stock: '', category_id: '', is_active: true,
        discount: '', discount_type: 'percentage', image_url: '', discount_start: '', discount_end: '',
    });
    const [categoryForm, setCategoryForm] = useState({ name: '' });

    const loadData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [{ data: prods }, { data: cats }] = await Promise.all([
                supabase.from('products').select('*, categories(name)').eq('user_id', user.id).order('name'),
                supabase.from('categories').select('*').eq('user_id', user.id).order('name'),
            ]);
            setProducts(prods || []);
            setCategories(cats || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => { loadData(); }, [loadData]);

    const filtered = products.filter((p) => {
        const matchSearch = p.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            (p.sku && p.sku.toLowerCase().includes(debouncedSearch.toLowerCase()));
        const matchCat = filterCategory === 'all' || p.category_id === parseInt(filterCategory);
        return matchSearch && matchCat;
    });

    // Calculate final price after discount
    const getDiscountedPrice = (product) => {
        if (!product.discount || product.discount <= 0) return product.price;
        // Check scheduled discount
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
        setForm({ name: '', sku: '', price: '', cost_price: '', stock: '', category_id: '', is_active: true, discount: '', discount_type: 'percentage', image_url: '', discount_start: '', discount_end: '' });
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

    // Handle image file selection
    const handleImageSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            toast.warning('Ukuran file maksimal 5MB');
            return;
        }
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    // Upload image to Supabase Storage
    const uploadImage = async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        const { data, error } = await supabase.storage
            .from('product-images')
            .upload(fileName, file, { upsert: true });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from('product-images')
            .getPublicUrl(data.path);

        return publicUrl;
    };

    const handleSaveProduct = async () => {
        if (!form.name || !form.price) return;
        setSaving(true);
        try {
            let imageUrl = form.image_url;

            // Upload new image if selected
            if (imageFile) {
                setUploadingImage(true);
                imageUrl = await uploadImage(imageFile);
                setUploadingImage(false);
            }

            const data = {
                user_id: user.id,
                name: form.name,
                sku: form.sku || null,
                price: parseInt(form.price),
                cost_price: form.cost_price ? parseInt(form.cost_price) : null,
                stock: parseInt(form.stock || '0'),
                category_id: form.category_id ? parseInt(form.category_id) : null,
                is_active: form.is_active,
                discount: form.discount ? parseInt(form.discount) : 0,
                discount_type: form.discount_type,
                image_url: imageUrl || null,
            };

            const saveProduct = async (payload) => {
                if (editProduct) {
                    const { error } = await supabase.from('products').update(payload).eq('id', editProduct.id);
                    if (error) throw error;
                } else {
                    const { error } = await supabase.from('products').insert(payload);
                    if (error) throw error;
                }
            };

            // Try saving with discount schedule fields first
            let savedWithSchedule = false;
            if (form.discount_start || form.discount_end) {
                try {
                    const fullData = { ...data };
                    if (form.discount_start) fullData.discount_start = form.discount_start;
                    if (form.discount_end) fullData.discount_end = form.discount_end;
                    await saveProduct(fullData);
                    savedWithSchedule = true;
                } catch (saveErr) {
                    // If error is about unknown columns, retry without schedule fields
                    if (saveErr.message?.includes('column') || saveErr.code === '42703') {
                        console.warn('Discount schedule columns not found in DB, saving without them');
                    } else {
                        throw saveErr;
                    }
                }
            }

            // Save without schedule fields if not yet saved
            if (!savedWithSchedule) {
                await saveProduct(data);
            }

            // Warn user if schedule data was lost
            if (!savedWithSchedule && (form.discount_start || form.discount_end)) {
                toast.warning('Produk disimpan, namun jadwal diskon belum tersedia di database.');
            }

            setModalOpen(false);
            loadData();
            toast.success(editProduct ? 'Produk berhasil diperbarui!' : 'Produk berhasil ditambahkan!');
        } catch (err) {
            console.error(err);
            toast.error('Gagal menyimpan produk: ' + err.message);
        } finally {
            setSaving(false);
            setUploadingImage(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await supabase.from('products').delete().eq('id', id);
            setDeleteConfirm(null);
            loadData();
        } catch (err) {
            console.error(err);
        }
    };

    const handleSaveCategory = async () => {
        if (!categoryForm.name) return;
        try {
            await supabase.from('categories').insert({ user_id: user.id, name: categoryForm.name });
            setCategoryForm({ name: '' });
            setCategoryModalOpen(false);
            loadData();
        } catch (err) {
            console.error(err);
        }
    };

    const removeImage = () => {
        setImageFile(null);
        setImagePreview(null);
        setForm({ ...form, image_url: '' });
    };

    // CSV Import handlers
    const handleCsvSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                setCsvData(results.data);
            },
            error: () => {
                toast.error('Gagal membaca file CSV');
            },
        });
    };

    const handleCsvImport = async () => {
        if (csvData.length === 0) return;
        setImporting(true);
        try {
            const rows = csvData.map((row) => ({
                user_id: user.id,
                name: row['Nama Produk'] || row['name'] || '',
                sku: row['SKU'] || row['sku'] || null,
                price: parseInt(row['Harga Jual'] || row['price'] || '0'),
                cost_price: parseInt(row['Harga Modal'] || row['cost_price'] || '0') || null,
                stock: parseInt(row['Stok'] || row['stock'] || '0'),
                is_active: true,
            })).filter((r) => r.name && r.price > 0);

            if (rows.length === 0) { toast.warning('Tidak ada data valid untuk diimport'); setImporting(false); return; }

            const { error } = await supabase.from('products').insert(rows);
            if (error) throw error;

            setCsvData([]);
            setImportModal(false);
            loadData();
            toast.success(`Berhasil import ${rows.length} produk!`);
        } catch (err) {
            console.error(err);
            toast.error('Gagal import: ' + err.message);
        } finally {
            setImporting(false);
        }
    };

    const downloadCsvTemplate = () => {
        const csv = 'Nama Produk,SKU,Harga Jual,Harga Modal,Stok\nContoh Produk,SKU001,10000,8000,50';
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'template-produk.csv';
        a.click();
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <PageHeader
                title="Produk"
                description="Kelola produk toko Anda"
                action={
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                        <Button variant="secondary" size="sm" onClick={() => setImportModal(true)} className="flex-1 sm:flex-none justify-center">
                            <FileSpreadsheet size={16} className="mr-2" /> <span className="hidden sm:inline">Import CSV</span>
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => setCategoryModalOpen(true)} className="flex-1 sm:flex-none justify-center">
                            <Plus size={16} className="mr-2"/> Kategori
                        </Button>
                        <Button size="sm" onClick={openAddModal} className="flex-1 sm:flex-none justify-center">
                            <Plus size={16} className="mr-2"/> Tambah Produk
                        </Button>
                    </div>
                }
            />

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                    <Input
                        placeholder="Cari nama atau SKU produk..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        icon={Search}
                    />
                </div>
                <div className="w-full sm:w-64">
                    <Select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                    >
                        <option value="all">Semua Kategori</option>
                        {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </Select>
                </div>
            </div>

            {/* Product List */}
            {loading ? (
                <div className="space-y-3">
                    {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
                </div>
            ) : filtered.length === 0 ? (
                <EmptyState
                    icon={Package}
                    title="Belum ada produk"
                    description="Tambahkan produk pertama Anda untuk mulai berjualan."
                    action={<Button size="sm" onClick={openAddModal}><Plus size={16} className="mr-2" /> Tambah Produk</Button>}
                />
            ) : (
                <Card className="!p-0 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Produk</TableHead>
                                <TableHead className="hidden sm:table-cell">Kategori</TableHead>
                                <TableHead align="right">Harga</TableHead>
                                <TableHead align="right">Stok</TableHead>
                                <TableHead align="right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map((product) => {
                                const discountedPrice = getDiscountedPrice(product);
                                const hasDiscount = product.discount > 0;

                                return (
                                    <TableRow key={product.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                {/* Product Image */}
                                                <div className="w-12 h-12 rounded-lg bg-[var(--surface-2)] flex-shrink-0 overflow-hidden border border-[var(--surface-border)]">
                                                    {product.image_url ? (
                                                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                                                            <Package size={20} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-indigo-400 transition-colors">{product.name}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        {product.sku && <span className="text-xs text-[var(--text-muted)] font-medium bg-[var(--surface-2)] px-2 py-0.5 rounded-md border border-[var(--surface-border)]">{product.sku}</span>}
                                                        {hasDiscount && (
                                                            <Badge variant="warning" className="text-[10px] shadow-sm">
                                                                {product.discount_type === 'percentage' ? `${product.discount}%` : formatRupiah(product.discount)} OFF
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden sm:table-cell">
                                            <Badge variant="info" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20">{product.categories?.name || '-'}</Badge>
                                        </TableCell>
                                        <TableCell align="right">
                                            {hasDiscount ? (
                                                <div>
                                                    <p className="text-sm font-bold text-emerald-400 tracking-tight">{formatRupiah(discountedPrice)}</p>
                                                    <p className="text-xs text-[var(--text-muted)] line-through">{formatRupiah(product.price)}</p>
                                                </div>
                                            ) : (
                                                <p className="text-sm font-bold text-[var(--text-primary)] tracking-tight">{formatRupiah(product.price)}</p>
                                            )}
                                        </TableCell>
                                        <TableCell align="right">
                                            <Badge variant={product.stock <= 5 ? (product.stock <= 0 ? 'danger' : 'warning') : 'success'} className="shadow-sm">
                                                {product.stock} Stok
                                            </Badge>
                                        </TableCell>
                                        <TableCell align="right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openEditModal(product)} className="p-2 rounded-lg bg-[var(--surface-2)] hover:bg-indigo-500/20 text-[var(--text-secondary)] hover:text-indigo-400 transition-colors cursor-pointer">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button onClick={() => setDeleteConfirm(product)} className="p-2 rounded-lg bg-[var(--surface-2)] hover:bg-rose-500/20 text-[var(--text-secondary)] hover:text-rose-400 transition-colors cursor-pointer">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </Card>
            )}

            {/* Product Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editProduct ? 'Edit Produk' : 'Tambah Produk'}
                size="lg"
                footer={
                    <div className="flex justify-end gap-3 w-full">
                        <Button variant="secondary" onClick={() => setModalOpen(false)}>Batal</Button>
                        <Button onClick={handleSaveProduct} loading={saving}>
                            {uploadingImage ? 'Uploading gambar...' : 'Simpan'}
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    {/* Image Upload */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Gambar Produk</label>
                        <div className="flex items-start gap-4">
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="w-24 h-24 rounded-lg border-2 border-dashed border-[var(--surface-border)] hover:border-indigo-500 bg-[var(--surface-2)] flex items-center justify-center cursor-pointer transition-colors overflow-hidden relative group"
                            >
                                {imagePreview ? (
                                    <>
                                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Upload size={20} className="text-white" />
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center">
                                        <ImageIcon size={24} className="mx-auto text-[var(--text-muted)] mb-1" />
                                        <span className="text-xs text-[var(--text-muted)]">Upload</span>
                                    </div>
                                )}
                            </div>
                            {imagePreview && (
                                <button
                                    onClick={removeImage}
                                    className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
                                >
                                    <X size={16} />
                                </button>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={handleImageSelect}
                                className="hidden"
                            />
                            <div className="text-xs text-[var(--text-muted)] mt-1">
                                <p>JPG, PNG, WebP</p>
                                <p>Maks. 5MB</p>
                            </div>
                        </div>
                    </div>

                    <Input label="Nama Produk *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama produk" />
                    <Input label="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="Kode produk (opsional)" />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Harga Jual *" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0" />
                        <Input label="Harga Modal" type="number" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} placeholder="0" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Stok" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="0" />
                        <Select label="Kategori" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                            <option value="">Pilih kategori</option>
                            {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </Select>
                    </div>

                    {/* Discount Section */}
                    <div className="p-4 rounded-xl bg-[var(--surface-2)]/50 border border-[var(--surface-border)] space-y-3">
                        <div className="flex items-center gap-2">
                            <Tag size={16} className="text-amber-400" />
                            <h4 className="text-sm font-medium text-[var(--text-primary)]">Diskon Produk</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Input
                                label="Nilai Diskon"
                                type="number"
                                value={form.discount}
                                onChange={(e) => setForm({ ...form, discount: e.target.value })}
                                placeholder="0"
                            />
                            <Select
                                label="Tipe Diskon"
                                value={form.discount_type}
                                onChange={(e) => setForm({ ...form, discount_type: e.target.value })}
                            >
                                <option value="percentage">Persen (%)</option>
                                <option value="fixed">Rupiah (Rp)</option>
                            </Select>
                        </div>
                        {form.discount && parseInt(form.discount) > 0 && form.price && (
                            <div className="text-xs text-[var(--text-muted)]">
                                Harga setelah diskon: <span className="text-emerald-400 font-medium">
                                    {formatRupiah(
                                        form.discount_type === 'percentage'
                                            ? Math.round(parseInt(form.price) * (1 - parseInt(form.discount) / 100))
                                            : Math.max(0, parseInt(form.price) - parseInt(form.discount))
                                    )}
                                </span>
                            </div>
                        )}
                        {form.discount && parseInt(form.discount) > 0 && (
                            <div className="grid grid-cols-2 gap-3">
                                <Input
                                    label="Mulai Diskon"
                                    type="date"
                                    value={form.discount_start}
                                    onChange={(e) => setForm({ ...form, discount_start: e.target.value })}
                                />
                                <Input
                                    label="Akhir Diskon"
                                    type="date"
                                    value={form.discount_end}
                                    onChange={(e) => setForm({ ...form, discount_end: e.target.value })}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </Modal>

            {/* Category Modal */}
            <Modal
                isOpen={categoryModalOpen}
                onClose={() => setCategoryModalOpen(false)}
                title="Tambah Kategori"
                size="sm"
                footer={
                    <div className="flex justify-end gap-3 w-full">
                        <Button variant="secondary" onClick={() => setCategoryModalOpen(false)}>Batal</Button>
                        <Button onClick={handleSaveCategory}>Simpan</Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <Input label="Nama Kategori" value={categoryForm.name} onChange={(e) => setCategoryForm({ name: e.target.value })} placeholder="Contoh: Makanan" />
                </div>
            </Modal>

            {/* Delete Confirmation */}
            <Modal
                isOpen={!!deleteConfirm}
                onClose={() => setDeleteConfirm(null)}
                title="Hapus Produk?"
                size="sm"
                footer={
                    <div className="flex justify-end gap-3 w-full">
                        <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Batal</Button>
                        <Button variant="danger" onClick={() => handleDelete(deleteConfirm.id)}>Hapus</Button>
                    </div>
                }
            >
                <p className="text-[var(--text-secondary)] text-sm">
                    Anda yakin ingin menghapus <strong className="text-[var(--text-primary)]">{deleteConfirm?.name}</strong>? Aksi ini tidak dapat dibatalkan.
                </p>
            </Modal>

            {/* CSV Import Modal */}
            <Modal
                isOpen={importModal}
                onClose={() => { setImportModal(false); setCsvData([]); }}
                title="Import Produk dari CSV"
                size="lg"
                footer={
                    <div className="flex justify-end gap-3 w-full">
                        <Button variant="secondary" onClick={() => { setImportModal(false); setCsvData([]); }}>Batal</Button>
                        <Button onClick={handleCsvImport} loading={importing} disabled={csvData.length === 0}>
                            Import {csvData.length} Produk
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                        <p className="text-xs text-indigo-300">
                            Format CSV: <strong>Nama Produk, SKU, Harga Jual, Harga Modal, Stok</strong>.
                            Baris pertama harus berisi header kolom.
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => csvInputRef.current?.click()}
                            className="flex-1 px-4 py-3 border-2 border-dashed border-[var(--surface-border)] hover:border-indigo-500/50 rounded-xl text-sm text-[var(--text-secondary)] hover:text-white transition-all cursor-pointer text-center"
                        >
                            <FileSpreadsheet size={20} className="mx-auto mb-1" />
                            {csvData.length > 0 ? `${csvData.length} baris data siap` : 'Pilih file CSV'}
                        </button>
                        <input ref={csvInputRef} type="file" accept=".csv" onChange={handleCsvSelect} className="hidden" />
                        <button
                            onClick={downloadCsvTemplate}
                            className="flex items-center gap-1 px-4 py-3 rounded-xl bg-[var(--surface-2)] border border-[var(--surface-border)] text-sm text-[var(--text-secondary)] hover:text-white transition-colors cursor-pointer"
                        >
                            <Download size={16} />
                            Template
                        </button>
                    </div>

                    {csvData.length > 0 && (
                        <div className="max-h-60 overflow-auto rounded-xl border border-[var(--surface-border)]">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-[var(--surface-2)] border-b border-[var(--surface-border)]">
                                        {Object.keys(csvData[0]).map((key) => (
                                            <th key={key} className="px-3 py-2 text-left text-[var(--text-secondary)] font-medium">{key}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--surface-border)]">
                                    {csvData.slice(0, 20).map((row, i) => (
                                        <tr key={i} className="hover:bg-[var(--surface-2)]/30">
                                            {Object.values(row).map((val, j) => (
                                                <td key={j} className="px-3 py-2 text-[var(--text-primary)]">{val}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {csvData.length > 20 && <p className="text-xs text-[var(--text-muted)] text-center py-2">... dan {csvData.length - 20} baris lainnya</p>}
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
}

export default withRBAC(ProductsPage, ['owner']);
