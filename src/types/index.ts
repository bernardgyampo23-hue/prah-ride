export type UserRole = 'passenger' | 'driver' | 'admin';
export type DriverStatus = 'pending' | 'approved' | 'suspended' | 'rejected' | 'VERIFIED' | 'REJECTED' | 'PENDING';
export type RideType = 'Everyday' | 'Airport';
export type RideStatus = 'requested' | 'accepted' | 'arriving' | 'in_progress' | 'completed' | 'cancelled';
export type PaymentMethod = 'Cash' | 'MoMo';
export type PaymentStatus = 'Awaiting payment' | 'Passenger marked as paid' | 'Payment confirmed';

export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  phone: string;
  role: UserRole;
  createdAt: number;
  avatarUrl?: string | null;
  // Driver specific fields & Bolt-level verification
  driverStatus?: DriverStatus | null;
  vehicleMakeModel?: string | null;
  carModel?: string | null;
  carColor?: string | null;
  licensePlate?: string | null;
  licenseNumber?: string | null;
  momoNumber?: string | null; // Driver's personal MoMo number displayed to passenger
  vehiclePhotoUrl?: string | null;
  facePhotoUrl?: string | null;
  carFrontPhotoUrl?: string | null;
  carSidePhotoUrl?: string | null;
  verificationSubmittedAt?: number | null;
  verifiedAt?: number | null;
  rejectionReason?: string | null;
  isOwnerDriver?: boolean | null;
  isLocked?: boolean | null;
  isOnline?: boolean | null;
  currentLat?: number | null;
  currentLng?: number | null;
  lastLocationUpdate?: number | null;
  totalTrips?: number;
  rating?: number | null;
}

export interface RideRecord {
  id: string;
  passengerId: string;
  passengerName: string;
  passengerPhone: string;
  driverId?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  driverPhotoUrl?: string | null;
  driverVehicle?: string | null;
  driverPlate?: string | null;
  driverCarColor?: string | null;
  driverCarModel?: string | null;
  isDriverVerified?: boolean | null;
  isDriverOwner?: boolean | null;
  driverMomoNumber?: string | null;
  driverLat?: number | null;
  driverLng?: number | null;
  driverHeading?: number | null;
  driverSpeedKmh?: number | null;

  // Unique 4-Digit Trip Verification Code
  tripCode?: string | null;
  tripCodeExpiresAt?: number | null;
  tripCodeUsed?: boolean | null;

  rideType: RideType;
  fareGhs: number; // calculated dynamically by route distance
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paidAt?: number | null;
  paymentConfirmedBy?: 'passenger' | 'driver' | 'admin' | null;
  momoTransactionId?: string | null;
  momoNetwork?: string | null;

  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  
  dropoffAddress: string;
  dropoffLat: number;
  dropoffLng: number;

  status: RideStatus;
  createdAt: number;
  acceptedAt?: number | null;
  arrivedAt?: number | null;
  startedAt?: number | null;
  completedAt?: number | null;
  cancelledAt?: number | null;
  cancellationReason?: string | null;

  driverRating?: number | null;
  driverRatingFeedback?: string | null;
  driverRatingTags?: string[] | null;
  ratedAt?: number | null;
}

export interface TripCodeRecord {
  id?: string;
  code: string;
  ride_id: string;
  used: boolean;
  created_at: number;
  expires_at: number;
}

export interface ComplaintTicket {
  id: string;
  userId: string;
  userRole: UserRole;
  userName: string;
  userEmail: string;
  userPhone: string;
  rideId?: string | null;
  subject: string;
  description: string;
  category: 'payment_dispute' | 'driver_behavior' | 'passenger_issue' | 'delay' | 'other';
  status: 'open' | 'investigating' | 'resolved';
  adminNotes?: string;
  createdAt: number;
  resolvedAt?: number | null;
}

export interface LocationCoords {
  lat: number;
  lng: number;
  address?: string;
}
