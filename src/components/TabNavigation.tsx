import React from 'react';
import { useTranslation } from 'react-i18next';
import Button from './shared/Button';

export type TabType = 'map' | 'reports' | 'profile' | 'settings';

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onNewReport?: () => void;
}

const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onTabChange, onNewReport }) => {
  const { t } = useTranslation();
  const tabs = [
    { id: 'map' as TabType, label: t('tabs.map'), icon: 'fas fa-map' },
    { id: 'reports' as TabType, label: t('tabs.community'), icon: 'fas fa-users' },
    { id: 'profile' as TabType, label: t('tabs.profile'), icon: 'fas fa-user' },
    { id: 'settings' as TabType, label: t('tabs.settings'), icon: 'fas fa-cog' }
  ];

  return (
    <>
      {/* Background context for glassmorphism effect */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '120px', // Extend beyond tab bar for blur context
        background: 'linear-gradient(180deg, transparent 0%, rgba(var(--bg-secondary-rgb, 249, 250, 251), 0.3) 50%, rgba(var(--bg-primary-rgb, 255, 255, 255), 0.6) 100%)',
        zIndex: 99,
        pointerEvents: 'none'
      }} />

      {/* Tab Navigation with Glassmorphism */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(var(--bg-primary-rgb, 255, 255, 255), 0.85)',
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)', // Safari support
        borderTop: '1px solid rgba(var(--border-color-rgb, 229, 231, 235), 0.4)',
        boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.12), 0 -4px 16px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center'
      }}>
      {/* Left tabs */}
      <div style={{ display: 'flex', flex: 1 }}>
        {tabs.slice(0, 2).map(tab => (
          <button
            className="tab-button"
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.95)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
            onTouchStart={(e) => {
              e.currentTarget.style.transform = 'scale(0.95)';
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
            style={{
              flex: 1,
              aspectRatio: '1', // Ensure square buttons
              maxWidth: '80px', // Limit max width on larger screens
              padding: '8px 4px',
              border: 'none',
              backgroundColor: activeTab === tab.id ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === tab.id ? 'white' : 'var(--text-muted)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              cursor: 'pointer',
              transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
              fontSize: '11px',
              fontWeight: activeTab === tab.id ? '600' : '500',
              minHeight: '60px', // Ensure minimum touch target
              transform: 'scale(1)',
              WebkitTapHighlightColor: 'transparent',
              userSelect: 'none',
              borderRadius: activeTab === tab.id ? '12px' : '0',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <i className={tab.icon} style={{
              fontSize: '16px',
              marginBottom: '1px',
              transition: 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
            }}></i>
            <span style={{ lineHeight: '1.2' }}>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Floating Action Button - Centered in tab bar */}
      {onNewReport && (
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <button
            className="floating-report-button"
            onClick={() => {
              onNewReport();
            }}
            style={{
              width: '48px',
              height: '48px',
              aspectRatio: '1',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              border: 'none',
              boxShadow: '0 0 14px rgba(59, 130, 246, 0.4), 0 0 0 4px rgba(var(--bg-primary-rgb, 255, 255, 255), 0.8)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 101,
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              pointerEvents: 'auto',
              animation: 'pulse 3s infinite',
              WebkitTapHighlightColor: 'transparent',
              userSelect: 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.boxShadow = '0 0 25px rgba(59, 130, 246, 0.6), 0 0 0 4px rgba(var(--bg-primary-rgb, 255, 255, 255), 0.8)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 0 14px rgba(59, 130, 246, 0.4), 0 0 0 4px rgba(var(--bg-primary-rgb, 255, 255, 255), 0.8)';
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.95)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onTouchStart={(e) => {
              e.currentTarget.style.transform = 'scale(0.95)';
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            title={t('app.newReport')}
          >
            <i className="fas fa-plus" style={{
              fontSize: '20px',
              fontWeight: 'bold',
              transition: 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
            }}></i>
          </button>
        </div>
      )}

      {/* Right tabs */}
      <div style={{ display: 'flex', flex: 1 }}>
        {tabs.slice(2).map(tab => (
          <button
            className="tab-button"
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.95)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
            onTouchStart={(e) => {
              e.currentTarget.style.transform = 'scale(0.95)';
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
            style={{
              flex: 1,
              aspectRatio: '1', // Ensure square buttons
              maxWidth: '80px', // Limit max width on larger screens
              padding: '8px 4px',
              border: 'none',
              backgroundColor: activeTab === tab.id ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === tab.id ? 'white' : 'var(--text-muted)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              cursor: 'pointer',
              transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
              fontSize: '11px',
              fontWeight: activeTab === tab.id ? '600' : '500',
              minHeight: '60px', // Ensure minimum touch target
              transform: 'scale(1)',
              WebkitTapHighlightColor: 'transparent',
              userSelect: 'none',
              borderRadius: activeTab === tab.id ? '12px' : '0',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <i className={tab.icon} style={{
              fontSize: '16px',
              marginBottom: '1px',
              transition: 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
            }}></i>
            <span style={{ lineHeight: '1.2' }}>{tab.label}</span>
          </button>
        ))}
      </div>

        {/* Add CSS animation for pulsing effect */}
        <style>
          {`
            @keyframes pulse {
              0%, 100% {
                transform: scale(1);
                box-shadow: 0 0 14px rgba(59, 130, 246, 0.4), 0 0 0 4px rgba(var(--bg-primary-rgb, 255, 255, 255), 0.8);
              }
              50% {
                transform: scale(1.03);
                box-shadow: 0 0 18px rgba(59, 130, 246, 0.5), 0 0 0 4px rgba(var(--bg-primary-rgb, 255, 255, 255), 0.8);
              }
            }

            /* Mobile optimizations */
            @media (max-width: 768px) {
              .floating-report-button {
                width: 48px !important;
                height: 48px !important;
                min-width: 48px !important;
                min-height: 48px !important;
                max-width: 48px !important;
                max-height: 48px !important;
              }

              .tab-button span {
                display: none !important;
              }

              .tab-button {
                justify-content: center !important;
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
          `}
        </style>
      </div>
    </>
  );
};

export default TabNavigation;
