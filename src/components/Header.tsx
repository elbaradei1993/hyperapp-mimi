import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

// Header component with professional design matching the HTML
const Header: React.FC = () => {
  const { signOut } = useAuth();
  const [currentVibe, setCurrentVibe] = useState('calm');

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Auto-cycle through vibes for demo
  useEffect(() => {
    const vibes = ['calm', 'safe', 'lively', 'festive', 'noisy', 'dangerous'];
    let currentIndex = 0;

    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % vibes.length;
      setCurrentVibe(vibes[currentIndex]);
    }, 4000); // Change every 4 seconds

    return () => clearInterval(interval);
  }, []);

  // Inject styles on component mount
  useEffect(() => {
    const styleId = 'header-styles';
    if (!document.getElementById(styleId)) {
      const styleSheet = document.createElement('style');
      styleSheet.id = styleId;
      styleSheet.textContent = `
        /* Pulse Wave Animation */
        @keyframes pulseWave {
          0% {
            opacity: 0;
            transform: scaleX(0);
          }
          20% {
            opacity: 0.8;
            transform: scaleX(0.3);
          }
          40% {
            opacity: 0.6;
            transform: scaleX(0.6);
          }
          60% {
            opacity: 0.4;
            transform: scaleX(0.9);
          }
          80% {
            opacity: 0.2;
            transform: scaleX(1);
          }
          100% {
            opacity: 0;
            transform: scaleX(1);
          }
        }

        /* Vibe-specific pulse animations */
        .vibe-calm .pulse-wave-1 { animation-duration: 6s; }
        .vibe-calm .pulse-wave-2 { animation-duration: 6s; animation-delay: 1s; }
        .vibe-calm .pulse-wave-3 { animation-duration: 6s; animation-delay: 2s; }

        .vibe-safe .pulse-wave-1 { animation-duration: 5s; }
        .vibe-safe .pulse-wave-2 { animation-duration: 5s; animation-delay: 0.8s; }
        .vibe-safe .pulse-wave-3 { animation-duration: 5s; animation-delay: 1.6s; }

        .vibe-lively .pulse-wave-1 { animation-duration: 3s; }
        .vibe-lively .pulse-wave-2 { animation-duration: 3s; animation-delay: 0.4s; }
        .vibe-lively .pulse-wave-3 { animation-duration: 3s; animation-delay: 0.8s; }

        .vibe-festive .pulse-wave-1 { animation-duration: 2s; animation-timing-function: steps(4); }
        .vibe-festive .pulse-wave-2 { animation-duration: 2s; animation-timing-function: steps(4); animation-delay: 0.3s; }
        .vibe-festive .pulse-wave-3 { animation-duration: 2s; animation-timing-function: steps(4); animation-delay: 0.6s; }

        .vibe-noisy .pulse-wave-1 { animation-duration: 1.5s; animation-timing-function: linear; }
        .vibe-noisy .pulse-wave-2 { animation-duration: 1.5s; animation-timing-function: linear; animation-delay: 0.2s; }
        .vibe-noisy .pulse-wave-3 { animation-duration: 1.5s; animation-timing-function: linear; animation-delay: 0.4s; }

        .vibe-dangerous .pulse-wave-1 { animation-duration: 1s; animation-timing-function: ease-out; }
        .vibe-dangerous .pulse-wave-2 { animation-duration: 1s; animation-timing-function: ease-out; animation-delay: 0.1s; }
        .vibe-dangerous .pulse-wave-3 { animation-duration: 1s; animation-timing-function: ease-out; animation-delay: 0.2s; }

        /* Apply pulse animation to all waves */
        .pulse-wave-1, .pulse-wave-2, .pulse-wave-3 {
          animation: pulseWave ease-in-out infinite;
        }

        /* Vibe-specific colors */
        .vibe-calm { color: #10b981; }
        .vibe-safe { color: #3b82f6; }
        .vibe-lively { color: #f59e0b; }
        .vibe-festive { color: #8b5cf6; }
        .vibe-noisy { color: #ef4444; }
        .vibe-dangerous { color: #dc2626; }

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

          .pulse-container {
            padding-left: 120px !important;
            padding-right: 140px !important;
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
        }}>HyperApp</div>

        {/* Pulsing Light Animation - Connects app name to logout button */}
        <div className="pulse-container" style={{
          position: 'absolute',
          left: '0',
          right: '0',
          top: '50%',
          transform: 'translateY(-50%)',
          height: '4px',
          pointerEvents: 'none',
          zIndex: 1,
          paddingLeft: '100px', // Start after "HyperApp" text
          paddingRight: '120px', // End before far right logout button
        }}>
          <div className={`pulse-track vibe-${currentVibe}`} style={{
            position: 'relative',
            height: '100%',
            width: '100%',
            background: '#f8fafc',
            borderRadius: '2px',
            overflow: 'hidden',
          }}>
            <div className="pulse-wave pulse-wave-1" style={{
              position: 'absolute',
              top: '0',
              left: '0',
              width: '100%',
              height: '100%',
              borderRadius: '2px',
              opacity: '0',
              transform: 'scaleX(0)',
              transformOrigin: 'left center',
              background: 'linear-gradient(90deg, transparent 0%, currentColor 20%, currentColor 80%, transparent 100%)',
            }}></div>
            <div className="pulse-wave pulse-wave-2" style={{
              position: 'absolute',
              top: '0',
              left: '0',
              width: '100%',
              height: '100%',
              borderRadius: '2px',
              opacity: '0',
              transform: 'scaleX(0)',
              transformOrigin: 'left center',
              background: 'linear-gradient(90deg, transparent 0%, currentColor 30%, currentColor 70%, transparent 100%)',
            }}></div>
            <div className="pulse-wave pulse-wave-3" style={{
              position: 'absolute',
              top: '0',
              left: '0',
              width: '100%',
              height: '100%',
              borderRadius: '2px',
              opacity: '0',
              transform: 'scaleX(0)',
              transformOrigin: 'left center',
              background: 'linear-gradient(90deg, transparent 0%, currentColor 40%, currentColor 60%, transparent 100%)',
            }}></div>
          </div>
        </div>

        {/* Logout Button - Far Right Side */}
        <button className="logout-btn" onClick={handleLogout} style={{
          position: 'absolute',
          right: '0',
          top: '50%',
          transform: 'translateY(-50%)',
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
