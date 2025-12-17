import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { authService } from '../services/auth';
import { Button, Box, Flex, Grid, Text, VStack, HStack } from '@chakra-ui/react';
import ToggleSwitch from './shared/ToggleSwitch';
import PrivacyPolicyModal from './PrivacyPolicyModal';
import TermsOfServiceModal from './TermsOfServiceModal';

const SettingsView: React.FC = () => {
  const { t } = useTranslation();
  const { user, signOut, updateProfile } = useAuth();
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
  const [showPrivacyPolicyModal, setShowPrivacyPolicyModal] = useState(false);
  const [showTermsOfServiceModal, setShowTermsOfServiceModal] = useState(false);

  const languages = [
    { code: 'en', name: 'English' },
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
      padding: 'var(--space-2)',
      maxWidth: '600px',
      margin: '0 auto',
      backgroundColor: 'var(--bg-secondary)',
      minHeight: '100vh',
      paddingBottom: '100px', // Extra padding for mobile scrolling
      background: 'linear-gradient(135deg, var(--bg-secondary) 0%, rgba(var(--bg-primary-rgb), 0.95) 100%)'
    }}
    className="settings-container">
      {/* Header */}
      <div style={{
        textAlign: 'center',
        marginBottom: 'var(--space-5)',
        padding: 'var(--space-3) var(--space-2)',
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(20px)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--bg-glass-border)',
        boxShadow: 'var(--shadow-lg)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'var(--brand-gradient)',
          opacity: 0.03,
          pointerEvents: 'none'
        }}></div>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '700',
          color: 'var(--text-primary)',
          marginBottom: 'var(--space-1)',
          letterSpacing: '-0.025em',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale'
        }}>
          {t('settings.title')}
        </h1>
        <p style={{
          color: 'var(--text-muted)',
          fontSize: '16px',
          fontWeight: '400',
          lineHeight: '1.5',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale'
        }}>
          {t('settings.subtitle')}
        </p>
      </div>

      {/* Account Management Section */}
      <div style={{
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(20px)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4)',
        marginBottom: 'var(--space-4)',
        boxShadow: 'var(--shadow-xl)',
        border: '1px solid var(--bg-glass-border)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, rgba(var(--accent-primary-rgb), 0.02) 0%, rgba(var(--accent-secondary-rgb), 0.02) 100%)',
          pointerEvents: 'none'
        }}></div>
        <h2 style={{
          fontSize: '22px',
          fontWeight: '700',
          color: 'var(--text-primary)',
          marginBottom: 'var(--space-3)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          letterSpacing: '-0.01em',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--brand-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
          }}>
            <i className="fas fa-user-cog" style={{
              color: 'white',
              fontSize: '16px',
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale'
            }}></i>
          </div>
          {t('settings.accountManagement')}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', position: 'relative', zIndex: 1 }}>
          {/* Change Password */}
          <button
            onClick={() => setShowPasswordModal(true)}
            style={{
              width: '100%',
              background: 'var(--brand-gradient)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-3) var(--space-5)',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              height: 'var(--touch-target)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              whiteSpace: 'nowrap',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 4px 16px rgba(59, 130, 246, 0.3)',
              position: 'relative',
              overflow: 'hidden',
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale',
              WebkitTapHighlightColor: 'transparent'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(59, 130, 246, 0.3)';
            }}
          >
            <i className="fas fa-key" style={{ marginRight: 'var(--space-2)', fontSize: '14px' }}></i>
            {t('settings.changePasswordButton')}
          </button>

          {/* Delete Account */}
          <button
            onClick={() => setShowDeleteModal(true)}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, var(--danger) 0%, rgba(239, 68, 68, 0.8) 100%)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-3) var(--space-5)',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              height: 'var(--touch-target)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              whiteSpace: 'nowrap',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 4px 16px rgba(239, 68, 68, 0.3)',
              position: 'relative',
              overflow: 'hidden',
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale',
              WebkitTapHighlightColor: 'transparent'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(239, 68, 68, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(239, 68, 68, 0.3)';
            }}
          >
            <i className="fas fa-trash-alt" style={{ marginRight: 'var(--space-2)', fontSize: '14px' }}></i>
            {t('settings.deleteAccountButton')}
          </button>
        </div>
      </div>

      {/* App Preferences Section */}
      <div style={{
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(20px)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4)',
        marginBottom: 'var(--space-4)',
        boxShadow: 'var(--shadow-xl)',
        border: '1px solid var(--bg-glass-border)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, rgba(var(--accent-secondary-rgb), 0.02) 0%, rgba(var(--accent-primary-rgb), 0.02) 100%)',
          pointerEvents: 'none'
        }}></div>
        <h2 style={{
          fontSize: '22px',
          fontWeight: '700',
          color: 'var(--text-primary)',
          marginBottom: 'var(--space-3)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          letterSpacing: '-0.01em',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--brand-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
          }}>
            <i className="fas fa-sliders-h" style={{
              color: 'white',
              fontSize: '16px',
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale'
            }}></i>
          </div>
          {t('settings.appPreferences')}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', position: 'relative', zIndex: 1 }}>
          {/* Language Selection */}
          <div style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3)',
            transition: 'all 0.2s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = 'var(--shadow-md)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontWeight: '600',
                  color: 'var(--text-primary)',
                  marginBottom: 'var(--space-1)',
                  fontSize: '16px',
                  WebkitFontSmoothing: 'antialiased',
                  MozOsxFontSmoothing: 'grayscale'
                }}>
                  <i className="fas fa-globe" style={{
                    marginRight: 'var(--space-2)',
                    color: 'var(--accent-primary)',
                    fontSize: '14px'
                  }}></i>
                  {t('settings.language')}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: 'var(--text-muted)',
                  WebkitFontSmoothing: 'antialiased',
                  MozOsxFontSmoothing: 'grayscale'
                }}>
                  {t('settings.chooseLanguage')}
                </div>
              </div>
              <select
                value={currentLanguage}
                onChange={(e) => handleLanguageChange(e.target.value)}
                aria-label={t('settings.language')}
                style={{
                  padding: 'var(--space-2) var(--space-3)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  minWidth: '120px',
                  WebkitFontSmoothing: 'antialiased',
                  MozOsxFontSmoothing: 'grayscale',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none',
                  backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6,9 12,15 18,9\'%3e%3c/polyline%3e%3c/svg%3e")',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right var(--space-2) center',
                  backgroundSize: '16px',
                  paddingRight: 'var(--space-5)'
                }}
              >
                {languages.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>
          </div>



          {/* Notifications */}
          <div style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3)',
            transition: 'all 0.2s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = 'var(--shadow-md)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontWeight: '600',
                  color: 'var(--text-primary)',
                  marginBottom: 'var(--space-1)',
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  WebkitFontSmoothing: 'antialiased',
                  MozOsxFontSmoothing: 'grayscale'
                }}>
                  <i className="fas fa-bell" style={{
                    color: 'var(--accent-primary)',
                    fontSize: '14px'
                  }}></i>
                  {t('settings.notifications')}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: 'var(--text-muted)',
                  WebkitFontSmoothing: 'antialiased',
                  MozOsxFontSmoothing: 'grayscale'
                }}>
                  {t('settings.receiveNotifications')}
                </div>
              </div>
              <label style={{
                position: 'relative',
                display: 'inline-block',
                width: 'var(--touch-target)',
                height: '28px',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={notifications}
                  onChange={(e) => setNotifications(e.target.checked)}
                  aria-label={t('settings.notifications')}
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
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  borderRadius: '14px',
                  border: '2px solid transparent'
                }}>
                  <span style={{
                    position: 'absolute',
                    height: '20px',
                    width: '20px',
                    left: notifications ? 'calc(100% - 24px)' : '2px',
                    top: '2px',
                    backgroundColor: 'white',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    borderRadius: '50%',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                  }}></span>
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Privacy & Security Section */}
      <div style={{
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(20px)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4)',
        marginBottom: 'var(--space-4)',
        boxShadow: 'var(--shadow-xl)',
        border: '1px solid var(--bg-glass-border)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, rgba(var(--success-rgb), 0.02) 0%, rgba(var(--warning-rgb), 0.02) 100%)',
          pointerEvents: 'none'
        }}></div>
        <h2 style={{
          fontSize: '22px',
          fontWeight: '700',
          color: 'var(--text-primary)',
          marginBottom: 'var(--space-3)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          letterSpacing: '-0.01em',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, var(--success) 0%, var(--warning) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)'
          }}>
            <i className="fas fa-shield-alt" style={{
              color: 'white',
              fontSize: '16px',
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale'
            }}></i>
          </div>
          {t('settings.privacySecurity')}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', position: 'relative', zIndex: 1 }}>
          {/* Location Sharing */}
          <div style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3)',
            transition: 'all 0.2s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = 'var(--shadow-md)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontWeight: '600',
                  color: 'var(--text-primary)',
                  marginBottom: 'var(--space-1)',
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  WebkitFontSmoothing: 'antialiased',
                  MozOsxFontSmoothing: 'grayscale'
                }}>
                  <i className="fas fa-map-marker-alt" style={{
                    color: 'var(--accent-primary)',
                    fontSize: '14px'
                  }}></i>
                  {t('settings.locationSharing')}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: 'var(--text-muted)',
                  WebkitFontSmoothing: 'antialiased',
                  MozOsxFontSmoothing: 'grayscale'
                }}>
                  {t('settings.allowLocation')}
                </div>
              </div>
              <label style={{
                position: 'relative',
                display: 'inline-block',
                width: 'var(--touch-target)',
                height: '28px',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={locationSharing}
                  onChange={(e) => setLocationSharing(e.target.checked)}
                  aria-label={t('settings.locationSharing')}
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
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  borderRadius: '14px',
                  border: '2px solid transparent'
                }}>
                  <span style={{
                    position: 'absolute',
                    height: '20px',
                    width: '20px',
                    left: locationSharing ? 'calc(100% - 24px)' : '2px',
                    top: '2px',
                    backgroundColor: 'white',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    borderRadius: '50%',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                  }}></span>
                </span>
              </label>
            </div>
          </div>

          {/* Export Data */}
          <div style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3)',
            transition: 'all 0.2s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = 'var(--shadow-md)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontWeight: '600',
                  color: 'var(--text-primary)',
                  marginBottom: 'var(--space-1)',
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  WebkitFontSmoothing: 'antialiased',
                  MozOsxFontSmoothing: 'grayscale'
                }}>
                  <i className="fas fa-download" style={{
                    color: 'var(--accent-primary)',
                    fontSize: '14px'
                  }}></i>
                  {t('settings.exportData')}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: 'var(--text-muted)',
                  WebkitFontSmoothing: 'antialiased',
                  MozOsxFontSmoothing: 'grayscale'
                }}>
                  {t('settings.downloadData')}
                </div>
              </div>
              <button
                onClick={handleExportData}
                style={{
                  background: 'linear-gradient(135deg, var(--accent-secondary) 0%, rgba(139, 92, 246, 0.8) 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-2) var(--space-4)',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  minWidth: '80px',
                  height: 'var(--touch-target)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  WebkitFontSmoothing: 'antialiased',
                  MozOsxFontSmoothing: 'grayscale',
                  WebkitTapHighlightColor: 'transparent',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(139, 92, 246, 0.3)';
                }}
              >
                <i className="fas fa-file-export" style={{ marginRight: 'var(--space-1)', fontSize: '12px' }}></i>
                {t('common.export')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* About & Support Section */}
      <div style={{
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(20px)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4)',
        marginBottom: 'var(--space-4)',
        boxShadow: 'var(--shadow-xl)',
        border: '1px solid var(--bg-glass-border)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, rgba(var(--accent-primary-rgb), 0.01) 0%, rgba(var(--accent-secondary-rgb), 0.01) 100%)',
          pointerEvents: 'none'
        }}></div>
        <h2 style={{
          fontSize: '22px',
          fontWeight: '700',
          color: 'var(--text-primary)',
          marginBottom: 'var(--space-3)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          letterSpacing: '-0.01em',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
          }}>
            <i className="fas fa-info-circle" style={{
              color: 'white',
              fontSize: '16px',
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale'
            }}></i>
          </div>
          {t('settings.aboutSupport')}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', position: 'relative', zIndex: 1 }}>
          {/* App Version */}
          <div style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-4)',
            textAlign: 'center',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = 'var(--shadow-md)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--brand-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--space-2)',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
            }}>
              <i className="fas fa-mobile-alt" style={{
                color: 'white',
                fontSize: '20px'
              }}></i>
            </div>
            <div style={{
              fontWeight: '700',
              color: 'var(--text-primary)',
              marginBottom: 'var(--space-1)',
              fontSize: '18px',
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale'
            }}>
              {t('settings.version')}
            </div>
            <div style={{
              fontSize: '14px',
              color: 'var(--text-muted)',
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale'
            }}>
              {t('settings.communitySafety')}
            </div>
          </div>

          {/* Support Links */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 'var(--space-3)'
          }}>
            <button
              onClick={() => {
                console.log('Privacy Policy button clicked, setting modal to true');
                setShowPrivacyPolicyModal(true);
              }}
              style={{
                padding: 'var(--space-3)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-2)',
                minHeight: 'var(--touch-target)',
                WebkitFontSmoothing: 'antialiased',
                MozOsxFontSmoothing: 'grayscale',
                WebkitTapHighlightColor: 'transparent',
                textAlign: 'center',
                lineHeight: '1.3',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                e.currentTarget.style.borderColor = 'var(--accent-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = 'var(--border-color)';
              }}
            >
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, var(--success) 0%, rgba(34, 197, 94, 0.8) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)'
              }}>
                <i className="fas fa-shield-alt" style={{
                  color: 'white',
                  fontSize: '14px'
                }}></i>
              </div>
              <span style={{
                WebkitFontSmoothing: 'antialiased',
                MozOsxFontSmoothing: 'grayscale'
              }}>
                {t('settings.privacyPolicy', 'Privacy Policy')}
              </span>
            </button>
            <button
              onClick={() => {
                console.log('Terms of Service button clicked, setting modal to true');
                setShowTermsOfServiceModal(true);
              }}
              style={{
                padding: 'var(--space-3)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-2)',
                minHeight: 'var(--touch-target)',
                WebkitFontSmoothing: 'antialiased',
                MozOsxFontSmoothing: 'grayscale',
                WebkitTapHighlightColor: 'transparent',
                textAlign: 'center',
                lineHeight: '1.3',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                e.currentTarget.style.borderColor = 'var(--accent-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = 'var(--border-color)';
              }}
            >
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, var(--warning) 0%, rgba(245, 158, 11, 0.8) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)'
              }}>
                <i className="fas fa-file-contract" style={{
                  color: 'white',
                  fontSize: '14px'
                }}></i>
              </div>
              <span style={{
                WebkitFontSmoothing: 'antialiased',
                MozOsxFontSmoothing: 'grayscale'
              }}>
                {t('settings.termsOfService', 'Terms of Service')}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Logout Section */}
      <div style={{
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(20px)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4)',
        boxShadow: 'var(--shadow-xl)',
        border: '1px solid var(--bg-glass-border)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.03) 0%, rgba(220, 38, 38, 0.03) 100%)',
          pointerEvents: 'none'
        }}></div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 1
        }}>
          <button
            onClick={handleLogout}
            style={{
              background: 'linear-gradient(135deg, var(--danger) 0%, rgba(239, 68, 68, 0.9) 100%)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-3) var(--space-6)',
              fontSize: '18px',
              fontWeight: '700',
              cursor: 'pointer',
              minWidth: '280px',
              height: 'var(--touch-target)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              whiteSpace: 'nowrap',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 4px 16px rgba(239, 68, 68, 0.3)',
              position: 'relative',
              overflow: 'hidden',
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale',
              WebkitTapHighlightColor: 'transparent',
              letterSpacing: '-0.01em'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(239, 68, 68, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(239, 68, 68, 0.3)';
            }}
          >
            <i className="fas fa-sign-out-alt" style={{ marginRight: 'var(--space-2)', fontSize: '16px' }}></i>
            {t('auth.logout')}
          </button>
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: 'var(--space-3)',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div style={{
            background: 'var(--bg-glass)',
            backdropFilter: 'blur(20px)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-5)',
            maxWidth: '420px',
            width: '100%',
            boxShadow: 'var(--shadow-xl)',
            border: '1px solid var(--bg-glass-border)',
            position: 'relative',
            overflow: 'hidden',
            animation: 'slideIn 0.3s ease-out'
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(135deg, rgba(var(--accent-primary-rgb), 0.02) 0%, rgba(var(--accent-secondary-rgb), 0.02) 100%)',
              pointerEvents: 'none'
            }}></div>
            <div style={{
              position: 'relative',
              zIndex: 1
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 'var(--space-4)'
              }}>
                <h3 style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  letterSpacing: '-0.02em',
                  WebkitFontSmoothing: 'antialiased',
                  MozOsxFontSmoothing: 'grayscale'
                }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--brand-gradient)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)'
                  }}>
                    <i className="fas fa-key" style={{
                      color: 'white',
                      fontSize: '14px'
                    }}></i>
                  </div>
                  {t('settings.changePasswordTitle')}
                </h3>
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  }}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    border: 'none',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    WebkitTapHighlightColor: 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-tertiary)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--bg-secondary)';
                    e.currentTarget.style.color = 'var(--text-muted)';
                  }}
                >
                  <i className="fas fa-times" style={{ fontSize: '14px' }}></i>
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '15px',
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    marginBottom: 'var(--space-2)',
                    WebkitFontSmoothing: 'antialiased',
                    MozOsxFontSmoothing: 'grayscale'
                  }}>
                    {t('settings.currentPassword')}
                  </label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    placeholder={t('settings.enterCurrentPassword')}
                    aria-label="Current Password"
                    style={{
                      width: '100%',
                      padding: 'var(--space-3)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '16px',
                      outline: 'none',
                      transition: 'border-color 0.2s ease',
                      WebkitFontSmoothing: 'antialiased',
                      MozOsxFontSmoothing: 'grayscale'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent-primary)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '15px',
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    marginBottom: 'var(--space-2)',
                    WebkitFontSmoothing: 'antialiased',
                    MozOsxFontSmoothing: 'grayscale'
                  }}>
                    {t('settings.newPassword')}
                  </label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder={t('settings.enterNewPassword')}
                    aria-label="New Password"
                    style={{
                      width: '100%',
                      padding: 'var(--space-3)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '16px',
                      outline: 'none',
                      transition: 'border-color 0.2s ease',
                      WebkitFontSmoothing: 'antialiased',
                      MozOsxFontSmoothing: 'grayscale'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent-primary)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '15px',
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    marginBottom: 'var(--space-2)',
                    WebkitFontSmoothing: 'antialiased',
                    MozOsxFontSmoothing: 'grayscale'
                  }}>
                    {t('settings.confirmNewPassword')}
                  </label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder={t('settings.confirmNewPasswordPlaceholder')}
                    aria-label="Confirm New Password"
                    style={{
                      width: '100%',
                      padding: 'var(--space-3)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '16px',
                      outline: 'none',
                      transition: 'border-color 0.2s ease',
                      WebkitFontSmoothing: 'antialiased',
                      MozOsxFontSmoothing: 'grayscale'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent-primary)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  }}
                  style={{
                    flex: 1,
                    padding: 'var(--space-3)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    WebkitFontSmoothing: 'antialiased',
                    MozOsxFontSmoothing: 'grayscale',
                    WebkitTapHighlightColor: 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-primary)';
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handlePasswordChange}
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: 'var(--space-3)',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--brand-gradient)',
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1,
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
                    WebkitFontSmoothing: 'antialiased',
                    MozOsxFontSmoothing: 'grayscale',
                    WebkitTapHighlightColor: 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.3)';
                    }
                  }}
                >
                  {loading ? (
                    <>
                      <i className="fas fa-spinner fa-spin" style={{ marginRight: 'var(--space-2)' }}></i>
                      Changing...
                    </>
                  ) : (
                    'Change Password'
                  )}
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

export default SettingsView;
