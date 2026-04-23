'use client';

import React, { useEffect, useState } from 'react';

export default function SplashScreen() {
  const [stage, setStage] = useState('loading'); // 'loading', 'fading', 'hidden'

  useEffect(() => {
    // Prevent scrolling when loading
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }

    // Keep splash screen minimum 1.5 seconds so user can see it
    const timer1 = setTimeout(() => {
      setStage('fading');
      // Then fade out for 800ms
      const timer2 = setTimeout(() => {
        setStage('hidden');
        if (typeof document !== 'undefined') {
          document.body.style.overflow = '';
        }
      }, 800);
      return () => clearTimeout(timer2);
    }, 1500);

    return () => {
      clearTimeout(timer1);
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
    };
  }, []);

  if (stage === 'hidden') return null;

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0b0f19] transition-opacity duration-700 pointer-events-none 
        ${stage === 'fading' ? 'opacity-0' : 'opacity-100'} animate-fade-in`}
    >
      <div className="relative">
        {/* Glow effect */}
        <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-2xl animate-pulse scale-[1.8]"></div>
        
        {/* Main box with premium float */}
        <div className="relative w-24 h-24 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/40 animate-float">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="48" 
            height="48" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="white" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="m7.5 4.27 9 5.15" />
            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
            <path d="m3.3 7 8.7 5 8.7-5" />
            <path d="M12 22V12" />
          </svg>
        </div>
      </div>
      
      <div className="mt-8 text-center animate-fade-in [animation-delay:400ms]">
        <h1 className="text-2xl font-black text-white tracking-widest uppercase italic">WarungKu</h1>
        <div className="mt-2 flex items-center justify-center gap-1.5 opacity-60">
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
        </div>
        <p className="mt-4 text-blue-400/60 text-[10px] font-bold uppercase tracking-[0.3em]">Premium Smarter POS</p>
      </div>
    </div>
  );
}
