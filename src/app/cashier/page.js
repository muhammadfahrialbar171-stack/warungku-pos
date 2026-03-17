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
  Tag,
  ScanLine,
  Users,
  PlayCircle,
  Clock,
  History,
  LogOut,
} from "lucide-react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { printReceipt, shareReceiptWhatsApp } from "@/lib/receipt";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { Select } from "@/components/ui/Input";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { formatRupiah, generateInvoice, cn } from "@/lib/utils";
import dayjs from "dayjs";
import {
  saveProductsOffline,
  getProductsOffline,
  saveCustomersOffline,
  getCustomersOffline,
  enqueueOfflineTransaction,
  getOfflineTransactionsQueue,
  removeTransactionFromQueue,
} from "@/lib/indexedDB";
import { useToast } from "@/components/ui/Toast";
import { useDebounce } from "@/hooks/useDebounce";

export default function CashierPage() {
  const { user, session } = useAuthStore();
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
  } = useCartStore();
  const toast = useToast();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 250);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [checkoutModal, setCheckoutModal] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paidAmount, setPaidAmount] = useState("");
  const [processing, setProcessing] = useState(false);
  const [lastInvoice, setLastInvoice] = useState("");
  const lastCheckoutRef = useRef(null);
  const [txDiscount, setTxDiscount] = useState("");
  const [txDiscountType, setTxDiscountType] = useState("fixed");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Barcode Scanner State
  const [scannerModal, setScannerModal] = useState(false);
  const scannerRef = useRef(null);

  // Hold Bill State
  const [heldBills, setHeldBills] = useState([]);
  const [holdModal, setHoldModal] = useState(false);

  // Offline State
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [transactionSuccessData, setTransactionSuccessData] = useState(null);

  // Tax Settings
  const [taxRate, setTaxRate] = useState(0);

  // Shift Management State
  const [activeShift, setActiveShift] = useState(null);
  const [openShiftModal, setOpenShiftModal] = useState(false);
  const [closeShiftModal, setCloseShiftModal] = useState(false);
  const [startingCash, setStartingCash] = useState("");
  const [actualCash, setActualCash] = useState("");

  const loadActiveShift = useCallback(async () => {
    if (!user) return;

    // Bypassing shift requirement for owner accounts
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
      if (err.code !== "PGRST116") {
        console.error("Error loading active shift:", err);
      } else {
        setActiveShift(null);
        setOpenShiftModal(true);
      }
    }
  }, [user]);

  // Listen to network status
  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineTransactions();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Function to sync queued offline transactions
  const syncOfflineTransactions = async () => {
    if (!navigator.onLine) return;

    try {
      setSyncing(true);
      const queue = await getOfflineTransactionsQueue();
      if (queue.length === 0) return;

      let successCount = 0;
      for (const tx of queue) {
        const payload = {
          invoiceNumber: tx.invoiceNumber,
          items: tx.items,
          totalAmount: tx.totalAmount,
          paymentMethod: tx.paymentMethod,
          paidAmount: tx.paidAmount || tx.totalAmount,
          change: tx.change || 0,
          customerId: tx.customerId || null,
          txDiscount: tx.txDiscount || 0, // FIX: consistent naming with processSupabaseCheckout
          taxAmount: tx.taxAmount || 0,
          receiptHeader: tx.receiptHeader,
          receiptFooter: tx.receiptFooter,
          costPrice: tx.costPrice || 0,
          createdAt: tx.createdAt || new Date(),
        };

        try {
          const { supabase: helperSb } = await import("@/lib/supabase");
          const { data: userData } = await helperSb.auth.getUser();
          if (!userData.user) continue;

          // Fetch full profile to get owner_id
          const { data: profile } = await helperSb
            .from("users")
            .select("owner_id")
            .eq("id", userData.user.id)
            .single();
          const storeId = profile?.owner_id || userData.user.id;

          // Execute Supabase checkout logic directly
          await processSupabaseCheckout({ ...payload, user_id: storeId });
          await removeTransactionFromQueue(tx.temp_id);
          successCount++;
        } catch (e) {
          console.error("Failed to sync queue item", tx.temp_id, e);
        }
      }

      if (successCount > 0) {
        toast.success(
          `Berhasil sinkronisasi ${successCount} transaksi offline ke Server.`,
        );
      }
    } catch (err) {
      console.error("Sync error:", err);
    } finally {
      setSyncing(false);
      loadData(); // reload products to get correct stock
    }
  };

  // Initialize Midtrans Snap SDK
  useEffect(() => {
    // --- MIDTRANS INTEGRATION TEMPORARILY DISABLED ---
    /*
        // const snapScript = "https://app.sandbox.midtrans.com/snap/snap.js";
        // Use production url if you have production keys
        const snapScript = "https://app.midtrans.com/snap/snap.js";
        const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;

        if (clientKey) {
            const script = document.createElement("script");
            script.src = snapScript;
            script.setAttribute("data-client-key", clientKey);
            script.async = true;
            document.body.appendChild(script);

            return () => {
                document.body.removeChild(script);
            };
        }
        */
  }, []);

  // Load held bills from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("warungku_held_bills");
      if (saved) setHeldBills(JSON.parse(saved));
    } catch (e) {}
  }, []);

  const saveHeldBills = (bills) => {
    setHeldBills(bills);
    localStorage.setItem("warungku_held_bills", JSON.stringify(bills));
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
    setSelectedCustomerId("");
  };

  const recallBill = (bill) => {
    clearCart();
    setItems(bill.items);
    setSelectedCustomerId(bill.customerId || "");
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
      if (navigator.onLine) {
        // Cashiers should load products from their owner's ID
        const storeId = user.owner_id || user.id;

        // Fetch from Supabase
        const [productsRes, categoriesRes, customersRes, userRes] =
          await Promise.all([
            supabase
              .from("products")
              .select("*")
              .eq("user_id", storeId)
              .eq("is_active", true)
              .order("name"),
            supabase
              .from("categories")
              .select("*")
              .eq("user_id", storeId)
              .order("name"),
            supabase
              .from("customers")
              .select("*")
              .eq("user_id", storeId)
              .order("name"),
            supabase
              .from("users")
              .select("tax_rate")
              .eq("id", storeId)
              .single(),
          ]);

        if (productsRes.error) throw productsRes.error;
        setProducts(productsRes.data || []);
        setCategories(categoriesRes.data || []);
        setCustomers(customersRes.data || []);
        if (userRes.data?.tax_rate)
          setTaxRate(parseFloat(userRes.data.tax_rate));

        // Cache for offline
        saveProductsOffline(productsRes.data || []);
        saveCustomersOffline(customersRes.data || []);
      } else {
        // Load from IDB
        const offlineProd = await getProductsOffline();
        const offlineCust = await getCustomersOffline();
        setProducts(offlineProd);
        setCustomers(offlineCust);
        // Categories can be extracted from products locally
        const extractedCategories = [
          ...new Set(offlineProd.map((p) => p.category)),
        ]
          .filter(Boolean)
          .map((cat, i) => ({ id: i, name: cat }));
        setCategories(extractedCategories);
      }
    } catch (err) {
      console.error("Error loading data:", err);
      // Fallback to offline if unexpected network failure
      const offlineProd = await getProductsOffline();
      setProducts(offlineProd);
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

      const { data, error } = await supabase
        .from("shifts")
        .insert({
          store_id: storeId,
          user_id: user.id,
          starting_cash: parseInt(startingCash),
          status: "open",
        })
        .select()
        .single();

      if (error) throw error;

      setActiveShift(data);
      setOpenShiftModal(false);
      toast.success("Shift berhasil dibuka");
    } catch (error) {
      console.error("Open shift error:", error);
      toast.error("Gagal membuka shift");
    } finally {
      setProcessing(false);
    }
  };

  const handleCloseShift = async () => {
    if (!activeShift || !actualCash) return;
    try {
      setProcessing(true);

      // Calculate expected cash (Starting cash + all cash transactions during this shift)
      const { data: txs } = await supabase
        .from("transactions")
        .select("paid_amount, change")
        .eq("shift_id", activeShift.id)
        .eq("payment_method", "cash")
        .eq("status", "completed");

      const cashEarned = (txs || []).reduce(
        (sum, tx) => sum + (tx.paid_amount - tx.change),
        0,
      );
      const expectedCash = Number(activeShift.starting_cash) + cashEarned;

      const { error } = await supabase
        .from("shifts")
        .update({
          end_time: new Date().toISOString(),
          actual_cash: parseInt(actualCash),
          expected_cash: expectedCash,
          status: "closed",
        })
        .eq("id", activeShift.id);

      if (error) throw error;

      setActiveShift(null);
      setCloseShiftModal(false);
      setActualCash("");
      toast.success("Shift berhasil ditutup");
      if (user?.role === "cashier") {
        setOpenShiftModal(true); // Memaksa login shift baru jika di cashier
      }
    } catch (error) {
      console.error("Close shift error:", error);
      toast.error("Gagal menutup shift");
    } finally {
      setProcessing(false);
    }
  };

  const processSupabaseCheckout = async (payload) => {
    const txPayload = {
      user_id: payload.user_id,
      invoice_number: payload.invoiceNumber,
      subtotal: payload.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      ),
      discount_amount: payload.txDiscount || 0,
      tax_amount: payload.taxAmount || 0,
      total_amount: payload.totalAmount,
      total_items: payload.items.reduce((sum, item) => sum + item.quantity, 0),
      payment_method: payload.paymentMethod,
      status: "completed",
      customer_id: payload.customerId || null,
    };

    let { data: transaction, error: txError } = await supabase
      .from("transactions")
      .insert(txPayload)
      .select()
      .single();

    if (
      txError &&
      typeof txError.message === "string" &&
      txError.message.includes("customer_id")
    ) {
      delete txPayload.customer_id;
      const retry = await supabase
        .from("transactions")
        .insert(txPayload)
        .select()
        .single();
      transaction = retry.data;
      txError = retry.error;
    }
    if (txError) throw txError;

    const txItems = payload.items.map((item) => ({
      transaction_id: transaction.id,
      product_id: item.product_id || item.id,
      product_name: item.name || item.product_name,
      quantity: item.quantity,
      price: item.price,
      cost_price: item.cost_price || item.costPrice || 0,
      subtotal: item.price * item.quantity,
    }));

    const { error: itemsError } = await supabase
      .from("transaction_items")
      .insert(txItems);
    if (itemsError) throw itemsError;

    for (const item of payload.items) {
      const { data: currentProduct } = await supabase
        .from("products")
        .select("stock")
        .eq("id", item.product_id || item.id)
        .single();
      if (currentProduct) {
        const newStock = currentProduct.stock - item.quantity;
        await supabase
          .from("products")
          .update({ stock: newStock, updated_at: new Date().toISOString() })
          .eq("id", item.product_id || item.id);
        // Also update local state
        const currentLocalProd = products.find(
          (p) => p.id === (item.product_id || item.id),
        );
        if (currentLocalProd) currentLocalProd.stock = newStock;

        await supabase.from("stock_history").insert({
          product_id: item.product_id || item.id,
          user_id: payload.user_id,
          type: "sale",
          quantity: -item.quantity,
          stock_before: currentProduct.stock,
          stock_after: newStock,
          notes: `Penjualan - ${payload.invoiceNumber}`,
        });
      }
    }

    const earnedPoints = Math.floor(payload.totalAmount / 10000);
    if (payload.customerId && earnedPoints > 0) {
      const { data: customer } = await supabase
        .from("customers")
        .select("total_points")
        .eq("id", payload.customerId)
        .single();
      if (customer) {
        await supabase
          .from("customers")
          .update({ total_points: (customer.total_points || 0) + earnedPoints })
          .eq("id", payload.customerId);
      }
    }
    return true;
  };

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "F2") {
        e.preventDefault();
        document.getElementById("cashier-search")?.focus();
      }
      if (e.key === "F9" && items.length > 0) {
        e.preventDefault();
        setCheckoutModal(true);
      }
      if (e.key === "Escape") {
        setCheckoutModal(false);
        setSuccessModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [items.length]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch = p.name
        .toLowerCase()
        .includes(debouncedSearch.toLowerCase());
      const matchCategory =
        selectedCategory === "all" ||
        p.category_id === parseInt(selectedCategory);
      return matchSearch && matchCategory;
    });
  }, [products, debouncedSearch, selectedCategory]);

  // Calculate discounted price for a product
  const getDiscountedPrice = (product) => {
    if (!product.discount || product.discount <= 0) return product.price;
    // Check scheduled discount dates
    if (product.discount_start || product.discount_end) {
      const now = new Date();
      if (product.discount_start && new Date(product.discount_start) > now)
        return product.price;
      if (product.discount_end && new Date(product.discount_end) < now)
        return product.price;
    }
    if (product.discount_type === "percentage") {
      return Math.round(product.price * (1 - product.discount / 100));
    }
    return Math.max(0, product.price - product.discount);
  };

  const totalAmount = getTotal();
  const totalItems = getTotalItems();
  const txDiscountAmount =
    txDiscountType === "percentage"
      ? Math.round((totalAmount * parseInt(txDiscount || "0")) / 100)
      : parseInt(txDiscount || "0");

  // Tax Calculation
  const taxAmount = Math.round(
    (totalAmount - txDiscountAmount) * (taxRate / 100),
  );

  const finalAmount = Math.max(0, totalAmount - txDiscountAmount + taxAmount);
  const change = parseInt(paidAmount || "0") - finalAmount;

  // Handle Barcode Scan Success
  const handleScanSuccess = useCallback(
    (decodedText) => {
      // Find product by SKU or name (assuming barcode is SKU)
      const product = products.find((p) => p.sku === decodedText);

      if (product) {
        if (product.stock > 0) {
          const discountedPrice = getDiscountedPrice(product);
          addItem({ ...product, price: discountedPrice });

          // Play success sound (optional enhancement)
          try {
            const audio = new Audio("/success-beep.mp3"); // Optional: if sound file exists
            audio.play().catch(() => {});
          } catch (e) {}
        } else {
          alert(`Stok produk habis: ${product.name}`);
        }
      } else {
        console.log("Barcode not found:", decodedText);
        toast.warning(`Produk dengan kode "${decodedText}" tidak ditemukan.`);
      }
    },
    [products, addItem],
  );

  // Initialize/Cleanup Scanner
  useEffect(() => {
    if (scannerModal) {
      // Need a slight delay to ensure the DOM element exists
      const timeout = setTimeout(() => {
        const scanner = new Html5QrcodeScanner(
          "cashier-barcode-reader",
          { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
          /* verbose= */ false,
        );
        scanner.render(handleScanSuccess, (err) => {
          // Ignore errors as they happen frequently per frame when no barcode is in sight
        });
        scannerRef.current = scanner;
      }, 100);

      return () => {
        clearTimeout(timeout);
        // FIX: use scannerRef.current so cleanup always gets the right instance
        if (scannerRef.current) {
          scannerRef.current.clear().catch((error) => {
            console.error("Failed to clear html5QrcodeScanner. ", error);
          });
          scannerRef.current = null;
        }
      };
    }
  }, [scannerModal, handleScanSuccess]);

  const saveTransactionToDB = async (paymentMethod = "cash") => {
    try {
      const invoiceNumber = `INV-${Date.now()}`;
      const totalCOGS = items.reduce(
        (sum, item) => sum + (item.cost_price || 0) * item.quantity,
        0,
      );
      const isCash = paymentMethod === "cash";

      // Cashiers should save transactions to their owner's account
      const storeId = user.owner_id || user.id;

      const payload = {
        user_id: storeId,
        shift_id: activeShift?.id || null,
        invoiceNumber,
        items: items.map((i) => ({ ...i, product_id: i.id })),
        totalAmount: finalAmount,
        paymentMethod,
        paidAmount: isCash ? parseInt(paidAmount || "0") : finalAmount,
        change: isCash ? parseInt(paidAmount || "0") - finalAmount : 0,
        customerId: selectedCustomerId || null,
        txDiscount: txDiscountAmount, // Assuming txDiscountAmount is the final calculated discount
        receiptHeader: user?.receipt_header,
        receiptFooter: user?.receipt_footer,
        costPrice: totalCOGS,
        createdAt: new Date().toISOString(),
      };

      if (!isOnline) {
        // OFFLINE QUEUE
        await enqueueOfflineTransaction(payload);

        // Optimistically clear cart visually and pretend success
        const offlineSuccessData = {
          storeName: user?.store_name,
          kasirName: user?.full_name, // FIX: send logged-in cashier name
          receiptHeader: user?.receipt_header,
          receiptFooter: user?.receipt_footer,
          customerName:
            customers.find((c) => c.id.toString() === selectedCustomerId)
              ?.name || "",
          invoiceNumber,
          items: items.map((i) => ({
            product_name: i.name,
            quantity: i.quantity,
            price: i.price,
          })),
          totalAmount: finalAmount,
          taxAmount: taxAmount, // FIX: include taxAmount for offline receipt
          totalItems,
          paymentMethod,
          paidAmount: isCash ? parseInt(paidAmount || "0") : finalAmount,
          change: isCash ? parseInt(paidAmount || "0") - finalAmount : 0,
          createdAt: new Date(),
          isOffline: true,
        };
        setTransactionSuccessData(offlineSuccessData);
        lastCheckoutRef.current = offlineSuccessData; // FIX: fill ref for print/WA

        // Adjust local state stock visually so user can't double-sell offline
        const updatedProds = products.map((p) => {
          const cartItem = items.find((i) => i.id === p.id);
          if (cartItem) return { ...p, stock: p.stock - cartItem.quantity };
          return p;
        });
        setProducts(updatedProds);
        saveProductsOffline(updatedProds);

        setLastInvoice(invoiceNumber);
        clearCart();
        setPaidAmount("");
        setTxDiscount("");
        setSelectedCustomerId("");
        setCheckoutModal(false);
        setSuccessModal(true);
        return;
      }

      // ONLINE SAVING
      await processSupabaseCheckout(payload);

      const successData = {
        storeName: user?.store_name,
        kasirName: user?.full_name, // FIX: send logged-in cashier name
        receiptHeader: user?.receipt_header,
        receiptFooter: user?.receipt_footer,
        logoUrl: user?.logo_url,
        customerName:
          customers.find((c) => c.id.toString() === selectedCustomerId)?.name ||
          "",
        invoiceNumber,
        items: items.map((i) => ({
          product_name: i.name,
          quantity: i.quantity,
          price: i.price,
        })),
        totalAmount: finalAmount,
        taxAmount: taxAmount, // FIX: include taxAmount so receipt shows PPN
        totalItems,
        paymentMethod,
        paidAmount: isCash ? parseInt(paidAmount || "0") : finalAmount,
        change: isCash ? parseInt(paidAmount || "0") - finalAmount : 0,
        createdAt: new Date(),
        isOffline: false,
      };
      setTransactionSuccessData(successData);
      lastCheckoutRef.current = successData; // FIX: fill ref so print/WA buttons work

      setLastInvoice(invoiceNumber);
      clearCart();
      setPaidAmount("");
      setTxDiscount("");
      setSelectedCustomerId("");
      setCheckoutModal(false);
      setSuccessModal(true);
      loadData(); // refresh products
    } catch (err) {
      throw err;
    }
  };

  const handleCheckout = async () => {
    if (processing) return;
    setProcessing(true);

    try {
      await saveTransactionToDB(paymentMethod);
    } catch (err) {
      console.error("Checkout error:", err);
      toast.error("Gagal memproses transaksi: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      // F4: Focus search
      if (e.key === "F4") {
        e.preventDefault();
        document.getElementById("cashier-search")?.focus();
      }

      // F8: Trigger checkout (if cart has items and no modals are open)
      if (e.key === "F8") {
        e.preventDefault();
        if (
          items.length > 0 &&
          !checkoutModal &&
          !successModal &&
          !scannerModal &&
          !holdModal
        ) {
          setPaymentMethod("cash");
          setPaidAmount("");
          setCheckoutModal(true);
          setTimeout(
            () => document.getElementById("paid-amount-input")?.focus(),
            100,
          );
        }
      }

      // Escape: Close modals or clear search
      if (e.key === "Escape") {
        if (checkoutModal) setCheckoutModal(false);
        else if (scannerModal) setScannerModal(false);
        else if (holdModal) setHoldModal(false);
        else if (successModal) {
          setSuccessModal(false);
          setLastInvoice("");
        } else if (document.activeElement.id === "cashier-search") {
          setSearch("");
          document.getElementById("cashier-search").blur();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    items.length,
    checkoutModal,
    successModal,
    scannerModal,
    holdModal,
    setSearch,
  ]);

  return (
    <div className="animate-fade-in -mx-4 md:-mx-6 -mt-4 md:-mt-6">
      <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)] md:h-[calc(100vh-73px)] relative overflow-hidden">
        {/* Left: Product Grid */}
        <div className="flex-1 p-4 md:p-6 overflow-y-auto w-full">
          {/* Search & Filter */}
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex gap-2 w-full lg:max-w-md">
              <div className="relative flex-1">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  id="cashier-search"
                  type="text"
                  placeholder="Cari produk... (F4)"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                />
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
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <button
                onClick={() => setSelectedCategory("all")}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors cursor-pointer",
                  selectedCategory === "all"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white",
                )}
              >
                Semua
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(String(cat.id))}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors cursor-pointer",
                    selectedCategory === String(cat.id)
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white",
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          {loading ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="skeleton h-40 rounded-2xl" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              <p className="text-lg mb-1">Tidak ada produk ditemukan</p>
              <p className="text-sm">
                Coba ubah pencarian atau filter kategori
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3 xl:gap-4">
              {filteredProducts.map((product) => {
                const inCart = items.find((i) => i.id === product.id);
                const outOfStock = product.stock <= 0;
                const discountedPrice = getDiscountedPrice(product);
                const hasDiscount = product.discount > 0;

                return (
                  <button
                    key={product.id}
                    onClick={() =>
                      !outOfStock &&
                      addItem({ ...product, price: discountedPrice })
                    }
                    disabled={outOfStock}
                    className={cn(
                      "relative p-3 sm:p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer group flex flex-col items-center",
                      outOfStock
                        ? "bg-slate-900 border-slate-800 opacity-60 cursor-not-allowed grayscale-[50%]"
                        : inCart
                          ? "bg-indigo-500/10 border-indigo-500 ring-1 ring-inset ring-indigo-500/50"
                          : "bg-slate-900 border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/50 hover:shadow-sm",
                    )}
                  >
                    {/* Product Image */}
                    <div className="w-full aspect-square rounded-lg bg-slate-800/50 mb-3 overflow-hidden p-3 flex items-center justify-center transition-transform group-hover:scale-105 duration-300">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-contain drop-shadow-md"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package
                            size={32}
                            className="text-slate-600 group-hover:text-indigo-400 transition-colors"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 w-full flex flex-col justify-between text-center mt-1">
                      <div className="w-full overflow-hidden">
                        <p
                          className="text-sm sm:text-base font-semibold text-white truncate w-full"
                          title={product.name}
                        >
                          {product.name}
                        </p>

                        {/* Price with discount */}
                        {hasDiscount ? (
                          <div className="mt-1.5 w-full flex flex-col items-center">
                            <p className="text-base sm:text-lg font-bold text-emerald-400 tracking-tight">
                              {formatRupiah(discountedPrice)}
                            </p>
                            <p className="text-xs text-slate-500 line-through truncate mt-0.5">
                              {formatRupiah(product.price)}
                            </p>
                          </div>
                        ) : (
                          <div className="mt-1.5 w-full">
                            <p className="text-base sm:text-lg font-bold text-indigo-400 tracking-tight">
                              {formatRupiah(product.price)}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700/50">
                        <span
                          className={cn(
                            "text-[10px] px-2 py-0.5 rounded-full font-medium border",
                            product.stock <= 5
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                              : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
                          )}
                        >
                          Stok: {product.stock}
                        </span>
                        {hasDiscount && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {product.discount_type === "percentage"
                              ? `${product.discount}%`
                              : formatRupiah(product.discount)}
                          </span>
                        )}
                      </div>
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

        {/* Mobile Cart Overlay */}
        <div
          className={cn(
            "fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
            isCartOpen
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none",
          )}
          onClick={() => setIsCartOpen(false)}
        />

        {/* Right: Cart Panel (Drawer on Mobile, Static on Desktop) */}
        <div
          className={cn(
            "fixed inset-y-0 right-0 z-50 w-full sm:w-[400px] bg-slate-850 shadow-2xl border-l border-slate-800 flex flex-col transform transition-transform duration-300 ease-in-out lg:relative lg:transform-none lg:w-96 lg:shadow-none lg:z-0 lg:flex lg:translate-x-0",
            isCartOpen ? "translate-x-0" : "translate-x-full",
          )}
        >
          {/* Handle for mobile to close cart easily */}
          <div
            className="lg:hidden flex justify-center py-2 bg-slate-850/80 active:bg-slate-800 cursor-pointer border-b border-slate-800"
            onClick={() => setIsCartOpen(false)}
          >
            <div className="w-12 h-1.5 bg-slate-700 rounded-full" />
          </div>

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
                {activeShift && (
                  <button
                    onClick={() => setCloseShiftModal(true)}
                    className="flex items-center gap-1 text-xs text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 px-2 py-1.5 rounded-lg font-medium transition-colors cursor-pointer mr-1"
                    title="Tutup Shift"
                  >
                    <LogOut size={14} />
                    Tutup Shift
                  </button>
                )}
                {heldBills.length > 0 && (
                  <button
                    onClick={() => setHoldModal(true)}
                    className="flex items-center gap-1 text-xs text-amber-500 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-1.5 rounded-lg font-medium transition-colors cursor-pointer"
                    title="Daftar Hold"
                  >
                    <History size={14} />
                    Hold ({heldBills.length})
                  </button>
                )}
                {items.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-red-400 hover:bg-red-400/10 p-2 rounded-lg transition-colors cursor-pointer"
                    title="Kosongkan Keranjang"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-70">
                <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-4 ring-1 ring-white/10">
                  <ShoppingCart size={32} className="text-slate-400" />
                </div>
                <p className="text-sm font-medium">Keranjang kosong</p>
                <p className="text-xs mt-1">Pilih produk untuk menambahkan</p>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-slate-900 border border-slate-800 animate-fade-in"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-semibold text-white truncate">
                        {item.name}
                      </p>
                      <p className="text-sm font-medium text-slate-400">
                        {formatRupiah(item.price)}
                      </p>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors cursor-pointer mt-0.5"
                    >
                      <X size={18} />
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
                      <span className="text-sm font-medium text-white w-8 text-center">
                        {item.quantity}
                      </span>
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
                <span className="text-lg font-bold text-white">
                  {formatRupiah(totalAmount)}
                </span>
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
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-amber-400">Diskon</span>
                  <span className="text-amber-400">
                    -{formatRupiah(txDiscountAmount)}
                  </span>
                </div>
              )}

              {taxAmount > 0 && (
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-slate-400">Pajak (PPN {taxRate}%)</span>
                  <span className="text-slate-300">
                    +{formatRupiah(taxAmount)}
                  </span>
                </div>
              )}

              <div className="border-t border-slate-700 pt-2 flex items-center justify-between mb-4">
                <span className="text-white font-medium">Total</span>
                <span className="text-xl font-bold text-white">
                  {formatRupiah(finalAmount)}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="px-3 border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/50"
                  onClick={holdCurrentBill}
                  title="Tahan Pesanan (Hold Bill)"
                >
                  <History size={18} />
                </Button>
                <Button
                  size="lg"
                  className="flex-1 text-base"
                  onClick={() => setCheckoutModal(true)}
                >
                  Bayar (F8)
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Floating Action Button (Cart) */}
      <div
        className={cn(
          "fixed bottom-6 inset-x-0 mx-auto w-fit z-30 transition-transform duration-300 lg:hidden pointer-events-none",
          !isCartOpen && items.length > 0
            ? "translate-y-0 opacity-100"
            : "translate-y-20 opacity-0",
        )}
      >
        <button
          onClick={() => setIsCartOpen(true)}
          className="flex items-center gap-3 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-lg shadow-indigo-500/20 transition-all pointer-events-auto cursor-pointer border border-indigo-500/50"
        >
          <div className="flex items-center gap-2 font-bold">
            <ShoppingCart size={20} />
            <span>{totalItems} Item</span>
          </div>
          <div className="w-px h-5 bg-indigo-400/50" />
          <span className="font-bold">{formatRupiahShort(totalAmount)}</span>
        </button>
      </div>

      {/* Checkout Modal */}
      <Modal
        isOpen={checkoutModal}
        onClose={() => setCheckoutModal(false)}
        title="Pembayaran"
        size="md"
      >
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
                  <span className="text-white">
                    {formatRupiah(totalAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-amber-400">Diskon</span>
                  <span className="text-amber-400">
                    -{formatRupiah(txDiscountAmount)}
                  </span>
                </div>
              </>
            )}
            {taxAmount > 0 && (
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-400">Pajak (PPN {taxRate}%)</span>
                <span className="text-white">+{formatRupiah(taxAmount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-400">Total Bayar</span>
              <span className="text-2xl font-bold text-white">
                {formatRupiah(finalAmount)}
              </span>
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
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            {selectedCustomerId && finalAmount >= 10000 && (
              <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
                <Tag size={12} />+{Math.floor(finalAmount / 10000)} Poin Member
                didapatkan!
              </p>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Metode Pembayaran
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: "cash", label: "Tunai", icon: Banknote },
                { id: "debit", label: "Debit", icon: CreditCard },
                { id: "qris", label: "QRIS", icon: QrCode },
              ].map((method) => (
                <button
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id)}
                  className={cn(
                    "p-4 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2",
                    paymentMethod === method.id
                      ? "bg-indigo-500/15 border-indigo-500/50 text-indigo-400 shadow-inner shadow-indigo-500/10"
                      : "bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-500 hover:bg-slate-800",
                  )}
                >
                  <method.icon size={24} />
                  <span className="text-sm font-medium">{method.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Paid Amount (for cash) */}
          {paymentMethod === "cash" && (
            <div className="animate-fade-in mt-2">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Uang Diterima
              </label>
              <input
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                placeholder="Masukkan jumlah uang..."
                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3.5 text-white text-lg placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-medium"
                autoFocus
              />
              {/* Quick amounts */}
              <div className="flex gap-2 mt-3 flex-wrap">
                {[finalAmount, 50000, 100000, 200000].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setPaidAmount(String(amount))}
                    className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
                  >
                    {formatRupiah(amount)}
                  </button>
                ))}
              </div>
              {change >= 0 && paidAmount && (
                <div className="mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex justify-between items-center animate-fade-in">
                  <span className="text-emerald-400 text-sm font-medium">Kembalian</span>
                  <span className="text-emerald-400 font-bold text-xl">
                    {formatRupiah(change)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-800/50 mt-2">
            <Button
              variant="secondary"
              className="px-6"
              onClick={() => setCheckoutModal(false)}
            >
              Batal
            </Button>
            <Button
              className="flex-1 text-base shadow-lg shadow-indigo-500/25"
              size="lg"
              onClick={handleCheckout}
              loading={processing}
              disabled={paymentMethod === "cash" && (!paidAmount || change < 0)}
            >
              Proses Pembayaran
            </Button>
          </div>
        </div>
      </Modal>

      {/* Barcode Scanner Modal */}
      <Modal
        isOpen={scannerModal}
        onClose={() => setScannerModal(false)}
        title="Scan Barcode Produk"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-slate-800 rounded-xl overflow-hidden min-h-[300px] flex items-center justify-center relative">
            <div id="cashier-barcode-reader" className="w-full"></div>

            {/* CSS overrides for the html5-qrcode library to match dark theme */}
            <style jsx global>{`
              #cashier-barcode-reader {
                border: none !important;
                width: 100%;
                border-radius: 0.75rem;
                overflow: hidden;
              }
              #cashier-barcode-reader video {
                border-radius: 0.75rem;
              }
              #cashier-barcode-reader__dashboard_section_csr span {
                color: white !important;
              }
              #cashier-barcode-reader__dashboard_section_swaplink {
                color: #818cf8 !important;
              }
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
              #cashier-barcode-reader a {
                color: #818cf8 !important;
              }
            `}</style>
          </div>
          <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-center">
            <p className="text-sm text-indigo-300">
              Arahkan kamera ke barcode (SKU) produk. <br />
              Produk otomatis akan masuk ke keranjang.
            </p>
          </div>
          <Button
            className="w-full"
            variant="secondary"
            onClick={() => setScannerModal(false)}
          >
            Tutup
          </Button>
        </div>
      </Modal>

      {/* Success Modal */}
      <Modal
        isOpen={successModal}
        onClose={() => setSuccessModal(false)}
        size="sm"
      >
        <div className="text-center py-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center mb-4 animate-scale-in">
            <CheckCircle size={32} className="text-emerald-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-1">
            Pembayaran Berhasil!
          </h3>
          <p className="text-slate-400 text-sm mb-6">{lastInvoice}</p>
          <div className="flex gap-2 mb-3">
            <Button
              variant="secondary"
              className="flex-1"
              icon={Printer}
              onClick={() =>
                lastCheckoutRef.current && printReceipt(lastCheckoutRef.current)
              }
            >
              Cetak Struk
            </Button>
            <Button
              variant="secondary"
              className="flex-1"
              icon={Share2}
              onClick={() =>
                lastCheckoutRef.current &&
                shareReceiptWhatsApp(lastCheckoutRef.current)
              }
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
      <Modal
        isOpen={holdModal}
        onClose={() => setHoldModal(false)}
        title="Pesanan Tertahan"
        size="md"
      >
        <div className="space-y-3">
          {heldBills.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">
              Tidak ada pesanan yang ditahan
            </p>
          ) : (
            heldBills.map((bill) => (
              <div
                key={bill.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">
                    {bill.items.length} produk — {formatRupiah(bill.total)}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Clock size={12} />
                    {new Date(bill.timestamp).toLocaleString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                      day: "2-digit",
                      month: "short",
                    })}
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

      {/* Open Shift Modal */}
      <Modal
        isOpen={openShiftModal}
        onClose={() => {}}
        title="Buka Shift Kasir"
        disableOutsideClick
      >
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
            <p className="text-sm text-indigo-300">
              Silakan masukkan jumlah Uang Modal / Saldo Awal yang ada di laci
              kasir saat ini untuk memulai shift.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Modal Awal / Saldo Laci (Rp)
            </label>
            <input
              type="number"
              value={startingCash}
              onChange={(e) => setStartingCash(e.target.value)}
              placeholder="Contoh: 100000"
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white text-lg placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
              autoFocus
            />
          </div>
          <Button
            className="w-full mt-2"
            onClick={handleOpenShift}
            loading={processing}
            disabled={!startingCash}
          >
            Buka Shift
          </Button>
        </div>
      </Modal>

      {/* Close Shift Modal */}
      <Modal
        isOpen={closeShiftModal}
        onClose={() => setCloseShiftModal(false)}
        title="Tutup Shift Kasir"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <p className="text-sm text-rose-300">
              Hitung jumlah Uang Tunai aktual di dalam laci kasir sekarang dan
              masukkan nilainya di bawah ini untuk menutup shift.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Uang Fisik di Laci (Rp)
            </label>
            <input
              type="number"
              value={actualCash}
              onChange={(e) => setActualCash(e.target.value)}
              placeholder="Contoh: 1540000"
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white text-lg placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
              autoFocus
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setCloseShiftModal(false)}
            >
              Batal
            </Button>
            <Button
              className="flex-1 bg-rose-500 hover:bg-rose-600 focus:ring-rose-500/50 shadow-rose-500/25"
              onClick={handleCloseShift}
              loading={processing}
              disabled={!actualCash}
            >
              Akhiri Shift
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
