import React, { useState, useEffect, Suspense, lazy, useCallback, useMemo, useRef } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useNotification } from './contexts/NotificationContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { VibeProvider } from './contexts/VibeContext';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { NotificationManager } from './components/shared/Notification';
import TabNavigation, { TabType } from './components/TabNavigation';

import Header from './components/Header';
import AuthModal from './components/AuthModal';
import AuthCallback from './components/AuthCallback';
import MagicLinkAuth from './components/MagicLinkAuth';
import GuardianInvitationHandler from './components/GuardianInvitationHandler';
import ReportTypeModal from './components/ReportTypeModal';
import VibeReportModal from './components/VibeReportModal';
import EmergencyReportModal from './components/EmergencyReportModal';
import LocationOverrideModal from './components/LocationOverrideModal';
import LocationPermissionModal from './components/LocationPermissionModal';
import EmailVerificationWarning from './components/EmailVerificationWarning';

import SplashScreen from './components/SplashScreen';
import LanguageSelectionScreen from './components/LanguageSelectionScreen';

import ErrorBoundary from './components/ErrorBoundary';
import { LoadingSpinner } from './components/shared';
import { reportsService } from './services/reports';
import { userLocationService, NearbyUser } from './services/userLocationService';
import { storageManager } from './lib/storage';
import { notificationService } from './services/notificationService';
import { pushNotificationService } from './services/pushNotificationService';
import { fcmService } from './lib/firebase';
import { locationService } from './services/locationService';
import { Capacitor } from '@capacitor/core';
import { Box, Text as ChakraText } from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Vibe, SOS } from './types';

// Import main tab components directly to avoid loading states on tab switch
import MapComponent from './components/MapComponent';
import ProfileView from './components/ProfileView';
import SettingsView from './components/SettingsView';
// @ts-ignore - CommunityDashboard has default export but TypeScript can't infer it
import CommunityDashboard from './components/CommunityDashboard';
import GuardianView from './components/GuardianView';
import HubView from './components/HubView';

// Keep AdminLocationDashboard lazy-loaded as it's not used in main tabs
const AdminLocationDashboard = lazy(() => import('./components/AdminLocationDashboard'));


