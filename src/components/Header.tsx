import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

export type TabType = 'map' | 'reports' | 'profile' | 'settings';

interface HeaderProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange }) => {
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const [isLogoutHovered, setIsLogoutHovered] = useState(false);
  const [isHomeHovered, setIsHomeHovered] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleHomeClick = () => {
    onTabChange('map');
  };

  return (
    <>
      {/* Premium Header with Advanced Glassmorphism */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '64px',
        background: `
          linear-gradient(
            135deg,
            rgba(var(--bg-primary-rgb, 255, 255, 255), 0.85) 0%,
            rgba(var(--bg-primary-rgb, 255, 255, 255), 0.75) 50%,
            rgba(var(--bg-primary-rgb, 255, 255, 255), 0.65) 100%
          )
        `,
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderBottom: '1px solid rgba(var(--border-color-rgb, 229, 231, 235), 0.3)',
        boxShadow: `
          0 8px 32px rgba(0, 0, 0, 0.12),
          0 4px 16px rgba(0, 0, 0, 0.08),
          inset 0 1px 0 rgba(255, 255, 255, 0.2)
        `,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>

        {/* Left Section: Logo (acts as Home Button) */}
        <div>
          {/* Premium Logo Container - Now Clickable Home Button */}
          <div style={{
            position: 'relative',
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: activeTab === 'map'
              ? `
                linear-gradient(
                  135deg,
                  rgba(var(--accent-primary-rgb, 59, 130, 246), 0.9) 0%,
                  rgba(var(--accent-primary-rgb, 59, 130, 246), 0.7) 100%
                )
              `
              : `
                linear-gradient(
                  135deg,
                  rgba(var(--bg-primary-rgb, 255, 255, 255), 0.9) 0%,
                  rgba(var(--bg-primary-rgb, 255, 255, 255), 0.7) 100%
                )
              `,
            border: activeTab === 'map'
              ? '2px solid rgba(255, 255, 255, 0.4)'
              : '2px solid rgba(var(--accent-primary, #3b82f6), 0.3)',
            boxShadow: activeTab === 'map'
              ? `
                0 8px 24px rgba(var(--accent-primary-rgb, 59, 130, 246), 0.4),
                0 4px 12px rgba(0, 0, 0, 0.15),
                inset 0 1px 0 rgba(255, 255, 255, 0.3)
              `
              : `
                0 8px 24px rgba(var(--accent-primary-rgb, 59, 130, 246), 0.15),
                0 4px 12px rgba(0, 0, 0, 0.1),
                inset 0 1px 0 rgba(255, 255, 255, 0.3)
              `,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            cursor: 'pointer',
            overflow: 'hidden'
          }}
          className="header-logo-container"
          onClick={handleHomeClick}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05) rotate(5deg)';
            e.currentTarget.style.boxShadow = activeTab === 'map'
              ? `
                0 12px 32px rgba(var(--accent-primary-rgb, 59, 130, 246), 0.5),
                0 6px 16px rgba(0, 0, 0, 0.2),
                inset 0 1px 0 rgba(255, 255, 255, 0.4)
              `
              : `
                0 12px 32px rgba(var(--accent-primary-rgb, 59, 130, 246), 0.25),
                0 6px 16px rgba(0, 0, 0, 0.15),
                inset 0 1px 0 rgba(255, 255, 255, 0.4)
              `;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
            e.currentTarget.style.boxShadow = activeTab === 'map'
              ? `
                0 8px 24px rgba(var(--accent-primary-rgb, 59, 130, 246), 0.4),
                0 4px 12px rgba(0, 0, 0, 0.15),
                inset 0 1px 0 rgba(255, 255, 255, 0.3)
              `
              : `
                0 8px 24px rgba(var(--accent-primary-rgb, 59, 130, 246), 0.15),
                0 4px 12px rgba(0, 0, 0, 0.1),
                inset 0 1px 0 rgba(255, 255, 255, 0.3)
              `;
          }}
          aria-label={t('tabs.map')}
          >
            <img
              src="/logo.png"
              alt="HyperApp Logo - Home"
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                objectFit: 'cover',
                transition: 'transform 0.3s ease'
              }}
            />
            {/* Subtle glow effect */}
            <div style={{
              position: 'absolute',
              top: '-2px',
              left: '-2px',
              right: '-2px',
              bottom: '-2px',
              borderRadius: '50%',
              background: activeTab === 'map'
                ? `linear-gradient(45deg, rgba(255, 255, 255, 0.2), transparent)`
                : `linear-gradient(45deg, rgba(var(--accent-primary-rgb, 59, 130, 246), 0.1), transparent)`,
              opacity: 0.7,
              animation: 'logoGlow 3s ease-in-out infinite alternate'
            }} />
          </div>
        </div>

        {/* Right Section: Logout Button */}
        <div>
          <button
            onClick={handleLogout}
            onMouseEnter={() => setIsLogoutHovered(true)}
            onMouseLeave={() => setIsLogoutHovered(false)}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.95)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = isLogoutHovered ? 'scale(1.02)' : 'scale(1)';
            }}
            onTouchStart={(e) => {
              e.currentTarget.style.transform = 'scale(0.95)';
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
            style={{
              padding: '12px 20px',
              borderRadius: '24px',
              border: 'none',
              background: isLogoutHovered
                ? 'linear-gradient(135deg, var(--danger) 0%, rgba(239, 68, 68, 0.9) 100%)'
                : `
                  linear-gradient(
                    135deg,
                    rgba(var(--bg-primary-rgb, 255, 255, 255), 0.8) 0%,
                    rgba(var(--bg-primary-rgb, 255, 255, 255), 0.6) 100%
                  )
                `,
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              color: isLogoutHovered ? 'white' : 'var(--text-primary)',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: isLogoutHovered
                ? '0 4px 16px rgba(239, 68, 68, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                : `
                  0 4px 16px rgba(0, 0, 0, 0.1),
                  inset 0 1px 0 rgba(255, 255, 255, 0.3)
                `,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: 'scale(1)',
              WebkitTapHighlightColor: 'transparent',
              userSelect: 'none',
              minHeight: '44px',
              position: 'relative',
              overflow: 'hidden'
            }}
            aria-label={t('auth.logout')}
          >
            <i
              className="fas fa-sign-out-alt"
              style={{
                fontSize: '16px',
                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: isLogoutHovered ? 'translateX(2px) scale(1.1)' : 'translateX(0) scale(1)'
              }}
            />
            <span style={{ fontSize: '14px', fontWeight: '600' }}>{t('auth.logout')}</span>

            {/* Danger glow effect on hover */}
            {isLogoutHovered && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(45deg, rgba(239, 68, 68, 0.1), transparent)',
                borderRadius: '24px',
                animation: 'buttonGlow 1.5s ease-in-out infinite alternate'
              }} />
            )}
          </button>
        </div>
      </div>

      {/* Custom CSS Animations */}
      <style>
        {`
          @keyframes logoGlow {
            0% {
              opacity: 0.5;
              transform: scale(1);
            }
            100% {
              opacity: 0.8;
              transform: scale(1.02);
            }
          }

          @keyframes buttonGlow {
            0% {
              opacity: 0.3;
            }
            100% {
              opacity: 0.6;
            }
          }

          /* Respect user's motion preferences */
          @media (prefers-reduced-motion: reduce) {
            * {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
            }
          }

          /* Mobile optimizations */
          @media (max-width: 768px) {
            .header-logo-container {
              width: 36px !important;
              height: 36px !important;
            }

            .header-logo-container img {
              width: 36px !important;
              height: 36px !important;
            }

            /* Apply mobile styles to logout button */
            div > button {
              padding: 8px 16px !important;
              font-size: 13px !important;
              min-height: 40px !important;
            }

            div > button i {
              font-size: 14px !important;
            }

            div > button span {
              font-size: 13px !important;
            }
          }

          @media (max-width: 640px) {
            .header-logo-text {
              display: none;
            }
          }

          /* Hide logout button text on mobile for ultra-compact design */
          @media (max-width: 768px) {
            div > button span {
              display: none !important;
            }

            div > button {
              padding: 8px !important;
              width: 40px !important;
              justify-content: center !important;
            }
          }
        `}
      </style>
    </>
  );
};

export default Header;
