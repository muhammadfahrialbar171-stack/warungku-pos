'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    Search,
    ShoppingCart,
    Plus,
    Minus,
    Trash2,
    X,
    CreditCard,
    Banknote,
    QrCode,
    CheckCircle,
    Printer,
    Share2,
    Package,
    Tag,
    ScanLine,
    Users,
    PauseCircle,
    PlayCircle,
    Clock,
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { printReceipt, shareReceiptWhatsApp } from '@/lib/receipt';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { Select } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { formatRupiah, generateInvoice, cn } from '@/lib/utils';

export default function CashierPage() {
    const { user } = useAuthStore();
    const { items, addItem, removeItem, incrementItem, decrementItem, clearCart, getTotal, getTotalItems } = useCartStore();

    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [loading, setLoading] = useState(true);
    const [checkoutModal, setCheckoutModal] = useState(false);
    const [successModal, setSuccessModal] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [paidAmount, setPaidAmount] = useState('');
    const [processing, setProcessing] = useState(false);
    const [lastInvoice, setLastInvoice] = useState('');
    const lastCheckoutRef = useRef(null);
    const [txDiscount, setTxDiscount] = useState('');
    const [txDiscountType, setTxDiscountType] = useState('fixed');
    const [selectedCustomerId, setSelectedCustomerId] = useState('');

    // Barcode Scanner State
    const [scannerModal, setScannerModal] = useState(false);
    const scannerRef = useRef(null);

    // Hold Bill State
    const [heldBills, setHeldBills] = useState([]);
    const [holdModal, setHoldModal] = useState(false);

    // Load held bills from localStorage
    useEffect(() => {
        try {
            const saved = localStorage.getItem('warungku_held_bills');
            if (saved) setHeldBills(JSON.parse(saved));
        } catch (e) { }
    }, []);

    const saveHeldBills = (bills) => {
        setHeldBills(bills);
        localStorage.setItem('warungku_held_bills', JSON.stringify(bills));
    };

    const holdCurrentBill = () => {
        if (items.length === 0) return;
        const bill = {
            id: Date.now(),
            items: items,
            customerId: selectedCustomerId,
            timestamp: new Date().toISOString(),
            total: getTotal(),
        };
        const updated = [bill, ...heldBills].slice(0, 10);
        saveHeldBills(updated);
        clearCart();
        setSelectedCustomerId('');
    };

    const recallBill = (bill) => {
        clearCart();
        bill.items.forEach((item) => addItem(item));
        setSelectedCustomerId(bill.customerId || '');
        const updated = heldBills.filter((b) => b.id !== bill.id);
        saveHeldBills(updated);
        setHoldModal(false);
    };

    const deleteHeldBill = (billId) => {
        const updated = heldBills.filter((b) => b.id !== billId);
        saveHeldBills(updated);
    };

    const loadData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [{ data: prods }, { data: cats }, { data: custs }] = await Promise.all([
                supabase
                    .from('products')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('is_active', true)
                    .order('name'),
                supabase
                    .from('categories')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('name'),
                supabase
                    .from('customers')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('name'),
            ]);
            setProducts(prods || []);
            setCategories(cats || []);
            setCustomers(custs || []);
        } catch (err) {
            console.error('Load error:', err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Keyboard shortcut
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'F2') { e.preventDefault(); document.getElementById('cashier-search')?.focus(); }
            if (e.key === 'F9' && items.length > 0) { e.preventDefault(); setCheckoutModal(true); }
            if (e.key === 'Escape') { setCheckoutModal(false); setSuccessModal(false); }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [items.length]);

    const filteredProducts = useMemo(() => {
        return products.filter((p) => {
            const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
            const matchCategory = selectedCategory === 'all' || p.category_id === parseInt(selectedCategory);
            return matchSearch && matchCategory;
        });
    }, [products, search, selectedCategory]);

    // Calculate discounted price for a product
    const getDiscountedPrice = (product) => {
        if (!product.discount || product.discount <= 0) return product.price;
        // Check scheduled discount dates
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

    const totalAmount = getTotal();
    const totalItems = getTotalItems();
    const txDiscountAmount = txDiscountType === 'percentage'
        ? Math.round(totalAmount * parseInt(txDiscount || '0') / 100)
        : parseInt(txDiscount || '0');
    const finalAmount = Math.max(0, totalAmount - txDiscountAmount);
    const change = parseInt(paidAmount || '0') - finalAmount;

    // Handle Barcode Scan Success
    const handleScanSuccess = useCallback((decodedText) => {
        // Find product by SKU or name (assuming barcode is SKU)
        const product = products.find(p => p.sku === decodedText);

        if (product) {
            if (product.stock > 0) {
                const discountedPrice = getDiscountedPrice(product);
                addItem({ ...product, price: discountedPrice });

                // Play success sound (optional enhancement)
                try {
                    const audio = new Audio('/success-beep.mp3'); // Optional: if sound file exists
                    audio.play().catch(() => { });
                } catch (e) { }

            } else {
                alert(`Stok produk habis: ${product.name}`);
            }
        } else {
            console.log("Barcode not found:", decodedText);
            // Optionally could add a toast here for "Product not found"
        }
    }, [products, addItem]);

    // Initialize/Cleanup Scanner
    useEffect(() => {
        let scanner = null;
        if (scannerModal) {
            // Need a slight delay to ensure the DOM element exists
            setTimeout(() => {
                scanner = new Html5QrcodeScanner(
                    "cashier-barcode-reader",
                    { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
                    /* verbose= */ false
                );
                scanner.render(handleScanSuccess, (err) => {
                    // Ignore errors as they happen frequently per frame when no barcode is in sight
                });
                scannerRef.current = scanner;
            }, 100);
        }

        return () => {
            if (scanner) {
                scanner.clear().catch(error => {
                    console.error("Failed to clear html5QrcodeScanner. ", error);
                });
            }
        };
    }, [scannerModal, handleScanSuccess]);

    const handleCheckout = async () => {
        if (processing) return;
        setProcessing(true);

        try {
            const invoiceNumber = generateInvoice();

            // Create transaction payload
            const txPayload = {
                user_id: user.id,
                invoice_number: invoiceNumber,
                subtotal: totalAmount,
                discount_amount: txDiscountAmount,
                total_amount: finalAmount,
                total_items: totalItems,
                payment_method: paymentMethod,
                status: 'completed',
                customer_id: selectedCustomerId || null,
            };

            let { data: transaction, error: txError } = await supabase
                .from('transactions')
                .insert(txPayload)
                .select()
                .single();

            // Graceful fallback if customer_id column doesn't exist yet
            if (txError && typeof txError.message === 'string' && txError.message.includes('customer_id')) {
                delete txPayload.customer_id;
                const retry = await supabase.from('transactions').insert(txPayload).select().single();
                transaction = retry.data;
                txError = retry.error;
            }

            if (txError) throw txError;

            // Create transaction items
            const txItems = items.map((item) => ({
                transaction_id: transaction.id,
                product_id: item.id,
                product_name: item.name,
                quantity: item.quantity,
                price: item.price,
                subtotal: item.price * item.quantity,
            }));

            const { error: itemsError } = await supabase
                .from('transaction_items')
                .insert(txItems);

            if (itemsError) throw itemsError;

            // Update stock
            for (const item of items) {
                const newStock = item.stock - item.quantity;
                await supabase
                    .from('products')
                    .update({ stock: newStock, updated_at: new Date().toISOString() })
                    .eq('id', item.id);

                // Stock history
                await supabase.from('stock_history').insert({
                    product_id: item.id,
                    user_id: user.id,
                    type: 'sale',
                    quantity: -item.quantity,
                    stock_before: item.stock,
                    stock_after: newStock,
                    notes: `Penjualan - ${invoiceNumber}`,
                });
            }

            // Reward points if customer selected (1 point per Rp 10.000 final amount)
            const earnedPoints = Math.floor(finalAmount / 10000);
            if (selectedCustomerId && earnedPoints > 0) {
                const customer = customers.find(c => c.id.toString() === selectedCustomerId);
                if (customer) {
                    await supabase
                        .from('customers')
                        .update({ total_points: (customer.total_points || 0) + earnedPoints })
                        .eq('id', customer.id);
                }
            }

            // Save checkout data for receipt
            lastCheckoutRef.current = {
                storeName: user?.store_name,
                customerName: customers.find(c => c.id.toString() === selectedCustomerId)?.name || '',
                invoiceNumber,
                items: items.map(i => ({ product_name: i.name, quantity: i.quantity, price: i.price })),
                totalAmount: finalAmount,
                totalItems,
                paymentMethod,
                paidAmount: parseInt(paidAmount || '0'),
                change: paymentMethod === 'cash' ? parseInt(paidAmount || '0') - finalAmount : 0,
                createdAt: new Date(),
            };

            setLastInvoice(invoiceNumber);
            clearCart();
            setPaidAmount('');
            setTxDiscount('');
            setSelectedCustomerId('');
            setCheckoutModal(false);
            setSuccessModal(true);
            loadData(); // refresh products
        } catch (err) {
            console.error('Checkout error:', err);
            alert('Gagal memproses transaksi: ' + err.message);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="animate-fade-in -mx-4 md:-mx-6 -mt-4 md:-mt-6">
            <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)] md:h-[calc(100vh-73px)]">
                {/* Left: Product Grid */}
                <div className="flex-1 p-4 md:p-6 overflow-y-auto">
                    {/* Search & Filter */}
                    <div className="flex flex-col sm:flex-row gap-3 mb-4">
                        <div className="relative flex-1">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                id="cashier-search"
                                type="text"
                                placeholder="Cari produk... (F2)"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                            />
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hidden">
                            <button
                                onClick={() => setSelectedCategory('all')}
                                className={cn(
                                    'px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all cursor-pointer',
                                    selectedCategory === 'all'
                                        ? 'bg-indigo-500 text-white'
                                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                )}
                            >
                                Semua
                            </button>
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(String(cat.id))}
                                    className={cn(
                                        'px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all cursor-pointer',
                                        selectedCategory === String(cat.id)
                                            ? 'bg-indigo-500 text-white'
                                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                    )}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                        <Button
                            variant="secondary"
                            className="flex-shrink-0"
                            icon={ScanLine}
                            onClick={() => setScannerModal(true)}
                        >
                            <span className="hidden sm:inline">Scan</span>
                        </Button>
                    </div>

                    {/* Product Grid */}
                    {loading ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                            {[...Array(10)].map((_, i) => (
                                <div key={i} className="skeleton h-40 rounded-2xl" />
                            ))}
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="text-center py-20 text-slate-500">
                            <p className="text-lg mb-1">Tidak ada produk ditemukan</p>
                            <p className="text-sm">Coba ubah pencarian atau filter kategori</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                            {filteredProducts.map((product) => {
                                const inCart = items.find((i) => i.id === product.id);
                                const outOfStock = product.stock <= 0;
                                const discountedPrice = getDiscountedPrice(product);
                                const hasDiscount = product.discount > 0;

                                return (
                                    <button
                                        key={product.id}
                                        onClick={() => !outOfStock && addItem({ ...product, price: discountedPrice })}
                                        disabled={outOfStock}
                                        className={cn(
                                            'relative p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer group',
                                            outOfStock
                                                ? 'bg-slate-800/30 border-slate-800 opacity-50 cursor-not-allowed'
                                                : inCart
                                                    ? 'bg-indigo-500/10 border-indigo-500/30 hover:border-indigo-500/50'
                                                    : 'bg-slate-800/50 border-slate-700 hover:border-slate-600 hover:bg-slate-800/80'
                                        )}
                                    >
                                        {/* Product Image */}
                                        <div className="w-full h-20 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 mb-3 overflow-hidden">
                                            {product.image_url ? (
                                                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Package size={24} className="text-slate-600" />
                                                </div>
                                            )}
                                        </div>

                                        <p className="text-sm font-medium text-white truncate">{product.name}</p>

                                        {/* Price with discount */}
                                        {hasDiscount ? (
                                            <div className="mt-1 w-full overflow-hidden">
                                                <p className="text-lg font-bold text-emerald-400 truncate">{formatRupiah(discountedPrice)}</p>
                                                <p className="text-xs text-slate-500 line-through truncate">{formatRupiah(product.price)}</p>
                                            </div>
                                        ) : (
                                            <p className="text-lg font-bold text-indigo-400 mt-1 truncate w-full">{formatRupiah(product.price)}</p>
                                        )}

                                        <div className="flex items-center justify-between mt-2">
                                            <Badge variant={product.stock <= 5 ? 'warning' : 'success'} className="text-[10px]">
                                                Stok: {product.stock}
                                            </Badge>
                                            {hasDiscount && (
                                                <Badge variant="warning" className="text-[10px]">
                                                    {product.discount_type === 'percentage' ? `${product.discount}%` : formatRupiah(product.discount)}
                                                </Badge>
                                            )}
                                        </div>

                                        {inCart && (
                                            <div className="absolute -top-2 -right-2 w-7 h-7 bg-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-indigo-500/40 animate-scale-in">
                                                {inCart.quantity}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Right: Cart Panel */}
                <div className="w-full lg:w-96 bg-slate-850 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col">
                    {/* Cart Header */}
                    <div className="p-4 border-b border-slate-800">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ShoppingCart size={20} className="text-indigo-400" />
                                <h3 className="font-semibold text-white">Keranjang</h3>
                                {totalItems > 0 && (
                                    <Badge variant="primary">{totalItems} item</Badge>
                                )}
                            </div>
                            <div className="flex items-center gap-1">
                                {items.length > 0 && (
                                    <button
                                        onClick={holdCurrentBill}
                                        className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-amber-500/10"
                                        title="Tahan pesanan (F8)"
                                    >
                                        <PauseCircle size={14} />
                                        Hold
                                    </button>
                                )}
                                {heldBills.length > 0 && (
                                    <button
                                        onClick={() => setHoldModal(true)}
                                        className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-emerald-500/10 relative"
                                        title="Lihat pesanan tertahan"
                                    >
                                        <PlayCircle size={14} />
                                        Recall
                                        <span className="ml-0.5 w-4 h-4 bg-emerald-500 rounded-full text-[10px] text-white flex items-center justify-center">{heldBills.length}</span>
                                    </button>
                                )}
                                {items.length > 0 && (
                                    <button
                                        onClick={clearCart}
                                        className="text-xs text-slate-500 hover:text-red-400 transition-colors cursor-pointer px-2 py-1"
                                    >
                                        Hapus
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Cart Items */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {items.length === 0 ? (
                            <div className="text-center py-12 text-slate-500">
                                <ShoppingCart size={40} className="mx-auto mb-3 opacity-30" />
                                <p className="text-sm">Keranjang kosong</p>
                                <p className="text-xs mt-1">Pilih produk untuk menambahkan</p>
                            </div>
                        ) : (
                            items.map((item) => (
                                <div
                                    key={item.id}
                                    className="p-3 rounded-xl bg-slate-800/50 border border-slate-700 animate-fade-in"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-white truncate">{item.name}</p>
                                            <p className="text-xs text-slate-500">{formatRupiah(item.price)}</p>
                                        </div>
                                        <button
                                            onClick={() => removeItem(item.id)}
                                            className="p-1 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between mt-2">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => decrementItem(item.id)}
                                                className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-white transition-colors cursor-pointer"
                                            >
                                                <Minus size={14} />
                                            </button>
                                            <span className="text-sm font-medium text-white w-8 text-center">{item.quantity}</span>
                                            <button
                                                onClick={() => incrementItem(item.id)}
                                                disabled={item.quantity >= item.stock}
                                                className="w-7 h-7 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-white transition-colors cursor-pointer disabled:opacity-50"
                                            >
                                                <Plus size={14} />
                                            </button>
                                        </div>
                                        <p className="text-sm font-semibold text-white">
                                            {formatRupiah(item.price * item.quantity)}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Cart Footer */}
                    {items.length > 0 && (
                        <div className="p-4 border-t border-slate-800 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-slate-400">Subtotal</span>
                                <span className="text-lg font-bold text-white">{formatRupiah(totalAmount)}</span>
                            </div>

                            {/* Transaction Discount */}
                            <div className="flex items-center gap-2">
                                <Tag size={14} className="text-amber-400 flex-shrink-0" />
                                <input
                                    type="number"
                                    value={txDiscount}
                                    onChange={(e) => setTxDiscount(e.target.value)}
                                    placeholder="Diskon"
                                    className="flex-1 bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                                />
                                <select
                                    value={txDiscountType}
                                    onChange={(e) => setTxDiscountType(e.target.value)}
                                    className="bg-slate-800/50 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none cursor-pointer"
                                >
                                    <option value="fixed">Rp</option>
                                    <option value="percentage">%</option>
                                </select>
                            </div>

                            {txDiscountAmount > 0 && (
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-amber-400">Diskon</span>
                                    <span className="text-amber-400">-{formatRupiah(txDiscountAmount)}</span>
                                </div>
                            )}

                            <div className="border-t border-slate-700 pt-2 flex items-center justify-between">
                                <span className="text-white font-medium">Total</span>
                                <span className="text-xl font-bold text-white">{formatRupiah(finalAmount)}</span>
                            </div>
                            <Button
                                size="lg"
                                className="w-full text-base"
                                onClick={() => setCheckoutModal(true)}
                            >
                                Bayar (F9)
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Checkout Modal */}
            <Modal isOpen={checkoutModal} onClose={() => setCheckoutModal(false)} title="Pembayaran" size="md">
                <div className="space-y-4">
                    {/* Summary */}
                    <div className="p-4 rounded-xl bg-slate-700/30 border border-slate-700">
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-slate-400">Total Item</span>
                            <span className="text-white font-medium">{totalItems} item</span>
                        </div>
                        {txDiscountAmount > 0 && (
                            <>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-slate-400">Subtotal</span>
                                    <span className="text-white">{formatRupiah(totalAmount)}</span>
                                </div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-amber-400">Diskon</span>
                                    <span className="text-amber-400">-{formatRupiah(txDiscountAmount)}</span>
                                </div>
                            </>
                        )}
                        <div className="flex justify-between">
                            <span className="text-slate-400">Total Bayar</span>
                            <span className="text-2xl font-bold text-white">{formatRupiah(finalAmount)}</span>
                        </div>
                    </div>

                    {/* Pelanggan */}
                    <div>
                        <Select
                            label="Pilih Pelanggan (Opsional)"
                            value={selectedCustomerId}
                            onChange={(e) => setSelectedCustomerId(e.target.value)}
                        >
                            <option value="">-- Pelanggan Umum --</option>
                            {customers.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </Select>
                        {selectedCustomerId && finalAmount >= 10000 && (
                            <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
                                <Tag size={12} />
                                +{Math.floor(finalAmount / 10000)} Poin Member didapatkan!
                            </p>
                        )}
                    </div>

                    {/* Payment Method */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Metode Pembayaran</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { id: 'cash', label: 'Tunai', icon: Banknote },
                                { id: 'debit', label: 'Debit', icon: CreditCard },
                                { id: 'qris', label: 'QRIS', icon: QrCode },
                            ].map((method) => (
                                <button
                                    key={method.id}
                                    onClick={() => setPaymentMethod(method.id)}
                                    className={cn(
                                        'p-3 rounded-xl border text-center transition-all cursor-pointer',
                                        paymentMethod === method.id
                                            ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-400'
                                            : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                                    )}
                                >
                                    <method.icon size={20} className="mx-auto mb-1" />
                                    <span className="text-xs font-medium">{method.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Paid Amount (for cash) */}
                    {paymentMethod === 'cash' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Uang Diterima</label>
                            <input
                                type="number"
                                value={paidAmount}
                                onChange={(e) => setPaidAmount(e.target.value)}
                                placeholder="Masukkan jumlah uang..."
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white text-lg placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                                autoFocus
                            />
                            {/* Quick amounts */}
                            <div className="flex gap-2 mt-2 flex-wrap">
                                {[finalAmount, 50000, 100000, 200000].map((amount) => (
                                    <button
                                        key={amount}
                                        onClick={() => setPaidAmount(String(amount))}
                                        className="px-3 py-1.5 rounded-lg bg-slate-700 text-xs text-slate-300 hover:bg-slate-600 transition-colors cursor-pointer"
                                    >
                                        {formatRupiah(amount)}
                                    </button>
                                ))}
                            </div>
                            {change >= 0 && paidAmount && (
                                <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                                    <div className="flex justify-between">
                                        <span className="text-emerald-400 text-sm">Kembalian</span>
                                        <span className="text-emerald-400 font-bold text-lg">{formatRupiah(change)}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <Button variant="secondary" className="flex-1" onClick={() => setCheckoutModal(false)}>
                            Batal
                        </Button>
                        <Button
                            className="flex-1"
                            onClick={handleCheckout}
                            loading={processing}
                            disabled={paymentMethod === 'cash' && (!paidAmount || change < 0)}
                        >
                            Proses Pembayaran
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Barcode Scanner Modal */}
            <Modal isOpen={scannerModal} onClose={() => setScannerModal(false)} title="Scan Barcode Produk" size="md">
                <div className="space-y-4">
                    <div className="bg-slate-800 rounded-xl overflow-hidden min-h-[300px] flex items-center justify-center relative">
                        <div id="cashier-barcode-reader" className="w-full"></div>

                        {/* CSS overrides for the html5-qrcode library to match dark theme */}
                        <style jsx global>{`
                            #cashier-barcode-reader { border: none !important; width: 100%; border-radius: 0.75rem; overflow: hidden; }
                            #cashier-barcode-reader video { border-radius: 0.75rem; }
                            #cashier-barcode-reader__dashboard_section_csr span { color: white !important; }
                            #cashier-barcode-reader__dashboard_section_swaplink { color: #818cf8 !important; }
                            #cashier-barcode-reader button { 
                                background-color: #4f46e5 !important; 
                                color: white !important; 
                                border: none !important; 
                                padding: 8px 16px !important; 
                                border-radius: 8px !important; 
                                font-weight: 500 !important;
                                margin: 4px !important;
                                cursor: pointer;
                            }
                            #cashier-barcode-reader a { color: #818cf8 !important; }
                        `}</style>
                    </div>
                    <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-center">
                        <p className="text-sm text-indigo-300">
                            Arahkan kamera ke barcode (SKU) produk. <br />Produk otomatis akan masuk ke keranjang.
                        </p>
                    </div>
                    <Button className="w-full" variant="secondary" onClick={() => setScannerModal(false)}>Tutup</Button>
                </div>
            </Modal>

            {/* Success Modal */}
            <Modal isOpen={successModal} onClose={() => setSuccessModal(false)} size="sm">
                <div className="text-center py-4">
                    <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center mb-4 animate-scale-in">
                        <CheckCircle size={32} className="text-emerald-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-1">Pembayaran Berhasil!</h3>
                    <p className="text-slate-400 text-sm mb-6">{lastInvoice}</p>
                    <div className="flex gap-2 mb-3">
                        <Button
                            variant="secondary"
                            className="flex-1"
                            icon={Printer}
                            onClick={() => lastCheckoutRef.current && printReceipt(lastCheckoutRef.current)}
                        >
                            Cetak Struk
                        </Button>
                        <Button
                            variant="secondary"
                            className="flex-1"
                            icon={Share2}
                            onClick={() => lastCheckoutRef.current && shareReceiptWhatsApp(lastCheckoutRef.current)}
                        >
                            WhatsApp
                        </Button>
                    </div>
                    <Button className="w-full" onClick={() => setSuccessModal(false)}>
                        Transaksi Baru
                    </Button>
                </div>
            </Modal>

            {/* Hold Bills Modal */}
            <Modal isOpen={holdModal} onClose={() => setHoldModal(false)} title="Pesanan Tertahan" size="md">
                <div className="space-y-3">
                    {heldBills.length === 0 ? (
                        <p className="text-sm text-slate-500 text-center py-4">Tidak ada pesanan yang ditahan</p>
                    ) : (
                        heldBills.map((bill) => (
                            <div key={bill.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white">{bill.items.length} produk — {formatRupiah(bill.total)}</p>
                                    <div className="flex items-center gap-1 text-xs text-slate-500">
                                        <Clock size={12} />
                                        {new Date(bill.timestamp).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => recallBill(bill)}
                                        className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-medium transition-colors cursor-pointer"
                                    >
                                        Recall
                                    </button>
                                    <button
                                        onClick={() => deleteHeldBill(bill.id)}
                                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </Modal>
        </div>
    );
}
