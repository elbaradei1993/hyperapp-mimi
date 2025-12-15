import React, { useState, useEffect, Suspense, lazy, useCallback, useMemo, useRef } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useNotification } from './contexts/NotificationContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { VibeProvider } from './contexts/VibeContext';
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

import SplashScreen from './components/SplashScreen';
import ErrorBoundary from './components/ErrorBoundary';
import { LoadingSpinner } from './components/shared';
import { reportsService } from './services/reports';
import { storageManager } from './lib/storage';
import { notificationService } from './services/notificationService';
import { pushNotificationService } from './services/pushNotificationService';
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

  // Default center (Cairo, Egypt)
  const center: [number, number] = [30.0444, 31.2357];
  const zoom = 10;

  // Show auth modal directly for non-authenticated users (moved to top with other hooks)
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setShowAuthModal(true);
    }
  }, [isLoading, isAuthenticated]);

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
    if (!locationInitialized && isAuthenticated && user?.onboarding_completed) {
      setLocationInitialized(true);

      // Get user location with aggressive GPS strategy
      const getLocationWithAggressiveGPS = () => {
        let currentAccuracy = Infinity;
        let currentLocation: [number, number] | null = null;
        let gpsWatchId: number | null = null;

        const getIPLocation = async (forceFresh = false) => {
          // Check if we have cached IP location from today (unless forced fresh)
          const cachedLocation = await storageManager.get('ipLocation');
          const cacheTime = await storageManager.get('ipLocationTime');
          const now = Date.now();

          if (!forceFresh && cachedLocation && cacheTime && (now - parseInt(cacheTime)) < 24 * 60 * 60 * 1000) { // 24 hours
            const location = JSON.parse(cachedLocation);
            setUserLocation(location);
            console.log(`📍 Using cached IP location: ${location[0]}, ${location[1]}`);
            return;
          }

          if (forceFresh) {
            console.log('🔄 Forcing fresh IP location lookup (GPS accuracy was poor)');
          }

          try {
            console.log('🔄 Trying IP-based geolocation...');

            // Try multiple CORS-enabled services that provide actual location data
            const services = [
              {
                url: 'https://ipapi.co/json/',
                parseData: (data: any) => ({
                  lat: data.latitude,
                  lng: data.longitude,
                  city: data.city
                })
              },
              {
                url: 'https://api.ipgeolocation.io/ipgeo?apiKey=free',
                parseData: (data: any) => ({
                  lat: parseFloat(data.latitude),
                  lng: parseFloat(data.longitude),
                  city: data.city
                })
              },
              {
                url: 'https://api.ipstack.com/check?access_key=free',
                parseData: (data: any) => ({
                  lat: data.latitude,
                  lng: data.longitude,
                  city: data.city
                })
              },
              {
                url: 'https://api.bigdatacloud.net/data/reverse-geocode-client',
                parseData: (data: any) => ({
                  lat: data.latitude,
                  lng: data.longitude,
                  city: data.city || data.locality
                })
              }
            ];

            for (const service of services) {
              try {
                console.log(`Trying ${service.url}...`);
                const response = await fetch(service.url, {
                  method: 'GET',
                  headers: {
                    'Accept': 'application/json',
                  }
                });

                if (!response.ok) {
                  console.log(`${service.url} returned ${response.status}`);
                  continue;
                }

                const data = await response.json();
                const parsed = service.parseData(data);

                if (parsed.lat && parsed.lng && !isNaN(parsed.lat) && !isNaN(parsed.lng)) {
                  const location: [number, number] = [parsed.lat, parsed.lng];

                  // Cache the location
                  await storageManager.set('ipLocation', JSON.stringify(location));
                  await storageManager.set('ipLocationTime', now.toString());

                  setUserLocation(location);
                  console.log(`📍 IP Location set: ${parsed.lat}, ${parsed.lng} (${parsed.city || 'Unknown'})`);
                  return; // Success, exit the loop
                }
              } catch (serviceError) {
                console.log(`Service ${service.url} failed:`, serviceError);
                continue; // Try next service
              }
            }

            // If all services failed, use a default location
            console.log('❌ All IP geolocation services failed, using default location');
            const defaultLocation: [number, number] = [30.0444, 31.2357]; // Cairo, Egypt
            setUserLocation(defaultLocation);
            console.log(`📍 Using default location: ${defaultLocation[0]}, ${defaultLocation[1]} (Cairo, Egypt)`);

          } catch (error) {
            console.log('❌ IP geolocation failed completely:', error);

            // Use default location as final fallback
            const defaultLocation: [number, number] = [30.0444, 31.2357]; // Cairo, Egypt
            setUserLocation(defaultLocation);
            console.log(`📍 Using default location: ${defaultLocation[0]}, ${defaultLocation[1]} (Cairo, Egypt)`);
          }
        };

        if (!navigator.geolocation) {
          console.log('❌ Geolocation not supported, trying IP fallback');
          getIPLocation();
          return;
        }

        // Check location permissions first
        if (navigator.permissions) {
          navigator.permissions.query({ name: 'geolocation' }).then((result) => {
            console.log(' Location permission status:', result.state);
            if (result.state === 'denied') {
              console.log('❌ Location permission denied, using IP fallback');
              getIPLocation();
              return;
            }
          }).catch(() => {
            console.log('⚠️ Could not check location permissions');
          });
        }

        console.log('🚀 Starting aggressive GPS location detection...');

        // Primary GPS attempt with maximum timeout and best settings
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude, accuracy } = position.coords;
            console.log(`📡 GPS Lock achieved: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (${Math.round(accuracy)}m accuracy)`);

            // More lenient accuracy thresholds for better user experience
            const excellentAccuracy = 50; // 50m - excellent
            const goodAccuracy = 200; // 200m - good
            const acceptableAccuracy = 1000; // 1km - acceptable for initial location
            const poorAccuracy = 5000; // 5km - poor but usable
            const veryPoorAccuracy = 25000; // 25km - very poor, prefer IP
            const extremelyPoorAccuracy = 100000; // 100km - extremely poor, reject

            // Check for obviously wrong GPS data (coordinates that don't make sense)
            const isValidCoordinates = latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
            const isReasonableAccuracy = accuracy > 0 && accuracy < 500000; // Less than 500km

            if (!isValidCoordinates || !isReasonableAccuracy) {
              console.log(`❌ GPS returned invalid data: ${latitude}, ${longitude} (${accuracy}m), using IP fallback`);
              getIPLocation();
              return;
            }

            if (accuracy <= excellentAccuracy) {
              currentLocation = [latitude, longitude];
              currentAccuracy = accuracy;
              setUserLocation(currentLocation);
              console.log(`🎯 Location set with excellent accuracy: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (${Math.round(accuracy)}m)`);
              startLocationWatching();
            } else if (accuracy <= goodAccuracy) {
              currentLocation = [latitude, longitude];
              currentAccuracy = accuracy;
              setUserLocation(currentLocation);
              console.log(`✅ Location set with good accuracy: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (${Math.round(accuracy)}m)`);
              startLocationWatching();
            } else if (accuracy <= acceptableAccuracy) {
              currentLocation = [latitude, longitude];
              currentAccuracy = accuracy;
              setUserLocation(currentLocation);

              console.log(`⚠️ Location set with acceptable accuracy: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (${Math.round(accuracy)}m)`);
              startLocationWatching();
            } else if (accuracy <= poorAccuracy) {
              currentLocation = [latitude, longitude];
              currentAccuracy = accuracy;
              setUserLocation(currentLocation);

              console.log(`📍 Location set with poor accuracy: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (${Math.round(accuracy)}m)`);
              startLocationWatching();
            } else if (accuracy <= veryPoorAccuracy) {
              console.log(`📍 GPS accuracy very poor (${Math.round(accuracy)}m), trying IP fallback for better initial location`);
              getIPLocation();
              // Still start watching for better GPS accuracy
              startLocationWatching();
            } else {
              console.log(`❌ GPS accuracy extremely poor (${Math.round(accuracy)}m), rejecting and forcing fresh IP lookup`);
              setShowGPSHelp(true); // Show user guidance for better GPS
              getIPLocation(true); // Force fresh IP lookup
            }
          },
          (error) => {
            console.log(`❌ Primary GPS attempt failed: ${error.code} - ${error.message}`);

            // Secondary attempt with different parameters
            console.log('🔄 Trying secondary GPS attempt...');
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const { latitude, longitude, accuracy } = position.coords;
                console.log(`📡 Secondary GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (${Math.round(accuracy)}m)`);

                // Use same improved accuracy thresholds and validation
                const excellentAccuracy = 100;
                const goodAccuracy = 500;
                const acceptableAccuracy = 2000;
                const poorAccuracy = 10000;
                const veryPoorAccuracy = 50000;
                const extremelyPoorAccuracy = 200000;

                const isValidCoordinates = latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
                const isReasonableAccuracy = accuracy > 0 && accuracy < 1000000;

                if (!isValidCoordinates || !isReasonableAccuracy) {
                  console.log(`❌ Secondary GPS returned invalid data: ${latitude}, ${longitude} (${accuracy}m), using IP fallback`);
                  getIPLocation();
                  return;
                }

                if (accuracy <= excellentAccuracy) {
                  currentLocation = [latitude, longitude];
                  currentAccuracy = accuracy;
                  setUserLocation(currentLocation);
                  console.log(`🎯 Secondary location excellent: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (${Math.round(accuracy)}m)`);
                  startLocationWatching();
                } else if (accuracy <= goodAccuracy) {
                  currentLocation = [latitude, longitude];
                  currentAccuracy = accuracy;
                  setUserLocation(currentLocation);
                  console.log(`✅ Secondary location good: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (${Math.round(accuracy)}m)`);
                  startLocationWatching();
                } else if (accuracy <= acceptableAccuracy) {
                  currentLocation = [latitude, longitude];
                  currentAccuracy = accuracy;
                  setUserLocation(currentLocation);
                  console.log(`⚠️ Secondary location acceptable: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (${Math.round(accuracy)}m)`);
                  startLocationWatching();
                } else if (accuracy <= poorAccuracy) {
                  currentLocation = [latitude, longitude];
                  currentAccuracy = accuracy;
                  setUserLocation(currentLocation);
                  console.log(`📍 Secondary location poor: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (${Math.round(accuracy)}m)`);
                  startLocationWatching();
                } else if (accuracy <= veryPoorAccuracy) {
                  console.log(`📍 Secondary GPS very poor (${Math.round(accuracy)}m), using IP fallback`);
                  getIPLocation();
                  startLocationWatching();
                } else {
                  console.log(`❌ Secondary GPS extremely poor (${Math.round(accuracy)}m), using IP fallback`);
                  getIPLocation();
                }
              },
              (secondaryError) => {
                console.log(`❌ Secondary GPS failed: ${secondaryError.code} - ${secondaryError.message}`);

                // Third attempt with even more lenient settings
                console.log('🔄 Trying third GPS attempt with minimal requirements...');
                navigator.geolocation.getCurrentPosition(
                  (position) => {
                    const { latitude, longitude, accuracy } = position.coords;
                    console.log(`📡 Third GPS attempt: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (${Math.round(accuracy)}m)`);

                    // Use same improved accuracy thresholds and validation
                    const excellentAccuracy = 100;
                    const goodAccuracy = 500;
                    const acceptableAccuracy = 2000;
                    const poorAccuracy = 10000;
                    const veryPoorAccuracy = 50000;

                    const isValidCoordinates = latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
                    const isReasonableAccuracy = accuracy > 0 && accuracy < 1000000;

                    if (!isValidCoordinates || !isReasonableAccuracy) {
                      console.log(`❌ Third GPS returned invalid data: ${latitude}, ${longitude} (${accuracy}m), using IP fallback`);
                      getIPLocation();
                      return;
                    }

                    if (accuracy <= excellentAccuracy) {
                      currentLocation = [latitude, longitude];
                      currentAccuracy = accuracy;
                      setUserLocation(currentLocation);
                      console.log(`🎯 Third attempt excellent: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (${Math.round(accuracy)}m)`);
                      startLocationWatching();
                    } else if (accuracy <= goodAccuracy) {
                      currentLocation = [latitude, longitude];
                      currentAccuracy = accuracy;
                      setUserLocation(currentLocation);
                      console.log(`✅ Third attempt good: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (${Math.round(accuracy)}m)`);
                      startLocationWatching();
                    } else if (accuracy <= acceptableAccuracy) {
                      currentLocation = [latitude, longitude];
                      currentAccuracy = accuracy;
                      setUserLocation(currentLocation);
                      console.log(`⚠️ Third attempt acceptable: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (${Math.round(accuracy)}m)`);
                      startLocationWatching();
                    } else if (accuracy <= poorAccuracy) {
                      currentLocation = [latitude, longitude];
                      currentAccuracy = accuracy;
                      setUserLocation(currentLocation);
                      console.log(`📍 Third attempt poor: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (${Math.round(accuracy)}m)`);
                      startLocationWatching();
                    } else if (accuracy <= veryPoorAccuracy) {
                      console.log(`📍 Third GPS very poor (${Math.round(accuracy)}m), using IP fallback`);
                      getIPLocation();
                      startLocationWatching();
                    } else {
                      console.log(`❌ Third GPS extremely poor (${Math.round(accuracy)}m), using IP fallback`);
                      getIPLocation();
                    }
                  },
                  (thirdError) => {
                    console.log(`❌ Third GPS failed: ${thirdError.code} - ${thirdError.message}`);
                    console.log('🔄 All GPS attempts failed, using IP geolocation');
                    getIPLocation();
                  },
                  {
                    enableHighAccuracy: false,
                    timeout: 15000, // Shorter timeout
                    maximumAge: 1800000 // Accept 30 minute old cached location
                  }
                );
              },
              {
                enableHighAccuracy: false, // Try without high accuracy requirement
                timeout: 45000, // Longer timeout for secondary attempt
                maximumAge: 600000 // Accept 10 minute old cached location
              }
            );
          },
          {
            enableHighAccuracy: true,
            timeout: 180000, // 3 minutes - very aggressive waiting for GPS lock
            maximumAge: 60000 // Accept 1 minute old cached location if available
          }
        );

        const startLocationWatching = () => {
          if (gpsWatchId !== null) {
            navigator.geolocation.clearWatch(gpsWatchId);
          }

          console.log('👀 Starting continuous location monitoring...');
          gpsWatchId = navigator.geolocation.watchPosition(
            (position) => {
              const { latitude: newLat, longitude: newLng, accuracy: newAccuracy } = position.coords;

              // Update if accuracy improved significantly or position changed
              const distance = currentLocation ? Math.sqrt(
                Math.pow(newLat - currentLocation[0], 2) + Math.pow(newLng - currentLocation[1], 2)
              ) * 111000 : Infinity;

              if (newAccuracy < currentAccuracy * 0.7 || distance > 25) { // 70% accuracy improvement or 25m movement
                currentLocation = [newLat, newLng];
                currentAccuracy = newAccuracy;
                setUserLocation(currentLocation);
                console.log(`🔄 Location updated: ${newLat.toFixed(6)}, ${newLng.toFixed(6)} (${Math.round(newAccuracy)}m, ${Math.round(distance)}m moved)`);
              }
            },
            (error) => {
              console.log('⚠️ Location watch error:', error.code, error.message);
            },
            {
              enableHighAccuracy: true,
              timeout: 30000,
              maximumAge: 30000 // Accept 30 second old locations
            }
          );
        };
      };

      getLocationWithAggressiveGPS();
    }
  }, [isAuthenticated, isLoading, locationInitialized]);

  // Initialize notification service when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user?.onboarding_completed) {
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
  }, [isAuthenticated, user?.onboarding_completed, user?.id, notifications, removeNotification, addNotification, markAsRead, markAllAsRead, clearAll, userLocation]);

  // Memoize subscriptions ref to prevent recreation
  const subscriptionsRef = useRef<{ reports?: { unsubscribe: () => void }; votes?: { unsubscribe: () => void } }>({});

  // Debounced data loading to prevent excessive API calls
  const debouncedLoadData = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(async () => {
          try {
            // Load vibes and SOS alerts from Supabase with error handling
            const [vibesData, sosData] = await Promise.all([
              reportsService.getVibes({ limit: 1000 }),    // Load 1000 vibes for historical data
              reportsService.getSOSAlerts({ limit: 500 })  // Load 500 SOS alerts for historical data
            ]);

            setVibes(vibesData || []);
            setSosAlerts(sosData || []);
          } catch (error) {
            console.error('Error loading data:', error);
            // Fallback to empty arrays if loading fails - app still works
            setVibes([]);
            setSosAlerts([]);
          }
        }, 300); // 300ms debounce
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
        <AppContent />
      </VibeProvider>
    </LanguageProvider>
  );
};

export default App;
