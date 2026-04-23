'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Modal({ isOpen, onClose, title, children, footer, size = 'md', className = '', bodyClassName = '', headerClassName = '' }) {

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // Use animation frame to avoid synchronous state update in effect body
        const frame = requestAnimationFrame(() => setMounted(true));
        return () => {
            cancelAnimationFrame(frame);
            setMounted(false);
        };
    }, []);

    useEffect(() => {
        if (!mounted) return;
        
        let scrollbarWidth = 0;
        
        if (isOpen) {
            scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
            document.body.style.overflow = 'hidden';
            if (scrollbarWidth > 0) {
                document.body.style.paddingRight = `${scrollbarWidth}px`;
            }
        } else {
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        }
        
        return () => { 
            document.body.style.overflow = ''; 
            document.body.style.paddingRight = '';
        };
    }, [isOpen, mounted]);

    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!mounted || !isOpen) return null;

    const sizeClasses = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
        full: 'max-w-[95vw]',
    };

    const modalContent = (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            aria-labelledby="modal-title"
            role="dialog"
            aria-modal="true"
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-md animate-fade-in"
                aria-hidden="true"
                onClick={onClose}
            />

            {/* Modal panel */}
            <div
                className={cn(
                    'relative z-10 flex flex-col w-full rounded-2xl',
                    'bg-[var(--surface-1)]/90 backdrop-blur-xl border border-white/5 shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)]',
                    'text-left animate-scale-in max-h-[calc(100dvh-2rem)] sm:max-h-[85vh]',
                    sizeClasses[size],
                    className
                )}
            >
                {/* Header */}
                <div className={cn("flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-[var(--surface-border)]", headerClassName)}>
                    <div>
                        {title && <h2 className="text-[15px] font-bold text-[var(--text-primary)]" id="modal-title">{title}</h2>}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer active:scale-90"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className={cn("flex-1 min-h-0 overflow-y-auto p-6 custom-scrollbar", bodyClassName)}>
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="flex-shrink-0 px-6 py-4 border-t border-[var(--surface-border)] bg-[var(--surface-0)] flex items-center justify-end gap-3 rounded-b-xl">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