const AppContent: React.FC = () => {
  const { user, isAuthenticated, isLoading, updateProfile } = useAuth();
  const { currentLanguage } = useLanguage();
  const { notifications, removeNotification, addNotification, markAsRead, markAllAsRead, clearAll } = useNotification();
  const { settings } = useSettings();
  const [activeTab, setActiveTab] = useState<TabType>('map');
  const [vibes, setVibes] = useState<Vibe[]>([]);
  const [sosAlerts, setSosAlerts] = useState<SOS[]>([]);
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [isHeatmapVisible, setIsHeatmapVisible] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showLanguageSelection, setShowLanguageSelection] = useState(false);
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
  const [nearbyUsersRefreshInterval, setNearbyUsersRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [lastLocationUpdate, setLastLocationUpdate] = useState<number>(0);
  const [lastNearbyUsersUpdate, setLastNearbyUsersUpdate] = useState<number>(0);

  // Default center (Cairo, Egypt)
  const center: [number, number] = [30.0444, 31.2357];
  const zoom = 10;

  // Show language selection or auth modal for non-authenticated users
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const savedLanguage = localStorage.getItem('language');
      if (!savedLanguage) {
        // New user - show language selection
        setShowLanguageSelection(true);
      } else {
        // Existing user - show auth modal
        setShowAuthModal(true);
      }
    }
  }, [isLoading, isAuthenticated]);

  // Handle post-authentication redirects (e.g., from guardian invitations)
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const redirectUrl = sessionStorage.getItem('postAuthRedirect');
      if (redirectUrl) {
        console.log('🔄 Redirecting to post-auth URL:', redirectUrl);
        sessionStorage.removeItem('postAuthRedirect');
        window.location.href = redirectUrl;
      }
    }
  }, [isAuthenticated, isLoading]);

  // Show persistent reminder for denied permissions on every app startup
  useEffect(() => {
    const showPermissionReminder = async () => {
      // Only show reminder if user is authenticated and has completed onboarding
      if (!isAuthenticated || !user?.onboarding_completed) {
        return;
      }

      // Check current permission status
      const currentPermission = await fcmService.getPermissionStatus();
      console.log('🔔 Checking permission status for reminder:', currentPermission);

      // If permission is denied, show persistent reminder on every app startup
      if (currentPermission === 'denied') {
        console.log('🔔 Permission is denied - showing persistent reminder on app startup');
        // Add a notification to remind user to enable notifications
        addNotification({
          type: 'warning',
          title: 'Notifications Disabled',
          message: 'Enable notifications in your browser settings to receive safety alerts. Click the lock icon in the address bar.',
          duration: 10000 // Show for 10 seconds
        });
      }
    };

    // Show reminder when user is authenticated and onboarding is complete
    if (isAuthenticated && user?.onboarding_completed) {
      showPermissionReminder();
    }
  }, [isAuthenticated, user?.onboarding_completed, user?.id, addNotification]);

  // Request notification permission when user is authenticated and onboarding is complete
  useEffect(() => {
    const requestNotificationPermission = async () => {
      // Only request if user is authenticated and has completed onboarding
      if (!isAuthenticated || !user?.onboarding_completed) {
        console.log('🔔 Skipping notification permission request - user not ready');
        return;
      }

      // Check current permission status
      const currentPermission = await fcmService.getPermissionStatus();
      console.log('🔔 Current notification permission status:', currentPermission);

      // If permission is already granted and notifications are enabled, initialize
      if (currentPermission === 'granted' && settings.notifications) {
        console.log('🔔 Permission already granted, initializing push notifications...');
        await pushNotificationService.initialize(user.id);
        return;
      }

      // If permission is denied, skip (reminder is handled by separate effect above)
      if (currentPermission === 'denied') {
        console.log('🔔 Permission is denied - reminder handled by separate effect');
        return;
      }

      // If notifications are disabled in settings, don't prompt
      if (!settings.notifications) {
        console.log('🔔 Notifications disabled in settings, skipping permission request');
        return;
      }

      // Check if we've already requested permission for this user in this session
      const permissionRequestedKey = `notificationPermissionRequested_${user.id}`;
      const permissionRequested = await storageManager.get(permissionRequestedKey);

      // Only prompt once per user per session to avoid being annoying
      if (permissionRequested === 'true') {
        console.log('🔔 Notification permission already requested for this user this session');
        return;
      }

      try {
        console.log('🔔 Requesting notification permission for authenticated user...');

        // Request permission
        const token = await fcmService.requestPermission();

        if (token) {
          console.log('🔔 Notification permission granted, initializing push notifications...');
          // Mark as requested to avoid repeated prompts in this session
          await storageManager.set(permissionRequestedKey, 'true');

          // Initialize push notifications with the token
          await pushNotificationService.initialize(user.id);
        } else {
          console.log('🔔 Notification permission denied or not supported');
          // Mark as requested to avoid repeated prompts in this session
          await storageManager.set(permissionRequestedKey, 'true');
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error);
      }
    };

    // Request permission after user authentication is confirmed
    if (isAuthenticated && user?.onboarding_completed) {
      requestNotificationPermission();
    }
  }, [isAuthenticated, user?.onboarding_completed, user?.id, settings.notifications]);

  useEffect(() => {
    // Check authentication state on app load
    if (!isLoading) {
      if (isAuthenticated) {
        // User is authenticated, load app data
        loadData();
      }
      // If not authenticated, just show the app normally - no forced auth modal
    }

    // Only initialize location once
    if (!locationInitialized && isAuthenticated && settings.locationSharing) {
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

          // Fetch nearby users unless setting is to hide them
          if (user?.id && !settings.hideNearbyUsers) {
            try {
              const nearby = await userLocationService.findNearbyUsers(
                position.latitude,
                position.longitude,
                10, // 10km radius
                user.id, // exclude current user
                20 // limit to 20 users
              );
              setNearbyUsers(nearby);
              console.log(`👥 Found ${nearby.length} nearby users`);
            } catch (error) {
              console.error('Error fetching nearby users:', error);
              setNearbyUsers([]);
            }
          } else if (settings.hideNearbyUsers) {
            // Clear nearby users if setting is to hide them
            setNearbyUsers([]);
          }

          // Location updates are now handled by backgroundLocationService
          // No need for frequent UI updates here
          console.log('📍 Location initialized - background service will handle updates');

        } catch (error: any) {
          console.log('❌ Initial location failed:', error?.message || error);

          // Check if this is a permission-related error
          const isPermissionError = error?.code === 1 || error?.message?.toLowerCase().includes('permission');

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

            // Show permission modal on web if it was a permission error
            if (isPermissionError) {
              setShowLocationPermissionModal(true);
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

        // Push notifications are now initialized in the permission request flow above
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

  // Handle nearby users fetching when setting changes
  useEffect(() => {
    const updateNearbyUsers = async () => {
      if (!isAuthenticated || !user?.id || !userLocation) return;

      if (!settings.hideNearbyUsers) {
        try {
          const nearby = await userLocationService.findNearbyUsers(
            userLocation[0],
            userLocation[1],
            10, // 10km radius
            user.id, // exclude current user
            20 // limit to 20 users
          );
          setNearbyUsers(nearby);
          setLastNearbyUsersUpdate(Date.now());
          console.log(`👥 Updated nearby users: ${nearby.length} found`);
        } catch (error) {
          console.error('Error fetching nearby users:', error);
          setNearbyUsers([]);
        }
      } else {
        // Clear nearby users if setting is to hide them
        setNearbyUsers([]);
        console.log('👥 Nearby users cleared (setting enabled)');
      }
    };

    updateNearbyUsers();
  }, [settings.hideNearbyUsers, userLocation, user?.id, isAuthenticated]);

  // Periodic nearby users refresh
  useEffect(() => {
    if (!isAuthenticated || !user?.id || !userLocation || settings.hideNearbyUsers) {
      // Clear any existing interval
      if (nearbyUsersRefreshInterval) {
        clearInterval(nearbyUsersRefreshInterval);
        setNearbyUsersRefreshInterval(null);
      }
      return;
    }

    // Set up periodic refresh every 2 minutes
    const interval = setInterval(async () => {
      try {
        const now = Date.now();
        // Only refresh if it's been more than 1.5 minutes since last update
        if (now - lastNearbyUsersUpdate > 1.5 * 60 * 1000) {
          console.log('🔄 Refreshing nearby users...');
          const nearby = await userLocationService.refreshNearbyUsers(
            userLocation[0],
            userLocation[1],
            10, // 10km radius
            user.id, // exclude current user
            20 // limit to 20 users
          );
          setNearbyUsers(nearby);
          setLastNearbyUsersUpdate(now);
          console.log(`👥 Refreshed nearby users: ${nearby.length} found`);
        }
      } catch (error) {
        console.error('Error refreshing nearby users:', error);
      }
    }, 2 * 60 * 1000); // 2 minutes

    setNearbyUsersRefreshInterval(interval);

    // Cleanup on unmount or dependency change
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isAuthenticated, user?.id, userLocation, settings.hideNearbyUsers, lastNearbyUsersUpdate]);

  // Integrate with background location service for location-based updates
  useEffect(() => {
    if (!isAuthenticated || !user?.id || settings.hideNearbyUsers) return;

    let unsubscribe: (() => void) | undefined;

    // Import backgroundLocationService dynamically to avoid circular imports
    import('./services/backgroundLocationService').then(({ backgroundLocationService }) => {
      // Subscribe to location changes
      unsubscribe = backgroundLocationService.onLocationChange(async (newLocation, oldLocation) => {
        // Only update nearby users if location changed significantly (> 500m)
        if (oldLocation) {
          // Calculate distance using Haversine formula
          const distance = calculateDistance(newLocation, oldLocation);
          if (distance < 0.5) return; // Skip if movement is too small (500m = 0.5km)
        }

        console.log('📍 Location changed significantly, updating nearby users...');
        try {
          const nearby = await userLocationService.refreshNearbyUsers(
            newLocation[0],
            newLocation[1],
            10, // 10km radius
            user.id, // exclude current user
            20 // limit to 20 users
          );
          setNearbyUsers(nearby);
          setLastNearbyUsersUpdate(Date.now());
          console.log(`👥 Updated nearby users after location change: ${nearby.length} found`);
        } catch (error) {
          console.error('Error updating nearby users after location change:', error);
        }
      });
    });

    // Cleanup function
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [isAuthenticated, user?.id, settings.hideNearbyUsers]);

  // Helper function to calculate distance between two coordinates in kilometers
  const calculateDistance = (coord1: [number, number], coord2: [number, number]): number => {
    const [lat1, lon1] = coord1;
    const [lat2, lon2] = coord2;

    const R = 6371; // Earth's radius in kilometers
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in kilometers
  };

  // Cleanup intervals on unmount or auth change
  useEffect(() => {
    return () => {
      // Clear nearby users refresh interval
      if (nearbyUsersRefreshInterval) {
        clearInterval(nearbyUsersRefreshInterval);
      }
      // Clear location refresh interval
      if (locationRefreshInterval) {
        clearInterval(locationRefreshInterval);
      }
    };
  }, [nearbyUsersRefreshInterval, locationRefreshInterval]);

  const handleToggleHeatmap = () => {
    setIsHeatmapVisible(!isHeatmapVisible);
  };

  const handleAuthModalClose = () => {
    setShowAuthModal(false);
  };

  const handleLanguageSelect = async (language: 'en' | 'ar') => {
    // Set language in localStorage
    localStorage.setItem('language', language);

    // Update i18n language directly
    const i18n = (await import('./i18n')).default;
    await i18n.changeLanguage(language);

    // Set document direction and language
    const direction = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir = direction;
    document.documentElement.lang = language;

    if (language === 'ar') {
      document.body.classList.add('rtl');
    } else {
      document.body.classList.remove('rtl');
    }

    // Hide language selection and show auth modal
    setShowLanguageSelection(false);
    setShowAuthModal(true);
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

  // Check for special routes
  const isAuthCallback = window.location.pathname === '/auth/callback';
  const isMagicLinkAuth = window.location.pathname === '/auth/magic-link';
  const isGuardianInvitation = window.location.pathname.startsWith('/guardian/invite/');

  // Show loading screen while checking auth
  if (isLoading && !isAuthCallback && !isMagicLinkAuth && !isGuardianInvitation) {
    return <SplashScreen />;
  }

  // Handle auth callback
  if (isAuthCallback) {
    return <AuthCallback />;
  }

  // Handle magic link authentication
  if (isMagicLinkAuth) {
    return <MagicLinkAuth />;
  }

  // Handle guardian invitation
  if (isGuardianInvitation) {
    return <GuardianInvitationHandler />;
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
            <MapComponent
              vibes={vibes}
              sosAlerts={sosAlerts}
              center={center}
              zoom={zoom}
              userLocation={userLocation}
              nearbyUsers={nearbyUsers}
              isHeatmapVisible={isHeatmapVisible}
              onToggleHeatmap={handleToggleHeatmap}
              userId={user?.id || 'demo-user'}
              targetLocation={targetLocation}
            />
          );
        case 'profile':
          return <ProfileView />;
        case 'reports':
          return (
            <CommunityDashboard
              vibes={vibes}
              userLocation={userLocation}
              isLoading={false}
              onNewReport={handleNewReport}
              onNavigateToMap={handleNavigateToMap}
              onNavigateToProfile={handleNavigateToProfile}
            />
          );
        case 'hub':
          return <HubView userLocation={userLocation} />;
        case 'guardian':
          return <GuardianView />;
        case 'settings':
          return <SettingsView />;
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
    <div
      key={currentLanguage}
      style={{
        height: '100vh',
        width: '100vw',
        backgroundColor: 'var(--bg-secondary)',
        // Prevent horizontal scrolling on mobile
        overflowX: 'hidden',
        // Ensure proper mobile viewport handling
        WebkitOverflowScrolling: 'touch'
      }}
    >


      {/* Main App Content - Mobile optimized */}
      {isAuthenticated && user?.onboarding_completed && (
        <>
          {/* Header */}
          <Header
            onNavigateToProfile={() => setActiveTab('profile')}
          />

          <div style={{
            // Account for header only - navigation overlays this area
            height: 'calc(var(--vh, 1vh) * 100 - 80px)',
            width: '100vw',
            // Account for fixed header height
            paddingTop: 'calc(80px + env(safe-area-inset-top, 0px))',
            // Use specific overflow properties to avoid conflicts
            overflowY: (activeTab === 'profile' || activeTab === 'settings' || activeTab === 'reports' || activeTab === 'guardian' || activeTab === 'hub') ? 'auto' : 'hidden',
            overflowX: 'hidden',
            // Mobile scrolling improvements
            WebkitOverflowScrolling: 'touch',
            // Ensure proper stacking context
            position: 'relative',
            // Ensure consistent background color
            backgroundColor: 'white'
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

      {/* Language Selection Screen */}
      {showLanguageSelection && (
        <LanguageSelectionScreen
          onLanguageSelect={handleLanguageSelect}
        />
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={handleAuthModalClose}
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
