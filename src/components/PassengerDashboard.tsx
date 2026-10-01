import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { db, sanitizeForFirestore } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  doc, 
  updateDoc, 
  orderBy 
} from 'firebase/firestore';
import { RideRecord, RideType, PaymentMethod, PaymentStatus, ComplaintTicket } from '../types';
import { checkOperatingHours, SEKONDI_TAKORADI_LANDMARKS, calculateDistanceKm } from '../lib/constants';
import { calculateFixedFare, FareCalculationResult } from '../services/fareService';
import { generateUniqueTripCode, saveTripCode } from '../lib/supabase';
import { LeafletMap } from './LeafletMap';
import { LiveRideMap } from './LiveRideMap';
import { AddressSearchInput } from './AddressSearchInput';
import { PrahRideLogo } from './PrahRideLogo';
import { StarRatingModal } from './StarRatingModal';
import { 
  Car, 
  Plane, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  LogOut, 
  Phone, 
  MapPin, 
  Receipt, 
  HelpCircle, 
  Send, 
  XCircle, 
  Coins, 
  ShieldCheck, 
  ChevronRight,
  Star,
  Search,
  Filter,
  Calendar,
  RotateCcw,
  ArrowRight,
  CreditCard,
  Sparkles,
  History,
  Crosshair
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const PassengerDashboard: React.FC = () => {
  const { profile, logout } = useAuth();
  const operatingStatus = checkOperatingHours();

  // Active sub-views: 'book' | 'history' | 'profile' | 'support'
  const [activeTab, setActiveTab] = useState<'book' | 'history' | 'profile' | 'support'>('book');

  // Booking State
  const [rideType, setRideType] = useState<RideType>('Everyday');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('MoMo');
  const [pickup, setPickup] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [dropoff, setDropoff] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [mapPickMode, setMapPickMode] = useState<'pickup' | 'dropoff' | 'view'>('view');
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [isSubmittingRide, setIsSubmittingRide] = useState(false);
  const [isLocatingUser, setIsLocatingUser] = useState(false);

  // Active Ride and Ride History state from Firestore
  const [activeRide, setActiveRide] = useState<RideRecord | null>(null);
  const [rideHistory, setRideHistory] = useState<RideRecord[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<RideRecord | null>(null);
  const [ratingModalRide, setRatingModalRide] = useState<RideRecord | null>(null);
  const [dismissedRatingRideId, setDismissedRatingRideId] = useState<string | null>(null);

  // Support / Complaint Ticket State
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSuccess, setSupportSuccess] = useState(false);

  // Distance-based Fixed Fare Estimation State
  const [showFareBreakdown, setShowFareBreakdown] = useState(false);

  const estimatedFare = React.useMemo(() => {
    if (!pickup || !dropoff) return null;
    return calculateFixedFare(pickup, dropoff, rideType);
  }, [pickup, dropoff, rideType]);

  // Find the most recent completed ride that has not been rated yet
  const latestUnratedCompletedRide = React.useMemo(() => {
    return rideHistory.find(
      (r) => r.status === 'completed' && !r.driverRating && r.id !== dismissedRatingRideId
    );
  }, [rideHistory, dismissedRatingRideId]);

  // Trip History Search and Filters State
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'completed' | 'cancelled'>('all');
  const [historyTierFilter, setHistoryTierFilter] = useState<'all' | 'Everyday' | 'Airport'>('all');

  // Summary Metrics for Trip History
  const historyMetrics = React.useMemo(() => {
    const totalTrips = rideHistory.length;
    const completedTrips = rideHistory.filter((r) => r.status === 'completed');
    const cancelledTrips = rideHistory.filter((r) => r.status === 'cancelled');
    const totalSpent = completedTrips.reduce((acc, curr) => acc + (curr.fareGhs || 0), 0);
    const everydayCount = rideHistory.filter((r) => r.rideType === 'Everyday').length;
    const airportCount = rideHistory.filter((r) => r.rideType === 'Airport').length;
    const ratedTrips = completedTrips.filter((r) => typeof r.driverRating === 'number');
    const avgRating = ratedTrips.length > 0 
      ? (ratedTrips.reduce((acc, curr) => acc + (curr.driverRating || 0), 0) / ratedTrips.length).toFixed(1)
      : null;

    return {
      totalTrips,
      completedCount: completedTrips.length,
      cancelledCount: cancelledTrips.length,
      totalSpent,
      favoriteTier: everydayCount >= airportCount ? 'Everyday' : 'Airport',
      avgRating,
      ratedCount: ratedTrips.length,
    };
  }, [rideHistory]);

  // Filtered Ride History List
  const filteredRideHistory = React.useMemo(() => {
    return rideHistory.filter((ride) => {
      // Status filter
      if (historyStatusFilter !== 'all' && ride.status !== historyStatusFilter) {
        return false;
      }
      // Tier filter
      if (historyTierFilter !== 'all' && ride.rideType !== historyTierFilter) {
        return false;
      }
      // Search Query filter
      if (historySearchQuery.trim()) {
        const q = historySearchQuery.toLowerCase();
        const matchesPickup = ride.pickupAddress?.toLowerCase().includes(q);
        const matchesDropoff = ride.dropoffAddress?.toLowerCase().includes(q);
        const matchesDriver = ride.driverName?.toLowerCase().includes(q);
        const matchesType = ride.rideType?.toLowerCase().includes(q);
        const matchesId = ride.id?.toLowerCase().includes(q);
        return matchesPickup || matchesDropoff || matchesDriver || matchesType || matchesId;
      }
      return true;
    });
  }, [rideHistory, historyStatusFilter, historyTierFilter, historySearchQuery]);

  // Rebook an existing past trip
  const handleRebookTrip = (ride: RideRecord) => {
    setPickup({
      lat: ride.pickupLat,
      lng: ride.pickupLng,
      address: ride.pickupAddress,
    });
    setDropoff({
      lat: ride.dropoffLat,
      lng: ride.dropoffLng,
      address: ride.dropoffAddress,
    });
    setRideType(ride.rideType);
    setPaymentMethod(ride.paymentMethod);
    setActiveTab('book');
  };

  // Quick Support link for a specific trip
  const handleOpenSupportForTrip = (ride: RideRecord) => {
    setSupportSubject(`Booking Ref #${ride.id.slice(0, 8).toUpperCase()} Inquiry`);
    setSupportMessage(
      `Hello Prah Ride Support, I have a query regarding my ${ride.rideType} trip on ${new Date(ride.createdAt).toLocaleDateString('en-GB')} from ${ride.pickupAddress} to ${ride.dropoffAddress} (Fare: GHS ${ride.fareGhs}, Driver: ${ride.driverName || 'Twin City Driver'}).\n\nDetails of my issue: `
    );
    setActiveTab('support');
  };

  // Quick Preset Location Helper
  const setQuickPickup = (name: string, lat: number, lng: number) => {
    setPickup({ lat, lng, address: name });
  };
  const setQuickDropoff = (name: string, lat: number, lng: number) => {
    setDropoff({ lat, lng, address: name });
  };

  // Real Hardware Device GPS Geolocation
  const handleUseDeviceLocation = () => {
    if (!('geolocation' in navigator)) {
      alert('Geolocation is not supported on this browser.');
      return;
    }
    setIsLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();
          const address = data.display_name?.split(',').slice(0, 3).join(', ') || 'Current GPS Location';
          setPickup({ lat: latitude, lng: longitude, address: `${address}` });
        } catch {
          setPickup({ lat: latitude, lng: longitude, address: `Current Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})` });
        } finally {
          setIsLocatingUser(false);
        }
      },
      () => {
        setIsLocatingUser(false);
        alert('Could not access current location. Please ensure location services are enabled on your device.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Real-time Firestore Listeners for Passenger Rides
  useEffect(() => {
    if (!profile?.uid) return;

    // Listen to passenger's rides
    const ridesQuery = query(
      collection(db, 'rides'),
      where('passengerId', '==', profile.uid)
    );

    const unsubscribe = onSnapshot(ridesQuery, (snapshot) => {
      const records: RideRecord[] = [];
      snapshot.forEach(docSnap => {
        records.push({ id: docSnap.id, ...docSnap.data() } as RideRecord);
      });

      // Sort by creation desc
      records.sort((a, b) => b.createdAt - a.createdAt);

      setRideHistory(records);

      // Find if there is an in-flight active ride
      const ongoing = records.find(r => 
        ['requested', 'accepted', 'arriving', 'in_progress'].includes(r.status)
      );

      if (ongoing) {
        setActiveRide(ongoing);
      } else {
        // If an active ride was in progress and just completed
        const latest = records[0];
        if (latest && latest.status === 'completed' && !latest.driverRating && latest.id !== dismissedRatingRideId) {
          // If the ride was completed recently (within the last 2 hours)
          const isRecent = Date.now() - (latest.completedAt || latest.createdAt) < 2 * 60 * 60 * 1000;
          if (isRecent) {
            setRatingModalRide(latest);
          }
        }
        setActiveRide(null);
      }
    }, (error) => {
      console.warn("Passenger rides sync notice:", error);
    });

    return () => unsubscribe();
  }, [profile?.uid, dismissedRatingRideId]);

  // High-frequency real-time listener for the active ride document to stream GPS coordinates
  useEffect(() => {
    if (!activeRide?.id) return;
    const unsubRide = onSnapshot(doc(db, 'rides', activeRide.id), (docSnap) => {
      if (docSnap.exists()) {
        const updated = { id: docSnap.id, ...docSnap.data() } as RideRecord;
        if (updated.status === 'completed') {
          // Ride completed in real time!
          setActiveRide(null);
          if (!updated.driverRating) {
            setRatingModalRide(updated);
          }
          try {
            confetti({ particleCount: 70, spread: 60 });
          } catch {}
        } else {
          setActiveRide(updated);
        }
      }
    }, (error) => {
      console.warn("Active ride sync notice:", error);
    });
    return () => unsubRide();
  }, [activeRide?.id]);

  // Request Ride Handler
  const handleRequestRide = async () => {
    setBookingError(null);

    // 1. Operating Hours Check (Africa/Accra GMT Mon-Sat 7am-10pm)
    const hours = checkOperatingHours();
    if (!hours.isOpen) {
      setBookingError(hours.message);
      return;
    }

    if (!pickup || !dropoff) {
      setBookingError('Please specify both Pickup and Drop-off locations in Sekondi-Takoradi.');
      return;
    }

    if (!profile) return;

    setIsSubmittingRide(true);

    try {
      const fare = estimatedFare ? estimatedFare.totalFixedFareGhs : (rideType === 'Everyday' ? 35 : 50);

      const newRide: Omit<RideRecord, 'id'> = {
        passengerId: profile.uid || '',
        passengerName: profile.fullName || 'Passenger',
        passengerPhone: profile.phone || '',
        driverId: null,
        driverName: null,
        driverPhone: null,
        driverPhotoUrl: null,
        driverVehicle: null,
        driverPlate: null,
        driverMomoNumber: null,
        driverLat: null,
        driverLng: null,
        driverHeading: null,
        driverSpeedKmh: null,
        rideType: rideType || 'Everyday',
        fareGhs: fare || 35,
        paymentMethod: paymentMethod || 'Cash',
        paymentStatus: 'Awaiting payment',
        paidAt: null,
        paymentConfirmedBy: null,
        pickupAddress: pickup.address || 'Pickup Point',
        pickupLat: pickup.lat ?? 4.8967,
        pickupLng: pickup.lng ?? -1.7554,
        dropoffAddress: dropoff.address || 'Drop-off Destination',
        dropoffLat: dropoff.lat ?? 4.8967,
        dropoffLng: dropoff.lng ?? -1.7554,
        status: 'requested',
        createdAt: Date.now(),
        tripCode: null, // Will be set with unique 4-digit code below
        tripCodeExpiresAt: null,
        tripCodeUsed: false,
        acceptedAt: null,
        arrivedAt: null,
        startedAt: null,
        completedAt: null,
        cancelledAt: null,
        cancellationReason: null,
        driverRating: null,
        driverRatingFeedback: null,
        driverRatingTags: null,
        ratedAt: null,
      };

      // 1. Generate unique 4-digit code (1000-9999) never used in last 50 rides
      const uniqueCode = await generateUniqueTripCode();
      const codeExpiresAt = Date.now() + 15 * 60 * 1000; // 15 mins expiry
      newRide.tripCode = uniqueCode;
      newRide.tripCodeExpiresAt = codeExpiresAt;

      // 2. Write to Firestore rides collection
      const docRef = await addDoc(collection(db, 'rides'), sanitizeForFirestore(newRide));

      // 3. Save into Supabase table trip_codes and Firestore collection trip_codes
      await saveTripCode(docRef.id, uniqueCode);

      // Switch map pick back to view
      setMapPickMode('view');
    } catch (err: any) {
      setBookingError(err.message || 'Failed to submit ride request.');
    } finally {
      setIsSubmittingRide(false);
    }
  };

  // Passenger taps "I've Paid"
  const handlePassengerMarkedPaid = async () => {
    if (!activeRide) return;
    try {
      const docRef = doc(db, 'rides', activeRide.id);
      await updateDoc(docRef, sanitizeForFirestore({
        paymentStatus: 'Passenger marked as paid',
        paidAt: Date.now(),
        paymentConfirmedBy: 'passenger',
      }));
      confetti({ particleCount: 50, spread: 70 });
    } catch (err: any) {
      console.error(err);
    }
  };

  // Cancel Ride (Allowed prior to pickup / during requested or accepted)
  const handleCancelRide = async () => {
    if (!activeRide) return;
    const confirmed = window.confirm("Are you sure you want to cancel this ride request?");
    if (!confirmed) return;

    try {
      const docRef = doc(db, 'rides', activeRide.id);
      await updateDoc(docRef, sanitizeForFirestore({
        status: 'cancelled',
        cancelledAt: Date.now(),
        cancellationReason: 'Cancelled by passenger',
      }));
    } catch (err: any) {
      console.error(err);
    }
  };

  // Submit Support Ticket
  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !supportSubject || !supportMessage) return;

    try {
      const newTicket: Omit<ComplaintTicket, 'id'> = {
        userId: profile.uid || 'unknown',
        userRole: 'passenger',
        userName: profile.fullName || 'Passenger',
        userEmail: profile.email || '',
        userPhone: profile.phone || '',
        rideId: activeRide?.id || null,
        subject: supportSubject.trim() || 'General Inquiry',
        description: supportMessage.trim() || '',
        category: 'other',
        status: 'open',
        adminNotes: '',
        createdAt: Date.now(),
        resolvedAt: null,
      };
      await addDoc(collection(db, 'complaints'), sanitizeForFirestore(newTicket));
      setSupportSuccess(true);
      setSupportSubject('');
      setSupportMessage('');
      setTimeout(() => setSupportSuccess(false), 5000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#111333] text-white flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-[#1A1D48] border-b border-[#EEC367]/20 px-4 py-3 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <PrahRideLogo size="sm" />

          {/* Navigation Pill Tabs */}
          <div className="flex items-center gap-1 sm:gap-2 bg-[#111333] p-1 rounded-xl border border-gray-800 text-xs">
            <button
              onClick={() => setActiveTab('book')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                activeTab === 'book' ? 'bg-[#EEC367] text-[#1A1D48]' : 'text-gray-400 hover:text-white'
              }`}
            >
              {activeRide ? 'Active Ride' : 'Book a Ride'}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'history' ? 'bg-[#EEC367] text-[#1A1D48]' : 'text-gray-400 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Trip History</span>
              {rideHistory.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === 'history' ? 'bg-[#1A1D48] text-[#EEC367]' : 'bg-[#1A1D48] text-gray-300 border border-gray-700'
                }`}>
                  {rideHistory.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('support')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                activeTab === 'support' ? 'bg-[#EEC367] text-[#1A1D48]' : 'text-gray-400 hover:text-white'
              }`}
            >
              Support
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <div className="text-xs font-bold text-white">{profile?.fullName}</div>
              <div className="text-[10px] text-[#EEC367]">Passenger</div>
            </div>
            <button
              onClick={() => logout()}
              title="Sign Out"
              className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        
        {/* TAB 1: BOOKING & ACTIVE RIDE */}
        {activeTab === 'book' && (
          <div>
            {/* If an active ride exists, display the Uber Black Full Screen Mobile-First LiveRideMap */}
            {activeRide ? (
              <div className="w-full">
                <LiveRideMap
                  ride={activeRide}
                  onCancelRide={handleCancelRide}
                  onPassengerMarkedPaid={handlePassengerMarkedPaid}
                />
              </div>
            ) : (
              /* NO ACTIVE RIDE: BOOK A RIDE PANEL */
              <div className="space-y-8">
                {/* INLINE STAR RATING CARD (Appears immediately after trip is completed) */}
                {latestUnratedCompletedRide && (
                  <div className="max-w-2xl mx-auto">
                    <StarRatingModal
                      ride={latestUnratedCompletedRide}
                      inline={true}
                      onClose={() => setDismissedRatingRideId(latestUnratedCompletedRide.id)}
                      onRatingSubmitted={(rating) => {
                        setRideHistory((prev) =>
                          prev.map((r) =>
                            r.id === latestUnratedCompletedRide.id
                              ? { ...r, driverRating: rating, ratedAt: Date.now() }
                              : r
                          )
                        );
                        setDismissedRatingRideId(latestUnratedCompletedRide.id);
                      }}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left Column: Form & Fare selector */}
                <div className="lg:col-span-5 bg-[#1A1D48] border-2 border-[#EEC367]/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-[#EEC367] uppercase tracking-widest">Sekondi-Takoradi Dispatch</span>
                      <h2 
                        style={{ fontFamily: "'Cinzel', serif" }}
                        className="text-2xl font-bold text-white mt-1"
                      >
                        Book a Fixed-Fare Ride
                      </h2>
                      <p className="text-xs text-gray-300 mt-1">
                        No bargaining. No surge pricing. Guaranteed fixed rates.
                      </p>
                    </div>

                    {rideHistory.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('history')}
                        className="text-xs text-[#EEC367] hover:underline flex items-center gap-1.5 font-semibold shrink-0 py-1.5 px-3 bg-[#111333] hover:bg-[#111333]/80 rounded-xl border border-[#EEC367]/40 shadow-sm cursor-pointer transition"
                      >
                        <History className="w-3.5 h-3.5" />
                        <span>Past Trips ({rideHistory.length})</span>
                      </button>
                    )}
                  </div>

                  {/* CLOSED NOTICE IF OUTSIDE OPERATING HOURS */}
                  {!operatingStatus.isOpen ? (
                    <div className="p-5 bg-red-950/70 border-2 border-red-500/60 rounded-2xl text-center space-y-3">
                      <Clock className="w-8 h-8 text-red-400 mx-auto" />
                      <h4 className="text-base font-bold text-white">We're Currently Closed</h4>
                      <p className="text-xs text-gray-300 leading-relaxed">
                        Prah Ride operating hours are <strong>Monday–Saturday, 7:00 AM – 10:00 PM GMT</strong>. We are closed all day Sunday.
                      </p>
                      <div className="text-[11px] text-[#EEC367] font-semibold bg-[#111333] py-2 px-3 rounded-xl inline-block border border-gray-800">
                        Current Twin City Time: {operatingStatus.currentTimeString} ({operatingStatus.currentDayName})
                      </div>
                    </div>
                  ) : (
                    <>
                      {bookingError && (
                        <div className="p-3.5 rounded-xl bg-red-900/40 border border-red-500/50 text-xs text-red-200 flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                          <span>{bookingError}</span>
                        </div>
                      )}

                      {/* Ride Type Selector (Only 2 flat-fare types per brief) */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                          Select Service Tier
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setRideType('Everyday')}
                            className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between ${
                              rideType === 'Everyday'
                                ? 'bg-[#111333] border-[#EEC367] shadow-lg ring-1 ring-[#EEC367]'
                                : 'bg-[#111333]/50 border-gray-800 hover:border-gray-700'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <Car className="w-5 h-5 text-[#EEC367]" />
                              <span className="text-[11px] font-bold text-[#2ECC71]">
                                {estimatedFare && rideType === 'Everyday' ? `~GHS ${estimatedFare.totalFixedFareGhs}` : 'Distance-Based'}
                              </span>
                            </div>
                            <div>
                              <div className="font-bold text-sm text-white">Everyday</div>
                              <div className="text-[11px] text-gray-400">Standard commute</div>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => setRideType('Airport')}
                            className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between ${
                              rideType === 'Airport'
                                ? 'bg-[#111333] border-[#EEC367] shadow-lg ring-1 ring-[#EEC367]'
                                : 'bg-[#111333]/50 border-gray-800 hover:border-gray-700'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <Plane className="w-5 h-5 text-[#EEC367]" />
                              <span className="text-[11px] font-bold text-[#2ECC71]">
                                {estimatedFare && rideType === 'Airport' ? `~GHS ${estimatedFare.totalFixedFareGhs}` : 'Terminal Route'}
                              </span>
                            </div>
                            <div>
                              <div className="font-bold text-sm text-white">Airport</div>
                              <div className="text-[11px] text-gray-400">Takoradi Airport base</div>
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* Address Inputs with Nominatim search + tap to pin */}
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-1 px-1">
                            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Step 1: Pickup Location</span>
                            <button
                              type="button"
                              onClick={handleUseDeviceLocation}
                              disabled={isLocatingUser}
                              className="text-[11px] text-[#EEC367] hover:underline flex items-center gap-1 font-bold cursor-pointer disabled:opacity-50"
                            >
                              <Crosshair className={`w-3.5 h-3.5 text-[#EEC367] ${isLocatingUser ? 'animate-spin' : ''}`} />
                              <span>{isLocatingUser ? 'Detecting Device GPS...' : 'Use My Device Location'}</span>
                            </button>
                          </div>
                          <AddressSearchInput
                            label="Pickup Location"
                            badge="A"
                            badgeColor="#EEC367"
                            value={pickup?.address || ''}
                            placeholder="e.g. Market Circle, Effiakuma, Anaji..."
                            onSelect={(c) => setPickup(c)}
                            onActivateMapPick={() => setMapPickMode(mapPickMode === 'pickup' ? 'view' : 'pickup')}
                            isActivePick={mapPickMode === 'pickup'}
                          />
                        </div>

                        <AddressSearchInput
                          label="Drop-off Destination"
                          badge="B"
                          badgeColor="#2ECC71"
                          value={dropoff?.address || ''}
                          placeholder="e.g. Vienna Beach, Sekondi European Town..."
                          onSelect={(c) => setDropoff(c)}
                          onActivateMapPick={() => setMapPickMode(mapPickMode === 'dropoff' ? 'view' : 'dropoff')}
                          isActivePick={mapPickMode === 'dropoff'}
                        />
                      </div>

                      {/* Popular Quick Presets in Sekondi-Takoradi */}
                      <div>
                        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-2">
                          Popular Sekondi-Takoradi Hubs
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {SEKONDI_TAKORADI_LANDMARKS.slice(0, 5).map((hub, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                if (!pickup) setQuickPickup(hub.name, hub.lat, hub.lng);
                                else setQuickDropoff(hub.name, hub.lat, hub.lng);
                              }}
                              className="text-[11px] px-2.5 py-1 rounded-lg bg-[#111333] hover:bg-[#EEC367]/20 border border-gray-800 text-gray-300 transition"
                            >
                              + {hub.name.split('(')[0]}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Payment Method Selector (Cash or Driver MoMo) */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                          Payment Option (Paid directly to driver)
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('MoMo')}
                            className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                              paymentMethod === 'MoMo'
                                ? 'bg-[#111333] border-[#EEC367] text-white shadow'
                                : 'bg-[#111333]/50 border-gray-800 text-gray-400'
                            }`}
                          >
                            <Phone className="w-3.5 h-3.5 text-[#EEC367]" />
                            <span>Driver MoMo</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setPaymentMethod('Cash')}
                            className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                              paymentMethod === 'Cash'
                                ? 'bg-[#111333] border-[#EEC367] text-white shadow'
                                : 'bg-[#111333]/50 border-gray-800 text-gray-400'
                            }`}
                          >
                            <Coins className="w-3.5 h-3.5 text-[#EEC367]" />
                            <span>Cash on Arrival</span>
                          </button>
                        </div>
                      </div>

                      {/* Distance-based Fixed Fare Estimate Display */}
                      {estimatedFare ? (
                        <div className="bg-[#111333] border-2 border-[#EEC367]/60 rounded-2xl p-4 shadow-xl space-y-3">
                          <div className="flex items-center justify-between pb-2 border-b border-gray-800">
                            <div>
                              <span className="text-[10px] text-[#EEC367] uppercase font-bold tracking-wider flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Estimated Distance Fare</span>
                              </span>
                              <div className="text-xs text-gray-300 font-medium mt-0.5">{estimatedFare.distanceBracket}</div>
                            </div>
                            <div className="text-right">
                              <span className="text-3xl font-black text-[#2ECC71]">
                                GHS {estimatedFare.totalFixedFareGhs}
                              </span>
                              <span className="text-[10px] text-gray-400 block font-semibold uppercase">Calculated Fare</span>
                            </div>
                          </div>

                          {/* Route Metrics: Calculated Distance & Estimated Drive Time */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-[#1A1D48] p-2.5 rounded-xl border border-gray-800 flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-[#EEC367] shrink-0" />
                              <div>
                                <span className="text-[10px] text-gray-400 block font-semibold uppercase">Calculated Route</span>
                                <span className="text-xs font-bold text-white">{estimatedFare.distanceKm} km distance</span>
                              </div>
                            </div>
                            <div className="bg-[#1A1D48] p-2.5 rounded-xl border border-gray-800 flex items-center gap-2">
                              <Clock className="w-4 h-4 text-[#2ECC71] shrink-0" />
                              <div>
                                <span className="text-[10px] text-gray-400 block font-semibold uppercase">Estimated Time</span>
                                <span className="text-xs font-bold text-[#2ECC71]">~{estimatedFare.durationMinutes} mins drive</span>
                              </div>
                            </div>
                          </div>

                          {/* Collapsible Fare Breakdown */}
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => setShowFareBreakdown(!showFareBreakdown)}
                              className="text-[11px] text-[#EEC367] hover:underline flex items-center justify-between w-full font-semibold cursor-pointer"
                            >
                              <span>{showFareBreakdown ? 'Hide Calculation Breakdown' : 'View Distance Fare Breakdown'}</span>
                              <span className="text-xs">{showFareBreakdown ? '▲' : '▼'}</span>
                            </button>

                            {showFareBreakdown && (
                              <div className="mt-2 p-3 rounded-xl bg-[#1A1D48] border border-gray-800 text-[11px] space-y-1.5 text-gray-300 animate-fadeIn">
                                <div className="flex justify-between">
                                  <span>Base Dispatch Rate:</span>
                                  <span className="text-white font-mono">GHS {estimatedFare.baseFareGhs}.00</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Distance Band Rate:</span>
                                  <span className="text-white font-mono">
                                    {estimatedFare.distanceFareGhs > 0 ? `+ GHS ${estimatedFare.distanceFareGhs}.00` : 'Covered in base rate'}
                                  </span>
                                </div>
                                <div className="flex justify-between pt-1.5 border-t border-gray-800 font-bold text-white">
                                  <span>Total Fixed Fare:</span>
                                  <span className="text-[#2ECC71] font-mono text-sm font-black">GHS {estimatedFare.totalFixedFareGhs}.00</span>
                                </div>
                                <div className="text-[10px] text-gray-400 pt-1 leading-tight">
                                  * {estimatedFare.fareNotice}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-2xl bg-[#111333] border border-dashed border-gray-700 text-center space-y-1">
                          <span className="text-xs text-gray-300 font-semibold block flex items-center justify-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-[#EEC367]" />
                            <span>Select Pickup & Drop-off</span>
                          </span>
                          <span className="text-[11px] text-gray-400 block">
                            Sekondi-Takoradi distance & fixed fare will calculate automatically.
                          </span>
                        </div>
                      )}

                      {/* Request Ride CTA */}
                      <button
                        type="button"
                        onClick={handleRequestRide}
                        disabled={isSubmittingRide || !pickup || !dropoff}
                        className="w-full py-4 bg-[#EEC367] hover:bg-[#ffe199] text-[#1A1D48] text-base font-bold rounded-2xl transition shadow-xl shadow-[#EEC367]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isSubmittingRide ? (
                          <div className="w-5 h-5 border-2 border-[#1A1D48] border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <span>
                              {estimatedFare 
                                ? `Confirm & Book Ride · GHS ${estimatedFare.totalFixedFareGhs}`
                                : `Select Route to View Fare`}
                            </span>
                            <ChevronRight className="w-5 h-5" />
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>

                {/* Right Column: Interactive Leaflet OpenStreetMap */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="bg-[#1A1D48] border border-[#EEC367]/30 rounded-3xl p-5 shadow-2xl">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-white text-base">Sekondi-Takoradi Map</h3>
                        <p className="text-xs text-gray-400">
                          {mapPickMode !== 'view' 
                            ? `Tap anywhere on the map to set ${mapPickMode === 'pickup' ? 'Pickup' : 'Drop-off'}`
                            : 'OpenStreetMap view of the Western Region Twin City'}
                        </p>
                      </div>
                      {mapPickMode !== 'view' && (
                        <button
                          onClick={() => setMapPickMode('view')}
                          className="px-3 py-1 bg-gray-800 text-xs text-gray-300 rounded-lg hover:text-white"
                        >
                          Done Pinning
                        </button>
                      )}
                    </div>

                    <LeafletMap
                      height="400px"
                      pickupCoords={pickup}
                      dropoffCoords={dropoff}
                      selectionMode={mapPickMode}
                      onSelectCoords={(coords, mode) => {
                        if (mode === 'pickup') {
                          setPickup(coords);
                          setMapPickMode('dropoff'); // automatically switch to pick destination next
                        } else if (mode === 'dropoff') {
                          setDropoff(coords);
                          setMapPickMode('view');
                        }
                      }}
                    />
                  </div>
                </div>

                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TRIP HISTORY & RECEIPTS */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            {/* Header & Subtitle */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEC367]/15 border border-[#EEC367]/30 text-[#EEC367] text-[10px] uppercase font-bold tracking-widest mb-1.5">
                  <History className="w-3.5 h-3.5" />
                  <span>Sekondi-Takoradi Trip Log</span>
                </div>
                <h2 style={{ fontFamily: "'Cinzel', serif" }} className="text-2xl sm:text-3xl font-bold text-white">
                  Trip History
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  All past ride bookings with route coordinates, fixed fares, timestamps, driver profiles, and receipts.
                </p>
              </div>

              <button
                onClick={() => setActiveTab('book')}
                className="self-start sm:self-auto px-4 py-2.5 bg-[#EEC367] hover:bg-[#ffe199] text-[#1A1D48] font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer"
              >
                <Car className="w-4 h-4" />
                <span>Book a New Ride</span>
              </button>
            </div>

            {/* Overview Metric Cards */}
            {rideHistory.length > 0 && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-[#1A1D48] border border-[#EEC367]/25 rounded-2xl p-4 sm:p-5 shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Total Bookings</span>
                    <History className="w-4 h-4 text-[#EEC367]" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-white">{historyMetrics.totalTrips}</div>
                  <div className="text-[10px] text-[#2ECC71] mt-1 font-medium">
                    {historyMetrics.completedCount} completed · {historyMetrics.cancelledCount} cancelled
                  </div>
                </div>

                <div className="bg-[#1A1D48] border border-[#EEC367]/25 rounded-2xl p-4 sm:p-5 shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Total Fares Paid</span>
                    <Coins className="w-4 h-4 text-[#2ECC71]" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-[#2ECC71]">GHS {historyMetrics.totalSpent}</div>
                  <div className="text-[10px] text-gray-400 mt-1">Guaranteed fixed rates</div>
                </div>

                <div className="bg-[#1A1D48] border border-[#EEC367]/25 rounded-2xl p-4 sm:p-5 shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Top Service Tier</span>
                    {historyMetrics.favoriteTier === 'Airport' ? (
                      <Plane className="w-4 h-4 text-[#EEC367]" />
                    ) : (
                      <Car className="w-4 h-4 text-[#EEC367]" />
                    )}
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-white">{historyMetrics.favoriteTier}</div>
                  <div className="text-[10px] text-gray-400 mt-1">
                    {historyMetrics.favoriteTier === 'Everyday' ? 'Everyday Urban Ride' : 'Airport Terminal Express'}
                  </div>
                </div>

                <div className="bg-[#1A1D48] border border-[#EEC367]/25 rounded-2xl p-4 sm:p-5 shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Driver Rating Avg</span>
                    <Star className="w-4 h-4 text-[#EEC367] fill-[#EEC367]" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-[#EEC367]">
                    {historyMetrics.avgRating ? `${historyMetrics.avgRating} ★` : '—'}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1">
                    {historyMetrics.ratedCount} of {historyMetrics.completedCount} trips reviewed
                  </div>
                </div>
              </div>
            )}

            {/* Filter and Search Bar */}
            {rideHistory.length > 0 && (
              <div className="bg-[#1A1D48] border border-gray-800 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={historySearchQuery}
                    onChange={(e) => setHistorySearchQuery(e.target.value)}
                    placeholder="Search by pickup, drop-off, driver name, tier, or booking ID..."
                    className="w-full pl-9 pr-4 py-2 bg-[#111333] border border-gray-700 rounded-xl text-xs text-white focus:outline-none focus:border-[#EEC367] placeholder-gray-500"
                  />
                  {historySearchQuery && (
                    <button
                      onClick={() => setHistorySearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-2">
                  <select
                    value={historyStatusFilter}
                    onChange={(e) => setHistoryStatusFilter(e.target.value as any)}
                    className="px-3 py-2 bg-[#111333] border border-gray-700 rounded-xl text-xs text-white focus:outline-none focus:border-[#EEC367] cursor-pointer"
                  >
                    <option value="all">All Statuses ({rideHistory.length})</option>
                    <option value="completed">Completed Only ({historyMetrics.completedCount})</option>
                    <option value="cancelled">Cancelled Only ({historyMetrics.cancelledCount})</option>
                  </select>

                  {/* Tier Filter */}
                  <select
                    value={historyTierFilter}
                    onChange={(e) => setHistoryTierFilter(e.target.value as any)}
                    className="px-3 py-2 bg-[#111333] border border-gray-700 rounded-xl text-xs text-white focus:outline-none focus:border-[#EEC367] cursor-pointer"
                  >
                    <option value="all">All Service Tiers</option>
                    <option value="Everyday">Everyday Ride</option>
                    <option value="Airport">Airport Transfer</option>
                  </select>
                </div>
              </div>
            )}

            {/* Results Count & Empty State */}
            {rideHistory.length === 0 ? (
              <div className="bg-[#1A1D48] border-2 border-gray-800 rounded-3xl p-10 sm:p-14 text-center max-w-lg mx-auto shadow-2xl space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-[#EEC367]/10 border border-[#EEC367]/30 flex items-center justify-center text-[#EEC367] mx-auto shadow-inner">
                  <Car className="w-8 h-8" />
                </div>
                <div>
                  <h3 style={{ fontFamily: "'Cinzel', serif" }} className="text-xl font-bold text-white">
                    No Trip Bookings Yet
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed max-w-sm mx-auto">
                    When you request a ride in Sekondi-Takoradi, all booking timestamps, routes, flat fares, driver details, and official receipts will be preserved here.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('book')}
                  className="px-6 py-3 bg-[#EEC367] hover:bg-[#ffe199] text-[#1A1D48] font-bold text-xs rounded-xl shadow-lg transition cursor-pointer"
                >
                  Book Your First Ride
                </button>
              </div>
            ) : filteredRideHistory.length === 0 ? (
              <div className="bg-[#1A1D48] border border-gray-800 rounded-3xl p-10 text-center max-w-md mx-auto space-y-3">
                <Search className="w-10 h-10 text-gray-500 mx-auto" />
                <h4 className="text-sm font-bold text-white">No Trips Match Your Filters</h4>
                <p className="text-xs text-gray-400">
                  Try adjusting your search query or reset the status and tier filters.
                </p>
                <button
                  onClick={() => {
                    setHistorySearchQuery('');
                    setHistoryStatusFilter('all');
                    setHistoryTierFilter('all');
                  }}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-xs text-gray-400 flex items-center justify-between px-1">
                  <span>Showing <strong>{filteredRideHistory.length}</strong> {filteredRideHistory.length === 1 ? 'trip' : 'trips'} in Sekondi-Takoradi</span>
                  <span className="text-[11px] text-[#EEC367]">All fares strictly fixed · No surge</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {filteredRideHistory.map((ride) => {
                    const distanceKm = (
                      ride.pickupLat && ride.pickupLng && ride.dropoffLat && ride.dropoffLng
                        ? calculateDistanceKm(ride.pickupLat, ride.pickupLng, ride.dropoffLat, ride.dropoffLng)
                        : 0
                    ).toFixed(1);

                    return (
                      <div
                        key={ride.id}
                        className="bg-[#1A1D48] border-2 border-[#EEC367]/25 hover:border-[#EEC367]/60 rounded-3xl p-5 sm:p-6 shadow-xl transition-all flex flex-col justify-between space-y-4 text-left group"
                      >
                        {/* Top Meta Header: Date, Booking ID, and Status */}
                        <div>
                          <div className="flex items-center justify-between pb-3 border-b border-gray-800/80 gap-2">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-[#EEC367] shrink-0" />
                              <div>
                                <span className="text-xs font-bold text-white block">
                                  {new Date(ride.createdAt).toLocaleDateString('en-GB', {
                                    weekday: 'short',
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </span>
                                <span className="text-[10px] text-gray-400 font-mono">
                                  {new Date(ride.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} GMT
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-gray-400 bg-[#111333] px-2 py-0.5 rounded-lg border border-gray-800">
                                #{ride.id.slice(0, 8).toUpperCase()}
                              </span>
                              <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1 ${
                                ride.status === 'completed'
                                  ? 'bg-[#2ECC71]/15 text-[#2ECC71] border border-[#2ECC71]/40'
                                  : ride.status === 'cancelled'
                                  ? 'bg-red-500/15 text-red-400 border border-red-500/40'
                                  : 'bg-amber-500/15 text-amber-400 border border-amber-500/40'
                              }`}>
                                {ride.status === 'completed' && <CheckCircle className="w-3 h-3" />}
                                {ride.status === 'cancelled' && <XCircle className="w-3 h-3" />}
                                <span>{ride.status}</span>
                              </span>
                            </div>
                          </div>

                          {/* Route Flow (Pickup to Destination) */}
                          <div className="py-4 space-y-3">
                            <div className="flex items-start gap-3">
                              <div className="w-6 h-6 rounded-full bg-[#2ECC71]/20 border border-[#2ECC71] text-[#2ECC71] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                                A
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Pickup Location</span>
                                <div className="text-xs sm:text-sm font-semibold text-white truncate">
                                  {ride.pickupAddress}
                                </div>
                              </div>
                            </div>

                            {/* Dotted Route Connector with Distance */}
                            <div className="pl-3 flex items-center gap-2 text-[10px] text-gray-400 my-0.5">
                              <div className="w-0.5 h-6 bg-gradient-to-b from-[#2ECC71] to-[#EEC367]" />
                              <span className="bg-[#111333] px-2 py-0.5 rounded-full border border-gray-800 font-mono text-[10px] text-[#EEC367]">
                                ~{distanceKm} km transit in Sekondi-Takoradi
                              </span>
                            </div>

                            <div className="flex items-start gap-3">
                              <div className="w-6 h-6 rounded-full bg-[#EEC367]/20 border border-[#EEC367] text-[#EEC367] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                                B
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Drop-off Destination</span>
                                <div className="text-xs sm:text-sm font-semibold text-white truncate">
                                  {ride.dropoffAddress}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Fare, Tier & Payment Summary Box */}
                          <div className="bg-[#111333] rounded-2xl p-3.5 border border-gray-800 space-y-2 mb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 ${
                                  ride.rideType === 'Airport'
                                    ? 'bg-[#EEC367]/15 text-[#EEC367] border-[#EEC367]/40'
                                    : 'bg-white/10 text-white border-gray-700'
                                }`}>
                                  {ride.rideType === 'Airport' ? <Plane className="w-3 h-3" /> : <Car className="w-3 h-3" />}
                                  <span>{ride.rideType} Ride</span>
                                </span>
                                <span className="text-[10px] text-gray-400 font-mono">
                                  {ride.paymentMethod === 'MoMo' ? 'Direct MoMo' : 'Cash'}
                                </span>
                              </div>

                              <div className="text-right">
                                <span className="text-base sm:text-lg font-black text-[#2ECC71]">
                                  GHS {ride.fareGhs}
                                </span>
                                <span className="text-[9px] uppercase tracking-wider text-gray-400 block font-semibold">
                                  Fixed Locked Fare
                                </span>
                              </div>
                            </div>

                            {/* Payment Status Pill */}
                            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-gray-800/80 text-gray-300">
                              <span className="text-gray-400 text-[10px]">Payment Status:</span>
                              <span className={`font-semibold flex items-center gap-1 ${
                                ride.paymentStatus === 'Payment confirmed'
                                  ? 'text-[#2ECC71]'
                                  : ride.paymentStatus === 'Passenger marked as paid'
                                  ? 'text-blue-400'
                                  : 'text-amber-400'
                              }`}>
                                {ride.paymentStatus === 'Payment confirmed' && <CheckCircle className="w-3 h-3" />}
                                <span>{ride.paymentStatus}</span>
                              </span>
                            </div>
                          </div>

                          {/* Driver Summary Profile */}
                          {ride.driverName && (
                            <div className="flex items-center gap-3 p-3 bg-[#111333]/70 rounded-xl border border-gray-800/80 mb-3">
                              <div className="w-10 h-10 rounded-xl bg-[#1A1D48] border border-[#EEC367]/30 flex items-center justify-center font-bold text-sm text-[#EEC367] shrink-0">
                                {ride.driverName.charAt(0)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-bold text-white truncate">{ride.driverName}</div>
                                <div className="text-[11px] text-gray-400 truncate">
                                  {ride.driverVehicle || 'Twin City Vehicle'} · <span className="font-mono text-[#EEC367]">{ride.driverPlate || 'WR-Verified'}</span>
                                </div>
                              </div>
                              {ride.driverPhone && (
                                <a
                                  href={`tel:${ride.driverPhone}`}
                                  className="p-2 bg-[#1A1D48] hover:bg-[#EEC367] hover:text-[#1A1D48] text-[#EEC367] rounded-lg transition border border-[#EEC367]/30"
                                  title="Call Driver"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          )}

                          {/* Completed Ride Rating Display or Call-to-action */}
                          {ride.status === 'completed' && (
                            <div>
                              {ride.driverRating ? (
                                <div className="bg-[#111333] p-3 rounded-2xl border border-gray-800 space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] uppercase font-bold text-gray-400">Your Rating</span>
                                    <div className="flex items-center gap-1">
                                      {[1, 2, 3, 4, 5].map((s) => (
                                        <Star
                                          key={s}
                                          className={`w-3.5 h-3.5 ${
                                            s <= (ride.driverRating || 0)
                                              ? 'text-[#EEC367] fill-[#EEC367]'
                                              : 'text-gray-600'
                                          }`}
                                        />
                                      ))}
                                      <span className="text-xs font-bold text-[#EEC367] ml-1">{ride.driverRating}.0</span>
                                    </div>
                                  </div>
                                  {ride.driverRatingTags && ride.driverRatingTags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 pt-0.5">
                                      {ride.driverRatingTags.map((tag) => (
                                        <span key={tag} className="text-[9px] bg-[#EEC367]/15 text-[#EEC367] px-2 py-0.5 rounded-md font-medium border border-[#EEC367]/30">
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  {ride.driverRatingFeedback && (
                                    <p className="text-[11px] text-gray-300 italic pt-1 border-t border-gray-800">
                                      "{ride.driverRatingFeedback}"
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <div className="bg-[#111333] p-3 rounded-2xl border border-[#EEC367]/40 flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-xs text-gray-300">
                                    <Sparkles className="w-4 h-4 text-[#EEC367]" />
                                    <span>How was your ride with {ride.driverName || 'driver'}?</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setRatingModalRide(ride)}
                                    className="px-3 py-1.5 bg-[#EEC367] hover:bg-[#ffe199] text-[#1A1D48] text-xs font-bold rounded-xl transition shadow flex items-center gap-1.5 cursor-pointer shrink-0"
                                  >
                                    <Star className="w-3.5 h-3.5 fill-[#1A1D48]" />
                                    <span>Rate Driver</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Card Action Footer */}
                        <div className="pt-3 border-t border-gray-800/80 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedReceipt(ride)}
                            className="px-3 py-2 bg-[#111333] hover:bg-white/10 text-white text-xs font-semibold rounded-xl border border-gray-700 hover:border-gray-500 transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <Receipt className="w-3.5 h-3.5 text-[#EEC367]" />
                            <span>View Receipt</span>
                          </button>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenSupportForTrip(ride)}
                              className="px-2.5 py-2 text-gray-400 hover:text-white text-xs rounded-xl hover:bg-white/5 transition flex items-center gap-1"
                              title="File Inquiry / Dispute with Admin"
                            >
                              <HelpCircle className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Help</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRebookTrip(ride)}
                              className="px-3 py-2 bg-[#EEC367] hover:bg-[#ffe199] text-[#1A1D48] text-xs font-bold rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer"
                              title="Load this route into the booking form"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Rebook</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SUPPORT & COMPLAINTS */}
        {activeTab === 'support' && (
          <div className="max-w-2xl mx-auto bg-[#1A1D48] border border-[#EEC367]/30 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-[#EEC367]/15 flex items-center justify-center text-[#EEC367]">
                <HelpCircle className="w-6 h-6" />
              </div>
              <div>
                <h2 style={{ fontFamily: "'Cinzel', serif" }} className="text-2xl font-bold text-white">
                  Support & Ticket Desk
                </h2>
                <p className="text-xs text-gray-400">
                  File payment disputes, driver feedback, or general questions with Prah Ride Admin
                </p>
              </div>
            </div>

            {supportSuccess && (
              <div className="mb-6 p-4 rounded-2xl bg-[#2ECC71]/15 border border-[#2ECC71]/40 text-[#2ECC71] text-xs font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>Ticket submitted successfully. Admin review is pending.</span>
              </div>
            )}

            <form onSubmit={handleSubmitTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Subject / Issue Title</label>
                <input
                  type="text"
                  required
                  value={supportSubject}
                  onChange={(e) => setSupportSubject(e.target.value)}
                  placeholder="e.g., Payment Confirmation Dispute / Lost item"
                  className="w-full px-4 py-2.5 bg-[#111333] border border-gray-700 rounded-xl text-white text-sm focus:border-[#EEC367] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Detailed Description</label>
                <textarea
                  rows={4}
                  required
                  value={supportMessage}
                  onChange={(e) => setSupportMessage(e.target.value)}
                  placeholder="Please describe what happened, including ride details or MoMo transaction ID if applicable..."
                  className="w-full px-4 py-2.5 bg-[#111333] border border-gray-700 rounded-xl text-white text-sm focus:border-[#EEC367] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#EEC367] hover:bg-[#ffe199] text-[#1A1D48] font-bold rounded-xl text-sm transition flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Submit Ticket to Admin</span>
              </button>
            </form>
          </div>
        )}

      </main>

      {/* RECEIPT MODAL */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1A1D48] border-2 border-[#EEC367] rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative text-left">
            <button
              onClick={() => setSelectedReceipt(null)}
              className="absolute top-5 right-5 text-gray-400 hover:text-white"
            >
              ✕
            </button>

            <div className="text-center pb-4 border-b border-gray-800">
              <PrahRideLogo size="md" className="justify-center mb-2" />
              <div className="text-xs uppercase tracking-widest text-[#EEC367] font-semibold">
                Official Trip Receipt
              </div>
            </div>

            <div className="py-5 space-y-3 text-xs border-b border-gray-800">
              <div className="flex justify-between">
                <span className="text-gray-400">Receipt Ref:</span>
                <span className="font-mono text-white">{selectedReceipt.id.slice(0, 10).toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Date & Time:</span>
                <span className="text-white">{new Date(selectedReceipt.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Ride Type:</span>
                <span className="text-white font-bold">{selectedReceipt.rideType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Driver:</span>
                <span className="text-white">{selectedReceipt.driverName || 'Twin City Driver'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Payment Status:</span>
                <span className="text-[#2ECC71] font-bold">{selectedReceipt.paymentStatus}</span>
              </div>
            </div>

            <div className="py-4 flex justify-between items-baseline">
              <span className="font-bold text-white text-sm">Total Fixed Fare Paid</span>
              <span className="text-2xl font-black text-[#2ECC71]">GHS {selectedReceipt.fareGhs}</span>
            </div>

            <div className="text-[10px] text-gray-400 text-center pt-2">
              Thank you for riding with Prah Ride in Sekondi-Takoradi.
            </div>

            <button
              onClick={() => setSelectedReceipt(null)}
              className="mt-6 w-full py-2.5 bg-[#EEC367] text-[#1A1D48] font-bold text-xs rounded-xl"
            >
              Close Receipt
            </button>
          </div>
        </div>
      )}

      {/* STAR RATING MODAL (POPUPS / TRIGGERED FROM RIDE HISTORY) */}
      {ratingModalRide && (
        <StarRatingModal
          ride={ratingModalRide}
          isOpen={true}
          inline={false}
          onClose={() => setRatingModalRide(null)}
          onRatingSubmitted={(rating) => {
            setRideHistory((prev) =>
              prev.map((r) =>
                r.id === ratingModalRide.id
                  ? { ...r, driverRating: rating, ratedAt: Date.now() }
                  : r
              )
            );
            setRatingModalRide(null);
          }}
        />
      )}
    </div>
  );
};

export default PassengerDashboard;
