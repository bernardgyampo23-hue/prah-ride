import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as fbSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, sanitizeForFirestore } from './firebase';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<UserProfile>;
  loginWithGoogle: (targetRole?: UserRole) => Promise<UserProfile>;
  registerPassenger: (data: { email: string; pass: string; fullName: string; phone: string }) => Promise<void>;
  registerDriver: (data: {
    email: string;
    pass: string;
    fullName: string;
    phone: string;
    vehicleMakeModel: string;
    licensePlate: string;
    licenseNumber: string;
    momoNumber: string;
    vehiclePhotoUrl: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('prahride_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.email?.includes('kofi.mensah') || parsed?.email?.includes('sampson')) {
          localStorage.removeItem('prahride_profile');
          return null;
        }
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Sync profile to localStorage for resilience
  const saveProfileState = (prof: UserProfile | null) => {
    setProfile(prof);
    try {
      if (prof) {
        localStorage.setItem('prahride_profile', JSON.stringify(prof));
      } else {
        localStorage.removeItem('prahride_profile');
      }
    } catch {}
  };

  // Listen to active user authentication state and live profile in Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Listen to profile updates live
        const docRef = doc(db, 'users', user.uid);
        const unsubDoc = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            saveProfileState(data);
          }
          setLoading(false);
        }, (error) => {
          console.warn("Auth profile sync notice:", error);
          setLoading(false);
        });
        return () => unsubDoc();
      } else {
        const saved = localStorage.getItem('prahride_profile');
        if (!saved) {
          setProfile(null);
        }
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async (targetRole: UserRole = 'passenger'): Promise<UserProfile> => {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    const docRef = doc(db, 'users', cred.user.uid);
    let docSnap = await getDoc(docRef);

    const isMasterAdmin = 
      cred.user.email?.toLowerCase() === 'bernardgyampo23@gmail.com' || 
      cred.user.email?.toLowerCase().startsWith('admin@');

    const isDriver = targetRole === 'driver' || cred.user.email?.toLowerCase().includes('driver');

    if (!docSnap.exists()) {
      const newProf: UserProfile = {
        uid: cred.user.uid,
        email: cred.user.email || 'user@example.com',
        fullName: cred.user.displayName || (isMasterAdmin ? 'Prah Ride Admin' : isDriver ? 'Driver Partner' : 'Prah Rider'),
        phone: cred.user.phoneNumber || '',
        role: isMasterAdmin ? 'admin' : (isDriver ? 'driver' : 'passenger'),
        driverStatus: isDriver ? 'pending' : null,
        vehicleMakeModel: null,
        licensePlate: null,
        licenseNumber: null,
        momoNumber: null,
        vehiclePhotoUrl: null,
        currentLat: isDriver ? 4.9420 : 4.8967,
        currentLng: isDriver ? -1.7350 : -1.7554,
        isOnline: false,
        lastLocationUpdate: isDriver ? Date.now() : null,
        rating: 5.0,
        createdAt: Date.now(),
        totalTrips: 0,
        avatarUrl: cred.user.photoURL || null,
      };
      await setDoc(docRef, sanitizeForFirestore(newProf));
      docSnap = await getDoc(docRef);
    }

    const prof = docSnap.data() as UserProfile;
    saveProfileState(prof);
    return prof;
  };

  const login = async (email: string, pass: string): Promise<UserProfile> => {
    let credUid: string;
    let displayName: string | null = null;

    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      credUid = cred.user.uid;
      displayName = cred.user.displayName;
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        // Email/password is disabled in Firebase console -> fallback to anonymous auth or local session
        try {
          const anonCred = await signInAnonymously(auth);
          credUid = anonCred.user.uid;
        } catch {
          credUid = `usr_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
        }
      } else {
        throw err;
      }
    }

    const docRef = doc(db, 'users', credUid);
    let docSnap = await getDoc(docRef);

    const isMasterAdmin = 
      email.toLowerCase() === 'bernardgyampo23@gmail.com' || 
      email.toLowerCase().startsWith('admin@');

    const isDriverAccount = email.toLowerCase().includes('driver');

    if (!docSnap.exists()) {
      const newProf: UserProfile = {
        uid: credUid,
        email: email || '',
        fullName: displayName || (isMasterAdmin ? 'Prah Ride Admin' : isDriverAccount ? 'Driver Partner' : 'Prah Rider'),
        phone: '',
        role: isMasterAdmin ? 'admin' : (isDriverAccount ? 'driver' : 'passenger'),
        driverStatus: isDriverAccount ? 'pending' : null,
        vehicleMakeModel: null,
        licensePlate: null,
        licenseNumber: null,
        momoNumber: null,
        vehiclePhotoUrl: null,
        currentLat: isDriverAccount ? 4.9420 : 4.8967,
        currentLng: isDriverAccount ? -1.7350 : -1.7554,
        isOnline: false,
        lastLocationUpdate: isDriverAccount ? Date.now() : null,
        rating: 5.0,
        createdAt: Date.now(),
        totalTrips: 0,
        avatarUrl: null,
      };
      await setDoc(docRef, sanitizeForFirestore(newProf));
      docSnap = await getDoc(docRef);
    } else if (isMasterAdmin && docSnap.data().role !== 'admin') {
      await setDoc(docRef, sanitizeForFirestore({ role: 'admin', driverStatus: null }), { merge: true });
      docSnap = await getDoc(docRef);
    }

    const prof = docSnap.data() as UserProfile;
    saveProfileState(prof);
    return prof;
  };

  const registerPassenger = async (data: { email: string; pass: string; fullName: string; phone: string }) => {
    let uid: string;
    try {
      const cred = await createUserWithEmailAndPassword(auth, data.email, data.pass);
      uid = cred.user.uid;
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        try {
          const anonCred = await signInAnonymously(auth);
          uid = anonCred.user.uid;
        } catch {
          uid = `usr_${data.email.replace(/[^a-zA-Z0-9]/g, '_')}`;
        }
      } else {
        throw err;
      }
    }

    const isMasterAdmin = 
      data.email.toLowerCase() === 'bernardgyampo23@gmail.com' || 
      data.email.toLowerCase().startsWith('admin@');

    const newProfile: UserProfile = {
      uid: uid || '',
      email: data.email || '',
      fullName: data.fullName || 'Passenger',
      phone: data.phone || '',
      role: isMasterAdmin ? 'admin' : 'passenger',
      driverStatus: null,
      vehicleMakeModel: null,
      licensePlate: null,
      licenseNumber: null,
      momoNumber: null,
      vehiclePhotoUrl: null,
      isOnline: null,
      currentLat: null,
      currentLng: null,
      lastLocationUpdate: null,
      rating: 5.0,
      createdAt: Date.now(),
      totalTrips: 0,
      avatarUrl: null,
    };
    await setDoc(doc(db, 'users', uid), sanitizeForFirestore(newProfile));
    saveProfileState(newProfile);
  };

  const registerDriver = async (data: {
    email: string;
    pass: string;
    fullName: string;
    phone: string;
    vehicleMakeModel: string;
    licensePlate: string;
    licenseNumber: string;
    momoNumber: string;
    vehiclePhotoUrl: string;
  }) => {
    let uid: string;
    try {
      const cred = await createUserWithEmailAndPassword(auth, data.email, data.pass);
      uid = cred.user.uid;
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        try {
          const anonCred = await signInAnonymously(auth);
          uid = anonCred.user.uid;
        } catch {
          uid = `drv_${data.email.replace(/[^a-zA-Z0-9]/g, '_')}`;
        }
      } else {
        throw err;
      }
    }

    const newProfile: UserProfile = {
      uid: uid || '',
      email: data.email || '',
      fullName: data.fullName || 'Driver',
      phone: data.phone || '',
      role: 'driver',
      driverStatus: 'pending',
      vehicleMakeModel: data.vehicleMakeModel || null,
      licensePlate: data.licensePlate || null,
      licenseNumber: data.licenseNumber || null,
      momoNumber: data.momoNumber || null,
      vehiclePhotoUrl: data.vehiclePhotoUrl || null,
      isOnline: false,
      currentLat: 4.9420, // St. Benedict Hospital
      currentLng: -1.7350,
      lastLocationUpdate: Date.now(),
      totalTrips: 0,
      rating: 5.0,
      createdAt: Date.now(),
      avatarUrl: null,
    };
    await setDoc(doc(db, 'users', uid), sanitizeForFirestore(newProfile));
    saveProfileState(newProfile);
  };

  const logout = async () => {
    try {
      await fbSignOut(auth);
    } catch {}
    saveProfileState(null);
    setCurrentUser(null);
  };

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    const targetUid = currentUser?.uid || profile?.uid;
    if (!targetUid) return;
    try {
      const docRef = doc(db, 'users', targetUid);
      const cleaned = sanitizeForFirestore(data as any);
      await setDoc(docRef, cleaned, { merge: true });
    } catch (err) {
      console.warn("Profile update notice:", err);
    }
    const updated = profile ? { ...profile, ...data } : null;
    saveProfileState(updated);
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      profile,
      loading,
      login,
      loginWithGoogle,
      registerPassenger,
      registerDriver,
      logout,
      updateUserProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

