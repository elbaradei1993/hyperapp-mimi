import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { OnboardingData } from '../types';
import { INTEREST_CATEGORIES } from '../types';
import { authService } from '../services/auth';
import { useAuth } from '../contexts/AuthContext';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
  onClose: () => void;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onComplete, onClose }) => {
  const { t } = useTranslation();
  const { user, refreshProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
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

  const toggleInterest = (interest: string) => {
    setOnboardingData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
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
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '32px',
        maxWidth: '500px',
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#1f2937',
            marginBottom: '8px'
          }}>
            {t('modals.onboarding.welcome')}
          </h2>
          <p style={{ color: '#6b7280', fontSize: '16px' }}>
            {t('modals.onboarding.welcomeDesc')}
          </p>
        </div>

        {/* Progress Indicator */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '32px',
          gap: '8px'
        }}>
          {[1, 2, 3, 4].map(step => (
            <div
              key={step}
              style={{
                width: '40px',
                height: '4px',
                borderRadius: '2px',
                backgroundColor: step <= currentStep ? '#3b82f6' : '#e5e7eb'
              }}
            />
          ))}
        </div>

        {/* Step Content */}
        <div style={{ marginBottom: '32px' }}>
          {currentStep === 1 && (
            <Step1PersonalInfo
              data={onboardingData}
              onUpdate={updateOnboardingData}
            />
          )}
          {currentStep === 2 && (
            <Step2Location
              data={onboardingData}
              onUpdate={updateOnboardingData}
            />
          )}
          {currentStep === 3 && (
            <Step3Interests
              data={onboardingData}
              onToggleInterest={toggleInterest}
            />
          )}
          {currentStep === 4 && (
            <Step4Welcome
              data={onboardingData}
            />
          )}
        </div>

        {/* Navigation Buttons */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '16px'
        }}>
          <button
            onClick={currentStep === 1 ? onClose : handlePrevious}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              backgroundColor: 'white',
              color: '#374151',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            {currentStep === 1 ? t('modals.onboarding.skip') : t('common.previous')}
          </button>

          {currentStep < 4 ? (
            <button
              onClick={handleNext}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#3b82f6',
                color: 'white',
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              {t('common.next')}
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={isLoading}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#10b981',
                color: 'white',
                fontSize: '16px',
                fontWeight: '500',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.5 : 1
              }}
            >
              {isLoading ? t('common.loading') : t('modals.onboarding.getStarted')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Step Components
const Step1PersonalInfo: React.FC<{
  data: OnboardingData;
  onUpdate: (updates: Partial<OnboardingData>) => void;
}> = ({ data, onUpdate }) => {
  const { t } = useTranslation();
  return (
    <div>
      <h3 style={{
        fontSize: '20px',
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: '16px'
      }}>
        {t('onboarding.personalInfo')}
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '4px'
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
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '16px',
              outline: 'none'
            }}
          />
        </div>

        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '4px'
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
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '16px',
              outline: 'none'
            }}
          />
        </div>

        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '4px'
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
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '16px',
              outline: 'none'
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
}> = ({ data, onUpdate }) => {
  const { t } = useTranslation();
  return (
    <div>
      <h3 style={{
        fontSize: '20px',
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: '16px'
      }}>
        {t('onboarding.locationPreferences')}
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '4px'
          }}>
            {t('onboarding.yourLocation')}
          </label>
          <div style={{
            padding: '12px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            backgroundColor: '#f9fafb',
            fontSize: '14px',
            color: '#6b7280'
          }}>
            📍 {data.location.address}
          </div>
          <p style={{
            fontSize: '12px',
            color: '#6b7280',
            marginTop: '4px'
          }}>
            {t('onboarding.locationDescription')}
          </p>
        </div>

        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '8px'
          }}>
            {t('onboarding.languagePreference')}
          </label>
          <select
            value={data.language}
            onChange={(e) => onUpdate({ language: e.target.value })}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '16px',
              outline: 'none'
            }}
          >
            <option value="en">English</option>
            <option value="ar">العربية (Arabic)</option>
          </select>
        </div>

        <div>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={data.notifications}
              onChange={(e) => onUpdate({ notifications: e.target.checked })}
              style={{ width: '16px', height: '16px' }}
            />
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
}> = ({ data, onToggleInterest }) => {
  const { t } = useTranslation();
  return (
    <div>
      <h3 style={{
        fontSize: '20px',
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: '16px'
      }}>
        {t('onboarding.communityInterests')}
      </h3>

      <p style={{
        color: '#6b7280',
        marginBottom: '24px',
        fontSize: '14px'
      }}>
        {t('onboarding.selectInterests')}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {Object.entries(INTEREST_CATEGORIES).map(([key, category]) => (
          <div key={key}>
            <h4 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#1f2937',
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
                    padding: '8px 16px',
                    borderRadius: '20px',
                    border: data.interests.includes(item) ? '2px solid #3b82f6' : '2px solid #d1d5db',
                    backgroundColor: data.interests.includes(item) ? '#eff6ff' : 'white',
                    color: data.interests.includes(item) ? '#1d4ed8' : '#374151',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
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
        backgroundColor: '#f0f9ff',
        borderRadius: '8px',
        border: '1px solid #bae6fd'
      }}>
        <p style={{
          fontSize: '14px',
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
}> = ({ data }) => {
  const { t } = useTranslation();
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontSize: '48px',
        marginBottom: '16px'
      }}>
        🎉
      </div>

      <h3 style={{
        fontSize: '24px',
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: '16px'
      }}>
        {t('onboarding.allSetUp')}
      </h3>

      <p style={{
        color: '#6b7280',
        fontSize: '16px',
        marginBottom: '24px'
      }}>
        {t('onboarding.welcomeMessage', { name: data.firstName })}
      </p>

      <div style={{
        backgroundColor: '#f0f9ff',
        padding: '16px',
        borderRadius: '8px',
        border: '1px solid #bae6fd',
        textAlign: 'left'
      }}>
        <h4 style={{
          fontSize: '16px',
          fontWeight: '600',
          color: '#1f2937',
          marginBottom: '8px'
        }}>
          {t('onboarding.whatsNext')}
        </h4>
        <ul style={{
          color: '#0369a1',
          fontSize: '14px',
          margin: 0,
          paddingLeft: '20px'
        }}>
          <li>{t('onboarding.exploreMap')}</li>
          <li>{t('onboarding.submitReport')}</li>
          <li>{t('onboarding.connectPeople')}</li>
          <li>{t('onboarding.earnReputation')}</li>
        </ul>
      </div>
    </div>
  );
};

export default OnboardingModal;
