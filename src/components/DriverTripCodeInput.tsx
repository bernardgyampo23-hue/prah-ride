import React, { useState, useRef, useEffect } from 'react';
import { verifyAndConsumeTripCode } from '../lib/supabase';
import { RideRecord } from '../types';
import { 
  KeyRound, 
  Lock, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Car 
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface DriverTripCodeInputProps {
  ride: RideRecord;
  onTripStarted: () => void;
}

export const DriverTripCodeInput: React.FC<DriverTripCodeInputProps> = ({
  ride,
  onTripStarted,
}) => {
  const [digits, setDigits] = useState<string[]>(['', '', '', '']);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockCountdown, setLockCountdown] = useState(0); // in seconds

  const inputRefs = [
    useRef<HTMLInputElement | null>(null),
    useRef<HTMLInputElement | null>(null),
    useRef<HTMLInputElement | null>(null),
    useRef<HTMLInputElement | null>(null),
  ];

  // Auto-focus first input on load if not locked
  useEffect(() => {
    if (lockCountdown === 0 && inputRefs[0].current) {
      inputRefs[0].current.focus();
    }
  }, [lockCountdown]);

  // Lock timer countdown
  useEffect(() => {
    if (lockCountdown <= 0) return;
    const interval = setInterval(() => {
      setLockCountdown((prev) => {
        if (prev <= 1) {
          setFailedAttempts(0); // Reset failed attempts after lock expires
          setErrorMsg(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockCountdown]);

  const handleDigitChange = (index: number, val: string) => {
    if (lockCountdown > 0) return;
    setErrorMsg(null);

    // Only allow single digit 0-9
    const cleanChar = val.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = cleanChar;
    setDigits(newDigits);

    // If a digit was entered, auto-focus next box
    if (cleanChar && index < 3) {
      inputRefs[index + 1].current?.focus();
    }

    // If all 4 digits are entered, auto-submit
    if (cleanChar && index === 3) {
      const fullCode = newDigits.join('');
      if (fullCode.length === 4) {
        submitCode(fullCode);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (lockCountdown > 0) return;

    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (!pasted) return;

    const newDigits = ['', '', '', ''];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setDigits(newDigits);

    if (pasted.length === 4) {
      submitCode(pasted);
    } else if (pasted.length < 4) {
      inputRefs[pasted.length].current?.focus();
    }
  };

  const submitCode = async (fullCodeToVerify?: string) => {
    const code = fullCodeToVerify || digits.join('');
    if (code.length !== 4) {
      setErrorMsg('Please enter all 4 digits of the Passenger Trip Code.');
      return;
    }

    setIsVerifying(true);
    setErrorMsg(null);

    try {
      const res = await verifyAndConsumeTripCode(ride.id, code);
      if (res.success) {
        confetti({ particleCount: 70, spread: 80 });
        onTripStarted();
      } else {
        const nextFailed = failedAttempts + 1;
        setFailedAttempts(nextFailed);
        setDigits(['', '', '', '']);

        if (nextFailed >= 3) {
          setLockCountdown(60); // 1 minute lockout
          setErrorMsg('Wrong code entered 3 times! System locked for 60 seconds.');
        } else {
          setErrorMsg(`${res.error || 'Incorrect Trip Code.'} (${3 - nextFailed} attempts remaining before 1-min lock)`);
          inputRefs[0].current?.focus();
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="bg-[#0e1026] border-2 border-[#EEC367] rounded-3xl p-5 sm:p-6 shadow-2xl text-white space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-[#EEC367]/20 text-[#EEC367] flex items-center justify-center border border-[#EEC367]/40 shadow-inner">
            <KeyRound className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
              <span>Enter Passenger Trip Code</span>
              <span className="text-[10px] bg-[#00C853] text-black font-black px-1.5 py-0.2 rounded-full">
                Required
              </span>
            </h4>
            <p className="text-[11px] text-gray-400">
              Ask {ride.passengerName} for their 4-digit security code to start the trip.
            </p>
          </div>
        </div>

        <ShieldCheck className="w-5 h-5 text-[#00C853] shrink-0" />
      </div>

      {/* Lockout Notice */}
      {lockCountdown > 0 ? (
        <div className="p-4 bg-red-950/80 border-2 border-red-500 rounded-2xl text-red-200 text-xs flex items-center gap-3">
          <Lock className="w-6 h-6 text-red-400 shrink-0 animate-bounce" />
          <div>
            <strong className="block text-red-300 font-bold">Input Locked for Security</strong>
            <p className="text-[11px]">
              Too many incorrect code attempts. Please wait{' '}
              <span className="font-mono font-bold text-white bg-black/50 px-2 py-0.5 rounded">
                {lockCountdown}s
              </span>{' '}
              before trying again.
            </p>
          </div>
        </div>
      ) : (
        /* 4 Digit Boxes */
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-3 py-2">
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={inputRefs[idx]}
                type="text"
                inputMode="numeric"
                maxLength={1}
                disabled={lockCountdown > 0 || isVerifying}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                onPaste={handlePaste}
                placeholder="•"
                className={`w-14 h-16 sm:w-16 sm:h-18 text-center font-mono font-black text-2xl sm:text-3xl rounded-2xl border-2 transition focus:outline-none shadow-lg ${
                  digit
                    ? 'bg-[#1A1D48] text-[#EEC367] border-[#EEC367] shadow-[#EEC367]/20'
                    : 'bg-[#14163b] text-white border-gray-700 focus:border-[#EEC367]'
                } ${lockCountdown > 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
              />
            ))}
          </div>

          <div className="text-[11px] text-gray-400 text-center">
            Passenger sees this code on their screen: <strong>"Trip Code: ####"</strong>
          </div>
        </div>
      )}

      {/* Error message */}
      {errorMsg && lockCountdown === 0 && (
        <div className="p-2.5 bg-red-950/60 border border-red-500/50 rounded-xl text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Manual Submit Button */}
      {lockCountdown === 0 && (
        <button
          type="button"
          disabled={digits.join('').length !== 4 || isVerifying}
          onClick={() => submitCode()}
          className="w-full py-3.5 bg-gradient-to-r from-[#00C853] to-[#0A7E07] hover:from-[#00b046] hover:to-[#096d06] text-white font-black rounded-2xl text-xs uppercase tracking-wider transition shadow-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isVerifying ? (
            <span>Verifying Code...</span>
          ) : (
            <>
              <Car className="w-4 h-4" />
              <span>Verify & Start Trip - In Progress</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};
