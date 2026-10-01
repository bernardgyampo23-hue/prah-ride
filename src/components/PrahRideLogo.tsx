import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
}

export const PrahRideLogo: React.FC<LogoProps> = ({ 
  className = '', 
  size = 'md',
  showTagline = true 
}) => {
  const sizeMap = {
    sm: { box: 'w-9 h-9 sm:w-10 sm:h-10', text: 'text-xs sm:text-sm', tag: 'text-[8px] sm:text-[9px]' },
    md: { box: 'w-11 h-11 sm:w-14 sm:h-14 md:w-16 md:h-16', text: 'text-sm sm:text-base md:text-lg', tag: 'text-[9px] sm:text-[10px] md:text-[11px]' },
    lg: { box: 'w-20 h-20 sm:w-24 sm:h-24', text: 'text-xl sm:text-2xl', tag: 'text-xs' },
    xl: { box: 'w-28 h-28 sm:w-36 sm:h-36', text: 'text-2xl sm:text-3xl', tag: 'text-sm' },
  };

  return (
    <div className={`flex items-center gap-2 sm:gap-3 select-none ${className}`}>
      {/* Precision Vector Emblem matching exactly the uploaded badge */}
      <div className={`relative ${sizeMap[size].box} shrink-0 rounded-full bg-[#1A1D48] border-2 border-[#EEC367] flex items-center justify-center p-1 sm:p-1.5 shadow-lg shadow-black/40 overflow-hidden`}>
        {/* Subtle circular ring */}
        <div className="absolute inset-0.5 rounded-full border border-[#EEC367]/40 pointer-events-none" />
        
        <svg viewBox="0 0 100 100" className="w-full h-full text-[#EEC367] overflow-visible">
          {/* Crown of Roads above the letter P */}
          <g transform="translate(18, 12) scale(0.65)">
            {/* Center Road pointing up */}
            <path 
              d="M35,32 L49,2 L51,2 L65,32 Z" 
              fill="#EEC367" 
            />
            {/* Left curved road arch */}
            <path 
              d="M10,25 C25,25 35,28 42,33 L32,33 C26,29 18,29 10,29 Z" 
              fill="#EEC367" 
            />
            <path 
              d="M0,18 C15,16 28,22 36,33 L45,33 C34,20 18,13 0,18 Z" 
              fill="#EEC367" 
            />
            {/* Right curved road arch */}
            <path 
              d="M100,18 C82,16 66,20 55,33 L64,33 C72,22 85,16 100,18 Z" 
              fill="#EEC367" 
            />
            {/* Road divider dashed marks */}
            <line x1="50" y1="6" x2="50" y2="12" stroke="#1A1D48" strokeWidth="2" strokeLinecap="round" />
            <line x1="50" y1="16" x2="50" y2="22" stroke="#1A1D48" strokeWidth="2" strokeLinecap="round" />
            <line x1="50" y1="26" x2="50" y2="31" stroke="#1A1D48" strokeWidth="2" strokeLinecap="round" />
            <line x1="22" y1="23" x2="28" y2="27" stroke="#1A1D48" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="78" y1="23" x2="72" y2="27" stroke="#1A1D48" strokeWidth="1.5" strokeLinecap="round" />
          </g>

          {/* Bold Serif 'P' Monogram */}
          <path 
            d="M32,32 L56,32 C68,32 75,37 75,47 C75,56 68,61 56,61 L42,61 L42,75 L49,75 L49,78 L25,78 L25,75 L32,75 Z M42,39 L42,54 L55,54 C62,54 66,51 66,47 C66,42 62,39 55,39 Z" 
            fill="#EEC367" 
          />

          {/* Modern Sports Car Silhouette overlaying the base of P */}
          <path 
            d="M15,58 C26,52 38,48 55,48 C72,48 83,55 92,62 C94,63 94,65 92,66 L78,66 C77,61 71,57 65,57 C59,57 53,61 52,66 L28,66 C27,61 21,57 15,57 C12,57 10,58 8,60 Z" 
            fill="none" 
            stroke="#EEC367" 
            strokeWidth="3.2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
          {/* Wheel rims */}
          <circle cx="65" cy="65" r="7" stroke="#EEC367" strokeWidth="2" fill="#1A1D48" />
          <circle cx="65" cy="65" r="2.5" fill="#EEC367" />
          {/* Aerodynamic roofline sweep */}
          <path 
            d="M26,55 C36,46 54,44 72,52" 
            fill="none" 
            stroke="#EEC367" 
            strokeWidth="2.2" 
            strokeLinecap="round" 
          />
          {/* Headlamp beam glow streak */}
          <path 
            d="M87,60 L94,62" 
            stroke="#EEC367" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
          />
        </svg>
      </div>

      {/* Typography Brand Lockup */}
      <div className="flex flex-col min-w-0">
        <span 
          style={{ fontFamily: "'Cinzel', serif" }} 
          className={`font-bold tracking-[0.16em] sm:tracking-[0.22em] text-white leading-none whitespace-nowrap ${sizeMap[size].text}`}
        >
          PRAH RIDE
        </span>
        {showTagline && (
          <span 
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} 
            className={`text-[#EEC367] tracking-wider font-medium mt-1 leading-none hidden sm:block whitespace-nowrap ${sizeMap[size].tag}`}
          >
            Your Ride. Your Time. Your Prah.
          </span>
        )}
      </div>
    </div>
  );
};

export default PrahRideLogo;
