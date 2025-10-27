import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import type { Vibe, SOS } from '../types';
import { VibeType } from '../types';
import { IconLayers, IconHeartPulse } from './Icons';
import { getVibeIcon, sosIcon, userLocationIcon } from './MapIcons';
import { reportsService } from '../services/reports';
import 'leaflet/dist/leaflet.css';
// Import heatmap plugin
import '../../leaflet-heat.js';

// Fix for default markers in react-leaflet
import L from 'leaflet';
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapComponentProps {
  vibes: Vibe[];
  sosAlerts: SOS[];
  center: [number, number];
  zoom: number;
  userLocation: [number, number] | null;
  isHeatmapVisible: boolean;
  onToggleHeatmap: () => void;
  userId: string;
}

// Controller Components
const MapFlyController: React.FC<{ center: [number, number], zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  // Fix: Add a ref to ensure the map only flies on the initial load, not on every re-render.
  // This prevents the user's manual panning/zooming from being overridden.
  const hasFlownRef = useRef(false);

  useEffect(() => {
    if (center && !hasFlownRef.current) {
      map.flyTo(center, zoom);
      hasFlownRef.current = true;
    }
  }, [center, zoom, map]);
  return null;
}

const ControlButton: React.FC<{ children: React.ReactNode; onClick: () => void; title: string; top: string }> = ({ children, onClick, title, top }) => (
  <div className="leaflet-top leaflet-right">
    <div className="leaflet-control leaflet-bar mr-[10px]" style={{ marginTop: top }}>
      <button
        onClick={onClick}
        title={title}
        style={{
          width: '34px',
          height: '34px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
          border: 'none',
          cursor: 'pointer',
          borderRadius: '4px',
          boxShadow: '0 1px 5px rgba(0,0,0,0.65)'
        }}
      >
        {children}
      </button>
    </div>
  </div>
);

const RecenterControl: React.FC<{ userLocation: [number, number] | null }> = ({ userLocation }) => {
  const map = useMap();
  return (
    <ControlButton onClick={() => userLocation && map.flyTo(userLocation, 15)} title="Re-center map" top="48px">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <circle cx="12" cy="12" r="6"></circle>
        <line x1="22" x2="18" y1="12" y2="12"></line>
        <line x1="6" x2="2" y1="12" y2="12"></line>
        <line x1="12" y1="6" x2="12" y2="2"></line>
        <line x1="12" y1="22" x2="12" y2="18"></line>
      </svg>
    </ControlButton>
  );
};

const HeatmapToggleControl: React.FC<{ isVisible: boolean, onToggle: () => void }> = ({ isVisible, onToggle }) => (
  <ControlButton onClick={onToggle} title="Toggle Heatmap" top="92px">
    <IconLayers size={20} color={isVisible ? '#3b82f6' : '#666'} />
  </ControlButton>
);

// Utility function to convert hex to RGB
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

// Vibe type colors for heatmap layers (hex format for Leaflet.heat compatibility)
const vibeColorsHex: Record<VibeType, string> = {
  [VibeType.Safe]: '#22c55e',      // Bright green
  [VibeType.Calm]: '#3b82f6',      // Sky blue
  [VibeType.Lively]: '#eab308',    // Golden yellow
  [VibeType.Festive]: '#f59e0b',   // Warm orange
  [VibeType.Crowded]: '#f97316',   // Burnt orange
  [VibeType.Suspicious]: '#a855f7', // Deep purple
  [VibeType.Dangerous]: '#ef4444',  // Crimson red
  [VibeType.Noisy]: '#06b6d4',     // Electric cyan
  [VibeType.Quiet]: '#2dd4bf'      // Soft teal
};

