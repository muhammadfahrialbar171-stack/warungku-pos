"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  ScanLine,
  Users,
  Clock,
  LogOut,
  LayoutGrid,
  List,
  ChevronDown,
} from "lucide-react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { printReceipt, shareReceiptWhatsApp, printShiftReport } from "@/lib/receipt";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Card from "@/components/ui/Card";
import Input, { Select } from "@/components/ui/Input";
import EmptyState from "@/components/ui/EmptyState";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { useDashboardStore } from "@/store/dashboardStore";
import { useCartStore } from "@/store/cartStore";
import { useUIStore } from "@/store/uiStore";
import { formatRupiah, formatRupiahShort, generateInvoice, cn } from "@/lib/utils";
import dayjs from "dayjs";
import {
  saveProductsOffline,
  getProductsOffline,
  saveCustomersOffline,
  getCustomersOffline,
  saveCategoriesOffline,
  getCategoriesOffline,
  enqueueOfflineTransaction,
  getOfflineTransactionsQueue,
  removeTransactionFromQueue,
} from "@/lib/indexedDB";
import { useToast } from "@/components/ui/Toast";
import { useDebounce } from "@/hooks/useDebounce";
import { playAudio } from "@/lib/audio";
import React from 'react';

// --- Memoized Components for Performance ---

const CategoryItem = React.memo(({ cat, isActive, onClick }) => (
  <button
    onClick={() => onClick(cat.id === 'all' ? 'all' : String(cat.id))}
    className={cn(
      "px-5 py-2.5 rounded-xl text-[13px] font-bold whitespace-nowrap transition-all border shrink-0 active:scale-95",
      isActive 
        ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/20" 
        : "bg-[var(--surface-2)]/50 border-[var(--surface-border)] text-[var(--text-muted)] hover:bg-[var(--surface-2)] active:bg-[var(--surface-3)]"
    )}
  >
    {cat.name}
  </button>
));
CategoryItem.displayName = 'CategoryItem';

const ProductCard = React.memo(({ p, viewMode, onAdd, formatRupiah, quantity = 0 }) => {
  const hasDiscount = p.discount > 0;
  const isOutOfStock = p.stock <= 0;
  
  const discountPrice = useMemo(() => {
    if (!p.discount || p.discount <= 0) return p.price;
    if (p.discount_type === "percentage") return Math.round(p.price * (1 - p.discount / 100));
    return Math.max(0, p.price - p.discount);
  }, [p.price, p.discount, p.discount_type]);

  return (
    <div
      onClick={() => onAdd({ ...p, price: discountPrice })}
      className={cn(
        "group bg-[var(--surface-1)] border border-[var(--surface-border)] rounded-2xl overflow-hidden cursor-pointer transition-all hover:border-[var(--color-primary)]/50 active:scale-[0.96] select-none shadow-sm h-full flex flex-col",
        isOutOfStock && "opacity-60 grayscale cursor-not-allowed",
        viewMode === "list" ? "flex-row p-3 gap-4" : "p-0"
      )}
    >
      <div className={cn(
        "relative bg-[var(--surface-2)]/50 flex-shrink-0 overflow-hidden", 
        viewMode === "grid" ? "aspect-square w-full" : "w-16 h-16 rounded-xl"
      )}>
        {p.image_url ? (
          <img src={p.image_url} alt={p.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package size={viewMode === "grid" ? 24 : 20} className="text-[var(--text-muted)]/30" />
          </div>
        )}
        {hasDiscount && (
          <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-red-500 text-[10px] font-black text-white rounded shadow-lg z-10">
            {p.discount_type === 'percentage' ? `-${p.discount}%` : 'PROMO'}
          </div>
        )}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-20">
            <div className="bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded-md shadow-xl border border-white/20 transform -rotate-12 animate-pulse">
                STOK HABIS
            </div>
          </div>
        )}
        {quantity > 0 && (
          <div className="absolute top-2 right-2 min-w-[20px] h-5 bg-blue-600 text-[10px] font-black text-white rounded-full flex items-center justify-center px-1.5 shadow-lg border-2 border-white z-30 animate-scale-in">
            {quantity}
          </div>
        )}
      </div>
      <div className={cn("p-2.5 flex flex-col flex-1", viewMode === "list" && "py-0 px-2 justify-center")}>
        <h3 className="text-[12px] font-bold text-[var(--text-primary)] line-clamp-2 leading-tight mb-1 min-h-[2em]">{p.name}</h3>
        <div className="mt-auto">
            <p className="text-[14px] font-black text-[var(--color-primary)] tracking-tight">{formatRupiah(discountPrice)}</p>
            <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-[var(--surface-border)]/50">
              <span className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded",
                  p.stock < 10 ? "text-rose-500 bg-rose-500/10" : "text-[var(--text-muted)] bg-[var(--surface-2)]"
              )}>
                {p.stock} <span className="font-medium">Unit</span>
              </span>
              <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform group-active:scale-90",
                  isOutOfStock 
                    ? "bg-rose-500/20 text-rose-500 cursor-not-allowed" 
                    : "bg-[var(--color-primary)]/10 text-[var(--color-primary)] group-active:bg-[var(--color-primary)] group-active:text-white"
              )}>
                {isOutOfStock ? <X size={16} strokeWidth={3} /> : <Plus size={16} strokeWidth={2.5} />}
              </div>
            </div>
        </div>
      </div>
    </div>
  );
});
ProductCard.displayName = 'ProductCard';

