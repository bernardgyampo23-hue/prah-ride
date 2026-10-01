import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { db, sanitizeForFirestore } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { compressImageToDataUrl } from '../lib/supabase';
import { UserProfile, DriverStatus } from '../types';
import { 
  ShieldCheck, 
  Camera, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Car, 
  User, 
  Phone, 
  Lock, 
  Unlock, 
  RefreshCw,
  Sparkles,
  Check
} from 'lucide-react';

interface DriverVerificationProfileProps {
  onBackToStation?: () => void;
}

export const DriverVerificationProfile: React.FC<DriverVerificationProfileProps> = ({ 
  onBackToStation 
}) => {
  const { profile, updateUserProfile } = useAuth();

  // Form State
  const [fullName, setFullName] = useState(profile?.fullName || '');
  const [carModel, setCarModel] = useState(profile?.carModel || profile?.vehicleMakeModel || '');
  const [carColor, setCarColor] = useState(profile?.carColor || '');
  const [licensePlate, setLicensePlate] = useState(profile?.licensePlate || '');
  const [phone, setPhone] = useState(profile?.phone || '');

  // Photo uploads / data URLs
  const [facePhoto, setFacePhoto] = useState<string | null>(profile?.facePhotoUrl || profile?.avatarUrl || null);
  const [carFrontPhoto, setCarFrontPhoto] = useState<string | null>(profile?.carFrontPhotoUrl || null);
  const [carSidePhoto, setCarSidePhoto] = useState<string | null>(profile?.carSidePhotoUrl || null);

  // Live Camera state for Face Selfie
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Submission & Feedback State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requestUpdateMode, setRequestUpdateMode] = useState(false);

  // Determine current verification status
  const rawStatus = (profile?.driverStatus || 'PENDING').toString().toUpperCase();
  const isVerified = rawStatus === 'VERIFIED' || rawStatus === 'APPROVED';
  const isRejected = rawStatus === 'REJECTED';
  const isPending = rawStatus === 'PENDING';
  const isLocked = isVerified && !requestUpdateMode;

  useEffect(() => {
    if (profile) {
      if (profile.fullName) setFullName(profile.fullName);
      if (profile.carModel || profile.vehicleMakeModel) setCarModel(profile.carModel || profile.vehicleMakeModel || '');
      if (profile.carColor) setCarColor(profile.carColor);
      if (profile.licensePlate) setLicensePlate(profile.licensePlate);
      if (profile.phone) setPhone(profile.phone);
      if (profile.facePhotoUrl) setFacePhoto(profile.facePhotoUrl);
      if (profile.carFrontPhotoUrl) setCarFrontPhoto(profile.carFrontPhotoUrl);
      if (profile.carSidePhotoUrl) setCarSidePhoto(profile.carSidePhotoUrl);
    }
  }, [profile]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Camera Handlers
  const startCamera = async () => {
    try {
      setErrorMessage(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.error('Camera access error:', err);
      setErrorMessage('Could not open live camera. Please use the file upload option instead.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const captureCameraPhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 640;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setFacePhoto(dataUrl);
    stopCamera();
  };

  // File Picker Handlers
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setErrorMessage(null);
      const compressed = await compressImageToDataUrl(file, 800);
      setter(compressed);
    } catch (err: any) {
      setErrorMessage('Failed to process image. Please try a different photo.');
    }
  };

  // Submit for Verification
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.uid) return;

    if (!facePhoto) {
      setErrorMessage('Please provide a Face Selfie (via camera or upload).');
      return;
    }
    if (!carFrontPhoto) {
      setErrorMessage('Please upload a photo of your Car Front with the license plate visible.');
      return;
    }
    if (!carSidePhoto) {
      setErrorMessage('Please upload a photo of your Car Side showing the vehicle color.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const formattedPlate = licensePlate.toUpperCase().trim();

    try {
      const updates: Partial<UserProfile> = {
        fullName: fullName.trim(),
        carModel: carModel.trim(),
        vehicleMakeModel: carModel.trim(),
        carColor: carColor.trim(),
        licensePlate: formattedPlate,
        phone: phone.trim(),
        facePhotoUrl: facePhoto,
        avatarUrl: facePhoto,
        carFrontPhotoUrl: carFrontPhoto,
        carSidePhotoUrl: carSidePhoto,
        driverStatus: 'PENDING',
        verificationSubmittedAt: Date.now(),
        isLocked: false,
        rejectionReason: null,
        isOwnerDriver: true,
      };

      const userDocRef = doc(db, 'users', profile.uid);
      await updateDoc(userDocRef, sanitizeForFirestore(updates));
      await updateUserProfile(updates);

      setSuccessMessage('Verification details submitted successfully! Status is now PENDING review by admin.');
      setRequestUpdateMode(false);
    } catch (err: any) {
      console.error('Driver verification submission error:', err);
      setErrorMessage(err.message || 'Failed to submit verification profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Header Card */}
      <div className="bg-[#111328] border-2 border-[#EEC367]/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono tracking-widest uppercase px-3 py-1 rounded-full bg-[#EEC367]/15 text-[#EEC367] border border-[#EEC367]/30 font-bold">
              Prah Ride Official Driver Profile
            </span>
            <h1 style={{ fontFamily: "'Cinzel', serif" }} className="text-2xl sm:text-3xl font-bold text-white mt-2">
              Driver & Vehicle Verification
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Submit your verified identity and vehicle details for Sekondi-Takoradi passenger confidence.
            </p>
          </div>

          {onBackToStation && (
            <button
              onClick={onBackToStation}
              className="px-4 py-2 bg-[#1A1D48] hover:bg-[#232763] text-gray-300 border border-gray-700 rounded-xl text-xs font-bold transition cursor-pointer self-start sm:self-auto"
            >
              ← Back to Station
            </button>
          )}
        </div>

        {/* Verification Status Pill */}
        <div className="mt-5 pt-4 border-t border-gray-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Current Status:</span>
            {isVerified ? (
              <span className="px-3 py-1 bg-[#00C853] text-white text-xs font-bold rounded-full shadow-lg flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>✓ VERIFIED</span>
              </span>
            ) : isRejected ? (
              <span className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full shadow-lg flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>✕ REJECTED</span>
              </span>
            ) : (
              <span className="px-3 py-1 bg-amber-500 text-black text-xs font-bold rounded-full shadow-lg flex items-center gap-1.5 animate-pulse">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>PENDING ADMIN REVIEW</span>
              </span>
            )}

            {profile?.isOwnerDriver && (
              <span className="px-3 py-1 bg-[#0A7E07] text-white text-xs font-bold rounded-full shadow-md">
                ✓ OWNER-OPERATED
              </span>
            )}
          </div>

          {isVerified && !requestUpdateMode && (
            <button
              type="button"
              onClick={() => setRequestUpdateMode(true)}
              className="text-xs text-[#EEC367] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Unlock / Request Changes</span>
            </button>
          )}
        </div>
      </div>

      {/* Alert Notices */}
      {isVerified && !requestUpdateMode && (
        <div className="p-4 bg-[#00C853]/15 border-2 border-[#00C853] rounded-2xl text-white text-xs space-y-1 shadow-lg">
          <div className="flex items-center gap-2 font-bold text-[#00C853]">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm">Account Fully Verified & Locked</span>
          </div>
          <p className="text-gray-300 text-[11px] leading-relaxed">
            Your verification credentials are live. Passengers see your <strong>✓ VERIFIED</strong> and <strong>✓ OWNER</strong> badges along with your verified vehicle plate. Profile fields are locked to prevent tampering.
          </p>
        </div>
      )}

      {isRejected && (
        <div className="p-4 bg-red-950/60 border-2 border-red-500 rounded-2xl text-white text-xs space-y-1 shadow-lg">
          <div className="flex items-center gap-2 font-bold text-red-400">
            <AlertTriangle className="w-5 h-5" />
            <span className="text-sm">Verification Application Rejected</span>
          </div>
          <p className="text-red-200 text-xs font-medium">
            <strong>Admin Reason:</strong> {profile?.rejectionReason || 'Please review your uploaded photos and ensure car plate is clear.'}
          </p>
          <p className="text-gray-400 text-[11px]">
            Please update the required fields below and tap "Submit For Verification" to re-apply.
          </p>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 bg-emerald-500/20 border border-emerald-500/50 rounded-2xl text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 bg-red-500/20 border border-red-500/50 rounded-2xl text-red-300 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Verification Form */}
      <form onSubmit={handleSubmit} className="bg-[#111328] border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-7">
        
        {/* SECTION 1: Personal & Vehicle Text Inputs */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-800">
            <User className="w-4 h-4 text-[#EEC367]" />
            <h3 className="font-bold text-sm text-white uppercase tracking-wider">
              1. Driver & Vehicle Information
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                disabled={isLocked}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full px-3.5 py-2.5 bg-[#1A1D48] border border-gray-700 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#EEC367] disabled:opacity-60"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">
                Phone Number *
              </label>
              <input
                type="text"
                required
                disabled={isLocked}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +233 24 123 4567"
                className="w-full px-3.5 py-2.5 bg-[#1A1D48] border border-gray-700 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#EEC367] disabled:opacity-60"
              />
            </div>

            {/* Car Model */}
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">
                Car Model *
              </label>
              <input
                type="text"
                required
                disabled={isLocked}
                value={carModel}
                onChange={(e) => setCarModel(e.target.value)}
                placeholder="e.g. Toyota Corolla"
                className="w-full px-3.5 py-2.5 bg-[#1A1D48] border border-gray-700 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#EEC367] disabled:opacity-60"
              />
            </div>

            {/* Car Color */}
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">
                Car Color *
              </label>
              <input
                type="text"
                required
                disabled={isLocked}
                value={carColor}
                onChange={(e) => setCarColor(e.target.value)}
                placeholder="e.g. Red, Black, Silver"
                className="w-full px-3.5 py-2.5 bg-[#1A1D48] border border-gray-700 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#EEC367] disabled:opacity-60"
              />
            </div>

            {/* License Plate (Enforced Uppercase) */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-300 mb-1">
                Ghana License Plate (Uppercase) *
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  required
                  disabled={isLocked}
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                  placeholder="e.g. WR 526-22"
                  className="flex-1 px-3.5 py-2.5 bg-[#1A1D48] border border-gray-700 rounded-xl font-mono text-sm uppercase font-bold text-white placeholder-gray-500 focus:outline-none focus:border-[#EEC367] disabled:opacity-60"
                />
                {/* Ghana Plate Style Badge Preview */}
                <div className="bg-[#111] border-2 border-gray-600 px-4 py-2 rounded-xl text-white font-mono font-black text-sm tracking-wider shadow-inner flex items-center gap-2">
                  <span className="text-[10px] bg-yellow-500 text-black px-1 rounded font-sans font-bold">GH</span>
                  <span>{licensePlate || 'WR 526-22'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: Photo Uploads (Selfie, Front, Side) */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-800">
            <Camera className="w-4 h-4 text-[#EEC367]" />
            <h3 className="font-bold text-sm text-white uppercase tracking-wider">
              2. Verification Photos (Face Selfie, Car Front, Car Side)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* 1. Face Selfie (Live Camera or Upload) */}
            <div className="bg-[#1A1D48] border border-gray-800 rounded-2xl p-4 space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-white block">Face Selfie *</span>
                <span className="text-[10px] text-gray-400 block mt-0.5">
                  Clear facial photo for passenger safety check
                </span>
              </div>

              {/* Photo Preview / Live Camera Area */}
              <div className="w-full aspect-square bg-[#0b0d1e] rounded-xl border border-gray-700 overflow-hidden relative flex items-center justify-center">
                {isCameraActive ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : facePhoto ? (
                  <img
                    src={facePhoto}
                    alt="Driver Face Selfie"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-3 text-gray-500">
                    <User className="w-10 h-10 mx-auto text-gray-600 mb-1" />
                    <span className="text-[10px]">No photo yet</span>
                  </div>
                )}
              </div>

              {/* Controls */}
              {!isLocked && (
                <div className="space-y-2">
                  {isCameraActive ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={captureCameraPhoto}
                        className="flex-1 py-2 bg-[#00C853] hover:bg-[#00b046] text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Snap</span>
                      </button>
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="p-2 bg-red-600 hover:bg-red-500 text-white rounded-xl transition cursor-pointer"
                        title="Cancel camera"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={startCamera}
                        className="py-2 px-2 bg-[#EEC367] hover:bg-[#ffe199] text-[#1A1D48] text-[11px] font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1 shadow"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Live Cam</span>
                      </button>
                      <label className="py-2 px-2 bg-[#14163b] hover:bg-[#1a1d48] text-gray-300 border border-gray-700 text-[11px] font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, setFacePhoto)}
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 2. Car Front (Plate Visible) */}
            <div className="bg-[#1A1D48] border border-gray-800 rounded-2xl p-4 space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-white block">Car Front Photo *</span>
                <span className="text-[10px] text-gray-400 block mt-0.5">
                  Plate number must be fully readable
                </span>
              </div>

              <div className="w-full aspect-square bg-[#0b0d1e] rounded-xl border border-gray-700 overflow-hidden relative flex items-center justify-center">
                {carFrontPhoto ? (
                  <img
                    src={carFrontPhoto}
                    alt="Car Front"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-3 text-gray-500">
                    <Car className="w-10 h-10 mx-auto text-gray-600 mb-1" />
                    <span className="text-[10px]">Upload front view</span>
                  </div>
                )}
              </div>

              {!isLocked && (
                <label className="w-full py-2 bg-[#14163b] hover:bg-[#1a1d48] text-gray-200 border border-gray-700 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow">
                  <Upload className="w-3.5 h-3.5 text-[#EEC367]" />
                  <span>{carFrontPhoto ? 'Change Front' : 'Upload Front'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, setCarFrontPhoto)}
                  />
                </label>
              )}
            </div>

            {/* 3. Car Side (Color Visible) */}
            <div className="bg-[#1A1D48] border border-gray-800 rounded-2xl p-4 space-y-3 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-white block">Car Side Photo *</span>
                <span className="text-[10px] text-gray-400 block mt-0.5">
                  Vehicle body color must be clearly visible
                </span>
              </div>

              <div className="w-full aspect-square bg-[#0b0d1e] rounded-xl border border-gray-700 overflow-hidden relative flex items-center justify-center">
                {carSidePhoto ? (
                  <img
                    src={carSidePhoto}
                    alt="Car Side"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-3 text-gray-500">
                    <Car className="w-10 h-10 mx-auto text-gray-600 mb-1" />
                    <span className="text-[10px]">Upload side view</span>
                  </div>
                )}
              </div>

              {!isLocked && (
                <label className="w-full py-2 bg-[#14163b] hover:bg-[#1a1d48] text-gray-200 border border-gray-700 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow">
                  <Upload className="w-3.5 h-3.5 text-[#EEC367]" />
                  <span>{carSidePhoto ? 'Change Side' : 'Upload Side'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, setCarSidePhoto)}
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Submit Button */}
        {!isLocked ? (
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-[#EEC367] hover:bg-[#ffe199] text-[#1A1D48] font-black rounded-2xl text-sm transition shadow-2xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 uppercase tracking-wider"
            >
              <ShieldCheck className="w-5 h-5" />
              <span>{isSubmitting ? 'Submitting to Admin...' : 'Submit For Verification'}</span>
            </button>
            <p className="text-[10px] text-gray-400 text-center mt-2">
              Submitting updates status to <strong>PENDING</strong> for Admin review in Sekondi-Takoradi.
            </p>
          </div>
        ) : (
          <div className="pt-2 border-t border-gray-800 flex items-center justify-between">
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
              <Lock className="w-4 h-4" />
              <span>Verified & Locked by Prah Ride Operations</span>
            </span>
            <button
              type="button"
              onClick={() => setRequestUpdateMode(true)}
              className="px-4 py-2 bg-[#1A1D48] hover:bg-[#232763] text-gray-200 border border-gray-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Unlock Profile to Edit
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
