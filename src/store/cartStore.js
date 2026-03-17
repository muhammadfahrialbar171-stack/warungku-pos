'use client';
import { create } from 'zustand';

export const useCartStore = create((set, get) => ({
    items: [],

    addItem: (product) => {
        const items = get().items;
        const existing = items.find((item) => item.id === product.id);

        if (existing) {
            if (existing.quantity >= product.stock) return;
            set({
                items: items.map((item) =>
                    item.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                ),
            });
        } else {
            if (product.stock <= 0) return;
            set({ items: [...items, { ...product, quantity: 1 }] });
        }
    },

    removeItem: (productId) => {
        set({ items: get().items.filter((item) => item.id !== productId) });
    },

    updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
            get().removeItem(productId);
            return;
        }
        set({
            items: get().items.map((item) =>
                item.id === productId ? { ...item, quantity } : item
            ),
        });
    },

    incrementItem: (productId) => {
        const items = get().items;
        const item = items.find((i) => i.id === productId);
        if (item && item.quantity < item.stock) {
            get().updateQuantity(productId, item.quantity + 1);
        }
    },

    decrementItem: (productId) => {
        const items = get().items;
        const item = items.find((i) => i.id === productId);
        if (item) {
            get().updateQuantity(productId, item.quantity - 1);
        }
    },

    clearCart: () => set({ items: [] }),

    setItems: (items) => set({ items }),

    get totalItems() {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
    },

    get totalAmount() {
        return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    },

    getTotal: () => {
        return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    },

    getTotalItems: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
    },
}));