const CartItem = React.memo(({ item, onIncrement, onDecrement, onRemove, formatRupiah }) => {
    const [confirmDelete, setConfirmDelete] = React.useState(false);

    return (
    <div className="p-3 bg-[var(--surface-2)]/50 rounded-xl sm:rounded-2xl border border-[var(--surface-border)] group animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex justify-between items-start gap-3 mb-2">
            <div className="min-w-0 flex-1">
                <p className="text-[12px] sm:text-[13px] font-bold text-[var(--text-primary)] leading-tight mb-0.5">{item.name}</p>
                <p className="text-[11px] font-black text-[var(--color-primary)]">{formatRupiah(item.price)}</p>
            </div>
            {/* Delete button + inline confirm */}
            {confirmDelete ? (
                <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
                    <span className="text-[10px] text-[var(--text-muted)] font-bold whitespace-nowrap">Hapus?</span>
                    <button
                        onClick={() => { onRemove(item.id); setConfirmDelete(false); }}
                        className="px-2.5 py-1 rounded-lg bg-rose-500 text-white text-[10px] font-black transition-all active:scale-90"
                    >Ya</button>
                    <button
                        onClick={() => setConfirmDelete(false)}
                        className="px-2.5 py-1 rounded-lg bg-[var(--surface-2)] border border-[var(--surface-border)] text-[10px] font-black transition-all active:scale-90"
                    >Batal</button>
                </div>
            ) : (
                <button 
                    onClick={() => setConfirmDelete(true)} 
                    className="w-9 h-9 -my-2 -mr-2 flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer active:scale-90 shrink-0"
                >
                    <Trash2 size={16} />
                </button>
            )}
        </div>
        <div className="flex items-center justify-between">
            <div className="flex items-center bg-[var(--surface-1)] rounded-lg sm:rounded-xl p-0.5 sm:p-1 border border-[var(--surface-border)] shadow-inner">
                <button 
                    onClick={() => onDecrement(item.id)} 
                    className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center hover:bg-[var(--surface-2)] active:bg-[var(--surface-3)] rounded-lg text-rose-500 transition-colors shrink-0"
                >
                    <Minus size={16} strokeWidth={2.5} />
                </button>
                <span className="w-8 flex-shrink-0 text-center text-[13px] font-black tabular-nums">{item.quantity}</span>
                <button 
                    onClick={() => onIncrement(item.id)} 
                    className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center hover:bg-[var(--surface-2)] active:bg-[var(--surface-3)] rounded-lg text-emerald-500 transition-colors shrink-0"
                >
                    <Plus size={16} strokeWidth={2.5} />
                </button>
            </div>
            <p className="text-[14px] font-black text-[var(--text-primary)] tabular-nums tracking-tighter">
                {formatRupiah(item.price * item.quantity)}
            </p>
        </div>
    </div>
    );
});
CartItem.displayName = 'CartItem';

const PRODUCT_CACHE_TTL = 15 * 60 * 1000; // 15 minutes
const PRODUCT_CACHE_KEY = 'warungku_products_cached_at';

