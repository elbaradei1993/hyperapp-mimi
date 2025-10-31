import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { signIn, signUp, isLoading } = useAuth();
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

    if (!formData.loginEmail || !formData.loginPassword) {
      setError(t('auth.fillAllFields'));
      return;
    }

    try {
      await signIn(formData.loginEmail, formData.loginPassword);
      onClose();
      // Reset form
      setFormData(prev => ({ ...prev, loginEmail: '', loginPassword: '' }));
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.message || t('auth.loginFailed'));
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.signupUsername || !formData.signupEmail || !formData.signupPassword || !formData.signupPasswordConfirm) {
      setError(t('auth.fillAllFields'));
      return;
    }

    if (formData.signupPassword !== formData.signupPasswordConfirm) {
      setError(t('auth.passwordsNotMatch'));
      return;
    }

    if (formData.signupPassword.length < 6) {
      setError(t('auth.passwordTooShort'));
      return;
    }

    try {
      await signUp(formData.signupEmail, formData.signupPassword, formData.signupUsername);
      setError(t('auth.signupSuccessful'));
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
      console.error('Signup error:', error);
      setError(error.message || t('auth.signupFailed'));
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
            {t('auth.welcome')}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '16px' }}>
            {t('auth.joinCommunity')}
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
            {t('auth.login')}
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
            {t('auth.signup')}
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
                {t('auth.email')}
              </label>
              <input
                type="email"
                value={formData.loginEmail}
                onChange={(e) => handleInputChange('loginEmail', e.target.value)}
                placeholder={t('auth.enterEmail')}
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
                {t('auth.password')}
              </label>
              <input
                type="password"
                value={formData.loginPassword}
                onChange={(e) => handleInputChange('loginPassword', e.target.value)}
                placeholder={t('auth.enterPassword')}
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
              {isLoading ? t('auth.loggingIn') : t('auth.login')}
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
                {t('auth.username')}
              </label>
              <input
                type="text"
                value={formData.signupUsername}
                onChange={(e) => handleInputChange('signupUsername', e.target.value)}
                placeholder={t('auth.chooseUsername')}
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
                {t('auth.email')}
              </label>
              <input
                type="email"
                value={formData.signupEmail}
                onChange={(e) => handleInputChange('signupEmail', e.target.value)}
                placeholder={t('auth.enterEmail')}
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
                {t('auth.password')}
              </label>
              <input
                type="password"
                value={formData.signupPassword}
                onChange={(e) => handleInputChange('signupPassword', e.target.value)}
                placeholder={t('auth.createPassword')}
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
                {t('auth.confirmPassword')}
              </label>
              <input
                type="password"
                value={formData.signupPasswordConfirm}
                onChange={(e) => handleInputChange('signupPasswordConfirm', e.target.value)}
                placeholder={t('auth.confirmPasswordPlaceholder')}
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
              {isLoading ? t('auth.creatingAccount') : t('auth.signup')}
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
