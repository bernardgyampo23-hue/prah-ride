import React, { useState } from 'react';
import { PrahRideLogo } from './PrahRideLogo';
import { useAuth } from '../lib/AuthContext';
import { ArrowLeft, Lock, Mail, Phone, User, Car, Shield, AlertCircle, Eye, EyeOff, CheckCircle2, FileText } from 'lucide-react';
import { UserRole } from '../types';

interface AuthModalProps {
  initialMode?: 'login' | 'register_passenger' | 'register_driver';
  onBack: () => void;
  onSuccess: (role: UserRole) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  initialMode = 'login',
  onBack,
  onSuccess,
}) => {
  const { login, loginWithGoogle, registerPassenger, registerDriver } = useAuth();
  const [mode, setMode] = useState<'login' | 'register_passenger' | 'register_driver'>(initialMode);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Common Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  // Driver Specific Fields
  const [vehicleMakeModel, setVehicleMakeModel] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [momoNumber, setMomoNumber] = useState('');
  const [vehiclePhotoUrl, setVehiclePhotoUrl] = useState('');

  const validateGhanaPhone = (num: string): boolean => {
    const clean = num.replace(/\s+/g, '');
    return /^(0|\+233)[2-5][0-9]{8}$/.test(clean);
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const targetRole = mode === 'register_driver' ? 'driver' : 'passenger';
      const prof = await loginWithGoogle(targetRole);
      onSuccess(prof.role);
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign in popup closed before finishing.');
      } else {
        setError(err.message || 'Google sign-in could not be completed.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const prof = await login(email.trim(), password);
      onSuccess(prof.role);
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('Invalid email or password. Please verify your credentials or register a new account.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed sign-in attempts. Please wait a few minutes or reset your password.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Email/password auth is disabled on this Firebase project. Please use "Continue with Google" or the One-Tap buttons below.');
      } else {
        setError(err.message || 'Authentication failed. Please check your network connection.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePassengerRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateGhanaPhone(phone)) {
      setError('Please enter a valid Ghana phone number (e.g., 024 123 4567 or 050 987 6543).');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      await registerPassenger({ email: email.trim(), pass: password, fullName: fullName.trim(), phone: phone.trim() });
      onSuccess('passenger');
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Please sign in instead.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Please use at least 6 characters.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Email/password auth is disabled on this Firebase project. Please use "Continue with Google" or the One-Tap buttons below.');
      } else {
        setError(err.message || 'Passenger registration failed.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDriverRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateGhanaPhone(phone)) {
      setError('Please enter a valid Ghana phone number (e.g., 024 123 4567).');
      return;
    }

    if (!momoNumber.trim()) {
      setError('Driver MoMo number is required so passengers can pay you directly upon arrival.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      await registerDriver({
        email: email.trim(),
        pass: password,
        fullName: fullName.trim(),
        phone: phone.trim(),
        vehicleMakeModel: vehicleMakeModel.trim(),
        licensePlate: licensePlate.trim().toUpperCase(),
        licenseNumber: licenseNumber.trim().toUpperCase(),
        momoNumber: momoNumber.trim(),
        vehiclePhotoUrl: vehiclePhotoUrl.trim() || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80',
      });
      onSuccess('driver');
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please sign in instead.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Email/password auth is disabled on this Firebase project. Please use "Continue with Google" or the One-Tap buttons below.');
      } else {
        setError(err.message || 'Driver registration failed.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#111333] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#EEC367] transition mb-6 mx-auto sm:mx-0 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>

        <div className="flex justify-center mb-4">
          <PrahRideLogo size="lg" />
        </div>

        <h2 
          style={{ fontFamily: "'Cinzel', serif" }}
          className="text-center text-2xl sm:text-3xl font-bold tracking-tight text-white mt-2"
        >
          {mode === 'login' && 'Sign In to Prah Ride'}
          {mode === 'register_passenger' && 'Passenger Registration'}
          {mode === 'register_driver' && 'Driver Partner Application'}
        </h2>
        <p className="mt-1 text-center text-xs text-gray-400">
          Exclusive fixed-fare ride-hailing in Sekondi-Takoradi, Western Region
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-[#1A1D48] py-8 px-6 shadow-2xl rounded-3xl sm:px-10 border-2 border-[#EEC367]/40">
          
          {/* Main Mode Tabs */}
          <div className="flex rounded-2xl bg-[#111333] p-1.5 mb-6 border border-gray-800">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                mode === 'login'
                  ? 'bg-[#EEC367] text-[#1A1D48] shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('register_passenger'); setError(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                mode === 'register_passenger'
                  ? 'bg-[#EEC367] text-[#1A1D48] shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Passenger Sign Up
            </button>
            <button
              type="button"
              onClick={() => { setMode('register_driver'); setError(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                mode === 'register_driver'
                  ? 'bg-[#EEC367] text-[#1A1D48] shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Drive With Us
            </button>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-900/40 border border-red-500/50 flex items-start gap-2.5 text-xs text-red-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* 1-Click Official Google Sign-In (Supported natively on Firebase) */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isSubmitting}
            className="w-full mb-5 py-3 px-4 bg-white hover:bg-gray-100 text-[#111333] font-bold rounded-2xl text-xs sm:text-sm transition shadow-lg flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-800" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
              <span className="bg-[#1A1D48] px-3 text-gray-400">or sign in with credentials</span>
            </div>
          </div>

          {/* 1. Login Form */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full pl-10 pr-3 py-2.5 bg-[#111333] border border-gray-700 rounded-xl text-white text-sm focus:border-[#EEC367] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-300">Password</label>
                  <span className="text-[11px] text-gray-400">Prah Secure</span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-10 py-2.5 bg-[#111333] border border-gray-700 rounded-xl text-white text-sm focus:border-[#EEC367] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 bg-[#EEC367] hover:bg-[#ffe199] text-[#1A1D48] font-bold rounded-xl text-sm transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-[#1A1D48] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Sign In</span>
                )}
              </button>

              <div className="pt-2 text-center text-xs text-gray-400 space-y-2 border-t border-gray-800">
                <p>
                  New to Prah Ride?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('register_passenger'); setError(null); }}
                    className="text-[#EEC367] font-bold hover:underline cursor-pointer"
                  >
                    Create a Passenger Account
                  </button>
                </p>
                <p>
                  Own a car in Sekondi-Takoradi?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('register_driver'); setError(null); }}
                    className="text-[#2ECC71] font-bold hover:underline cursor-pointer"
                  >
                    Apply as Driver Partner
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* 2. Passenger Register Form */}
          {mode === 'register_passenger' && (
            <form onSubmit={handlePassengerRegisterSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full pl-10 pr-3 py-2.5 bg-[#111333] border border-gray-700 rounded-xl text-white text-sm focus:border-[#EEC367] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Ghana Phone Number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 024 123 4567"
                    className="w-full pl-10 pr-3 py-2.5 bg-[#111333] border border-gray-700 rounded-xl text-white text-sm focus:border-[#EEC367] focus:outline-none"
                  />
                </div>
                <span className="text-[10px] text-gray-400 block mt-1">
                  Used by assigned drivers to call or verify pickup in Sekondi-Takoradi.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-3 py-2.5 bg-[#111333] border border-gray-700 rounded-xl text-white text-sm focus:border-[#EEC367] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Create Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-10 pr-10 py-2.5 bg-[#111333] border border-gray-700 rounded-xl text-white text-sm focus:border-[#EEC367] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 bg-[#EEC367] hover:bg-[#ffe199] text-[#1A1D48] font-bold rounded-xl text-sm transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-[#1A1D48] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Register as Passenger</span>
                )}
              </button>

              <div className="text-center text-xs text-gray-400 pt-2 border-t border-gray-800">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(null); }}
                  className="text-[#EEC367] font-bold hover:underline cursor-pointer"
                >
                  Sign In
                </button>
              </div>
            </form>
          )}

          {/* 3. Driver Application Form */}
          {mode === 'register_driver' && (
            <form onSubmit={handleDriverRegisterSubmit} className="space-y-3.5">
              <div className="p-3 bg-[#111333] rounded-2xl text-xs text-gray-300 border border-gray-800 flex items-start gap-2">
                <Shield className="w-4 h-4 text-[#EEC367] shrink-0 mt-0.5" />
                <span>Driver applications undergo verification by the Prah Ride operations desk before dispatch activation.</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Full Legal Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full legal name"
                  className="w-full px-3 py-2 bg-[#111333] border border-gray-700 rounded-xl text-white text-sm focus:border-[#EEC367] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="024 XXX XXXX"
                    className="w-full px-3 py-2 bg-[#111333] border border-gray-700 rounded-xl text-white text-sm focus:border-[#EEC367] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full px-3 py-2 bg-[#111333] border border-gray-700 rounded-xl text-white text-sm focus:border-[#EEC367] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#EEC367] mb-1">
                  Registered Mobile Money (MoMo) Number & Name *
                </label>
                <input
                  type="text"
                  required
                  value={momoNumber}
                  onChange={(e) => setMomoNumber(e.target.value)}
                  placeholder="e.g. 0244123456 (MTN / Telecel / AT)"
                  className="w-full px-3 py-2 bg-[#111333] border border-[#EEC367]/60 rounded-xl text-white text-sm focus:border-[#EEC367] focus:outline-none"
                />
                <span className="text-[10px] text-gray-400 block mt-0.5">
                  100% direct passenger payouts: Passengers send fare directly to this MoMo account upon ride completion.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Vehicle Make & Model</label>
                  <input
                    type="text"
                    required
                    value={vehicleMakeModel}
                    onChange={(e) => setVehicleMakeModel(e.target.value)}
                    placeholder="Toyota Corolla 2018"
                    className="w-full px-3 py-2 bg-[#111333] border border-gray-700 rounded-xl text-white text-sm focus:border-[#EEC367] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">License Plate (WR)</label>
                  <input
                    type="text"
                    required
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value)}
                    placeholder="WR-4589-20"
                    className="w-full px-3 py-2 bg-[#111333] border border-gray-700 rounded-xl text-white text-sm focus:border-[#EEC367] focus:outline-none uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Driver License No.</label>
                  <input
                    type="text"
                    required
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    placeholder="DL-WR-89218"
                    className="w-full px-3 py-2 bg-[#111333] border border-gray-700 rounded-xl text-white text-sm focus:border-[#EEC367] focus:outline-none uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Account Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-[#111333] border border-gray-700 rounded-xl text-white text-sm focus:border-[#EEC367] focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 bg-[#EEC367] hover:bg-[#ffe199] text-[#1A1D48] font-bold rounded-xl text-sm transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-[#1A1D48] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Submit Driver Application</span>
                )}
              </button>

              <div className="text-center text-xs text-gray-400 pt-2 border-t border-gray-800">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(null); }}
                  className="text-[#EEC367] font-bold hover:underline cursor-pointer"
                >
                  Sign In
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default AuthModal;
