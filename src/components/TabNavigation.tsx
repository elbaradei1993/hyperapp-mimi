import React from 'react';
import { useTranslation } from 'react-i18next';

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
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'var(--bg-primary)',
      borderTop: '1px solid var(--border-color)',
      boxShadow: '0 -2px 10px var(--shadow-color)',
      zIndex: 100,
      display: 'flex',
      alignItems: 'center'
    }}>
      {/* Left tabs */}
      <div style={{ display: 'flex', flex: 1 }}>
        {tabs.slice(0, 2).map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              flex: 1,
              padding: '12px 8px',
              border: 'none',
              backgroundColor: activeTab === tab.id ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === tab.id ? 'white' : 'var(--text-muted)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontSize: '12px',
              fontWeight: activeTab === tab.id ? '600' : '500'
            }}
          >
            <i className={tab.icon} style={{
              fontSize: '18px',
              marginBottom: '2px'
            }}></i>
            <span>{tab.label}</span>
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
            onClick={() => {
              onNewReport();
            }}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              border: 'none',
              boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4), 0 0 0 4px var(--bg-primary)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 101,
              transition: 'all 0.2s ease',
              pointerEvents: 'auto',
              animation: 'pulse 2s infinite'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.6), 0 0 0 4px var(--bg-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(59, 130, 246, 0.4), 0 0 0 4px var(--bg-primary)';
            }}
            title={t('app.newReport')}
          >
            <i className="fas fa-plus" style={{ fontSize: '20px', fontWeight: 'bold' }}></i>
          </button>
        </div>
      )}

      {/* Right tabs */}
      <div style={{ display: 'flex', flex: 1 }}>
        {tabs.slice(2).map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              flex: 1,
              padding: '12px 8px',
              border: 'none',
              backgroundColor: activeTab === tab.id ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === tab.id ? 'white' : 'var(--text-muted)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontSize: '12px',
              fontWeight: activeTab === tab.id ? '600' : '500'
            }}
          >
            <i className={tab.icon} style={{
              fontSize: '18px',
              marginBottom: '2px'
            }}></i>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Add CSS animation for pulsing effect */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              transform: scale(1);
              box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4), 0 0 0 4px var(--bg-primary);
            }
            50% {
              transform: scale(1.05);
              box-shadow: 0 6px 16px rgba(59, 130, 246, 0.5), 0 0 0 4px var(--bg-primary);
            }
          }
        `}
      </style>
    </div>
  );
};

export default TabNavigation;
