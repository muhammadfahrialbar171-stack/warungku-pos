'use client';

import React from 'react';

export default function FullPageLoader() {
  return (
    <div className="w-full h-full min-h-[50vh] flex flex-col items-center justify-center bg-transparent">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-4 border-[var(--surface-border)]"></div>
        <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
      </div>
    </div>
  );
}
