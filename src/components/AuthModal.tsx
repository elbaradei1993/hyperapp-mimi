import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { authLogger } from '../lib/authLogger';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { signIn, signUp, isLoading } = useAuth();
  const { addNotification } = useNotification();
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [formData, setFormData] = useState({
    loginEmail: '',
    loginPassword: '',
    signupUsername: '',
    signupEmail: '',
    signupPassword: '',
    signupPasswordConfirm: ''
  });
  const [error, setError] = useState('');

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(''); // Clear error when user types
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    authLogger.logAuthAttempt('AuthModal.handleLogin: Form submission started', {
      email: formData.loginEmail?.toLowerCase().trim(),
      hasPassword: !!formData.loginPassword,
      emailValid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.loginEmail || '')
    });

    if (!formData.loginEmail || !formData.loginPassword) {
      authLogger.logValidationError('AuthModal.handleLogin: Form validation failed - missing fields', {
        hasEmail: !!formData.loginEmail,
        hasPassword: !!formData.loginPassword
      });
      setError(t('auth.fillAllFields') as string);
      return;
    }

    try {
      authLogger.logAuthAttempt('AuthModal.handleLogin: Calling signIn method', {
        email: formData.loginEmail.toLowerCase().trim()
      });

      const signInResponse = await signIn(formData.loginEmail, formData.loginPassword);

      // Check if signIn returned an error (some auth methods return errors instead of throwing)
      if (signInResponse?.error) {
        console.error('Sign-in response error:', signInResponse.error);
        throw new Error(signInResponse.error.message || 'Authentication failed');
      }

      authLogger.logAuthSuccess('AuthModal.handleLogin: Sign-in successful, closing modal', {
        email: formData.loginEmail.toLowerCase().trim()
      });

      onClose();
      // Reset form
      setFormData(prev => ({ ...prev, loginEmail: '', loginPassword: '' }));
    } catch (error: any) {
      authLogger.logAuthError('AuthModal.handleLogin: Sign-in failed', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        status: error.status
      }, {
        email: formData.loginEmail?.toLowerCase().trim()
      });

      // Provide more specific error messages and show toast warnings
      console.log('🔍 Error analysis - error object:', error);
      console.log('🔍 Error message:', error.message);
      console.log('🔍 Error name:', error.name);

      let errorMessage: string = t('auth.loginFailed') as string;
      let showToastWarning = false;
      let toastConfig: any = null;

      if (error.message) {
        const message = error.message.toLowerCase();

        if (message.includes('invalid login credentials') || message.includes('invalid_credentials')) {
          console.log('✅ Detected invalid credentials error');
          errorMessage = 'Please check your email and password.';
          showToastWarning = true;
          toastConfig = {
            type: 'warning' as const,
            title: 'Invalid Credentials',
            message: 'Please double-check your email and password. Try resetting your password if you\'ve forgotten it.',
            duration: 8000
          };
        } else if (message.includes('email not confirmed') || message.includes('email_confirmed_at')) {
          console.log('✅ Detected email confirmation required error');
          errorMessage = 'Please check your email for the confirmation link.';
          showToastWarning = true;
          toastConfig = {
            type: 'warning' as const,
            title: 'Email Confirmation Required',
            message: 'Please check your email and click the confirmation link before logging in.',
            duration: 10000,
            action: {
              label: 'Resend Email',
              onClick: () => {
                // TODO: Implement resend confirmation email functionality
                addNotification({
                  type: 'info',
                  title: 'Resend Feature',
                  message: 'Resend confirmation email feature will be implemented soon.',
                  duration: 3000
                });
              }
            }
          };
        } else if (message.includes('user not found') || message.includes('user_not_found')) {
          errorMessage = 'Account not found. Please sign up first.';
        } else if (message.includes('too many requests') || message.includes('rate limit')) {
          errorMessage = 'Too many login attempts. Please wait a few minutes.';
          showToastWarning = true;
          toastConfig = {
            type: 'warning' as const,
            title: 'Too Many Attempts',
            message: 'Please wait a few minutes before trying again.',
            duration: 5000
          };
        } else if (message.includes('account is disabled') || message.includes('disabled')) {
          errorMessage = 'Your account has been disabled. Please contact support.';
        } else {
          // Show the actual error message for debugging
          console.log('⚠️ Unhandled error message:', error.message);
          errorMessage = `Login failed: ${error.message}`;
        }
      }

      setError(errorMessage);

      // Show toast warning for important authentication issues
      if (showToastWarning && toastConfig) {
        console.log('🔔 Showing toast warning:', toastConfig);
        const notificationId = addNotification(toastConfig);
        console.log('🔔 Notification added with ID:', notificationId);
      }
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.signupUsername || !formData.signupEmail || !formData.signupPassword || !formData.signupPasswordConfirm) {
      authLogger.logValidationError('AuthModal.handleSignup: Form validation failed - missing fields', {
        hasUsername: !!formData.signupUsername,
        hasEmail: !!formData.signupEmail,
        hasPassword: !!formData.signupPassword,
        hasPasswordConfirm: !!formData.signupPasswordConfirm
      });
      setError(t('auth.fillAllFields') as string);
      return;
    }

    if (formData.signupPassword !== formData.signupPasswordConfirm) {
      authLogger.logValidationError('AuthModal.handleSignup: Password confirmation mismatch', {
        passwordLength: formData.signupPassword.length,
        confirmLength: formData.signupPasswordConfirm.length
      });
      setError(t('auth.passwordsNotMatch') as string);
      return;
    }

    if (formData.signupPassword.length < 6) {
      authLogger.logValidationError('AuthModal.handleSignup: Password too short', {
        passwordLength: formData.signupPassword.length,
        requiredLength: 6
      });
      setError(t('auth.passwordTooShort') as string);
      return;
    }

    try {
      const response = await signUp(formData.signupEmail, formData.signupPassword, formData.signupUsername);

      if (response.error) {
        console.error('Sign-up response error:', response.error);
        throw new Error(response.error.message || 'Signup failed');
      }

      // Check if email confirmation is required
      if (response.data?.user && !response.data.user.email_confirmed_at) {
        setError(t('auth.signupSuccessConfirmEmail') as string);
        addNotification({
          type: 'info',
          title: t('auth.emailConfirmationRequired') as string,
          message: t('auth.checkEmailForConfirmation') as string,
          duration: 10000
        });
      } else {
        // Show general success message if no confirmation is needed or already confirmed
        setError(t('auth.signupSuccessful') as string);
      }

      // Switch to login tab
      setActiveTab('login');

      // Reset form
      setFormData(prev => ({
        ...prev,
        signupUsername: '',
        signupEmail: '',
        signupPassword: '',
        signupPasswordConfirm: ''
      }));
    } catch (error: any) {
      authLogger.logAuthError('AuthModal.handleSignup: Sign-up failed', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        status: error.status
      }, {
        email: formData.signupEmail?.toLowerCase().trim()
      });
      setError(error.message || (t('auth.signupFailed') as string));
    }
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
        backgroundColor: 'var(--bg-primary)',
        borderRadius: '12px',
        padding: '32px',
        maxWidth: '400px',
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: 'var(--shadow-color)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: 'var(--text-primary)',
            marginBottom: '8px'
          }}>
            {t('auth.welcome') as string}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '16px' }}>
            {t('auth.joinCommunity') as string}
          </p>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          marginBottom: '24px',
          borderRadius: '8px',
          overflow: 'hidden',
          border: '1px solid var(--border-color)'
        }}>
          <button
            onClick={() => setActiveTab('login')}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: activeTab === 'login' ? 'var(--accent-primary)' : 'var(--bg-primary)',
              color: activeTab === 'login' ? 'white' : 'var(--text-primary)',
              border: 'none',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            {t('auth.login') as string}
          </button>
          <button
            onClick={() => setActiveTab('signup')}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: activeTab === 'signup' ? 'var(--accent-primary)' : 'var(--bg-primary)',
              color: activeTab === 'signup' ? 'white' : 'var(--text-primary)',
              border: 'none',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            {t('auth.signup') as string}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            padding: '12px',
            marginBottom: '16px',
            borderRadius: '8px',
            backgroundColor: error.includes('successful') ? '#d1fae5' : '#fee2e2',
            border: `1px solid ${error.includes('successful') ? '#a7f3d0' : '#fecaca'}`,
            color: error.includes('successful') ? '#065f46' : '#991b1b',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        {/* Login Form */}
        {activeTab === 'login' && (
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: 'var(--text-secondary)',
                marginBottom: '4px'
              }}>
                {t('auth.email') as string}
              </label>
              <input
                type="email"
                value={formData.loginEmail}
                onChange={(e) => handleInputChange('loginEmail', e.target.value)}
                placeholder={t('auth.enterEmail') as string}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: 'var(--text-secondary)',
                marginBottom: '4px'
              }}>
                {t('auth.password') as string}
              </label>
              <input
                type="password"
                value={formData.loginPassword}
                onChange={(e) => handleInputChange('loginPassword', e.target.value)}
                placeholder={t('auth.enterPassword') as string}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'var(--accent-primary)',
                color: 'white',
                fontSize: '16px',
                fontWeight: '500',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.5 : 1
              }}
            >
              {isLoading ? (t('auth.loggingIn') as string) : (t('auth.login') as string)}
            </button>
          </form>
        )}

        {/* Signup Form */}
        {activeTab === 'signup' && (
          <form onSubmit={handleSignup}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: 'var(--text-secondary)',
                marginBottom: '4px'
              }}>
                {t('auth.username') as string}
              </label>
              <input
                type="text"
                value={formData.signupUsername}
                onChange={(e) => handleInputChange('signupUsername', e.target.value)}
                placeholder={t('auth.chooseUsername') as string}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: 'var(--text-secondary)',
                marginBottom: '4px'
              }}>
                {t('auth.email') as string}
              </label>
              <input
                type="email"
                value={formData.signupEmail}
                onChange={(e) => handleInputChange('signupEmail', e.target.value)}
                placeholder={t('auth.enterEmail') as string}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: 'var(--text-secondary)',
                marginBottom: '4px'
              }}>
                {t('auth.password') as string}
              </label>
              <input
                type="password"
                value={formData.signupPassword}
                onChange={(e) => handleInputChange('signupPassword', e.target.value)}
                placeholder={t('auth.createPassword') as string}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: 'var(--text-secondary)',
                marginBottom: '4px'
              }}>
                {t('auth.confirmPassword') as string}
              </label>
              <input
                type="password"
                value={formData.signupPasswordConfirm}
                onChange={(e) => handleInputChange('signupPasswordConfirm', e.target.value)}
                placeholder={t('auth.confirmPasswordPlaceholder') as string}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'var(--success)',
                color: 'white',
                fontSize: '16px',
                fontWeight: '500',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.5 : 1
              }}
            >
              {isLoading ? (t('auth.creatingAccount') as string) : (t('auth.signup') as string)}
            </button>
          </form>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: 'var(--text-muted)'
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default AuthModal;
