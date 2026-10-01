"use client";

import React, { useState, useEffect } from 'react';
import { Download, Share2, PlusSquare, Monitor, Smartphone, Check } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface InstallButtonProps {
  variant?: 'header' | 'hero' | 'default';
  className?: string;
}

export const InstallButton: React.FC<InstallButtonProps> = ({ variant = 'default', className = '' }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // 1. Detect if app is already running in standalone PWA mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    // 2. Detect device OS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroidDevice = /android/.test(userAgent);
    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);
    setIsDesktop(!isIOSDevice && !isAndroidDevice);

    // 3. Capture beforeinstallprompt event (Chromium, Android, Desktop Edge/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowModal(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // If already installed and running standalone, do not show install prompt
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
          setDeferredPrompt(null);
          setShowModal(false);
          return;
        }
      } catch (err) {
        console.warn('Install prompt error:', err);
      }
    }
    // If deferredPrompt is unavailable or rejected, show device-specific installation guide
    setShowModal(true);
  };

  const isHeader = variant === 'header';

  return (
    <>
      <div className={`flex flex-col items-center justify-center text-center ${isHeader ? '' : 'my-2'} ${className}`}>
        <button
          type="button"
          onClick={handleInstallClick}
          className={
            isHeader
              ? "bg-[#E9C46A] hover:bg-[#D4B15F] active:scale-95 text-black text-xs sm:text-sm font-bold px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 rounded-full whitespace-nowrap flex-shrink-0 flex items-center gap-1.5 transition-all shadow-md cursor-pointer touch-manipulation min-h-[36px]"
              : "bg-gradient-to-r from-[#EEC367] via-[#ffd97d] to-[#EEC367] hover:brightness-105 active:scale-95 text-[#0A1931] px-6 sm:px-7 py-3 sm:py-3.5 rounded-full font-bold text-xs sm:text-sm tracking-wide shadow-xl shadow-[#EEC367]/25 transition-all flex items-center justify-center gap-2.5 cursor-pointer touch-manipulation"
          }
          aria-label="Install Prah Ride App"
        >
          {isHeader && (
            <img
              src="/icon-192.png"
              alt="Prah Ride"
              className="w-3.5 h-3.5 rounded-full object-cover shrink-0"
            />
          )}
          {!isHeader && (
            <img
              src="/icon-192.png"
              alt="Prah Ride Logo"
              className="w-5 h-5 rounded-full object-cover ring-1 ring-[#0A1931]/30 shrink-0"
            />
          )}
          {isHeader ? (
            <>
              <span className="hidden md:inline">Install Prah Ride App</span>
              <span className="md:hidden">Install ↓</span>
            </>
          ) : (
            <>
              <span>Install Prah Ride App</span>
              <Download className="w-4 h-4 text-[#0A1931] shrink-0" />
            </>
          )}
        </button>

        {!isHeader && isIOS && (
          <span className="text-[11px] sm:text-xs text-[#EEC367] font-semibold mt-1.5 flex items-center justify-center gap-1">
            <span>iPhone / iPad: Tap Share &gt; Add to Home Screen</span>
          </span>
        )}
      </div>

      {/* Universal Installation Guide Modal for iOS, Android, Tablets & Desktops */}
      {showModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 text-center"
          onClick={() => setShowModal(false)}
        >
          <div 
            className="bg-[#0A1931] border-2 border-[#EEC367] rounded-3xl p-6 sm:p-7 max-w-sm sm:max-w-md w-full space-y-4 shadow-2xl text-white text-left relative animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-gray-800 pb-3">
              <div className="w-12 h-12 rounded-2xl bg-[#EEC367]/15 border border-[#EEC367] flex items-center justify-center p-1.5 shrink-0">
                <img src="/icon-192.png" alt="Prah Ride Logo" className="w-9 h-9 rounded-xl object-contain" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white leading-tight">Install Prah Ride</h3>
                <p className="text-xs text-[#EEC367] font-medium">Faster booking, full-screen native experience</p>
              </div>
            </div>

            {/* iOS Instructions */}
            {isIOS && (
              <div className="space-y-3 py-1">
                <p className="text-xs text-gray-300 font-medium">Follow these 3 quick steps on your iPhone or iPad Safari:</p>
                <div className="space-y-2.5 text-xs text-gray-200">
                  <div className="flex items-start gap-2.5 bg-[#14163b] p-3 rounded-xl border border-gray-800">
                    <div className="w-6 h-6 rounded-full bg-[#EEC367]/20 text-[#EEC367] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      1
                    </div>
                    <div>
                      Tap the <strong className="text-[#EEC367]">Share button</strong> <Share2 className="w-3.5 h-3.5 inline mx-1 text-[#EEC367]" /> at the bottom or top of your Safari browser bar.
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 bg-[#14163b] p-3 rounded-xl border border-gray-800">
                    <div className="w-6 h-6 rounded-full bg-[#EEC367]/20 text-[#EEC367] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      2
                    </div>
                    <div>
                      Scroll down the share sheet and tap <strong className="text-[#EEC367]">Add to Home Screen</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-[#EEC367]" />.
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 bg-[#14163b] p-3 rounded-xl border border-gray-800">
                    <div className="w-6 h-6 rounded-full bg-[#EEC367]/20 text-[#EEC367] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      3
                    </div>
                    <div>
                      Tap <strong className="text-[#EEC367]">Add</strong> in the top-right corner. Prah Ride will appear right on your home screen!
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Android Instructions */}
            {isAndroid && !isIOS && (
              <div className="space-y-3 py-1">
                <p className="text-xs text-gray-300 font-medium">To install Prah Ride on your Android device:</p>
                <div className="space-y-2.5 text-xs text-gray-200">
                  {deferredPrompt && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (deferredPrompt) {
                          await deferredPrompt.prompt();
                          const choice = await deferredPrompt.userChoice;
                          if (choice.outcome === 'accepted') {
                            setIsInstalled(true);
                            setShowModal(false);
                          }
                        }
                      }}
                      className="w-full py-3 bg-[#EEC367] hover:bg-[#ffe199] text-[#0A1931] font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 mb-2 cursor-pointer shadow-lg"
                    >
                      <Download className="w-4 h-4" />
                      <span>Tap to Install Instantly</span>
                    </button>
                  )}
                  <div className="flex items-start gap-2.5 bg-[#14163b] p-3 rounded-xl border border-gray-800">
                    <Smartphone className="w-4 h-4 text-[#EEC367] shrink-0 mt-0.5" />
                    <div>
                      Tap the <strong className="text-[#EEC367]">three dots menu (⋮)</strong> in Chrome at the top right, then select <strong className="text-[#EEC367]">Install app</strong> or <strong className="text-[#EEC367]">Add to Home screen</strong>.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Desktop / Tablet / Other Browsers */}
            {isDesktop && (
              <div className="space-y-3 py-1">
                <p className="text-xs text-gray-300 font-medium">To install on your Desktop, Laptop or Tablet:</p>
                <div className="space-y-2.5 text-xs text-gray-200">
                  {deferredPrompt && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (deferredPrompt) {
                          await deferredPrompt.prompt();
                          const choice = await deferredPrompt.userChoice;
                          if (choice.outcome === 'accepted') {
                            setIsInstalled(true);
                            setShowModal(false);
                          }
                        }
                      }}
                      className="w-full py-3 bg-[#EEC367] hover:bg-[#ffe199] text-[#0A1931] font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 mb-2 cursor-pointer shadow-lg"
                    >
                      <Download className="w-4 h-4" />
                      <span>One-Click Desktop Install</span>
                    </button>
                  )}
                  <div className="flex items-start gap-2.5 bg-[#14163b] p-3 rounded-xl border border-gray-800">
                    <Monitor className="w-4 h-4 text-[#EEC367] shrink-0 mt-0.5" />
                    <div>
                      Look at the right side of your address bar and click the <strong className="text-[#EEC367]">Install icon (⊕ or computer monitor)</strong>.
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 bg-[#14163b] p-3 rounded-xl border border-gray-800">
                    <div className="w-5 h-5 rounded-full bg-[#EEC367]/20 text-[#EEC367] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      ⋮
                    </div>
                    <div>
                      Or click your browser menu <strong className="text-[#EEC367]">(⋮)</strong> &gt; <strong className="text-[#EEC367]">Save and Share</strong> &gt; <strong className="text-[#EEC367]">Install Prah Ride</strong>.
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="w-full py-2.5 bg-[#14163b] hover:bg-[#1f2357] text-[#EEC367] border border-[#EEC367]/50 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default InstallButton;
