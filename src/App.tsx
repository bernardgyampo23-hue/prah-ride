import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { LandingPage } from './components/LandingPage';
import { AuthModal } from './components/AuthModal';
import { PassengerDashboard } from './components/PassengerDashboard';
import { DriverDashboard } from './components/DriverDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { AboutContact } from './components/AboutContact';
import { UserRole } from './types';
import { Car, Lock } from 'lucide-react';

function MainApp() {
  const { profile, loading } = useAuth();
  const [currentView, setCurrentView] = useState<
    'landing' | 'login' | 'register_passenger' | 'register_driver' | 'about' | 'driver_direct'
  >('landing');

  // Clear legacy demo storage on first boot (production - no demo persistence)
  useEffect(() => {
    const demoPurged = localStorage.getItem('prahride_production_boot_purged');
    if (!demoPurged) {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('prahride_production_boot_purged', 'true');
    }
  }, []);

  // Check URL on load and on popstate for /driver route
  useEffect(() => {
    const checkDriverPath = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (path === '/driver' || hash === '#driver' || hash === '#/driver') {
        setCurrentView('driver_direct');
      }
    };
    checkDriverPath();
    window.addEventListener('popstate', checkDriverPath);
    return () => window.removeEventListener('popstate', checkDriverPath);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1A1D48] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-3 border-[#EEC367] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold tracking-widest text-[#EEC367] uppercase">
            Loading Prah Ride...
          </span>
        </div>
      </div>
    );
  }

  // Handle direct /driver route
  if (currentView === 'driver_direct') {
    if (profile?.role === 'driver') {
      return <DriverDashboard />;
    }

    return (
      <div className="min-h-screen bg-[#0A0B10] text-white flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#111320] border-2 border-[#EEC367]/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#EEC367]/15 border border-[#EEC367] flex items-center justify-center mx-auto text-[#EEC367]">
            <Car className="w-8 h-8" />
          </div>

          <div>
            <span className="text-[10px] font-mono tracking-widest uppercase px-3 py-1 rounded-full bg-[#EEC367]/20 text-[#EEC367] border border-[#EEC367]/30 font-bold">
              Sekondi-Takoradi Driver Portal
            </span>
            <h2 style={{ fontFamily: "'Cinzel', serif" }} className="text-2xl font-bold text-white mt-3">
              Driver Station (/driver)
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Live dispatch & ride requests around St. Benedict Hospital and Twin City.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              onClick={() => setCurrentView('login')}
              className="w-full py-3.5 bg-[#EEC367] hover:bg-[#ffe199] text-[#1A1D48] font-black rounded-2xl text-sm transition shadow-xl flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>Sign In to Driver Station</span>
            </button>
            <button
              onClick={() => setCurrentView('register_driver')}
              className="w-full py-3 bg-[#1A1D48] hover:bg-[#232763] text-gray-200 border border-gray-700 font-bold rounded-2xl text-xs transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Car className="w-4 h-4 text-[#EEC367]" />
              <span>Apply as New Driver Partner</span>
            </button>
          </div>

          <div className="pt-2 border-t border-gray-800 flex items-center justify-between text-xs text-gray-400">
            <button
              onClick={() => {
                window.history.pushState({}, '', '/');
                setCurrentView('landing');
              }}
              className="hover:text-[#EEC367] transition"
            >
              ← Customer Home
            </button>
            <span className="text-[11px] text-gray-500">St. Benedict Hospital Hub</span>
          </div>
        </div>
      </div>
    );
  }

  // 1. Authenticated Routing Based on Role (Role-based access control per brief)
  if (profile) {
    if (profile.role === 'admin') {
      return <AdminDashboard />;
    }
    if (profile.role === 'driver') {
      return <DriverDashboard />;
    }
    // Passenger role
    return <PassengerDashboard />;
  }

  // 2. Public / Marketing & Auth Routing
  if (currentView === 'login' || currentView === 'register_passenger' || currentView === 'register_driver') {
    return (
      <AuthModal
        initialMode={currentView}
        onBack={() => setCurrentView('landing')}
        onSuccess={() => {
          // Handled automatically via AuthContext profile update
        }}
      />
    );
  }

  if (currentView === 'about') {
    return <AboutContact onBack={() => setCurrentView('landing')} />;
  }

  // Landing Page Default
  return (
    <LandingPage
      onNavigate={(view) => setCurrentView(view)}
      onQuickBookClick={() => {
        // Quick booking leads directly to passenger sign up or login
        setCurrentView('register_passenger');
      }}
    />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
