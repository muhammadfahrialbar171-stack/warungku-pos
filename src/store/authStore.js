'use client';
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useDashboardStore } from '@/store/dashboardStore';

export const useAuthStore = create((set) => ({
    user: null,
    session: null,
    loading: true,
    initialized: false,

    updateUser: (userData) => set((state) => ({ user: { ...state.user, ...userData } })),

    initialize: async () => {
        const { initialized } = useAuthStore.getState();
        if (initialized) return;

        // Safety timeout: 25 seconds to prevent permanent hang in poor network conditions
        const safetyTimeout = setTimeout(() => {
            console.warn('⚠️ [Auth] Initialization timed out (25s). Forcing resolution.');
            set({ loading: false, initialized: true });
        }, 25000);

        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError) {
                console.error('❌ [Auth] Session error:', sessionError.message);
                set({ user: null, session: null, loading: false, initialized: true });
                return;
            }

            if (session) {
                const { data: profile, error: profileError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                if (profileError) {
                    console.warn('⚠️ [Auth] Profile fetch error (using basic data):', profileError.message);
                    const basicProfile = {
                        id: session.user.id,
                        email: session.user.email,
                        full_name: session.user.user_metadata?.full_name || '',
                        store_name: '',
                    };
                    set({ user: basicProfile, session, loading: false, initialized: true });
                } else {
                    set({ user: profile, session, loading: false, initialized: true });
                }
            } else {
                set({ user: null, session: null, loading: false, initialized: true });
            }
        } catch (err) {
            console.error('❌ [Auth] Unexpected initialization error:', err);
            set({ user: null, session: null, loading: false, initialized: true });
        } finally {
            clearTimeout(safetyTimeout);
        }
    },

    login: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // Fetch profile - if this fails due to RLS, login still works but with basic data
        let profile = null;
        try {
            const { data: profileData, error: profileError } = await supabase
                .from('users')
                .select('*')
                .eq('id', data.user.id)
                .single();
            
            if (profileError) {
                console.warn('Profile fetch failed (RLS issue?):', profileError.message);
                // Fallback: use basic auth data so login doesn't break
                profile = {
                    id: data.user.id,
                    email: data.user.email,
                    full_name: data.user.user_metadata?.full_name || '',
                    store_name: '',
                };
            } else {
                profile = profileData;
            }
        } catch (fetchErr) {
            console.warn('Profile fetch error:', fetchErr);
            profile = {
                id: data.user.id,
                email: data.user.email,
                full_name: '',
                store_name: '',
            };
        }

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
        // Clear dashboard cache so next user doesn't see stale data
        useDashboardStore.getState().clearCache();
        set({ user: null, session: null });
    },

    /**
     * Send a password reset email. Supabase will redirect the user
     * to the redirectTo URL with an auth code.
     */
    resetPassword: async (email) => {
        const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`;
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
        if (error) throw error;
    },

    /**
     * Update the currently authenticated user's password.
     * Must be called from inside an active reset-password session.
     */
    updatePassword: async (newPassword) => {
        const { data, error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        return data;
    },
}));
