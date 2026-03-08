'use client';

import { create } from 'zustand';

export const useThemeStore = create((set) => ({
    theme: 'dark',
    init: () => {
        if (typeof window === 'undefined') return;
        const saved = localStorage.getItem('warungku_theme') || 'dark';
        document.documentElement.classList.toggle('light', saved === 'light');
        document.documentElement.classList.toggle('dark', saved === 'dark');
        set({ theme: saved });
    },
    toggleTheme: () => {
        set((state) => {
            const next = state.theme === 'dark' ? 'light' : 'dark';
            localStorage.setItem('warungku_theme', next);
            document.documentElement.classList.toggle('light', next === 'light');
            document.documentElement.classList.toggle('dark', next === 'dark');
            return { theme: next };
        });
    },
}));