// Heatmap Layer Component - Multi-layered by vibe type
const HeatmapLayer: React.FC<{ vibes: Vibe[], isVisible: boolean }> = React.memo(({ vibes, isVisible }) => {
  const map = useMap();
  const layersRef = useRef<any[]>([]);

  useEffect(() => {
    const L = (window as any).L;
    if (!L || !L.heatLayer) {
      console.warn("Leaflet.heat plugin not found. Heatmap will not be rendered.");
      return;
    }

    // Clear existing layers
    layersRef.current.forEach(layer => {
      if (map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
    });
    layersRef.current = [];

    if (!isVisible) return;

    // Group vibes by type
    const vibesByType: Record<VibeType, Vibe[]> = {
      [VibeType.Safe]: [],
      [VibeType.Calm]: [],
      [VibeType.Lively]: [],
      [VibeType.Festive]: [],
      [VibeType.Crowded]: [],
      [VibeType.Suspicious]: [],
      [VibeType.Dangerous]: [],
      [VibeType.Noisy]: [],
      [VibeType.Quiet]: []
    };

    // Group vibes by their type
    vibes.forEach(vibe => {
      if (vibe.latitude && vibe.longitude && vibe.vibe_type) {
        if (vibesByType[vibe.vibe_type]) {
          vibesByType[vibe.vibe_type].push(vibe);
        }
      }
    });

    // Define rendering order (safe vibes first, dangerous last for proper layering)
    const renderOrder: VibeType[] = [
      VibeType.Quiet,
      VibeType.Calm,
      VibeType.Safe,
      VibeType.Lively,
      VibeType.Festive,
      VibeType.Crowded,
      VibeType.Noisy,
      VibeType.Suspicious,
      VibeType.Dangerous
    ];

    // Create heatmap layers for each vibe type
    renderOrder.forEach(vibeType => {
      const typeVibes = vibesByType[vibeType];
      if (typeVibes.length === 0) return;

      // Create points for this vibe type
      const points = typeVibes.map(vibe => [
        vibe.latitude,
        vibe.longitude,
        0.8 // Consistent intensity for all points of this type
      ]);

      // Get hex color for this vibe type
      const hexColor = vibeColorsHex[vibeType];
      const rgbColor = hexToRgb(hexColor);

      if (!rgbColor) {
        console.warn(`Invalid hex color for ${vibeType}: ${hexColor}`);
        return;
      }

      // Create gradient array for smooth color transition from transparent to full color
      // The gradient array has 1024 elements (256 opacity levels * 4 values per level)
      // Each set of 4 elements represents [r, g, b, unused] for that opacity level
      const gradient = new Array(1024);
      for (let i = 0; i < 256; i++) {
        const alpha = i / 255; // Opacity level from 0.0 to 1.0
        const index = i * 4;
        gradient[index] = Math.round(rgbColor.r * alpha);     // Red
        gradient[index + 1] = Math.round(rgbColor.g * alpha); // Green
        gradient[index + 2] = Math.round(rgbColor.b * alpha); // Blue
        // gradient[index + 3] is unused
      }

      // Create heatmap layer with proper RGB gradient array
      const heatLayer = L.heatLayer(points, {
        radius: 25,
        blur: 15,
        maxZoom: 17,
        minOpacity: 0.4,
        maxOpacity: 0.9,
        // Use RGB gradient array - this is the format the leaflet-heat library expects
        gradient: gradient
      });

      // Add layer to map
      map.addLayer(heatLayer);
      layersRef.current.push(heatLayer);
    });

    // Cleanup function
    return () => {
      layersRef.current.forEach(layer => {
        if (map.hasLayer(layer)) {
          map.removeLayer(layer);
        }
      });
      layersRef.current = [];
    };
  }, [map, vibes, isVisible]);

  return null;
});

// Boost Button Component for popups
const BoostButton: React.FC<{
  type: 'vibe' | 'sos';
  id: number;
  userId: string;
  initialBoosts: number;
  onBoostUpdate: (id: number, type: 'vibe' | 'sos', newCount: number, isBoosted: boolean) => void;
}> = ({ type, id, userId, initialBoosts, onBoostUpdate }) => {
  const [boosts, setBoosts] = useState(initialBoosts);
  const [isBoosted, setIsBoosted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if user has already voted on this item
    const checkVoteStatus = async () => {
      try {
        const voteType = await reportsService.getUserVote(id, userId);
        setIsBoosted(voteType === 'upvote');
      } catch (error) {
        console.error('Error checking vote status:', error);
      }
    };

    if (userId) {
      checkVoteStatus();
    }
  }, [id, type, userId]);

  const handleBoost = async () => {
    if (isLoading || !userId) return;

    setIsLoading(true);
    try {
      await reportsService.vote(id, userId, 'upvote');

      // Update local state optimistically
      const newBoosted = !isBoosted;
      const newCount = newBoosted ? boosts + 1 : boosts - 1;
      setIsBoosted(newBoosted);
      setBoosts(newCount);
      onBoostUpdate(id, type, newCount, newBoosted);
    } catch (error) {
      console.error('Error voting:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleBoost}
      disabled={isLoading}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 12px',
        borderRadius: '9999px',
        fontSize: '14px',
        fontWeight: '500',
        transition: 'all 0.3s ease',
        border: '1px solid',
        backgroundColor: isBoosted ? '#fef2f2' : '#f9fafb',
        color: isBoosted ? '#b91c1c' : '#374151',
        borderColor: isBoosted ? '#fecaca' : '#d1d5db',
        opacity: isLoading ? 0.5 : 1,
        cursor: isLoading ? 'not-allowed' : 'pointer'
      }}
      title={isBoosted ? 'Remove boost' : 'Raise awareness'}
    >
      <IconHeartPulse size={14} color={isBoosted ? '#ef4444' : '#6b7280'} />
      <span>{boosts}</span>
    </button>
  );
};

