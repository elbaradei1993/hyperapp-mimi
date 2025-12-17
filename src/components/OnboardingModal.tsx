import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { OnboardingData } from '../types';
import { authService } from '../services/auth';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import PrivacyPolicyModal from './PrivacyPolicyModal';
import TermsOfServiceModal from './TermsOfServiceModal';
import './OnboardingModal.css';

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

  // Debug state changes
  useEffect(() => {
    console.log('Privacy Policy Modal state:', showPrivacyPolicyModal);
  }, [showPrivacyPolicyModal]);

  useEffect(() => {
    console.log('Terms of Service Modal state:', showTermsOfServiceModal);
  }, [showTermsOfServiceModal]);
  const [showConfirmation, setShowConfirmation] = useState(false);
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

  const navigateToPrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      onClose();
    }
  };

  const navigateToNextStep = () => {
    // Validation for required fields
    if (currentStep === 1 && !onboardingData.firstName.trim()) {
      alert('Please enter your first name');
      return;
    }

    if (currentStep === 2 && !onboardingData.lastName.trim()) {
      alert('Please enter your last name');
      return;
    }

    if (currentStep === 6 && onboardingData.interests.length < 3) {
      alert('Please select at least 3 interests to continue.');
      return;
    }

    if (currentStep < 7) {
      setCurrentStep(currentStep + 1);
    } else {
      // Final step - complete onboarding
      if (!privacyAccepted) {
        alert('Please accept the Privacy Policy and Terms of Service to continue.');
        return;
      }
      completeOnboarding();
    }
  };

  const completeOnboarding = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      await authService.completeOnboarding(user.id, onboardingData);
      // Refresh the profile to update the auth context with new onboarding status
      await refreshProfile();

      // Show confirmation animation
      setShowConfirmation(true);
      createConfetti();

      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (error) {
      console.error('Error completing onboarding:', error);
      alert('Error completing setup. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const createConfetti = () => {
    const colors = ['#ff6b6b', '#4ecdc4', '#ffd166', '#06d6a0', '#118ab2'];

    for (let i = 0; i < 50; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.left = Math.random() * 100 + 'vw';
      confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.width = Math.random() * 10 + 5 + 'px';
      confetti.style.height = Math.random() * 10 + 5 + 'px';
      confetti.style.animation = `confetti ${Math.random() * 3 + 2}s linear forwards`;
      confetti.style.animationDelay = Math.random() * 2 + 's';

      document.body.appendChild(confetti);

      // Remove confetti after animation completes
      setTimeout(() => {
        if (confetti.parentNode) {
          confetti.parentNode.removeChild(confetti);
        }
      }, 5000);
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

  // Auto-focus current input when step changes
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        const currentStepElement = document.getElementById(`step-${currentStep}`);
        if (currentStepElement) {
          const input = currentStepElement.querySelector('input, select') as HTMLElement;
          if (input) {
            input.focus();
          }
        }
      }, 300);
    }
  }, [currentStep, isOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        navigateToNextStep();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStep, onboardingData, privacyAccepted]);

  if (!isOpen) return null;

  return (
    <>
      <div className={`modal-overlay ${isOpen ? 'active' : ''}`}>
        <div className="modal-container">
          <div className="modal-header">
            <div className="modal-brand">
              <div className="modal-logo">H</div>
              <div className="modal-title">HyperApp</div>
            </div>
            <p className="modal-subtitle">Your community safety platform</p>

            <div className="progress-container">
              {[1, 2, 3, 4, 5, 6, 7].map(step => (
                <div
                  key={step}
                  className={`progress-dot ${step <= currentStep ? 'active' : ''}`}
                  data-step={step}
                />
              ))}
            </div>
          </div>

          <div className="modal-content">
            {/* Step 1: First Name */}
            <div className={`step ${currentStep === 1 ? 'active' : ''}`} id="step-1">
              <h3 className="step-title">What's your first name?</h3>
              <div className="field-container">
                <label className="field-label">First Name</label>
                <input
                  type="text"
                  className="field-input"
                  value={onboardingData.firstName}
                  onChange={(e) => updateOnboardingData({ firstName: e.target.value })}
                  placeholder="Enter your first name"
                  autoFocus
                />
                <p className="field-description">This will be used to personalize your experience.</p>
              </div>
              <div className="step-indicator">Step 1 of 7</div>
            </div>

            {/* Step 2: Last Name */}
            <div className={`step ${currentStep === 2 ? 'active' : ''}`} id="step-2">
              <h3 className="step-title">And your last name?</h3>
              <div className="field-container">
                <label className="field-label">Last Name</label>
                <input
                  type="text"
                  className="field-input"
                  value={onboardingData.lastName}
                  onChange={(e) => updateOnboardingData({ lastName: e.target.value })}
                  placeholder="Enter your last name"
                />
                <p className="field-description">Your last name helps us create your profile.</p>
              </div>
              <div className="step-indicator">Step 2 of 7</div>
            </div>

            {/* Step 3: Phone Number */}
            <div className={`step ${currentStep === 3 ? 'active' : ''}`} id="step-3">
              <h3 className="step-title">How can we reach you?</h3>
              <div className="field-container">
                <label className="field-label">Phone Number</label>
                <input
                  type="tel"
                  className="field-input"
                  value={onboardingData.phone}
                  onChange={(e) => updateOnboardingData({ phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                />
                <p className="field-description">We'll use this for important safety alerts (optional).</p>
              </div>
              <div className="step-indicator">Step 3 of 7</div>
            </div>

            {/* Step 4: Location */}
            <div className={`step ${currentStep === 4 ? 'active' : ''}`} id="step-4">
              <h3 className="step-title">Where are you located?</h3>
              <div className="field-container">
                <label className="field-label">Your Location</label>
                <div className="location-display">
                  <i className="fas fa-map-marker-alt" style={{marginRight: '8px', color: '#667eea'}}></i>
                  {onboardingData.location.address}
                </div>
                <p className="field-description">We'll use this to show relevant community reports and safety information in your area.</p>
              </div>
              <div className="step-indicator">Step 4 of 7</div>
            </div>

            {/* Step 5: Language */}
            <div className={`step ${currentStep === 5 ? 'active' : ''}`} id="step-5">
              <h3 className="step-title">Language Preference</h3>
              <div className="field-container">
                <label className="field-label">Select your language</label>
                <div className="select-container">
                  <select
                    className="select-field"
                    value={onboardingData.language}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                  >
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                    <option value="ar">العربية (Arabic)</option>
                  </select>
                </div>
                <p className="field-description">This will change the language across the application.</p>
              </div>
              <div className="step-indicator">Step 5 of 7</div>
            </div>

            {/* Step 6: Community Activities */}
            <div className={`step ${currentStep === 6 ? 'active' : ''}`} id="step-6">
              <h3 className="step-title">What community activities interest you?</h3>
              <div className="field-container">
                <p className="field-description" style={{marginBottom: '20px'}}>Select activities you enjoy to connect with like-minded people in your community.</p>

                <div className="interests-grid">
                  {[
                    { name: 'Food & Dining', icon: 'fas fa-utensils' },
                    { name: 'Fashion', icon: 'fas fa-tshirt' },
                    { name: 'Music', icon: 'fas fa-music' },
                    { name: 'Art & Culture', icon: 'fas fa-paint-brush' },
                    { name: 'Sports & Fitness', icon: 'fas fa-running' },
                    { name: 'Nature & Outdoors', icon: 'fas fa-leaf' },
                    { name: 'Gaming', icon: 'fas fa-gamepad' },
                    { name: 'Movies & TV', icon: 'fas fa-film' }
                  ].map((interest) => (
                    <div
                      key={interest.name}
                      className={`interest-tag ${onboardingData.interests.includes(interest.name) ? 'selected' : ''}`}
                      onClick={() => toggleInterest(interest.name)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleInterest(interest.name);
                        }
                      }}
                    >
                      <i className={`${interest.icon} interest-icon`}></i>
                      {interest.name}
                    </div>
                  ))}
                </div>

                <div className="checkbox-container" style={{marginTop: '25px'}}>
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={onboardingData.notifications}
                    onChange={(e) => updateOnboardingData({ notifications: e.target.checked })}
                    id="notifications"
                  />
                  <label className="checkbox-label" htmlFor="notifications">Enable push notifications for important safety alerts</label>
                </div>
              </div>
              <div className="step-indicator">Step 6 of 7</div>
            </div>

            {/* Step 7: Welcome */}
            <div className={`step ${currentStep === 7 ? 'active' : ''}`} id="step-7">
              <div className="welcome-content">
                <div className="welcome-icon">
                  <i className="fas fa-check-circle"></i>
                </div>
                <h3 className="welcome-title">You're All Set!</h3>
                <p className="welcome-message">Welcome to HyperApp! Your community safety platform is ready to use.</p>

                <div className="welcome-card">
                  <h4><i className="fas fa-rocket" style={{marginRight: '8px'}}></i> What's Next?</h4>
                  <ul className="welcome-list">
                    <li>Explore the interactive safety map</li>
                    <li>Submit your first safety report</li>
                    <li>Connect with your local community</li>
                    <li>Earn reputation points and badges</li>
                  </ul>
                </div>

                <div className="privacy-section">
                  <div className="privacy-text">
                    <input
                      type="checkbox"
                      className="checkbox"
                      checked={privacyAccepted}
                      onChange={(e) => setPrivacyAccepted(e.target.checked)}
                      id="privacy"
                    />
                    <span>
                      I agree to the{' '}
                      <span
                        className="privacy-link"
                        onClick={() => {
                          alert('Privacy Policy clicked!');
                          setShowPrivacyPolicyModal(true);
                        }}
                        style={{ cursor: 'pointer', color: '#667eea', textDecoration: 'underline', fontSize: 'inherit' }}
                      >
                        Privacy Policy
                      </span>
                      {' '}and{' '}
                      <span
                        className="privacy-link"
                        onClick={() => {
                          alert('Terms of Service clicked!');
                          setShowTermsOfServiceModal(true);
                        }}
                        style={{ cursor: 'pointer', color: '#667eea', textDecoration: 'underline', fontSize: 'inherit' }}
                      >
                        Terms of Service
                      </span>
                      *
                    </span>
                  </div>
                </div>
              </div>
              <div className="step-indicator">Step 7 of 7</div>
            </div>
          </div>

          {/* Enhanced Button Container - Positioned Above Footer */}
          <div className="button-container">
            <button
              className="modal-btn btn-secondary"
              onClick={navigateToPrevStep}
            >
              {currentStep === 1 ? 'Cancel' : 'Back'}
            </button>
            <button
              className={`modal-btn ${currentStep < 7 ? 'btn-primary' : 'btn-success'}`}
              onClick={navigateToNextStep}
              disabled={isLoading}
            >
              {currentStep < 7 ? 'Next' : (isLoading ? 'Setting Up...' : 'Get Started')}
            </button>
          </div>

          <div className="modal-footer">
            {/* Footer content moved to button container above */}
          </div>
        </div>
      </div>

      {/* Confirmation Message */}
      {showConfirmation && (
        <div className="confirmation-overlay active">
          <div className="confirmation-container">
            <div className="confirmation-icon">
              <div className="confirmation-circle">
                <i className="fas fa-check confirmation-check"></i>
              </div>
            </div>
            <h2 className="confirmation-title">Welcome to HyperApp!</h2>
            <p className="confirmation-message">Your account has been successfully set up. You're now ready to explore all the features of our community safety platform.</p>
            <button className="confirmation-btn" onClick={() => setShowConfirmation(false)}>
              Let's Get Started
            </button>
          </div>
        </div>
      )}

      {/* Privacy Policy Modal */}
      <PrivacyPolicyModal
        isOpen={showPrivacyPolicyModal}
        onClose={() => setShowPrivacyPolicyModal(false)}
        onAccept={() => setPrivacyAccepted(true)}
      />

      {/* Terms of Service Modal */}
      <TermsOfServiceModal
        isOpen={showTermsOfServiceModal}
        onClose={() => setShowTermsOfServiceModal(false)}
        onAccept={() => setPrivacyAccepted(true)}
      />
    </>
  );
};



export default OnboardingModal;
