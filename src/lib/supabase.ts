import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { db } from './firebase';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  getDoc 
} from 'firebase/firestore';
import { TripCodeRecord } from '../types';

// Supabase credentials (from environment or defaults)
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!supabaseInstance && SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (e) {
      console.warn('Supabase initialization warning:', e);
    }
  }
  return supabaseInstance;
}

/**
 * Generate a unique 4-digit code (1000-9999) that has NEVER been used in the last 50 rides.
 */
export async function generateUniqueTripCode(): Promise<string> {
  const recentCodes = new Set<string>();

  // 1. Try querying Supabase trip_codes table for the last 50 codes
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('trip_codes')
        .select('code')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && Array.isArray(data)) {
        data.forEach((row: { code: string }) => {
          if (row.code) recentCodes.add(String(row.code).trim());
        });
      }
    } catch (err) {
      console.warn('Supabase trip_codes query notice:', err);
    }
  }

  // 2. Query Firestore trip_codes collection / rides as well to ensure total deduplication
  try {
    const qCodes = query(
      collection(db, 'trip_codes'),
      orderBy('created_at', 'desc'),
      limit(50)
    );
    const snapCodes = await getDocs(qCodes);
    snapCodes.forEach((d) => {
      const c = d.data().code;
      if (c) recentCodes.add(String(c).trim());
    });

    // Also check last 50 rides directly
    const qRides = query(
      collection(db, 'rides'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const snapRides = await getDocs(qRides);
    snapRides.forEach((d) => {
      const c = d.data().tripCode;
      if (c) recentCodes.add(String(c).trim());
    });
  } catch (err) {
    console.warn('Firestore trip_codes query notice:', err);
  }

  // 3. Generate random 4-digit code (1000-9999) not present in last 50 rides
  let code = '';
  let attempts = 0;
  do {
    const randomNum = Math.floor(1000 + Math.random() * 9000); // 1000 to 9999
    code = String(randomNum);
    attempts++;
  } while (recentCodes.has(code) && attempts < 100);

  return code;
}

/**
 * Save newly generated trip code into Supabase trip_codes table and sync to Firestore.
 */
export async function saveTripCode(rideId: string, code: string): Promise<TripCodeRecord> {
  const now = Date.now();
  const expiresAt = now + 15 * 60 * 1000; // 15 minutes lifetime

  const tripRecord: TripCodeRecord = {
    code,
    ride_id: rideId,
    used: false,
    created_at: now,
    expires_at: expiresAt,
  };

  // 1. Supabase write
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('trip_codes').insert({
        code,
        ride_id: rideId,
        used: false,
        created_at: new Date(now).toISOString(),
        expires_at: new Date(expiresAt).toISOString(),
      });
    } catch (e) {
      console.warn('Supabase trip_codes insert notice:', e);
    }
  }

  // 2. Firestore write to collection 'trip_codes'
  try {
    await setDoc(doc(db, 'trip_codes', `${rideId}_${code}`), tripRecord);
  } catch (e) {
    console.warn('Firestore trip_codes save notice:', e);
  }

  // 3. Update ride record directly
  try {
    await updateDoc(doc(db, 'rides', rideId), {
      tripCode: code,
      tripCodeExpiresAt: expiresAt,
      tripCodeUsed: false,
    });
  } catch (e) {
    console.warn('Firestore ride tripCode update notice:', e);
  }

  return tripRecord;
}

/**
 * Validate and consume Trip Verification Code entered by driver to start the trip.
 */
export async function verifyAndConsumeTripCode(
  rideId: string, 
  enteredCode: string
): Promise<{ success: boolean; error?: string }> {
  const cleanCode = enteredCode.trim();

  // 1. Fetch live ride details
  const rideRef = doc(db, 'rides', rideId);
  const rideSnap = await getDoc(rideRef);
  if (!rideSnap.exists()) {
    return { success: false, error: 'Ride record not found.' };
  }

  const ride = rideSnap.data();
  const expectedCode = String(ride.tripCode || '').trim();
  const expiresAt = Number(ride.tripCodeExpiresAt || 0);

  // Check expiration (15 minutes)
  if (expiresAt > 0 && Date.now() > expiresAt) {
    return { success: false, error: 'Trip code has expired (15-min limit reached). Please request a renewed code.' };
  }

  // Check if already used
  if (ride.tripCodeUsed) {
    return { success: false, error: 'This trip code has already been used.' };
  }

  // Check match
  if (cleanCode !== expectedCode) {
    return { success: false, error: 'Incorrect code. Please verify with passenger.' };
  }

  // Code is verified! Mark used and update ride status to in_progress
  const now = Date.now();

  // 1. Update Supabase
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase
        .from('trip_codes')
        .update({ used: true })
        .eq('ride_id', rideId)
        .eq('code', cleanCode);
    } catch (e) {
      console.warn('Supabase mark trip code used notice:', e);
    }
  }

  // 2. Update Firestore trip_codes
  try {
    await updateDoc(doc(db, 'trip_codes', `${rideId}_${cleanCode}`), {
      used: true,
      usedAt: now,
    });
  } catch (e) {
    // Non-blocking
  }

  // 3. Update ride record: start trip!
  try {
    await updateDoc(rideRef, {
      status: 'in_progress',
      startedAt: now,
      tripCodeUsed: true,
    });
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to update ride status.' };
  }

  return { success: true };
}

/**
 * Image compressor utility: takes an image File, shrinks to max 1024px, quality 0.75 JPEG, returns Base64 data URL.
 */
export async function compressImageToDataUrl(file: File, maxDimension = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height && width > maxDimension) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else if (height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);
        resolve(compressedBase64);
      };
      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}
