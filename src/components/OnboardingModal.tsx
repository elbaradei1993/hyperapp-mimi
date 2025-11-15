import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { OnboardingData } from '../types';
import { INTEREST_CATEGORIES } from '../types';
import { authService } from '../services/auth';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import PrivacyPolicyModal from './PrivacyPolicyModal';
import TermsOfServiceModal from './TermsOfServiceModal';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
  onClose: () => void;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onComplete, onClose }) => {
  const { t } = useTranslation();
  const { user, refreshProfile } = useAuth();
  const { changeLanguage } = useLanguage();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [showPrivacyPolicyModal, setShowPrivacyPolicyModal] = useState(false);
  const [showTermsOfServiceModal, setShowTermsOfServiceModal] = useState(false);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    firstName: '',
    lastName: '',
    phone: '',
    location: {
      latitude: 30.0444,
      longitude: 31.2357,
      address: 'Cairo, Egypt'
    },
    interests: [],
    language: 'en',
    notifications: true
  });

  useEffect(() => {
    if (isOpen && user) {
      // Try to get user's location
      getCurrentLocation();
    }
  }, [isOpen, user]);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          // Reverse geocode to get address
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
            );
            const data = await response.json();
            const address = data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

            setOnboardingData(prev => ({
              ...prev,
              location: { latitude, longitude, address }
            }));
          } catch (error) {
            console.error('Error reverse geocoding:', error);
            setOnboardingData(prev => ({
              ...prev,
              location: { latitude, longitude, address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` }
            }));
          }
        },
        (error) => {
          console.error('Error getting location:', error);
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    }
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    if (!user) return;

    if (!privacyAccepted) {
      alert('Please accept the Privacy Policy and Terms of Service to continue.');
      return;
    }

    setIsLoading(true);
    try {
      await authService.completeOnboarding(user.id, onboardingData);
      // Refresh the profile to update the auth context with new onboarding status
      await refreshProfile();
      onComplete();
    } catch (error) {
      console.error('Error completing onboarding:', error);
      alert(t('modals.onboarding.errorSetup'));
    } finally {
      setIsLoading(false);
    }
  };

  const updateOnboardingData = (updates: Partial<OnboardingData>) => {
    setOnboardingData(prev => ({ ...prev, ...updates }));
  };

  const handleLanguageChange = async (newLanguage: string) => {
    updateOnboardingData({ language: newLanguage });
    // Immediately change the app language for real-time translation
    await changeLanguage(newLanguage, refreshProfile, user);
  };

  const toggleInterest = (interest: string) => {
    setOnboardingData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  if (!isOpen) return null;

  const styles = {
    // CSS Variables as JavaScript object
    primary: '#0066ff',
    'primary-dark': '#0052d4',
    'primary-light': '#3385ff',
    surface: '#ffffff',
    'surface-secondary': '#f8fafc',
    'text-primary': '#0f172a',
    'text-secondary': '#475569',
    'text-muted': '#64748b',
    border: '#e2e8f0',
    'accent-green': '#10b981',
    'accent-purple': '#8b5cf6',
    'shadow-sm': '0 1px 3px rgba(0, 0, 0, 0.1)',
    shadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
    radius: '8px',
    'radius-lg': '16px'
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: styles.surface,
        borderRadius: styles['radius-lg'],
        width: '100%',
        maxWidth: '440px',
        maxHeight: '90vh',
        overflow: 'hidden',
        boxShadow: '0 20px 25px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '32px 24px 0',
          textAlign: 'center',
          background: `linear-gradient(135deg, ${styles.surface} 0%, ${styles['surface-secondary']} 100%)`
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: `linear-gradient(135deg, ${styles.primary} 0%, ${styles['primary-dark']} 100%)`,
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 700,
              fontSize: '1.125rem'
            }}>
              H
            </div>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: styles['text-primary']
            }}>
              HyperApp
            </div>
          </div>
          <h2 style={{
            fontSize: '1.375rem',
            fontWeight: 700,
            color: styles['text-primary'],
            marginBottom: '8px',
            lineHeight: '1.2'
          }}>
            {t('modals.onboarding.welcome')}
          </h2>
          <p style={{
            fontSize: '1rem',
            color: styles['text-secondary'],
            marginBottom: '24px'
          }}>
            {t('modals.onboarding.welcomeDesc')}
          </p>

          {/* Progress Indicator */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '24px'
          }}>
            {[1, 2, 3, 4].map(step => (
              <div
                key={step}
                style={{
                  width: '40px',
                  height: '4px',
                  borderRadius: '2px',
                  background: step <= currentStep ? styles.primary : styles.border,
                  transition: 'all 0.3s ease',
                  transform: step <= currentStep ? 'scale(1.1)' : 'scale(1)'
                }}
              />
            ))}
          </div>
        </div>

        {/* Modal Content */}
        <div style={{
          padding: '0 24px',
          flex: 1,
          overflowY: 'auto',
          maxHeight: '50vh'
        }}>
          {currentStep === 1 && (
            <Step1PersonalInfo
              data={onboardingData}
              onUpdate={updateOnboardingData}
              styles={styles}
            />
          )}
          {currentStep === 2 && (
            <Step2Location
              data={onboardingData}
              onUpdate={updateOnboardingData}
              onLanguageChange={handleLanguageChange}
              styles={styles}
            />
          )}
          {currentStep === 3 && (
            <Step3Interests
              data={onboardingData}
              onToggleInterest={toggleInterest}
              styles={styles}
            />
          )}
          {currentStep === 4 && (
            <Step4Welcome
              data={onboardingData}
              privacyAccepted={privacyAccepted}
              onPrivacyAcceptedChange={setPrivacyAccepted}
              onShowPrivacyPolicy={() => setShowPrivacyPolicyModal(true)}
              onShowTermsOfService={() => setShowTermsOfServiceModal(true)}
              styles={styles}
            />
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '20px 24px 24px',
          borderTop: `1px solid ${styles.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          gap: '12px',
          background: styles.surface
        }}>
          <button
            onClick={currentStep === 1 ? onClose : handlePrevious}
            style={{
              padding: '14px 20px',
              borderRadius: styles.radius,
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: `1px solid ${styles.border}`,
              background: styles.surface,
              color: styles['text-primary'],
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = styles['surface-secondary'];
              e.currentTarget.style.borderColor = styles['primary-light'];
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = styles.surface;
              e.currentTarget.style.borderColor = styles.border;
            }}
          >
            {currentStep === 1 ? t('modals.onboarding.skip') : t('common.previous')}
          </button>

          {currentStep < 4 ? (
            <button
              onClick={handleNext}
              style={{
                padding: '14px 20px',
                borderRadius: styles.radius,
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
                background: styles.primary,
                color: 'white',
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = styles['primary-dark'];
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = styles.shadow;
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = styles.primary;
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {t('common.next')}
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={isLoading}
              style={{
                padding: '14px 20px',
                borderRadius: styles.radius,
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                border: 'none',
                background: styles['accent-green'],
                color: 'white',
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                opacity: isLoading ? 0.6 : 1
              }}
              onMouseOver={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.background = '#0da271';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = styles.shadow;
                }
              }}
              onMouseOut={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.background = styles['accent-green'];
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              {isLoading ? t('common.loading') : t('modals.onboarding.getStarted')}
            </button>
          )}
        </div>
      </div>

      {/* Privacy Policy Modal */}
      <PrivacyPolicyModal
        isOpen={showPrivacyPolicyModal}
        onClose={() => setShowPrivacyPolicyModal(false)}
      />

      {/* Terms of Service Modal */}
      <TermsOfServiceModal
        isOpen={showTermsOfServiceModal}
        onClose={() => setShowTermsOfServiceModal(false)}
      />
    </div>
  );
};

// Step Components
const Step1PersonalInfo: React.FC<{
  data: OnboardingData;
  onUpdate: (updates: Partial<OnboardingData>) => void;
  styles: any;
}> = ({ data, onUpdate, styles }) => {
  const { t } = useTranslation();
  return (
    <div>
      <h3 style={{
        fontSize: '1.125rem',
        fontWeight: 600,
        marginBottom: '20px'
      }}>
        {t('onboarding.personalInfo')}
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: styles['text-primary'],
            marginBottom: '8px'
          }}>
            {t('onboarding.firstName')} *
          </label>
          <input
            type="text"
            value={data.firstName}
            onChange={(e) => onUpdate({ firstName: e.target.value })}
            placeholder={t('onboarding.enterFirstName')}
            style={{
              width: '100%',
              padding: '14px 16px',
              border: `1px solid ${styles.border}`,
              borderRadius: styles.radius,
              fontSize: '1rem',
              background: styles.surface,
              outline: 'none',
              transition: 'all 0.2s ease'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = styles.primary;
              e.currentTarget.style.boxShadow = `0 0 0 3px rgba(0, 102, 255, 0.1)`;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = styles.border;
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>

        <div>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: styles['text-primary'],
            marginBottom: '8px'
          }}>
            {t('onboarding.lastName')} *
          </label>
          <input
            type="text"
            value={data.lastName}
            onChange={(e) => onUpdate({ lastName: e.target.value })}
            placeholder={t('onboarding.enterLastName')}
            style={{
              width: '100%',
              padding: '14px 16px',
              border: `1px solid ${styles.border}`,
              borderRadius: styles.radius,
              fontSize: '1rem',
              background: styles.surface,
              outline: 'none',
              transition: 'all 0.2s ease'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = styles.primary;
              e.currentTarget.style.boxShadow = `0 0 0 3px rgba(0, 102, 255, 0.1)`;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = styles.border;
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>

        <div>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: styles['text-primary'],
            marginBottom: '8px'
          }}>
            {t('onboarding.phoneNumber')}
          </label>
          <input
            type="tel"
            value={data.phone}
            onChange={(e) => onUpdate({ phone: e.target.value })}
            placeholder="+1 (555) 123-4567"
            style={{
              width: '100%',
              padding: '14px 16px',
              border: `1px solid ${styles.border}`,
              borderRadius: styles.radius,
              fontSize: '1rem',
              background: styles.surface,
              outline: 'none',
              transition: 'all 0.2s ease'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = styles.primary;
              e.currentTarget.style.boxShadow = `0 0 0 3px rgba(0, 102, 255, 0.1)`;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = styles.border;
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>
      </div>
    </div>
  );
};

const Step2Location: React.FC<{
  data: OnboardingData;
  onUpdate: (updates: Partial<OnboardingData>) => void;
  onLanguageChange: (language: string) => void;
  styles: any;
}> = ({ data, onUpdate, onLanguageChange, styles }) => {
  const { t } = useTranslation();
  return (
    <div>
      <h3 style={{
        fontSize: '1.125rem',
        fontWeight: 600,
        color: styles['text-primary'],
        marginBottom: '16px'
      }}>
        {t('onboarding.locationPreferences')}
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: styles['text-primary'],
            marginBottom: '4px'
          }}>
            {t('onboarding.yourLocation')}
          </label>
          <div style={{
            padding: '14px 16px',
            background: styles['surface-secondary'],
            border: `1px solid ${styles.border}`,
            borderRadius: styles.radius,
            fontSize: '0.875rem',
            color: styles['text-secondary'],
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            📍 {data.location.address}
          </div>
          <p style={{
            fontSize: '0.75rem',
            color: styles['text-muted'],
            marginTop: '8px'
          }}>
            {t('onboarding.locationDescription')}
          </p>
        </div>

        <div>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: styles['text-primary'],
            marginBottom: '8px'
          }}>
            {t('onboarding.languagePreference')}
          </label>
          <select
            value={data.language}
            onChange={(e) => onLanguageChange(e.target.value)}
            style={{
              width: '100%',
              padding: '14px 16px',
              border: `1px solid ${styles.border}`,
              borderRadius: styles.radius,
              fontSize: '1rem',
              background: styles.surface,
              outline: 'none',
              transition: 'all 0.2s ease'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = styles.primary;
              e.currentTarget.style.boxShadow = `0 0 0 3px rgba(0, 102, 255, 0.1)`;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = styles.border;
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
            <option value="ar">العربية (Arabic)</option>
          </select>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          padding: '12px',
          background: styles['surface-secondary'],
          borderRadius: styles.radius,
          border: `1px solid ${styles.border}`
        }}>
          <input
            type="checkbox"
            checked={data.notifications}
            onChange={(e) => onUpdate({ notifications: e.target.checked })}
            style={{
              width: '18px',
              height: '18px',
              marginTop: '2px',
              flexShrink: 0,
              accentColor: styles.primary
            }}
          />
          <label style={{
            fontSize: '0.875rem',
            color: styles['text-primary'],
            lineHeight: '1.4',
            cursor: 'pointer'
          }}>
            {t('onboarding.enableNotifications')}
          </label>
        </div>
      </div>
    </div>
  );
};

const Step3Interests: React.FC<{
  data: OnboardingData;
  onToggleInterest: (interest: string) => void;
  styles: any;
}> = ({ data, onToggleInterest, styles }) => {
  const { t } = useTranslation();
  return (
    <div>
      <h3 style={{
        fontSize: '1.125rem',
        fontWeight: 600,
        color: styles['text-primary'],
        marginBottom: '16px'
      }}>
        {t('onboarding.communityInterests')}
      </h3>

      <p style={{
        color: styles['text-secondary'],
        marginBottom: '20px',
        fontSize: '0.875rem'
      }}>
        {t('onboarding.selectInterests')}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {Object.entries(INTEREST_CATEGORIES).map(([key, category]) => (
          <div key={key}>
            <h4 style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: styles['text-primary'],
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>{category.icon}</span>
              {category.label}
            </h4>

            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px'
            }}>
              {category.items.map((item) => (
                <button
                  key={item}
                  onClick={() => onToggleInterest(item)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '20px',
                    border: data.interests.includes(item) ? `2px solid ${styles.primary}` : `2px solid ${styles.border}`,
                    background: data.interests.includes(item) ? '#eff6ff' : styles.surface,
                    color: data.interests.includes(item) ? '#1d4ed8' : styles['text-primary'],
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    if (!data.interests.includes(item)) {
                      e.currentTarget.style.borderColor = styles['primary-light'];
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!data.interests.includes(item)) {
                      e.currentTarget.style.borderColor = styles.border;
                    }
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: '16px',
        padding: '12px',
        background: '#f0f9ff',
        borderRadius: styles.radius,
        border: '1px solid #bae6fd'
      }}>
        <p style={{
          fontSize: '0.75rem',
          color: '#0369a1',
          margin: 0
        }}>
          💡 <strong>{t('onboarding.tip')}:</strong> {t('onboarding.interestsTip')}
        </p>
      </div>
    </div>
  );
};

const Step4Welcome: React.FC<{
  data: OnboardingData;
  privacyAccepted: boolean;
  onPrivacyAcceptedChange: (accepted: boolean) => void;
  onShowPrivacyPolicy: () => void;
  onShowTermsOfService: () => void;
  styles: any;
}> = ({ data, privacyAccepted, onPrivacyAcceptedChange, onShowPrivacyPolicy, onShowTermsOfService, styles }) => {
  const { t } = useTranslation();
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontSize: '3rem',
        marginBottom: '16px'
      }}>
        🎉
      </div>

      <h3 style={{
        fontSize: '1.5rem',
        fontWeight: 700,
        color: styles['text-primary'],
        marginBottom: '12px'
      }}>
        {t('onboarding.allSetUp')}
      </h3>

      <p style={{
        color: styles['text-secondary'],
        fontSize: '1rem',
        marginBottom: '24px'
      }}>
        {t('onboarding.welcomeMessage', { name: data.firstName })}
      </p>

      <div style={{
        background: styles['surface-secondary'],
        padding: '20px',
        borderRadius: styles.radius,
        marginBottom: '20px',
        border: `1px solid ${styles.border}`
      }}>
        <h4 style={{
          fontSize: '0.875rem',
          fontWeight: 600,
          color: styles['text-primary'],
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          🚀 {t('onboarding.whatsNext')}
        </h4>
        <ul style={{
          color: styles['text-secondary'],
          fontSize: '0.875rem',
          margin: 0,
          paddingLeft: '20px',
          textAlign: 'left'
        }}>
          <li style={{ marginBottom: '8px' }}>{t('onboarding.exploreMap')}</li>
          <li style={{ marginBottom: '8px' }}>{t('onboarding.submitReport')}</li>
          <li style={{ marginBottom: '8px' }}>{t('onboarding.connectPeople')}</li>
          <li>{t('onboarding.earnReputation')}</li>
        </ul>
      </div>

      {/* Privacy & Terms Acceptance */}
      <div style={{
        background: styles['surface-secondary'],
        padding: '16px',
        borderRadius: styles.radius,
        marginTop: '16px',
        border: `1px solid ${styles.border}`
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          fontSize: '0.875rem',
          color: styles['text-primary'],
          lineHeight: '1.4'
        }}>
          <input
            type="checkbox"
            checked={privacyAccepted}
            onChange={(e) => onPrivacyAcceptedChange(e.target.checked)}
            style={{
              width: '16px',
              height: '16px',
              marginTop: '2px',
              flexShrink: 0,
              accentColor: styles.primary
            }}
          />
          <span>
            I agree to the{' '}
            <button
              onClick={(e) => {
                e.preventDefault();
                onShowPrivacyPolicy();
              }}
              style={{
                color: styles.primary,
                textDecoration: 'underline',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.875rem',
                padding: 0,
                fontWeight: 500
              }}
            >
              Privacy Policy
            </button>
            {' '}and{' '}
            <button
              onClick={(e) => {
                e.preventDefault();
                onShowTermsOfService();
              }}
              style={{
                color: styles.primary,
                textDecoration: 'underline',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.875rem',
                padding: 0,
                fontWeight: 500
              }}
            >
              Terms of Service
            </button>
            *
          </span>
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;
