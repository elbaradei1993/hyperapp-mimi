import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LoadingSpinner } from './shared';
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
  Send
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
              {t('modals.emergencyReport.successTitle', 'Emergency Report Submitted Successfully!')}
            </h3>
            <p style={{ color: '#6b7280' }}>
              {t('modals.emergencyReport.successMessage', 'Emergency services have been notified. Help is on the way.')}
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
              disabled={!selectedEmergency || !description.trim() || !userLocation || isSubmitting}
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
    </div>
  );
};

export default EmergencyReportModal;
