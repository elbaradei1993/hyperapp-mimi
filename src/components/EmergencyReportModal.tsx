import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LoadingSpinner } from './shared';
import { VibeType } from '../types';
import { reportsService } from '../services/reports';
import { reverseGeocode, formatCoordinates } from '../lib/geocoding';
import { SupabaseStorageService } from '../services/upload';
import CameraModal from './CameraModal';
import {
  AlertTriangle,
  Flame,
  Ambulance,
  Shield,
  Car,
  Triangle,
  HelpCircle,
  Send,
  Camera,
  X
} from 'lucide-react';
import styles from './EmergencyReportModal.module.css';

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
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>('');
  const [showCamera, setShowCamera] = useState(false);

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
      setSelectedFile(null);
      setMediaPreview('');
      setIsSubmitting(false);
      setLocationLoading(false);

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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setMediaPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeMedia = () => {
    setSelectedFile(null);
    setMediaPreview('');
  };

  const handleCameraCapture = (file: File) => {
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setMediaPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!selectedEmergency || !description.trim()) return;

    // If location is not available but loading, wait for it
    if (!userLocation && locationLoading) {
      // Wait for location to be available (with timeout)
      let attempts = 0;
      while (!userLocation && attempts < 50) { // 5 seconds max
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      if (!userLocation) return; // Still no location after waiting
    }

    if (!userLocation) return;

    setIsSubmitting(true);
    try {
      let mediaUrl = '';
      if (selectedFile) {
        mediaUrl = await SupabaseStorageService.uploadReportMedia(selectedFile, Date.now().toString());
      }

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
        media_url: mediaUrl || undefined,
        emergency: true
      });

      // Show success animation
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onSuccess?.();
        onClose();
      }, 2500);
    } catch (error) {
      console.error('Error creating emergency report:', error);
      // TODO: Show error notification
      setIsSubmitting(false);
    }
  };

  // Don't render anything if modal is not open and not showing success
  if (!isOpen && !showSuccess) return null;

  if (showSuccess) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: window.innerWidth < 480 ? '16px' : '20px'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRadius: window.innerWidth < 480 ? '20px' : '24px',
          width: '100%',
          maxWidth: window.innerWidth < 480 ? '90vw' : '400px',
          padding: window.innerWidth < 480 ? '2rem 1.5rem' : '3rem 2rem',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25), 0 15px 35px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Premium Background Gradient */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(220, 38, 38, 0.06) 50%, rgba(185, 28, 28, 0.04) 100%)',
            pointerEvents: 'none'
          }}></div>

          {/* Premium Inner Shadow */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.3), inset 0 -1px 0 rgba(0, 0, 0, 0.05)',
            pointerEvents: 'none',
            borderRadius: '24px'
          }}></div>

          {/* Emergency Success Icon Animation */}
          <div style={{
            position: 'relative',
            zIndex: 1,
            marginBottom: window.innerWidth < 480 ? '1.5rem' : '2rem'
          }}>
            <div style={{
              width: window.innerWidth < 480 ? '80px' : '100px',
              height: window.innerWidth < 480 ? '80px' : '100px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              boxShadow: '0 20px 40px rgba(239, 68, 68, 0.3), 0 10px 20px rgba(239, 68, 68, 0.2), inset 0 2px 0 rgba(255, 255, 255, 0.2)',
              animation: 'emergencySuccessPulse 2s ease-in-out infinite'
            }}>
              <svg
                width={window.innerWidth < 480 ? "32" : "40"}
                height={window.innerWidth < 480 ? "32" : "40"}
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))'
                }}
              >
                <polyline points="20,6 9,17 4,12" style={{
                  strokeDasharray: '24',
                  strokeDashoffset: '24',
                  animation: 'emergencySuccessCheck 0.8s ease-in-out 0.2s forwards'
                }}></polyline>
              </svg>
            </div>
          </div>

          {/* Success Text */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h3 style={{
              margin: '0 0 0.75rem 0',
              color: '#7f1d1d',
              fontSize: window.innerWidth < 480 ? '1.25rem' : '1.5rem',
              fontWeight: '800',
              background: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-0.025em',
              lineHeight: '1.2'
            }}>
              {t('modals.emergencyReport.successTitle', 'Emergency Report Submitted Successfully!')}
            </h3>
            <p style={{
              color: '#6b7280',
              fontSize: window.innerWidth < 480 ? '0.9rem' : '1rem',
              fontWeight: '500',
              margin: '0',
              lineHeight: '1.5',
              maxWidth: '280px',
              marginLeft: 'auto',
              marginRight: 'auto'
            }}>
              {t('modals.emergencyReport.successMessage', 'Emergency services have been notified. Help is on the way.')}
            </p>
          </div>

          {/* Premium CSS Animations */}
          <style>{`
            @keyframes emergencySuccessPulse {
              0%, 100% {
                transform: scale(1);
                box-shadow: 0 20px 40px rgba(239, 68, 68, 0.3), 0 10px 20px rgba(239, 68, 68, 0.2), inset 0 2px 0 rgba(255, 255, 255, 0.2);
              }
              50% {
                transform: scale(1.05);
                box-shadow: 0 25px 50px rgba(239, 68, 68, 0.4), 0 15px 30px rgba(239, 68, 68, 0.3), inset 0 2px 0 rgba(255, 255, 255, 0.3);
              }
            }

            @keyframes emergencySuccessCheck {
              0% {
                stroke-dashoffset: 24;
                opacity: 0;
              }
              50% {
                opacity: 1;
              }
              100% {
                stroke-dashoffset: 0;
                opacity: 1;
              }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'transparent',
              border: 'none',
              fontSize: '24px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-tertiary)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
            aria-label="Close modal"
          >
            ×
          </button>
          <div className={styles.modalIcon}>
            <AlertTriangle size={32} color="var(--danger)" />
          </div>
          <h2 className={styles.modalTitle}>
            {t('modals.emergencyReport.title')}
          </h2>
          <p className={styles.modalDescription}>
            {t('modals.emergencyReport.description')}
          </p>
        </div>

        <div className={styles.modalContent}>
          {/* Emergency Warning Banner */}
          <div className={styles.emergencyBanner}>
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

          {/* Emergency Type Selection */}
          <div className={styles.formGroup}>
            <h3 className={styles.sectionTitle}>
              {t('emergency.whatType')}
            </h3>
            <div className={styles.emergencyGrid}>
              {emergencyTypes.map((emergency) => {
                const IconComponent = emergency.icon;
                return (
                  <button
                    key={emergency.id}
                    onClick={() => setSelectedEmergency(emergency.id)}
                    className={`${styles.emergencyOption} ${selectedEmergency === emergency.id ? styles.selected : ''}`}
                    style={{
                      '--emergency-color': emergency.color,
                      '--emergency-color-light': `${emergency.color}15`,
                      '--emergency-color-lighter': `${emergency.color}08`,
                      '--emergency-shadow': `${emergency.color}20`
                    } as React.CSSProperties}
                  >
                    <div className={styles.emergencyIcon}>
                      <IconComponent size={32} />
                    </div>
                    <div className={styles.emergencyLabel}>
                      {emergency.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Urgency Level */}
          <div className={styles.formGroup}>
            <h3 className={styles.sectionTitle}>
              {t('emergency.urgencyLevel')}
            </h3>
            <div className={styles.urgencyGrid}>
              {[
                { value: 'low', label: t('emergency.low'), color: 'var(--success)' },
                { value: 'medium', label: t('emergency.medium'), color: 'var(--warning)' },
                { value: 'high', label: t('emergency.high'), color: 'var(--danger)' }
              ].map((level) => (
                <button
                  key={level.value}
                  onClick={() => setUrgency(level.value as 'high' | 'medium' | 'low')}
                  className={`${styles.urgencyOption} ${urgency === level.value ? styles.selected : ''}`}
                  style={{
                    '--urgency-color': level.color,
                    '--urgency-color-light': `${level.color}15`,
                    '--urgency-color-lighter': `${level.color}08`,
                    '--urgency-shadow': `${level.color}20`
                  } as React.CSSProperties}
                >
                  <div className={styles.urgencyLabel}>
                    {level.label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              {t('modals.emergencyReport.location')}
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={t('modals.emergencyReport.selectLocation')}
              className={styles.formInput}
            />
          </div>

          {/* Description */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              {t('emergency.descriptionRequired')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('emergency.descriptionPlaceholder')}
              className={styles.formTextarea}
              maxLength={500}
            />
            <div className={styles.charCounter}>
              <span id="char-count">{description.length}</span>/500 {t('common.characters', 'characters')}
            </div>
          </div>

          {/* Media Upload */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              {t('modals.emergencyReport.addPhotoOptional', 'Add Photo (Optional)')}
            </label>
            {!selectedFile ? (
              <div style={{
                border: '2px dashed #d1d5db',
                borderRadius: '12px',
                padding: '2rem',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onClick={() => setShowCamera(true)}
              >
                <Camera size={48} style={{ color: '#3b82f6', marginBottom: '1rem' }} />
                <p style={{ color: '#6b7280', margin: '0.5rem 0' }}>
                  Take a photo
                </p>
                <p style={{ color: '#9ca3af', fontSize: '14px' }}>
                  Capture real-time evidence
                </p>
              </div>
            ) : (
              <div style={{
                position: 'relative',
                borderRadius: '12px',
                overflow: 'hidden',
                maxWidth: '300px',
                margin: '0 auto'
              }}>
                <img
                  src={mediaPreview}
                  alt="Emergency preview"
                  style={{
                    width: '100%',
                    height: '200px',
                    objectFit: 'cover'
                  }}
                />
                <button
                  onClick={removeMedia}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: 'rgba(0,0,0,0.7)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                  aria-label="Remove photo"
                  title="Remove photo"
                >
                  <X size={16} />
                </button>
              </div>
            )}
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
              className={styles.btnCancel}
            >
              {t('common.cancel')}
            </button>

            {/* Submit Emergency Report Button */}
            <button
              onClick={handleSubmit}
              disabled={!selectedEmergency || !description.trim() || (!userLocation && !locationLoading) || isSubmitting}
              className={styles.btnSubmit}
            >
              {isSubmitting ? (
                <>
                  <div className={styles.loadingSpinner}></div>
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
      </div>

      {/* Camera Modal */}
      <CameraModal
        isOpen={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={handleCameraCapture}
      />
    </div>
  );
};

export default EmergencyReportModal;
