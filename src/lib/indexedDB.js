import { openDB } from 'idb';
import { supabase } from './supabase';

const DB_NAME = 'WarungkuPOS_DB';
const DB_VERSION = 2;

// Initialize IDB
export async function initDB() {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            // Store products offline
            if (!db.objectStoreNames.contains('products')) {
                db.createObjectStore('products', { keyPath: 'id' });
            }
            // Store customers offline
            if (!db.objectStoreNames.contains('customers')) {
                db.createObjectStore('customers', { keyPath: 'id' });
            }
            // Store categories offline
            if (!db.objectStoreNames.contains('categories')) {
                db.createObjectStore('categories', { keyPath: 'id' });
            }
            // Offline transaction queue
            if (!db.objectStoreNames.contains('transactions_queue')) {
                db.createObjectStore('transactions_queue', { keyPath: 'temp_id', autoIncrement: true });
            }
        },
    });
}

// --- PRODUCTS ---
export async function saveProductsOffline(products) {
    const db = await initDB();
    const tx = db.transaction('products', 'readwrite');
    const store = tx.objectStore('products');

    // Clear old data first
    await store.clear();

    // Save new data
    for (const prod of products) {
        await store.put(prod);
    }
    return tx.done;
}

export async function getProductsOffline() {
    const db = await initDB();
    return db.getAll('products');
}

// --- CUSTOMERS ---
export async function saveCustomersOffline(customers) {
    const db = await initDB();
    const tx = db.transaction('customers', 'readwrite');
    const store = tx.objectStore('customers');

    await store.clear();
    for (const cust of customers) {
        await store.put(cust);
    }
    return tx.done;
}

export async function getCustomersOffline() {
    const db = await initDB();
    return db.getAll('customers');
}

// --- CATEGORIES ---
export async function saveCategoriesOffline(categories) {
    const db = await initDB();
    const tx = db.transaction('categories', 'readwrite');
    const store = tx.objectStore('categories');

    await store.clear();
    for (const cat of categories) {
        await store.put(cat);
    }
    return tx.done;
}

export async function getCategoriesOffline() {
    const db = await initDB();
    return db.getAll('categories');
}

// --- TRANSACTIONS QUEUE ---
export async function enqueueOfflineTransaction(transactionData) {
    const db = await initDB();
    const tx = db.transaction('transactions_queue', 'readwrite');
    // Using Date.now() as a unique temporary ID if one isn't auto-generated well
    transactionData.temp_id = `OFFLINE_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    transactionData.queued_at = new Date().toISOString();

    await tx.objectStore('transactions_queue').put(transactionData);
    return tx.done;
}

export async function getOfflineTransactionsQueue() {
    const db = await initDB();
    return db.getAll('transactions_queue');
}

export async function removeTransactionFromQueue(temp_id) {
    const db = await initDB();
    return db.delete('transactions_queue', temp_id);
}

export async function clearAllOfflineData() {
    const db = await initDB();
    const tx = db.transaction(['products', 'customers', 'categories'], 'readwrite');
    await Promise.all([
        tx.objectStore('products').clear(),
        tx.objectStore('customers').clear(),
        tx.objectStore('categories').clear(),
    ]);
    return tx.done;
}

export async function processOfflineSync() {
    const queue = await getOfflineTransactionsQueue();
    if (queue.length === 0) return 0;

    let successCount = 0;

    for (const payload of queue) {
        try {
            const txPayload = {
              user_id: payload.user_id,
              invoice_number: payload.invoiceNumber || payload.invoice_number,
              total_amount: payload.totalAmount,
              total_items: payload.totalItems || payload.items.reduce((sum, item) => sum + item.quantity, 0),
              payment_method: payload.paymentMethod,
              status: "completed",
              customer_id: payload.customerId || null,
              shift_id: payload.shift_id || null,
              discount_amount: payload.txDiscount || 0,
              tax_amount: payload.taxAmount || 0,
              paid_amount: payload.paidAmount || 0,
              change_amount: payload.change || 0,
              created_at: payload.queued_at || new Date().toISOString()
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

            // Minimal Stock Sync
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

            // Remove from local queue if cloud sync is successful
            await removeTransactionFromQueue(payload.temp_id);
            successCount++;
        } catch (error) {
            console.error("Offline Sync failed for ID:", payload.temp_id, error);
            // Will automatically retry next interval
        }
    }
    return successCount;
}