const MapComponent: React.FC<MapComponentProps> = ({ vibes, sosAlerts, center, zoom, userLocation, isHeatmapVisible, onToggleHeatmap, userId }) => {
  // Handle boost updates to refresh data
  const handleBoostUpdate = (id: number, type: 'vibe' | 'sos', newCount: number, isBoosted: boolean) => {
    // The boost count will be updated in the database, and the component will re-render
    // with fresh data from the parent component's data fetching
  };

  return (
    <MapContainer center={center} zoom={zoom} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
      <MapFlyController center={center} zoom={zoom} />
      <RecenterControl userLocation={userLocation} />
      {/* Fix: Pass `isHeatmapVisible` prop to the control component instead of undefined `isVisible`. */}
      <HeatmapToggleControl isVisible={isHeatmapVisible} onToggle={onToggleHeatmap} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {userLocation && (
        <Marker
          position={userLocation}
          icon={userLocationIcon}
        />
      )}
      <HeatmapLayer vibes={vibes} isVisible={isHeatmapVisible} />

      {!isHeatmapVisible && vibes.map((vibe) => {
        if (!vibe.latitude || !vibe.longitude) {
          console.warn(`Vibe ${vibe.id} has missing location data and will not be rendered.`);
          return null;
        }
        // Fix: Add a defensive check to ensure the vibe_type is valid before rendering.
        // This prevents the app from crashing if it receives unexpected data from the DB.
        if (!Object.values(VibeType).includes(vibe.vibe_type)) {
          console.warn(`Vibe ${vibe.id} has an unrecognized vibe_type ('${vibe.vibe_type}') and will not be rendered.`);
          return null;
        }
        return (
          <Marker
            key={`vibe-${vibe.id}`}
            position={[vibe.latitude, vibe.longitude]}
            icon={L.divIcon({
              html: `<div class="vibe-marker"><i class="${getVibeIcon(vibe.vibe_type)}"></i></div>`,
              className: 'vibe-marker',
              iconSize: [30, 30],
              iconAnchor: [15, 30]
            })}
          >
            <Popup>
              <div style={{ color: '#1f2937', maxWidth: '320px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <strong style={{ textTransform: 'capitalize' }}>{vibe.vibe_type}</strong> vibe reported by {vibe.profile?.username || 'anonymous'}.
                  </div>
                  <BoostButton
                    type="vibe"
                    id={vibe.id}
                    userId={userId}
                    initialBoosts={vibe.upvotes || 0}
                    onBoostUpdate={handleBoostUpdate}
                  />
                </div>
                <small style={{ color: '#6b7280' }}>{new Date(vibe.created_at).toLocaleString()}</small>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {sosAlerts.map((sos) => {
        if (!sos.latitude || !sos.longitude) {
          console.warn(`SOS Alert ${sos.id} has missing location data and will not be rendered.`);
          return null;
        }
        return (
          <React.Fragment key={`sos-${sos.id}`}>
            <Marker
              position={[sos.latitude, sos.longitude]}
              icon={sosIcon}
            >
              <Popup>
                <div style={{ color: '#1f2937', maxWidth: '320px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <strong>SOS Alert!</strong>
                      <p style={{ marginTop: '4px' }}>{sos.notes || 'No details provided.'}</p>
                    </div>
                    <BoostButton
                      type="sos"
                      id={sos.id}
                      userId={userId}
                      initialBoosts={sos.upvotes || 0}
                      onBoostUpdate={handleBoostUpdate}
                    />
                  </div>
                  <small style={{ color: '#6b7280' }}>Reported by {sos.profile?.username || 'anonymous'} at {new Date(sos.created_at).toLocaleString()}</small>
                </div>
              </Popup>
            </Marker>
            <Circle
              center={[sos.latitude, sos.longitude]}
              radius={3000}
              pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.1, weight: 1 }}
            />
          </React.Fragment>
        );
      })}
    </MapContainer>
  );
};

export default MapComponent;
