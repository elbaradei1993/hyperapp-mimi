import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

// Header component with professional design matching the HTML
const Header: React.FC = () => {
  const { signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Inject styles on component mount
  useEffect(() => {
    const styleId = 'header-styles';
    if (!document.getElementById(styleId)) {
      const styleSheet = document.createElement('style');
      styleSheet.id = styleId;
      styleSheet.textContent = `
        /* ECG Animation */
        @keyframes ecgDraw {
          0% {
            stroke-dashoffset: 1000;
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          80% {
            stroke-dashoffset: 0;
            opacity: 1;
          }
          100% {
            stroke-dashoffset: 0;
            opacity: 0;
          }
        }

        /* Vibe Color Animation */
        @keyframes vibeColors {
          0% { color: #10b981; }
          25% { color: #3b82f6; }
          50% { color: #f59e0b; }
          75% { color: #8b5cf6; }
          100% { color: #10b981; }
        }

        /* Apply color animation to ECG */
        .ecg-path {
          animation: ecgDraw 3s ease-in-out infinite, vibeColors 8s ease-in-out infinite;
        }

        /* Logout button hover effects */
        .logout-btn:hover {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%) !important;
          transform: translateY(-1px);
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06) !important;
        }

        .logout-btn:active {
          transform: translateY(0);
        }

        /* Tablet and Desktop Styles */
        @media (min-width: 768px) {
          .app-header {
            padding: 0 24px !important;
          }

          .header-content {
            height: 70px !important;
            gap: 24px !important;
          }

          .logo-text {
            font-size: 1.5rem !important;
          }

          .logout-btn {
            padding: 10px 16px !important;
            font-size: 0.875rem !important;
            gap: 8px !important;
          }

          .logout-text {
            display: inline !important;
          }

          .ecg-container {
            padding-left: 140px !important;
            padding-right: 120px !important;
          }
        }

        @media (min-width: 1024px) {
          .app-header {
            padding: 0 32px !important;
          }
        }

        /* Touch improvements */
        @media (hover: none) and (pointer: coarse) {
          .logout-btn:hover {
            transform: none !important;
          }
        }

        /* Prevent zoom on input for mobile */
        @media screen and (max-width: 768px) {
          input, select, textarea {
            font-size: 16px;
          }
        }
      `;
      document.head.appendChild(styleSheet);
    }
  }, []);

  return (
    <header className="app-header" style={{
      background: '#ffffff',
      borderBottom: '1px solid #f1f5f9',
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      padding: '0 16px',
    }}>
      <div className="header-content" style={{
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        height: '60px',
        position: 'relative',
      }}>
        {/* App Name - Left Side */}
        <div className="logo-text" style={{
          fontSize: '1.25rem',
          fontWeight: 800,
          background: 'linear-gradient(135deg, #0f172a 0%, #475569 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.025em',
          whiteSpace: 'nowrap',
          zIndex: 2,
          flexShrink: 0,
          marginRight: '16px',
        }}>HyperApp</div>

        {/* ECG Animation - Flows from app name to logout button */}
        <div className="ecg-container" style={{
          position: 'absolute',
          left: '0',
          right: '0',
          top: '50%',
          transform: 'translateY(-50%)',
          height: '3px',
          pointerEvents: 'none',
          zIndex: 1,
          paddingLeft: '120px', // Start after the "HyperApp" text
          paddingRight: '100px', // End before the logout button
        }}>
          <div className="ecg-line" style={{
            position: 'relative',
            height: '100%',
            width: '100%',
          }}>
            <svg className="ecg-path" viewBox="0 0 500 10" preserveAspectRatio="none" style={{
              width: '100%',
              height: '100%',
              strokeDasharray: 1000,
              strokeDashoffset: 1000,
              filter: 'drop-shadow(0 0 2px currentColor)',
            }}>
              <path d="M0,5 Q50,0 100,5 T200,5 T300,5 T400,5 T500,5"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"/>
            </svg>
          </div>
        </div>

        {/* Logout Button - Right Side */}
        <button className="logout-btn" onClick={handleLogout} style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '8px 12px',
          color: '#475569',
          fontWeight: 600,
          fontSize: '0.8rem',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          zIndex: 2,
          flexShrink: 0,
          marginLeft: '16px',
        }}>
          <i className="fas fa-sign-out-alt"></i>
          <span className="logout-text" style={{
            display: 'none', // Hidden on mobile by default
          }}>Logout</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
