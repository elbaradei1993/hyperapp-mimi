import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Button, LoadingSpinner } from './shared';
import { VibeType } from '../types';
import { reportsService } from '../services/reports';
import { reverseGeocode, formatCoordinates } from '../lib/geocoding';

interface EmergencyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface EmergencyType {
  id: string;
  label: string;
  icon: string;
  color: string;
  description: string;
}

const EmergencyReportModal: React.FC<EmergencyReportModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { t } = useTranslation();
  const [selectedEmergency, setSelectedEmergency] = useState<string | null>(null);
  const [urgency, setUrgency] = useState<'high' | 'medium' | 'low'>('medium');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  const emergencyTypes: EmergencyType[] = [
    {
      id: 'fire',
      label: t('emergency.fire'),
      icon: 'fas fa-fire',
      color: '#ef4444',
      description: t('emergency.fireDesc')
    },
    {
      id: 'medical',
      label: t('emergency.medical'),
      icon: 'fas fa-ambulance',
      color: '#dc2626',
      description: t('emergency.medicalDesc')
    },
    {
      id: 'crime',
      label: t('emergency.crime'),
      icon: 'fas fa-shield-alt',
      color: '#7c2d12',
      description: t('emergency.crimeDesc')
    },
    {
      id: 'accident',
      label: t('emergency.accident'),
      icon: 'fas fa-car-crash',
      color: '#ea580c',
      description: t('emergency.accidentDesc')
    },
    {
      id: 'hazard',
      label: t('emergency.hazard'),
      icon: 'fas fa-exclamation-triangle',
      color: '#d97706',
      description: t('emergency.hazardDesc')
    },
    {
      id: 'other',
      label: t('emergency.other'),
      icon: 'fas fa-question-circle',
      color: '#6b7280',
      description: t('emergency.otherDesc')
    }
  ];

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setSelectedEmergency(null);
      setUrgency('medium');
      setDescription('');
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
    if (!selectedEmergency || !userLocation) return;

    setIsSubmitting(true);
    try {
      const selectedType = emergencyTypes.find(type => type.id === selectedEmergency);
      const emergencyNotes = [
        `EMERGENCY: ${selectedType?.label}`,
        `Urgency: ${urgency.toUpperCase()}`,
        description.trim()
      ].filter(Boolean).join(' | ');

      await reportsService.createReport({
        vibe_type: VibeType.Dangerous, // Use dangerous as the vibe type for emergencies
        latitude: userLocation[0],
        longitude: userLocation[1],
        notes: emergencyNotes,
        location: location.trim() || undefined,
        emergency: true
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error creating emergency report:', error);
      // TODO: Show error notification
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('modals.emergencyReport.title')}>
      <div style={{ padding: '20px 0' }}>
        {/* Emergency Warning Banner */}
        <div style={{
          padding: '20px',
          border: '2px solid #fee2e2',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #fef2f2 0%, #fef2f2 100%)',
          marginBottom: '24px',
          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.1)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#dc2626',
            fontSize: '16px',
            fontWeight: '700'
          }}>
            <i className="fas fa-exclamation-triangle" style={{
              marginRight: '12px',
              fontSize: '20px'
            }}></i>
            {t('emergency.emergencyAlert')}
          </div>
          <p style={{
            textAlign: 'center',
            color: '#dc2626',
            fontSize: '14px',
            margin: '8px 0 0 0',
            lineHeight: '1.4'
          }}>
            {t('emergency.alertVisibleToAll')}
          </p>
        </div>

        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '32px'
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 6px 16px rgba(239, 68, 68, 0.2)'
          }}>
            <i className="fas fa-exclamation-triangle" style={{
              fontSize: '24px',
              color: '#ef4444'
            }}></i>
          </div>
          <h2 style={{
            fontSize: '22px',
            fontWeight: '700',
            color: '#1f2937',
            margin: '0 0 8px 0'
          }}>
            {t('modals.emergencyReport.title')}
          </h2>
          <p style={{
            color: '#6b7280',
            fontSize: '15px',
            margin: 0,
            lineHeight: '1.5'
          }}>
            {t('modals.emergencyReport.description')}
          </p>
        </div>
      </div>

      {/* Emergency Type Selection */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: '600',
          color: '#1f2937',
          marginBottom: '12px'
        }}>
          {t('modals.emergencyReport.emergencyType')}
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '12px'
        }}>
          {emergencyTypes.map((emergency) => (
            <button
              key={emergency.id}
              onClick={() => setSelectedEmergency(emergency.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '16px 12px',
                border: `2px solid ${selectedEmergency === emergency.id ? emergency.color : '#e5e7eb'}`,
                borderRadius: '8px',
                backgroundColor: selectedEmergency === emergency.id ? `${emergency.color}10` : 'white',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'center'
              }}
            >
              <i className={emergency.icon} style={{
                fontSize: '24px',
                color: emergency.color,
                marginBottom: '8px'
              }}></i>
              <span style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#1f2937'
              }}>
                {emergency.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Urgency Level */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: '600',
          color: '#1f2937',
          marginBottom: '12px'
        }}>
          {t('emergency.urgencyLevel')}
        </h3>
        <div style={{
          display: 'flex',
          gap: '8px'
        }}>
          {[
            { value: 'low', label: t('emergency.low'), color: '#22c55e' },
            { value: 'medium', label: t('emergency.medium'), color: '#f59e0b' },
            { value: 'high', label: t('emergency.high'), color: '#ef4444' }
          ].map((level) => (
            <button
              key={level.value}
              onClick={() => setUrgency(level.value as 'high' | 'medium' | 'low')}
              style={{
                flex: 1,
                padding: '12px 16px',
                border: `2px solid ${urgency === level.value ? level.color : '#e5e7eb'}`,
                borderRadius: '6px',
                backgroundColor: urgency === level.value ? `${level.color}10` : 'white',
                color: urgency === level.value ? level.color : '#6b7280',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {level.label}
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
            {t('modals.emergencyReport.location')}
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={t('modals.emergencyReport.selectLocation')}
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

      {/* Description */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '500',
          color: '#374151',
          marginBottom: '6px'
        }}>
          {t('modals.emergencyReport.descriptionLabel')}
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('modals.emergencyReport.descriptionPlaceholder')}
          rows={4}
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
          required
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

        {/* Report Emergency Button */}
        <button
          onClick={handleSubmit}
          disabled={!selectedEmergency || !description.trim() || !userLocation || isSubmitting}
          style={{
            padding: '14px 28px',
            border: 'none',
            borderRadius: '12px',
            background: (!selectedEmergency || !description.trim() || !userLocation || isSubmitting)
              ? 'linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)'
              : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            color: 'white',
            fontSize: '16px',
            fontWeight: '700',
            cursor: (!selectedEmergency || !description.trim() || !userLocation || isSubmitting) ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: (!selectedEmergency || !description.trim() || !userLocation || isSubmitting)
              ? '0 2px 8px rgba(0, 0, 0, 0.04)'
              : '0 6px 20px rgba(239, 68, 68, 0.3), 0 2px 8px rgba(239, 68, 68, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            if (selectedEmergency && description.trim() && userLocation && !isSubmitting) {
              e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(239, 68, 68, 0.4), 0 4px 12px rgba(239, 68, 68, 0.2)';
            }
          }}
          onMouseLeave={(e) => {
            if (selectedEmergency && description.trim() && userLocation && !isSubmitting) {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.3), 0 2px 8px rgba(239, 68, 68, 0.1)';
            }
          }}
          onMouseDown={(e) => {
            if (selectedEmergency && description.trim() && userLocation && !isSubmitting) {
              e.currentTarget.style.transform = 'translateY(-1px) scale(0.98)';
            }
          }}
          onMouseUp={(e) => {
            if (selectedEmergency && description.trim() && userLocation && !isSubmitting) {
              e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
            }
          }}
        >
          {isSubmitting ? (
            <>
              <LoadingSpinner size="sm" />
              {t('modals.emergencyReport.submitting')}
            </>
          ) : (
            <>
              <i className="fas fa-exclamation-triangle" style={{ fontSize: '16px' }}></i>
              {t('modals.emergencyReport.submitReport')}
            </>
          )}
        </button>
      </div>
    </Modal>
  );
};

export default EmergencyReportModal;
