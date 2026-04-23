import { create } from 'zustand';

export const useUIStore = create((set) => ({
    commandPaletteOpen: false,
    setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
    toggleCommandPalette: () => set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),
    
    cashierCartOpen: false,
    setCashierCartOpen: (open) => set({ cashierCartOpen: open }),
    toggleCashierCart: () => set((state) => ({ cashierCartOpen: !state.cashierCartOpen })),
}));
