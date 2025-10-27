import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import MapComponent from './components/MapComponent';
import ProfileView from './components/ProfileView';
import SettingsView from './components/SettingsView';
import CommunityDashboard from './components/CommunityDashboard';
import TabNavigation, { TabType } from './components/TabNavigation';
import AuthModal from './components/AuthModal';
import OnboardingModal from './components/OnboardingModal';
import ReportTypeModal from './components/ReportTypeModal';
import VibeReportModal from './components/VibeReportModal';
import EmergencyReportModal from './components/EmergencyReportModal';
import LocationOverrideModal from './components/LocationOverrideModal';
import { LoadingSpinner, EmptyState } from './components/shared';
import { reportsService } from './services/reports';
import type { Vibe, SOS } from './types';
import { VibeType } from './types';

const AppContent: React.FC = () => {
  const { t } = useTranslation();
  const { user, isAuthenticated, isLoading, checkOnboardingStatus } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('map');
  const [vibes, setVibes] = useState<Vibe[]>([]);
  const [sosAlerts, setSosAlerts] = useState<SOS[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isHeatmapVisible, setIsHeatmapVisible] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [showReportTypeModal, setShowReportTypeModal] = useState(false);
  const [showVibeReportModal, setShowVibeReportModal] = useState(false);
  const [showEmergencyReportModal, setShowEmergencyReportModal] = useState(false);
  const [showLocationOverride, setShowLocationOverride] = useState(false);
  const [locationInitialized, setLocationInitialized] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string>('Detecting location...');
  const [locationAccuracy, setLocationAccuracy] = useState<string>('Unknown');
  const [showGPSHelp, setShowGPSHelp] = useState<boolean>(false);

  // Default center (Cairo, Egypt)
  const center: [number, number] = [30.0444, 31.2357];
  const zoom = 10;

  useEffect(() => {
    // Check authentication state on app load
    if (!isLoading) {
      if (!isAuthenticated) {
        setShowAuthModal(true);
      } else if (!checkOnboardingStatus()) {
        setShowOnboardingModal(true);
      } else {
        // User is authenticated and onboarded, load app data
        loadData();
      }
    }

    // Only initialize location once
    if (!locationInitialized && isAuthenticated && checkOnboardingStatus()) {
      setLocationInitialized(true);

      // Get user location with aggressive GPS strategy
      const getLocationWithAggressiveGPS = () => {
      let currentAccuracy = Infinity;
      let currentLocation: [number, number] | null = null;
      let gpsWatchId: number | null = null;

      const getIPLocation = async (forceFresh = false) => {
        // Check if we have cached IP location from today (unless forced fresh)
        const cachedLocation = localStorage.getItem('ipLocation');
        const cacheTime = localStorage.getItem('ipLocationTime');
        const now = Date.now();

        if (!forceFresh && cachedLocation && cacheTime && (now - parseInt(cacheTime)) < 24 * 60 * 60 * 1000) { // 24 hours
          const location = JSON.parse(cachedLocation);
          setUserLocation(location);
          setLocationStatus('Using cached location');
          setLocationAccuracy('IP-based (~city level)');
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
                localStorage.setItem('ipLocation', JSON.stringify(location));
                localStorage.setItem('ipLocationTime', now.toString());

                setUserLocation(location);
                setLocationStatus('IP-based location');
                setLocationAccuracy('~city level');
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
          console.log('� Location permission status:', result.state);
          if (result.state === 'denied') {
            console.log('❌ Location permission denied, using IP fallback');
            getIPLocation();
            return;
          }
        }).catch(() => {
          console.log('⚠️ Could not check location permissions');
        });
      }

      console.log('�🚀 Starting aggressive GPS location detection...');

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
            setLocationStatus('GPS (excellent)');
            setLocationAccuracy(`< ${Math.round(accuracy)}m`);
            console.log(`🎯 Location set with excellent accuracy: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (${Math.round(accuracy)}m)`);
            startLocationWatching();
          } else if (accuracy <= goodAccuracy) {
            currentLocation = [latitude, longitude];
            currentAccuracy = accuracy;
            setUserLocation(currentLocation);
            setLocationStatus('GPS (good)');
            setLocationAccuracy(`< ${Math.round(accuracy)}m`);
            console.log(`✅ Location set with good accuracy: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (${Math.round(accuracy)}m)`);
            startLocationWatching();
          } else if (accuracy <= acceptableAccuracy) {
            currentLocation = [latitude, longitude];
            currentAccuracy = accuracy;
            setUserLocation(currentLocation);
            setLocationStatus('GPS (acceptable)');
            setLocationAccuracy(`~${Math.round(accuracy)}m`);
            console.log(`⚠️ Location set with acceptable accuracy: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (${Math.round(accuracy)}m)`);
            startLocationWatching();
          } else if (accuracy <= poorAccuracy) {
            currentLocation = [latitude, longitude];
            currentAccuracy = accuracy;
            setUserLocation(currentLocation);
            setLocationStatus('GPS (poor)');
            setLocationAccuracy(`~${Math.round(accuracy)}m`);
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

  const loadData = async () => {
    try {
      // Load vibes and SOS alerts from Supabase
      const [vibesData, sosData] = await Promise.all([
        reportsService.getVibes({ limit: 100 }),
        reportsService.getSOSAlerts({ limit: 50 })
      ]);

      setVibes(vibesData);
      setSosAlerts(sosData);

      // Set up real-time subscriptions
      const reportsSubscription = reportsService.subscribeToReports((newReport) => {
        if (newReport.emergency) {
          setSosAlerts(prev => [newReport, ...prev]);
        } else {
          setVibes(prev => [newReport, ...prev]);
        }
      });

      const votesSubscription = reportsService.subscribeToVotes((update) => {
        // Update vote counts in real-time
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

      // Store subscriptions for cleanup
      return () => {
        reportsSubscription.unsubscribe();
        votesSubscription.unsubscribe();
      };
    } catch (error) {
      console.error('Error loading data:', error);
      // Fallback to empty arrays if loading fails
      setVibes([]);
      setSosAlerts([]);
    }
  };

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

  const handleOnboardingSkip = () => {
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
    setShowReportTypeModal(false);
    setShowEmergencyReportModal(true);
  };

  const handleReportSuccess = () => {
    // Refresh data after successful report
    loadData();
  };



  // Show loading screen while checking auth
  if (isLoading) {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-secondary)',
        flexDirection: 'column'
      }}>
        <LoadingSpinner size="lg" />
        <p style={{ color: 'var(--text-muted)', fontSize: '16px', marginTop: '16px' }}>{t('app.loadingHyperApp')}</p>
      </div>
    );
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case 'map':
        return (
          <MapComponent
            vibes={vibes}
            sosAlerts={sosAlerts}
            center={center}
            zoom={zoom}
            userLocation={userLocation}
            isHeatmapVisible={isHeatmapVisible}
            onToggleHeatmap={handleToggleHeatmap}
            userId={user?.id || 'demo-user'}
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
          />
        );
      case 'settings':
        return <SettingsView />;
      default:
        return null;
    }
  };

  return (
    <div style={{ height: '100vh', width: '100vw', backgroundColor: 'var(--bg-secondary)' }}>
      {/* GPS Help Notification - show when GPS accuracy is poor */}
      {isAuthenticated && checkOnboardingStatus() && activeTab === 'map' && showGPSHelp && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#fef3c7',
          border: '1px solid #f59e0b',
          padding: '12px',
          borderRadius: '8px',
          zIndex: 2000,
          fontSize: '14px',
          color: '#92400e',
          maxWidth: '300px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>📍 Improve GPS Accuracy</div>
          <div style={{ fontSize: '12px', lineHeight: '1.4' }}>
            For better location accuracy:
            <br/>• Go outdoors with clear sky view
            <br/>• Wait 1-2 minutes for GPS lock
            <br/>• Enable location permissions
            <br/>• Disable battery saver mode
          </div>
          <button
            onClick={() => setShowGPSHelp(false)}
            style={{
              background: '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              padding: '4px 8px',
              fontSize: '11px',
              cursor: 'pointer',
              marginTop: '8px'
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Debug Info - only show when authenticated and onboarded */}
      {isAuthenticated && checkOnboardingStatus() && activeTab === 'map' && (
        <div style={{
          position: 'absolute',
          bottom: '80px',
          left: '10px',
          background: 'var(--bg-primary)',
          padding: '10px',
          borderRadius: '5px',
          zIndex: 1000,
          fontSize: '12px',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-color)',
          maxWidth: '250px'
        }}>
          <div style={{ marginBottom: '8px' }}>
            {t('app.welcomeBack')} {user?.first_name || user?.username}<br/>
            {t('app.vibes')}: {vibes.length} | {t('app.sos')}: {sosAlerts.length}<br/>
            {t('app.heatmap')}: {isHeatmapVisible ? t('app.on') : t('app.off')}<br/>
            <strong>Location:</strong> {locationStatus}<br/>
            <strong>Accuracy:</strong> {locationAccuracy}
          </div>
          <button
            onClick={() => setShowLocationOverride(true)}
            style={{
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              padding: '4px 8px',
              fontSize: '11px',
              cursor: 'pointer',
              width: '100%',
              marginBottom: '4px'
            }}
          >
            Set Location Manually
          </button>
          <button
            onClick={() => {
              // Force fresh location detection
              localStorage.removeItem('ipLocation');
              localStorage.removeItem('ipLocationTime');
              setLocationStatus('Refreshing location...');
              setLocationAccuracy('Unknown');
              window.location.reload();
            }}
            style={{
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              padding: '4px 8px',
              fontSize: '11px',
              cursor: 'pointer',
              width: '100%'
            }}
          >
            Refresh Location
          </button>
        </div>
      )}

      {/* Main App Content - only show when authenticated and onboarded */}
      {isAuthenticated && checkOnboardingStatus() && (
        <>
          <div style={{
            height: 'calc(100vh - 70px)', // Account for bottom navigation with integrated FAB
            width: '100vw',
            overflow: (activeTab === 'profile' || activeTab === 'settings' || activeTab === 'reports') ? 'auto' : 'hidden'
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
    </div>
  );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </LanguageProvider>
  );
};

export default App;
