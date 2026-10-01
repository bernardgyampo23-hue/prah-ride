// Sekondi-Takoradi Operating Hours & Landmark definitions
// Strictly Monday-Saturday 7:00 AM - 10:00 PM (Africa/Accra GMT)
// Closed Sundays

export interface OperatingHoursStatus {
  isOpen: boolean;
  message: string;
  currentDayName: string;
  currentTimeString: string;
}

export function checkOperatingHours(): OperatingHoursStatus {
  // Use Africa/Accra timezone
  const now = new Date();
  
  // Format to Africa/Accra time
  const accraFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Accra',
    weekday: 'long',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });

  const parts = accraFormatter.formatToParts(now);
  const weekday = parts.find(p => p.type === 'weekday')?.value || 'Sunday';
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);

  const currentTimeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} GMT`;

  // Closed all day Sunday
  if (weekday.toLowerCase() === 'sunday') {
    return {
      isOpen: false,
      message: 'We are currently closed — open Monday–Saturday, 7:00 AM – 10:00 PM GMT. Closed Sundays.',
      currentDayName: weekday,
      currentTimeString,
    };
  }

  // Monday to Saturday: 7:00 AM (07:00) to 10:00 PM (22:00)
  if (hour < 7 || hour >= 22) {
    return {
      isOpen: false,
      message: 'We are currently closed for the night — open Monday–Saturday, 7:00 AM – 10:00 PM GMT.',
      currentDayName: weekday,
      currentTimeString,
    };
  }

  return {
    isOpen: true,
    message: 'We are currently open. Mon–Sat 7:00 AM – 10:00 PM.',
    currentDayName: weekday,
    currentTimeString,
  };
}

// Popular and verified landmarks across the whole towns of Sekondi-Takoradi
export const SEKONDI_TAKORADI_LANDMARKS = [
  { name: 'St. Benedict Hospital (Inchaban / Sekondi-Takoradi)', lat: 4.9420, lng: -1.7350, type: 'Everyday' },
  { name: 'Takoradi Market Circle (Central)', lat: 4.8967, lng: -1.7554, type: 'Everyday' },
  { name: 'Takoradi Airport (Airforce Base)', lat: 4.8961, lng: -1.7745, type: 'Airport' },
  { name: 'Sekondi European Town & Fort Orange', lat: 4.9351, lng: -1.7104, type: 'Everyday' },
  { name: 'Effiakuma (Number 9 / Post Office)', lat: 4.9212, lng: -1.7580, type: 'Everyday' },
  { name: 'Anaji Choice Mart / SSNIT Flats', lat: 4.9324, lng: -1.7765, type: 'Everyday' },
  { name: 'Kwesimintsim Hospital / Lorry Station', lat: 4.8978, lng: -1.7915, type: 'Everyday' },
  { name: 'Airport Ridge Residential Area', lat: 4.9082, lng: -1.7720, type: 'Everyday' },
  { name: 'Beach Road & Vienna Beach Resort', lat: 4.8821, lng: -1.7456, type: 'Everyday' },
  { name: 'Essikado Palace & Township', lat: 4.9520, lng: -1.7010, type: 'Everyday' },
  { name: 'Kojokrom Railway Station & Market', lat: 4.9542, lng: -1.7143, type: 'Everyday' },
  { name: 'Inchaban Junction / Township', lat: 4.9680, lng: -1.6850, type: 'Everyday' },
  { name: 'Fijai Secondary School & Environs', lat: 4.9290, lng: -1.7410, type: 'Everyday' },
  { name: 'Kansaworado Residential Area', lat: 4.9480, lng: -1.7580, type: 'Everyday' },
  { name: 'Takoradi Harbour (Main Gate)', lat: 4.8845, lng: -1.7392, type: 'Everyday' },
  { name: 'Sekondi High Court & Regional Coordinating Council', lat: 4.9402, lng: -1.7058, type: 'Everyday' },
  { name: 'Tanokrom / West Hills Mall Area', lat: 4.9142, lng: -1.7698, type: 'Everyday' },
  { name: 'New Takoradi Fishing & Harbour Community', lat: 4.8890, lng: -1.7415, type: 'Everyday' },
  { name: 'Assakae & Whindo Hub', lat: 4.9160, lng: -1.8020, type: 'Everyday' },
];

export const SEKONDI_TAKORADI_CENTER = {
  lat: 4.9340,
  lng: -1.7137,
  zoom: 13,
};

// Haversine distance in km
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate bearing / compass heading (0-360 deg) between two coordinates
export function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

