import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Button, LoadingSpinner } from './shared';
import { VibeType } from '../types';
import { reportsService } from '../services/reports';
import { reverseGeocode, formatCoordinates } from '../lib/geocoding';
import {
  AlertTriangle,
  Flame,
  Ambulance,
  Shield,
  Car,
  Triangle,
  HelpCircle,
  MapPin,
  Crosshair,
  Send
} from 'lucide-react';

interface EmergencyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface EmergencyType {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string; style?: React.CSSProperties }>;
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
      icon: Flame,
      color: 'var(--danger)',
      description: t('emergency.fireDesc')
    },
    {
      id: 'medical',
      label: t('emergency.medical'),
      icon: Ambulance,
      color: '#dc2626',
      description: t('emergency.medicalDesc')
    },
    {
      id: 'crime',
      label: t('emergency.crime'),
      icon: Shield,
      color: '#7c2d12',
      description: t('emergency.crimeDesc')
    },
    {
      id: 'accident',
      label: t('emergency.accident'),
      icon: Car,
      color: '#ea580c',
      description: t('emergency.accidentDesc')
    },
    {
      id: 'hazard',
      label: t('emergency.hazard'),
      icon: Triangle,
      color: '#d97706',
      description: t('emergency.hazardDesc')
    },
    {
      id: 'other',
      label: t('emergency.other'),
      icon: HelpCircle,
      color: 'var(--text-muted)',
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
    <Modal isOpen={isOpen} onClose={onClose}>
      <div style={{
        padding: '24px',
        maxWidth: '100%'
      }}>
        {/* Emergency Warning Banner */}
        <div style={{
          padding: '20px',
          border: '2px solid var(--danger)',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(239, 68, 68, 0.08) 100%)',
          marginBottom: '32px',
          boxShadow: '0 8px 24px rgba(239, 68, 68, 0.15)',
          animation: 'pulse 2s infinite'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--danger)',
            fontSize: '18px',
            fontWeight: '700',
            marginBottom: '8px'
          }}>
            <AlertTriangle size={24} style={{ marginRight: '12px' }} />
            {t('emergency.emergencyAlert')}
          </div>
          <p style={{
            textAlign: 'center',
            color: 'var(--danger)',
            fontSize: '14px',
            margin: 0,
            lineHeight: '1.5',
            fontWeight: '500'
          }}>
            {t('emergency.alertVisibleToAll')}
          </p>
        </div>

        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '40px'
        }}>
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.2) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 12px 32px rgba(239, 68, 68, 0.25)',
            border: '3px solid var(--danger)'
          }}>
            <AlertTriangle size={32} color="var(--danger)" />
          </div>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '800',
            color: 'var(--text-primary)',
            margin: '0 0 12px 0',
            letterSpacing: '-0.025em'
          }}>
            {t('modals.emergencyReport.title')}
          </h1>
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '16px',
            margin: 0,
            lineHeight: '1.6',
            maxWidth: '400px',
            marginLeft: 'auto',
            marginRight: 'auto'
          }}>
            {t('emergency.getHelpQuickly')}
          </p>
        </div>

      {/* Emergency Type Selection */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '700',
          color: 'var(--text-primary)',
          marginBottom: '16px',
          textAlign: 'center'
        }}>
          {t('emergency.whatType')}
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '12px'
        }}>
          {emergencyTypes.map((emergency) => {
            const IconComponent = emergency.icon;
            return (
              <button
                key={emergency.id}
                onClick={() => setSelectedEmergency(emergency.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '20px 16px',
                  border: `2px solid ${selectedEmergency === emergency.id ? emergency.color : 'var(--border-color)'}`,
                  borderRadius: '12px',
                  backgroundColor: selectedEmergency === emergency.id ? `${emergency.color}15` : 'var(--bg-primary)',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  textAlign: 'center',
                  minHeight: '100px',
                  boxShadow: selectedEmergency === emergency.id
                    ? `0 8px 24px ${emergency.color}25`
                    : '0 2px 8px var(--shadow-color)',
                  transform: selectedEmergency === emergency.id ? 'translateY(-2px)' : 'translateY(0)'
                }}
                onMouseEnter={(e) => {
                  if (selectedEmergency !== emergency.id) {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px var(--shadow-color)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedEmergency !== emergency.id) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px var(--shadow-color)';
                  }
                }}
              >
                <IconComponent
                  size={28}
                  color={emergency.color}
                  style={{ marginBottom: '12px' }}
                />
                <span style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'var(--text-primary)',
                  lineHeight: '1.3'
                }}>
                  {emergency.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Urgency Level */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '700',
          color: 'var(--text-primary)',
          marginBottom: '16px',
          textAlign: 'center'
        }}>
          {t('emergency.urgencyLevel')}
        </h3>
        <div style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          {[
            { value: 'low', label: t('emergency.low'), color: 'var(--success)', bgColor: 'rgba(34, 197, 94, 0.1)' },
            { value: 'medium', label: t('emergency.medium'), color: 'var(--warning)', bgColor: 'rgba(245, 158, 11, 0.1)' },
            { value: 'high', label: t('emergency.high'), color: 'var(--danger)', bgColor: 'rgba(239, 68, 68, 0.1)' }
          ].map((level) => (
            <button
              key={level.value}
              onClick={() => setUrgency(level.value as 'high' | 'medium' | 'low')}
              style={{
                flex: '1 1 120px',
                minWidth: '100px',
                padding: '16px 20px',
                border: `2px solid ${urgency === level.value ? level.color : 'var(--border-color)'}`,
                borderRadius: '12px',
                backgroundColor: urgency === level.value ? level.bgColor : 'var(--bg-primary)',
                color: urgency === level.value ? level.color : 'var(--text-secondary)',
                fontWeight: '700',
                fontSize: '16px',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: urgency === level.value
                  ? `0 6px 20px ${level.color}30`
                  : '0 2px 8px var(--shadow-color)',
                transform: urgency === level.value ? 'translateY(-2px)' : 'translateY(0)'
              }}
              onMouseEnter={(e) => {
                if (urgency !== level.value) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px var(--shadow-color)';
                }
              }}
              onMouseLeave={(e) => {
                if (urgency !== level.value) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px var(--shadow-color)';
                }
              }}
            >
              {level.label}
            </button>
          ))}
        </div>
      </div>

      {/* Location */}
      <div style={{ marginBottom: '32px' }}>
        <label style={{
          display: 'block',
          fontSize: '16px',
          fontWeight: '600',
          color: 'var(--text-primary)',
          marginBottom: '12px'
        }}>
          <MapPin size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
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
              padding: '16px 50px 16px 16px',
              border: '2px solid var(--border-color)',
              borderRadius: '12px',
              fontSize: '16px',
              outline: 'none',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              fontFamily: 'inherit'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--accent-primary)';
              e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--border-color)';
              e.target.style.boxShadow = 'none';
            }}
          />
          <button
            onClick={getCurrentLocation}
            disabled={locationLoading}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'var(--accent-primary)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: locationLoading ? 'not-allowed' : 'pointer',
              padding: '8px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              opacity: locationLoading ? 0.6 : 1
            }}
            title={t('reports.useCurrentLocation')}
            onMouseEnter={(e) => {
              if (!locationLoading) {
                e.currentTarget.style.background = 'var(--accent-secondary)';
                e.currentTarget.style.transform = 'translateY(-50%) scale(1.05)';
              }
            }}
            onMouseLeave={(e) => {
              if (!locationLoading) {
                e.currentTarget.style.background = 'var(--accent-primary)';
                e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
              }
            }}
          >
            {locationLoading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <Crosshair size={16} />
            )}
          </button>
        </div>
      </div>

      {/* Description */}
      <div style={{ marginBottom: '40px' }}>
        <label style={{
          display: 'block',
          fontSize: '16px',
          fontWeight: '600',
          color: 'var(--text-primary)',
          marginBottom: '12px'
        }}>
          {t('emergency.descriptionRequired')}
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('emergency.descriptionPlaceholder')}
          rows={5}
          style={{
            width: '100%',
            padding: '16px',
            border: '2px solid var(--border-color)',
            borderRadius: '12px',
            fontSize: '16px',
            outline: 'none',
            resize: 'vertical',
            fontFamily: 'inherit',
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            lineHeight: '1.5'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'var(--accent-primary)';
            e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'var(--border-color)';
            e.target.style.boxShadow = 'none';
          }}
          required
        />
      </div>

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: '16px',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        {/* Cancel Button */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          style={{
            flex: '1 1 auto',
            minWidth: '120px',
            padding: '16px 24px',
            border: '2px solid var(--border-color)',
            borderRadius: '12px',
            background: 'var(--bg-primary)',
            color: 'var(--text-secondary)',
            fontSize: '16px',
            fontWeight: '600',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 2px 8px var(--shadow-color)',
            opacity: isSubmitting ? 0.6 : 1
          }}
          onMouseEnter={(e) => {
            if (!isSubmitting) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px var(--shadow-color)';
              e.currentTarget.style.borderColor = 'var(--text-muted)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isSubmitting) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px var(--shadow-color)';
              e.currentTarget.style.borderColor = 'var(--border-color)';
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
            flex: '2 1 auto',
            minWidth: '180px',
            padding: '16px 32px',
            border: 'none',
            borderRadius: '12px',
            background: (!selectedEmergency || !description.trim() || !userLocation || isSubmitting)
              ? 'var(--text-muted)'
              : 'linear-gradient(135deg, var(--danger) 0%, #dc2626 100%)',
            color: 'white',
            fontSize: '18px',
            fontWeight: '700',
            cursor: (!selectedEmergency || !description.trim() || !userLocation || isSubmitting) ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: (!selectedEmergency || !description.trim() || !userLocation || isSubmitting)
              ? '0 2px 8px var(--shadow-color)'
              : '0 8px 24px rgba(239, 68, 68, 0.4), 0 4px 12px rgba(239, 68, 68, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            if (selectedEmergency && description.trim() && userLocation && !isSubmitting) {
              e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(239, 68, 68, 0.5), 0 6px 16px rgba(239, 68, 68, 0.3)';
            }
          }}
          onMouseLeave={(e) => {
            if (selectedEmergency && description.trim() && userLocation && !isSubmitting) {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(239, 68, 68, 0.4), 0 4px 12px rgba(239, 68, 68, 0.2)';
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
              <Send size={20} />
              {t('modals.emergencyReport.submitReport')}
            </>
          )}
        </button>
      </div>
      </div>
    </Modal>
  );
};

export default EmergencyReportModal;
