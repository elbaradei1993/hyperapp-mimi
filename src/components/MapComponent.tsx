import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import type { Vibe, SOS } from '../types';
import { VibeType } from '../types';
import { IconLayers, IconHeartPulse } from './Icons';
import { getVibeIcon, sosIcon, userLocationIcon } from './MapIcons';
import { reportsService } from '../services/reports';
import 'leaflet/dist/leaflet.css';
// Import heatmap plugin
import 'leaflet.heat';

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
          width: '40px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
          border: 'none',
          cursor: 'pointer',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          // Mobile touch improvements
          WebkitTapHighlightColor: 'transparent',
          WebkitAppearance: 'none',
          touchAction: 'manipulation',
          // Better accessibility
          minWidth: '40px',
          minHeight: '40px',
          // Ensure proper touch target size
          position: 'relative',
          zIndex: 1000
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

// Memoized gradient calculation to avoid recalculation on every render
const useVibeGradients = () => {
  return useMemo(() => {
    const gradients: Record<VibeType, { [key: number]: string }> = {} as Record<VibeType, { [key: number]: string }>;

    Object.values(VibeType).forEach(vibeType => {
      const hexColor = vibeColorsHex[vibeType];
      const rgbColor = hexToRgb(hexColor);

      if (rgbColor) {
        const gradient: { [key: number]: string } = {};
        const opacitySteps = [0.0, 0.2, 0.4, 0.6, 0.8, 1.0];

        opacitySteps.forEach(opacity => {
          gradient[opacity] = `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, ${opacity})`;
        });

        gradients[vibeType] = gradient;
      }
    });

    return gradients;
  }, []);
};

// Optimized heatmap layer with memoized calculations
const HeatmapLayer: React.FC<{ vibes: Vibe[], isVisible: boolean }> = React.memo(({ vibes, isVisible }) => {
  const map = useMap();
  const layersRef = useRef<any[]>([]);
  const gradients = useVibeGradients();

  // Memoize grouped vibes to avoid recalculation
  const groupedVibes = useMemo(() => {
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

    vibes.forEach(vibe => {
      if (vibe.latitude && vibe.longitude && vibe.vibe_type && vibesByType[vibe.vibe_type]) {
        vibesByType[vibe.vibe_type].push(vibe);
      }
    });

    return vibesByType;
  }, [vibes]);

  useEffect(() => {
    const L = (window as any).L;
    if (!L || !L.heatLayer) {
      console.warn("Leaflet.heat plugin not found. Heatmap will not be rendered.");
      return;
    }

    // Clear existing layers with defensive error handling
    try {
      layersRef.current.forEach(layer => {
        if (layer && map && typeof map.hasLayer === 'function' && map.hasLayer(layer)) {
          try {
            map.removeLayer(layer);
          } catch (layerError) {
            console.warn('Error removing heatmap layer:', layerError);
          }
        }
      });
    } catch (cleanupError) {
      console.warn('Error during layer cleanup:', cleanupError);
    }
    layersRef.current = [];

    if (!isVisible) return;

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

    // Create heatmap layers for each vibe type with error handling
    renderOrder.forEach(vibeType => {
      try {
        const typeVibes = groupedVibes[vibeType];
        if (typeVibes.length === 0) return;

        const gradient = gradients[vibeType];
        if (!gradient) {
          console.warn(`No gradient available for ${vibeType}`);
          return;
        }

        // Create points for this vibe type
        const points = typeVibes.map(vibe => [
          vibe.latitude!,
          vibe.longitude!,
          0.8 // Consistent intensity for all points of this type
        ]);

        // Create heatmap layer with memoized gradient
        const heatLayer = L.heatLayer(points, {
          radius: 25,
          blur: 15,
          maxZoom: 17,
          minOpacity: 0.4,
          maxOpacity: 0.9,
          gradient: gradient
        });

        // Add layer to map with error handling
        if (heatLayer && map && typeof map.addLayer === 'function') {
          try {
            map.addLayer(heatLayer);
            layersRef.current.push(heatLayer);
          } catch (addLayerError) {
            console.warn(`Error adding heatmap layer for ${vibeType}:`, addLayerError);
          }
        }
      } catch (vibeTypeError) {
        console.warn(`Error creating heatmap layer for ${vibeType}:`, vibeTypeError);
      }
    });

    // Cleanup function with defensive error handling
    return () => {
      try {
        layersRef.current.forEach(layer => {
          if (layer && map && typeof map.hasLayer === 'function' && map.hasLayer(layer)) {
            try {
              map.removeLayer(layer);
            } catch (layerError) {
              console.warn('Error removing heatmap layer during cleanup:', layerError);
            }
          }
        });
      } catch (cleanupError) {
        console.warn('Error during cleanup:', cleanupError);
      }
      layersRef.current = [];
    };
  }, [map, groupedVibes, isVisible, gradients]);

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

// Memoized marker components to prevent unnecessary re-renders
const VibeMarker: React.FC<{
  vibe: Vibe;
  userId: string;
  onBoostUpdate: (id: number, type: 'vibe' | 'sos', newCount: number, isBoosted: boolean) => void;
}> = React.memo(({ vibe, userId, onBoostUpdate }) => (
  <Marker
    key={`vibe-${vibe.id}`}
    position={[vibe.latitude!, vibe.longitude!]}
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
            onBoostUpdate={onBoostUpdate}
          />
        </div>
        <small style={{ color: '#6b7280' }}>{new Date(vibe.created_at).toLocaleString()}</small>
      </div>
    </Popup>
  </Marker>
));

const SOSMarker: React.FC<{
  sos: SOS;
  userId: string;
  onBoostUpdate: (id: number, type: 'vibe' | 'sos', newCount: number, isBoosted: boolean) => void;
}> = React.memo(({ sos, userId, onBoostUpdate }) => (
  <React.Fragment key={`sos-${sos.id}`}>
    <Marker
      position={[sos.latitude!, sos.longitude!]}
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
              onBoostUpdate={onBoostUpdate}
            />
          </div>
          <small style={{ color: '#6b7280' }}>Reported by {sos.profile?.username || 'anonymous'} at {new Date(sos.created_at).toLocaleString()}</small>
        </div>
      </Popup>
    </Marker>
    <Circle
      center={[sos.latitude!, sos.longitude!]}
      radius={3000}
      pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.1, weight: 1 }}
    />
  </React.Fragment>
));

