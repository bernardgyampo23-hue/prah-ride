import React, { useEffect, useRef, useState, useCallback } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Crosshair, Maximize2, Zap } from 'lucide-react';
import { calculateDistanceKm, calculateBearing, SEKONDI_TAKORADI_CENTER } from '../lib/constants';

// Fix Leaflet's default marker icon URL issues when bundled with Vite
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Center coordinates for Sekondi-Takoradi, Western Region, Ghana
const SEKONDI_TAKORADI_COORDS: [number, number] = [4.9340, -1.7137];
const DEFAULT_ZOOM = 13;

export interface DriverCoordsInput {
  lat: number;
  lng: number;
  heading?: number;
  speedKmh?: number;
}

export interface MapPickerProps {
  pickupCoords?: { lat: number; lng: number; address: string } | null;
  dropoffCoords?: { lat: number; lng: number; address: string } | null;
  driverCoords?: DriverCoordsInput | null;
  driverInfo?: {
    name?: string;
    vehicle?: string;
    plate?: string;
  };
  rideStatus?: string;
  onSelectCoords?: (coords: { lat: number; lng: number; address: string }, mode: 'pickup' | 'dropoff') => void;
  selectionMode?: 'pickup' | 'dropoff' | 'view';
  height?: string;
  zoom?: number;
  interactive?: boolean;
  showTelemetryHUD?: boolean;
}

