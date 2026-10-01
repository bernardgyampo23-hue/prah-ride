import React, { useState } from 'react';
import { RideRecord } from '../types';
import { db, sanitizeForFirestore } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { 
  Coins, 
  Copy, 
  Check, 
  PhoneCall, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  ExternalLink, 
  X,
  Smartphone,
  AlertCircle
} from 'lucide-react';

interface MomoPaymentPanelProps {
  ride: RideRecord;
  onClose?: () => void;
  isModal?: boolean;
}

export const MomoPaymentPanel: React.FC<MomoPaymentPanelProps> = ({ 
  ride, 
  onClose,
  isModal = false 
}) => {
  const [selectedNetwork, setSelectedNetwork] = useState<'MTN' | 'Telecel' | 'AT'>('MTN');
  const [transactionId, setTransactionId] = useState(ride.momoTransactionId || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const rawMomo = ride.driverMomoNumber || '';
  const cleanMomo = rawMomo.replace(/\s+/g, '');
  const driverName = ride.driverName || 'Verified Driver';
  const tripRef = `PR-${ride.id.slice(0, 6).toUpperCase()}`;

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const rideRef = doc(db, 'rides', ride.id);
      await updateDoc(rideRef, sanitizeForFirestore({
        paymentStatus: 'Passenger marked as paid',
        paymentMethod: 'MoMo',
        paidAt: Date.now(),
        momoTransactionId: transactionId.trim() || null,
        momoNetwork: selectedNetwork,
      }));
    } catch (err: any) {
      console.error('Failed to submit MoMo payment notice:', err);
      setErrorMsg('Could not record payment. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const ussdCodes = {
    MTN: '*170#',
    Telecel: '*110#',
    AT: '*110#',
  };

  const content = (
    <div className="bg-[#111328] border-2 border-[#EEC367]/60 rounded-3xl p-5 sm:p-7 shadow-2xl text-white space-y-6 relative">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#EEC367]/15 text-[#EEC367] flex items-center justify-center border border-[#EEC367]/40 shadow-inner">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <span>Driver MoMo Payment Panel</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#2ECC71]/20 text-[#2ECC71] border border-[#2ECC71]/30">
                Direct
              </span>
            </h3>
            <p className="text-[11px] text-gray-400">
              Pay {driverName} directly to verified Mobile Money number
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
            title="Close panel"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Payment Status Alert Banner */}
      {ride.paymentStatus === 'Payment confirmed' ? (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <div>
            <strong className="block font-bold">Payment Confirmed by Driver!</strong>
            <span className="text-[11px] text-emerald-300/90">
              {driverName} has received and verified GHS {ride.fareGhs}. Thank you for riding with Prah Ride.
            </span>
          </div>
        </div>
      ) : ride.paymentStatus === 'Passenger marked as paid' ? (
        <div className="p-3.5 rounded-2xl bg-blue-500/15 border border-blue-500/40 text-blue-400 text-xs flex items-center gap-2.5">
          <Clock className="w-5 h-5 shrink-0 animate-pulse" />
          <div>
            <strong className="block font-bold">MoMo Payment Sent · Awaiting Driver Verification</strong>
            <span className="text-[11px] text-blue-300/90">
              You marked GHS {ride.fareGhs} as sent. Driver is checking his MoMo SMS and will confirm receipt momentarily.
            </span>
          </div>
        </div>
      ) : null}

      {/* Network Selector Tabs */}
      <div>
        <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
          1. Select Your Mobile Network
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(['MTN', 'Telecel', 'AT'] as const).map((net) => (
            <button
              key={net}
              type="button"
              onClick={() => setSelectedNetwork(net)}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                selectedNetwork === net
                  ? net === 'MTN'
                    ? 'bg-[#FFCC00] text-black border-[#FFCC00] shadow-md'
                    : net === 'Telecel'
                    ? 'bg-[#E60000] text-white border-[#E60000] shadow-md'
                    : 'bg-blue-600 text-white border-blue-600 shadow-md'
                  : 'bg-[#1A1D48] text-gray-400 border-gray-800 hover:border-gray-700 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>{net === 'MTN' ? 'MTN MoMo' : net === 'Telecel' ? 'Telecel Cash' : 'AT Money'}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Driver Payment Details Box with 1-Tap Copy */}
      <div className="bg-[#1A1D48] border border-gray-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between text-[11px] text-gray-400 uppercase font-semibold pb-2 border-b border-gray-800">
          <span>Recipient Driver Info</span>
          <span className="text-[#EEC367] flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verified Driver</span>
          </span>
        </div>

        {/* Driver Name & MoMo Number */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-[10px] text-gray-400 uppercase font-bold block">Account Name</span>
            <span className="font-bold text-sm text-white">{driverName}</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right">
              <span className="text-[10px] text-gray-400 uppercase font-bold block">MoMo Number</span>
              <span className="font-mono font-bold text-sm text-[#EEC367]">{rawMomo}</span>
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(cleanMomo, 'momoNumber')}
              className="p-2 bg-[#111328] hover:bg-[#151733] border border-gray-700 hover:border-[#EEC367] text-white rounded-xl transition text-xs font-semibold flex items-center gap-1 cursor-pointer"
              title="Copy MoMo Number"
            >
              {copiedField === 'momoNumber' ? (
                <Check className="w-4 h-4 text-[#2ECC71]" />
              ) : (
                <Copy className="w-4 h-4 text-gray-400" />
              )}
              <span className="text-[11px]">{copiedField === 'momoNumber' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Fare Amount & Trip Reference */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-800/80">
          <div className="bg-[#111328] p-2.5 rounded-xl border border-gray-800 flex items-center justify-between">
            <div>
              <span className="text-[9px] uppercase font-bold text-gray-400 block">Exact Fare</span>
              <span className="text-base font-black text-[#2ECC71]">GHS {ride.fareGhs}</span>
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(String(ride.fareGhs), 'fare')}
              className="p-1.5 text-gray-400 hover:text-white transition cursor-pointer"
              title="Copy Amount"
            >
              {copiedField === 'fare' ? <Check className="w-3.5 h-3.5 text-[#2ECC71]" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="bg-[#111328] p-2.5 rounded-xl border border-gray-800 flex items-center justify-between">
            <div>
              <span className="text-[9px] uppercase font-bold text-gray-400 block">Reference</span>
              <span className="text-xs font-mono font-bold text-white">{tripRef}</span>
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(tripRef, 'ref')}
              className="p-1.5 text-gray-400 hover:text-white transition cursor-pointer"
              title="Copy Reference"
            >
              {copiedField === 'ref' ? <Check className="w-3.5 h-3.5 text-[#2ECC71]" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Quick USSD Launcher Button (Phone Quick-Dial) */}
      <div className="flex flex-col sm:flex-row items-center gap-2.5">
        <a
          href={`tel:${encodeURIComponent(ussdCodes[selectedNetwork])}`}
          className="w-full sm:flex-1 py-3 px-4 bg-[#EEC367] hover:bg-[#ffe199] text-[#1A1D48] font-black text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-lg cursor-pointer"
        >
          <PhoneCall className="w-4 h-4" />
          <span>Launch Dial {ussdCodes[selectedNetwork]} on Phone</span>
        </a>

        <div className="text-[10px] text-gray-400 text-center sm:text-left">
          Opens your phone keypad directly to authorize transfer
        </div>
      </div>

      {/* Step-by-Step Dial Instructions */}
      <div className="bg-[#111328] p-3.5 rounded-2xl border border-gray-800 text-[11px] space-y-1.5 text-gray-300">
        <span className="text-[10px] uppercase font-bold text-[#EEC367] block">
          How to Pay in 4 Steps:
        </span>
        <ol className="list-decimal list-inside space-y-1 text-gray-300 leading-relaxed">
          <li>Dial <strong>{ussdCodes[selectedNetwork]}</strong> on your phone</li>
          <li>Choose <strong>Transfer Money</strong> ➔ <strong>MoMo User</strong></li>
          <li>Enter Driver Number: <strong className="font-mono text-white">{cleanMomo}</strong> ({driverName})</li>
          <li>Enter Amount: <strong className="text-[#2ECC71]">GHS {ride.fareGhs}</strong> and Reference: <strong className="font-mono text-white">{tripRef}</strong></li>
        </ol>
      </div>

      {/* Payment Confirmation Form */}
      <form onSubmit={handleConfirmPayment} className="space-y-3 pt-2 border-t border-gray-800">
        <div>
          <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
            2. MoMo Transaction ID / SMS Reference (Optional)
          </label>
          <input
            type="text"
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
            placeholder="e.g. 240928123456 from your MoMo confirmation SMS"
            className="w-full px-3.5 py-2.5 bg-[#1A1D48] border border-gray-700 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#EEC367]"
          />
        </div>

        {errorMsg && (
          <div className="p-2.5 bg-red-950/40 border border-red-500/40 text-red-400 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || ride.paymentStatus === 'Payment confirmed'}
          className={`w-full py-3.5 font-black text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
            ride.paymentStatus === 'Payment confirmed'
              ? 'bg-emerald-600/50 text-emerald-200 cursor-not-allowed'
              : ride.paymentStatus === 'Passenger marked as paid'
              ? 'bg-blue-600 hover:bg-blue-500 text-white'
              : 'bg-[#2ECC71] hover:bg-[#27ae60] text-black'
          }`}
        >
          {isSubmitting ? (
            <span>Recording Payment...</span>
          ) : ride.paymentStatus === 'Payment confirmed' ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Payment Verified by {driverName}</span>
            </>
          ) : ride.paymentStatus === 'Passenger marked as paid' ? (
            <>
              <Check className="w-4 h-4" />
              <span>Update MoMo Payment Notice (GHS {ride.fareGhs})</span>
            </>
          ) : (
            <>
              <Coins className="w-4 h-4" />
              <span>I Have Sent GHS {ride.fareGhs} to {driverName}</span>
            </>
          )}
        </button>

        <p className="text-[10px] text-gray-400 text-center">
          Prah Ride ensures 100% of your payment goes directly to {driverName} with zero intermediary deductions.
        </p>
      </form>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-[600] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <div className="max-w-md w-full my-auto animate-fadeIn">
          {content}
        </div>
      </div>
    );
  }

  return content;
};
