'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

export default function AuthInitializer({ children }) {
    const initialize = useAuthStore(state => state.initialize);

    useEffect(() => {
        // Initialize auth state
        initialize();

        // Handle chunk load errors
        const handleGlobalError = (event) => {
            const errorMsg = event.message || '';
            const isChunkError = errorMsg.includes('Loading chunk') || 
                                errorMsg.includes('ChunkLoadError') ||
                                (event.error && event.error.name === 'ChunkLoadError');
            
            if (isChunkError) {
                console.error('🚀 [Infrastructure] Chunk Load Error. Reloading...');
                window.location.reload(true);
            }
        };

        window.addEventListener('error', handleGlobalError, true);

        return () => {
            window.removeEventListener('error', handleGlobalError, true);
        };
    }, [initialize]);

    return children;
}
