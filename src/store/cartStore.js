'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useCartStore = create(
    persist(
        (set, get) => ({
            items: [],
            heldTransactions: [],

            addItem: (product) => {
                const items = get().items;
                const existing = items.find((item) => item.id === product.id);

                if (existing) {
                    if (existing.quantity >= product.stock) return false;
                    set({
                        items: items.map((item) =>
                            item.id === product.id
                                ? { ...item, quantity: item.quantity + 1 }
                                : item
                        ),
                    });
                    return true;
                } else {
                    if (product.stock <= 0) return false;
                    set({ items: [...items, { ...product, quantity: 1 }] });
                    return true;
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
                if (item) {
                    if (item.quantity < item.stock) {
                        get().updateQuantity(productId, item.quantity + 1);
                        return true;
                    }
                    return false;
                }
                return false;
            },

            decrementItem: (productId) => {
                const items = get().items;
                const item = items.find((i) => i.id === productId);
                if (item) {
                    get().updateQuantity(productId, item.quantity - 1);
                }
            },

            clearCart: () => set({ items: [] }),

            holdTransaction: (data) => {
                const { items, customerId, customerName, discount, discountType } = data;
                if (items.length === 0) return;
                
                const newHeld = {
                    id: `hold_${Date.now()}`,
                    items: [...items],
                    customerId,
                    customerName,
                    discount,
                    discountType,
                    heldAt: new Date().toISOString()
                };
                
                set({ 
                    heldTransactions: [newHeld, ...get().heldTransactions],
                    items: [] // Clear active cart
                });
            },

            restoreTransaction: (id) => {
                const held = get().heldTransactions.find(t => t.id === id);
                if (!held) return null;
                
                set({
                    items: held.items,
                    heldTransactions: get().heldTransactions.filter(t => t.id !== id)
                });
                
                return held;
            },

            deleteHeldTransaction: (id) => {
                set({
                    heldTransactions: get().heldTransactions.filter(t => t.id !== id)
                });
            },

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
        }),
        {
            name: 'warungku-cart-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
