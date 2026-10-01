import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { db, sanitizeForFirestore } from '../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc, 
  query,
  orderBy,
  getDocs,
  deleteDoc
} from 'firebase/firestore';
import { UserProfile, RideRecord, ComplaintTicket } from '../types';
import { PrahRideLogo } from './PrahRideLogo';
import { 
  LayoutDashboard, 
  Users, 
  Car, 
  DollarSign, 
  AlertTriangle, 
  LogOut, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Filter, 
  ShieldCheck,
  TrendingUp,
  Receipt,
  Clock,
  Phone,
  MessageSquare,
  Zap,
  CheckCircle,
  Lock,
  Unlock,
  Camera,
  Eye,
  X,
  FileText,
  ExternalLink,
  Trash2,
  RotateCcw
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { profile, logout } = useAuth();

  // Admin Navigation Sections per brief
  // 12. Overview
  // 13. Rides Management
  // 14. Driver Management
  // 15. Revenue Reports
  // 16. Complaints / Support
  const [activeSection, setActiveSection] = useState<'overview' | 'rides' | 'drivers' | 'revenue' | 'complaints'>('overview');

  // Real-time Collections State
  const [rides, setRides] = useState<RideRecord[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [complaints, setComplaints] = useState<ComplaintTicket[]>([]);

  // Search & Filter States
  const [rideSearch, setRideSearch] = useState('');
  const [rideStatusFilter, setRideStatusFilter] = useState<string>('all');
  const [rideTab, setRideTab] = useState<'all' | 'pending' | 'completed'>('all');
  const [driverFilter, setDriverFilter] = useState<'all' | 'PENDING' | 'VERIFIED' | 'REJECTED' | 'suspended'>('all');

  // Selected Detail Modal & Rejection Reason Modal & Photo Lightbox
  const [selectedRideDetail, setSelectedRideDetail] = useState<RideRecord | null>(null);
  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintTicket | null>(null);
  const [adminResolutionNote, setAdminResolutionNote] = useState('');
  const [rejectionModalDriver, setRejectionModalDriver] = useState<UserProfile | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [inspectingPhoto, setInspectingPhoto] = useState<{ url: string; title: string } | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // 1. Listen to all rides
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'rides'), (snap) => {
      const list: RideRecord[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as RideRecord));
      list.sort((a, b) => b.createdAt - a.createdAt);
      setRides(list);
    }, (error) => {
      console.warn("Admin rides sync notice:", error);
    });
    return () => unsub();
  }, []);

  // 2. Listen to all users (passengers + drivers)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      const list: UserProfile[] = [];
      snap.forEach(d => list.push({ uid: d.id, ...d.data() } as UserProfile));
      setUsers(list);
    }, (error) => {
      console.warn("Admin users sync notice:", error);
    });
    return () => unsub();
  }, []);

  // 3. Listen to all complaints / tickets
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'complaints'), (snap) => {
      const list: ComplaintTicket[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as ComplaintTicket));
      list.sort((a, b) => b.createdAt - a.createdAt);
      setComplaints(list);
    }, (error) => {
      console.warn("Admin complaints sync notice:", error);
    });
    return () => unsub();
  }, []);

  // Computed Metrics
  const driversList = users.filter(u => u.role === 'driver');
  const pendingDrivers = driversList.filter(d => {
    const s = (d.driverStatus || 'PENDING').toString().toUpperCase();
    return s === 'PENDING';
  });
  const verifiedDrivers = driversList.filter(d => {
    const s = (d.driverStatus || '').toString().toUpperCase();
    return s === 'VERIFIED' || s === 'APPROVED';
  });
  const rejectedDrivers = driversList.filter(d => {
    const s = (d.driverStatus || '').toString().toUpperCase();
    return s === 'REJECTED';
  });
  const activeOnlineDrivers = driversList.filter(d => d.isOnline);
  
  const completedRides = rides.filter(r => r.status === 'completed');
  const totalRevenue = completedRides.reduce((acc, r) => acc + r.fareGhs, 0);

  const todayStr = new Date().toDateString();
  const todayCompleted = completedRides.filter(r => new Date(r.createdAt).toDateString() === todayStr);
  const todayRevenue = todayCompleted.reduce((acc, r) => acc + r.fareGhs, 0);

  const everydayRides = completedRides.filter(r => r.rideType === 'Everyday');
  const everydayRidesCount = everydayRides.length;
  const everydayRevenue = everydayRides.reduce((acc, r) => acc + (Number(r.fareGhs) || 0), 0);

  const airportRides = completedRides.filter(r => r.rideType === 'Airport');
  const airportRidesCount = airportRides.length;
  const airportRevenue = airportRides.reduce((acc, r) => acc + (Number(r.fareGhs) || 0), 0);

  // Driver Verification Actions:
  // PART 2: Approve green -> VERIFIED + lock
  const handleApproveVerification = async (driverId: string) => {
    try {
      await updateDoc(doc(db, 'users', driverId), sanitizeForFirestore({
        driverStatus: 'VERIFIED',
        isLocked: true,
        rejectionReason: null,
        verifiedAt: Date.now(),
      }));
      setActionSuccessMessage('Driver successfully marked as VERIFIED and profile locked.');
      setTimeout(() => setActionSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Failed to approve driver:', err);
      alert(err.message || 'Failed to approve driver.');
    }
  };

  // PART 2: Reject red + reason -> REJECTED + unlock
  const handleConfirmRejection = async () => {
    if (!rejectionModalDriver) return;
    const reason = rejectionReasonInput.trim() || 'Verification photos or vehicle details do not meet safety requirements.';
    try {
      await updateDoc(doc(db, 'users', rejectionModalDriver.uid), sanitizeForFirestore({
        driverStatus: 'REJECTED',
        isLocked: false,
        rejectionReason: reason,
        rejectedAt: Date.now(),
      }));
      setRejectionModalDriver(null);
      setRejectionReasonInput('');
      setActionSuccessMessage('Driver application marked as REJECTED and profile unlocked for resubmission.');
      setTimeout(() => setActionSuccessMessage(null), 3500);
    } catch (err: any) {
      console.error('Failed to reject driver:', err);
      alert(err.message || 'Failed to reject driver.');
    }
  };

  // Driver Actions: Suspend or Reinstate
  const handleDriverStatusChange = async (driverId: string, status: 'approved' | 'rejected' | 'suspended') => {
    try {
      if (status === 'approved') {
        await handleApproveVerification(driverId);
      } else {
        await updateDoc(doc(db, 'users', driverId), sanitizeForFirestore({ 
          driverStatus: status,
          isLocked: status === 'suspended' ? false : true 
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Resolve Complaint Ticket
  const handleResolveComplaint = async (ticketId: string) => {
    try {
      await updateDoc(doc(db, 'complaints', ticketId), sanitizeForFirestore({
        status: 'resolved',
        resolvedAt: Date.now(),
        adminNotes: adminResolutionNote || 'Resolved by Prah Ride Operations',
      }));
      setSelectedComplaint(null);
      setAdminResolutionNote('');
    } catch (err) {
      console.error(err);
    }
  };

  // Purge all test data action (wipes rides & complaints to 0)
  const handlePurgeAllTestData = async () => {
    if (!window.confirm('Reset all test rides and complaints? This will wipe all test records back to 0.')) return;
    try {
      const ridesSnap = await getDocs(collection(db, 'rides'));
      for (const d of ridesSnap.docs) {
        await deleteDoc(doc(db, 'rides', d.id));
      }
      const complaintsSnap = await getDocs(collection(db, 'complaints'));
      for (const d of complaintsSnap.docs) {
        await deleteDoc(doc(db, 'complaints', d.id));
      }
      setActionSuccessMessage('Database reset successfully: 0 rides, 0 complaints, GHS 0 revenue.');
      setTimeout(() => setActionSuccessMessage(null), 3500);
    } catch (err: any) {
      console.error(err);
      alert('Error clearing data: ' + err.message);
    }
  };

  // Filtered Rides (supporting rideTab: all, pending, completed)
  const filteredRides = rides.filter(r => {
    if (rideTab === 'pending' && r.status === 'completed') return false;
    if (rideTab === 'completed' && r.status !== 'completed') return false;
    if (rideStatusFilter !== 'all' && r.status !== rideStatusFilter) return false;
    if (!rideSearch.trim()) return true;
    const s = rideSearch.toLowerCase();
    return (
      r.passengerName?.toLowerCase().includes(s) ||
      r.pickupAddress?.toLowerCase().includes(s) ||
      r.dropoffAddress?.toLowerCase().includes(s) ||
      r.driverName?.toLowerCase().includes(s) ||
      r.id?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="min-h-screen bg-[#0d0f26] text-white flex flex-col md:flex-row font-sans selection:bg-[#EEC367] selection:text-[#1A1D48]">
      
      {/* Visual Sidebar Shell for Internal Admin Operations (Distinct from public site per brief) */}
      <aside className="w-full md:w-64 bg-[#14163b] border-r border-[#EEC367]/20 flex flex-col justify-between shrink-0">
        <div>
          {/* Admin Header */}
          <div className="p-6 border-b border-gray-800">
            <PrahRideLogo size="sm" showTagline={false} />
            <div className="mt-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#2ECC71]" />
              <span className="text-[11px] font-bold text-[#EEC367] uppercase tracking-wider">
                Twin City Operations
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5 text-xs font-semibold">
            <button
              onClick={() => setActiveSection('overview')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                activeSection === 'overview'
                  ? 'bg-[#EEC367] text-[#1A1D48] shadow-lg font-bold'
                  : 'text-gray-300 hover:bg-[#1A1D48] hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveSection('rides')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition ${
                activeSection === 'rides'
                  ? 'bg-[#EEC367] text-[#1A1D48] shadow-lg font-bold'
                  : 'text-gray-300 hover:bg-[#1A1D48] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Car className="w-4 h-4" />
                <span>Rides Management</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/20">{rides.length}</span>
            </button>

            <button
              onClick={() => setActiveSection('drivers')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition ${
                activeSection === 'drivers'
                  ? 'bg-[#EEC367] text-[#1A1D48] shadow-lg font-bold'
                  : 'text-gray-300 hover:bg-[#1A1D48] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4" />
                <span>Driver Fleet</span>
              </div>
              {pendingDrivers.length > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500 text-black font-bold animate-pulse">
                  {pendingDrivers.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveSection('revenue')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                activeSection === 'revenue'
                  ? 'bg-[#EEC367] text-[#1A1D48] shadow-lg font-bold'
                  : 'text-gray-300 hover:bg-[#1A1D48] hover:text-white'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>Revenue Reports</span>
            </button>

            <button
              onClick={() => setActiveSection('complaints')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition ${
                activeSection === 'complaints'
                  ? 'bg-[#EEC367] text-[#1A1D48] shadow-lg font-bold'
                  : 'text-gray-300 hover:bg-[#1A1D48] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-4 h-4" />
                <span>Complaints / Disputes</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/20 font-bold">
                {complaints.filter(c => c.status === 'open').length}
              </span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-800">
          <div className="p-3 bg-[#111333] rounded-xl mb-3 text-xs">
            <span className="text-gray-400 block text-[10px]">Logged in as</span>
            <span className="font-bold text-white truncate block">{profile?.email}</span>
            <span className="text-[10px] text-[#EEC367]">Super Administrator</span>
          </div>

          <button
            onClick={() => logout()}
            className="w-full py-2.5 px-3 bg-red-950/40 hover:bg-red-900/60 text-red-300 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2 border border-red-500/30"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Operations Area */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        
        {/* 12. OVERVIEW */}
        {activeSection === 'overview' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 style={{ fontFamily: "'Cinzel', serif" }} className="text-2xl sm:text-3xl font-bold text-white">
                  Sekondi-Takoradi Operations Overview
                </h1>
                <p className="text-xs text-gray-400">Live operational pulse and fleet activity</p>
              </div>

              <button
                type="button"
                onClick={handlePurgeAllTestData}
                className="self-start sm:self-auto px-3.5 py-2 bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                title="Wipe test rides & complaints back to 0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset Database to Zero</span>
              </button>
            </div>

            {/* Quick Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-[#14163b] border border-[#EEC367]/30 rounded-2xl p-5 shadow-xl">
                <span className="text-xs text-gray-400 font-semibold block">Today's Revenue</span>
                <span className="text-3xl font-black text-[#2ECC71] mt-1 block">GHS {todayRevenue}</span>
                <span className="text-[10px] text-gray-400">{todayCompleted.length} rides today</span>
              </div>

              <div className="bg-[#14163b] border border-[#EEC367]/30 rounded-2xl p-5 shadow-xl">
                <span className="text-xs text-gray-400 font-semibold block">Total Platform Revenue</span>
                <span className="text-3xl font-black text-[#2ECC71] mt-1 block">GHS {totalRevenue}</span>
                <span className="text-[10px] text-gray-400">{completedRides.length} completed trips</span>
              </div>

              <div className="bg-[#14163b] border border-[#EEC367]/30 rounded-2xl p-5 shadow-xl">
                <span className="text-xs text-gray-400 font-semibold block">Online Active Drivers</span>
                <span className="text-3xl font-black text-[#EEC367] mt-1 block">{activeOnlineDrivers.length}</span>
                <span className="text-[10px] text-gray-400">{activeOnlineDrivers.length} of {verifiedDrivers.length} approved</span>
              </div>

              <div className="bg-[#14163b] border border-[#EEC367]/30 rounded-2xl p-5 shadow-xl">
                <span className="text-xs text-gray-400 font-semibold block">Pending Driver Approvals</span>
                <span className="text-3xl font-black text-amber-400 mt-1 block">{pendingDrivers.length}</span>
                <span className="text-[10px] text-gray-400">Requires document check</span>
              </div>
            </div>

            {/* Empty Activity Chart per User Brief */}
            <div className="bg-[#14163b] border border-gray-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#EEC367]" />
                    <span>Twin City Trip Activity & Revenue Flow</span>
                  </h3>
                  <p className="text-xs text-gray-400">Hourly ride booking velocity across Sekondi-Takoradi hubs</p>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-[#1A1D48] text-gray-400 border border-gray-700">
                  Live Operations
                </span>
              </div>

              <div className="h-44 border border-dashed border-gray-800 rounded-2xl flex flex-col items-center justify-center text-center p-6 bg-[#111328]/60">
                <TrendingUp className="w-10 h-10 text-gray-600 mb-2 opacity-50" />
                <h4 className="font-bold text-white text-sm">No activity yet - launch in Sekondi-Takoradi</h4>
                <p className="text-xs text-gray-400 mt-1 max-w-sm">
                  Trip activity, hourly bookings, and revenue flow will chart here in real-time as rides begin across the Twin City.
                </p>
              </div>
            </div>

            {/* Pending Approvals Alert Banner */}
            {pendingDrivers.length > 0 && (
              <div className="p-4 bg-amber-500/15 border-2 border-amber-500/50 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      {pendingDrivers.length} Driver Application(s) Awaiting Review
                    </h4>
                    <p className="text-xs text-gray-300">
                      Drivers cannot go online in Sekondi-Takoradi until approved.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setDriverFilter('PENDING');
                    setActiveSection('drivers');
                  }}
                  className="px-4 py-2 bg-amber-400 text-black font-bold text-xs rounded-xl hover:bg-amber-300 transition"
                >
                  Review Applications
                </button>
              </div>
            )}
          </div>
        )}

        {/* 13. RIDES MANAGEMENT */}
        {activeSection === 'rides' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h1 style={{ fontFamily: "'Cinzel', serif" }} className="text-2xl sm:text-3xl font-bold text-white">
                    Automated Rides Management
                  </h1>
                  <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-[#2ECC71]/20 text-[#2ECC71] border border-[#2ECC71]/40 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2ECC71] animate-ping" />
                    <span>Auto-Dispatch</span>
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  100% automated lifecycle · Customer booking triggers instant driver broadcast with zero manual dispatch required
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={rideSearch}
                    onChange={(e) => setRideSearch(e.target.value)}
                    placeholder="Search passenger, driver, place..."
                    className="pl-9 pr-3 py-2 bg-[#14163b] border border-gray-700 rounded-xl text-xs text-white focus:outline-none focus:border-[#EEC367]"
                  />
                </div>

                <select
                  value={rideStatusFilter}
                  onChange={(e) => setRideStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-[#14163b] border border-gray-700 rounded-xl text-xs text-white focus:outline-none focus:border-[#EEC367]"
                >
                  <option value="all">All Statuses ({rides.length})</option>
                  <option value="requested">Requested (Auto-routing)</option>
                  <option value="accepted">Accepted</option>
                  <option value="arriving">Arriving</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Tabs: All (0), Pending (0), Completed (0) */}
            <div className="flex bg-[#14163b] p-1 rounded-xl border border-gray-800 text-xs w-fit">
              <button
                type="button"
                onClick={() => setRideTab('all')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  rideTab === 'all' ? 'bg-[#EEC367] text-[#1A1D48] shadow-md' : 'text-gray-400 hover:text-white'
                }`}
              >
                All ({rides.length})
              </button>
              <button
                type="button"
                onClick={() => setRideTab('pending')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  rideTab === 'pending' ? 'bg-[#EEC367] text-[#1A1D48] shadow-md' : 'text-gray-400 hover:text-white'
                }`}
              >
                Pending ({rides.filter(r => r.status !== 'completed' && r.status !== 'cancelled').length})
              </button>
              <button
                type="button"
                onClick={() => setRideTab('completed')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  rideTab === 'completed' ? 'bg-[#EEC367] text-[#1A1D48] shadow-md' : 'text-gray-400 hover:text-white'
                }`}
              >
                Completed ({rides.filter(r => r.status === 'completed').length})
              </button>
            </div>

            {/* Automated Dispatch Architecture Banner */}
            <div className="bg-[#111328] border border-[#2ECC71]/40 rounded-3xl p-5 shadow-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-[#2ECC71]/15 text-[#2ECC71] flex items-center justify-center border border-[#2ECC71]/30">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Automatic Dispatch Engine</span>
                      <span className="w-2 h-2 rounded-full bg-[#2ECC71] animate-ping" />
                    </h3>
                    <p className="text-[11px] text-gray-400">
                      Rides flow 100% automatically from passenger booking to driver station with zero manual dispatch required.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-semibold px-3 py-1.5 rounded-full bg-[#2ECC71]/10 text-[#2ECC71] border border-[#2ECC71]/30">
                  <CheckCircle className="w-4 h-4" />
                  <span>Real-time Live Sync Active</span>
                </div>
              </div>

              {/* Automatic Progression Flow - Step 1 & Step 2 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                <div className="bg-[#1A1D48]/80 p-3 rounded-2xl border border-gray-800">
                  <span className="text-[9px] uppercase font-bold text-gray-400 block mb-1">Step 1 · Automatic</span>
                  <strong className="text-white block">Customer Books</strong>
                  <span className="text-gray-400 text-[10px]">Instant Firestore write (status: Requested)</span>
                </div>

                <div className="bg-[#1A1D48]/80 p-3 rounded-2xl border border-gray-800">
                  <span className="text-[9px] uppercase font-bold text-[#EEC367] block mb-1">Step 2 · Automatic</span>
                  <strong className="text-white block">Driver Station Receives</strong>
                  <span className="text-gray-400 text-[10px]">Broadcast to verified drivers on /driver</span>
                </div>
              </div>
            </div>

            {/* Filtered Table or Empty State */}
            <div className="bg-[#14163b] border border-gray-800 rounded-3xl p-6 shadow-xl">
              {filteredRides.length === 0 ? (
                <div className="py-14 text-center">
                  <span className="text-4xl block mb-3">🚕</span>
                  <h4 className="text-base font-bold text-white mb-1">No rides yet</h4>
                  <p className="text-xs text-gray-400 max-w-md mx-auto">
                    Rides will appear here when passengers book from St. Benedict Hospital, Market Circle, etc
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-400 pb-2">
                        <th className="pb-3">Created</th>
                        <th className="pb-3">Passenger</th>
                        <th className="pb-3">Route</th>
                        <th className="pb-3">Type</th>
                        <th className="pb-3">Driver</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3">Payment</th>
                        <th className="pb-3 text-right">Fare</th>
                        <th className="pb-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800 text-gray-200">
                      {filteredRides.map(r => (
                        <tr key={r.id} className="hover:bg-[#1A1D48]/60">
                          <td className="py-3 font-mono text-[11px] text-gray-400">
                            {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-3 font-semibold text-white">{r.passengerName}</td>
                          <td className="py-3 max-w-xs truncate">{r.pickupAddress} → {r.dropoffAddress}</td>
                          <td className="py-3">{r.rideType}</td>
                          <td className="py-3">{r.driverName || <span className="text-gray-500 italic">Unassigned</span>}</td>
                          <td className="py-3">
                            <span className="capitalize px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1A1D48] border border-gray-700">
                              {r.status}
                            </span>
                          </td>
                          <td className="py-3">
                            <span className={`text-[11px] font-semibold ${
                              r.paymentStatus === 'Payment confirmed' ? 'text-[#2ECC71]' :
                              r.paymentStatus === 'Passenger marked as paid' ? 'text-blue-400' :
                              'text-amber-400'
                            }`}>
                              {r.paymentStatus}
                            </span>
                          </td>
                          <td className="py-3 text-right font-black text-[#2ECC71]">GHS {r.fareGhs}</td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => setSelectedRideDetail(r)}
                              className="text-xs text-[#EEC367] hover:underline font-bold"
                            >
                              Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 14. DRIVER MANAGEMENT */}
        {activeSection === 'drivers' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 style={{ fontFamily: "'Cinzel', serif" }} className="text-2xl sm:text-3xl font-bold text-white">
                  Driver Fleet Management
                </h1>
                <p className="text-xs text-gray-400">Review credentials, approve onboarding, or suspend drivers</p>
              </div>

              {/* Status filter tabs */}
              <div className="flex bg-[#14163b] p-1 rounded-xl border border-gray-800 text-xs overflow-x-auto">
                {(['all', 'PENDING', 'VERIFIED', 'REJECTED', 'suspended'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setDriverFilter(tab)}
                    className={`px-3 py-1.5 rounded-lg uppercase tracking-wider font-bold text-[10px] transition ${
                      driverFilter === tab ? 'bg-[#EEC367] text-[#1A1D48]' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {tab === 'all' ? 'All Drivers' : tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Drivers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {driversList.length === 0 ? (
                <div className="col-span-full py-16 text-center text-gray-400 bg-[#14163b]/50 rounded-3xl border border-gray-800 p-8">
                  <Users className="w-12 h-12 mx-auto text-gray-500 mb-3 opacity-60" />
                  <p className="text-base font-bold text-white">Fleet is Currently Empty</p>
                  <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                    No drivers have registered yet. As new driver partners submit their profiles and vehicle verification documents, they will appear here for review and onboarding.
                  </p>
                </div>
              ) : (
                driversList
                  .filter(d => {
                    if (driverFilter === 'all') return true;
                    const s = (d.driverStatus || 'PENDING').toString().toUpperCase();
                    if (driverFilter === 'VERIFIED') return s === 'VERIFIED' || s === 'APPROVED';
                    if (driverFilter === 'PENDING') return s === 'PENDING';
                    if (driverFilter === 'REJECTED') return s === 'REJECTED';
                    if (driverFilter === 'suspended') return s.toLowerCase() === 'suspended';
                    return true;
                  })
                  .map(driver => {
                    const statusStr = (driver.driverStatus || 'PENDING').toString().toUpperCase();
                    const isVerified = statusStr === 'VERIFIED' || statusStr === 'APPROVED';
                    const isPending = statusStr === 'PENDING';
                    const isRejected = statusStr === 'REJECTED';
                    const isSuspended = statusStr.toLowerCase() === 'suspended';

                    const carModel = driver.carModel || driver.vehicleMakeModel || 'Unspecified Model';
                    const carColor = driver.carColor || 'Standard';
                    const plate = driver.licensePlate || 'PENDING';

                    return (
                      <div
                        key={driver.uid}
                        className="bg-[#14163b] border-2 border-gray-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between space-y-4 hover:border-[#EEC367]/40 transition"
                      >
                        <div>
                          {/* Driver Header */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              {driver.facePhotoUrl || driver.avatarUrl ? (
                                <img
                                  src={driver.facePhotoUrl || driver.avatarUrl || ''}
                                  alt={driver.fullName || 'Driver'}
                                  onClick={() => driver.facePhotoUrl && setInspectingPhoto({ url: driver.facePhotoUrl, title: `${driver.fullName} - Face Selfie` })}
                                  className="w-12 h-12 rounded-full object-cover border-2 border-[#00C853] cursor-pointer hover:opacity-90 transition"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-[#1A1D48] border-2 border-gray-700 flex items-center justify-center font-bold text-[#EEC367] text-base">
                                  {driver.fullName?.charAt(0) || 'D'}
                                </div>
                              )}
                              <div>
                                <h4 className="font-bold text-white text-sm">{driver.fullName || 'Unnamed Driver'}</h4>
                                <span className="text-[11px] text-gray-400 font-mono">{driver.phone || 'No phone'}</span>
                              </div>
                            </div>

                            {/* Status Badge */}
                            {isVerified && (
                              <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#00C853] text-white flex items-center gap-1 shadow-sm">
                                <CheckCircle className="w-3 h-3" />
                                <span>VERIFIED</span>
                              </span>
                            )}
                            {isPending && (
                              <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse">
                                PENDING
                              </span>
                            )}
                            {isRejected && (
                              <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40">
                                REJECTED
                              </span>
                            )}
                            {isSuspended && (
                              <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-red-950 text-red-400 border border-red-800">
                                SUSPENDED
                              </span>
                            )}
                          </div>

                          {/* Vehicle Information Box & Ghana Plate */}
                          <div className="p-3 bg-[#111333] rounded-2xl border border-gray-800 space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-400 text-[11px]">Vehicle:</span>
                              <span className="text-white font-bold">{carColor} {carModel}</span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-gray-400 text-[11px]">Ghana Plate:</span>
                              <span className="px-2.5 py-1 bg-[#111] border border-gray-600 rounded-md font-mono font-black text-white tracking-widest text-[11px] shadow-sm">
                                {plate}
                              </span>
                            </div>

                            {driver.momoNumber && (
                              <div className="flex items-center justify-between">
                                <span className="text-gray-400 text-[11px]">MoMo:</span>
                                <span className="text-[#EEC367] font-mono font-semibold">{driver.momoNumber}</span>
                              </div>
                            )}

                            {isRejected && driver.rejectionReason && (
                              <div className="p-2 bg-red-950/40 border border-red-500/30 rounded-xl text-[10px] text-red-300">
                                <strong className="block text-red-200">Rejection Reason:</strong>
                                <span>{driver.rejectionReason}</span>
                              </div>
                            )}
                          </div>

                          {/* Verification Photos Preview Gallery (Face, Car Front, Car Side) */}
                          <div className="mt-3">
                            <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1.5">
                              Verification Photos (Tap to Inspect)
                            </span>
                            <div className="grid grid-cols-3 gap-2">
                              {/* Face Selfie */}
                              <div
                                onClick={() => driver.facePhotoUrl && setInspectingPhoto({ url: driver.facePhotoUrl, title: `${driver.fullName} - Face Selfie` })}
                                className="bg-[#111333] border border-gray-800 rounded-xl overflow-hidden cursor-pointer hover:border-[#EEC367] transition group text-center"
                              >
                                {driver.facePhotoUrl ? (
                                  <img src={driver.facePhotoUrl} alt="Face" className="w-full h-16 object-cover" />
                                ) : (
                                  <div className="h-16 flex items-center justify-center text-gray-600">
                                    <Camera className="w-4 h-4" />
                                  </div>
                                )}
                                <span className="block text-[9px] text-gray-400 py-0.5 truncate bg-[#0d0f28]">
                                  Face Selfie
                                </span>
                              </div>

                              {/* Car Front */}
                              <div
                                onClick={() => driver.carFrontPhotoUrl && setInspectingPhoto({ url: driver.carFrontPhotoUrl, title: `${driver.fullName} - Car Front (Plate Visible)` })}
                                className="bg-[#111333] border border-gray-800 rounded-xl overflow-hidden cursor-pointer hover:border-[#EEC367] transition group text-center"
                              >
                                {driver.carFrontPhotoUrl ? (
                                  <img src={driver.carFrontPhotoUrl} alt="Front" className="w-full h-16 object-cover" />
                                ) : (
                                  <div className="h-16 flex items-center justify-center text-gray-600">
                                    <Car className="w-4 h-4" />
                                  </div>
                                )}
                                <span className="block text-[9px] text-gray-400 py-0.5 truncate bg-[#0d0f28]">
                                  Front (Plate)
                                </span>
                              </div>

                              {/* Car Side */}
                              <div
                                onClick={() => driver.carSidePhotoUrl && setInspectingPhoto({ url: driver.carSidePhotoUrl, title: `${driver.fullName} - Car Side (Color Visible)` })}
                                className="bg-[#111333] border border-gray-800 rounded-xl overflow-hidden cursor-pointer hover:border-[#EEC367] transition group text-center"
                              >
                                {driver.carSidePhotoUrl ? (
                                  <img src={driver.carSidePhotoUrl} alt="Side" className="w-full h-16 object-cover" />
                                ) : (
                                  <div className="h-16 flex items-center justify-center text-gray-600">
                                    <Car className="w-4 h-4" />
                                  </div>
                                )}
                                <span className="block text-[9px] text-gray-400 py-0.5 truncate bg-[#0d0f28]">
                                  Side (Color)
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* PART 2 - Approve green -> VERIFIED + lock, Reject red + reason -> REJECTED + unlock */}
                        <div className="pt-3 border-t border-gray-800 flex items-center gap-2">
                          {isPending && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleApproveVerification(driver.uid)}
                                className="flex-1 py-2.5 bg-[#00C853] hover:bg-[#00b046] text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/50 cursor-pointer"
                              >
                                <CheckCircle className="w-4 h-4" />
                                <span>Approve (VERIFIED)</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setRejectionModalDriver(driver);
                                  setRejectionReasonInput('');
                                }}
                                className="px-3.5 py-2.5 bg-red-950/60 hover:bg-red-900 text-red-300 font-bold text-xs rounded-xl transition border border-red-500/30 flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <XCircle className="w-4 h-4" />
                                <span>Reject</span>
                              </button>
                            </>
                          )}

                          {isVerified && (
                            <button
                              type="button"
                              onClick={() => handleDriverStatusChange(driver.uid, 'suspended')}
                              className="w-full py-2 bg-red-950/40 hover:bg-red-900/60 text-red-300 font-bold text-xs rounded-xl transition border border-red-500/30 flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Suspend Driver</span>
                            </button>
                          )}

                          {isRejected && (
                            <button
                              type="button"
                              onClick={() => handleApproveVerification(driver.uid)}
                              className="w-full py-2 bg-[#00C853] hover:bg-[#00b046] text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Re-evaluate & Approve</span>
                            </button>
                          )}

                          {isSuspended && (
                            <button
                              type="button"
                              onClick={() => handleDriverStatusChange(driver.uid, 'approved')}
                              className="w-full py-2 bg-[#2ECC71] hover:bg-[#27ae60] text-[#1A1D48] font-bold text-xs rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Reinstate Driver</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        )}

        {/* 15. REVENUE REPORTS */}
        {activeSection === 'revenue' && (
          <div className="space-y-6">
            <div>
              <h1 style={{ fontFamily: "'Cinzel', serif" }} className="text-2xl sm:text-3xl font-bold text-white">
                Revenue Reports & Breakdown
              </h1>
              <p className="text-xs text-gray-400">Financial metrics and route revenue across Sekondi-Takoradi</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-[#14163b] border border-[#EEC367]/40 rounded-3xl p-6 shadow-xl">
                <span className="text-xs text-gray-400 font-semibold block">Total Revenue (All Time)</span>
                <span className="text-4xl font-black text-[#2ECC71] mt-2 block">GHS {totalRevenue}</span>
                <span className="text-xs text-gray-400 mt-2 block">{completedRides.length} completed transactions</span>
              </div>

              <div className="bg-[#14163b] border border-gray-800 rounded-3xl p-6 shadow-xl">
                <span className="text-xs text-gray-400 font-semibold block">Everyday Rides</span>
                <span className="text-3xl font-black text-white mt-2 block">{everydayRidesCount} trips</span>
                <span className="text-xs text-[#2ECC71] mt-2 block">GHS {everydayRevenue} total</span>
              </div>

              <div className="bg-[#14163b] border border-gray-800 rounded-3xl p-6 shadow-xl">
                <span className="text-xs text-gray-400 font-semibold block">Airport Transfers</span>
                <span className="text-3xl font-black text-white mt-2 block">{airportRidesCount} trips</span>
                <span className="text-xs text-[#2ECC71] mt-2 block">GHS {airportRevenue} total</span>
              </div>
            </div>

            {/* Empty Chart Data Section per User Brief */}
            <div className="bg-[#14163b] border border-gray-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#EEC367]" />
                    <span>Revenue Analytics</span>
                  </h3>
                  <p className="text-xs text-gray-400">Financial velocity across Sekondi-Takoradi hubs</p>
                </div>
              </div>

              {completedRides.length === 0 ? (
                <div className="h-44 border border-dashed border-gray-800 rounded-2xl flex flex-col items-center justify-center text-center p-6 bg-[#111328]/60">
                  <TrendingUp className="w-10 h-10 text-gray-600 mb-2 opacity-50" />
                  <h4 className="font-bold text-white text-sm">No chart data until first real trip</h4>
                  <p className="text-xs text-gray-400 mt-1 max-w-sm">
                    Visual financial analytics and graphs will generate automatically after live passenger bookings in Sekondi-Takoradi.
                  </p>
                </div>
              ) : (
                <div className="h-44 flex items-center justify-center text-xs text-emerald-400 font-semibold">
                  Live revenue visualization active
                </div>
              )}
            </div>

            {/* Transactions Ledger Table */}
            <div className="bg-[#14163b] border border-gray-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-base">Transactions Ledger</h3>
                <span className="text-xs text-gray-400">{completedRides.length} record(s)</span>
              </div>

              {completedRides.length === 0 ? (
                <div className="py-14 text-center bg-[#111328]/60 border border-dashed border-gray-800 rounded-2xl">
                  <Receipt className="w-10 h-10 text-gray-600 mx-auto mb-2 opacity-50" />
                  <h4 className="font-bold text-white text-sm">No transactions yet</h4>
                  <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                    Settlement records and fare receipts will automatically log here as passengers complete trips.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-400 pb-2">
                        <th className="pb-3">Date</th>
                        <th className="pb-3">Trip Ref</th>
                        <th className="pb-3">Passenger</th>
                        <th className="pb-3">Driver</th>
                        <th className="pb-3">Method</th>
                        <th className="pb-3 text-right">Fare</th>
                        <th className="pb-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800 text-gray-200">
                      {completedRides.map(r => (
                        <tr key={r.id}>
                          <td className="py-3 font-mono text-[11px] text-gray-400">
                            {new Date(r.completedAt || r.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 font-mono text-[#EEC367]">#{r.id.slice(0, 6)}</td>
                          <td className="py-3 text-white">{r.passengerName}</td>
                          <td className="py-3">{r.driverName || 'Verified Driver'}</td>
                          <td className="py-3">{r.paymentMethod}</td>
                          <td className="py-3 text-right font-black text-[#2ECC71]">GHS {r.fareGhs}</td>
                          <td className="py-3 text-right text-emerald-400 font-semibold">{r.paymentStatus}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-[#14163b] border border-gray-800 rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="font-bold text-white text-base">Payment Method Settlement Split</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-[#111333] rounded-2xl border border-gray-800">
                  <span className="text-xs text-gray-400 block font-semibold">Direct MoMo Settlements</span>
                  <span className="text-xl font-bold text-white mt-1 block">
                    {completedRides.filter(r => r.paymentMethod === 'MoMo').length} rides
                  </span>
                  <span className="text-[11px] text-gray-400">Direct from passenger phone to driver MoMo</span>
                </div>
                <div className="p-4 bg-[#111333] rounded-2xl border border-gray-800">
                  <span className="text-xs text-gray-400 block font-semibold">Cash On Arrival Settlements</span>
                  <span className="text-xl font-bold text-white mt-1 block">
                    {completedRides.filter(r => r.paymentMethod === 'Cash').length} rides
                  </span>
                  <span className="text-[11px] text-gray-400">Hand-to-hand currency</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 16. COMPLAINTS & PAYMENT DISPUTES */}
        {activeSection === 'complaints' && (
          <div className="space-y-6">
            <div>
              <h1 style={{ fontFamily: "'Cinzel', serif" }} className="text-2xl sm:text-3xl font-bold text-white">
                Customer Support & Payment Disputes ({complaints.length})
              </h1>
              <p className="text-xs text-gray-400">
                Tickets submitted by passengers or drivers (self-reported MoMo / trip issues)
              </p>
            </div>

            {complaints.length === 0 ? (
              <div className="bg-[#14163b] border border-gray-800 rounded-3xl p-12 text-center max-w-md mx-auto shadow-xl">
                <ShieldCheck className="w-12 h-12 text-[#2ECC71] mx-auto mb-3" />
                <h4 className="text-base font-bold text-white">No complaints - great service!</h4>
                <p className="text-xs text-gray-400 mt-1">
                  0 active complaints or disputes reported across Sekondi-Takoradi.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {complaints.map(t => (
                  <div
                    key={t.id}
                    className="bg-[#14163b] border border-gray-800 rounded-2xl p-5 hover:border-[#EEC367]/40 transition flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-white">{t.subject}</span>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          t.status === 'resolved' ? 'bg-[#2ECC71]/15 text-[#2ECC71]' : 'bg-red-500/15 text-red-400 animate-pulse'
                        }`}>
                          {t.status}
                        </span>
                      </div>

                      <p className="text-xs text-gray-300 bg-[#111333] p-3 rounded-xl border border-gray-800/60 mb-3">
                        "{t.description}"
                      </p>

                      <div className="text-[11px] text-gray-400 space-y-1">
                        <div>Submitted by: <strong className="text-white">{t.userName}</strong> ({t.userRole})</div>
                        <div>Contact: {t.userPhone || t.userEmail}</div>
                        {t.adminNotes && (
                          <div className="text-[#2ECC71] font-semibold mt-1">Admin note: {t.adminNotes}</div>
                        )}
                      </div>
                    </div>

                    {t.status !== 'resolved' && (
                      <div className="pt-2 border-t border-gray-800">
                        <button
                          onClick={() => setSelectedComplaint(t)}
                          className="w-full py-2 bg-[#EEC367] hover:bg-[#ffe199] text-[#1A1D48] font-bold text-xs rounded-xl transition"
                        >
                          Resolve Ticket
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      {/* RESOLVE COMPLAINT MODAL */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#14163b] border-2 border-[#EEC367] rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <h3 className="font-bold text-white text-base mb-2">Resolve Support Ticket</h3>
            <p className="text-xs text-gray-400 mb-4">{selectedComplaint.subject}</p>

            <textarea
              rows={3}
              value={adminResolutionNote}
              onChange={(e) => setAdminResolutionNote(e.target.value)}
              placeholder="Enter resolution notes (e.g. Verified MoMo transaction with driver / Passenger refunded)..."
              className="w-full p-3 bg-[#111333] border border-gray-700 rounded-xl text-white text-xs mb-4 focus:outline-none focus:border-[#EEC367]"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setSelectedComplaint(null)}
                className="flex-1 py-2.5 bg-gray-800 text-gray-300 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => handleResolveComplaint(selectedComplaint.id)}
                className="flex-1 py-2.5 bg-[#2ECC71] text-[#1A1D48] text-xs font-bold rounded-xl"
              >
                Mark as Resolved
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RIDE DETAIL MODAL */}
      {selectedRideDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#14163b] border-2 border-[#EEC367] rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedRideDetail(null)}
              className="absolute top-5 right-5 text-gray-400 hover:text-white"
            >
              ✕
            </button>

            <h3 className="font-bold text-white text-base mb-1">Ride Details #{selectedRideDetail.id.slice(0, 8)}</h3>
            <span className="text-xs text-[#EEC367] font-semibold block mb-4">Sekondi-Takoradi Official Record</span>

            <div className="space-y-2.5 text-xs text-gray-300 border-y border-gray-800 py-3 mb-4">
              <div><strong>Passenger:</strong> {selectedRideDetail.passengerName} ({selectedRideDetail.passengerPhone})</div>
              <div><strong>Driver:</strong> {selectedRideDetail.driverName || 'Unassigned'} ({selectedRideDetail.driverPhone || 'N/A'})</div>
              <div><strong>Vehicle:</strong> {selectedRideDetail.driverVehicle} (Plate: {selectedRideDetail.driverPlate})</div>
              <div><strong>MoMo Number:</strong> {selectedRideDetail.driverMomoNumber || 'N/A'}</div>
              <div><strong>Pickup:</strong> {selectedRideDetail.pickupAddress}</div>
              <div><strong>Drop-off:</strong> {selectedRideDetail.dropoffAddress}</div>
              <div><strong>Payment Method:</strong> {selectedRideDetail.paymentMethod}</div>
              <div><strong>Payment Status:</strong> <span className="text-[#2ECC71] font-bold">{selectedRideDetail.paymentStatus}</span></div>
              <div><strong>Calculated Route Fare:</strong> <span className="text-[#2ECC71] font-bold">GHS {selectedRideDetail.fareGhs}</span></div>

              {/* Automatic Lifecycle Audit Timeline */}
              <div className="bg-[#111333] p-3 rounded-2xl border border-gray-800 space-y-1.5 mt-2">
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Automatic Lifecycle Log</span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-gray-500 block text-[10px]">Requested:</span>
                    <span className="text-white font-mono">{new Date(selectedRideDetail.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px]">Driver Accepted:</span>
                    <span className="text-white font-mono">
                      {selectedRideDetail.acceptedAt ? new Date(selectedRideDetail.acceptedAt).toLocaleTimeString() : 'Pending'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px]">Driver Arrived:</span>
                    <span className="text-white font-mono">
                      {selectedRideDetail.arrivedAt ? new Date(selectedRideDetail.arrivedAt).toLocaleTimeString() : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px]">Trip Completed:</span>
                    <span className="text-white font-mono">
                      {selectedRideDetail.completedAt ? new Date(selectedRideDetail.completedAt).toLocaleTimeString() : '—'}
                    </span>
                  </div>
                </div>
              </div>
              
              {selectedRideDetail.driverRating && (
                <div className="bg-[#111333] p-3 rounded-xl border border-gray-800 space-y-1.5 mt-2">
                  <div className="flex items-center justify-between">
                    <strong className="text-white">Passenger Rating:</strong>
                    <span className="text-[#EEC367] font-bold">{selectedRideDetail.driverRating}.0 ★</span>
                  </div>
                  {selectedRideDetail.driverRatingTags && selectedRideDetail.driverRatingTags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {selectedRideDetail.driverRatingTags.map((tag) => (
                        <span key={tag} className="text-[9px] bg-[#EEC367]/15 text-[#EEC367] px-2 py-0.5 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {selectedRideDetail.driverRatingFeedback && (
                    <p className="text-[11px] text-gray-400 italic">"{selectedRideDetail.driverRatingFeedback}"</p>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedRideDetail(null)}
              className="w-full py-2.5 bg-[#EEC367] text-[#1A1D48] font-bold text-xs rounded-xl"
            >
              Close Details
            </button>
          </div>
        </div>
      )}

      {/* 17. DRIVER REJECTION MODAL (PART 2) */}
      {rejectionModalDriver && (
        <div className="fixed inset-0 z-[700] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111328] border-2 border-red-500/50 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Reject Driver Application</h3>
                  <span className="text-[11px] text-gray-400">{rejectionModalDriver.fullName}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRejectionModalDriver(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-300">
              Please enter the specific reason for rejecting this driver. The profile will be unlocked so the driver can correct their submission:
            </p>

            {/* Quick Reason Suggestions */}
            <div className="space-y-1">
              <span className="text-[10px] text-gray-400 uppercase font-bold">Quick Suggestions:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'License plate not visible in front photo',
                  'Car color does not match side photo',
                  'Face selfie is blurry or obscured',
                  'Vehicle model requires valid inspection',
                ].map(suggestion => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setRejectionReasonInput(suggestion)}
                    className="text-[10px] px-2.5 py-1 rounded-lg bg-[#1A1D48] hover:bg-[#282d70] text-gray-300 border border-gray-700 transition text-left cursor-pointer"
                  >
                    + {suggestion}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              required
              rows={3}
              value={rejectionReasonInput}
              onChange={(e) => setRejectionReasonInput(e.target.value)}
              placeholder="Provide a clear, helpful reason for the driver..."
              className="w-full p-3 bg-[#1A1D48] border border-gray-700 rounded-xl text-white text-xs placeholder-gray-500 focus:outline-none focus:border-red-500"
            />

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleConfirmRejection}
                disabled={!rejectionReasonInput.trim()}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl transition shadow-lg disabled:opacity-50 cursor-pointer"
              >
                Confirm Rejection & Unlock
              </button>
              <button
                type="button"
                onClick={() => setRejectionModalDriver(null)}
                className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 18. PHOTO LIGHTBOX INSPECTOR */}
      {inspectingPhoto && (
        <div className="fixed inset-0 z-[800] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-[#111328] border border-gray-700 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <span className="font-bold text-white text-sm">{inspectingPhoto.title}</span>
              <button
                type="button"
                onClick={() => setInspectingPhoto(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[70vh] flex items-center justify-center overflow-hidden rounded-2xl bg-black">
              <img
                src={inspectingPhoto.url}
                alt={inspectingPhoto.title}
                className="max-h-[70vh] w-auto object-contain rounded-xl"
              />
            </div>
            <button
              type="button"
              onClick={() => setInspectingPhoto(null)}
              className="w-full py-2 bg-[#1A1D48] hover:bg-[#282d70] text-white font-bold text-xs rounded-xl transition"
            >
              Close Photo Preview
            </button>
          </div>
        </div>
      )}

      {/* 19. ACTION TOAST BANNER */}
      {actionSuccessMessage && (
        <div className="fixed bottom-6 right-6 z-[900] bg-[#00C853] text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-bounce">
          <CheckCircle className="w-4 h-4" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
