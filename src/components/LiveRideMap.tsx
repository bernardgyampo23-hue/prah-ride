import React, { useEffect, useRef, useState, useCallback } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { 
  Phone, 
  ShieldAlert, 
  Share2, 
  Crosshair, 
  Maximize2, 
  Minimize2,
  Zap, 
  Star, 
  ChevronUp, 
  ChevronDown, 
  CheckCircle2, 
  XCircle, 
  Coins, 
  MapPin, 
  Navigation2, 
  AlertTriangle,
  Copy,
  Check,
  Clock
} from 'lucide-react';
import { RideRecord } from '../types';
import { calculateDistanceKm, calculateBearing, SEKONDI_TAKORADI_CENTER } from '../lib/constants';
import { MomoPaymentPanel } from './MomoPaymentPanel';

// Fix Leaflet default marker icon resolution for bundler
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Center coordinates for Sekondi-Takoradi
const SEKONDI_TAKORADI_COORDS: [number, number] = [4.9340, -1.7137];

export interface LiveRideMapProps {
  ride: RideRecord;
  onCancelRide?: () => void;
  onPassengerMarkedPaid?: () => void;
  onBack?: () => void;
  fullScreen?: boolean;
}

export const LiveRideMap: React.FC<LiveRideMapProps> = ({
  ride,
  onCancelRide,
  onPassengerMarkedPaid,
  onBack,
  fullScreen = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Markers and Polylines
  const pickupMarkerRef = useRef<L.Marker | null>(null);
  const dropoffMarkerRef = useRef<L.Marker | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const glowPolylineRef = useRef<L.Polyline | null>(null);
  const dashedPolylineRef = useRef<L.Polyline | null>(null);
  const tripRouteRef = useRef<L.Polyline | null>(null);

  // Animation and Smooth Movement State
  const animatedDriverPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const animationStartTimeRef = useRef<number | null>(null);
  const animationStartPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const currentHeadingRef = useRef<number>(ride.driverHeading || 0);

  // UI HUD Controls
  const [followDriver, setFollowDriver] = useState<boolean>(true);
  const [liveDistanceKm, setLiveDistanceKm] = useState<number | null>(null);
  const [liveEtaMinutes, setLiveEtaMinutes] = useState<number | null>(null);
  const [displayedSpeed, setDisplayedSpeed] = useState<number>(ride.driverSpeedKmh || 38);
  const [sheetExpanded, setSheetExpanded] = useState<boolean>(true);
  const [isFullScreenMode, setIsFullScreenMode] = useState<boolean>(fullScreen);

  const toggleFullscreen = () => {
    const next = !isFullScreenMode;
    setIsFullScreenMode(next);
    setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 250);
  };

  // Modals & Feedback
  const [showSosModal, setShowSosModal] = useState<boolean>(false);
  const [showMomoModal, setShowMomoModal] = useState<boolean>(false);
  const [copiedShareLink, setCopiedShareLink] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Driver details fallback (Real-time assigned driver)
  const driverName = ride.driverName || 'Assigned Driver';
  const driverPhone = ride.driverPhone || '';
  const driverCarModel = ride.driverCarModel || ride.driverVehicle || 'Vehicle';
  const driverCarColor = ride.driverCarColor || 'Verified';
  const driverPlate = ride.driverPlate || 'GH Plate';
  const driverPhoto = ride.driverPhotoUrl || null;
  const driverMomo = ride.driverMomoNumber || '';

  // Safety PIN / 4-Digit Trip Code
  const tripCode = ride.tripCode || (Math.abs(ride.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 1000)) % 9000 + 1000).toString();

  // 15-Minute Expiry Countdown Timer
  const [codeCountdown, setCodeCountdown] = useState<number>(() => {
    const expiresAt = ride.tripCodeExpiresAt || (ride.createdAt + 15 * 60 * 1000);
    return Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
  });

  useEffect(() => {
    const expiresAt = ride.tripCodeExpiresAt || (ride.createdAt + 15 * 60 * 1000);
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setCodeCountdown(remaining);
    }, 1000);
    return () => clearInterval(interval);
  }, [ride.tripCodeExpiresAt, ride.createdAt]);

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Create Glowing Yellow Car Icon with directional pointer
  const createGlowingYellowCarIconHtml = (heading: number) => {
    return `
      <div style="position: relative; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center;">
        <!-- Pulsing Yellow Halo Waves -->
        <div style="position: absolute; inset: -4px; border-radius: 50%; background: radial-gradient(circle, rgba(250, 204, 21, 0.4) 0%, rgba(238, 195, 103, 0.15) 50%, transparent 75%); animation: ping 2.2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: absolute; inset: 2px; border-radius: 50%; border: 1.5px solid rgba(250, 204, 21, 0.7); box-shadow: 0 0 16px rgba(250, 204, 21, 0.85); animation: pulse 1.8s infinite ease-in-out;"></div>
        
        <!-- Rotating Vehicle Shell -->
        <div style="transform: rotate(${heading}deg); transition: transform 0.35s ease-out; position: relative; width: 42px; height: 42px; border-radius: 50%; background: #0A0B10; border: 2.5px solid #FACC15; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 25px rgba(250, 204, 21, 0.95), 0 6px 14px rgba(0,0,0,0.9);">
          <!-- Heading direction triangular arrow -->
          <div style="position: absolute; top: -8px; width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-bottom: 9px solid #FACC15; filter: drop-shadow(0 -2px 5px rgba(250, 204, 21, 0.9));"></div>
          
          <!-- Yellow Car Silhouette -->
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#FACC15" stroke="#000" stroke-width="0.5">
            <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.22.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
          </svg>
        </div>
      </div>
    `;
  };

  // Pickup Pin Icon
  const createPickupIcon = () => {
    return L.divIcon({
      className: 'custom-pickup-pin',
      html: `
        <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
          <div style="width: 28px; height: 28px; border-radius: 50%; background: #EEC367; border: 2.5px solid #000; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(238, 195, 103, 0.6);">
            <span style="font-weight: 900; font-size: 13px; color: #000; font-family: sans-serif;">A</span>
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  };

  // Dropoff Pin Icon
  const createDropoffIcon = () => {
    return L.divIcon({
      className: 'custom-dropoff-pin',
      html: `
        <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
          <div style="width: 28px; height: 28px; border-radius: 50%; background: #3B82F6; border: 2.5px solid #000; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.7);">
            <span style="font-weight: 900; font-size: 13px; color: #fff; font-family: sans-serif;">B</span>
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  };

  // Map Initialization with Dark Carto Tiles
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const defaultCenter: [number, number] = ride.driverLat && ride.driverLng
      ? [ride.driverLat, ride.driverLng]
      : [ride.pickupLat || SEKONDI_TAKORADI_COORDS[0], ride.pickupLng || SEKONDI_TAKORADI_COORDS[1]];

    const map = L.map(container, {
      center: defaultCenter,
      zoom: 14,
      zoomControl: false,
      attributionControl: true,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // 100% Free OpenStreetMap Tiles (Needs NO key, styled dark via #prahride-map CSS)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© Prah Ride | OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;
    setMapReady(true);

    const timer1 = setTimeout(() => map.invalidateSize(), 150);
    const timer2 = setTimeout(() => map.invalidateSize(), 500);

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(container);

    const handleWindowResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleWindowResize);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleWindowResize);
      map.remove();
      mapInstanceRef.current = null;
      pickupMarkerRef.current = null;
      dropoffMarkerRef.current = null;
      driverMarkerRef.current = null;
      glowPolylineRef.current = null;
      dashedPolylineRef.current = null;
      tripRouteRef.current = null;
      setMapReady(false);
    };
  }, []);

  // Update Static Pickup and Dropoff Pins
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // Pickup Pin
    if (ride.pickupLat && ride.pickupLng) {
      if (pickupMarkerRef.current) {
        pickupMarkerRef.current.setLatLng([ride.pickupLat, ride.pickupLng]);
      } else {
        pickupMarkerRef.current = L.marker([ride.pickupLat, ride.pickupLng], {
          icon: createPickupIcon(),
        }).addTo(map).bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; color: #111;">
            <strong>Pickup Location (A)</strong><br/>
            <span>${ride.pickupAddress}</span>
          </div>
        `);
      }
    }

    // Dropoff Pin
    if (ride.dropoffLat && ride.dropoffLng) {
      if (dropoffMarkerRef.current) {
        dropoffMarkerRef.current.setLatLng([ride.dropoffLat, ride.dropoffLng]);
      } else {
        dropoffMarkerRef.current = L.marker([ride.dropoffLat, ride.dropoffLng], {
          icon: createDropoffIcon(),
        }).addTo(map).bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; color: #111;">
            <strong>Destination (B)</strong><br/>
            <span>${ride.dropoffAddress}</span>
          </div>
        `);
      }
    }

    // Full Trip Background Guide Line
    if (ride.pickupLat && ride.pickupLng && ride.dropoffLat && ride.dropoffLng) {
      const fullPoints: [number, number][] = [
        [ride.pickupLat, ride.pickupLng],
        [ride.dropoffLat, ride.dropoffLng],
      ];
      if (tripRouteRef.current) {
        tripRouteRef.current.setLatLngs(fullPoints);
      } else {
        tripRouteRef.current = L.polyline(fullPoints, {
          color: '#ffffff',
          weight: 2,
          opacity: 0.2,
          dashArray: '4, 8',
        }).addTo(map);
      }
    }
  }, [mapReady, ride.pickupLat, ride.pickupLng, ride.dropoffLat, ride.dropoffLng, ride.pickupAddress, ride.dropoffAddress]);

  // Smooth Live Driver Movement, Heading & Electric Blue Dashed Route
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // Determine driver position: use live coordinates or simulate near pickup if driver is assigned
    const liveLat = ride.driverLat ?? (ride.status === 'requested' ? null : ride.pickupLat + 0.008);
    const liveLng = ride.driverLng ?? (ride.status === 'requested' ? null : ride.pickupLng - 0.009);

    if (!liveLat || !liveLng) {
      if (driverMarkerRef.current) {
        map.removeLayer(driverMarkerRef.current);
        driverMarkerRef.current = null;
      }
      if (glowPolylineRef.current) {
        map.removeLayer(glowPolylineRef.current);
        glowPolylineRef.current = null;
      }
      if (dashedPolylineRef.current) {
        map.removeLayer(dashedPolylineRef.current);
        dashedPolylineRef.current = null;
      }
      animatedDriverPosRef.current = null;
      return;
    }

    const newTarget = { lat: liveLat, lng: liveLng };

    // Update Heading
    if (ride.driverHeading !== undefined && ride.driverHeading !== null) {
      currentHeadingRef.current = ride.driverHeading;
    } else if (animatedDriverPosRef.current) {
      const prev = animatedDriverPosRef.current;
      const dist = calculateDistanceKm(prev.lat, prev.lng, newTarget.lat, newTarget.lng);
      if (dist > 0.0001) {
        currentHeadingRef.current = calculateBearing(prev.lat, prev.lng, newTarget.lat, newTarget.lng);
      }
    } else {
      // Point towards pickup or dropoff
      const targetPoint = ride.status === 'in_progress'
        ? { lat: ride.dropoffLat, lng: ride.dropoffLng }
        : { lat: ride.pickupLat, lng: ride.pickupLng };
      currentHeadingRef.current = calculateBearing(newTarget.lat, newTarget.lng, targetPoint.lat, targetPoint.lng);
    }

    // Update Speed
    if (ride.driverSpeedKmh) {
      setDisplayedSpeed(Math.round(ride.driverSpeedKmh));
    } else {
      setDisplayedSpeed(36 + Math.floor(Math.sin(Date.now() / 2500) * 7));
    }

    // First placement of driver marker
    if (!animatedDriverPosRef.current) {
      animatedDriverPosRef.current = newTarget;
      animationStartPosRef.current = newTarget;

      const driverIcon = L.divIcon({
        className: 'custom-leaflet-driver-icon',
        html: createGlowingYellowCarIconHtml(currentHeadingRef.current),
        iconSize: [60, 60],
        iconAnchor: [30, 30],
      });

      const marker = L.marker([newTarget.lat, newTarget.lng], { icon: driverIcon }).addTo(map);
      marker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; color: #111; min-width: 150px;">
          <strong style="font-size: 13px;">${driverName}</strong><br/>
          <span>${driverCarModel}</span><br/>
          <span style="font-family: monospace; font-weight: bold; color: #D97706;">${driverPlate}</span><br/>
          <div style="margin-top: 4px; padding: 2px 6px; background: #000; color: #FACC15; border-radius: 4px; font-weight: bold; text-align: center; font-size: 10px;">
            UBER BLACK CERTIFIED
          </div>
        </div>
      `);
      driverMarkerRef.current = marker;
      return;
    }

    // Smooth movement interpolation
    const startPos = { ...animatedDriverPosRef.current };
    animationStartPosRef.current = startPos;
    animationStartTimeRef.current = performance.now();
    const duration = 1200;

    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
    }

    const stepAnimation = (currentTime: number) => {
      if (!animationStartTimeRef.current) return;
      const elapsed = currentTime - animationStartTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;

      const currentLat = startPos.lat + (newTarget.lat - startPos.lat) * eased;
      const currentLng = startPos.lng + (newTarget.lng - startPos.lng) * eased;

      animatedDriverPosRef.current = { lat: currentLat, lng: currentLng };

      // Update Yellow Glowing Car Marker position and heading rotation
      if (driverMarkerRef.current) {
        driverMarkerRef.current.setLatLng([currentLat, currentLng]);
        const updatedIcon = L.divIcon({
          className: 'custom-leaflet-driver-icon',
          html: createGlowingYellowCarIconHtml(currentHeadingRef.current),
          iconSize: [60, 60],
          iconAnchor: [30, 30],
        });
        driverMarkerRef.current.setIcon(updatedIcon);
      }

      // Draw the Electric Blue Dashed Route to the current target (pickup or dropoff)
      const targetPoint: [number, number] = ride.status === 'in_progress'
        ? [ride.dropoffLat, ride.dropoffLng]
        : [ride.pickupLat, ride.pickupLng];

      const activeRouteSegment: [number, number][] = [
        [currentLat, currentLng],
        targetPoint,
      ];

      // 1. Neon Blue Glow Underline
      if (glowPolylineRef.current) {
        glowPolylineRef.current.setLatLngs(activeRouteSegment);
      } else {
        glowPolylineRef.current = L.polyline(activeRouteSegment, {
          color: '#1D4ED8',
          weight: 9,
          opacity: 0.45,
          lineCap: 'round',
        }).addTo(map);
      }

      // 2. Electric Blue Dashed Line
      if (dashedPolylineRef.current) {
        dashedPolylineRef.current.setLatLngs(activeRouteSegment);
      } else {
        dashedPolylineRef.current = L.polyline(activeRouteSegment, {
          color: '#3B82F6',
          weight: 4.5,
          opacity: 0.95,
          dashArray: '8, 12',
          lineCap: 'round',
        }).addTo(map);
      }

      // Auto-follow driver with smooth camera pan
      if (followDriver && mapInstanceRef.current && progress >= 0.98) {
        mapInstanceRef.current.panTo([currentLat, currentLng], { animate: true, duration: 0.3 });
      }

      if (progress < 1) {
        animationFrameIdRef.current = requestAnimationFrame(stepAnimation);
      }
    };

    animationFrameIdRef.current = requestAnimationFrame(stepAnimation);

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [ride.driverLat, ride.driverLng, ride.driverHeading, ride.status, followDriver, mapReady]);

  // Dynamic ETA & Distance Calculation
  useEffect(() => {
    const driverPos = animatedDriverPosRef.current || (ride.driverLat && ride.driverLng ? { lat: ride.driverLat, lng: ride.driverLng } : null);
    const targetPoint = ride.status === 'in_progress'
      ? { lat: ride.dropoffLat, lng: ride.dropoffLng }
      : { lat: ride.pickupLat, lng: ride.pickupLng };

    if (driverPos && targetPoint.lat && targetPoint.lng) {
      const dist = calculateDistanceKm(driverPos.lat, driverPos.lng, targetPoint.lat, targetPoint.lng);
      setLiveDistanceKm(parseFloat(dist.toFixed(1)));
      const minutes = Math.max(1, Math.round((dist / (displayedSpeed || 35)) * 60));
      setLiveEtaMinutes(minutes);
    } else {
      setLiveDistanceKm(2.1);
      setLiveEtaMinutes(4);
    }
  }, [ride.driverLat, ride.driverLng, ride.status, ride.pickupLat, ride.pickupLng, ride.dropoffLat, ride.dropoffLng, displayedSpeed]);

  // Camera Recenter Bounds
  const handleRecenterAll = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const points: [number, number][] = [];
    if (ride.pickupLat && ride.pickupLng) points.push([ride.pickupLat, ride.pickupLng]);
    if (ride.dropoffLat && ride.dropoffLng) points.push([ride.dropoffLat, ride.dropoffLng]);
    if (animatedDriverPosRef.current) {
      points.push([animatedDriverPosRef.current.lat, animatedDriverPosRef.current.lng]);
    } else if (ride.driverLat && ride.driverLng) {
      points.push([ride.driverLat, ride.driverLng]);
    }

    if (points.length >= 2) {
      map.fitBounds(L.latLngBounds(points), { padding: [60, 60], maxZoom: 16 });
    } else if (points.length === 1) {
      map.setView(points[0], 15);
    } else {
      map.setView(SEKONDI_TAKORADI_COORDS, 14);
    }
  }, [ride.pickupLat, ride.pickupLng, ride.dropoffLat, ride.dropoffLng, ride.driverLat, ride.driverLng]);

  // Recenter on Driver
  const handleFocusDriver = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const pos = animatedDriverPosRef.current || (ride.driverLat && ride.driverLng ? { lat: ride.driverLat, lng: ride.driverLng } : null);
    if (pos) {
      map.flyTo([pos.lat, pos.lng], 16, { animate: true, duration: 1.0 });
    } else {
      map.flyTo([ride.pickupLat, ride.pickupLng], 15, { animate: true, duration: 1.0 });
    }
  }, [ride.driverLat, ride.driverLng, ride.pickupLat, ride.pickupLng]);

  // Share Trip Handler
  const handleShareTrip = async () => {
    const shareText = `Track my PrahRide in Sekondi-Takoradi: Driver ${driverName} (${driverPlate}). Ride #${ride.id.slice(-6).toUpperCase()}`;
    const shareUrl = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'PrahRide Live Trip',
          text: shareText,
          url: shareUrl,
        });
        showToast('Trip shared successfully!');
        return;
      } catch {
        // User cancelled or fallback
      }
    }

    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(`${shareText} - ${shareUrl}`);
      setCopiedShareLink(true);
      showToast('Live tracking link copied to clipboard!');
      setTimeout(() => setCopiedShareLink(false), 3000);
    } catch {
      showToast(`Ride #${ride.id.slice(-6).toUpperCase()} tracking active`);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Status Title & Subtitle helper
  const getStatusDisplay = () => {
    switch (ride.status) {
      case 'requested':
        return {
          title: ride.driverName ? `Connecting with ${ride.driverName}...` : 'Connecting with verified driver...',
          badge: 'DISPATCHING',
          badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
          etaText: 'Finding nearby driver',
        };
      case 'accepted':
        return {
          title: 'Ride Accepted - Driver is coming',
          badge: 'DRIVER ASSIGNED',
          badgeColor: 'bg-[#EEC367]/20 text-[#EEC367] border-[#EEC367]/40',
          etaText: `${liveEtaMinutes || 4} MINS TO PICKUP`,
        };
      case 'arriving':
        return {
          title: `${driverName} is arriving now`,
          badge: 'ARRIVING',
          badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
          etaText: 'ARRIVING NOW',
        };
      case 'in_progress':
        return {
          title: 'Heading to destination',
          badge: 'TRIP IN PROGRESS',
          badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
          etaText: `${liveEtaMinutes || 8} MINS TO DESTINATION`,
        };
      case 'completed':
        return {
          title: 'Trip Completed',
          badge: 'ARRIVED',
          badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
          etaText: 'COMPLETED',
        };
      case 'cancelled':
        return {
          title: 'Driver unavailable',
          badge: 'CANCELLED',
          badgeColor: 'bg-red-500/20 text-red-400 border-red-500/40',
          etaText: 'UNAVAILABLE',
        };
      default:
        return {
          title: 'Ride Active',
          badge: 'ACTIVE',
          badgeColor: 'bg-gray-500/20 text-gray-300 border-gray-500/40',
          etaText: 'IN PROGRESS',
        };
    }
  };

  const statusInfo = getStatusDisplay();

  return (
    <div className={`relative w-full ${isFullScreenMode ? 'fixed inset-0 z-[990] w-screen h-screen' : 'h-[640px] sm:h-[720px] rounded-3xl'} overflow-hidden bg-[#0A0B10] text-white flex flex-col font-sans select-none shadow-2xl transition-all duration-300`}>
      
      {/* 1. GHANA FLAG PRAHRIDE HEADER BAR */}
      <header className="absolute top-0 left-0 right-0 z-[500] px-4 py-3 bg-gradient-to-b from-black/90 via-black/75 to-transparent backdrop-blur-md flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          {/* Ghana Flag Badge */}
          <div className="flex items-center shadow-lg rounded-md overflow-hidden border border-white/20" title="Sekondi-Takoradi, Ghana">
            <svg width="28" height="18" viewBox="0 0 300 200" className="block">
              {/* Red stripe */}
              <rect width="300" height="66.7" y="0" fill="#CE1126" />
              {/* Yellow stripe */}
              <rect width="300" height="66.7" y="66.7" fill="#FCD116" />
              {/* Green stripe */}
              <rect width="300" height="66.7" y="133.3" fill="#006B3F" />
              {/* Central Black Star */}
              <polygon points="150,71 157,93 180,93 161,107 168,129 150,115 132,129 139,107 120,93 143,93" fill="#000000" />
            </svg>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span style={{ fontFamily: "'Cinzel', serif" }} className="text-base sm:text-lg font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-[#EEC367] via-[#FACC15] to-[#FFFFFF]">
                PRAHRIDE
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/60 text-[#FACC15] border border-[#FACC15]/40 uppercase tracking-widest">
                BLACK
              </span>
            </div>
            <div className="text-[10px] text-gray-400 font-medium tracking-wide flex items-center gap-1">
              <span>Sekondi-Takoradi</span>
              <span>•</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                Live GPS
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick SOS Siren Button */}
          <button
            type="button"
            onClick={() => setShowSosModal(true)}
            className="px-2.5 py-1.5 rounded-xl bg-red-600/90 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1 shadow-lg shadow-red-900/50 transition cursor-pointer border border-red-400/50"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span className="text-[11px] font-mono">SOS</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-gray-300 border border-white/10 transition cursor-pointer"
            title={isFullScreenMode ? 'Exit Fullscreen' : 'Fullscreen Map'}
          >
            {isFullScreenMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-gray-300 border border-white/10 transition cursor-pointer"
              title="Close Map View"
            >
              <XCircle className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      {/* 2. LEAFLET MAP CANVAS CONTAINER */}
      <div 
        id="prahride-map"
        ref={mapContainerRef} 
        className="prahride-dark-map w-full h-full flex-1 z-0 bg-[#0a0a0a]"
      />

      {/* 3. FLOATING TOP HUD CARD: DISTANCE, ETA & TRIP STATUS */}
      <div className="absolute top-16 left-3 right-3 sm:left-4 sm:right-auto sm:w-96 z-[400] pointer-events-auto">
        <div className="bg-black/85 backdrop-blur-xl border border-[#FACC15]/40 rounded-2xl p-3.5 shadow-2xl shadow-black/90 space-y-2.5">
          {/* Status Row */}
          <div className="flex items-center justify-between gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusInfo.badgeColor} flex items-center gap-1`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
              {statusInfo.badge}
            </span>

            {/* Speed Telemetry Pill */}
            <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-[#FACC15] bg-[#12131A] px-2 py-0.5 rounded-full border border-white/10">
              <Zap className="w-3 h-3 text-[#FACC15]" />
              <span>{displayedSpeed} km/h</span>
            </div>
          </div>

          {/* Main ETA & Metric Display */}
          <div className="flex items-end justify-between pt-0.5">
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                {ride.status === 'in_progress' ? 'Estimated Arrival' : 'Driver Reaching You In'}
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {liveEtaMinutes !== null ? `${liveEtaMinutes}` : '3'}
                </span>
                <span className="text-xs font-bold text-[#FACC15] uppercase tracking-widest">MINS</span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                Remaining Distance
              </span>
              <div className="flex items-baseline justify-end gap-1">
                <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {liveDistanceKm !== null ? `${liveDistanceKm}` : '1.8'}
                </span>
                <span className="text-xs font-bold text-blue-400">KM</span>
              </div>
            </div>
          </div>

          {/* Route Target Chip */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-gray-300">
            <div className="flex items-center gap-2 truncate pr-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
              <span className="truncate text-[11px]">
                {ride.status === 'in_progress' ? ride.dropoffAddress : ride.pickupAddress}
              </span>
            </div>
            <span className="text-[11px] font-bold text-[#FACC15] shrink-0 font-mono">
              GHS {ride.fareGhs}
            </span>
          </div>
        </div>
      </div>

      {/* 4. FLOATING MAP CAMERA TOOLS */}
      <div className="absolute right-3 top-56 z-[400] flex flex-col gap-2 pointer-events-auto">
        {/* Toggle Follow Driver */}
        <button
          type="button"
          onClick={() => {
            const next = !followDriver;
            setFollowDriver(next);
            if (next) handleFocusDriver();
          }}
          title={followDriver ? 'Tracking Driver' : 'Focus Driver'}
          className={`p-3 rounded-2xl border backdrop-blur-xl shadow-xl transition flex items-center justify-center cursor-pointer ${
            followDriver
              ? 'bg-[#FACC15] text-[#000] border-[#FACC15] shadow-[#FACC15]/30'
              : 'bg-black/80 text-gray-300 border-white/15 hover:text-white'
          }`}
        >
          <Crosshair className={`w-4 h-4 ${followDriver ? 'animate-spin' : ''}`} />
        </button>

        {/* Recenter Trip Bounds */}
        <button
          type="button"
          onClick={handleRecenterAll}
          title="Fit Trip Route"
          className="p-3 rounded-2xl border border-white/15 bg-black/80 text-gray-300 hover:text-white backdrop-blur-xl shadow-xl transition flex items-center justify-center cursor-pointer"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* 5. UBER BLACK PREMIUM BOTTOM SHEET: SAMPSON PRAH, CALL, SOS, SHARE TRIP */}
      <div className="absolute bottom-0 left-0 right-0 z-[450] pointer-events-auto max-w-xl mx-auto w-full px-2 sm:px-4 pb-2 sm:pb-3">
        <div className="bg-[#0A0B10]/95 backdrop-blur-2xl border-2 border-[#EEC367]/40 rounded-3xl p-4 sm:p-5 shadow-2xl shadow-black space-y-4">
          
          {/* Drag Handle & Accordion Toggle */}
          <div 
            onClick={() => setSheetExpanded(!sheetExpanded)}
            className="flex flex-col items-center justify-center cursor-pointer -mt-1 -mb-1 py-1"
          >
            <div className="w-10 h-1 rounded-full bg-white/25 hover:bg-[#FACC15] transition" />
          </div>

          {/* DRIVER CARD (PART 3 SPECIFICATION) */}
          <div className="bg-[#111322] border-2 border-[#00C853]/50 rounded-3xl p-4 sm:p-5 shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                {/* Photo 80px circle with 3px green ring #00C853 */}
                <div className="relative shrink-0">
                  <div className="w-20 h-20 rounded-full border-[3px] border-[#00C853] p-0.5 overflow-hidden bg-black/80 shadow-lg shadow-[#00C853]/25 flex items-center justify-center">
                    {driverPhoto ? (
                      <img 
                        src={driverPhoto} 
                        alt={driverName} 
                        className="w-full h-full object-cover rounded-full" 
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-gradient-to-tr from-[#1A1D48] to-[#252869] flex items-center justify-center font-bold text-2xl text-[#00C853]">
                        {driverName.charAt(0)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Name & Badges */}
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Name bold 18px */}
                    <h3 className="text-[18px] font-bold text-white tracking-wide">
                      {driverName}
                    </h3>

                    {/* Badge 1: ✓ VERIFIED - background #00C853, white text, pill 12px rounded, 11px bold */}
                    <span 
                      style={{ backgroundColor: '#00C853' }} 
                      className="text-white px-2.5 py-0.5 rounded-[12px] text-[11px] font-bold shadow inline-flex items-center"
                    >
                      ✓ VERIFIED
                    </span>

                    {/* Badge 2: ✓ OWNER - background #0A7E07 darker green, white text, pill, 11px bold */}
                    <span 
                      style={{ backgroundColor: '#0A7E07' }} 
                      title="This car is driven by the owner himself"
                      className="text-white px-2.5 py-0.5 rounded-[12px] text-[11px] font-bold shadow inline-flex items-center cursor-help group relative"
                    >
                      ✓ OWNER
                      <span className="hidden group-hover:block absolute bottom-full left-0 mb-1 px-2.5 py-1 bg-black/95 text-white text-[10px] font-normal rounded-lg border border-white/20 whitespace-nowrap z-50 shadow-2xl">
                        This car is driven by the owner himself
                      </span>
                    </span>
                  </div>

                  {/* Car: {car_color} {car_model} */}
                  <div className="text-xs text-gray-200 font-medium">
                    {driverCarColor} {driverCarModel}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    {/* Plate in box: black bg #111, white bold text, Ghana plate style */}
                    <div 
                      style={{ backgroundColor: '#111' }} 
                      className="border border-gray-700 px-2.5 py-0.5 rounded-lg text-white font-mono font-bold text-xs tracking-wider shadow-inner inline-flex items-center gap-1"
                    >
                      <span className="text-[8px] bg-yellow-400 text-black px-1 rounded font-sans font-black">GH</span>
                      <span>{driverPlate}</span>
                    </div>

                    {/* Rating: ⭐ 5.0 Top Driver */}
                    <div className="text-amber-400 font-bold text-xs flex items-center gap-1">
                      <span>⭐ 5.0 Top Driver</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* UNIQUE TRIP VERIFICATION CODE */}
            <div className="pt-3 border-t border-gray-800/80 space-y-2.5">
              <div className="bg-black/80 border-2 border-[#EEC367] rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">
                    Show this code to driver before entering
                  </span>
                  <div className="flex items-center gap-2.5 mt-1">
                    <span className="text-xs font-bold text-gray-300">Trip Code:</span>
                    <span className="font-mono text-3xl sm:text-4xl font-black text-[#EEC367] tracking-widest block">
                      {tripCode}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {/* Countdown Timer */}
                  <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-[#EEC367] bg-[#14163b] px-2.5 py-1.5 rounded-xl border border-[#EEC367]/40 shadow">
                    <Clock className="w-3.5 h-3.5 text-[#EEC367]" />
                    <span>{formatCountdown(codeCountdown)}</span>
                  </div>

                  {/* Copy Button */}
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(tripCode);
                      setToastMessage('Trip Code copied!');
                      setTimeout(() => setToastMessage(null), 2500);
                    }}
                    className="px-3.5 py-1.5 bg-[#EEC367] hover:bg-[#ffe199] text-[#1A1D48] text-xs font-black rounded-xl transition flex items-center gap-1 cursor-pointer shadow active:scale-95"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </button>
                </div>
              </div>

              {/* Safety Rule Banner */}
              <div className="p-2 bg-amber-500/15 border border-amber-500/40 rounded-xl text-amber-300 text-xs font-bold text-center">
                ⚠️ Don't share until you see {driverCarColor} {driverCarModel} {driverPlate}
              </div>
            </div>
          </div>

          {/* 4 CORE ACTION BUTTONS: CALL, PAY MOMO, SOS, SHARE TRIP */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            {/* 1. CALL DRIVER */}
            <a
              href={`tel:${driverPhone}`}
              className="py-2.5 px-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-2xl font-bold text-xs flex flex-col items-center justify-center gap-1 shadow-lg shadow-emerald-950/40 transition active:scale-95 cursor-pointer border border-emerald-400/40"
            >
              <Phone className="w-4 h-4" />
              <span>Call Driver</span>
            </a>

            {/* 2. PAY DRIVER VIA MOMO (PRIMARY ACTION) */}
            <button
              type="button"
              onClick={() => setShowMomoModal(true)}
              className="py-2.5 px-2 bg-gradient-to-r from-[#FFCC00] to-[#FACC15] hover:from-[#ffe066] hover:to-[#fde047] text-black rounded-2xl font-black text-xs flex flex-col items-center justify-center gap-1 shadow-lg shadow-yellow-950/40 transition active:scale-95 cursor-pointer border border-[#FFCC00]"
            >
              <Coins className="w-4 h-4 text-black" />
              <span>Pay with MoMo</span>
            </button>

            {/* 3. SOS EMERGENCY */}
            <button
              type="button"
              onClick={() => setShowSosModal(true)}
              className="py-2.5 px-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-2xl font-bold text-xs flex flex-col items-center justify-center gap-1 shadow-lg shadow-red-950/40 transition active:scale-95 cursor-pointer border border-red-400/40"
            >
              <ShieldAlert className="w-4 h-4 animate-pulse" />
              <span>SOS Emergency</span>
            </button>

            {/* 4. SHARE TRIP */}
            <button
              type="button"
              onClick={handleShareTrip}
              className="py-2.5 px-2 bg-[#1A1D48] hover:bg-[#22265E] text-[#FACC15] rounded-2xl font-bold text-xs flex flex-col items-center justify-center gap-1 shadow-lg transition active:scale-95 cursor-pointer border border-[#FACC15]/40"
            >
              {copiedShareLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
              <span>{copiedShareLink ? 'Link Copied!' : 'Share Trip'}</span>
            </button>
          </div>

          {/* EXPANDABLE SECTION (Payment Status, MoMo Number & Ride Cancellation) */}
          {sheetExpanded && (
            <div className="pt-2 border-t border-white/10 space-y-2.5 text-xs">
              {/* Payment & MoMo Box */}
              <div 
                onClick={() => setShowMomoModal(true)}
                className="p-3 bg-[#111320] hover:bg-[#161829] rounded-2xl border border-white/10 hover:border-[#FFCC00]/50 flex items-center justify-between gap-3 transition cursor-pointer group"
              >
                <div>
                  <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-gray-400 group-hover:text-[#FFCC00] transition">
                    <Coins className="w-3 h-3 text-[#FACC15]" />
                    <span>Direct MoMo Panel (Tap to Open)</span>
                  </div>
                  <div className="font-mono font-bold text-sm text-white mt-0.5">
                    {driverMomo}
                  </div>
                  <span className="text-[10px] text-gray-400">Send GHS {ride.fareGhs} directly to {driverName}</span>
                </div>

                <div className="flex items-center gap-2">
                  {ride.paymentStatus === 'Awaiting payment' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMomoModal(true);
                      }}
                      className="px-3.5 py-2 bg-[#FACC15] hover:bg-[#eab308] text-black font-black text-xs rounded-xl shadow-md transition cursor-pointer"
                    >
                      Pay GHS {ride.fareGhs}
                    </button>
                  )}

                  {ride.paymentStatus === 'Passenger marked as paid' && (
                    <span className="px-2.5 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/40 rounded-xl font-bold text-[11px]">
                      Paid · Awaiting Confirmation
                    </span>
                  )}

                  {ride.paymentStatus === 'Payment confirmed' && (
                    <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-xl font-bold text-[11px] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Confirmed
                    </span>
                  )}
                </div>
              </div>

              {/* Ride Cancellation Option (Allowed prior to pickup) */}
              {onCancelRide && ['requested', 'accepted'].includes(ride.status) && (
                <button
                  type="button"
                  onClick={onCancelRide}
                  className="w-full py-2 bg-red-950/30 hover:bg-red-950/60 text-red-400 border border-red-500/30 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Cancel Ride Request</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 6. SOS EMERGENCY MODAL */}
      {showSosModal && (
        <div className="fixed inset-0 z-[999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#12131C] border-2 border-red-500/60 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-white space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-500">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
                <h3 className="font-bold text-lg text-white">Emergency Safety Center</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSosModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              If you feel unsafe or have an emergency during your trip with {driverName}, call emergency dispatch or share your live GPS location immediately.
            </p>

            <div className="space-y-2 pt-1">
              <a
                href="tel:112"
                className="w-full py-3 px-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black text-sm flex items-center justify-between shadow-lg shadow-red-900/50 transition cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4" />
                  <span>Ghana National Emergency</span>
                </div>
                <span className="font-mono text-base font-black">112</span>
              </a>

              <a
                href="tel:191"
                className="w-full py-3 px-4 bg-[#1A1D48] hover:bg-[#252869] text-white rounded-2xl font-bold text-sm flex items-center justify-between border border-blue-500/30 transition cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-blue-400" />
                  <span>Ghana Police Service</span>
                </div>
                <span className="font-mono text-base font-bold text-blue-400">191</span>
              </a>

              <a
                href="tel:+233247273827"
                className="w-full py-3 px-4 bg-[#111322] hover:bg-[#181a2e] text-white rounded-2xl font-bold text-xs flex items-center justify-between border border-[#FACC15]/40 transition cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Zap className="w-4 h-4 text-[#FACC15]" />
                  <span>PrahRide 24/7 Sekondi Safety Hub</span>
                </div>
                <span className="font-mono text-xs text-[#FACC15]">+233 24 727 3827</span>
              </a>
            </div>

            <div className="p-3 bg-black/60 rounded-xl border border-gray-800 text-[11px] text-gray-400 font-mono">
              <div>Trip ID: #{ride.id.slice(-6).toUpperCase()}</div>
              <div>Driver: {driverName} ({driverPlate})</div>
              <div>Current Area: Sekondi-Takoradi, Ghana</div>
            </div>

            <button
              type="button"
              onClick={() => setShowSosModal(false)}
              className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Return to Map
            </button>
          </div>
        </div>
      )}

      {/* 6B. DEDICATED MOMO PAYMENT PANEL MODAL */}
      {showMomoModal && (
        <MomoPaymentPanel
          ride={ride}
          isModal={true}
          onClose={() => setShowMomoModal(false)}
        />
      )}

      {/* 7. TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[600] bg-[#FACC15] text-black font-black text-xs px-4 py-2 rounded-full shadow-2xl flex items-center gap-1.5 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default LiveRideMap;
