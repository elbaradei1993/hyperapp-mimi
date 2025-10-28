import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface SplashScreenProps {
  onComplete: () => void;
  minDisplayTime?: number;
}

const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  minDisplayTime = 2500
}) => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(true);
  const [showContent, setShowContent] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Start showing content with a slight delay for smooth entrance
    setTimeout(() => setShowContent(true), 100);

    // Progress animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev; // Stop at 90% until completion
        return prev + Math.random() * 15;
      });
    }, 200);

    // Ensure minimum display time, then complete
    const timer = setTimeout(() => {
      setProgress(100); // Complete progress

      // Fade out after a brief moment
      setTimeout(() => {
        setIsVisible(false);

        // Wait for fade-out animation to complete
        setTimeout(() => {
          onComplete();
        }, 600);
      }, 300);
    }, minDisplayTime);

    return () => {
      clearTimeout(timer);
      clearInterval(progressInterval);
    };
  }, [onComplete, minDisplayTime]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-600 ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      style={{
        background: `
          radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.15) 0%, transparent 50%),
          radial-gradient(circle at 40% 40%, rgba(120, 119, 198, 0.1) 0%, transparent 50%),
          linear-gradient(135deg,
            #667eea 0%,
            #764ba2 25%,
            #f093fb 50%,
            #f5576c 75%,
            #4facfe 100%
          )
        `,
        backgroundSize: '400% 400%',
        animation: 'gradient-shift 8s ease infinite'
      }}
    >
      {/* Floating particles background */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white/10 animate-float"
            style={{
              width: `${Math.random() * 60 + 20}px`,
              height: `${Math.random() * 60 + 20}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${Math.random() * 3 + 4}s`
            }}
          />
        ))}
      </div>

      {/* Centered typography content - no container */}
      <div className={`text-center transform transition-all duration-1000 ${
        showContent ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'
      }`}>
        {/* Hero App Name */}
        <div className="relative mb-8">
          {/* Background glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-white/10 blur-3xl scale-150 opacity-50 transform -translate-x-1/2 -translate-y-1/2"></div>

          {/* Main title with premium styling */}
          <h1 className="relative text-xl md:text-2xl font-black text-white tracking-wide drop-shadow-2xl animate-fade-in-up"
              style={{
                fontFamily: 'system-ui, -apple-system, sans-serif',
                letterSpacing: '0.1em',
                textShadow: `
                  0 0 15px rgba(255, 255, 255, 0.5),
                  0 0 30px rgba(255, 255, 255, 0.3),
                  0 0 45px rgba(255, 255, 255, 0.2),
                  2px 2px 4px rgba(0, 0, 0, 0.3)
                `,
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #e2e8f0 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
            HYPERAPP
          </h1>
        </div>

        {/* Elegant slogan */}
        <div className="relative mb-12">
          <p className="text-sm md:text-base font-light text-white/90 tracking-widest uppercase animate-fade-in-up"
             style={{
               animationDelay: '0.3s',
               animationFillMode: 'both',
               letterSpacing: '0.15em',
               textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
             }}>
            Stay Safe...Stay Connected
          </p>

          {/* Subtle underline accent */}
          <div className="mx-auto mt-6 w-40 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent animate-fade-in-up"
               style={{
                 animationDelay: '0.6s',
                 animationFillMode: 'both'
               }}></div>
        </div>

        {/* Loading section - centered below */}
        <div className="text-center">
          {/* Circular progress indicator */}
          <div className="relative inline-block mb-6">
            <svg className="w-6 h-6 transform -rotate-90" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth="8"
                className="drop-shadow-sm"
              />
              {/* Progress circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="url(#progressGradient)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
                className="transition-all duration-300 ease-out drop-shadow-lg"
                style={{
                  filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))'
                }}
              />
              <defs>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#e0e7ff" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#c7d2fe" stopOpacity="0.7" />
                </linearGradient>
              </defs>
            </svg>

            {/* Center dot */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse drop-shadow-sm"></div>
            </div>
          </div>

          {/* Loading text */}
          <p className="text-white/70 text-sm font-medium mb-4 animate-fade-in-up"
             style={{
               animationDelay: '0.8s',
               animationFillMode: 'both'
             }}>
            {t('app.loadingHyperApp')}
          </p>

          {/* Progress percentage */}
          <div className="text-white/50 text-xs font-mono animate-fade-in-up"
               style={{
                 animationDelay: '1s',
                 animationFillMode: 'both'
               }}>
            {Math.round(progress)}%
          </div>
        </div>
      </div>

      {/* Custom CSS animations */}
      <style>
        {`
          @keyframes gradient-shift {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }

          @keyframes float {
            0%, 100% {
              transform: translateY(0px) rotate(0deg);
              opacity: 0.3;
            }
            50% {
              transform: translateY(-20px) rotate(180deg);
              opacity: 0.6;
            }
          }

          @keyframes heartbeat {
            0%, 100% {
              transform: scale(1);
              filter: brightness(1) drop-shadow(0 2px 8px rgba(255, 255, 255, 0.3));
            }
            25% {
              transform: scale(1.05);
              filter: brightness(1.1) drop-shadow(0 4px 12px rgba(255, 255, 255, 0.4));
            }
            50% {
              transform: scale(1.08);
              filter: brightness(1.15) drop-shadow(0 6px 16px rgba(255, 255, 255, 0.5));
            }
            75% {
              transform: scale(1.05);
              filter: brightness(1.1) drop-shadow(0 4px 12px rgba(255, 255, 255, 0.4));
            }
          }

          @keyframes fade-in-up {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .animate-float {
            animation: float 6s ease-in-out infinite;
          }

          .animate-heartbeat {
            animation: heartbeat 2s ease-in-out infinite;
          }

          .animate-fade-in-up {
            animation: fade-in-up 0.8s ease-out forwards;
          }

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
  );
};

export default SplashScreen;
