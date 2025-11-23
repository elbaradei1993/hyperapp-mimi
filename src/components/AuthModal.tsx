import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { Button, Box, IconButton } from '@chakra-ui/react';
import { X } from 'lucide-react';
import styles from './AuthModal.module.css';
import Input from './shared/Input';
import Modal from './shared/Modal';

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
    resetEmail: ''
  });
  const [error, setError] = useState('');

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
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

      let errorMessage = 'Login failed. Please check your credentials.';

      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password. Please try again.';
      } else if (error.message?.includes('Email not confirmed')) {
        errorMessage = 'Please check your email and confirm your account.';
      } else if (error.message?.includes('User not found')) {
        errorMessage = 'Account not found. Please sign up first.';
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

    if (!formData.signupUsername || !formData.signupEmail || !formData.signupPassword || !formData.signupPasswordConfirm) {
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
      await signUp(formData.signupEmail, formData.signupPassword, formData.signupUsername);
      console.log('Signup successful');

      addNotification({
        type: 'success',
        title: 'Account Created Successfully!',
        message: 'You can now log in with your email and password.',
        duration: 5000
      });

      setActiveTab('login');
      setFormData(prev => ({
        ...prev,
        signupUsername: '',
        signupEmail: '',
        signupPassword: '',
        signupPasswordConfirm: ''
      }));
    } catch (error: any) {
      console.error('Signup error:', error);

      let errorMessage = 'Signup failed. Please try again.';

      if (error.message?.includes('User already registered')) {
        errorMessage = 'An account with this email already exists. Please try logging in instead.';
        setActiveTab('login');
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
      setError('Please enter your email address.');
      return;
    }

    try {
      console.log('Attempting password reset for:', formData.resetEmail);
      await resetPassword(formData.resetEmail);
      console.log('Password reset email sent');

      addNotification({
        type: 'success',
        title: 'Password Reset Email Sent',
        message: 'Check your email for instructions to reset your password.',
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

      {/* Google Sign In Button */}
      {!showForgotPassword && (
        <>
          <button
            type="button"
            onClick={() => signInWithGoogle()}
            disabled={isLoading}
            className={styles.googleButton}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className={styles.divider}>
            <span>or</span>
          </div>
        </>
      )}

      {showForgotPassword ? (
        <form onSubmit={handleResetPassword} className={styles.form}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 10px 0', color: 'var(--text-primary)' }}>Reset Password</h3>
            <p style={{ margin: '0', fontSize: '14px', color: 'var(--text-secondary)' }}>
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          <div>
            <label htmlFor="resetEmail" className={styles.formLabel}>
              Email Address
            </label>
            <Input
              id="resetEmail"
              type="email"
              value={formData.resetEmail}
              onChange={(e) => handleInputChange('resetEmail', e.target.value)}
              placeholder="Enter your email address"
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
              Back to Login
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              flex={1}
              size="md"
            >
              {isLoading ? 'Sending...' : 'Send Reset Link'}
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
            Forgot your password?
          </button>
        </form>
      )}

      {activeTab === 'signup' && (
        <form onSubmit={handleSignup} className={styles.form}>
          <div>
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
          <div>
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
          <div>
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
          <div>
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
          <button
            type="submit"
            disabled={isLoading}
            className={`${styles.submitButton} ${styles.signupButton}`}
          >
            {isLoading ? (t('auth.creatingAccount') as string) : (t('auth.signup') as string)}
          </button>
        </form>
      )}
      </div>
    </div>
  );
};

export default AuthModal;
