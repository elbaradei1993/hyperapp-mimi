import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import SplashScreen from './components/SplashScreen';
import { ThemeProvider } from './contexts/ThemeContext';
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

const RootApp: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  return (
    <React.StrictMode>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </React.StrictMode>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<RootApp />);
