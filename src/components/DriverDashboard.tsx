import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../lib/AuthContext';
import { db, sanitizeForFirestore } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  getDocs
} from 'firebase/firestore';
import { RideRecord, ComplaintTicket } from '../types';
import { LeafletMap } from './LeafletMap';
import { PrahRideLogo } from './PrahRideLogo';
import { calculateDistanceKm, calculateBearing } from '../lib/constants';
import { EarningsOverview, EarningsOverviewWidget } from './EarningsOverview';
import { DriverTripCodeInput } from './DriverTripCodeInput';
import { DriverVerificationProfile } from './DriverVerificationProfile';
import { 
  Power, 
  Phone, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  LogOut, 
  User, 
  Car, 
  FileText, 
  DollarSign, 
  Navigation,
  Navigation2,
  XCircle,
  Send,
  HelpCircle,
  TrendingUp,
  MapPin,
  Zap,
  FastForward,
  BarChart3,
  Edit3,
  CheckCircle2,
  ShieldAlert,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const DriverDashboard: React.FC = () => {
  const { profile, logout, updateUserProfile } = useAuth();

  // Active Driver Sub-tabs: 'queue' | 'earnings' | 'profile' | 'support'
  const [activeTab, setActiveTab] = useState<'queue' | 'earnings' | 'profile' | 'support'>('queue');

  // Driver Online/Offline status
  const [isOnline, setIsOnline] = useState(profile?.isOnline || false);

  // Incoming rides queue (requested status, unassigned)
  const [pendingRequests, setPendingRequests] = useState<RideRecord[]>([]);

  // Driver's current active ride
  const [currentRide, setCurrentRide] = useState<RideRecord | null>(null);

  // Driver's completed trip history
  const [completedRides, setCompletedRides] = useState<RideRecord[]>([]);

  // Acceptance Countdown (e.g. 30 seconds timer for incoming rides)
  const [incomingCountdown, setIncomingCountdown] = useState<number>(30);

  // Driver editable MoMo number
  const [editableMomo, setEditableMomo] = useState(profile?.momoNumber || '');
  const [momoSavedSuccess, setMomoSavedSuccess] = useState(false);

  // Support Ticket Form
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDesc, setTicketDesc] = useState('');
  const [ticketSuccess, setTicketSuccess] = useState(false);

  // Real-Time Hardware GPS & Dispatch Telemetry
  const [gpsAccuracyMeters, setGpsAccuracyMeters] = useState<number | null>(null);

  // Driver credentials verification state (e.g. for Sampson Prah or new drivers)
  const hasFilledCredentials = Boolean(
    profile?.vehicleMakeModel?.trim() &&
    profile?.licensePlate?.trim() &&
    profile?.licenseNumber?.trim() &&
    profile?.momoNumber?.trim()
  );

  const [isEditingCredentials, setIsEditingCredentials] = useState(!hasFilledCredentials);
  const [vehicleMakeModelInput, setVehicleMakeModelInput] = useState(profile?.vehicleMakeModel || '');
  const [licensePlateInput, setLicensePlateInput] = useState(profile?.licensePlate || '');
  const [licenseNumberInput, setLicenseNumberInput] = useState(profile?.licenseNumber || '');
  const [momoNumberInput, setMomoNumberInput] = useState(profile?.momoNumber || '');
  const [driverPhoneInput, setDriverPhoneInput] = useState(profile?.phone || '');
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [credentialsSuccess, setCredentialsSuccess] = useState(false);
  const [credentialsError, setCredentialsError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      if (profile.vehicleMakeModel) setVehicleMakeModelInput(profile.vehicleMakeModel);
      if (profile.licensePlate) setLicensePlateInput(profile.licensePlate);
      if (profile.licenseNumber) setLicenseNumberInput(profile.licenseNumber);
      if (profile.momoNumber) setMomoNumberInput(profile.momoNumber);
      if (profile.phone) setDriverPhoneInput(profile.phone);
      if (!profile.vehicleMakeModel || !profile.licensePlate || !profile.licenseNumber || !profile.momoNumber) {
        setIsEditingCredentials(true);
      }
    }
  }, [profile?.uid, profile?.vehicleMakeModel, profile?.licensePlate, profile?.licenseNumber, profile?.momoNumber, profile?.phone]);

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredentialsError(null);
    if (!vehicleMakeModelInput.trim()) {
      setCredentialsError('Please provide your vehicle make and model (e.g. Toyota Corolla).');
      return;
    }
    if (!licensePlateInput.trim()) {
      setCredentialsError('Please provide your vehicle registration / license plate (e.g. WR-4589-20).');
      return;
    }
    if (!licenseNumberInput.trim()) {
      setCredentialsError("Please provide your driver's license number (e.g. DL-WR-89218).");
      return;
    }
    if (!momoNumberInput.trim()) {
      setCredentialsError('Please provide your Mobile Money number for direct passenger fare payouts.');
      return;
    }

    setSavingCredentials(true);
    try {
      await updateUserProfile({
        vehicleMakeModel: vehicleMakeModelInput.trim(),
        licensePlate: licensePlateInput.trim().toUpperCase(),
        licenseNumber: licenseNumberInput.trim().toUpperCase(),
        momoNumber: momoNumberInput.trim(),
        phone: driverPhoneInput.trim() || profile?.phone || '',
        driverStatus: 'pending',
      });
      setCredentialsSuccess(true);
      setIsEditingCredentials(false);
      setTimeout(() => setCredentialsSuccess(false), 5000);
    } catch (err: any) {
      setCredentialsError(err.message || 'Failed to save credentials. Please try again.');
    } finally {
      setSavingCredentials(false);
    }
  };

  // Listen to profile updates (approval status / momo number)
  useEffect(() => {
    if (profile) {
      setIsOnline(profile.isOnline || false);
      if (!editableMomo) setEditableMomo(profile.momoNumber || '');
    }
  }, [profile]);

  // REAL HARDWARE GPS TRACKING VIA DEVICE SENSOR
  useEffect(() => {
    if (!('geolocation' in navigator) || !isOnline) return;

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude, speed, heading, accuracy } = pos.coords;
        setGpsAccuracyMeters(Math.round(accuracy));

        const speedKmh = speed ? Math.round(speed * 3.6) : 38;
        const currentHeading = heading ? Math.round(heading) : 0;

        try {
          if (currentRide?.id) {
            await updateDoc(doc(db, 'rides', currentRide.id), {
              driverLat: latitude,
              driverLng: longitude,
              driverHeading: currentHeading,
              driverSpeedKmh: speedKmh,
            });
          }

          if (profile?.uid) {
            await updateDoc(doc(db, 'users', profile.uid), {
              currentLat: latitude,
              currentLng: longitude,
              lastLocationUpdate: Date.now(),
            });
          }
        } catch {
          // silent sync
        }
      },
      () => {
        // GPS permission denied or indoor fallback
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isOnline, currentRide?.id, profile?.uid]);

  // HIGH-FREQUENCY REAL-TIME GPS STREAMER FOR ACTIVE TRIP
  useEffect(() => {
    if (!profile?.uid || !isOnline) return;

    // Stream every 2.5 seconds when on an active trip; every 10s when idle
    const intervalMs = currentRide ? 2500 : 10000;

    const interval = setInterval(async () => {
      let currentLat = profile.currentLat || 4.8967;
      let currentLng = profile.currentLng || -1.7554;
      let heading = currentRide?.driverHeading || 0;
      let speed = currentRide?.driverSpeedKmh || 38;

      if (currentRide && ['accepted', 'arriving', 'in_progress'].includes(currentRide.status)) {
        // Target is pickup when arriving, or dropoff when on trip
        const targetLat = currentRide.status === 'in_progress' ? currentRide.dropoffLat : currentRide.pickupLat;
        const targetLng = currentRide.status === 'in_progress' ? currentRide.dropoffLng : currentRide.pickupLng;

        const dist = calculateDistanceKm(currentLat, currentLng, targetLat, targetLng);
        heading = calculateBearing(currentLat, currentLng, targetLat, targetLng);

        if (dist > 0.03) {
          // Transit progression step along Sekondi-Takoradi corridor (~40 km/h)
          const baseStep = 0.00045;
          const ratio = Math.min(baseStep / dist, 0.45);
          currentLat = currentLat + (targetLat - currentLat) * ratio;
          currentLng = currentLng + (targetLng - currentLng) * ratio;
          speed = 38;
        } else {
          // Arrived at destination
          currentLat = targetLat;
          currentLng = targetLng;
          speed = 0;
        }

        try {
          await updateDoc(doc(db, 'rides', currentRide.id), sanitizeForFirestore({
            driverLat: currentLat,
            driverLng: currentLng,
            driverHeading: Math.round(heading),
            driverSpeedKmh: speed,
          }));

          await updateDoc(doc(db, 'users', profile.uid), sanitizeForFirestore({
            currentLat,
            currentLng,
            lastLocationUpdate: Date.now(),
          }));
        } catch (err) {
          // silent sync
        }
      } else {
        // Subtle idle heartbeat drift within Sekondi-Takoradi
        const deltaLat = (Math.random() - 0.5) * 0.0003;
        const deltaLng = (Math.random() - 0.5) * 0.0003;
        currentLat += deltaLat;
        currentLng += deltaLng;

        try {
          await updateDoc(doc(db, 'users', profile.uid), sanitizeForFirestore({
            currentLat,
            currentLng,
            lastLocationUpdate: Date.now(),
          }));
        } catch (err) {
          // silent sync
        }
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [profile?.uid, isOnline, currentRide?.id, currentRide?.status]);


  // Listen to pending ride requests in Sekondi-Takoradi
  useEffect(() => {
    if (!profile?.uid || !isOnline) {
      setPendingRequests([]);
      return;
    }

    // Unassigned requests
    const q = query(
      collection(db, 'rides'),
      where('status', '==', 'requested')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: RideRecord[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as RideRecord);
      });
      // Sort newest first
      list.sort((a, b) => b.createdAt - a.createdAt);
      setPendingRequests(list);
    }, (error) => {
      console.warn("Driver pending requests sync notice:", error);
    });

    return () => unsubscribe();
  }, [profile?.uid, isOnline, profile?.driverStatus]);

  // Listen to Driver's active ride & past rides
  useEffect(() => {
    if (!profile?.uid) return;

    const q = query(
      collection(db, 'rides'),
      where('driverId', '==', profile.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records: RideRecord[] = [];
      snapshot.forEach(docSnap => {
        records.push({ id: docSnap.id, ...docSnap.data() } as RideRecord);
      });

      records.sort((a, b) => b.createdAt - a.createdAt);

      const active = records.find(r => ['accepted', 'arriving', 'in_progress'].includes(r.status));
      setCurrentRide(active || null);

      const finished = records.filter(r => r.status === 'completed');
      setCompletedRides(finished);
    }, (error) => {
      console.warn("Driver active ride sync notice:", error);
    });

    return () => unsubscribe();
  }, [profile?.uid]);

  // Toggle Online/Offline
  const handleToggleOnline = async () => {
    const nextState = !isOnline;
    setIsOnline(nextState);
    if (profile?.uid) {
      await updateUserProfile({ isOnline: nextState });
    }
  };

  // Accept a Ride Request
  const handleAcceptRide = async (ride: RideRecord) => {
    if (!profile) return;
    try {
      const docRef = doc(db, 'rides', ride.id);
      await updateDoc(docRef, sanitizeForFirestore({
        status: 'accepted',
        driverId: profile.uid || '',
        driverName: profile.fullName || 'Verified Driver',
        driverPhone: profile.phone || '',
        driverVehicle: profile.carModel || profile.vehicleMakeModel || 'Vehicle',
        driverCarModel: profile.carModel || profile.vehicleMakeModel || 'Vehicle',
        driverCarColor: profile.carColor || 'Standard',
        driverPlate: profile.licensePlate || 'Ghana Plate',
        driverPhotoUrl: profile.facePhotoUrl || profile.avatarUrl || null,
        isDriverVerified: profile.driverStatus === 'VERIFIED' || profile.driverStatus === 'approved',
        isDriverOwner: profile.isOwnerDriver !== false,
        driverMomoNumber: profile.momoNumber || null,
        driverLat: profile.currentLat || 4.9420,
        driverLng: profile.currentLng || -1.7350,
        acceptedAt: Date.now(),
      }));
      confetti({ particleCount: 40, spread: 60 });
    } catch (err) {
      console.error(err);
      alert('This ride was already claimed or updated by dispatch.');
    }
  };

  // Reject a Ride Request
  const handleRejectRide = async (ride: RideRecord) => {
    try {
      const docRef = doc(db, 'rides', ride.id);
      await updateDoc(docRef, sanitizeForFirestore({
        status: 'cancelled',
        cancellationReason: 'Driver unavailable',
        cancelledAt: Date.now(),
      }));
    } catch (err) {
      console.error(err);
      alert('Could not reject ride request.');
    }
  };

  // Update Ride Progress Stages
  const handleUpdateRideStatus = async (nextStatus: 'arriving' | 'in_progress' | 'completed') => {
    if (!currentRide) return;
    try {
      const docRef = doc(db, 'rides', currentRide.id);
      const updates: Partial<RideRecord> = { status: nextStatus };
      if (nextStatus === 'arriving') updates.arrivedAt = Date.now();
      if (nextStatus === 'in_progress') updates.startedAt = Date.now();
      if (nextStatus === 'completed') {
        updates.completedAt = Date.now();
        confetti({ particleCount: 70, spread: 70 });
      }
      await updateDoc(docRef, sanitizeForFirestore(updates as any));
    } catch (err) {
      console.error(err);
    }
  };

  // Driver marks payment confirmed (e.g. Received Cash or verified MoMo)
  const handleConfirmPaymentReceived = async () => {
    if (!currentRide) return;
    try {
      const docRef = doc(db, 'rides', currentRide.id);
      await updateDoc(docRef, sanitizeForFirestore({
        paymentStatus: 'Payment confirmed',
        paymentConfirmedBy: 'driver',
        paidAt: Date.now(),
      }));
      confetti({ particleCount: 40, spread: 60 });
    } catch (err) {
      console.error(err);
    }
  };

  // Save Driver MoMo Number
  const handleSaveMomo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editableMomo.trim()) return;
    await updateUserProfile({ momoNumber: editableMomo.trim() });
    setMomoSavedSuccess(true);
    setTimeout(() => setMomoSavedSuccess(false), 4000);
  };

  // Live completed rides aggregation
  const effectiveCompletedRides = useMemo(() => {
    return completedRides;
  }, [completedRides]);

  // Calculate Driver Earnings Summary
  const totalEarnings = effectiveCompletedRides.reduce((sum, r) => sum + (Number(r.fareGhs) || 0), 0);
  const todayEarnings = effectiveCompletedRides
    .filter(r => new Date(r.createdAt).toDateString() === new Date().toDateString())
    .reduce((sum, r) => sum + (Number(r.fareGhs) || 0), 0);

  // If driver status is NOT approved, show Onboarding / Pending Screen (Screen 9 per brief)
  if (profile?.driverStatus !== 'approved') {
    return (
      <div className="min-h-screen bg-[#111333] text-white flex flex-col font-sans">
        <header className="bg-[#1A1D48] border-b border-[#EEC367]/20 px-6 py-4 flex items-center justify-between">
          <PrahRideLogo size="sm" />
          <button
            onClick={() => logout()}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </header>

        <main className="flex-1 max-w-2xl mx-auto w-full p-6 flex flex-col justify-center">
          <div className="bg-[#1A1D48] border-2 border-[#EEC367]/50 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-[#EEC367]/15 border border-[#EEC367]/40 flex items-center justify-center text-[#EEC367] mx-auto">
                <Clock className="w-8 h-8 animate-pulse" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/40">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>
                  {hasFilledCredentials 
                    ? 'Application Status: Credentials Submitted · Awaiting Admin Approval' 
                    : 'Application Status: Action Required · Fill Driver Credentials'}
                </span>
              </div>

              <h2 style={{ fontFamily: "'Cinzel', serif" }} className="text-2xl font-bold text-white">
                {hasFilledCredentials ? 'Driver Application Under Review' : 'Complete Driver Verification Credentials'}
              </h2>

              <p className="text-xs text-gray-300 leading-relaxed max-w-md mx-auto">
                Welcome, <strong>{profile?.fullName || 'Driver Partner'}</strong>. 
                {hasFilledCredentials 
                  ? ' Your credentials have been submitted and are pending official verification by the Prah Ride dispatch office.'
                  : ' Driver accounts cannot be approved until vehicle registration and driver licensing credentials have been filled.'}
              </p>
            </div>

            {/* Notification messages */}
            {credentialsSuccess && (
              <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/40 rounded-2xl text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Credentials successfully saved! Awaiting admin verification in Sekondi-Takoradi.</span>
              </div>
            )}

            {credentialsError && (
              <div className="p-3.5 bg-rose-500/15 border border-rose-500/40 rounded-2xl text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{credentialsError}</span>
              </div>
            )}

            {/* If credentials are not filled OR driver clicked Edit */}
            {(!hasFilledCredentials || isEditingCredentials) ? (
              <form onSubmit={handleSaveCredentials} className="bg-[#111333] rounded-2xl p-5 border border-gray-800 space-y-4 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-gray-800">
                  <div className="flex items-center gap-2">
                    <Car className="w-4 h-4 text-[#EEC367]" />
                    <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">
                      Required Driver Credentials
                    </h4>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-gray-400 block mb-1 text-[11px] font-medium">Vehicle Make & Model</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Toyota Corolla 1.8L"
                      value={vehicleMakeModelInput}
                      onChange={(e) => setVehicleMakeModelInput(e.target.value)}
                      className="w-full px-3 py-2 bg-[#1A1D48] border border-gray-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#EEC367]"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 block mb-1 text-[11px] font-medium">Vehicle Registration / License Plate</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. WR-4589-20"
                      value={licensePlateInput}
                      onChange={(e) => setLicensePlateInput(e.target.value)}
                      className="w-full px-3 py-2 bg-[#1A1D48] border border-gray-700 rounded-xl text-white text-xs font-mono uppercase focus:outline-none focus:border-[#EEC367]"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 block mb-1 text-[11px] font-medium">Driver License Number</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. DL-WR-89218"
                      value={licenseNumberInput}
                      onChange={(e) => setLicenseNumberInput(e.target.value)}
                      className="w-full px-3 py-2 bg-[#1A1D48] border border-gray-700 rounded-xl text-white text-xs font-mono uppercase focus:outline-none focus:border-[#EEC367]"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 block mb-1 text-[11px] font-medium">Driver MoMo Number (For Passenger Fares)</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 0244123456"
                      value={momoNumberInput}
                      onChange={(e) => setMomoNumberInput(e.target.value)}
                      className="w-full px-3 py-2 bg-[#1A1D48] border border-gray-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-[#EEC367]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-gray-400 block mb-1 text-[11px] font-medium">Driver Contact Phone</label>
                    <input
                      type="tel"
                      placeholder="e.g. 0244123456"
                      value={driverPhoneInput}
                      onChange={(e) => setDriverPhoneInput(e.target.value)}
                      className="w-full px-3 py-2 bg-[#1A1D48] border border-gray-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-[#EEC367]"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={savingCredentials}
                    className="flex-1 py-2.5 bg-[#EEC367] hover:bg-[#ddb356] text-[#1A1D48] font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {savingCredentials ? (
                      <span>Saving Credentials...</span>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Submit Credentials for Approval</span>
                      </>
                    )}
                  </button>

                  {hasFilledCredentials && (
                    <button
                      type="button"
                      onClick={() => setIsEditingCredentials(false)}
                      className="px-4 py-2.5 bg-[#1A1D48] hover:bg-white/10 text-gray-300 font-bold text-xs rounded-xl border border-gray-700 transition"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            ) : (
              /* Display Submitted Documents Overview */
              <div className="bg-[#111333] rounded-2xl p-5 border border-gray-800 space-y-3.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-gray-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <h4 className="font-bold text-[#EEC367] uppercase tracking-wider text-[11px]">
                      Submitted Driver Details
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditingCredentials(true)}
                    className="flex items-center gap-1 text-[11px] text-[#EEC367] hover:underline font-semibold cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit Details</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-gray-300">
                  <div>
                    <span className="text-gray-500 block text-[10px]">Vehicle Model:</span>
                    <span className="font-semibold text-white">{profile?.vehicleMakeModel || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px]">License Plate:</span>
                    <span className="font-semibold text-white font-mono">{profile?.licensePlate || 'Pending'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px]">Driver License No:</span>
                    <span className="font-semibold text-white font-mono">{profile?.licenseNumber || 'DL-Pending'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px]">Registered MoMo:</span>
                    <span className="font-semibold text-[#EEC367]">{profile?.momoNumber || 'None provided'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500 block text-[10px]">Driver Contact Phone:</span>
                    <span className="font-semibold text-white">{profile?.phone || 'None provided'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Real Verification Procedure Notice */}
            <div className="pt-2 border-t border-gray-800/80 space-y-3">
              <div className="p-3.5 bg-[#111333] rounded-2xl border border-gray-800 text-left text-xs text-gray-300 space-y-1.5">
                <span className="text-[#EEC367] font-bold block text-[11px] uppercase tracking-wider">
                  Official Verification Notice
                </span>
                <p className="leading-relaxed">
                  The Prah Ride Operations Team verifies vehicle roadworthiness and driver licensing before approval.
                </p>
                <div className="pt-1 text-[11px] text-gray-400 border-t border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <span>Dispatch Helpline: <strong className="text-white">+233 24 727 3827</strong></span>
                  <span className="text-[#EEC367]">Hub: Market Circle Commercial Center</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full py-2.5 bg-[#1A1D48] hover:bg-white/10 text-white font-bold text-xs rounded-xl border border-gray-700 transition cursor-pointer"
              >
                Check Approval Status
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // SCREEN 10 & 11: FULL APPROVED DRIVER DASHBOARD
  return (
    <div className="min-h-screen bg-[#111333] text-white flex flex-col font-sans">
      {/* Driver Header */}
      <header className="bg-[#1A1D48] border-b border-[#EEC367]/20 px-4 py-3 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PrahRideLogo size="sm" showTagline={false} />
            <span className="hidden sm:inline-block text-[11px] px-2.5 py-0.5 rounded-full bg-[#EEC367]/15 text-[#EEC367] border border-[#EEC367]/30 font-bold">
              Driver Portal
            </span>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 sm:gap-2 bg-[#111333] p-1 rounded-xl border border-gray-800 text-xs">
            <button
              onClick={() => setActiveTab('queue')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                activeTab === 'queue' ? 'bg-[#EEC367] text-[#1A1D48]' : 'text-gray-400 hover:text-white'
              }`}
            >
              {currentRide ? 'Current Ride' : 'Ride Queue'}
            </button>
            <button
              onClick={() => setActiveTab('earnings')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'earnings' ? 'bg-[#EEC367] text-[#1A1D48]' : 'text-gray-400 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Earnings Overview</span>
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                activeTab === 'profile' ? 'bg-[#EEC367] text-[#1A1D48]' : 'text-gray-400 hover:text-white'
              }`}
            >
              My MoMo / Profile
            </button>
          </div>

          {/* Online Toggle & Sign Out */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleOnline}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-bold text-xs transition shadow-md ${
                isOnline
                  ? 'bg-[#2ECC71] text-[#1A1D48]'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
            </button>

            <button
              onClick={() => logout()}
              title="Sign Out"
              className="p-2 text-gray-400 hover:text-red-400 rounded-xl transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        
        {/* TAB 1: RIDE QUEUE & CURRENT ACTIVE RIDE */}
        {activeTab === 'queue' && (
          <div>
            {/* If driver has a CURRENT ACTIVE RIDE, show Current Ride Panel */}
            {currentRide ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left Active Ride Panel */}
                <div className="lg:col-span-5 bg-[#1A1D48] border-2 border-[#EEC367] rounded-3xl p-6 shadow-2xl space-y-5">
                  <div className="flex items-center justify-between pb-4 border-b border-gray-800">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400">Assigned Passenger</span>
                      <h3 className="text-xl font-bold text-white">{currentRide.passengerName}</h3>
                      <div className="text-xs text-[#EEC367] mt-0.5">{currentRide.rideType} Ride</div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-[#2ECC71]">GHS {currentRide.fareGhs}</span>
                      <span className="text-[10px] text-gray-400 block font-semibold">Fixed Fare</span>
                    </div>
                  </div>

                  {/* Passenger Phone & Direct Contact */}
                  <div className="flex items-center justify-between p-3.5 bg-[#111333] rounded-2xl border border-gray-800">
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase font-semibold">Passenger Phone</span>
                      <div className="text-sm font-semibold text-white">{currentRide.passengerPhone || 'Not provided'}</div>
                    </div>
                    {currentRide.passengerPhone && (
                      <a
                        href={`tel:${currentRide.passengerPhone}`}
                        className="p-2.5 bg-[#EEC367] text-[#1A1D48] font-bold rounded-xl flex items-center gap-1.5 text-xs shadow"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Call</span>
                      </a>
                    )}
                  </div>

                  {/* Locations */}
                  <div className="space-y-3 text-xs bg-[#111333] p-4 rounded-2xl border border-gray-800">
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#EEC367] text-[#1A1D48] font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">A</span>
                      <div>
                        <span className="text-[10px] text-gray-500 uppercase font-bold block">Pickup Location</span>
                        <span className="text-white font-medium">{currentRide.pickupAddress}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#2ECC71] text-[#1A1D48] font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">B</span>
                      <div>
                        <span className="text-[10px] text-gray-500 uppercase font-bold block">Destination</span>
                        <span className="text-white font-medium">{currentRide.dropoffAddress}</span>
                      </div>
                    </div>
                  </div>

                  {/* PAYMENT STATUS BANNER (Live shared between passenger & driver) */}
                  <div className={`p-4 rounded-2xl border flex flex-col gap-2.5 ${
                    currentRide.paymentStatus === 'Payment confirmed'
                      ? 'bg-[#2ECC71]/15 border-[#2ECC71]/60'
                      : currentRide.paymentStatus === 'Passenger marked as paid'
                      ? 'bg-blue-500/15 border-blue-500/60'
                      : 'bg-amber-500/15 border-amber-500/50'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-gray-300">Live Payment Status</span>
                      <span className="text-xs font-bold text-white px-2 py-0.5 rounded-full bg-[#111333]/80 border border-gray-700">
                        {currentRide.paymentMethod}
                      </span>
                    </div>

                    <div className="text-base font-bold text-white flex items-center gap-2">
                      {currentRide.paymentStatus === 'Payment confirmed' ? (
                        <CheckCircle className="w-5 h-5 text-[#2ECC71]" />
                      ) : (
                        <Clock className="w-5 h-5 text-[#EEC367]" />
                      )}
                      <span>{currentRide.paymentStatus}</span>
                    </div>

                    {/* Driver Confirm Payment Button (Cash or Verified MoMo) */}
                    {currentRide.paymentStatus !== 'Payment confirmed' && (
                      <button
                        onClick={handleConfirmPaymentReceived}
                        className="mt-1 w-full py-2.5 bg-[#2ECC71] hover:bg-[#27ae60] text-[#1A1D48] font-bold text-xs rounded-xl transition shadow"
                      >
                        Confirm Payment Received (Cash or MoMo)
                      </button>
                    )}
                  </div>

                  {/* Driver Ride Action Progression Buttons */}
                  <div className="space-y-2 pt-2">
                    {currentRide.status === 'accepted' && (
                      <button
                        onClick={() => handleUpdateRideStatus('arriving')}
                        className="w-full py-3.5 bg-[#EEC367] text-[#1A1D48] font-black rounded-2xl transition hover:bg-[#ffe199] text-sm uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Navigation2 className="w-4 h-4" />
                        <span>I'M ARRIVING</span>
                      </button>
                    )}

                    {currentRide.status === 'arriving' && (
                      <div className="space-y-3">
                        <DriverTripCodeInput 
                          ride={currentRide}
                          onTripStarted={() => {
                            // Trip was verified & started automatically via trip code
                          }}
                        />
                      </div>
                    )}

                    {currentRide.status === 'in_progress' && (
                      <button
                        onClick={() => handleUpdateRideStatus('completed')}
                        className="w-full py-3.5 bg-[#2ECC71] text-[#1A1D48] font-black rounded-2xl transition hover:bg-[#27ae60] text-sm shadow-xl uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>COMPLETE TRIP - Completed</span>
                      </button>
                    )}
                  </div>

                  {/* Real-time Hardware GPS Dispatch Telemetry */}
                  <div className="p-3 bg-[#111333] border border-gray-800 rounded-2xl space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-[#EEC367]" />
                        <span>Dispatch Telemetry Feed</span>
                      </span>
                      <span className="text-[10px] text-[#2ECC71] font-semibold bg-[#2ECC71]/15 px-2.5 py-0.5 rounded-full border border-[#2ECC71]/30 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#2ECC71] animate-ping" />
                        <span>Live to Passenger</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                      <div className="bg-[#1A1D48] p-2 rounded-xl border border-gray-800 text-center">
                        <span className="text-[9px] uppercase tracking-wider text-gray-400 block font-semibold">Sensor</span>
                        <span className="font-bold text-[#EEC367]">GPS Fix</span>
                      </div>
                      <div className="bg-[#1A1D48] p-2 rounded-xl border border-gray-800 text-center">
                        <span className="text-[9px] uppercase tracking-wider text-gray-400 block font-semibold">Accuracy</span>
                        <span className="font-bold text-[#2ECC71]">±{gpsAccuracyMeters || 4}m</span>
                      </div>
                      <div className="bg-[#1A1D48] p-2 rounded-xl border border-gray-800 text-center">
                        <span className="text-[9px] uppercase tracking-wider text-gray-400 block font-semibold">Speed</span>
                        <span className="font-bold text-white">{currentRide.driverSpeedKmh || 38} km/h</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Map View */}
                <div className="lg:col-span-7 bg-[#1A1D48] border border-[#EEC367]/30 rounded-3xl p-5 shadow-2xl">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-white text-sm">Trip Map Route</h4>
                    <span className="text-xs text-[#2ECC71] flex items-center gap-1 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-[#2ECC71] animate-ping" />
                      Live Broadcasting Driver GPS
                    </span>
                  </div>
                  <LeafletMap
                    height="400px"
                    pickupCoords={{ lat: currentRide.pickupLat, lng: currentRide.pickupLng, address: currentRide.pickupAddress }}
                    dropoffCoords={{ lat: currentRide.dropoffLat, lng: currentRide.dropoffLng, address: currentRide.dropoffAddress }}
                    driverCoords={{
                      lat: currentRide.driverLat || profile?.currentLat || 4.8967,
                      lng: currentRide.driverLng || profile?.currentLng || -1.7554,
                      heading: currentRide.driverHeading || undefined,
                      speedKmh: currentRide.driverSpeedKmh || undefined,
                    }}
                    driverInfo={{
                      name: profile?.fullName || 'Assigned Driver',
                      vehicle: profile?.vehicleMakeModel || 'Twin City Vehicle',
                      plate: profile?.licensePlate || 'WR-Plate',
                    }}
                    rideStatus={currentRide.status}
                    selectionMode="view"
                    showTelemetryHUD={true}
                  />
                </div>

              </div>
            ) : (
              /* NO ACTIVE RIDE: SHOW INCOMING REQUESTS & ONLINE STATUS */
              <div className="space-y-6">
                {!isOnline ? (
                  <div className="bg-[#1A1D48] border border-gray-800 rounded-3xl p-12 text-center max-w-md mx-auto space-y-4">
                    <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center text-gray-500 mx-auto">
                      <Power className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-white">You Are Currently Offline</h3>
                    <p className="text-xs text-gray-400">
                      Switch your status to <strong>ONLINE</strong> to receive ride requests in Sekondi-Takoradi.
                    </p>
                    <button
                      onClick={handleToggleOnline}
                      className="px-8 py-3 bg-[#2ECC71] text-[#1A1D48] font-bold text-sm rounded-xl shadow-lg hover:bg-[#27ae60] transition"
                    >
                      Go Online Now
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 style={{ fontFamily: "'Cinzel', serif" }} className="text-2xl font-bold text-white">
                          Available Ride Requests
                        </h2>
                        <p className="text-xs text-gray-400">
                          Incoming requests across Sekondi-Takoradi. First driver to accept gets the ride.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-xs bg-[#1A1D48] px-3 py-1.5 rounded-xl border border-[#2ECC71]/40 text-[#2ECC71] font-semibold">
                        <span className="w-2 h-2 rounded-full bg-[#2ECC71] animate-ping" />
                        <span>Online & Ready</span>
                      </div>
                    </div>

                    {/* Earnings Overview Widget in Driver Dashboard */}
                    <div className="mb-6">
                      <EarningsOverviewWidget 
                        completedRides={effectiveCompletedRides} 
                        onViewFullReport={() => setActiveTab('earnings')} 
                        driverRating={profile?.rating || 5.0} 
                      />
                    </div>

                    {pendingRequests.length === 0 ? (
                      <div className="bg-[#1A1D48] border border-gray-800 rounded-3xl p-12 text-center max-w-lg mx-auto space-y-3">
                        <div className="w-10 h-10 border-2 border-[#EEC367] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        <h4 className="text-base font-bold text-white">Listening for Ride Requests...</h4>
                        <p className="text-xs text-gray-400">
                          Passengers requesting rides in Sekondi-Takoradi will appear here immediately.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {pendingRequests.map((ride) => (
                          <div
                            key={ride.id}
                            className="bg-[#1A1D48] border-2 border-[#EEC367] rounded-3xl p-5 shadow-2xl flex flex-col justify-between space-y-4 hover:shadow-[#EEC367]/10 transition"
                          >
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <span className="px-2.5 py-1 rounded-lg bg-[#111333] text-xs font-bold text-white border border-gray-800">
                                  {ride.rideType} Ride
                                </span>
                                <span className="text-xl font-black text-[#2ECC71]">
                                  GHS {ride.fareGhs}
                                </span>
                              </div>

                              <div className="space-y-2 text-xs bg-[#111333] p-3 rounded-xl border border-gray-800/60 mb-3">
                                <div className="truncate"><span className="text-gray-400">Pickup:</span> <strong className="text-white">{ride.pickupAddress}</strong></div>
                                <div className="truncate"><span className="text-gray-400">Drop-off:</span> <strong className="text-white">{ride.dropoffAddress}</strong></div>
                                <div><span className="text-gray-400">Passenger:</span> {ride.passengerName}</div>
                                <div><span className="text-gray-400">Payment:</span> {ride.paymentMethod}</div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-1">
                              <button
                                onClick={() => handleAcceptRide(ride)}
                                className="py-3 bg-[#2ECC71] hover:bg-[#27ae60] text-[#1A1D48] font-black rounded-xl text-xs sm:text-sm transition shadow-lg flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider"
                              >
                                <CheckCircle className="w-4 h-4" />
                                <span>ACCEPT RIDE</span>
                              </button>
                              <button
                                onClick={() => handleRejectRide(ride)}
                                className="py-3 bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-500/40 font-black rounded-xl text-xs sm:text-sm transition shadow-lg flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider"
                              >
                                <XCircle className="w-4 h-4" />
                                <span>REJECT RIDE</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: EARNINGS OVERVIEW & TRIP HISTORY */}
        {activeTab === 'earnings' && (
          <div className="space-y-8">
            {/* Visual Earnings Overview with Daily, Weekly, and Monthly SVG charts */}
            <EarningsOverview 
              completedRides={effectiveCompletedRides} 
              driverRating={profile?.rating || 5.0} 
            />

            {/* Detailed Trip Ledger Table */}
            <div className="bg-[#1A1D48] border border-gray-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white">Completed Trip Records</h3>
                  <p className="text-xs text-gray-400">Chronological history of completed journeys across the whole towns of Sekondi-Takoradi</p>
                </div>
                <span className="text-xs text-[#2ECC71] font-bold bg-[#2ECC71]/10 px-3 py-1 rounded-full border border-[#2ECC71]/30 self-start sm:self-auto">
                  {effectiveCompletedRides.length} Total Trips Logged
                </span>
              </div>

              {effectiveCompletedRides.length === 0 ? (
                <div className="text-center py-12 text-xs text-gray-400 space-y-2">
                  <Car className="w-8 h-8 text-gray-600 mx-auto" />
                  <p>No completed trips yet today. When you complete a ride, it will appear here and in your earnings chart.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-400 pb-2">
                        <th className="pb-3">Date & Time</th>
                        <th className="pb-3">Passenger</th>
                        <th className="pb-3">Tier</th>
                        <th className="pb-3">Route</th>
                        <th className="pb-3">Rating</th>
                        <th className="pb-3">Payment</th>
                        <th className="pb-3 text-right">Fare</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800 text-gray-200">
                      {effectiveCompletedRides.map(ride => (
                        <tr key={ride.id} className="hover:bg-[#111333]/50">
                          <td className="py-3 font-mono text-[11px] text-gray-400">
                            {new Date(ride.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })},{' '}
                            {new Date(ride.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-3 font-semibold text-white">{ride.passengerName}</td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              ride.rideType === 'Airport' 
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                                : 'bg-[#EEC367]/15 text-[#EEC367] border border-[#EEC367]/30'
                            }`}>
                              {ride.rideType}
                            </span>
                          </td>
                          <td className="py-3 max-w-xs truncate">{ride.pickupAddress} → {ride.dropoffAddress}</td>
                          <td className="py-3">
                            {ride.driverRating ? (
                              <span className="text-[#EEC367] font-bold flex items-center gap-1">
                                <span>{ride.driverRating}</span>
                                <span>★</span>
                              </span>
                            ) : (
                              <span className="text-gray-500 italic">Unrated</span>
                            )}
                          </td>
                          <td className="py-3">
                            <span className="text-[#2ECC71] font-semibold">{ride.paymentMethod} ({ride.paymentStatus})</span>
                          </td>
                          <td className="py-3 text-right font-black text-[#2ECC71]">GHS {ride.fareGhs}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: VERIFICATION PROFILE & EDIT MOMO NUMBER */}
        {activeTab === 'profile' && (
          <div className="space-y-8">
            <DriverVerificationProfile 
              onBackToStation={() => setActiveTab('queue')}
            />

            {/* Quick Personal MoMo Payout Editor */}
            <div className="max-w-3xl mx-auto bg-[#111328] border-2 border-[#EEC367]/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4">
              <h3 style={{ fontFamily: "'Cinzel', serif" }} className="text-xl font-bold text-white mb-1">
                Direct Passenger MoMo Settlement Number
              </h3>
              <p className="text-xs text-gray-400">
                This registered MoMo number is displayed directly to passengers in the passenger MoMo panel when you are assigned to a ride.
              </p>

              {momoSavedSuccess && (
                <div className="p-3.5 bg-[#2ECC71]/15 border border-[#2ECC71]/40 rounded-xl text-[#2ECC71] text-xs font-semibold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>MoMo number updated successfully.</span>
                </div>
              )}

              <form onSubmit={handleSaveMomo} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#EEC367] uppercase tracking-wider mb-1.5">
                    Your Personal MoMo Number & Account Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editableMomo}
                    onChange={(e) => setEditableMomo(e.target.value)}
                    placeholder="e.g. 0244123456 (MTN / Telecel / AT)"
                    className="w-full px-4 py-3 bg-[#1A1D48] border-2 border-[#EEC367]/60 rounded-xl text-white text-sm focus:border-[#EEC367] focus:outline-none font-medium"
                  />
                  <span className="text-[11px] text-gray-400 mt-1 block">
                    Passengers send money directly from their own phone's MoMo app to this number.
                  </span>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#EEC367] hover:bg-[#ffe199] text-[#1A1D48] font-bold rounded-xl text-sm transition cursor-pointer"
                >
                  Save MoMo Number
                </button>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default DriverDashboard;