export default function CashierPage() {
  const { user } = useAuthStore();
  const {
    items,
    addItem,
    removeItem,
    incrementItem,
    decrementItem,
    clearCart,
    setItems,
    getTotal,
    getTotalItems,
    heldTransactions,
    holdTransaction,
    restoreTransaction,
    deleteHeldTransaction,
  } = useCartStore();
  
  // Fail-safe calculation for total items if undefined
  const finalTotalItems = items.reduce((sum, i) => sum + (i.quantity || 0), 0);

  const toast = useToast();

  const vibrate = useCallback((pattern = 10) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }, []);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 250);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [checkoutModal, setCheckoutModal] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [heldModal, setHeldModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paidAmount, setPaidAmount] = useState("");
  const [processing, setProcessing] = useState(false);
  const handleRestore = useCallback((id) => {
    const held = restoreTransaction(id);
    if (held) {
      setSelectedCustomerId(held.customerId || "");
      setTxDiscount(held.discount || "");
      setTxDiscountType(held.discountType || "fixed");
      setHeldModal(false);
      toast.success('Transaksi berhasil dipulihkan');
    }
  }, [restoreTransaction, toast]);
  const [lastInvoice, setLastInvoice] = useState("");
  const lastCheckoutRef = useRef(null);
  const [txDiscount, setTxDiscount] = useState("");
  const [txDiscountType, setTxDiscountType] = useState("fixed");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const cashierCartOpen = useUIStore(state => state.cashierCartOpen);
  const setCashierCartOpen = useUIStore(state => state.setCashierCartOpen);
  const [confirmClearCart, setConfirmClearCart] = useState(false);
  const [viewMode, setViewMode] = useState("grid");

  // Barcode Scanner
  const [scannerModal, setScannerModal] = useState(false);
  const scannerRef = useRef(null);

  // Offline/Online
  const [isOnline, setIsOnline] = useState(true);
  const [taxRate, setTaxRate] = useState(0);

  // Shift
  const [activeShift, setActiveShift] = useState(null);
  const [openShiftModal, setOpenShiftModal] = useState(false);
  const [closeShiftModal, setCloseShiftModal] = useState(false);
  const [startingCash, setStartingCash] = useState("");
  const [actualCash, setActualCash] = useState("");



  const loadActiveShift = useCallback(async () => {
    if (!user) return;
    if (user.role === "owner" || !user.role) {
      setActiveShift(null);
      setOpenShiftModal(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("shifts")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "open")
        .single();

      if (data) {
        setActiveShift(data);
        setOpenShiftModal(false);
      } else {
        setActiveShift(null);
        setOpenShiftModal(true);
      }
    } catch (err) {
      setActiveShift(null);
      setOpenShiftModal(true);
    }
  }, [user?.id, user?.owner_id]);

  useEffect(() => {
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const searchRef = useRef(null);
  const paidAmountRef = useRef(null);

  // --- Calculations ---
  const totalAmount = getTotal();
  const txDiscountAmount = txDiscountType === "percentage" ? Math.round((totalAmount * parseInt(txDiscount || "0")) / 100) : parseInt(txDiscount || "0");
  const taxAmount = Math.round((totalAmount - txDiscountAmount) * (taxRate / 100));
  const finalAmount = Math.max(0, totalAmount - txDiscountAmount + taxAmount);
  const changeValue = parseInt(paidAmount || "0") - finalAmount;

  const processSupabaseCheckout = async (payload) => {
    const txPayload = {
      user_id: payload.user_id,
      invoice_number: payload.invoiceNumber,
      total_amount: payload.totalAmount,
      total_items: payload.items.reduce((sum, item) => sum + item.quantity, 0),
      payment_method: payload.paymentMethod,
      status: "completed",
      customer_id: payload.customerId || null,
      shift_id: payload.shift_id || null,
      discount_amount: payload.txDiscount || 0,
      tax_amount: payload.taxAmount || 0,
      paid_amount: payload.paidAmount || 0,
      change_amount: payload.change || 0,
    };

    const { data: transaction, error: txError } = await supabase.from("transactions").insert(txPayload).select().single();
    if (txError) throw txError;

    const txItems = payload.items.map((item) => ({
      transaction_id: transaction.id,
      product_id: item.product_id || item.id,
      product_name: item.name || item.product_name,
      quantity: item.quantity,
      price: item.price,
      cost_price: item.cost_price || 0,
      subtotal: (item.price || 0) * (item.quantity || 0),
    }));

    const { error: itemsError } = await supabase.from("transaction_items").insert(txItems);
    if (itemsError) throw itemsError;

    // Stock sync
    const productIds = payload.items.map(i => i.product_id || i.id);
    const { data: currentStocks } = await supabase.from("products").select("id, stock").in("id", productIds);

    if (currentStocks) {
      await Promise.all(payload.items.map(item => {
        const dbProd = currentStocks.find(p => p.id === (item.product_id || item.id));
        if (!dbProd) return Promise.resolve();
        const newStock = dbProd.stock - item.quantity;
        return Promise.all([
          supabase.from("products").update({ stock: newStock }).eq("id", dbProd.id),
          supabase.from("stock_history").insert({
            product_id: dbProd.id,
            user_id: payload.user_id,
            type: "sale",
            quantity: -item.quantity,
            stock_before: dbProd.stock,
            stock_after: newStock,
          })
        ]);
      }));
    }
    return true;
  };

  const saveTransactionToDB = async (method = "cash", isQuickPay = false) => {
    if (processing) return;
    setProcessing(true);
    try {
      const now = dayjs();
      const invoiceNumber = generateInvoice();
      const storeId = user.owner_id || user.id;

      const effectivePaidAmount = isQuickPay ? finalAmount : (method === "cash" ? parseInt(paidAmount || "0") : finalAmount);

      const payload = {
        user_id: storeId,
        shift_id: activeShift?.id || null,
        invoiceNumber,
        items: items.map((i) => ({ ...i, product_id: i.id })),
        totalAmount: finalAmount,
        totalItems: items.reduce((sum, i) => sum + i.quantity, 0),
        paymentMethod: method,
        paidAmount: effectivePaidAmount,
        change: effectivePaidAmount - finalAmount,
        customerId: selectedCustomerId || null,
        txDiscount: txDiscountAmount,
        discountAmount: txDiscountAmount,
        taxAmount: taxAmount,
        kasirName: user?.full_name,
      };

      if (!isOnline) {
        await enqueueOfflineTransaction(payload);
        toast.info("Transaksi disimpan offline");
      } else {
        await processSupabaseCheckout(payload);
      }

      // Invalidate dashboard cache so latest sales data shows immediately
      useDashboardStore.getState().invalidateCache();

      // Reactive stock update: manually update local state and IndexedDB cache 
      // This bypasses the 15-min TTL cache and ensures the UI is honest immediately.
      const updatedProducts = products.map(p => {
        const soldItem = items.find(item => item.id === p.id);
        if (soldItem) {
          return { ...p, stock: Math.max(0, p.stock - soldItem.quantity) };
        }
        return p;
      });
      setProducts(updatedProducts);
      saveProductsOffline(updatedProducts);

      // --- Trigger Push Notification for Low Stock ---
      if (isOnline) {
        const lowStockItems = updatedProducts.filter(p => {
          const soldItem = items.find(item => item.id === p.id);
          return soldItem && p.stock <= (p.min_stock ?? 5);
        });

        if (lowStockItems.length > 0) {
          const itemNames = lowStockItems.map(i => i.name).join(', ');
          fetch('/api/push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              storeId: storeId,
              title: 'Peringatan Stok Menipis ⚠️',
              message: `Stok menipis setelah penjualan: ${itemNames}. Segera restock!`,
              url: '/stock'
            })
          }).catch(err => console.error('Failed to trigger push', err));
        }
      }

      setLastInvoice(invoiceNumber);
      lastCheckoutRef.current = { 
        ...payload, 
        storeName: user?.store_name,
        receiptHeader: user?.receipt_header,
        receiptFooter: user?.receipt_footer,
        logoUrl: user?.logo_url
      };
      clearCart();
      setPaidAmount("");
      setTxDiscount("");
      setSelectedCustomerId("");
      setCheckoutModal(false);
      setSuccessModal(true);
      playAudio('checkout');
      vibrate([50, 30, 100]); // Satisfaction haptic
      loadData();
    } catch (err) {
      toast.error("Gagal memproses transaksi");
    } finally {
      setProcessing(false);
    }
  };

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      // F2: Focus Search
      if (e.key === 'F2') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      
      // F8: Open Checkout Modal
      if (e.key === 'F8' && !checkoutModal && items.length > 0) {
        e.preventDefault();
        setCheckoutModal(true);
        vibrate(15);
      }
      
      // F9: Focus Paid Amount (only if modal is open and cash is selected)
      if (e.key === 'F9' && checkoutModal && paymentMethod === 'cash') {
        e.preventDefault();
        paidAmountRef.current?.focus();
      }
      
      // Enter: Submit Checkout (only if modal is open)
      if (e.key === 'Enter' && checkoutModal) {
        const isButton = e.target.tagName === 'BUTTON';
        const isInput = e.target.tagName === 'INPUT';
        
        if (!isButton && (paymentMethod === 'qris' || (paymentMethod === 'cash' && changeValue >= 0))) {
          e.preventDefault();
          saveTransactionToDB(paymentMethod);
        }
      }

      // Esc: Close Modals
      if (e.key === 'Escape') {
        if (checkoutModal) setCheckoutModal(false);
        if (scannerModal) setScannerModal(false);
        if (heldModal) setHeldModal(false);
        if (successModal) setSuccessModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [checkoutModal, scannerModal, heldModal, successModal, items, paymentMethod, changeValue]);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (navigator.onLine) {
        const storeId = user.owner_id || user.id;

        // ✅ Check IndexedDB TTL cache first (15 min)
        const cachedAt = parseInt(localStorage.getItem(PRODUCT_CACHE_KEY) || '0');
        const isFresh = Date.now() - cachedAt < PRODUCT_CACHE_TTL;

        if (isFresh) {
          // Serve from IndexedDB cache
          const [offlineProd, offlineCust, offlineCats] = await Promise.all([
            getProductsOffline(),
            getCustomersOffline(),
            getCategoriesOffline(),
          ]);
          if (offlineProd.length > 0) {
            setProducts(offlineProd);
            setCustomers(offlineCust);
            setCategories(offlineCats);
            // Still fetch tax_rate (lightweight, non-cached)
            const { data: userRes } = await supabase.from('users').select('tax_rate').eq('id', storeId).single();
            if (userRes?.tax_rate) setTaxRate(parseFloat(userRes.tax_rate));
            setLoading(false);
            return;
          }
        }

        // Cache miss or expired — fetch fresh from Supabase
        const [productsRes, categoriesRes, customersRes, userRes] = await Promise.all([
          supabase.from("products").select("*").eq("user_id", storeId).eq("is_active", true).order("name"),
          supabase.from("categories").select("*").eq("user_id", storeId).order("name"),
          supabase.from("customers").select("*").eq("user_id", storeId).order("name"),
          supabase.from("users").select("tax_rate").eq("id", storeId).single(),
        ]);

        setProducts(productsRes.data || []);
        setCategories(categoriesRes.data || []);
        setCustomers(customersRes.data || []);
        if (userRes.data?.tax_rate) setTaxRate(parseFloat(userRes.data.tax_rate));

        // Save to IndexedDB + update TTL timestamp
        saveProductsOffline(productsRes.data || []);
        saveCustomersOffline(customersRes.data || []);
        saveCategoriesOffline(categoriesRes.data || []);
        localStorage.setItem(PRODUCT_CACHE_KEY, String(Date.now()));
      } else {
        const [offlineProd, offlineCust, offlineCats] = await Promise.all([
            getProductsOffline(),
            getCustomersOffline(),
            getCategoriesOffline(),
        ]);
        setProducts(offlineProd);
        setCustomers(offlineCust);
        setCategories(offlineCats);
      }
    } catch (err) {
      console.error("[Cashier] loadData Error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
    loadActiveShift();
  }, [loadData, loadActiveShift]);

  const handleOpenShift = async () => {
    if (!user || !startingCash) return;
    try {
      setProcessing(true);
      const storeId = user.owner_id || user.id;
      const { data, error } = await supabase.from("shifts").insert({
        store_id: storeId,
        user_id: user.id,
        starting_cash: parseInt(startingCash),
        status: "open",
      }).select().single();
      if (error) throw error;
      setActiveShift(data);
      setOpenShiftModal(false);
      toast.success("Shift dibuka");
    } catch (error) {
      toast.error("Gagal membuka shift");
    } finally {
      setProcessing(false);
    }
  };

  const handleCloseShift = async () => {
    if (!activeShift) return;
    try {
      setProcessing(true);
      // Hitung tunai yang masuk dari transaksi selama shift ini
      const { data: txs, error: txError } = await supabase
        .from('transactions')
        .select('paid_amount, change_amount, payment_method, total_amount')
        .eq('shift_id', activeShift.id)
        .eq('payment_method', 'cash')
        .eq('status', 'completed');
        
      if (txError) throw txError;
      
      let totalTunaiMasuk = 0;
      if (txs) {
        // Tunai aktual yang diterima adalah total uang tunai yang masuk (atau pakai paid - change)
        totalTunaiMasuk = txs.reduce((sum, tx) => sum + (tx.total_amount || 0), 0);
      }
      
      const expected = activeShift.starting_cash + totalTunaiMasuk;
      const actual = parseInt(actualCash || "0");
      const diff = actual - expected;
      const end_time = new Date().toISOString();

      const { error } = await supabase.from('shifts').update({
        status: 'closed',
        end_time: end_time,
        expected_cash: expected,
        actual_cash: actual
      }).eq('id', activeShift.id);

      if (error) throw error;
      
      toast.success("Shift berhasil ditutup");
      
      // Print Laporan Shift
      printShiftReport({
        storeName: user?.store_name,
        kasirName: user?.full_name,
        logoUrl: user?.logo_url,
        shiftId: activeShift.id,
        startTime: dayjs(activeShift.start_time).format('DD/MM/YYYY HH:mm'),
        endTime: dayjs(end_time).format('DD/MM/YYYY HH:mm'),
        startingCash: activeShift.starting_cash,
        expectedCash: expected,
        actualCash: actual,
        difference: diff
      });
      
      setActiveShift(null);
      setCloseShiftModal(false);
      setActualCash("");
      setOpenShiftModal(true); // Force open again since shift closed
    } catch (err) {
      toast.error("Gagal menutup shift");
    } finally {
      setProcessing(false);
    }
  };


  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch = (p.name || '').toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchCategory = selectedCategory === "all" || p.category_id === parseInt(selectedCategory);
      return matchSearch && matchCategory;
    });
  }, [products, debouncedSearch, selectedCategory]);

  const getDiscountedPrice = (p) => {
    if (!p.discount || p.discount <= 0) return p.price;
    if (p.discount_type === "percentage") return Math.round(p.price * (1 - p.discount / 100));
    return Math.max(0, p.price - p.discount);
  };

  const handleScanSuccess = useCallback((text) => {
    const p = products.find(p => p.sku === text);
    if (p) {
      if (p.stock > 0) {
        const success = addItem({ ...p, price: getDiscountedPrice(p) });
        if (success) {
          playAudio('item_added');
        } else {
          toast.warning(`Stok ${p.name} sudah tidak mencukupi!`);
        }
      } else {
        toast.warning(`Stok ${p.name} habis`);
      }
    }
  }, [products, addItem, toast]);

  useEffect(() => {
    if (scannerModal) {
      const timeout = setTimeout(() => {
        const scanner = new Html5QrcodeScanner("cashier-barcode-reader", { fps: 10, qrbox: 250 });
        scanner.render(handleScanSuccess, () => {});
        scannerRef.current = scanner;
      }, 100);
      return () => {
        clearTimeout(timeout);
        if (scannerRef.current) scannerRef.current.clear().catch(e => console.error(e));
      };
    }
  }, [scannerModal, handleScanSuccess]);

  return (
    <div className="flex flex-col lg:flex-row items-start min-h-full lg:h-full h-auto bg-[var(--surface-0)] relative">
      {/* Product Content Area - Local animation so overlay isn't trapped */}
      <div className="flex-1 flex flex-col min-w-0 h-full lg:overflow-hidden animate-fade-in">
        {/* Categories Bar - Glassmorphism */}
        <div className="bg-[var(--surface-1)] border-b border-[var(--surface-border)] px-4 py-3 flex flex-col gap-3 w-full">
            {/* Top Row: Search & Actions */}
            <div className="flex items-center justify-between gap-3 w-full">
                <div className="relative flex-1 group">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--color-primary)] transition-colors" />
                    <input
                        ref={searchRef}
                        id="cashier-search"
                        type="text"
                        placeholder="Cari produk... (F2)"
                        className="w-full bg-[var(--surface-2)] border border-[var(--surface-border)] rounded-2xl pl-11 pr-4 py-2.5 text-[14px] text-[var(--text-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 focus:border-[var(--color-primary)]/50 outline-none transition-all placeholder:text-[var(--text-muted)] shadow-inner"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    <div className="hidden sm:flex items-center bg-[var(--surface-2)] p-1 rounded-xl border border-[var(--surface-border)]">
                        <button onClick={() => setViewMode("grid")} className={cn("p-2 rounded-lg transition-all", viewMode === "grid" ? "bg-[var(--surface-1)] text-[var(--color-primary)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]")}><LayoutGrid size={16} /></button>
                        <button onClick={() => setViewMode("list")} className={cn("p-2 rounded-lg transition-all", viewMode === "list" ? "bg-[var(--surface-1)] text-[var(--color-primary)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]")}><List size={16} /></button>
                    </div>
                    {activeShift && (
                        <button 
                            onClick={() => setCloseShiftModal(true)} 
                            className="px-3 py-2.5 rounded-lg bg-rose-500/10 text-rose-600 font-bold border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all shadow-sm active:scale-90 text-[10px] uppercase tracking-widest hidden sm:block"
                        >
                            Tutup Shift
                        </button>
                    )}
                    <button 
                        onClick={() => setScannerModal(true)} 
                        className="p-2.5 rounded-xl bg-[var(--surface-2)] text-[var(--text-primary)] border border-[var(--surface-border)] hover:border-[var(--color-primary)]/50 hover:text-[var(--color-primary)] transition-all shadow-sm active:scale-90"
                    >
                        <ScanLine size={18} />
                    </button>
                </div>
            </div>

            {/* Bottom Row: Categories */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 w-full scrollbar-none">
                <CategoryItem cat={{ id: 'all', name: 'Semua' }} isActive={selectedCategory === 'all'} onClick={setSelectedCategory} />
                {categories.map(cat => (
                    <CategoryItem key={cat.id} cat={cat} isActive={selectedCategory === String(cat.id)} onClick={setSelectedCategory} />
                ))}
            </div>
        </div>

        {/* Product Grid - Consistently visible scroller handled by AppShell */}
        <div className="w-full h-auto lg:h-full lg:overflow-y-auto p-3 sm:p-4 pb-24 sm:pb-20 lg:pb-4 custom-scrollbar">
            {loading ? (
                <div className="grid grid-cols-2 min-[600px]:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {[...Array(12)].map((_, i) => <div key={i} className="aspect-square skeleton rounded-2xl" />)}
                </div>
            ) : filteredProducts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-30">
                    <Package size={40} className="mb-3 text-[var(--text-muted)]" />
                    <p className="text-xs font-medium">Produk tidak ditemukan</p>
                </div>
            ) : (
                <div className={cn(
                    viewMode === "grid" 
                    ? "grid grid-cols-2 min-[600px]:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4" 
                    : "space-y-2"
                )}>
                    {filteredProducts.map(p => (
                        <ProductCard 
                            key={p.id} 
                            p={p} 
                            viewMode={viewMode} 
                            quantity={items.find(item => item.id === p.id)?.quantity || 0}
                            onAdd={(prod) => {
                                if (prod.stock <= 0) {
                                    toast.warning(`Stok ${prod.name} sudah habis!`);
                                    playAudio('error');
                                    vibrate([50, 50, 50]);
                                    return;
                                }
                                const success = addItem(prod);
                                if (success) {
                                    playAudio('item_added');
                                    vibrate(10);
                                } else {
                                    toast.warning(`Stok ${prod.name} sudah tidak mencukupi!`);
                                }
                            }} 
                            formatRupiah={formatRupiah} 
                        />
                    ))}
                </div>
            )}
        </div>
      </div>

      {/* Cart Backdrop - Mobile only */}
      {cashierCartOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-[60] lg:hidden backdrop-blur-sm transition-all duration-300" 
          onClick={() => setCashierCartOpen(false)} 
        />
      )}

      {/* Cart Sidebar - Digital Receipt Style */}
      <div className={cn(
        "fixed inset-y-0 right-0 lg:sticky lg:top-0 w-full sm:w-96 lg:w-[360px] xl:w-[400px] lg:h-[calc(100vh-64px)] bg-[var(--surface-1)] border-l border-[var(--surface-border)] flex flex-col z-[70] transition-transform duration-300 shadow-2xl lg:shadow-none",
        cashierCartOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
      )}>
        {/* Cart Header */}
        <div className="h-14 border-b border-[var(--surface-border)] px-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
                <ShoppingCart size={16} className="text-[var(--color-primary)]" />
                <h2 className="font-bold text-[13px] tracking-tight">KERANJANG</h2>
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-[10px] font-bold">
                    {finalTotalItems}
                </span>
            </div>
            <div className="flex items-center gap-1">
                {heldTransactions.length > 0 && (
                    <button 
                        onClick={() => setHeldModal(true)} 
                        className="relative p-2 text-amber-500 hover:bg-amber-500/5 rounded-lg transition-colors cursor-pointer" 
                        title="Transaksi Ditahan"
                    >
                        <Clock size={16} />
                        <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full border border-[var(--surface-1)]"></span>
                    </button>
                )}
                {confirmClearCart ? (
                    <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
                        <span className="text-[10px] text-[var(--text-muted)] font-bold whitespace-nowrap">Hapus Semua?</span>
                        <button
                            onClick={() => { clearCart(); setConfirmClearCart(false); vibrate([30, 20, 30]); playAudio('warning'); }}
                            className="px-2.5 py-1 rounded-lg bg-rose-500 text-white text-[10px] font-black transition-all active:scale-90"
                        >Ya</button>
                        <button
                            onClick={() => { setConfirmClearCart(false); vibrate(5); }}
                            className="px-2.5 py-1 rounded-lg bg-[var(--surface-2)] border border-[var(--surface-border)] text-[10px] font-black transition-all active:scale-90"
                        >Batal</button>
                    </div>
                ) : (
                    <button
                        onClick={() => { setConfirmClearCart(true); vibrate(10); }}
                        disabled={items.length === 0}
                        className="p-2 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/5 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Kosongkan"
                    >
                        <Trash2 size={16} />
                    </button>
                )}
                <button onClick={() => setCashierCartOpen(false)} className="lg:hidden p-2 text-[var(--text-muted)]"><X size={20} /></button>
            </div>
        </div>

        {/* Customer Select - Minimal */}
        <div className="px-4 py-2.5 border-b border-[var(--surface-border)] bg-[var(--surface-2)]/20">
            <div className="flex items-center gap-2.5">
                <Users size={14} className="text-[var(--text-muted)] shrink-0" />
                <select
                    className="flex-1 bg-transparent text-[12px] text-[var(--text-primary)] font-semibold focus:outline-none appearance-none cursor-pointer"
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                >
                    <option value="">Guest Pelanggan</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <ChevronDown size={12} className="text-[var(--text-muted)]" />
            </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 sm:p-3 space-y-1.5 sm:space-y-2">
            {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-20 px-8 text-center">
                    <div className="w-12 h-12 rounded-full border-2 border-dashed border-[var(--text-muted)] flex items-center justify-center mb-3">
                        <ShoppingCart size={20} />
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-wider">Belum ada item</p>
                </div>
            ) : (
                items.map(item => (
                    <CartItem 
                        key={item.id} 
                        item={item} 
                        onIncrement={(id) => { 
                            const success = incrementItem(id); 
                            if (success) {
                                vibrate(10); 
                            } else {
                                toast.warning("Stok sudah tidak mencukupi!");
                            }
                        }} 
                        onDecrement={(id) => { decrementItem(id); vibrate(10); }} 
                        onRemove={(id) => { removeItem(id); vibrate([20, 10, 20]); }} 
                        formatRupiah={formatRupiah} 
                    />
                ))
            )}
        </div>

        {/* Receipt Totals & Smart Checkout */}
        <div className="flex-shrink-0 border-t border-[var(--surface-border)] bg-[var(--surface-1)] p-4 sm:p-5 space-y-3 sm:space-y-4 shadow-[0_-12px_30px_rgba(0,0,0,0.12)] pb-8 sm:pb-5">
            <div className="space-y-1.5 px-0.5">
                <div className="flex justify-between text-[11px] text-[var(--text-muted)] font-medium">
                    <span>Subtotal ({finalTotalItems})</span>
                    <span className="text-[var(--text-primary)] tracking-tight">{formatRupiah(totalAmount)}</span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-[var(--text-muted)] font-medium">
                    <div className="flex items-center gap-2">
                        <span>Diskon</span>
                        <select 
                            value={txDiscountType} 
                            onChange={(e) => setTxDiscountType(e.target.value)} 
                            className="bg-[var(--surface-3)] text-[9px] font-bold rounded px-1 py-0.5 outline-none text-[var(--text-primary)]"
                        >
                            <option value="fixed">Rp</option>
                            <option value="percentage">%</option>
                        </select>
                    </div>
                    <input
                        type="number"
                        placeholder="0"
                        min="0"
                        className="w-16 bg-transparent text-right font-bold text-[var(--text-primary)] focus:outline-none"
                        value={txDiscount}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || Number(val) >= 0) setTxDiscount(val);
                        }}
                    />
                </div>
                {taxRate > 0 && (
                    <div className="flex justify-between text-[11px] text-[var(--text-muted)] font-medium">
                        <span>Pajak ({taxRate}%)</span>
                        <span className="text-[var(--text-primary)]">{formatRupiah(taxAmount)}</span>
                    </div>
                )}
                <div className="pt-2 sm:pt-3 mt-2 sm:mt-3 border-t-2 border-dashed border-[var(--surface-border)] flex justify-between items-end bg-[var(--surface-2)]/30 -mx-3 sm:-mx-4 px-3 sm:px-4 py-2">
                    <span className="text-[13px] font-black text-[var(--text-muted)] uppercase tracking-tighter">TOTAL</span>
                    <span className="text-2xl font-black text-[var(--color-primary)] tracking-tighter leading-none">{formatRupiah(finalAmount)}</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <button
                    onClick={() => {
                        if (items.length === 0) {
                            toast.warning('Keranjang masih kosong! Tambahkan produk terlebih dahulu.');
                            return;
                        }
                        const customerName = customers.find(c => c.id === selectedCustomerId)?.name || 'Guest';
                        holdTransaction({
                            items,
                            customerId: selectedCustomerId,
                            customerName,
                            discount: Number(txDiscount) || 0,
                            discountType: txDiscountType
                        });
                        vibrate([30, 20, 30]);
                        toast.success('Transaksi berhasil ditahan');
                    }}
                    disabled={processing}
                    className="py-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 text-[12px] font-black rounded-xl border border-amber-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group uppercase tracking-widest shadow-sm"
                >
                    <Clock size={16} className="group-hover:rotate-12 transition-transform" />
                    Hold
                </button>

                <Button
                    className="py-3 text-[12px] font-black rounded-xl shadow-lg shadow-[var(--color-primary)]/20 uppercase tracking-widest relative group"
                    disabled={items.length === 0 || processing}
                    onClick={() => {
                        setCheckoutModal(true);
                        vibrate(15);
                    }}
                >
                    Bayar
                    <span className="absolute -top-2 -right-1 px-1.5 py-0.5 rounded-md bg-[var(--surface-3)] text-[8px] font-bold text-[var(--text-secondary)] border border-[var(--surface-border)] opacity-0 group-hover:opacity-100 transition-opacity">F8</span>
                </Button>
            </div>
        </div>
      </div>

      <div className="modals-container">

      {/* Checkout Modal - Aggressive Zero-Scroll Optimization */}
      <Modal
        isOpen={checkoutModal}
        onClose={() => setCheckoutModal(false)}
        title="Pembayaran"
        size="md"
        footer={<><Button variant="secondary" onClick={() => setCheckoutModal(false)}>Kembali</Button><Button onClick={() => saveTransactionToDB(paymentMethod)} loading={processing} disabled={paymentMethod === 'cash' && changeValue < 0}>{processing ? 'Memproses...' : 'Selesaikan Transaksi'}</Button></>}
      >
        <div className="space-y-2.5">
            <div className="py-2 px-3 bg-[var(--surface-2)] rounded-xl border border-[var(--surface-border)] flex flex-col items-center">
                <span className="text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-wider mb-0.5">Tagihan Total</span>
                <span className="text-xl font-black text-[var(--text-primary)] tabular-nums">{formatRupiah(finalAmount)}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { setPaymentMethod("cash"); vibrate(5); playAudio('click'); }} className={cn("p-1.5 rounded-xl border-2 transition-all flex flex-col items-center gap-0.5", paymentMethod === "cash" ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5" : "border-[var(--surface-border)] bg-[var(--surface-1)] text-[var(--text-muted)]")}>
                    <Banknote size={16} className={paymentMethod === "cash" ? "text-[var(--color-primary)]" : ""} />
                    <span className="text-[11px] font-bold">Tunai</span>
                </button>
                <button onClick={() => { setPaymentMethod("qris"); vibrate(5); playAudio('click'); }} className={cn("p-1.5 rounded-xl border-2 transition-all flex flex-col items-center gap-0.5", paymentMethod === "qris" ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5" : "border-[var(--surface-border)] bg-[var(--surface-1)] text-[var(--text-muted)]")}>
                    <QrCode size={16} className={paymentMethod === "qris" ? "text-[var(--color-primary)]" : ""} />
                    <span className="text-[11px] font-bold">QRIS / Non-Tunai</span>
                </button>
            </div>

            {paymentMethod === 'cash' && (
                <div className="space-y-2 animate-slide-up">
                    <div className="relative group">
                        <Input 
                            ref={paidAmountRef}
                            label="Uang Diterima" 
                            type="number" 
                            value={paidAmount} 
                            onChange={(e) => setPaidAmount(e.target.value)} 
                            placeholder="0" 
                            className="text-base font-bold py-1" 
                        />
                        <span className="absolute top-0 right-0 px-1.5 py-0.5 rounded-md bg-[var(--surface-3)] text-[8px] font-bold text-[var(--text-secondary)] border border-[var(--surface-border)] opacity-60">F9</span>
                    </div>
                    <div className="grid grid-cols-2 min-[400px]:grid-cols-3 gap-2">
                        {[10000, 20000, 50000, 100000, 200000].map(amt => {
                            const isSelected = Number(paidAmount) === amt && Number(paidAmount) !== finalAmount;
                            return (
                                <button 
                                    key={amt} 
                                    onClick={() => setPaidAmount(String(amt))} 
                                    className={cn(
                                        "py-3 rounded-xl border-2 text-[12px] font-black transition-all duration-200 active:scale-[0.92] flex flex-col items-center justify-center gap-0.5",
                                        isSelected 
                                            ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] shadow-[0_0_15px_rgba(37,99,235,0.1)]" 
                                            : "border-[var(--surface-border)] bg-[var(--surface-2)]/30 text-[var(--text-secondary)] hover:border-[var(--text-muted)]"
                                    )}
                                >
                                    <span className="opacity-60 text-[8px] uppercase tracking-widest">Rp</span>
                                    {formatRupiahShort(amt)}
                                </button>
                            );
                        })}
                        <button 
                            onClick={() => { setPaidAmount(String(finalAmount)); vibrate(10); playAudio('click'); }}
                            className={cn(
                                "py-3 rounded-xl border-2 text-[12px] font-black transition-all duration-200 active:scale-[0.92] flex flex-col items-center justify-center gap-0.5",
                                Number(paidAmount) === finalAmount
                                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 shadow-sm"
                                    : "border-emerald-500/30 bg-emerald-500/5 text-emerald-600/80 hover:bg-emerald-500/10"
                            )}
                        >
                            <span className="opacity-60 text-[8px] uppercase tracking-widest">Tunai</span>
                            UANG PAS
                        </button>
                    </div>
                    {changeValue >= 0 ? (
                        <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between">
                            <span className="text-[11px] font-bold text-emerald-500">Kembalian</span>
                            <span className="text-base font-black text-emerald-500">{formatRupiah(changeValue)}</span>
                        </div>
                    ) : paidAmount && (
                        <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between">
                            <span className="text-[11px] font-bold text-red-500">Kurang</span>
                            <span className="text-base font-black text-red-500">{formatRupiah(Math.abs(changeValue))}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
      </Modal>

      {/* Success Modal */}
      <Modal
        isOpen={successModal}
        onClose={() => setSuccessModal(false)}
        title="Transaksi Berhasil"
        size="sm"
        headerClassName="hidden"
        footer={<Button className="w-full py-3" onClick={() => setSuccessModal(false)}>Selesai</Button>}
      >
        <div className="flex flex-col items-center py-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 text-emerald-500">
                <CheckCircle size={40} />
            </div>
            <h2 className="text-lg font-bold mb-1">Kembalian: {lastCheckoutRef.current?.change ? formatRupiah(lastCheckoutRef.current.change) : 'Pas'}</h2>
            <p className="text-[12px] text-[var(--text-muted)] mb-8">Transaksi telah tersimpan dan stok diperbarui.</p>
            
            <div className="grid grid-cols-2 gap-3 w-full">
                <Button variant="secondary" icon={Printer} className="text-xs" onClick={() => printReceipt(lastCheckoutRef.current)}>Cetak Struk</Button>
                <Button variant="secondary" icon={Share2} className="text-xs" onClick={() => shareReceiptWhatsApp(lastCheckoutRef.current)}>Kirim WA</Button>
            </div>
        </div>
      </Modal>

      {/* Scanner Modal */}
      <Modal isOpen={scannerModal} onClose={() => setScannerModal(false)} title="Barcode Scanner">
        <div id="cashier-barcode-reader" className="w-full"></div>
      </Modal>

      {/* Shift Modal */}
      <Modal
        isOpen={openShiftModal}
        onClose={() => {}} // Force shift modal
        title="Buka Shift Kasir"
        footer={<Button className="w-full" onClick={handleOpenShift} loading={processing}>Mulai Berjualan</Button>}
      >
        <div className="space-y-4">
            <p className="text-xs text-[var(--text-muted)]">Harap masukkan modal awal di laci kas sebelum memulai shift Anda.</p>
            <Input label="Modal Awal (Tunai)" type="number" value={startingCash} onChange={(e) => setStartingCash(e.target.value)} placeholder="0" />
            <div className="grid grid-cols-3 gap-2">
                {[50000, 100000, 200000].map(val => <button key={val} onClick={() => setStartingCash(String(val))} className="px-3 py-1.5 rounded-lg border border-[var(--surface-border)] text-[11px] font-bold hover:bg-[var(--surface-2)]">{formatRupiahShort(val)}</button>)}
            </div>
        </div>
      </Modal>

      {/* Close Shift Modal */}
      <Modal
        isOpen={closeShiftModal}
        onClose={() => setCloseShiftModal(false)}
        title="Tutup Shift Kasir"
        footer={<><Button variant="secondary" onClick={() => setCloseShiftModal(false)}>Batal</Button><Button variant="danger" onClick={handleCloseShift} loading={processing} disabled={actualCash === ""}>Selesaikan Shift</Button></>}
      >
        <div className="space-y-4">
            <div className="p-3 bg-[var(--surface-2)] rounded-xl border border-[var(--surface-border)]">
                <p className="text-xs text-[var(--text-muted)] mb-1">Modal Awal Shift Ini</p>
                <p className="font-bold text-[var(--text-primary)] text-lg">{activeShift ? formatRupiah(activeShift.starting_cash) : 0}</p>
            </div>
            
            <p className="text-xs text-[var(--text-muted)]">Harap hitung dan masukkan nominal asli <strong>Uang Tunai</strong> yang ada di laci saat ini.</p>
            <Input 
              label="Tunai Cek Fisik (Laci Aktual)" 
              type="number" 
              value={actualCash} 
              onChange={(e) => setActualCash(e.target.value)} 
              placeholder="0" 
              className="font-bold text-lg"
            />
            <p className="text-[10px] text-rose-500 font-bold">*Lalu tekan Selesaikan Shift untuk membandingkan uang di laci dengan sistem.</p>
        </div>
      </Modal>

      {/* Held Transactions Modal */}
      <Modal
        isOpen={heldModal}
        onClose={() => setHeldModal(false)}
        title="Transaksi Ditahan"
        size="md"
      >
        <div className="space-y-3">
          {heldTransactions.length === 0 ? (
            <EmptyState 
              compact 
              icon={Clock} 
              title="Antrian Kosong" 
              description="Tidak ada transaksi yang sedang ditahan." 
            />
          ) : (
            heldTransactions.map((tx) => (
              <div 
                key={tx.id} 
                className="p-3.5 rounded-xl bg-[var(--surface-2)]/40 border border-[var(--surface-border)] hover:border-[var(--color-primary)]/30 transition-all group"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="info">{tx.customerName}</Badge>
                      <span className="text-[10px] text-[var(--text-muted)] font-medium">
                        {dayjs(tx.heldAt).format('HH:mm')}
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-[var(--text-primary)] truncate">
                      {tx.items.map(i => i.name).join(', ')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-[var(--color-primary)]">
                        {formatRupiah(tx.items.reduce((sum, i) => sum + (i.price * i.quantity), 0))}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)] font-bold">{tx.items.length} Item</p>
                  </div>
                </div>
                <div className="flex gap-2 pt-2 border-t border-[var(--surface-border)]/50 mt-2">
                  <Button 
                    variant="primary" 
                    size="sm" 
                    className="flex-1 py-1.5 text-[10px] uppercase font-black tracking-widest"
                    onClick={() => handleRestore(tx.id)}
                  >
                    Ambil / Lanjutkan
                  </Button>
                  <button 
                    onClick={() => deleteHeldTransaction(tx.id)}
                    className="px-3 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all cursor-pointer"
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
    </div>
  );
}
