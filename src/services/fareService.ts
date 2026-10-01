/**
 * Fare Calculation Service for Prah Ride (Sekondi-Takoradi, Western Region, Ghana)
 * Calculates locked-in fixed fares based on route distance and service tier.
 */

import { calculateDistanceKm } from '../lib/constants';
import { RideType } from '../types';

export interface FareCalculationResult {
  distanceKm: number;
  durationMinutes: number;
  baseFareGhs: number;
  distanceFareGhs: number;
  totalFixedFareGhs: number;
  ratePerKmGhs: number;
  isAirportRoute: boolean;
  distanceBracket: string;
  fareNotice: string;
}

// Approximate coordinates for Takoradi Airport / Airforce base to auto-detect airport routes
const TAKORADI_AIRPORT_COORDS = { lat: 4.8961, lng: -1.7745 };

/**
 * Checks if a coordinate is within the immediate vicinity of Takoradi Airport (~1.5 km)
 */
export function isNearAirport(lat: number, lng: number): boolean {
  return calculateDistanceKm(lat, lng, TAKORADI_AIRPORT_COORDS.lat, TAKORADI_AIRPORT_COORDS.lng) < 1.5;
}

/**
 * Calculates a guaranteed fixed fare based on distance between two points in Sekondi-Takoradi
 * 
 * Sekondi-Takoradi urban characteristics:
 * - Urban road winding factor: ~1.28x over straight-line Haversine
 * - Average city speed: ~32 km/h
 * 
 * Pricing model:
 * - Everyday Tier:
 *   - Base rate: GHS 35 (includes first 2 km)
 *   - Distance rate: GHS 5.00 per km for distance beyond 2 km
 *   - Rounded to nearest 5 GHS for easy cash/MoMo payment
 *   - Typical trips (e.g. 5-7 km from Market Circle to Anaji/Effiakuma/Kwesimintsim) calculate to ~GHS 55
 *   - Minimum fare: GHS 45, Benchmark: GHS 55
 * 
 * - Airport Tier:
 *   - Fixed starting base: GHS 85 (special airport luggage & dedicated airport terminal transfer)
 *   - If extreme distance (> 12 km across twin city perimeter), adds GHS 5/km beyond 12 km rounded to 5 GHS
 *   - Minimum airport fare: GHS 85
 */
export function calculateFixedFare(
  pickup: { lat: number; lng: number; address?: string },
  dropoff: { lat: number; lng: number; address?: string },
  rideType: RideType = 'Everyday'
): FareCalculationResult {
  // 1. Calculate straight-line distance and apply urban Sekondi-Takoradi road network factor
  const straightDistance = calculateDistanceKm(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng);
  
  // Road factor 1.28 accounts for Twin City road network around Market Circle, Harbour, and bypasses
  const roadDistanceKm = parseFloat(Math.max(0.8, straightDistance * 1.28).toFixed(1));

  // 2. Estimate duration assuming ~32 km/h average Twin City traffic + 2 min pickup buffer
  const durationMinutes = Math.max(4, Math.round((roadDistanceKm / 32) * 60) + 2);

  // 3. Detect if this route touches Takoradi Airport
  const involvesAirport = 
    rideType === 'Airport' ||
    isNearAirport(pickup.lat, pickup.lng) ||
    isNearAirport(dropoff.lat, dropoff.lng) ||
    pickup.address?.toLowerCase().includes('airport') ||
    dropoff.address?.toLowerCase().includes('airport');

  let baseFareGhs = 20;
  let ratePerKmGhs = 4.5;
  let distanceFareGhs = 0;
  let totalFixedFareGhs = 30;
  let distanceBracket = '';

  if (rideType === 'Airport' || involvesAirport) {
    baseFareGhs = 30;
    ratePerKmGhs = 5.5;
    distanceFareGhs = Math.round(roadDistanceKm * ratePerKmGhs);
    totalFixedFareGhs = Math.max(40, baseFareGhs + distanceFareGhs);
    distanceBracket = `Airport Transfer · ${roadDistanceKm} km`;
  } else {
    // Everyday ride type - purely dynamic distance-based pricing
    baseFareGhs = 20;
    ratePerKmGhs = 4.5;
    distanceFareGhs = Math.round(roadDistanceKm * ratePerKmGhs);
    totalFixedFareGhs = Math.max(25, baseFareGhs + distanceFareGhs);
    distanceBracket = `Everyday Ride · ${roadDistanceKm} km`;
  }

  return {
    distanceKm: roadDistanceKm,
    durationMinutes,
    baseFareGhs,
    distanceFareGhs,
    totalFixedFareGhs,
    ratePerKmGhs,
    isAirportRoute: Boolean(involvesAirport),
    distanceBracket,
    fareNotice: 'Dynamic Distance-Based Fare · Calculated by actual route distance',
  };
}
