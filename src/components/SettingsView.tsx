import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { authService } from '../services/auth';
import type { Theme } from '../contexts/ThemeContext';

const SettingsView: React.FC = () => {
  const { t } = useTranslation();
  const { user, signOut, updateProfile } = useAuth();
  const { theme, toggleTheme, setTheme } = useTheme();
  const { currentLanguage, changeLanguage } = useLanguage();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [notifications, setNotifications] = useState(true);
  const [locationSharing, setLocationSharing] = useState(true);
  const [loading, setLoading] = useState(false);

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'ar', name: 'العربية' }
  ];

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert(t('settings.passwordsNotMatch'));
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      alert(t('settings.passwordTooShort'));
      return;
    }

    setLoading(true);
    try {
      const { error } = await authService.updatePassword(passwordForm.newPassword);
      if (error) {
        alert('Error updating password: ' + error.message);
      } else {
        alert('Password updated successfully!');
        setShowPasswordModal(false);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (error) {
      alert('Error updating password');
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = async (language: string) => {
    await changeLanguage(language, updateProfile, user);
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    const confirmDelete = window.confirm(
      t('settings.deleteConfirmMessage')
    );

    if (!confirmDelete) return;

    setLoading(true);
    try {
      const { error } = await authService.deleteAccount(user.id);
      if (error) {
        alert('Error deleting account: ' + error.message);
      } else {
        alert('Account deleted successfully. You will be logged out.');
        await signOut();
      }
    } catch (error) {
      alert('Error deleting account');
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
    }
  };

  const handleExportData = () => {
    if (!user) return;

    // Create a simple data export (in a real app, this would fetch all user data)
    const userData = {
      profile: {
        id: user.id,
        email: user.email,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        interests: user.interests,
        reputation: user.reputation,
        language: user.language,
        created_at: user.created_at
      },
      exportDate: new Date().toISOString(),
      appVersion: '1.0.0'
    };

    const dataStr = JSON.stringify(userData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `hyperapp-data-${user.id}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{
      padding: '20px',
      maxWidth: '600px',
      margin: '0 auto',
      backgroundColor: 'var(--bg-secondary)',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{
        textAlign: 'center',
        marginBottom: '32px'
      }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: 'bold',
          color: 'var(--text-primary)',
          marginBottom: '8px'
        }}>
          {t('settings.title')}
        </h1>
        <p style={{
          color: 'var(--text-muted)',
          fontSize: '16px'
        }}>
          {t('settings.subtitle')}
        </p>
      </div>

      {/* Account Management Section */}
      <div style={{
        backgroundColor: 'var(--bg-primary)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px var(--shadow-color)'
      }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: 'bold',
          color: 'var(--text-primary)',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <i className="fas fa-user-cog" style={{ color: 'var(--accent-primary)' }}></i>
          {t('settings.accountManagement')}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Change Password */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px',
            border: '1px solid var(--border-color)',
            borderRadius: '8px'
          }}>
            <div>
              <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                {t('settings.changePassword')}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                {t('settings.updatePassword')}
              </div>
            </div>
            <button
              onClick={() => setShowPasswordModal(true)}
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              {t('settings.change')}
            </button>
          </div>

          {/* Logout */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px',
            border: '1px solid var(--border-color)',
            borderRadius: '8px'
          }}>
            <div>
              <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                {t('auth.logout')}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                {t('settings.signOut')}
              </div>
            </div>
            <button
              onClick={handleLogout}
              style={{
                backgroundColor: 'var(--warning)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              {t('auth.logout')}
            </button>
          </div>

          {/* Delete Account */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px',
            border: '1px solid var(--danger)',
            borderRadius: '8px',
            backgroundColor: 'rgba(239, 68, 68, 0.05)'
          }}>
            <div>
              <div style={{ fontWeight: '600', color: 'var(--danger)', marginBottom: '4px' }}>
                {t('settings.deleteAccount')}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                {t('settings.deleteAccountDesc')}
              </div>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              style={{
                backgroundColor: 'var(--danger)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              {t('settings.deleteAccount')}
            </button>
          </div>
        </div>
      </div>

      {/* App Preferences Section */}
      <div style={{
        backgroundColor: 'var(--bg-primary)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px var(--shadow-color)'
      }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: 'bold',
          color: 'var(--text-primary)',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <i className="fas fa-sliders-h" style={{ color: 'var(--accent-primary)' }}></i>
          {t('settings.appPreferences')}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Language Selection */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px',
            border: '1px solid var(--border-color)',
            borderRadius: '8px'
          }}>
            <div>
              <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                {t('settings.language')}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                {t('settings.chooseLanguage')}
              </div>
            </div>
            <select
              value={currentLanguage}
              onChange={(e) => handleLanguageChange(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '14px'
              }}
            >
              {languages.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          {/* Theme Toggle */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px',
            border: '1px solid var(--border-color)',
            borderRadius: '8px'
          }}>
            <div>
              <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                {t('settings.theme')}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                {t('settings.switchTheme')}
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxWidth: '200px' }}>
              <button
                onClick={() => setTheme('light')}
                style={{
                  backgroundColor: theme === 'light' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                  color: theme === 'light' ? 'white' : 'var(--text-primary)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px'
                }}
              >
                <i className="fas fa-sun"></i>
                {t('settings.light')}
              </button>
              <button
                onClick={() => setTheme('dark')}
                style={{
                  backgroundColor: theme === 'dark' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                  color: theme === 'dark' ? 'white' : 'var(--text-primary)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px'
                }}
              >
                <i className="fas fa-moon"></i>
                {t('settings.dark')}
              </button>
              <button
                onClick={() => setTheme('high-contrast')}
                style={{
                  backgroundColor: theme === 'high-contrast' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                  color: theme === 'high-contrast' ? 'white' : 'var(--text-primary)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px'
                }}
              >
                <i className="fas fa-eye"></i>
                HC
              </button>
              <button
                onClick={() => setTheme('system')}
                style={{
                  backgroundColor: theme === 'system' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                  color: theme === 'system' ? 'white' : 'var(--text-primary)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px'
                }}
              >
                <i className="fas fa-desktop"></i>
                Auto
              </button>
            </div>
          </div>

          {/* Notifications */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px',
            border: '1px solid var(--border-color)',
            borderRadius: '8px'
          }}>
            <div>
              <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                {t('settings.notifications')}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                {t('settings.receiveNotifications')}
              </div>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '24px' }}>
              <input
                type="checkbox"
                checked={notifications}
                onChange={(e) => setNotifications(e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute',
                cursor: 'pointer',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: notifications ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                transition: '0.4s',
                borderRadius: '24px'
              }}>
                <span style={{
                  position: 'absolute',
                  height: '18px',
                  width: '18px',
                  left: notifications ? '28px' : '3px',
                  bottom: '3px',
                  backgroundColor: 'white',
                  transition: '0.4s',
                  borderRadius: '50%'
                }}></span>
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Privacy & Security Section */}
      <div style={{
        backgroundColor: 'var(--bg-primary)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px var(--shadow-color)'
      }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: 'bold',
          color: 'var(--text-primary)',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <i className="fas fa-shield-alt" style={{ color: 'var(--accent-primary)' }}></i>
          {t('settings.privacySecurity')}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Location Sharing */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px',
            border: '1px solid var(--border-color)',
            borderRadius: '8px'
          }}>
            <div>
              <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                {t('settings.locationSharing')}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                {t('settings.allowLocation')}
              </div>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '24px' }}>
              <input
                type="checkbox"
                checked={locationSharing}
                onChange={(e) => setLocationSharing(e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute',
                cursor: 'pointer',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: locationSharing ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                transition: '0.4s',
                borderRadius: '24px'
              }}>
                <span style={{
                  position: 'absolute',
                  height: '18px',
                  width: '18px',
                  left: locationSharing ? '28px' : '3px',
                  bottom: '3px',
                  backgroundColor: 'white',
                  transition: '0.4s',
                  borderRadius: '50%'
                }}></span>
              </span>
            </label>
          </div>

          {/* Export Data */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px',
            border: '1px solid var(--border-color)',
            borderRadius: '8px'
          }}>
            <div>
              <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                {t('settings.exportData')}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                {t('settings.downloadData')}
              </div>
            </div>
            <button
              onClick={handleExportData}
              style={{
                backgroundColor: 'var(--accent-secondary)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              {t('common.export')}
            </button>
          </div>
        </div>
      </div>

      {/* About & Support Section */}
      <div style={{
        backgroundColor: 'var(--bg-primary)',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 1px 3px var(--shadow-color)'
      }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: 'bold',
          color: 'var(--text-primary)',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <i className="fas fa-info-circle" style={{ color: 'var(--accent-primary)' }}></i>
          {t('settings.aboutSupport')}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* App Version */}
          <div style={{
            padding: '16px',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
              {t('settings.version')}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
              {t('settings.communitySafety')}
            </div>
          </div>

          {/* Support Links */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <button
              onClick={() => window.open('https://example.com/help', '_blank')}
              style={{
                padding: '12px',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <i className="fas fa-question-circle"></i>
              {t('settings.help')}
            </button>
            <button
              onClick={() => window.open('https://example.com/privacy', '_blank')}
              style={{
                padding: '12px',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <i className="fas fa-file-contract"></i>
              {t('settings.privacy')}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <button
              onClick={() => window.open('https://example.com/terms', '_blank')}
              style={{
                padding: '12px',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <i className="fas fa-gavel"></i>
              {t('settings.terms')}
            </button>
            <button
              onClick={() => window.open('mailto:support@example.com', '_blank')}
              style={{
                padding: '12px',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <i className="fas fa-envelope"></i>
              {t('settings.contact')}
            </button>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
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
          zIndex: 2000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-primary)',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '400px',
            width: '100%'
          }}>
            <h3 style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: 'var(--text-primary)',
              marginBottom: '20px'
            }}>
              Change Password
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'var(--text-secondary)',
                  marginBottom: '4px'
                }}>
                  New Password
                </label>
                <input
                  type="password"
                  placeholder="Enter new password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '16px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'var(--text-secondary)',
                  marginBottom: '4px'
                }}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '16px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button
                  onClick={() => setShowPasswordModal(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '16px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handlePasswordChange}
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: 'none',
                    borderRadius: '8px',
                    backgroundColor: 'var(--accent-primary)',
                    color: 'white',
                    fontSize: '16px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
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
          zIndex: 2000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-primary)',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '400px',
            width: '100%'
          }}>
            <h3 style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: 'var(--danger)',
              marginBottom: '16px'
            }}>
              ⚠️ Delete Account
            </h3>

            <p style={{
              color: 'var(--text-secondary)',
              marginBottom: '20px',
              lineHeight: '1.5'
            }}>
              This action cannot be undone. All your reports, votes, profile data, and account information will be permanently deleted.
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowDeleteModal(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '16px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: 'var(--danger)',
                  color: 'white',
                  fontSize: '16px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1
                }}
              >
                {loading ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;
