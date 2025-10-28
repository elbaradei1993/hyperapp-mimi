import React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Button } from './shared';

interface ReportTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectVibe: () => void;
  onSelectEmergency: () => void;
}

const ReportTypeModal: React.FC<ReportTypeModalProps> = ({
  isOpen,
  onClose,
  onSelectVibe,
  onSelectEmergency
}) => {
  const { t } = useTranslation();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('modals.reportType.title')}>
      <div style={{ padding: '20px 0' }}>
        <div style={{
          textAlign: 'center',
          marginBottom: '32px'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 24px rgba(59, 130, 246, 0.3)'
          }}>
            <i className="fas fa-plus" style={{
              fontSize: '28px',
              color: 'white'
            }}></i>
          </div>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#1f2937',
            margin: '0 0 8px 0'
          }}>
            {t('modals.reportType.title')}
          </h2>
          <p style={{
            color: '#6b7280',
            fontSize: '16px',
            margin: 0,
            lineHeight: '1.5'
          }}>
            {t('modals.reportType.title')}
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px'
        }}>
          {/* Vibe Report Button */}
          <button
            onClick={() => {
              onClose();
              onSelectVibe();
            }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '32px 20px',
              border: '2px solid #e5e7eb',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.02)',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-6px) scale(1.02)';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(59, 130, 246, 0.2), 0 4px 8px rgba(59, 130, 246, 0.1)';
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.background = 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.02)';
              e.currentTarget.style.borderColor = '#e5e7eb';
              e.currentTarget.style.background = 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)';
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px) scale(0.98)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'translateY(-6px) scale(1.02)';
            }}
          >
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 50%, #93c5fd 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '18px',
              boxShadow: '0 6px 16px rgba(59, 130, 246, 0.25), inset 0 2px 4px rgba(255, 255, 255, 0.1)',
              position: 'relative'
            }}>
              <i className="fas fa-smile" style={{
                fontSize: '30px',
                color: '#1d4ed8',
                filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))'
              }}></i>
              <div style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
              }}>
                <i className="fas fa-plus" style={{
                  fontSize: '10px',
                  color: 'white',
                  fontWeight: 'bold'
                }}></i>
              </div>
            </div>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '700',
              color: '#1f2937',
              margin: '0 0 8px 0',
              letterSpacing: '-0.025em'
            }}>
              {t('modals.reportType.vibe')}
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              margin: 0,
              lineHeight: '1.5',
              fontWeight: '500'
            }}>
              {t('modals.reportType.vibeDesc')}
            </p>
          </button>

          {/* Emergency Report Button */}
          <button
            onClick={() => {
              onClose();
              onSelectEmergency();
            }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '32px 20px',
              border: '2px solid #e5e7eb',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #ffffff 0%, #fef7f7 100%)',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.02)',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-6px) scale(1.02)';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(239, 68, 68, 0.2), 0 4px 8px rgba(239, 68, 68, 0.1)';
              e.currentTarget.style.borderColor = '#ef4444';
              e.currentTarget.style.background = 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.02)';
              e.currentTarget.style.borderColor = '#e5e7eb';
              e.currentTarget.style.background = 'linear-gradient(135deg, #ffffff 0%, #fef7f7 100%)';
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px) scale(0.98)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'translateY(-6px) scale(1.02)';
            }}
          >
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 50%, #fca5a5 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '18px',
              boxShadow: '0 6px 16px rgba(239, 68, 68, 0.25), inset 0 2px 4px rgba(255, 255, 255, 0.1)',
              position: 'relative'
            }}>
              <i className="fas fa-exclamation-triangle" style={{
                fontSize: '30px',
                color: '#dc2626',
                filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))'
              }}></i>
              <div style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)'
              }}>
                <i className="fas fa-exclamation" style={{
                  fontSize: '10px',
                  color: 'white',
                  fontWeight: 'bold'
                }}></i>
              </div>
            </div>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '700',
              color: '#1f2937',
              margin: '0 0 8px 0',
              letterSpacing: '-0.025em'
            }}>
              {t('modals.reportType.emergency')}
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              margin: 0,
              lineHeight: '1.5',
              fontWeight: '500'
            }}>
              {t('modals.reportType.emergencyDesc')}
            </p>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default React.memo(ReportTypeModal);
