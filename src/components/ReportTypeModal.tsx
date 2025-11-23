import React from 'react';
import { useTranslation } from 'react-i18next';

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

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        padding: '20px',
        opacity: isOpen ? 1 : 0,
        pointerEvents: isOpen ? 'all' : 'none',
        transition: 'opacity 0.3s ease'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          width: '100%',
          maxWidth: '480px',
          overflow: 'hidden',
          transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
          transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <button
          onClick={onClose}
          title="Close modal"
          aria-label="Close modal"
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: '#f1f5f9',
            border: 'none',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#64748b',
            transition: 'all 0.2s ease',
            zIndex: 10,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#e2e8f0';
            e.currentTarget.style.color = '#475569';
            e.currentTarget.style.transform = 'rotate(90deg)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f1f5f9';
            e.currentTarget.style.color = '#64748b';
            e.currentTarget.style.transform = 'rotate(0deg)';
          }}
        >
          <i className="fas fa-times"></i>
        </button>

        <div
          style={{
            padding: '32px 32px 24px',
            textAlign: 'center',
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            borderBottom: '1px solid #e2e8f0'
          }}
        >
          <h2
            style={{
              fontSize: '28px',
              fontWeight: 700,
              color: '#0f172a',
              margin: '0 0 12px 0',
              letterSpacing: '-0.025em'
            }}
          >
            {t('modals.reportType.title')}
          </h2>
          <p
            style={{
              color: '#64748b',
              fontSize: '16px',
              margin: 0,
              lineHeight: '1.5',
              fontWeight: 500
            }}
          >
            {t('modals.reportType.subtitle', 'Choose the type of report you\'d like to submit')}
          </p>
        </div>

        <div style={{ padding: '32px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: '16px'
            }}
          >
            {/* Vibe Report Option */}
            <div
              className="option-card vibe-card"
              onClick={() => {
                onClose();
                onSelectVibe();
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '28px 20px',
                border: '2px solid #f1f5f9',
                borderRadius: '20px',
                background: 'white',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 15px 30px rgba(59, 130, 246, 0.15)';
                e.currentTarget.style.borderColor = '#e2e8f0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = '#f1f5f9';
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  transform: 'scaleX(0)',
                  transition: 'transform 0.3s ease',
                  background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)'
                }}
                className="card-border-top"
              ></div>
              <div
                style={{
                  width: '70px',
                  height: '70px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '20px',
                  boxShadow: '0 8px 20px rgba(0, 0, 0, 0.1)',
                  background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)'
                }}
              >
                <i
                  className="fas fa-smile-beam"
                  style={{
                    fontSize: '30px',
                    color: '#1d4ed8',
                    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))'
                  }}
                ></i>
              </div>
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#0f172a',
                  margin: 0,
                  letterSpacing: '-0.025em'
                }}
              >
                {t('modals.reportType.vibe')}
              </h3>
            </div>

            {/* Emergency Report Option */}
            <div
              className="option-card emergency-card"
              onClick={() => {
                onClose();
                onSelectEmergency();
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '28px 20px',
                border: '2px solid #f1f5f9',
                borderRadius: '20px',
                background: 'white',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 15px 30px rgba(239, 68, 68, 0.15)';
                e.currentTarget.style.borderColor = '#e2e8f0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = '#f1f5f9';
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  transform: 'scaleX(0)',
                  transition: 'transform 0.3s ease',
                  background: 'linear-gradient(90deg, #ef4444, #dc2626)'
                }}
                className="card-border-top"
              ></div>
              <div
                style={{
                  width: '70px',
                  height: '70px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '20px',
                  boxShadow: '0 8px 20px rgba(0, 0, 0, 0.1)',
                  background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)'
                }}
              >
                <i
                  className="fas fa-exclamation-triangle"
                  style={{
                    fontSize: '30px',
                    color: '#dc2626',
                    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))'
                  }}
                ></i>
              </div>
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#0f172a',
                  margin: 0,
                  letterSpacing: '-0.025em'
                }}
              >
                {t('modals.reportType.emergency')}
              </h3>
            </div>
          </div>
        </div>
      </div>

      <style>
        {`
          @media (min-width: 480px) {
            .option-card {
              grid-template-columns: 1fr 1fr !important;
            }
          }

          @media (max-width: 480px) {
            .modal-container {
              border-radius: 20px !important;
            }

            .modal-header {
              padding: 24px 24px 20px !important;
            }

            .modal-content {
              padding: 24px !important;
            }

            .modal-title {
              font-size: 24px !important;
            }

            .option-card {
              padding: 24px 16px !important;
            }

            .option-icon {
              width: 60px !important;
              height: 60px !important;
              margin-bottom: 16px !important;
            }

            .option-icon i {
              font-size: 26px !important;
            }
          }

          .option-card:hover .card-border-top {
            transform: scaleX(1) !important;
          }
        `}
      </style>
    </div>
  );
};

export default React.memo(ReportTypeModal);
