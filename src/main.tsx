import React from 'react'; // Removed useState as it's no longer needed in RootApp
import ReactDOM from 'react-dom/client';
import App from './App';
// SplashScreen will be handled inside App.tsx now
// import SplashScreen from './components/SplashScreen';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
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

// Removed useAuth import as it's no longer used directly in RootApp
// import { useAuth } from './contexts/AuthContext';

const RootApp: React.FC = () => {
  // Removed isLoading check and SplashScreen rendering from here
  // const { isLoading } = useAuth();
  // if (isLoading) {
  //   return <SplashScreen />;
  // }

  return (
    // App component will now handle its own loading state and SplashScreen
    <App />
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <NotificationProvider>
      <AuthProvider>
        <ThemeProvider>
          <RootApp />
        </ThemeProvider>
      </AuthProvider>
    </NotificationProvider>
  </React.StrictMode>
);
