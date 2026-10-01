"use client";

import React, { useState } from 'react';
import { PrahRideLogo } from './PrahRideLogo';
import { InstallButton } from './InstallButton';
import { 
  ShieldCheck, 
  Clock, 
  MapPin, 
  Car, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Phone, 
  Mail, 
  ChevronRight,
  Plane,
  Coins,
  FileCheck,
  MessageCircle,
  X,
  FileText,
  ShieldAlert,
  User
} from 'lucide-react';
import { checkOperatingHours } from '../lib/constants';

interface LandingPageProps {
  onNavigate: (view: 'landing' | 'login' | 'register_passenger' | 'register_driver' | 'about') => void;
  onQuickBookClick: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, onQuickBookClick }) => {
  const operatingStatus = checkOperatingHours();
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [policyModal, setPolicyModal] = useState<'privacy' | 'terms' | 'safety' | null>(null);

  return (
    <div className="min-h-screen bg-[#1A1D48] text-white flex flex-col font-sans selection:bg-[#EEC367] selection:text-[#1A1D48]">
      {/* 1. Header / Navbar */}
      <header className="sticky top-0 z-50 w-full bg-[#0A1931] border-b border-white/10">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 flex items-center justify-between overflow-hidden">

          {/* LEFT - Logo */}
          <div 
            className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 cursor-pointer" 
            onClick={() => onNavigate('landing')}
          >
            <img src="/icon-192.png" alt="Prah Ride Logo" className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex-shrink-0" />
            <span className="text-white text-sm sm:text-base font-black tracking-widest whitespace-nowrap flex-shrink-0">
              PRAH RIDE
            </span>
          </div>

          {/* RIGHT - Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-gray-200 mr-2">
              <a href="#services" className="hover:text-[#EEC367] transition">Fares</a>
              <a href="#why-choose-us" className="hover:text-[#EEC367] transition">Why Prah Ride</a>
              <a href="#how-it-works" className="hover:text-[#EEC367] transition">How It Works</a>
              <a href="#testimonials" className="hover:text-[#EEC367] transition">Reviews</a>
              <button type="button" onClick={() => onNavigate('about')} className="hover:text-[#EEC367] transition cursor-pointer">Contact & About</button>
            </nav>

            {/* Install button */}
            <InstallButton variant="header" className="flex-shrink-0" />

            {/* Log in / Sign up button STACKED VERSION */}
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="bg-[#E9C46A] hover:bg-[#D4B15F] active:scale-95 text-black font-bold px-3 sm:px-5 py-1.5 rounded-xl flex flex-col items-center leading-none whitespace-nowrap flex-shrink-0 cursor-pointer touch-manipulation transition-all shadow-md"
            >
              <span>Log in</span>
              <span>/ Sign up</span>
            </button>
          </div>

        </div>
      </header>

      {/* Operating Hours Alert Banner */}
      <div className="w-full bg-[#111333] border-b border-[#EEC367]/20 py-2.5 px-4 text-center text-xs sm:text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center gap-2 sm:gap-3 flex-wrap leading-normal">
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${operatingStatus.isOpen ? 'bg-[#2ECC71] animate-pulse shadow-sm shadow-[#2ECC71]' : 'bg-red-400'}`} />
          <span className="text-gray-200">
            <strong className="text-white">Operating Hours:</strong> Mon–Sat, 7:00 AM–10:00 PM GMT · Closed Sundays
          </span>
          <span className="text-[#EEC367] font-semibold hidden md:inline">|</span>
          <span className="text-gray-300">
            Exclusively serving Sekondi-Takoradi (Western Region)
          </span>
          {!operatingStatus.isOpen ? (
            <span className="inline-block bg-red-950/80 text-red-300 border border-red-500/40 px-2 py-0.5 rounded text-[11px] font-semibold shrink-0">
              Currently Closed
            </span>
          ) : (
            <span className="inline-block bg-[#2ECC71]/15 text-[#2ECC71] border border-[#2ECC71]/40 px-2 py-0.5 rounded text-[11px] font-semibold shrink-0">
              Open Now
            </span>
          )}
        </div>
      </div>

      {/* 2. Hero Section */}
      <section className="relative pt-10 pb-20 md:py-20 lg:py-24 overflow-hidden">
        {/* Subtle geometric luxury accents */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#EEC367]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-80 h-80 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            <div className="md:col-span-1 lg:col-span-7 space-y-6 text-center md:text-left">
              <div className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-[#111333] border border-[#EEC367]/40 text-[#EEC367] text-xs font-semibold uppercase tracking-wider shadow-sm">
                SEKONDI-TAKORADI'S PREMIER RIDE EXPERIENCE
              </div>

              {/* In-App PWA Install Button - responsive centered */}
              <div className="flex justify-center md:justify-start">
                <InstallButton variant="hero" />
              </div>

              <h1 
                style={{ fontFamily: "'Cinzel', serif" }}
                className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-white leading-tight text-center md:text-left"
              >
                YOUR RIDE. YOUR TIME. <br className="hidden sm:inline" />
                <span className="text-[#EEC367]">YOUR PRAH.</span>
              </h1>

              <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto md:mx-0 leading-relaxed font-normal">
                Dependable, fixed-price ride-hailing designed exclusively for the Twin City. No haggling with drivers, no surprise surge pricing, and no fare guesswork. Book in seconds and pay your driver directly via Cash or personal MoMo.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4 pt-4">
                <button
                  type="button"
                  onClick={onQuickBookClick}
                  className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#EEC367] hover:bg-[#ffe199] text-[#1A1D48] text-base font-bold transition shadow-xl shadow-[#EEC367]/20 flex items-center justify-center gap-2 group cursor-pointer touch-manipulation active:scale-95"
                >
                  <span>Book a Ride</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('register_driver')}
                  className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#111333] hover:bg-[#151945] text-white text-base font-semibold border border-[#EEC367]/40 hover:border-[#EEC367] transition flex items-center justify-center gap-2 cursor-pointer touch-manipulation active:scale-95"
                >
                  <Car className="w-5 h-5 text-[#EEC367]" />
                  <span>Become a Driver</span>
                </button>
              </div>

              {/* Direct Log In / Sign Up quick-bar on the home page */}
              <div className="pt-1 flex items-center justify-center md:justify-start gap-2 text-xs sm:text-sm text-gray-300 flex-wrap">
                <span className="text-gray-400">Rider or Driver?</span>
                <button
                  type="button"
                  onClick={() => onNavigate('login')}
                  className="px-3.5 py-1.5 rounded-xl bg-[#14163b] border border-[#EEC367]/40 text-[#EEC367] hover:border-[#EEC367] font-bold text-xs sm:text-sm cursor-pointer flex items-center gap-1.5 active:scale-95 transition-all shadow-sm"
                >
                  <User className="w-3.5 h-3.5 text-[#EEC367]" />
                  <span>Log in / Sign up</span>
                  <span>→</span>
                </button>
              </div>

              {/* Trust Badges */}
              <div className="pt-6 border-t border-gray-800 grid grid-cols-3 gap-4 text-left">
                <div>
                  <div className="text-xl font-bold text-[#EEC367]">100% Fixed</div>
                  <div className="text-xs text-gray-400">Zero surge multipliers</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-[#EEC367]">Direct Pay</div>
                  <div className="text-xs text-gray-400">Cash or Driver MoMo</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-[#EEC367]">Local</div>
                  <div className="text-xs text-gray-400">Verified Twin City drivers</div>
                </div>
              </div>
            </div>

            {/* Hero Overlapping Quick Fares & Preview Card */}
            <div className="lg:col-span-5">
              <div className="bg-[#111333] border-2 border-[#EEC367]/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
                <div className="flex items-center justify-between pb-5 border-b border-gray-800">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Fixed Fare Promise</span>
                    <h3 className="text-lg font-bold text-white">Select Your Trip</h3>
                  </div>
                  <div className="px-3 py-1 bg-[#2ECC71]/15 text-[#2ECC71] border border-[#2ECC71]/30 rounded-full text-xs font-bold">
                    Official Fares
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  {/* Everyday Ride Card */}
                  <div className="p-4 rounded-2xl bg-[#1A1D48] border border-[#EEC367]/30 hover:border-[#EEC367] transition cursor-pointer group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-[#EEC367]/15 flex items-center justify-center text-[#EEC367]">
                          <Car className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="font-bold text-white group-hover:text-[#EEC367] transition">Everyday Ride</div>
                          <div className="text-xs text-gray-400">All towns & communities across Sekondi-Takoradi</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-black text-[#2ECC71]">Distance-Based</div>
                        <div className="text-[10px] text-gray-400 uppercase font-semibold">Route Metered</div>
                      </div>
                    </div>
                  </div>

                  {/* Airport Transfer Card */}
                  <div className="p-4 rounded-2xl bg-[#1A1D48] border border-[#EEC367]/30 hover:border-[#EEC367] transition cursor-pointer group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-[#EEC367]/15 flex items-center justify-center text-[#EEC367]">
                          <Plane className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="font-bold text-white group-hover:text-[#EEC367] transition">Airport Transfer</div>
                          <div className="text-xs text-gray-400">Takoradi Airforce Base & commercial flights</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-black text-[#2ECC71]">Route-Based</div>
                        <div className="text-[10px] text-gray-400 uppercase font-semibold">Dedicated Terminal</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 rounded-xl bg-[#1A1D48]/80 border border-gray-800 text-xs text-gray-300 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-[#EEC367] shrink-0 mt-0.5" />
                  <span>
                    No hidden charges, no peak surge, and no haggling at pickup. You always know the exact fare before you book.
                  </span>
                </div>

                <button
                  onClick={onQuickBookClick}
                  className="mt-6 w-full py-3.5 bg-[#EEC367] text-[#1A1D48] font-bold rounded-xl hover:bg-[#ffe199] transition shadow-lg text-sm flex items-center justify-center gap-2"
                >
                  <span>Start Your Booking</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 3. Fares Section */}
      <section id="services" className="py-20 bg-[#14163b] border-t border-[#EEC367]/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold text-[#EEC367] uppercase tracking-widest">Transparent Pricing</span>
            <h2 
              style={{ fontFamily: "'Cinzel', serif" }}
              className="text-3xl sm:text-4xl font-bold text-white mt-2 mb-4"
            >
              Distance-Based Pricing. Zero Surprises.
            </h2>
            <p className="text-gray-300 text-sm sm:text-base">
              Prah Ride calculates fair, transparent fares based on actual route distance. Drivers ride across the whole towns and communities of Sekondi-Takoradi.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Fare 1 */}
            <div className="rounded-3xl bg-[#1A1D48] border-2 border-[#EEC367]/40 p-8 shadow-xl relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#EEC367]/5 rounded-bl-full pointer-events-none" />
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="px-3 py-1 bg-[#EEC367]/15 text-[#EEC367] font-semibold text-xs rounded-full border border-[#EEC367]/30">
                    Whole Twin City Coverage
                  </span>
                  <Car className="w-6 h-6 text-[#EEC367]" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Everyday Ride</h3>
                <p className="text-sm text-gray-300 mb-6">
                  Serving all towns across Sekondi-Takoradi — from Market Circle, Anaji, Effiakuma, Kwesimintsim, Airport Ridge, and Beach Road, to Sekondi, Kojokrom, Essikado, Fijai, Inchaban, Kansaworado, Mpintsin, Whindo, and Assakae.
                </p>

                <div className="py-5 border-y border-gray-800 my-4 flex items-baseline justify-between">
                  <span className="text-gray-400 text-sm font-medium">Pricing Model</span>
                  <div className="text-right">
                    <span className="text-2xl font-black text-[#2ECC71]">Dynamic Distance</span>
                    <span className="text-xs text-gray-400 block">based on exact route</span>
                  </div>
                </div>

                <ul className="space-y-3 text-xs text-gray-300 mt-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#2ECC71]" />
                    <span>Includes up to 4 passengers</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#2ECC71]" />
                    <span>Calculated upfront by GPS distance</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#2ECC71]" />
                    <span>Pay cash or directly to driver's MoMo</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={onQuickBookClick}
                className="mt-8 w-full py-3.5 bg-[#EEC367] hover:bg-[#ffe199] text-[#1A1D48] font-bold rounded-xl transition text-sm text-center cursor-pointer touch-manipulation active:scale-95"
              >
                Book Everyday Ride
              </button>
            </div>

            {/* Fare 2 */}
            <div className="rounded-3xl bg-[#1A1D48] border-2 border-[#EEC367]/40 p-8 shadow-xl relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#EEC367]/5 rounded-bl-full pointer-events-none" />
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="px-3 py-1 bg-[#EEC367]/15 text-[#EEC367] font-semibold text-xs rounded-full border border-[#EEC367]/30">
                    Airport Terminal
                  </span>
                  <Plane className="w-6 h-6 text-[#EEC367]" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Airport Ride</h3>
                <p className="text-sm text-gray-300 mb-6">
                  Dedicated, stress-free transfers to or from Takoradi Airport. Punctual pickup with ample luggage trunk space and courteous verified drivers.
                </p>

                <div className="py-5 border-y border-gray-800 my-4 flex items-baseline justify-between">
                  <span className="text-gray-400 text-sm font-medium">Pricing Model</span>
                  <div className="text-right">
                    <span className="text-2xl font-black text-[#2ECC71]">Airport Route Rate</span>
                    <span className="text-xs text-gray-400 block">based on terminal route</span>
                  </div>
                </div>

                <ul className="space-y-3 text-xs text-gray-300 mt-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#2ECC71]" />
                    <span>Flight arrival & departure assistance</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#2ECC71]" />
                    <span>Luggage accommodation included</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#2ECC71]" />
                    <span>Pay cash or directly to driver's MoMo</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={onQuickBookClick}
                className="mt-8 w-full py-3.5 bg-[#EEC367] hover:bg-[#ffe199] text-[#1A1D48] font-bold rounded-xl transition text-sm text-center cursor-pointer touch-manipulation active:scale-95"
              >
                Book Airport Transfer
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Why Choose Prah Ride */}
      <section id="why-choose-us" className="py-20 bg-[#1A1D48]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold text-[#EEC367] uppercase tracking-widest">Built For The Twin City</span>
            <h2 
              style={{ fontFamily: "'Cinzel', serif" }}
              className="text-3xl sm:text-4xl font-bold text-white mt-2 mb-4"
            >
              Why Commuters Trust Prah Ride
            </h2>
            <p className="text-gray-300 text-sm sm:text-base">
              Unlike international apps that ignore local realities, Prah Ride was built specifically for the residents and visitors of Sekondi-Takoradi.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-[#111333] border border-[#EEC367]/20 rounded-2xl p-6 hover:border-[#EEC367]/60 transition">
              <div className="w-12 h-12 rounded-xl bg-[#EEC367]/15 flex items-center justify-center text-[#EEC367] mb-5">
                <Coins className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Distance-Based Pricing</h4>
              <p className="text-xs text-gray-300 leading-relaxed">
                Never argue or haggle at the roadside. Fares are calculated upfront by actual route distance — rain or shine, day or evening.
              </p>
            </div>

            <div className="bg-[#111333] border border-[#EEC367]/20 rounded-2xl p-6 hover:border-[#EEC367]/60 transition">
              <div className="w-12 h-12 rounded-xl bg-[#EEC367]/15 flex items-center justify-center text-[#EEC367] mb-5">
                <FileCheck className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Vetted Local Drivers</h4>
              <p className="text-xs text-gray-300 leading-relaxed">
                Every driver submits their vehicle photo, license plate, and driver's license for manual admin verification before hitting the road.
              </p>
            </div>

            <div className="bg-[#111333] border border-[#EEC367]/20 rounded-2xl p-6 hover:border-[#EEC367]/60 transition">
              <div className="w-12 h-12 rounded-xl bg-[#EEC367]/15 flex items-center justify-center text-[#EEC367] mb-5">
                <Phone className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Direct Cash & MoMo</h4>
              <p className="text-xs text-gray-300 leading-relaxed">
                Pay the driver directly with Cash or your personal MoMo account. No complicated third-party wallets or deducted card fees.
              </p>
            </div>

            <div className="bg-[#111333] border border-[#EEC367]/20 rounded-2xl p-6 hover:border-[#EEC367]/60 transition">
              <div className="w-12 h-12 rounded-xl bg-[#EEC367]/15 flex items-center justify-center text-[#EEC367] mb-5">
                <Clock className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Reliable Operating Hours</h4>
              <p className="text-xs text-gray-300 leading-relaxed">
                Monday to Saturday 7:00 AM to 10:00 PM GMT. Driver accountability and live dispatch support during all operational hours.
              </p>
            </div>

            <div className="bg-[#111333] border border-[#EEC367]/20 rounded-2xl p-6 hover:border-[#EEC367]/60 transition">
              <div className="w-12 h-12 rounded-xl bg-[#EEC367]/15 flex items-center justify-center text-[#EEC367] mb-5">
                <MapPin className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Doorstep Twin City Pickup</h4>
              <p className="text-xs text-gray-300 leading-relaxed">
                Drivers navigate directly to your landmark or GPS coordinates anywhere across Sekondi, Takoradi, Inchaban, Fijai, and beyond.
              </p>
            </div>

            <div className="bg-[#111333] border border-[#EEC367]/20 rounded-2xl p-6 hover:border-[#EEC367]/60 transition">
              <div className="w-12 h-12 rounded-xl bg-[#EEC367]/15 flex items-center justify-center text-[#EEC367] mb-5">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Twin City Safety & Support</h4>
              <p className="text-xs text-gray-300 leading-relaxed">
                Live trip code verification, direct customer care phone & WhatsApp helpline (+233 24 727 3827), and verified driver credentials.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. How It Works */}
      <section id="how-it-works" className="py-20 bg-[#14163b] border-t border-[#EEC367]/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold text-[#EEC367] uppercase tracking-widest">Simple & Transparent</span>
            <h2 
              style={{ fontFamily: "'Cinzel', serif" }}
              className="text-3xl sm:text-4xl font-bold text-white mt-2 mb-4"
            >
              How Prah Ride Works
            </h2>
            <p className="text-gray-300 text-sm">
              Three clear steps from your doorstep to your destination.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative max-w-7xl mx-auto">
            {/* Step 1 */}
            <div className="bg-[#1A1D48] rounded-2xl p-8 border border-[#EEC367]/30 text-center relative">
              <div className="w-14 h-14 rounded-full bg-[#EEC367] text-[#1A1D48] font-black text-xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                1
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Book Your Ride</h4>
              <p className="text-xs text-gray-300 leading-relaxed">
                Enter your pickup and destination in Sekondi-Takoradi. Choose Everyday or Airport transfer. Dynamic fare calculated instantly.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-[#1A1D48] rounded-2xl p-8 border border-[#EEC367]/30 text-center relative">
              <div className="w-14 h-14 rounded-full bg-[#EEC367] text-[#1A1D48] font-black text-xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                2
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Get Matched & Track</h4>
              <p className="text-xs text-gray-300 leading-relaxed">
                The closest available driver accepts your request. Track their arrival live on OpenStreetMap with verified vehicle details.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-[#1A1D48] rounded-2xl p-8 border border-[#EEC367]/30 text-center relative md:col-span-2 lg:col-span-1">
              <div className="w-14 h-14 rounded-full bg-[#EEC367] text-[#1A1D48] font-black text-xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                3
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Ride & Settle Directly</h4>
              <p className="text-xs text-gray-300 leading-relaxed">
                Enjoy your comfortable ride. Pay the driver directly in Cash or send to their verified MoMo number, then tap "I've Paid".
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Real Community Reviews (Sekondi-Takoradi Localized) */}
      <section id="testimonials" className="py-20 bg-[#1A1D48]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-block px-3 py-1 rounded-full bg-[#EEC367]/10 text-[#EEC367] border border-[#EEC367]/30 text-xs font-semibold mb-3">
              Twin City Rider Community · 5.0 ★ Rating
            </div>
            <h2 
              style={{ fontFamily: "'Cinzel', serif" }}
              className="text-3xl sm:text-4xl font-bold text-white mb-3"
            >
              Voices Across Sekondi-Takoradi
            </h2>
            <p className="text-xs text-gray-300">
              Trusted by commuters, business executives, and airport travelers across the Western Region.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="p-6 rounded-3xl bg-[#111333] border border-[#EEC367]/30 shadow-xl flex flex-col justify-between">
              <p className="text-sm text-gray-200 italic mb-6 leading-relaxed">
                "Getting from Market Circle to Anaji SSNIT flats used to require endless taxi bargaining. With Prah Ride, the fare is clear and metered by distance, and the driver arrives right where I am."
              </p>
              <div className="border-t border-gray-800 pt-4 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white text-sm">Kwame M.</div>
                  <div className="text-xs text-[#EEC367]">Anaji / Market Circle Commuter</div>
                </div>
                <span className="text-[10px] text-[#2ECC71] uppercase tracking-wider font-bold bg-[#2ECC71]/10 px-2 py-0.5 rounded-full border border-[#2ECC71]/30">Verified Rider</span>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-[#111333] border border-[#EEC367]/30 shadow-xl flex flex-col justify-between">
              <p className="text-sm text-gray-200 italic mb-6 leading-relaxed">
                "Had an early morning flight out of Takoradi Airport. Booked an Airport ride from Airport Ridge with transparent route pricing. Driver arrived on time with plenty of luggage room."
              </p>
              <div className="border-t border-gray-800 pt-4 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white text-sm">Abena Osei</div>
                  <div className="text-xs text-[#EEC367]">Airport Ridge Resident</div>
                </div>
                <span className="text-[10px] text-[#2ECC71] uppercase tracking-wider font-bold bg-[#2ECC71]/10 px-2 py-0.5 rounded-full border border-[#2ECC71]/30">Verified Traveler</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Driver Recruitment Banner */}
      <section className="py-16 bg-gradient-to-r from-[#111333] via-[#1A1D48] to-[#111333] border-y border-[#EEC367]/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#1A1D48] border-2 border-[#EEC367] rounded-3xl p-8 sm:p-12 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="space-y-4 max-w-2xl text-center lg:text-left">
              <span className="text-xs font-bold text-[#EEC367] uppercase tracking-widest">Drive With Pride</span>
              <h3 
                style={{ fontFamily: "'Cinzel', serif" }}
                className="text-3xl sm:text-4xl font-bold text-white"
              >
                Earn With Prah Ride in Sekondi-Takoradi
              </h3>
              <p className="text-sm sm:text-base text-gray-300">
                Are you a licensed driver with a well-maintained vehicle in the Twin City? Join our vetted driver fleet. Keep 100% of your fixed fares paid directly by passengers via Cash or MoMo.
              </p>
              <div className="flex flex-wrap gap-4 justify-center lg:justify-start text-xs text-gray-300">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-[#2ECC71]" /> Direct MoMo to your phone</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-[#2ECC71]" /> Flexible Twin City hours</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-[#2ECC71]" /> Quick admin approval</span>
              </div>
            </div>

            <div className="shrink-0 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => onNavigate('register_driver')}
                className="w-full sm:w-auto px-8 py-4 bg-[#EEC367] text-[#1A1D48] font-bold rounded-xl hover:bg-[#ffe199] transition shadow-xl text-base flex items-center justify-center gap-2 cursor-pointer touch-manipulation active:scale-95"
              >
                <Car className="w-5 h-5 text-[#1A1D48]" />
                <span>Apply as a Driver</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Focused Modern Footer */}
      <footer className="bg-[#0b0d1e] border-t border-[#EEC367]/25 pt-12 pb-10 text-sm text-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 pb-10 border-b border-gray-800">
            {/* Brand & Current Location */}
            <div className="space-y-3.5 max-w-xl">
              <PrahRideLogo size="md" />
              <p className="text-xs text-gray-400 leading-relaxed">
                Premier ride-hailing service across the towns and communities of Sekondi-Takoradi. Safe journeys with verified drivers and direct settlements.
              </p>
              <div className="flex items-start gap-2.5 text-xs text-gray-200 bg-[#14163b]/70 p-3.5 rounded-2xl border border-gray-800">
                <MapPin className="w-4 h-4 text-[#EEC367] shrink-0 mt-0.5" />
                <div>
                  <span className="text-gray-400 block text-[11px] uppercase font-bold tracking-wider">Current Location</span>
                  <span className="font-semibold text-white text-xs sm:text-sm">
                    Inchaban around St. Benedict Hospital 🏥
                  </span>
                  <span className="text-gray-400 block text-[11px]">Sekondi-Takoradi, Western Region, Ghana</span>
                </div>
              </div>
            </div>

            {/* Direct Phone & WhatsApp Connections (+233 24 727 3827) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              {/* Phone Call */}
              <a
                href="tel:+233247273827"
                className="flex items-center justify-center gap-2.5 px-5 py-3.5 bg-[#14163b] hover:bg-[#1c2053] text-white border border-[#EEC367]/40 rounded-2xl text-xs font-bold transition shadow-lg hover:border-[#EEC367]"
              >
                <Phone className="w-4 h-4 text-[#EEC367]" />
                <span>Call: +233 24 727 3827</span>
              </a>

              {/* WhatsApp Message */}
              <a
                href="https://wa.me/233247273827?text=Hello%20Prah%20Ride%2C%20I%20am%20messaging%20from%20the%20website%20regarding%20a%20ride%20service."
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2.5 px-5 py-3.5 bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] border border-[#25D366]/50 rounded-2xl text-xs font-bold transition shadow-lg hover:border-[#25D366]"
              >
                <MessageCircle className="w-4 h-4 text-[#25D366]" />
                <span>WhatsApp: +233 24 727 3827</span>
              </a>
            </div>
          </div>

          {/* Bottom Bar: Copyright & Interactive Policy / Terms / Safety Modals */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-4">
            <div>
              &copy; {new Date().getFullYear()} Prah Ride Ltd. All rights reserved. Operating in Sekondi-Takoradi, Ghana.
            </div>

            <div className="flex flex-wrap items-center gap-4 sm:gap-6 font-semibold">
              <button
                type="button"
                onClick={() => setPolicyModal('privacy')}
                className="text-gray-400 hover:text-[#EEC367] transition underline-offset-4 hover:underline cursor-pointer"
              >
                Privacy Policy
              </button>
              <button
                type="button"
                onClick={() => setPolicyModal('terms')}
                className="text-gray-400 hover:text-[#EEC367] transition underline-offset-4 hover:underline cursor-pointer"
              >
                Terms of Service
              </button>
              <button
                type="button"
                onClick={() => setPolicyModal('safety')}
                className="text-gray-400 hover:text-[#EEC367] transition underline-offset-4 hover:underline cursor-pointer flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#2ECC71]" />
                <span>Passenger Safety</span>
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* 9. Interactive Legal & Safety Document Modal */}
      {policyModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#14163b] border-2 border-[#EEC367] rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[85vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <PrahRideLogo size="sm" />
                <span className="text-xs text-[#EEC367] font-bold uppercase tracking-wider pl-2 border-l border-gray-700">
                  Official Policy & Guidelines
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPolicyModal(null)}
                className="p-1 text-gray-400 hover:text-white hover:bg-gray-800/60 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-2 pt-4 pb-2 border-b border-gray-800/80">
              <button
                type="button"
                onClick={() => setPolicyModal('privacy')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  policyModal === 'privacy'
                    ? 'bg-[#EEC367] text-[#1A1D48] shadow-md'
                    : 'bg-[#111333] text-gray-400 hover:text-white'
                }`}
              >
                Privacy Policy
              </button>
              <button
                type="button"
                onClick={() => setPolicyModal('terms')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  policyModal === 'terms'
                    ? 'bg-[#EEC367] text-[#1A1D48] shadow-md'
                    : 'bg-[#111333] text-gray-400 hover:text-white'
                }`}
              >
                Terms of Service
              </button>
              <button
                type="button"
                onClick={() => setPolicyModal('safety')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  policyModal === 'safety'
                    ? 'bg-[#2ECC71] text-[#1A1D48] shadow-md'
                    : 'bg-[#111333] text-gray-400 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Passenger Safety</span>
              </button>
            </div>

            {/* Modal Body Content (Scrollable) */}
            <div className="overflow-y-auto py-5 space-y-4 text-xs text-gray-300 leading-relaxed pr-2">
              {policyModal === 'privacy' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-white mb-1">Privacy Policy</h3>
                    <p className="text-[11px] text-[#EEC367]">Last updated: September 2026 · Prah Ride Sekondi-Takoradi</p>
                  </div>

                  <div className="bg-[#111333] p-4 rounded-2xl border border-gray-800 space-y-2">
                    <h4 className="text-white font-bold text-xs">1. Information We Collect</h4>
                    <p>
                      To facilitate safe rides across Sekondi-Takoradi, we collect basic registration information including your name, Ghana phone number, and account email. When you initiate a booking, we record your chosen pickup location, destination address, and route coordinates.
                    </p>
                  </div>

                  <div className="bg-[#111333] p-4 rounded-2xl border border-gray-800 space-y-2">
                    <h4 className="text-white font-bold text-xs">2. Real-Time GPS & Dispatch</h4>
                    <p>
                      Location coordinates are used solely to match passengers with nearby verified drivers across Sekondi-Takoradi and broadcast live trip progress on our private map interface. We never track your device when the application is idle.
                    </p>
                  </div>

                  <div className="bg-[#111333] p-4 rounded-2xl border border-gray-800 space-y-2">
                    <h4 className="text-white font-bold text-xs">3. Mobile Money & Financial Data</h4>
                    <p>
                      Prah Ride supports direct settlements in Cash or peer-to-peer Mobile Money. We never request or store your Mobile Money PIN, bank cards, or banking credentials. MoMo numbers are shared exclusively between the passenger and driver to verify payment for completed rides.
                    </p>
                  </div>

                  <div className="bg-[#111333] p-4 rounded-2xl border border-gray-800 space-y-2">
                    <h4 className="text-white font-bold text-xs">4. No Third-Party Data Selling</h4>
                    <p>
                      Your personal data is strictly protected and never sold, leased, or traded to marketing companies or third-party brokers.
                    </p>
                  </div>

                  <div className="p-3 bg-[#1A1D48] rounded-xl border border-gray-800 text-[11px] text-gray-400">
                    Questions about your data? Reach our dispatch desk directly at <strong>+233 24 727 3827</strong>.
                  </div>
                </div>
              )}

              {policyModal === 'terms' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-white mb-1">Terms of Service</h3>
                    <p className="text-[11px] text-[#EEC367]">Official Passenger & Driver Agreement · Sekondi-Takoradi</p>
                  </div>

                  <div className="bg-[#111333] p-4 rounded-2xl border border-gray-800 space-y-2">
                    <h4 className="text-white font-bold text-xs">1. Scope of Service</h4>
                    <p>
                      Prah Ride operates a localized dispatch platform connecting passengers with vetted, verified drivers throughout the Twin City of Sekondi-Takoradi, covering Inchaban, St. Benedict Hospital, Market Circle, Anaji, Effiakuma, Kwesimintsim, Airport Ridge, Vienna Beach Road, Sekondi, Kojokrom, and Takoradi Airport.
                    </p>
                  </div>

                  <div className="bg-[#111333] p-4 rounded-2xl border border-gray-800 space-y-2">
                    <h4 className="text-white font-bold text-xs">2. Fares & Settlement</h4>
                    <p>
                      Fares are calculated transparently by route distance and displayed upfront before you confirm your request. Passengers agree to settle the indicated fare directly with the driver upon trip completion using Cash or Mobile Money.
                    </p>
                  </div>

                  <div className="bg-[#111333] p-4 rounded-2xl border border-gray-800 space-y-2">
                    <h4 className="text-white font-bold text-xs">3. Cancellation & Conduct</h4>
                    <p>
                      Passengers and drivers agree to treat one another with dignity and respect. Verbal abuse, damage to vehicles, intoxication posing a safety hazard, or unlawful behavior will lead to permanent account suspension. Either party may cancel an unfulfilled request before driver arrival.
                    </p>
                  </div>

                  <div className="bg-[#111333] p-4 rounded-2xl border border-gray-800 space-y-2">
                    <h4 className="text-white font-bold text-xs">4. Operating Desk & Support</h4>
                    <p>
                      Our primary dispatch hub is based in Inchaban around St. Benedict Hospital 🏥. For immediate booking assistance or dispute mediation, contact <strong>+233 24 727 3827</strong> via Phone or WhatsApp.
                    </p>
                  </div>
                </div>
              )}

              {policyModal === 'safety' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-white mb-1">Passenger Safety Standard</h3>
                    <p className="text-[11px] text-[#2ECC71] font-semibold">Zero-Compromise Security Across Sekondi-Takoradi</p>
                  </div>

                  <div className="bg-[#111333] p-4 rounded-2xl border border-gray-800 space-y-2">
                    <h4 className="text-white font-bold text-xs flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#2ECC71]" />
                      <span>1. Verified Drivers & Vehicles</span>
                    </h4>
                    <p>
                      Every Prah Ride driver undergoes manual inspection by operations before receiving ride dispatch permissions. Vehicle license plates, make, model, and driver phone numbers are visible in your app before you board. Always verify the license plate before getting into the car.
                    </p>
                  </div>

                  <div className="bg-[#111333] p-4 rounded-2xl border border-gray-800 space-y-2">
                    <h4 className="text-white font-bold text-xs flex items-center gap-1.5">
                      <Car className="w-4 h-4 text-[#EEC367]" />
                      <span>2. Live GPS Journey Broadcast</span>
                    </h4>
                    <p>
                      Once your driver accepts your trip, their position is broadcast live on our map. You can follow your driver's arrival at your pickup spot and monitor the route in real-time until you safely arrive at your destination.
                    </p>
                  </div>

                  <div className="bg-[#111333] p-4 rounded-2xl border border-gray-800 space-y-2">
                    <h4 className="text-white font-bold text-xs flex items-center gap-1.5">
                      <Phone className="w-4 h-4 text-[#3B82F6]" />
                      <span>3. Emergency & Dispatch Helpline</span>
                    </h4>
                    <p>
                      In the event of an urgent safety query, lost item, or route assistance, passengers and drivers can reach our central dispatch team immediately at <strong>+233 24 727 3827</strong> (Phone & WhatsApp).
                    </p>
                  </div>

                  <div className="bg-[#111333] p-4 rounded-2xl border border-gray-800 space-y-2">
                    <h4 className="text-white font-bold text-xs">4. Vehicle Maintenance & Capacity</h4>
                    <p>
                      All vehicles are limited to a maximum of 4 passengers to guarantee comfortable seating and functioning seatbelts throughout the journey.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-gray-800 flex items-center justify-between">
              <span className="text-[11px] text-gray-500">
                Prah Ride · Inchaban, St. Benedict Hospital 🏥
              </span>
              <button
                type="button"
                onClick={() => setPolicyModal(null)}
                className="px-6 py-2 bg-[#EEC367] text-[#1A1D48] font-bold text-xs rounded-xl hover:bg-[#ffe199] transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
