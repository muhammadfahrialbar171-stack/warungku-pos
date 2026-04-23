import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const initialData = {
    stats: {
        todaySales: 0,
        todayTransactions: 0,
        totalProducts: 0,
        monthSales: 0,
        netProfit: 0,
    },
    topProducts: [],
    lowStockProducts: [],
    recentTransactions: [],
    weeklyData: [],
    weeklyProfitData: [],
    weeklyExpenseData: [],
    categoryData: { labels: [], data: [] },
    expenseData: { labels: [], data: [] },
    aiInsights: {
        lowStockPredictions: [],
        allPredictions: [],
        urgentPredictions: [],
        peakHour: null,
        totalRevenueLastMonth: 0,
    },
    lastFetched: 0,
};

export const useDashboardStore = create(
    persist(
        (set, get) => ({
            ...initialData,

            /** Returns true if cached data is still fresh (within TTL) */
            isCacheValid: () => {
                const { lastFetched } = get();
                if (!lastFetched) return false;
                return Date.now() - lastFetched < CACHE_TTL_MS;
            },

            /** Save all dashboard data to store and stamp the fetch time */
            setDashboardData: (data) => set({
                ...data,
                lastFetched: Date.now(),
            }),

            /** Force next loadDashboard() to re-fetch from Supabase */
            invalidateCache: () => set({ lastFetched: 0 }),

            /** Reset everything (called on logout) */
            clearCache: () => set({ ...initialData }),
        }),
        {
            name: 'warungku-dashboard-cache',
            storage: createJSONStorage(() => localStorage),
            // Only persist data fields, not functions
            partialize: (state) => ({
                stats: state.stats,
                topProducts: state.topProducts,
                lowStockProducts: state.lowStockProducts,
                recentTransactions: state.recentTransactions,
                weeklyData: state.weeklyData,
                weeklyProfitData: state.weeklyProfitData,
                weeklyExpenseData: state.weeklyExpenseData,
                categoryData: state.categoryData,
                expenseData: state.expenseData,
                aiInsights: state.aiInsights,
                lastFetched: state.lastFetched,
            }),
        }
    )
);
