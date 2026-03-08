'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Modal({ isOpen, onClose, title, children, size = 'md', className }) {
    const overlayRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const sizeClasses = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
        full: 'max-w-[95vw]',
    };

    return (
        <div
            ref={overlayRef}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-fade-in" />

            {/* Modal Content */}
            <div
                className={cn(
                    'relative w-full bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl shadow-black/50 overflow-hidden animate-scale-in',
                    sizeClasses[size],
                    className
                )}
            >
                {/* Decorative top lighting */}
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                {/* Header */}
                {title && (
                    <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-slate-800/30">
                        <h2 className="text-xl font-bold text-white drop-shadow-sm">{title}</h2>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                        >
                            <X size={20} />
                        </button>
                    </div>
                )}

                {/* Body */}
                <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {children}
                </div>
            </div>
        </div>
    );
}
