'use client';
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export const useAuthStore = create((set) => ({
    user: null,
    session: null,
    loading: true,

    initialize: async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const { data: profile } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                set({ user: profile, session, loading: false });
            } else {
                set({ user: null, session: null, loading: false });
            }
        } catch {
            set({ user: null, session: null, loading: false });
        }
    },

    login: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single();

        set({ user: profile, session: data.session });
        return data;
    },

    register: async (email, password, fullName, storeName) => {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        const { error: profileError } = await supabase.from('users').upsert({
            id: data.user.id,
            email,
            full_name: fullName,
            store_name: storeName,
        }, { onConflict: 'id' });

        if (profileError) throw profileError;

        const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single();

        set({ user: profile, session: data.session });
        return data;
    },

    logout: async () => {
        await supabase.auth.signOut();
        set({ user: null, session: null });
    },
}));
