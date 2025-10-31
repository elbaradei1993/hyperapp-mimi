import L from 'leaflet';

// Vibe type icons
export const getVibeIcon = (vibeType: string) => {
  const iconMap: Record<string, string> = {
    safe: 'fas fa-shield-alt',
    calm: 'fas fa-peace',
    lively: 'fas fa-glass-cheers',
    crowded: 'fas fa-users',
    suspicious: 'fas fa-eye-slash',
    dangerous: 'fas fa-exclamation-triangle',
    noisy: 'fas fa-volume-up',
    quiet: 'fas fa-moon'
  };

  return iconMap[vibeType] || 'fas fa-question-circle';
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
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      border: 3px solid white;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 8px rgba(0,0,0,0.4);
      animation: pulse-user 2s infinite ease-in-out;
    ">
      <i class="fas fa-user" style="color: white; font-size: 16px;"></i>
    </div>
  `,
  className: 'user-location-marker',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});
