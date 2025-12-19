import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Button, LoadingSpinner } from './shared';
import { VibeType } from '../types';
import { reportsService } from '../services/reports';
import { reverseGeocode, formatCoordinates } from '../lib/geocoding';
import { VIBE_CONFIG } from '../constants/vibes';
import { SupabaseStorageService } from '../services/upload';
import CameraModal from './CameraModal';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import {
  ShieldCheck,
  CloudSnow,
  Music,
  PartyPopper,
  Users,
  EyeOff,
  AlertTriangle,
  Volume2,
  VolumeX,
  Camera,
  X
} from 'lucide-react';
import styles from './VibeReportModal.module.css';

interface VibeReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  currentLocation?: [number, number] | null;
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
  onSuccess,
  currentLocation
}) => {
  const { t } = useTranslation();
  const [selectedVibe, setSelectedVibe] = useState<VibeType | null>(null);
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState('');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>('');
  const [showCamera, setShowCamera] = useState(false);
  const [deviceCapabilities, setDeviceCapabilities] = useState({
    supports3D: true,
    isLowEndDevice: false,
    prefersReducedMotion: false
  });

  const vibeOptions: VibeOption[] = [
    {
      type: VibeType.Safe,
      label: t('vibes.safe'),
      icon: 'shield-check',
      color: '#10b981',
      description: t('vibes.safeDesc')
    },
    {
      type: VibeType.Calm,
      label: t('vibes.calm'),
      icon: 'cloud-snow',
      color: '#3b82f6',
      description: t('vibes.calmDesc')
    },
    {
      type: VibeType.Lively,
      label: t('vibes.lively'),
      icon: 'music',
      color: '#eab308',
      description: t('vibes.livelyDesc')
    },
    {
      type: VibeType.Festive,
      label: t('vibes.festive'),
      icon: 'party-popper',
      color: '#f59e0b',
      description: t('vibes.festiveDesc')
    },
    {
      type: VibeType.Crowded,
      label: t('vibes.crowded'),
      icon: 'users',
      color: '#f97316',
      description: t('vibes.crowdedDesc')
    },
    {
      type: VibeType.Suspicious,
      label: t('vibes.suspicious'),
      icon: 'eye-off',
      color: '#a855f7',
      description: t('vibes.suspiciousDesc')
    },
    {
      type: VibeType.Dangerous,
      label: t('vibes.dangerous'),
      icon: 'alert-triangle',
      color: '#ef4444',
      description: t('vibes.dangerousDesc')
    },
    {
      type: VibeType.Noisy,
      label: t('vibes.noisy'),
      icon: 'volume-2',
      color: '#06b6d4',
      description: t('vibes.noisyDesc')
    },
    {
      type: VibeType.Quiet,
      label: t('vibes.quiet'),
      icon: 'volume-x',
      color: '#2dd4bf',
      description: t('vibes.quietDesc')
    }
  ];

  // Detect device capabilities for 3D effects
  useEffect(() => {
    const detectCapabilities = () => {
      // Check for 3D transform support
      const testEl = document.createElement('div');
      const supports3D = 'WebkitPerspective' in testEl.style ||
                        'MozPerspective' in testEl.style ||
                        'perspective' in testEl.style;

      // Check for reduced motion preference
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Check for low-end device indicators
      const isLowEndDevice = navigator.hardwareConcurrency ? navigator.hardwareConcurrency <= 2 : false;

      setDeviceCapabilities({
        supports3D,
        isLowEndDevice,
        prefersReducedMotion
      });
    };

    detectCapabilities();
  }, []);

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
            setLocation(t('reports.addressNotAvailable', 'Address not available'));
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

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setSelectedVibe(null);
      setNotes('');
      setLocation('');
      setUserLocation(null);
      setSelectedFile(null);
      setMediaPreview('');
      setIsSubmitting(false);
      setLocationLoading(false);

      // Use current location from props as initial fallback
      if (currentLocation) {
        setUserLocation(currentLocation);
        reverseGeocode(currentLocation[0], currentLocation[1])
          .then(address => setLocation(address))
          .catch(() => setLocation(t('reports.addressNotAvailable', 'Address not available')));
      } else {
        // Get user's current location if no location prop provided
        getCurrentLocation();
      }
    }
  }, [isOpen, currentLocation, t]);

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

  const getAnimationClass = (vibeType: VibeType) => {
    switch (vibeType) {
      case VibeType.Safe:
        return styles.safeIcon;
      case VibeType.Calm:
        return styles.calmIcon;
      case VibeType.Lively:
        return styles.livelyIcon;
      case VibeType.Festive:
        return styles.festiveIcon;
      case VibeType.Crowded:
        return styles.crowdedIcon;
      case VibeType.Suspicious:
        return styles.suspiciousIcon;
      case VibeType.Dangerous:
        return styles.dangerousIcon;
      case VibeType.Noisy:
        return styles.noisyIcon;
      case VibeType.Quiet:
        return styles.quietIcon;
      default:
        return '';
    }
  };

  const handleSubmit = async () => {
    if (!selectedVibe) return;

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

      await reportsService.createReport({
        vibe_type: selectedVibe,
        latitude: userLocation[0],
        longitude: userLocation[1],
        notes: notes.trim() || undefined,
        location: location.trim() || undefined,
        media_url: mediaUrl || undefined,
        emergency: false
      });

      // Show success animation
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onSuccess?.();
        onClose();
      }, 2500);
    } catch (error) {
      console.error('Error creating vibe report:', error);
      setIsSubmitting(false);
    }
  };

  // Don't render anything if modal is not open
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
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(34, 197, 94, 0.06) 50%, rgba(16, 185, 129, 0.04) 100%)',
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

          {/* Success Checkmark Animation */}
          <div style={{
            position: 'relative',
            zIndex: 1,
            marginBottom: window.innerWidth < 480 ? '1.5rem' : '2rem'
          }}>
            <div style={{
              width: window.innerWidth < 480 ? '80px' : '100px',
              height: window.innerWidth < 480 ? '80px' : '100px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              boxShadow: '0 20px 40px rgba(16, 185, 129, 0.3), 0 10px 20px rgba(16, 185, 129, 0.2), inset 0 2px 0 rgba(255, 255, 255, 0.2)',
              animation: 'successPulse 2s ease-in-out infinite'
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
                  animation: 'successCheck 0.8s ease-in-out 0.2s forwards'
                }}></polyline>
              </svg>
            </div>
          </div>

          {/* Success Text */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h3 style={{
              margin: '0 0 0.75rem 0',
              color: '#065f46',
              fontSize: window.innerWidth < 480 ? '1.25rem' : '1.5rem',
              fontWeight: '800',
              background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-0.025em',
              lineHeight: '1.2'
            }}>
              Report Submitted Successfully!
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
              Thank you for helping the community stay informed.
            </p>
          </div>

          {/* Premium CSS Animations */}
          <style>{`
            @keyframes successPulse {
              0%, 100% {
                transform: scale(1);
                box-shadow: 0 20px 40px rgba(16, 185, 129, 0.3), 0 10px 20px rgba(16, 185, 129, 0.2), inset 0 2px 0 rgba(255, 255, 255, 0.2);
              }
              50% {
                transform: scale(1.05);
                box-shadow: 0 25px 50px rgba(16, 185, 129, 0.4), 0 15px 30px rgba(16, 185, 129, 0.3), inset 0 2px 0 rgba(255, 255, 255, 0.3);
              }
            }

            @keyframes successCheck {
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
              borderRadius: '4px'
            }}
            aria-label="Close modal"
            title="Close modal"
          >
            ×
          </button>
          <div className={styles.modalIcon}>
            <i className="fas fa-chart-line"></i>
          </div>
          <h2 className={styles.modalTitle}>
            {t('modals.vibeReport.title')}
          </h2>
          <p className={styles.modalDescription}>
            {t('modals.vibeReport.description')}
          </p>
        </div>

        <div className={styles.modalContent}>
          {/* Vibe Type Selection */}
          <div className={styles.formGroup}>
            <h3 className={styles.sectionTitle}>
              {t('modals.vibeReport.vibeType')}
            </h3>
            <div className={styles.vibeGrid}>
              {vibeOptions.map((vibe) => (
                <button
                  key={vibe.type}
                  onClick={() => setSelectedVibe(vibe.type)}
                  className={`${styles.vibeOption} ${selectedVibe === vibe.type ? styles.selected : ''}`}
                  style={{
                    '--vibe-color': vibe.color,
                    '--vibe-color-light': `${vibe.color}15`,
                    '--vibe-color-lighter': `${vibe.color}08`,
                    '--vibe-shadow': `${vibe.color}20`
                  } as React.CSSProperties}
                  aria-label={`Select ${vibe.label} vibe`}
                  title={`Select ${vibe.label} vibe`}
                >
                  <div className={`${styles.vibeIcon} ${getAnimationClass(vibe.type)}`}>
                    {vibe.icon === 'shield-check' && <ShieldCheck size={32} />}
                    {vibe.icon === 'cloud-snow' && <CloudSnow size={32} />}
                    {vibe.icon === 'music' && <Music size={32} />}
                    {vibe.icon === 'party-popper' && <PartyPopper size={32} />}
                    {vibe.icon === 'users' && <Users size={32} />}
                    {vibe.icon === 'eye-off' && <EyeOff size={32} />}
                    {vibe.icon === 'alert-triangle' && <AlertTriangle size={32} />}
                    {vibe.icon === 'volume-2' && <Volume2 size={32} />}
                    {vibe.icon === 'volume-x' && <VolumeX size={32} />}
                  </div>
                  <div className={styles.vibeLabel}>
                    {vibe.label}
                  </div>
                  <div className={styles.vibeDescription}>
                    {vibe.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Media Upload */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              {t('modals.vibeReport.addPhotoOptional')}
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
                  alt="Preview"
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

          {/* Location */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              {t('modals.vibeReport.location')}
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={t('modals.vibeReport.selectLocation')}
              className={styles.formInput}
              style={{ width: '100%', minWidth: '280px' }}
            />
          </div>

          {/* Notes */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              {t('modals.vibeReport.details')}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('modals.vibeReport.detailsPlaceholder')}
              className={styles.formTextarea}
              maxLength={500}
            />
            <div className={styles.charCounter}>
              <span id="char-count">{notes.length}</span>/500 {t('common.characters', 'characters')}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '16px',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
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
            >
              {t('common.cancel')}
            </button>

            <button
              onClick={handleSubmit}
              disabled={!selectedVibe || (!userLocation && !locationLoading) || isSubmitting}
              style={{
                flex: '2 1 auto',
                minWidth: '180px',
                padding: '16px 32px',
                border: 'none',
                borderRadius: '12px',
                background: (!selectedVibe || (!userLocation && !locationLoading) || isSubmitting)
                  ? 'var(--text-muted)'
                  : 'linear-gradient(135deg, var(--accent-primary) 0%, #2563eb 100%)',
                color: 'white',
                fontSize: '18px',
                fontWeight: '700',
                cursor: (!selectedVibe || (!userLocation && !locationLoading) || isSubmitting) ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: (!selectedVibe || (!userLocation && !locationLoading) || isSubmitting)
                  ? '0 2px 8px var(--shadow-color)'
                  : '0 8px 24px rgba(59, 130, 246, 0.4), 0 4px 12px rgba(59, 130, 246, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {isSubmitting ? (
                <>
                  <div className={styles.loadingSpinner}></div>
                  {t('modals.vibeReport.submitting')}
                </>
              ) : (
                t('modals.vibeReport.submitReport')
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

export default VibeReportModal;
