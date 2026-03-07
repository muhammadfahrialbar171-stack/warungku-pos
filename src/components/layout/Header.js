'use client';

import { useAuthStore } from '@/store/authStore';
import { getGreeting } from '@/lib/utils';
import { Bell, Search } from 'lucide-react';

export default function Header() {
    const { user } = useAuthStore();

    return (
        <header className="sticky top-0 z-30 glass border-b border-slate-800 px-4 md:px-6 py-3">
            <div className="flex items-center justify-between">
                {/* Greeting */}
                <div>
                    <h2 className="text-lg font-semibold text-white">
                        {getGreeting()} 👋
                    </h2>
                    <p className="text-sm text-slate-400">
                        {user?.store_name || 'Toko Saya'}
                    </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <button className="p-2.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer relative">
                        <Bell size={20} />
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full" />
                    </button>
                    <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-xl border border-slate-700">
                        <Search size={16} className="text-slate-500" />
                        <input
                            type="text"
                            placeholder="Cari..."
                            className="bg-transparent text-sm text-white placeholder-slate-500 outline-none w-40"
                        />
                    </div>
                </div>
            </div>
        </header>
    );
}
