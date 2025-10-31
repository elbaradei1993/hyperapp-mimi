import React, { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export type TabType = 'map' | 'reports' | 'profile' | 'settings';

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onNewReport?: () => void;
}

const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onTabChange, onNewReport }) => {
  const { t } = useTranslation();
  const navRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ width: 0, left: 0 });

  const tabs = [
    { id: 'map' as TabType, label: t('tabs.map'), icon: 'fas fa-map' },
    { id: 'reports' as TabType, label: t('tabs.community'), icon: 'fas fa-users' },
    { id: 'profile' as TabType, label: t('tabs.profile'), icon: 'fas fa-user' },
    { id: 'settings' as TabType, label: t('tabs.settings'), icon: 'fas fa-cog' }
  ];

  // Update indicator position when activeTab changes
  useEffect(() => {
    if (navRef.current) {
      const activeButton = navRef.current.querySelector(`[data-tab="${activeTab}"]`) as HTMLElement;
      if (activeButton) {
        const navRect = navRef.current.getBoundingClientRect();
        const buttonRect = activeButton.getBoundingClientRect();
        setIndicatorStyle({
          width: buttonRect.width,
          left: buttonRect.left - navRect.left
        });
      }
    }
  }, [activeTab]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (navRef.current) {
        const activeButton = navRef.current.querySelector(`[data-tab="${activeTab}"]`) as HTMLElement;
        if (activeButton) {
          const navRect = navRef.current.getBoundingClientRect();
          const buttonRect = activeButton.getBoundingClientRect();
          setIndicatorStyle({
            width: buttonRect.width,
            left: buttonRect.left - navRect.left
          });
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeTab]);

  return (
    <>
      {/* Background context for glassmorphism effect */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '120px',
        background: 'linear-gradient(180deg, transparent 0%, rgba(var(--bg-secondary-rgb, 249, 250, 251), 0.3) 50%, rgba(var(--bg-primary-rgb, 255, 255, 255), 0.6) 100%)',
        zIndex: 99,
        pointerEvents: 'none'
      }} />

      {/* Professional Tab Navigation */}
      <div
        ref={navRef}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'var(--bg-primary)',
          backdropFilter: 'blur(16px) saturate(180%)',
          WebkitBackdropFilter: 'blur(16px) saturate(180%)',
          borderTop: '1px solid rgba(var(--border-color-rgb, 229, 231, 235), 0.4)',
          boxShadow: '0 -10px 15px -3px rgba(0, 0, 0, 0.1), 0 -4px 6px -2px rgba(0, 0, 0, 0.05)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          padding: '8px',
          borderRadius: '16px 16px 0 0'
        }}
      >
        {/* Sliding Tab Indicator */}
        <div
          style={{
            position: 'absolute',
            height: 'calc(100% - 16px)',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '12px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
            border: '1px solid rgba(var(--border-color-rgb, 229, 231, 235), 0.4)',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: 0,
            ...indicatorStyle
          }}
        />

        {/* Tab Buttons */}
        {tabs.map((tab, index) => (
          <React.Fragment key={tab.id}>
            <button
              data-tab={tab.id}
              onClick={() => onTabChange(tab.id)}
              style={{
                flex: 1,
                padding: '16px 20px',
                border: 'none',
                background: 'transparent',
                color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                fontSize: '0.875rem',
                fontWeight: activeTab === tab.id ? '600' : '500',
                borderRadius: '10px',
                position: 'relative',
                zIndex: 1,
                minHeight: '70px'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
            >
              <i
                className={tab.icon}
                style={{
                  fontSize: '1.25rem',
                  transition: 'all 0.3s ease',
                  opacity: activeTab === tab.id ? 1 : 0.8,
                  transform: activeTab === tab.id ? 'translateY(-2px)' : 'translateY(0)'
                }}
              />
              <span style={{
                transition: 'all 0.3s ease',
                fontWeight: activeTab === tab.id ? '600' : '500'
              }}>
                {tab.label}
              </span>
            </button>

            {/* Floating Action Button - positioned between tabs 1-2 */}
            {index === 1 && onNewReport && (
              <button
                onClick={onNewReport}
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, var(--accent-primary) 0%, #1d4ed8 100%)',
                  border: 'none',
                  boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4), 0 0 0 4px var(--bg-primary)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  zIndex: 2,
                  position: 'relative',
                  margin: '0 8px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(59, 130, 246, 0.5), 0 0 0 4px var(--bg-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 14px rgba(59, 130, 246, 0.4), 0 0 0 4px var(--bg-primary)';
                }}
                title={t('app.newReport')}
              >
                <i
                  className="fas fa-plus"
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: '600',
                    transition: 'transform 0.3s ease'
                  }}
                />
              </button>
            )}
          </React.Fragment>
        ))}

        {/* CSS Animations */}
        <style>
          {`
            /* Respect user's motion preferences */
            @media (prefers-reduced-motion: reduce) {
              * {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
              }
            }

            /* Responsive design */
            @media (max-width: 768px) {
              button[data-tab] {
                padding: 14px 12px !important;
                min-height: 64px !important;
              }

              button[data-tab] i {
                font-size: 1.125rem !important;
              }

              button[data-tab] span {
                font-size: 0.8rem !important;
              }
            }

            @media (max-width: 480px) {
              div[ref] {
                flex-direction: column !important;
                padding: 16px 12px !important;
                gap: 8px !important;
              }

              button[data-tab] {
                flex-direction: row !important;
                justify-content: flex-start !important;
                width: 100% !important;
                padding: 14px 16px !important;
                gap: 12px !important;
                min-height: auto !important;
              }
            }
          `}
        </style>
      </div>
    </>
  );
};

export default TabNavigation;