// Memoized main component to prevent unnecessary re-renders
const MapComponent: React.FC<MapComponentProps> = React.memo(({
  vibes,
  sosAlerts,
  center,
  zoom,
  userLocation,
  isHeatmapVisible,
  onToggleHeatmap,
  userId
}) => {
  // Memoize boost update handler
  const handleBoostUpdate = useCallback((id: number, type: 'vibe' | 'sos', newCount: number, isBoosted: boolean) => {
    // The boost count will be updated in the database, and the component will re-render
    // with fresh data from the parent component's data fetching
  }, []);

  // Memoize filtered and validated vibes to avoid recalculation
  const validVibes = useMemo(() =>
    vibes.filter(vibe =>
      vibe.latitude &&
      vibe.longitude &&
      Object.values(VibeType).includes(vibe.vibe_type)
    ), [vibes]
  );

  // Memoize filtered and validated SOS alerts
  const validSOSAlerts = useMemo(() =>
    sosAlerts.filter(sos => sos.latitude && sos.longitude),
    [sosAlerts]
  );

  return (
    <MapContainer center={center} zoom={zoom} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
      <MapFlyController center={center} zoom={zoom} />
      <RecenterControl userLocation={userLocation} />
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
      <HeatmapLayer vibes={validVibes} isVisible={isHeatmapVisible} />

      {!isHeatmapVisible && validVibes.map((vibe) => (
        <VibeMarker
          key={`vibe-${vibe.id}`}
          vibe={vibe}
          userId={userId}
          onBoostUpdate={handleBoostUpdate}
        />
      ))}

      {validSOSAlerts.map((sos) => (
        <SOSMarker
          key={`sos-${sos.id}`}
          sos={sos}
          userId={userId}
          onBoostUpdate={handleBoostUpdate}
        />
      ))}
    </MapContainer>
  );
});

export default MapComponent;
