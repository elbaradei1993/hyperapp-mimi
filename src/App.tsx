import React, { useState, useEffect, Suspense, lazy, useCallback, useMemo, useRef } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useNotification } from './contexts/NotificationContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { VibeProvider } from './contexts/VibeContext';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { NotificationManager } from './components/shared/Notification';
import TabNavigation, { TabType } from './components/TabNavigation';
import Header from './components/Header';
import AuthModal from './components/AuthModal';
import AuthCallback from './components/AuthCallback';
import OnboardingModal from './components/OnboardingModal';
import ReportTypeModal from './components/ReportTypeModal';
import VibeReportModal from './components/VibeReportModal';
import EmergencyReportModal from './components/EmergencyReportModal';
import LocationOverrideModal from './components/LocationOverrideModal';
import LocationPermissionModal from './components/LocationPermissionModal';

import SplashScreen from './components/SplashScreen';
import ErrorBoundary from './components/ErrorBoundary';
import { LoadingSpinner } from './components/shared';
import { reportsService } from './services/reports';
import { storageManager } from './lib/storage';
import { notificationService } from './services/notificationService';
import { pushNotificationService } from './services/pushNotificationService';
import { fcmService } from './lib/firebase';
import { locationService } from './services/locationService';
import { Capacitor } from '@capacitor/core';
import { Box, Text as ChakraText } from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Vibe, SOS } from './types';

// Lazy load heavy components for code splitting
const MapComponent = lazy(() => import('./components/MapComponent'));
const ProfileView = lazy(() => import('./components/ProfileView'));
const SettingsView = lazy(() => import('./components/SettingsView'));
// @ts-ignore - CommunityDashboard has default export but TypeScript can't infer it
const CommunityDashboard = lazy(() => import('./components/CommunityDashboard'));

