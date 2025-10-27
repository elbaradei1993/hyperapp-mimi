import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface LocationOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSet: (location: [number, number]) => void;
  currentLocation?: [number, number] | null;
}

const LocationOverrideModal: React.FC<LocationOverrideModalProps> = ({
  isOpen,
  onClose,
  onLocationSet,
  currentLocation
}) => {
  const { t } = useTranslation();
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');

  const commonLocations = [
    { name: 'Cairo, Egypt', lat: 30.0444, lng: 31.2357 },
    { name: 'Alexandria, Egypt', lat: 31.2001, lng: 29.9187 },
    { name: 'Giza, Egypt', lat: 30.0131, lng: 31.2089 },
    { name: 'Luxor, Egypt', lat: 25.6872, lng: 32.6396 },
    { name: 'Aswan, Egypt', lat: 24.0889, lng: 32.8998 },
    { name: 'Sharm El Sheikh, Egypt', lat: 27.9158, lng: 34.3299 },
    { name: 'Hurghada, Egypt', lat: 27.2579, lng: 33.8116 }
  ];

  const handleManualSubmit = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      alert('Please enter valid latitude (-90 to 90) and longitude (-180 to 180) coordinates.');
      return;
    }

    onLocationSet([lat, lng]);
    onClose();
  };

  const handleLocationSelect = (location: { lat: number; lng: number }) => {
    onLocationSet([location.lat, location.lng]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '500px',
        width: '100%',
        maxHeight: '80vh',
        overflow: 'auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{
            color: '#1f2937',
            fontSize: '20px',
            fontWeight: '700',
            margin: 0
          }}>
            Set Your Location
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '0'
            }}
          >
            ×
          </button>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <p style={{
            color: '#6b7280',
            fontSize: '14px',
            margin: '0 0 16px 0'
          }}>
            GPS location is unavailable. Choose your location from the options below or enter coordinates manually.
          </p>

          {currentLocation && (
            <div style={{
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px'
            }}>
              <div style={{
                color: '#0369a1',
                fontSize: '14px',
                fontWeight: '600',
                marginBottom: '4px'
              }}>
                Current Location (IP-based)
              </div>
              <div style={{
                color: '#0369a1',
                fontSize: '12px'
              }}>
                {currentLocation[0].toFixed(4)}, {currentLocation[1].toFixed(4)}
              </div>
            </div>
          )}
        </div>

        {/* Common Locations */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{
            color: '#1f2937',
            fontSize: '16px',
            fontWeight: '600',
            margin: '0 0 12px 0'
          }}>
            Popular Locations
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '8px'
          }}>
            {commonLocations.map((location, index) => (
              <button
                key={index}
                onClick={() => handleLocationSelect(location)}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f0f9ff';
                  e.currentTarget.style.borderColor = '#3b82f6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.borderColor = '#e5e7eb';
                }}
              >
                <div style={{
                  color: '#1f2937',
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '2px'
                }}>
                  {location.name}
                </div>
                <div style={{
                  color: '#6b7280',
                  fontSize: '12px'
                }}>
                  {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Manual Coordinates */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{
            color: '#1f2937',
            fontSize: '16px',
            fontWeight: '600',
            margin: '0 0 12px 0'
          }}>
            Enter Coordinates Manually
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            marginBottom: '12px'
          }}>
            <div>
              <label style={{
                display: 'block',
                color: '#374151',
                fontSize: '12px',
                fontWeight: '500',
                marginBottom: '4px'
              }}>
                Latitude (-90 to 90)
              </label>
              <input
                type="number"
                step="0.0001"
                min="-90"
                max="90"
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
                placeholder="30.0444"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>
            <div>
              <label style={{
                display: 'block',
                color: '#374151',
                fontSize: '12px',
                fontWeight: '500',
                marginBottom: '4px'
              }}>
                Longitude (-180 to 180)
              </label>
              <input
                type="number"
                step="0.0001"
                min="-180"
                max="180"
                value={manualLng}
                onChange={(e) => setManualLng(e.target.value)}
                placeholder="31.2357"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>
          <button
            onClick={handleManualSubmit}
            disabled={!manualLat || !manualLng}
            style={{
              background: (!manualLat || !manualLng) ? '#d1d5db' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: (!manualLat || !manualLng) ? 'not-allowed' : 'pointer',
              width: '100%'
            }}
          >
            Set Custom Location
          </button>
        </div>

        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            style={{
              background: '#f3f4f6',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              padding: '8px 16px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationOverrideModal;
