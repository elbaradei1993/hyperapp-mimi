import React from 'react'; // Removed useState as it's no longer needed in RootApp
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
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

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

// Initialize Google Auth plugin for mobile
GoogleAuth.initialize({
  clientId: '1096420795648-tvflndafmrrnibhc90fqkadqdn8cnssu.apps.googleusercontent.com',
  scopes: ['profile', 'email'],
  grantOfflineAccess: true,
}).catch((error: any) => {
  console.warn('Google Auth initialization failed:', error);
});

// Pre-load news data for instant display when community tab is opened
rssService.preLoadNews().catch(error => {
  console.warn('Failed to pre-load news data:', error);
});

// Removed useAuth import as it's no longer used directly in RootApp
// import { useAuth } from './contexts/AuthContext';

const RootApp: React.FC = () => {
  // Removed isLoading check and SplashScreen rendering from here
  // const { isLoading } = useAuth();
  // if (isLoading) {
  //   return <SplashScreen />;
  // }

  return (
    <ErrorBoundary>
      {/* App component will now handle its own loading state and SplashScreen */}
      <App />
    </ErrorBoundary>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ChakraProvider value={defaultSystem}>
      <NotificationProvider>
        <AuthProvider>
          <ThemeProvider>
            <RootApp />
          </ThemeProvider>
        </AuthProvider>
      </NotificationProvider>
    </ChakraProvider>
  </React.StrictMode>
);