const AppContent: React.FC = () => {
  const { user, isAuthenticated, isLoading, updateProfile } = useAuth();
  const { notifications, removeNotification, addNotification, markAsRead, markAllAsRead, clearAll } = useNotification();
  const { settings } = useSettings();
  const [activeTab, setActiveTab] = useState<TabType>('map');
  const [vibes, setVibes] = useState<Vibe[]>([]);
  const [sosAlerts, setSosAlerts] = useState<SOS[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [isHeatmapVisible, setIsHeatmapVisible] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [showReportTypeModal, setShowReportTypeModal] = useState(false);
  const [showVibeReportModal, setShowVibeReportModal] = useState(false);
  const [showEmergencyReportModal, setShowEmergencyReportModal] = useState(false);
  const [showLocationOverride, setShowLocationOverride] = useState(false);

  const [locationInitialized, setLocationInitialized] = useState(false);
  const [showGPSHelp, setShowGPSHelp] = useState<boolean>(false);
  const [targetLocation, setTargetLocation] = useState<[number, number] | null>(null);
  const [locationPermissionStatus, setLocationPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
  const [showLocationPermissionModal, setShowLocationPermissionModal] = useState(false);
  const [locationRefreshInterval, setLocationRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [lastLocationUpdate, setLastLocationUpdate] = useState<number>(0);

  // Default center (Cairo, Egypt)
  const center: [number, number] = [30.0444, 31.2357];
  const zoom = 10;

  // Show auth modal directly for non-authenticated users (moved to top with other hooks)
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setShowAuthModal(true);
    }
  }, [isLoading, isAuthenticated]);

  // Request notification permission on app startup (only if notifications are enabled)
  useEffect(() => {
    const requestNotificationPermission = async () => {
      // Only request if notifications are enabled in settings
      if (!settings.notifications) {
        console.log('🔔 Notifications disabled in settings, skipping permission request');
        return;
      }

      try {
        console.log('🔔 Requesting notification permission on app startup...');

        // Check if we've already requested permission this session
        const permissionRequested = await storageManager.get('notificationPermissionRequested');
        if (permissionRequested === 'true') {
          console.log('🔔 Notification permission already requested this session');
          return;
        }

        // Request permission
        const token = await fcmService.requestPermission();

        if (token) {
          console.log('🔔 Notification permission granted on startup');
          // Mark as requested to avoid repeated prompts
          await storageManager.set('notificationPermissionRequested', 'true');
        } else {
          console.log('🔔 Notification permission denied or not supported');
          // Still mark as requested to avoid repeated prompts
          await storageManager.set('notificationPermissionRequested', 'true');
        }
      } catch (error) {
        console.error('Error requesting notification permission on startup:', error);
      }
    };

    // Only request permission after a short delay to ensure the app is fully loaded
    const timer = setTimeout(() => {
      requestNotificationPermission();
    }, 2000); // 2 second delay

    return () => clearTimeout(timer);
  }, [settings.notifications]);

  useEffect(() => {
    // Check authentication state on app load
    if (!isLoading) {
      if (isAuthenticated) {
        // Check if user needs onboarding (not completed yet)
        if (!user?.onboarding_completed) {
          setShowOnboardingModal(true);
        } else {
          // User is authenticated and onboarded, load app data
          loadData();
        }
      }
      // If not authenticated, just show the app normally - no forced auth modal
    }

    // Only initialize location once
    if (!locationInitialized && isAuthenticated && user?.onboarding_completed && settings.locationSharing) {
      setLocationInitialized(true);

      // Initialize location service
      const initializeLocation = async () => {
        try {
          console.log('🚀 Initializing location service...');

          // Try to get current position first
          const position = await locationService.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 30000
          });

          setUserLocation([position.latitude, position.longitude]);
          setLastLocationUpdate(Date.now());
          console.log(`📍 Initial location set: ${position.latitude.toFixed(6)}, ${position.longitude.toFixed(6)} (${Math.round(position.accuracy)}m)`);

          // Start watching for location updates
          const watchId = await locationService.watchPosition(
            (result) => {
              const now = Date.now();
              // Only update if it's been at least 30 seconds since last update
              if (now - lastLocationUpdate < 30000) {
                return;
              }

              setUserLocation([result.latitude, result.longitude]);
              setLastLocationUpdate(now);
              console.log(`🔄 Location updated: ${result.latitude.toFixed(6)}, ${result.longitude.toFixed(6)} (${Math.round(result.accuracy)}m)`);
            },
            (error) => {
              console.log('⚠️ Location watch error:', error.message);
            },
            {
              enableHighAccuracy: true,
              timeout: 30000,
              maximumAge: 30000
            }
          );

          // Set up automatic location refresh every 2 minutes
          const refreshInterval = setInterval(async () => {
            const now = Date.now();
            const timeSinceLastUpdate = now - lastLocationUpdate;

            // Only refresh if it's been more than 1.5 minutes since last update
            if (timeSinceLastUpdate > 90 * 1000) {
              try {
                console.log('⏰ Automatic location refresh');
                const newPosition = await locationService.getCurrentPosition({
                  enableHighAccuracy: true,
                  timeout: 10000
                });
                setUserLocation([newPosition.latitude, newPosition.longitude]);
                setLastLocationUpdate(Date.now());
              } catch (error) {
                console.log('⚠️ Automatic location refresh failed:', error.message);
              }
            }
          }, 2 * 60 * 1000); // 2 minutes

          setLocationRefreshInterval(refreshInterval);

          // Cleanup function
          return () => {
            locationService.clearWatch(watchId);
            if (refreshInterval) {
              clearInterval(refreshInterval);
            }
          };

        } catch (error: any) {
          console.log('❌ Initial location failed:', error?.message || error);

          // Fallback to IP-based location for web
          if (!Capacitor.isNativePlatform()) {
            try {
              // Use IP geolocation as fallback
              const response = await fetch('https://ipapi.co/json/');
              const data = await response.json();
              if (data.latitude && data.longitude) {
                const location: [number, number] = [data.latitude, data.longitude];
                setUserLocation(location);
                console.log(`📍 IP Location fallback: ${data.latitude}, ${data.longitude} (${data.city || 'Unknown'})`);
              }
            } catch (ipError) {
              console.log('❌ IP geolocation fallback failed');
              // Use default location
              const defaultLocation: [number, number] = [30.0444, 31.2357]; // Cairo, Egypt
              setUserLocation(defaultLocation);
              console.log(`📍 Using default location: ${defaultLocation[0]}, ${defaultLocation[1]}`);
            }
          } else {
            // On mobile, show permission guidance
            setShowLocationPermissionModal(true);
          }
        }
      };

      initializeLocation();
    }
  }, [isAuthenticated, isLoading, locationInitialized, lastLocationUpdate, locationPermissionStatus, settings.locationSharing]);

  // Initialize notification service when user is authenticated - with guards to prevent re-initialization
  useEffect(() => {
    if (isAuthenticated && user?.onboarding_completed) {
      const currentUserId = notificationService.getCurrentUserId();

      // Only initialize if not already initialized for this user
      if (currentUserId !== user.id) {
        // Set up notification service with real context methods
        notificationService.setNotificationContext({
          notifications: notifications,
          unreadCount: notifications.filter(n => !n.read).length,
          recentNotifications: notifications.filter(n => {
            const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
            return n.timestamp >= twelveHoursAgo;
          }),
          addNotification: (notification) => {
            // Use the real addNotification from useNotification hook
            return addNotification(notification);
          },
          removeNotification,
          markAsRead,
          markAllAsRead,
          clearAll
        });

        // Set current user ID to filter out own reports
        notificationService.setCurrentUserId(user.id);

        // Update user location when it changes
        if (userLocation) {
          notificationService.setUserLocation(userLocation);
        }

        // Initialize push notifications
        pushNotificationService.initialize(user.id);

        // Start monitoring reports for notifications
        notificationService.startMonitoring();

        console.log('🔔 Notification services initialized for user:', user.id);
      } else {
        // Just update location if user is already initialized
        if (userLocation) {
          notificationService.setUserLocation(userLocation);
        }
      }
    } else {
      // Stop monitoring when user logs out
      notificationService.stopMonitoring();
      notificationService.setCurrentUserId(null);
      pushNotificationService.cleanup();
    }

    // Cleanup on unmount
    return () => {
      notificationService.stopMonitoring();
      notificationService.setCurrentUserId(null);
      pushNotificationService.cleanup();
    };
  }, [isAuthenticated, user?.onboarding_completed, user?.id, userLocation]); // Removed notifications dependencies to prevent re-initialization

  // Memoize subscriptions ref to prevent recreation
  const subscriptionsRef = useRef<{ reports?: { unsubscribe: () => void }; votes?: { unsubscribe: () => void } }>({});

  // Debounced data loading to prevent excessive API calls
  const debouncedLoadData = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      let lastLoadTime = 0;
      return () => {
        const now = Date.now();
        // Only allow loading every 5 seconds to prevent excessive API calls
        if (now - lastLoadTime < 5000) {
          return; // Skip if loaded recently
        }

        clearTimeout(timeoutId);
        timeoutId = setTimeout(async () => {
          try {
            // Load vibes and SOS alerts from Supabase with error handling
            const [vibesData, sosData] = await Promise.all([
              reportsService.getVibes({ limit: 500 }),    // Reduced from 1000 to 500
              reportsService.getSOSAlerts({ limit: 200 }) // Reduced from 500 to 200
            ]);

            setVibes(vibesData || []);
            setSosAlerts(sosData || []);
            lastLoadTime = Date.now();
          } catch (error) {
            console.error('Error loading data:', error);
            // Fallback to empty arrays if loading fails - app still works
            setVibes([]);
            setSosAlerts([]);
          }
        }, 500); // Increased debounce to 500ms
      };
    })(),
    []
  );

  const loadData = useCallback(async () => {
    if (dataLoaded) return; // Prevent reloading if data is already loaded
    debouncedLoadData();
    setDataLoaded(true);
  }, [debouncedLoadData, dataLoaded]);

  // Optimized subscription setup with proper cleanup
  useEffect(() => {
    if (!isAuthenticated || !user?.onboarding_completed) return;

    // Clean up existing subscriptions
    Object.values(subscriptionsRef.current).forEach(subscription => {
      subscription?.unsubscribe?.();
    });
    subscriptionsRef.current = {};

    // Set up optimized real-time subscriptions
    subscriptionsRef.current.reports = reportsService.subscribeToReports((newReport) => {
      // Use functional updates to avoid stale closure issues
      if (newReport.emergency) {
        setSosAlerts(prev => [newReport, ...prev.slice(0, 499)]); // Limit to prevent memory issues
      } else {
        setVibes(prev => [newReport, ...prev.slice(0, 999)]); // Limit to prevent memory issues
      }
    });

    subscriptionsRef.current.votes = reportsService.subscribeToVotes((update) => {
      // Batch updates for better performance
      setVibes(prev => prev.map(vibe =>
        vibe.id === update.reportId
          ? { ...vibe, upvotes: update.upvotes, downvotes: update.downvotes }
          : vibe
      ));
      setSosAlerts(prev => prev.map(sos =>
        sos.id === update.reportId
          ? { ...sos, upvotes: update.upvotes, downvotes: update.downvotes }
          : sos
      ));
    });

    // Cleanup function
    return () => {
      Object.values(subscriptionsRef.current).forEach(subscription => {
        subscription?.unsubscribe?.();
      });
      subscriptionsRef.current = {};
    };
  }, [isAuthenticated, user?.onboarding_completed]);

  const handleToggleHeatmap = () => {
    setIsHeatmapVisible(!isHeatmapVisible);
  };

  const handleAuthModalClose = () => {
    setShowAuthModal(false);
  };

  const handleOnboardingComplete = () => {
    setShowOnboardingModal(false);
    loadData(); // Load app data after onboarding
  };

  const handleOnboardingSkip = async () => {
    if (user) {
      // Mark onboarding as completed when skipped so user can access the app
      try {
        await updateProfile({
          onboarding_completed: true,
          onboarding_step: 4,
          profile_completed_at: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error marking onboarding as completed:', error);
        // Continue anyway - user should still be able to use the app
      }
    }
    setShowOnboardingModal(false);
    loadData(); // Load app data even if onboarding is skipped
  };

  const handleNewReport = () => {
    setShowReportTypeModal(true);
  };

  const handleSelectVibe = () => {
    setShowReportTypeModal(false);
    setShowVibeReportModal(true);
  };

  const handleSelectEmergency = () => {
    setShowEmergencyReportModal(true);
  };

  const handleReportSuccess = async () => {
    // Refresh data after successful report
    loadData();

    // Trigger push notifications to nearby users
    // Note: The actual report data will be handled by the realtime subscription
    console.log('📤 Report submitted successfully - push notifications will be sent via realtime subscription');

    // TEMPORARY: Add a test notification to verify the system works
    addNotification({
      type: 'success',
      title: 'Report Submitted Successfully!',
      message: 'Your safety report has been shared with the community.',
      duration: 3000
    });
  };



  const handleNavigateToMap = useCallback((latitude: number, longitude: number) => {
    console.log('handleNavigateToMap called with:', latitude, longitude);
    // Set target location and switch to map tab
    setTargetLocation([latitude, longitude]);
    setActiveTab('map');
  }, []);

  const handleNavigateToProfile = useCallback((userId: string) => {
    // Switch to profile tab (ProfileView currently only shows current user)
    setActiveTab('profile');
  }, []);

  // Check for auth callback URL
  const isAuthCallback = window.location.pathname === '/auth/callback';

  // Show loading screen while checking auth
  if (isLoading && !isAuthCallback) {
    return <SplashScreen />;
  }

  // Handle auth callback
  if (isAuthCallback) {
    return <AuthCallback />;
  }


  const renderActiveView = () => {
    const LoadingFallback = () => (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100%"
        flexDirection="column"
        gap={4}
      >
        <LoadingSpinner />
        <ChakraText color="gray.500" fontSize="sm">Loading...</ChakraText>
      </Box>
    );

    const pageVariants = {
      initial: { opacity: 0, y: 20 },
      in: { opacity: 1, y: 0 },
      out: { opacity: 0, y: -20 }
    };

    const pageTransition = {
      duration: 0.4
    };

    const view = (() => {
      switch (activeTab) {
        case 'map':
          return (
            <Suspense fallback={<LoadingFallback />}>
              <MapComponent
                vibes={vibes}
                sosAlerts={sosAlerts}
                center={center}
                zoom={zoom}
                userLocation={userLocation}
                isHeatmapVisible={isHeatmapVisible}
                onToggleHeatmap={handleToggleHeatmap}
                userId={user?.id || 'demo-user'}
                targetLocation={targetLocation}
              />
            </Suspense>
          );
        case 'profile':
          return (
            <Suspense fallback={<LoadingFallback />}>
              <ProfileView />
            </Suspense>
          );
        case 'reports':
          return (
            <Suspense fallback={<LoadingFallback />}>
              <CommunityDashboard
                vibes={vibes}
                userLocation={userLocation}
                isLoading={false}
                onNewReport={handleNewReport}
                onNavigateToMap={handleNavigateToMap}
                onNavigateToProfile={handleNavigateToProfile}
              />
            </Suspense>
          );
        case 'settings':
          return (
            <Suspense fallback={<LoadingFallback />}>
              <SettingsView />
            </Suspense>
          );
        default:
          return null;
      }
    })();

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial="initial"
          animate="in"
          exit="out"
          variants={pageVariants}
          transition={pageTransition}
          style={{ height: '100%', width: '100%' }}
        >
          {view}
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      backgroundColor: 'var(--bg-secondary)',
      // Prevent horizontal scrolling on mobile
      overflowX: 'hidden',
      // Ensure proper mobile viewport handling
      WebkitOverflowScrolling: 'touch'
    }}>
      {/* GPS Help Notification - Mobile optimized */}
      {isAuthenticated && user?.onboarding_completed && activeTab === 'map' && showGPSHelp && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#fef3c7',
          border: '1px solid #f59e0b',
          padding: '12px 16px',
          borderRadius: '12px',
          zIndex: 2000,
          fontSize: '14px',
          color: '#92400e',
          maxWidth: 'calc(100vw - 32px)',
          width: '320px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          // Mobile-specific improvements
          WebkitTapHighlightColor: 'transparent'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '15px' }}>📍 Improve GPS Accuracy</div>
          <div style={{ fontSize: '13px', lineHeight: '1.4' }}>
            For better location accuracy:
            <br />• Go outdoors with clear sky view
            <br />• Wait 1-2 minutes for GPS lock
            <br />• Enable location permissions
            <br />• Disable battery saver mode
          </div>
          <button
            onClick={() => setShowGPSHelp(false)}
            style={{
              background: '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '12px',
              cursor: 'pointer',
              marginTop: '10px',
              minHeight: '32px',
              // Mobile touch target
              WebkitTapHighlightColor: 'transparent',
              WebkitAppearance: 'none'
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main App Content - Mobile optimized */}
      {isAuthenticated && user?.onboarding_completed && (
        <>
          {/* Header */}
          <Header
            onNavigateToProfile={() => setActiveTab('profile')}
          />

          <div style={{
            // Minimal height - just header + safe area, let tabs overlay
            height: 'calc(var(--vh, 1vh) * 100 - 80px - env(safe-area-inset-bottom, 0px))',
            width: '100vw',
            // Account for fixed header height
            paddingTop: 'calc(80px + env(safe-area-inset-top, 0px))',
            // Use specific overflow properties to avoid conflicts
            overflowY: (activeTab === 'profile' || activeTab === 'settings' || activeTab === 'reports') ? 'auto' : 'hidden',
            overflowX: 'hidden',
            // Mobile scrolling improvements
            WebkitOverflowScrolling: 'touch',
            // Ensure proper stacking context
            position: 'relative'
          }}>
            {renderActiveView()}
          </div>

          {/* Tab Navigation */}
          <TabNavigation
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onNewReport={handleNewReport}
          />
        </>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={handleAuthModalClose}
      />

      {/* Onboarding Modal */}
      <OnboardingModal
        isOpen={showOnboardingModal}
        onComplete={handleOnboardingComplete}
        onClose={handleOnboardingSkip}
      />

      {/* Report Type Selection Modal */}
      <ReportTypeModal
        isOpen={showReportTypeModal}
        onClose={() => setShowReportTypeModal(false)}
        onSelectVibe={handleSelectVibe}
        onSelectEmergency={handleSelectEmergency}
      />

      {/* Vibe Report Modal */}
      <VibeReportModal
        isOpen={showVibeReportModal}
        onClose={() => setShowVibeReportModal(false)}
        onSuccess={handleReportSuccess}
        currentLocation={userLocation}
      />

      {/* Emergency Report Modal */}
      <EmergencyReportModal
        isOpen={showEmergencyReportModal}
        onClose={() => setShowEmergencyReportModal(false)}
        onSuccess={handleReportSuccess}
      />

      {/* Location Override Modal */}
      <LocationOverrideModal
        isOpen={showLocationOverride}
        onClose={() => setShowLocationOverride(false)}
        onLocationSet={setUserLocation}
        currentLocation={userLocation}
      />

      {/* Location Permission Modal */}
      <LocationPermissionModal
        isOpen={showLocationPermissionModal}
        onClose={() => setShowLocationPermissionModal(false)}
        onManualLocation={() => {
          setShowLocationPermissionModal(false);
          setShowLocationOverride(true);
        }}
      />

      {/* Global Notifications */}
      <NotificationManager
        notifications={notifications}
        onRemove={removeNotification}
      />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <VibeProvider>
        <SettingsProvider>
          <AppContent />
        </SettingsProvider>
      </VibeProvider>
    </LanguageProvider>
  );
};

export default App;
