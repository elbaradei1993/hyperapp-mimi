import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Button, LoadingSpinner } from './shared';
import { VibeType } from '../types';
import { reportsService } from '../services/reports';
import { reverseGeocode, formatCoordinates } from '../lib/geocoding';

interface VibeReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface VibeOption {
  type: VibeType;
  label: string;
  icon: string;
  color: string;
  description: string;
}

const VibeReportModal: React.FC<VibeReportModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { t } = useTranslation();
  const [selectedVibe, setSelectedVibe] = useState<VibeType | null>(null);
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState('');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  const vibeOptions: VibeOption[] = [
    {
      type: VibeType.Safe,
      label: t('vibes.safe'),
      icon: 'fas fa-shield-alt',
      color: '#22c55e',
      description: t('vibes.safeDesc')
    },
    {
      type: VibeType.Calm,
      label: t('vibes.calm'),
      icon: 'fas fa-peace',
      color: '#3b82f6',
      description: t('vibes.calmDesc')
    },
    {
      type: VibeType.Lively,
      label: t('vibes.lively'),
      icon: 'fas fa-music',
      color: '#eab308',
      description: t('vibes.livelyDesc')
    },
    {
      type: VibeType.Festive,
      label: t('vibes.festive'),
      icon: 'fas fa-glass-cheers',
      color: '#f59e0b',
      description: t('vibes.festiveDesc')
    },
    {
      type: VibeType.Crowded,
      label: t('vibes.crowded'),
      icon: 'fas fa-users',
      color: '#f97316',
      description: t('vibes.crowdedDesc')
    },
    {
      type: VibeType.Suspicious,
      label: t('vibes.suspicious'),
      icon: 'fas fa-eye-slash',
      color: '#a855f7',
      description: t('vibes.suspiciousDesc')
    },
    {
      type: VibeType.Dangerous,
      label: t('vibes.dangerous'),
      icon: 'fas fa-exclamation-triangle',
      color: '#ef4444',
      description: t('vibes.dangerousDesc')
    },
    {
      type: VibeType.Noisy,
      label: t('vibes.noisy'),
      icon: 'fas fa-volume-up',
      color: '#06b6d4',
      description: t('vibes.noisyDesc')
    },
    {
      type: VibeType.Quiet,
      label: t('vibes.quiet'),
      icon: 'fas fa-volume-off',
      color: '#2dd4bf',
      description: t('vibes.quietDesc')
    }
  ];

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setSelectedVibe(null);
      setNotes('');
      setLocation('');
      setUserLocation(null);

      // Get user's current location
      getCurrentLocation();
    }
  }, [isOpen]);

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);

          try {
            // Try to get a readable address
            const address = await reverseGeocode(latitude, longitude);
            setLocation(address);
          } catch (error) {
            // Fallback to user-friendly message if geocoding fails
            console.warn('Geocoding failed, using address not available message');
            setLocation(t('reports.addressNotAvailable'));
          }

          setLocationLoading(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          setLocationLoading(false);
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    } else {
      setLocationLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedVibe || !userLocation) return;

    setIsSubmitting(true);
    try {
      await reportsService.createReport({
        vibe_type: selectedVibe,
        latitude: userLocation[0],
        longitude: userLocation[1],
        notes: notes.trim() || undefined,
        location: location.trim() || undefined,
        emergency: false
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error creating vibe report:', error);
      // TODO: Show error notification
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('modals.vibeReport.title')}>
      <div style={{ padding: '20px 0' }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '32px'
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 6px 16px rgba(59, 130, 246, 0.2)'
          }}>
            <i className="fas fa-smile" style={{
              fontSize: '24px',
              color: '#3b82f6'
            }}></i>
          </div>
          <h2 style={{
            fontSize: '22px',
            fontWeight: '700',
            color: '#1f2937',
            margin: '0 0 8px 0'
          }}>
            {t('modals.vibeReport.title')}
          </h2>
          <p style={{
            color: '#6b7280',
            fontSize: '15px',
            margin: 0,
            lineHeight: '1.5'
          }}>
            {t('modals.vibeReport.description')}
          </p>
        </div>

        {/* Vibe Type Selection */}
        <div style={{ marginBottom: '28px' }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#1f2937',
            marginBottom: '16px',
            textAlign: 'center'
          }}>
            {t('modals.vibeReport.vibeType')}
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '16px'
          }}>
            {vibeOptions.map((vibe) => (
              <button
                key={vibe.type}
                onClick={() => setSelectedVibe(vibe.type)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '20px 16px',
                  border: `2px solid ${selectedVibe === vibe.type ? vibe.color : '#e5e7eb'}`,
                  borderRadius: '12px',
                  background: selectedVibe === vibe.type
                    ? `linear-gradient(135deg, ${vibe.color}08 0%, ${vibe.color}15 100%)`
                    : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  textAlign: 'center',
                  boxShadow: selectedVibe === vibe.type
                    ? `0 6px 20px ${vibe.color}20`
                    : '0 2px 8px rgba(0, 0, 0, 0.04)',
                  transform: selectedVibe === vibe.type ? 'scale(1.02)' : 'scale(1)'
                }}
                onMouseEnter={(e) => {
                  if (selectedVibe !== vibe.type) {
                    e.currentTarget.style.transform = 'scale(1.02)';
                    e.currentTarget.style.boxShadow = `0 4px 16px ${vibe.color}15`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedVibe !== vibe.type) {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
                  }
                }}
              >
                <i className={vibe.icon} style={{
                  fontSize: '28px',
                  color: vibe.color,
                  marginBottom: '10px'
                }}></i>
                <span style={{
                  fontSize: '15px',
                  fontWeight: '700',
                  color: '#1f2937',
                  marginBottom: '6px'
                }}>
                  {vibe.label}
                </span>
                <span style={{
                  fontSize: '13px',
                  color: '#6b7280',
                  lineHeight: '1.3'
                }}>
                  {vibe.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Location */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '6px'
          }}>
            {t('modals.vibeReport.location')}
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={t('modals.vibeReport.selectLocation')}
              style={{
                width: '100%',
                padding: '10px 40px 10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none'
              }}
            />
            <button
              onClick={getCurrentLocation}
              disabled={locationLoading}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: locationLoading ? '#9ca3af' : '#3b82f6',
                cursor: locationLoading ? 'not-allowed' : 'pointer',
                padding: '4px'
              }}
              title={t('reports.useCurrentLocation')}
            >
              {locationLoading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <i className="fas fa-crosshairs"></i>
              )}
            </button>
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '6px'
          }}>
            {t('modals.vibeReport.details')}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('modals.vibeReport.detailsPlaceholder')}
            rows={3}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              outline: 'none',
              resize: 'vertical',
              fontFamily: 'inherit'
            }}
          />
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '16px',
          justifyContent: 'flex-end',
          marginTop: '32px'
        }}>
          {/* Cancel Button */}
          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              padding: '14px 24px',
              border: '2px solid #e5e7eb',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              color: '#6b7280',
              fontSize: '16px',
              fontWeight: '600',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
              opacity: isSubmitting ? 0.6 : 1
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.08)';
                e.currentTarget.style.borderColor = '#d1d5db';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
                e.currentTarget.style.borderColor = '#e5e7eb';
              }
            }}
            onMouseDown={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
            onMouseUp={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.transform = 'translateY(-2px)';
              }
            }}
          >
            {t('common.cancel')}
          </button>

          {/* Report Vibe Button */}
          <button
            onClick={handleSubmit}
            disabled={!selectedVibe || !userLocation || isSubmitting}
            style={{
              padding: '14px 28px',
              border: 'none',
              borderRadius: '12px',
              background: (!selectedVibe || !userLocation || isSubmitting)
                ? 'linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)'
                : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              color: 'white',
              fontSize: '16px',
              fontWeight: '700',
              cursor: (!selectedVibe || !userLocation || isSubmitting) ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: (!selectedVibe || !userLocation || isSubmitting)
                ? '0 2px 8px rgba(0, 0, 0, 0.04)'
                : '0 6px 20px rgba(59, 130, 246, 0.3), 0 2px 8px rgba(59, 130, 246, 0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              if (selectedVibe && userLocation && !isSubmitting) {
                e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
                e.currentTarget.style.boxShadow = '0 12px 32px rgba(59, 130, 246, 0.4), 0 4px 12px rgba(59, 130, 246, 0.2)';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedVibe && userLocation && !isSubmitting) {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.3), 0 2px 8px rgba(59, 130, 246, 0.1)';
              }
            }}
            onMouseDown={(e) => {
              if (selectedVibe && userLocation && !isSubmitting) {
                e.currentTarget.style.transform = 'translateY(-1px) scale(0.98)';
              }
            }}
            onMouseUp={(e) => {
              if (selectedVibe && userLocation && !isSubmitting) {
                e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
              }
            }}
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner size="sm" />
                {t('modals.vibeReport.submitting')}
              </>
            ) : (
              <>
                <i className="fas fa-paper-plane" style={{ fontSize: '16px' }}></i>
                {t('modals.vibeReport.submitReport')}
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default VibeReportModal;
