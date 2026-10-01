"use client";

import React, { useState } from 'react';
import { InstallButton } from '../src/components/InstallButton';

export default function Page() {
  const [view, setView] = useState<'landing' | 'login'>('landing');

  return (
    <div className="min-h-screen bg-[#0A1931] text-white">
      <header className="sticky top-0 z-50 w-full bg-[#0A1931] border-b border-white/10">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 flex items-center justify-between overflow-hidden">

          {/* LEFT - Logo */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 cursor-pointer">
            <img src="/icon-192.png" alt="Prah Ride Logo" className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex-shrink-0" />
            <span className="text-white text-sm sm:text-base font-black tracking-widest whitespace-nowrap flex-shrink-0">
              PRAH RIDE
            </span>
          </div>

          {/* RIGHT - Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Install button */}
            <InstallButton variant="header" className="flex-shrink-0" />

            {/* Log in / Sign up button STACKED VERSION */}
            <button 
              type="button"
              onClick={() => setView('login')}
              className="bg-[#E9C46A] hover:bg-[#D4B15F] active:scale-95 text-black font-bold px-3 sm:px-5 py-1.5 rounded-xl flex flex-col items-center leading-none whitespace-nowrap flex-shrink-0 cursor-pointer touch-manipulation transition-all shadow-md"
            >
              <span>Log in</span>
              <span>/ Sign up</span>
            </button>
          </div>

        </div>
      </header>
    </div>
  );
}
