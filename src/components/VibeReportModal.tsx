import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Button, LoadingSpinner } from './shared';
import { VibeType } from '../types';
import { reportsService } from '../services/reports';
import { reverseGeocode, formatCoordinates } from '../lib/geocoding';
import { VIBE_CONFIG } from '../constants/vibes';
import {
  ShieldCheck,
  CloudSnow,
  Music,
  PartyPopper,
  Users,
  EyeOff,
  AlertTriangle,
  Volume2,
  VolumeX
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

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setSelectedVibe(null);
      setNotes('');
      setLocation('');
      setUserLocation(null);

      // Use current location from props as initial fallback
      if (currentLocation) {
        setUserLocation(currentLocation);
        // Try to get address for the current location
        reverseGeocode(currentLocation[0], currentLocation[1])
          .then(address => setLocation(address))
          .catch(() => setLocation(t('reports.addressNotAvailable') || 'Location not available'));
      }

      // Try to get more precise location
      getCurrentLocation();
    }
  }, [isOpen, currentLocation]);

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

      // Show success animation
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onSuccess?.();
        onClose();
      }, 2500);
    } catch (error) {
      console.error('Error creating vibe report:', error);
      // TODO: Show error notification
      setIsSubmitting(false);
    }
  };

  // Don't render anything if modal is not open
  if (!isOpen && !showSuccess) return null;

  if (showSuccess) {
    return (
      <div className={styles.modalOverlay}>
        <div className={styles.modal}>
          <div className={styles.modalContent} style={{ textAlign: 'center', padding: '2rem' }}>
            <div className={styles.successCheckmark}>
              <div className={styles.checkIcon}>
                <span className={`${styles.iconLine} ${styles.lineTip}`}></span>
                <span className={`${styles.iconLine} ${styles.lineLong}`}></span>
                <div className={styles.iconCircle}></div>
                <div className={styles.iconFix}></div>
              </div>
            </div>
            <h3 style={{ margin: '1.5rem 0 0.5rem', color: '#10b981' }}>
              {t('modals.vibeReport.successTitle', 'Report Submitted Successfully!')}
            </h3>
            <p style={{ color: '#6b7280' }}>
              {t('modals.vibeReport.successMessage', 'Thank you for helping the community stay informed.')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
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

          {/* Location */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              {t('modals.vibeReport.location')}
            </label>
            <div className={styles.inputWrapper}>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={t('modals.vibeReport.selectLocation')}
                className={styles.formInput}
              />
              <button
                onClick={getCurrentLocation}
                disabled={locationLoading}
                className={styles.locationButton}
                title={t('reports.useCurrentLocation')}
              >
                {locationLoading ? (
                  <div className={styles.loadingSpinner}></div>
                ) : (
                  <i className="fas fa-crosshairs"></i>
                )}
              </button>
            </div>
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
          <div className={styles.modalActions}>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className={styles.btnCancel}
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedVibe || !userLocation || isSubmitting}
              className={styles.btnSubmit}
            >
              {isSubmitting ? (
                <>
                  <div className={styles.loadingSpinner}></div>
                  {t('modals.vibeReport.submitting')}
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane"></i>
                  {t('modals.vibeReport.submitReport')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VibeReportModal;
