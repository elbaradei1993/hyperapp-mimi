import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { Button, Box, IconButton } from '@chakra-ui/react';
import { X } from 'lucide-react';
import styles from './AuthModal.module.css';
import Input from './shared/Input';
import Modal from './shared/Modal';
import { INTEREST_CATEGORIES } from '../types';
import { uploadService } from '../services/upload';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { signIn, signUp, signInWithGoogle, resetPassword, isLoading } = useAuth();
  const { addNotification } = useNotification();
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [formData, setFormData] = useState({
    loginEmail: '',
    loginPassword: '',
    signupUsername: '',
    signupEmail: '',
    signupPassword: '',
    signupPasswordConfirm: '',
    signupFirstName: '',
    signupLastName: '',
    signupPhone: '',
    signupLocation: '',
    resetEmail: ''
  });
  const [signupInterests, setSignupInterests] = useState<string[]>([]);
  const [signupProfilePicture, setSignupProfilePicture] = useState<File | null>(null);
  const [signupProfilePicturePreview, setSignupProfilePicturePreview] = useState('');
  const [signupMarketingConsent, setSignupMarketingConsent] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSignupProfilePicture(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setSignupProfilePicturePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleInterest = (interest: string) => {
    setSignupInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.loginEmail || !formData.loginPassword) {
      setError(t('auth.fillAllFields') as string);
      return;
    }

    try {
      console.log('Attempting login for:', formData.loginEmail);
      await signIn(formData.loginEmail, formData.loginPassword);
      console.log('Login successful');
      onClose();
      setFormData(prev => ({ ...prev, loginEmail: '', loginPassword: '' }));
    } catch (error: any) {
      console.error('Login error:', error);

      let errorMessage = t('auth.loginFailed');

      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = t('auth.invalidCredentials');
      } else if (error.message?.includes('Email not confirmed')) {
        errorMessage = t('auth.confirmEmail');
      } else if (error.message?.includes('User not found')) {
        errorMessage = t('auth.accountNotFound');
      } else {
        // Show the actual error for debugging
        errorMessage = `Login failed: ${error.message}`;
      }

      setError(errorMessage);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.signupFirstName || !formData.signupLastName || !formData.signupUsername || !formData.signupEmail || !formData.signupPassword || !formData.signupPasswordConfirm) {
      setError(t('auth.fillAllFields') as string);
      return;
    }

    if (formData.signupPassword !== formData.signupPasswordConfirm) {
      setError(t('auth.passwordsNotMatch') as string);
      return;
    }

    if (formData.signupPassword.length < 6) {
      setError(t('auth.passwordTooShort') as string);
      return;
    }

    try {
      console.log('Attempting signup for:', formData.signupEmail);

      // Upload profile picture if provided
      let profilePictureUrl = '';
      if (signupProfilePicture) {
        try {
          const uploadResult = await uploadService.uploadProfilePicture(signupProfilePicture, 'temp-user');
          profilePictureUrl = uploadResult.url;
        } catch (uploadError) {
          console.error('Profile picture upload failed:', uploadError);
          // Continue with signup even if profile picture upload fails
        }
      }

      const response = await signUp(formData.signupEmail, formData.signupPassword, formData.signupUsername, signupMarketingConsent);
      console.log('Signup response:', response);

      if (response.data.user && !response.data.session) {
        // Email confirmation required
        console.log('Email confirmation required for user:', response.data.user.email);

        // Clear form and close modal
        setFormData(prev => ({
          ...prev,
          signupUsername: '',
          signupEmail: '',
          signupPassword: '',
          signupPasswordConfirm: '',
          signupFirstName: '',
          signupLastName: '',
          signupPhone: '',
          signupLocation: ''
        }));
        setSignupInterests([]);
        setSignupProfilePicture(null);
        setSignupProfilePicturePreview('');

        setError(''); // Clear any errors
        onClose(); // Close the modal

        // Show success message for email confirmation
        addNotification({
          type: 'success',
          title: t('auth.accountCreated'),
          message: t('auth.checkEmailForConfirmation'),
          duration: 8000
        });
      } else if (response.data.session) {
        // Auto-confirmed (if disabled in Supabase)
        console.log('Auto-confirmed signup successful');
        addNotification({
          type: 'success',
          title: t('auth.accountCreated'),
          message: t('auth.welcomeMessage'),
          duration: 5000
        });

        setActiveTab('login');
        setFormData(prev => ({
          ...prev,
          signupUsername: '',
          signupEmail: '',
          signupPassword: '',
          signupPasswordConfirm: '',
          signupFirstName: '',
          signupLastName: '',
          signupPhone: '',
          signupLocation: ''
        }));
        setSignupInterests([]);
        setSignupProfilePicture(null);
        setSignupProfilePicturePreview('');
      } else {
        // Unexpected response
        console.warn('Unexpected signup response:', response);
        setError('Account created but something went wrong. Please try logging in.');
      }
    } catch (error: any) {
      console.error('Signup error:', error);

      let errorMessage = t('auth.signupFailed');

      if (error.message?.includes('User already registered')) {
        errorMessage = t('auth.accountExists');
        setActiveTab('login');
      } else if (error.message?.includes('Password should be at least')) {
        errorMessage = t('auth.passwordMinLength');
      } else if (error.message?.includes('Invalid email')) {
        errorMessage = t('auth.invalidEmail');
      } else {
        // Show the actual error for debugging
        errorMessage = `Signup failed: ${error.message}`;
      }

      setError(errorMessage);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.resetEmail?.trim()) {
      setError(t('auth.fillAllFields'));
      return;
    }

    try {
      console.log('Attempting password reset for:', formData.resetEmail);
      await resetPassword(formData.resetEmail);
      console.log('Password reset email sent');

      addNotification({
        type: 'success',
        title: t('auth.passwordResetSent'),
        message: t('auth.passwordResetInstructions'),
        duration: 8000
      });

      setShowForgotPassword(false);
      setFormData(prev => ({ ...prev, resetEmail: '' }));
    } catch (error: any) {
      console.error('Password reset error:', error);
      setError(`Failed to send reset email: ${error.message}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.authModal}>
      <div className={styles.modalContent}>
        <button className={styles.closeButton} onClick={onClose}>
          ×
        </button>

        <div className={styles.header}>
          <h2 className={styles.title}>{t('auth.welcome') as string}</h2>
          <p className={styles.subtitle}>{t('auth.joinCommunity') as string}</p>
        </div>

        <div className={styles.tabNav}>
          <button
            onClick={() => setActiveTab('login')}
            className={`${styles.tabButton} ${activeTab === 'login' ? styles.active : ''}`}
          >
            {t('auth.login') as string}
          </button>
          <button
            onClick={() => setActiveTab('signup')}
            className={`${styles.tabButton} ${activeTab === 'signup' ? styles.active : ''}`}
          >
            {t('auth.signup') as string}
          </button>
        </div>

      {error && (
        <div className={`${styles.errorMessage} ${error.includes('successful') ? styles.success : styles.error}`}>
          {error}
        </div>
      )}



      {showForgotPassword ? (
        <form onSubmit={handleResetPassword} className={styles.form}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 10px 0', color: 'var(--text-primary)' }}>{t('auth.resetPassword')}</h3>
            <p style={{ margin: '0', fontSize: '14px', color: 'var(--text-secondary)' }}>
              {t('auth.resetPasswordDesc')}
            </p>
          </div>

          <div>
            <label htmlFor="resetEmail" className={styles.formLabel}>
              {t('auth.emailAddress')}
            </label>
            <Input
              id="resetEmail"
              type="email"
              value={formData.resetEmail}
              onChange={(e) => handleInputChange('resetEmail', e.target.value)}
              placeholder={t('auth.enterEmailAddress')}
              required
            />
          </div>

          <Box display="flex" gap={3} mt={5}>
            <Button
              variant="outline"
              onClick={() => setShowForgotPassword(false)}
              flex={1}
              size="md"
            >
              {t('auth.backToLogin')}
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              flex={1}
              size="md"
            >
              {isLoading ? t('auth.sending') : t('auth.sendResetLink')}
            </Button>
          </Box>
        </form>
      ) : activeTab === 'login' && (
        <form onSubmit={handleLogin} className={styles.form}>
          <div>
            <label htmlFor="loginEmail" className={styles.formLabel}>
              {t('auth.email') as string}
            </label>
            <input
              id="loginEmail"
              type="email"
              value={formData.loginEmail}
              onChange={(e) => handleInputChange('loginEmail', e.target.value)}
              placeholder={t('auth.enterEmail') as string}
              className={styles.formInput}
              required
            />
          </div>
          <div>
            <label htmlFor="loginPassword" className={styles.formLabel}>
              {t('auth.password') as string}
            </label>
            <input
              id="loginPassword"
              type="password"
              value={formData.loginPassword}
              onChange={(e) => handleInputChange('loginPassword', e.target.value)}
              placeholder={t('auth.enterPassword') as string}
              className={styles.formInput}
              required
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className={`${styles.submitButton} ${styles.loginButton}`}
          >
            {isLoading ? (t('auth.loggingIn') as string) : (t('auth.login') as string)}
          </button>

          <button
            type="button"
            onClick={() => setShowForgotPassword(true)}
            className={styles.forgotPasswordLink}
          >
            {t('auth.forgotPassword')}
          </button>
        </form>
      )}

      {activeTab === 'signup' && (
        <div className={styles.form}>
          {/* Profile Picture Section */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              border: '3px solid #e5e7eb',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f9fafb',
              margin: '0 auto 16px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
            }}>
              {signupProfilePicturePreview ? (
                <img
                  src={signupProfilePicturePreview}
                  alt="Profile preview"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                <i className="fas fa-user" style={{ fontSize: '40px', color: '#9ca3af' }}></i>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleProfilePictureChange}
              style={{ display: 'none' }}
              aria-label="Profile picture upload"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '2px solid #d1d5db',
                backgroundColor: 'white',
                color: '#374151',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                marginBottom: '8px'
              }}
            >
              <i className="fas fa-camera" style={{ marginRight: '8px' }}></i>
              {signupProfilePicture ? t('profile.changePhoto') : t('profile.addProfilePicture')}
            </button>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: '0' }}>
              {t('profile.uploadProfilePictureOptional')}
            </p>
          </div>

          <form onSubmit={handleSignup}>
            {/* Basic Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label htmlFor="signupFirstName" className={styles.formLabel}>
                  {t('profile.firstName')}
                </label>
                <input
                  id="signupFirstName"
                  type="text"
                  value={formData.signupFirstName}
                  onChange={(e) => handleInputChange('signupFirstName', e.target.value)}
                  placeholder={t('profile.enterFirstName')}
                  className={styles.formInput}
                  required
                />
              </div>
              <div>
                <label htmlFor="signupLastName" className={styles.formLabel}>
                  {t('profile.lastName')}
                </label>
                <input
                  id="signupLastName"
                  type="text"
                  value={formData.signupLastName}
                  onChange={(e) => handleInputChange('signupLastName', e.target.value)}
                  placeholder={t('profile.enterLastName')}
                  className={styles.formInput}
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="signupUsername" className={styles.formLabel}>
                {t('auth.username') as string}
              </label>
              <input
                id="signupUsername"
                type="text"
                value={formData.signupUsername}
                onChange={(e) => handleInputChange('signupUsername', e.target.value)}
                placeholder={t('auth.chooseUsername') as string}
                className={styles.formInput}
                required
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="signupEmail" className={styles.formLabel}>
                {t('auth.email') as string}
              </label>
              <input
                id="signupEmail"
                type="email"
                value={formData.signupEmail}
                onChange={(e) => handleInputChange('signupEmail', e.target.value)}
                placeholder={t('auth.enterEmail') as string}
                className={styles.formInput}
                required
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="signupPhone" className={styles.formLabel}>
                {t('profile.phoneNumber')}
              </label>
              <input
                id="signupPhone"
                type="tel"
                value={formData.signupPhone}
                onChange={(e) => handleInputChange('signupPhone', e.target.value)}
                placeholder={t('profile.phonePlaceholder')}
                className={styles.formInput}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="signupLocation" className={styles.formLabel}>
                {t('profile.location')}
              </label>
              <input
                id="signupLocation"
                type="text"
                value={formData.signupLocation}
                onChange={(e) => handleInputChange('signupLocation', e.target.value)}
                placeholder={t('profile.enterLocation')}
                className={styles.formInput}
              />
            </div>

            {/* Password Fields */}
            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="signupPassword" className={styles.formLabel}>
                {t('auth.password') as string}
              </label>
              <input
                id="signupPassword"
                type="password"
                value={formData.signupPassword}
                onChange={(e) => handleInputChange('signupPassword', e.target.value)}
                placeholder={t('auth.createPassword') as string}
                className={styles.formInput}
                required
              />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label htmlFor="signupPasswordConfirm" className={styles.formLabel}>
                {t('auth.confirmPassword') as string}
              </label>
              <input
                id="signupPasswordConfirm"
                type="password"
                value={formData.signupPasswordConfirm}
                onChange={(e) => handleInputChange('signupPasswordConfirm', e.target.value)}
                placeholder={t('auth.confirmPasswordPlaceholder') as string}
                className={styles.formInput}
                required
              />
            </div>

            {/* Interests Section */}
            <div style={{ marginBottom: '24px' }}>
              <label className={styles.formLabel} style={{ display: 'block', marginBottom: '12px' }}>
                {t('profile.interestsOptional')}
              </label>
              <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '16px' }}>
                {t('profile.selectActivities')}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {Object.entries(INTEREST_CATEGORIES).slice(0, 3).map(([key, category]) => (
                  <div key={key} style={{ width: '100%', marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                      {category.icon} {t(`profile.interests.categories.${key}`)}
                    </h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {category.items.slice(0, 4).map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => toggleInterest(item)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '16px',
                            border: signupInterests.includes(item) ? '2px solid #3b82f6' : '2px solid #d1d5db',
                            backgroundColor: signupInterests.includes(item) ? '#eff6ff' : 'white',
                            color: signupInterests.includes(item) ? '#1d4ed8' : '#374151',
                            fontSize: '12px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {t(`profile.interests.items.${item}`)}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Marketing Consent */}
            <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', fontSize: '14px', lineHeight: '1.5' }}>
                <input
                  type="checkbox"
                  checked={signupMarketingConsent}
                  onChange={(e) => setSignupMarketingConsent(e.target.checked)}
                  style={{ marginTop: '2px', width: '16px', height: '16px' }}
                />
                <div>
                  <strong>Stay Updated</strong>
                  <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13px' }}>
                    I'd like to receive occasional updates about new features, community highlights, and safety tips from HyperApp.
                    You can unsubscribe at any time.
                  </p>
                </div>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`${styles.submitButton} ${styles.signupButton}`}
            >
              {isLoading ? (t('auth.creatingAccount') as string) : (t('auth.signup') as string)}
            </button>
          </form>
        </div>
      )}
      </div>
    </div>
  );
};

export default AuthModal;
