import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './shared';

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-primary)] rounded-2xl p-6 sm:p-8 max-w-md w-full max-h-[90vh] overflow-auto shadow-[0_8px_32px_var(--shadow-color)] border border-[var(--border-color)]/20">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
            {t('auth.welcome')}
          </h2>
          <p className="text-[var(--text-muted)] text-base">
            {t('auth.joinCommunity')}
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex mb-6 rounded-xl overflow-hidden border border-[var(--border-color)] shadow-[0_2px_8px_var(--shadow-color)]">
          <button
            onClick={() => setActiveTab('login')}
            className={`flex-1 px-4 sm:px-6 py-3 text-sm sm:text-base font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2 min-h-[44px] touch-manipulation ${
              activeTab === 'login'
                ? 'bg-gradient-to-r from-[var(--accent-primary)] to-[color-mix(in srgb, var(--accent-primary) 90%, black)] text-white shadow-[0_4px_12px_var(--shadow-color)]'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[color-mix(in srgb, var(--bg-tertiary) 110%, white)] hover:text-[var(--text-primary)]'
            }`}
          >
            {t('auth.login')}
          </button>
          <button
            onClick={() => setActiveTab('signup')}
            className={`flex-1 px-4 sm:px-6 py-3 text-sm sm:text-base font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-2 min-h-[44px] touch-manipulation ${
              activeTab === 'signup'
                ? 'bg-gradient-to-r from-[var(--accent-primary)] to-[color-mix(in srgb, var(--accent-primary) 90%, black)] text-white shadow-[0_4px_12px_var(--shadow-color)]'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[color-mix(in srgb, var(--bg-tertiary) 110%, white)] hover:text-[var(--text-primary)]'
            }`}
          >
            {t('auth.signup')}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className={`p-3 mb-4 rounded-lg border text-sm ${
            error.includes('successful')
              ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-700 dark:text-green-300'
              : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-700 dark:text-red-300'
          }`}>
            {error}
          </div>
        )}

        {/* Login Form */}
        {activeTab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                {t('auth.email')}
              </label>
              <input
                type="email"
                value={formData.loginEmail}
                onChange={(e) => handleInputChange('loginEmail', e.target.value)}
                placeholder={t('auth.enterEmail')}
                required
                className="w-full px-3 py-3 border border-[var(--border-color)] rounded-lg text-base bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                {t('auth.password')}
              </label>
              <input
                type="password"
                value={formData.loginPassword}
                onChange={(e) => handleInputChange('loginPassword', e.target.value)}
                placeholder={t('auth.enterPassword')}
                required
                className="w-full px-3 py-3 border border-[var(--border-color)] rounded-lg text-base bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent transition-colors"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              loading={isLoading}
              fullWidth
              variant="primary"
              size="mobile-md"
            >
              {isLoading ? t('auth.loggingIn') : t('auth.login')}
            </Button>
          </form>
        )}

        {/* Signup Form */}
        {activeTab === 'signup' && (
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                {t('auth.username')}
              </label>
              <input
                type="text"
                value={formData.signupUsername}
                onChange={(e) => handleInputChange('signupUsername', e.target.value)}
                placeholder={t('auth.chooseUsername')}
                required
                className="w-full px-3 py-3 border border-[var(--border-color)] rounded-lg text-base bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                {t('auth.email')}
              </label>
              <input
                type="email"
                value={formData.signupEmail}
                onChange={(e) => handleInputChange('signupEmail', e.target.value)}
                placeholder={t('auth.enterEmail')}
                required
                className="w-full px-3 py-3 border border-[var(--border-color)] rounded-lg text-base bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                {t('auth.password')}
              </label>
              <input
                type="password"
                value={formData.signupPassword}
                onChange={(e) => handleInputChange('signupPassword', e.target.value)}
                placeholder={t('auth.createPassword')}
                required
                className="w-full px-3 py-3 border border-[var(--border-color)] rounded-lg text-base bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                {t('auth.confirmPassword')}
              </label>
              <input
                type="password"
                value={formData.signupPasswordConfirm}
                onChange={(e) => handleInputChange('signupPasswordConfirm', e.target.value)}
                placeholder={t('auth.confirmPasswordPlaceholder')}
                required
                className="w-full px-3 py-3 border border-[var(--border-color)] rounded-lg text-base bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent transition-colors"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              loading={isLoading}
              fullWidth
              variant="success"
              size="mobile-md"
            >
              {isLoading ? t('auth.creatingAccount') : t('auth.signup')}
            </Button>
          </form>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-xl"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default AuthModal;