export const LeafletMap: React.FC<MapPickerProps> = ({
  pickupCoords,
  dropoffCoords,
  driverCoords,
  driverInfo,
  rideStatus,
  onSelectCoords,
  selectionMode = 'view',
  height = '400px',
  zoom = DEFAULT_ZOOM,
  showTelemetryHUD = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Markers & Polyline Refs
  const pickupMarkerRef = useRef<L.Marker | null>(null);
  const dropoffMarkerRef = useRef<L.Marker | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const plannedRouteRef = useRef<L.Polyline | null>(null);
  const activeDriverRouteRef = useRef<L.Polyline | null>(null);
  const breadcrumbTrailRef = useRef<L.Polyline | null>(null);

  // Animation and Smooth Movement State
  const animatedDriverPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const targetDriverPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const animationStartTimeRef = useRef<number | null>(null);
  const animationStartPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const currentHeadingRef = useRef<number>(0);
  const breadcrumbsListRef = useRef<[number, number][]>([]);

  // UI HUD Controls
  const [followDriver, setFollowDriver] = useState<boolean>(true);
  const [liveDistanceKm, setLiveDistanceKm] = useState<number | null>(null);
  const [liveEtaMinutes, setLiveEtaMinutes] = useState<number | null>(null);
  const [displayedSpeed, setDisplayedSpeed] = useState<number>(36);

  // Custom Icon Generators
  const createPickupIcon = () => {
    return L.divIcon({
      className: 'custom-leaflet-icon',
      html: `
        <div style="background-color: #EEC367; border: 2.5px solid #1A1D48; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">
          <span style="font-weight: 800; font-size: 13px; color: #1A1D48;">A</span>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
  };

  const createDropoffIcon = () => {
    return L.divIcon({
      className: 'custom-leaflet-icon',
      html: `
        <div style="background-color: #2ECC71; border: 2.5px solid #1A1D48; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">
          <span style="font-weight: 800; font-size: 13px; color: #1A1D48;">B</span>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
  };

  // Real-Time Rotating Glowing Yellow Car Marker Icon with GPS pulse wave
  const createDriverIconHtml = (heading: number) => {
    return `
      <div style="position: relative; width: 56px; height: 56px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; inset: -2px; border-radius: 50%; background: radial-gradient(circle, rgba(250, 204, 21, 0.4) 0%, rgba(238, 195, 103, 0.15) 50%, transparent 75%); animation: ping 2.2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: absolute; inset: 4px; border-radius: 50%; border: 1.5px solid rgba(250, 204, 21, 0.7); box-shadow: 0 0 16px rgba(250, 204, 21, 0.85); animation: pulse 1.8s infinite ease-in-out;"></div>
        <div style="transform: rotate(${heading}deg); transition: transform 0.35s ease-out; position: relative; width: 38px; height: 38px; border-radius: 50%; background: #0A0B10; border: 2.5px solid #FACC15; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 22px rgba(250, 204, 21, 0.95), 0 4px 14px rgba(0,0,0,0.9);">
          <div style="position: absolute; top: -7px; width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-bottom: 8px solid #FACC15; filter: drop-shadow(0 -2px 4px rgba(250, 204, 21, 0.9));"></div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#FACC15" stroke="#000" stroke-width="0.5">
            <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.22.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
          </svg>
        </div>
      </div>
    `;
  };

  // Map Initialization: Center to Sekondi-Takoradi [4.9340, -1.7137] zoom 13
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    // Check if already initialized on this DOM node
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(container, {
      center: SEKONDI_TAKORADI_COORDS,
      zoom: zoom || DEFAULT_ZOOM,
      zoomControl: false,
      attributionControl: true,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // 100% Free OpenStreetMap Tiles (Needs NO key, styled dark via #prahride-map CSS)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© Prah Ride | OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    // User tap-to-pin listener
    map.on('click', async (e: L.LeafletMouseEvent) => {
      if (!onSelectCoords || selectionMode === 'view') return;

      const { lat, lng } = e.latlng;
      let addr = `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;

      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
        const data = await res.json();
        if (data && data.display_name) {
          const parts = data.display_name.split(',');
          addr = parts.slice(0, 3).join(',').trim();
        }
      } catch {
        // Fallback coordinate representation
      }

      onSelectCoords({ lat, lng, address: addr }, selectionMode);
    });

    mapInstanceRef.current = map;
    setMapReady(true);

    // Invalidate map size to prevent grey / blank tiles
    const timer1 = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    const timer2 = setTimeout(() => {
      map.invalidateSize();
    }, 500);

    // Handle container resize events
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
      plannedRouteRef.current = null;
      activeDriverRouteRef.current = null;
      breadcrumbTrailRef.current = null;
      setMapReady(false);
    };
  }, []);

  // Center / Fit view helper
  const handleFitRouteBounds = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const boundsPoints: [number, number][] = [];
    if (pickupCoords) boundsPoints.push([pickupCoords.lat, pickupCoords.lng]);
    if (dropoffCoords) boundsPoints.push([dropoffCoords.lat, dropoffCoords.lng]);
    if (animatedDriverPosRef.current) {
      boundsPoints.push([animatedDriverPosRef.current.lat, animatedDriverPosRef.current.lng]);
    } else if (driverCoords) {
      boundsPoints.push([driverCoords.lat, driverCoords.lng]);
    }

    if (boundsPoints.length >= 2) {
      map.fitBounds(L.latLngBounds(boundsPoints), { padding: [50, 50], maxZoom: 16 });
    } else if (boundsPoints.length === 1) {
      map.setView(boundsPoints[0], 14);
    } else {
      map.setView(SEKONDI_TAKORADI_COORDS, DEFAULT_ZOOM);
    }
  }, [pickupCoords, dropoffCoords, driverCoords]);

  // Recenter / Follow Driver
  const handleRecenterDriver = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const pos = animatedDriverPosRef.current || driverCoords;
    if (pos) {
      map.flyTo([pos.lat, pos.lng], 15, { animate: true, duration: 1.2 });
    } else {
      map.flyTo(SEKONDI_TAKORADI_COORDS, DEFAULT_ZOOM, { animate: true, duration: 1.0 });
    }
  }, [driverCoords]);

  // Smooth real-time driver coordinates interpolation animation
  useEffect(() => {
    if (!mapReady) return;
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!driverCoords) {
      if (driverMarkerRef.current) {
        map.removeLayer(driverMarkerRef.current);
        driverMarkerRef.current = null;
      }
      if (activeDriverRouteRef.current) {
        map.removeLayer(activeDriverRouteRef.current);
        activeDriverRouteRef.current = null;
      }
      if (breadcrumbTrailRef.current) {
        map.removeLayer(breadcrumbTrailRef.current);
        breadcrumbTrailRef.current = null;
      }
      animatedDriverPosRef.current = null;
      targetDriverPosRef.current = null;
      return;
    }

    const newTarget = { lat: driverCoords.lat, lng: driverCoords.lng };
    targetDriverPosRef.current = newTarget;

    // Calculate heading based on difference or prop
    if (driverCoords.heading !== undefined && driverCoords.heading !== null) {
      currentHeadingRef.current = driverCoords.heading;
    } else if (animatedDriverPosRef.current) {
      const prev = animatedDriverPosRef.current;
      const distDelta = calculateDistanceKm(prev.lat, prev.lng, newTarget.lat, newTarget.lng);
      if (distDelta > 0.0001) {
        currentHeadingRef.current = calculateBearing(prev.lat, prev.lng, newTarget.lat, newTarget.lng);
      }
    }

    // Set speed
    if (driverCoords.speedKmh) {
      setDisplayedSpeed(Math.round(driverCoords.speedKmh));
    } else {
      setDisplayedSpeed(35 + Math.floor(Math.sin(Date.now() / 3000) * 8));
    }

    // First time receiving coordinates -> place marker directly
    if (!animatedDriverPosRef.current) {
      animatedDriverPosRef.current = newTarget;
      animationStartPosRef.current = newTarget;

      const driverIcon = L.divIcon({
        className: 'custom-leaflet-driver-icon',
        html: createDriverIconHtml(currentHeadingRef.current),
        iconSize: [48, 48],
        iconAnchor: [24, 24],
      });

      const marker = L.marker([newTarget.lat, newTarget.lng], { icon: driverIcon }).addTo(map);
      marker.bindPopup(`
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12px; color: #1A1D48; min-width: 140px;">
          <strong style="color: #1A1D48; font-size: 13px;">${driverInfo?.name || 'Assigned Driver'}</strong><br/>
          <span style="color: #666;">${driverInfo?.vehicle || 'Verified Vehicle'}</span><br/>
          <span style="font-family: monospace; font-weight: bold; color: #1A1D48;">${driverInfo?.plate || 'WR-Plate'}</span><br/>
          <div style="margin-top: 4px; padding: 2px 6px; background: #2ECC71; color: white; border-radius: 4px; font-weight: bold; text-align: center; font-size: 10px;">
            LIVE GPS BROADCASTING
          </div>
        </div>
      `);
      driverMarkerRef.current = marker;

      breadcrumbsListRef.current = [[newTarget.lat, newTarget.lng]];
      return;
    }

    // If marker already exists, smoothly interpolate from startPos to newTarget over 1200ms
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

      // Update Leaflet marker position & icon rotation
      if (driverMarkerRef.current) {
        driverMarkerRef.current.setLatLng([currentLat, currentLng]);

        const iconHtml = createDriverIconHtml(currentHeadingRef.current);
        const updatedIcon = L.divIcon({
          className: 'custom-leaflet-driver-icon',
          html: iconHtml,
          iconSize: [48, 48],
          iconAnchor: [24, 24],
        });
        driverMarkerRef.current.setIcon(updatedIcon);
      }

      // Add to breadcrumb trail
      if (breadcrumbsListRef.current.length > 30) {
        breadcrumbsListRef.current.shift();
      }
      breadcrumbsListRef.current.push([currentLat, currentLng]);

      // Render/Update Breadcrumb polyline
      if (breadcrumbTrailRef.current) {
        breadcrumbTrailRef.current.setLatLngs(breadcrumbsListRef.current);
      } else {
        breadcrumbTrailRef.current = L.polyline(breadcrumbsListRef.current, {
          color: '#EEC367',
          weight: 3,
          opacity: 0.45,
          dashArray: '3, 6',
        }).addTo(map);
      }

      // Update Dynamic Active Segment Polyline (Driver to active destination)
      const targetPoint =
        rideStatus === 'in_progress' && dropoffCoords
          ? [dropoffCoords.lat, dropoffCoords.lng]
          : pickupCoords
          ? [pickupCoords.lat, pickupCoords.lng]
          : null;

      if (targetPoint) {
        const activeSegment: [number, number][] = [[currentLat, currentLng], targetPoint as [number, number]];
        if (activeDriverRouteRef.current) {
          activeDriverRouteRef.current.setLatLngs(activeSegment);
        } else {
          activeDriverRouteRef.current = L.polyline(activeSegment, {
            color: '#3B82F6',
            weight: 4.5,
            opacity: 0.95,
            dashArray: '8, 12',
          }).addTo(map);
        }
      }

      // If Auto-Follow is active, smoothly pan camera
      if (followDriver && mapInstanceRef.current && progress >= 0.99) {
        mapInstanceRef.current.panTo([currentLat, currentLng], { animate: true, duration: 0.4 });
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
  }, [driverCoords?.lat, driverCoords?.lng, driverCoords?.heading, followDriver, rideStatus, mapReady]);

  // Calculate Live Distance & ETA to immediate objective
  useEffect(() => {
    const driverPos = animatedDriverPosRef.current || driverCoords;
    if (!driverPos) {
      setLiveDistanceKm(null);
      setLiveEtaMinutes(null);
      return;
    }

    let targetLat = 0;
    let targetLng = 0;

    if (rideStatus === 'in_progress' && dropoffCoords) {
      targetLat = dropoffCoords.lat;
      targetLng = dropoffCoords.lng;
    } else if (pickupCoords) {
      targetLat = pickupCoords.lat;
      targetLng = pickupCoords.lng;
    }

    if (targetLat && targetLng) {
      const dist = calculateDistanceKm(driverPos.lat, driverPos.lng, targetLat, targetLng);
      setLiveDistanceKm(parseFloat(dist.toFixed(2)));

      const minutes = Math.max(1, Math.round((dist / 35) * 60));
      setLiveEtaMinutes(minutes);
    }
  }, [driverCoords?.lat, driverCoords?.lng, pickupCoords, dropoffCoords, rideStatus]);

  // Update Pickup and Dropoff Static Markers & Planned Route
  useEffect(() => {
    if (!mapReady) return;
    const map = mapInstanceRef.current;
    if (!map) return;

    // Pickup Marker
    if (pickupCoords) {
      if (pickupMarkerRef.current) {
        pickupMarkerRef.current.setLatLng([pickupCoords.lat, pickupCoords.lng]);
      } else {
        pickupMarkerRef.current = L.marker([pickupCoords.lat, pickupCoords.lng], {
          icon: createPickupIcon(),
        }).addTo(map).bindPopup(`<b>Pickup (A):</b> ${pickupCoords.address}`);
      }
    } else if (pickupMarkerRef.current) {
      map.removeLayer(pickupMarkerRef.current);
      pickupMarkerRef.current = null;
    }

    // Dropoff Marker
    if (dropoffCoords) {
      if (dropoffMarkerRef.current) {
        dropoffMarkerRef.current.setLatLng([dropoffCoords.lat, dropoffCoords.lng]);
      } else {
        dropoffMarkerRef.current = L.marker([dropoffCoords.lat, dropoffCoords.lng], {
          icon: createDropoffIcon(),
        }).addTo(map).bindPopup(`<b>Drop-off (B):</b> ${dropoffCoords.address}`);
      }
    } else if (dropoffMarkerRef.current) {
      map.removeLayer(dropoffMarkerRef.current);
      dropoffMarkerRef.current = null;
    }

    // Planned Full Trip Route Polyline
    const points: [number, number][] = [];
    if (pickupCoords) points.push([pickupCoords.lat, pickupCoords.lng]);
    if (dropoffCoords) points.push([dropoffCoords.lat, dropoffCoords.lng]);

    if (points.length === 2) {
      if (plannedRouteRef.current) {
        plannedRouteRef.current.setLatLngs(points);
      } else {
        plannedRouteRef.current = L.polyline(points, {
          color: '#ffffff',
          weight: 3,
          opacity: 0.35,
          dashArray: '4, 8',
        }).addTo(map);
      }
    } else if (plannedRouteRef.current) {
      map.removeLayer(plannedRouteRef.current);
      plannedRouteRef.current = null;
    }
  }, [pickupCoords, dropoffCoords, mapReady]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-[#EEC367]/30 shadow-xl bg-[#1A1D48] h-[400px] min-h-[400px]">
      {/* Map Container Div with strictly enforced height 400px */}
      <div
        id="prahride-map"
        ref={mapContainerRef}
        style={{ height: height || '400px', minHeight: '400px' }}
        className="prahride-dark-map w-full h-[400px] min-h-[400px] z-0 bg-[#0a0a0a]"
      />

      {/* TAP-TO-PIN HELPER BANNER */}
      {selectionMode !== 'view' && (
        <div className="absolute top-3 left-3 z-[400] bg-[#1A1D48]/95 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-[#EEC367]/40 shadow-lg flex items-center gap-2 text-xs">
          <span className={`w-2.5 h-2.5 rounded-full ${selectionMode === 'pickup' ? 'bg-[#EEC367]' : 'bg-[#2ECC71]'}`} />
          <span className="font-medium text-white">
            Tap map to pin <strong className="text-[#EEC367]">{selectionMode === 'pickup' ? 'Pickup (A)' : 'Drop-off (B)'}</strong>
          </span>
        </div>
      )}

      {/* REAL-TIME TRACKING HUD OVERLAY (When driver is active on trip) */}
      {driverCoords && showTelemetryHUD && (
        <div className="absolute top-3 left-3 right-3 sm:right-auto z-[400] flex flex-col gap-2 max-w-sm">
          {/* Live Telemetry Pill */}
          <div className="bg-[#111333]/95 backdrop-blur-md border border-[#EEC367]/50 rounded-2xl p-3 shadow-2xl space-y-2">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2ECC71] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[#2ECC71]"></span>
                </span>
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Live GPS Tracking
                </span>
              </div>

              <div className="flex items-center gap-1 text-[11px] text-[#EEC367] bg-[#1A1D48] px-2 py-0.5 rounded-full border border-[#EEC367]/30 font-semibold font-mono">
                <Zap className="w-3 h-3 text-[#EEC367]" />
                <span>{displayedSpeed} km/h</span>
              </div>
            </div>

            {/* Target & ETA info */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-800 text-xs">
              <div>
                <span className="text-[10px] text-gray-400 block uppercase font-semibold">
                  {rideStatus === 'in_progress' ? 'To Drop-off' : 'To Pickup'}
                </span>
                <span className="font-bold text-white truncate block">
                  {liveDistanceKm !== null ? `${liveDistanceKm} km away` : 'Locating...'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-gray-400 block uppercase font-semibold">
                  Estimated Arrival
                </span>
                <span className="font-black text-[#2ECC71] text-sm block">
                  {liveEtaMinutes !== null ? `~${liveEtaMinutes} mins` : '--'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING MAP CAMERA CONTROLS */}
      <div className="absolute bottom-6 right-3 z-[400] flex flex-col gap-2">
        {driverCoords && (
          <button
            type="button"
            onClick={() => {
              setFollowDriver(!followDriver);
              if (!followDriver) handleRecenterDriver();
            }}
            title={followDriver ? 'Camera Following Driver' : 'Enable Camera Follow'}
            className={`p-2.5 rounded-xl border backdrop-blur-md shadow-lg transition flex items-center justify-center ${
              followDriver
                ? 'bg-[#EEC367] text-[#1A1D48] border-[#EEC367] shadow-[#EEC367]/20 font-bold'
                : 'bg-[#1A1D48]/90 text-gray-300 border-gray-700 hover:text-white'
            }`}
          >
            <Crosshair className={`w-4 h-4 ${followDriver ? 'animate-spin' : ''}`} />
          </button>
        )}

        {/* Fit Route / Recenter Bounds Button */}
        <button
          type="button"
          onClick={handleFitRouteBounds}
          title="Fit Trip / Center Sekondi-Takoradi"
          className="p-2.5 rounded-xl border border-gray-700 bg-[#1A1D48]/90 text-gray-300 hover:text-white backdrop-blur-md shadow-lg transition flex items-center justify-center"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Sekondi-Takoradi OSM Attribution Stamp */}
      <div className="absolute bottom-1 left-2 z-[400] text-[10px] text-gray-400 bg-[#1A1D48]/85 px-2 py-0.5 rounded pointer-events-none border border-gray-800">
        Sekondi-Takoradi OpenStreetMap · [4.9340, -1.7137]
      </div>
    </div>
  );
};

export default LeafletMap;
