import { openDB } from 'idb';

const DB_NAME = 'WarungkuPOS_DB';
const DB_VERSION = 1;

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
