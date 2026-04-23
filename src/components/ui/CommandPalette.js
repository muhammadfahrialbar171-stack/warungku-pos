'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Search, 
    LayoutDashboard, 
    ShoppingCart, 
    Package, 
    Boxes, 
    Receipt, 
    Wallet, 
    BarChart3, 
    Settings, 
    Clock, 
    Barcode, 
    BrainCog,
    Users,
    X,
    Command
} from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const MENU_ITEMS = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, category: 'Menu' },
    { href: '/cashier', label: 'Kasir', icon: ShoppingCart, category: 'Menu' },
    { href: '/products', label: 'Produk', icon: Package, category: 'Menu' },
    { href: '/stock', label: 'Stok', icon: Boxes, category: 'Menu' },
    { href: '/forecast', label: 'AI Forecast', icon: BrainCog, category: 'Menu' },
    { href: '/customers', label: 'Pelanggan', icon: Users, category: 'Menu' },
    { href: '/transactions', label: 'Transaksi', icon: Receipt, category: 'Menu' },
    { href: '/expenses', label: 'Pengeluaran', icon: Wallet, category: 'Menu' },
    { href: '/reports', label: 'Laporan', icon: BarChart3, category: 'Menu' },
    { href: '/shifts', label: 'Data Shift', icon: Clock, category: 'Menu' },
    { href: '/barcode', label: 'Barcode', icon: Barcode, category: 'Menu' },
    { href: '/settings', label: 'Pengaturan', icon: Settings, category: 'Menu' },
];

export default function CommandPalette() {
    const router = useRouter();
    const { commandPaletteOpen, setCommandPaletteOpen } = useUIStore();
    const { user } = useAuthStore();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);

    // Close on Escape
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setCommandPaletteOpen(!commandPaletteOpen);
            }
            if (e.key === 'Escape') {
                setCommandPaletteOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [commandPaletteOpen, setCommandPaletteOpen]);

    // Focus input and reset on open
    useEffect(() => {
        if (commandPaletteOpen) {
            setTimeout(() => {
                setQuery('');
                setSelectedIndex(0);
                inputRef.current?.focus();
            }, 50);
        }
    }, [commandPaletteOpen]);

    // Search Logic
    useEffect(() => {
        const search = async () => {
            if (!query.trim()) {
                setResults(MENU_ITEMS.slice(0, 6)); // Show initial menus
                return;
            }

            setLoading(true);
            
            // 1. Filter local menus
            const filteredMenus = MENU_ITEMS.filter(item => 
                item.label.toLowerCase().includes(query.toLowerCase())
            );

            // 2. Fetch products from Supabase
            let productResults = [];
            if (user) {
                const { data } = await supabase
                    .from('products')
                    .select('id, name, sku, price')
                    .or(`name.ilike.%${query}%,sku.ilike.%${query}%`)
                    .limit(5);
                
                if (data) {
                    productResults = data.map(p => ({
                        id: p.id,
                        label: p.name,
                        subLabel: `SKU: ${p.sku} • Rp ${p.price.toLocaleString()}`,
                        href: `/products?id=${p.id}`, // Custom link logic
                        icon: Package,
                        category: 'Produk'
                    }));
                }
            }

            setResults([...filteredMenus, ...productResults]);
            setSelectedIndex(0);
            setLoading(false);
        };

        const timer = setTimeout(search, 150);
        return () => clearTimeout(timer);
    }, [query, user]);

    const handleSelect = useCallback((item) => {
        if (!item) return;
        setCommandPaletteOpen(false);
        router.push(item.href);
    }, [router, setCommandPaletteOpen]);

    const onKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % results.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
        } else if (e.key === 'Enter') {
            handleSelect(results[selectedIndex]);
        }
    };

    if (!commandPaletteOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 sm:px-6">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-[#0b0f19]/60 backdrop-blur-md transition-opacity animate-in fade-in duration-300"
                onClick={() => setCommandPaletteOpen(false)}
            />

            {/* Palette Container */}
            <div className="relative w-full max-w-xl bg-[var(--surface-1)] border border-[var(--surface-border)] rounded-2xl shadow-2xl shadow-black/50 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Search Bar */}
                <div className="flex items-center gap-3 px-4 py-4 border-b border-[var(--surface-border)]">
                    <Search size={20} className="text-[var(--text-muted)]" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={onKeyDown}
                        placeholder="Cari menu, produk, atau stok..."
                        className="flex-1 bg-transparent text-[var(--text-primary)] text-base outline-none placeholder-[var(--text-muted)]"
                    />
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--surface-2)] border border-[var(--surface-border)] text-[10px] text-[var(--text-muted)] font-medium">
                        <span className="text-[12px]"><Command size={10} /></span> K
                    </div>
                </div>

                {/* Results List */}
                <div className="max-h-[60vh] overflow-y-auto py-2 custom-scrollbar">
                    {results.length > 0 ? (
                        <div className="space-y-1 px-2">
                            {results.map((item, index) => {
                                const isSelected = index === selectedIndex;
                                const isFirstInCategory = index === 0 || results[index - 1].category !== item.category;

                                return (
                                    <div key={index}>
                                        {isFirstInCategory && (
                                            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mt-1">
                                                {item.category}
                                            </div>
                                        )}
                                        <button
                                            onMouseEnter={() => setSelectedIndex(index)}
                                            onClick={() => handleSelect(item)}
                                            className={cn(
                                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left group",
                                                isSelected 
                                                    ? "bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20" 
                                                    : "text-[var(--text-primary)] hover:bg-[var(--surface-2)]"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                                                isSelected ? "bg-white/20" : "bg-[var(--surface-2)] text-[var(--text-muted)] group-hover:bg-[var(--surface-3)] group-hover:text-[var(--color-primary)]"
                                            )}>
                                                <item.icon size={16} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-[13px] font-semibold truncate leading-tight">
                                                    {item.label}
                                                </div>
                                                {item.subLabel && (
                                                    <div className={cn(
                                                        "text-[10px] mt-0.5 truncate",
                                                        isSelected ? "text-white/70" : "text-[var(--text-muted)]"
                                                    )}>
                                                        {item.subLabel}
                                                    </div>
                                                )}
                                            </div>
                                            {isSelected && (
                                                <div className="text-[10px] font-medium text-white/50 animate-fade-in pr-1">
                                                    Enter
                                                </div>
                                            )}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                            <div className="w-12 h-12 rounded-full bg-[var(--surface-2)] flex items-center justify-center mb-4">
                                <Search size={20} className="text-[var(--text-muted)]" />
                            </div>
                            <h3 className="text-sm font-bold text-[var(--text-primary)]">Tidak ada hasil ditemukan</h3>
                            <p className="text-[11px] text-[var(--text-muted)] mt-1">Cobalah mencari dengan kata kunci yang berbeda</p>
                        </div>
                    )}
                </div>

                {/* Footer Tips */}
                <div className="px-4 py-2 border-t border-[var(--surface-border)] bg-[var(--surface-2)]/50 flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1"><span className="px-1 rounded bg-[var(--surface-3)] px-1">↑↓</span> Navigasi</span>
                        <span className="flex items-center gap-1"><span className="px-1 rounded bg-[var(--surface-3)] px-1">Enter</span> Pilih</span>
                        <span className="flex items-center gap-1"><span className="px-1 rounded bg-[var(--surface-3)] px-1">Esc</span> Tutup</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
