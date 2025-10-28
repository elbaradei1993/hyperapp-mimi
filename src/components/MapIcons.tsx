import L from 'leaflet';

// Vibe type colors matching the heatmap colors
const vibeColors: Record<string, { primary: string; secondary: string; icon: string }> = {
  safe: { primary: '#22c55e', secondary: '#16a34a', icon: 'fas fa-shield-alt' },
  calm: { primary: '#3b82f6', secondary: '#2563eb', icon: 'fas fa-peace' },
  lively: { primary: '#eab308', secondary: '#ca8a04', icon: 'fas fa-glass-cheers' },
  festive: { primary: '#f59e0b', secondary: '#d97706', icon: 'fas fa-music' },
  crowded: { primary: '#f97316', secondary: '#ea580c', icon: 'fas fa-users' },
  suspicious: { primary: '#a855f7', secondary: '#9333ea', icon: 'fas fa-eye-slash' },
  dangerous: { primary: '#ef4444', secondary: '#dc2626', icon: 'fas fa-exclamation-triangle' },
  noisy: { primary: '#06b6d4', secondary: '#0891b2', icon: 'fas fa-volume-up' },
  quiet: { primary: '#2dd4bf', secondary: '#0d9488', icon: 'fas fa-moon' }
};

// Vibe type icons - now returns a Leaflet divIcon instead of just a class
export const getVibeIcon = (vibeType: string) => {
  const vibeData = vibeColors[vibeType] || vibeColors.safe;

  return L.divIcon({
    html: `
      <div style="
        background: linear-gradient(135deg, ${vibeData.primary}, ${vibeData.secondary});
        border: 2px solid rgba(255, 255, 255, 0.8);
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2);
        transition: all 0.3s ease;
        animation: vibe-glow 2s ease-in-out infinite alternate;
      ">
        <i class="${vibeData.icon}" style="color: white; font-size: 16px; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));"></i>
      </div>
    `,
    className: 'vibe-marker-custom',
    iconSize: [32, 32],
    iconAnchor: [16, 32]
  });
};

// SOS icon
export const sosIcon = L.divIcon({
  html: `
    <div style="
      background: linear-gradient(135deg, #ef4444, #dc2626);
      border: 3px solid white;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
      animation: sos-pulse 1s ease-in-out infinite alternate;
    ">
      <i class="fas fa-exclamation-triangle" style="color: white; font-size: 16px;"></i>
    </div>
  `,
  className: 'sos-marker',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

// User location icon
export const userLocationIcon = L.divIcon({
  html: `
    <div style="
      position: relative;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        width: 20px;
        height: 20px;
        background: linear-gradient(135deg, #a855f7, #7c3aed);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(168, 85, 247, 0.4), 0 0 0 4px rgba(168, 85, 247, 0.2);
        animation: pulse-user 2s infinite ease-in-out;
      ">
        <div style="
          width: 8px;
          height: 8px;
          background: white;
          border-radius: 50%;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        "></div>
      </div>
      <div style="
        position: absolute;
        bottom: -6px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-top: 8px solid #7c3aed;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
      "></div>
    </div>
  `,
  className: 'user-location-marker',
  iconSize: [24, 24],
  iconAnchor: [12, 30]
});
