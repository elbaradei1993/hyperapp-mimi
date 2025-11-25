import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// SplashScreen will be handled inside App.tsx now
// import SplashScreen from './components/SplashScreen';
import ErrorBoundary from './components/ErrorBoundary';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { rssService } from './services/rss';
// import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';

import './index.css';
import './themes.css';
import './i18n';

// Mobile viewport height fix
const setVH = () => {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
};

// Set initial viewport height
setVH();

// Update viewport height on resize/orientation change
window.addEventListener('resize', setVH);
window.addEventListener('orientationchange', () => {
  // Delay to account for mobile browser UI changes
  setTimeout(setVH, 100);
});

// Initialize Google Auth plugin for mobile (disabled for now to fix 500 error)
// GoogleAuth.initialize({
//   clientId: '1096420795648-tvflndafmrrnibhc90fqkadqdn8cnssu.apps.googleusercontent.com',
//   scopes: ['profile', 'email'],
//   grantOfflineAccess: true,
// }).catch((error: any) => {
//   console.warn('Google Auth initialization failed:', error);
// });

// Pre-load news data for instant display when community tab is opened
rssService.preLoadNews().catch(error => {
  console.warn('Failed to pre-load news data:', error);
});

// Capacitor-ready app wrapper
const CapacitorApp: React.FC = () => {
  useEffect(() => {
    const initializeCapacitor = async () => {
      try {
        console.log('🔧 Initializing Capacitor...');

        // Initialize Capacitor asynchronously without blocking app render
        if (Capacitor.isNativePlatform()) {
          console.log('📱 Running on native platform, initializing Capacitor...');
          await new Promise(resolve => {
            // Wait for deviceready or DOM ready
            if (document.readyState === 'complete') {
              resolve(void 0);
            } else {
              document.addEventListener('DOMContentLoaded', resolve);
            }
          });

          // Small delay to ensure Capacitor plugins are ready
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log('✅ Capacitor ready');
      } catch (error) {
        console.error('❌ Capacitor initialization error:', error);
        // Continue anyway - app should still work
      }
    };

    initializeCapacitor();
  }, []);

  return (
    <ErrorBoundary>
      <ChakraProvider value={defaultSystem}>
        <NotificationProvider>
          <AuthProvider>
            <ThemeProvider>
              <App />
            </ThemeProvider>
          </AuthProvider>
        </NotificationProvider>
      </ChakraProvider>
    </ErrorBoundary>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <CapacitorApp />
  </React.StrictMode>
);
