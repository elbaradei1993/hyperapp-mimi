// HyperApp Mini App - Complete Fixed Implementation with Error Handling
class HyperApp {
  constructor() {
    // CRITICAL: Show Community Stats INSTANTLY before any other operations
    // This must execute immediately during object creation
    this.showImmediateCommunityStats();

    // Load configuration from config.js
    this.config = window.appConfig || {
      supabaseUrl: 'https://nqwejzbayquzsvcodunl.supabase.co',
      supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xd2VqemJheXF1enN2Y29kdW5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzOTA0MjAsImV4cCI6MjA3Mzk2NjQyMH0.01yifC-tfEbBHD5u315fpb_nZrqMZCbma_UrMacMb78',
      weatherApiKey: 'bd5e378503939ddaee76f12ad7a97608',
      features: {
        realtime: true,
        geofencing: true,
        weather: true,
        map: true
      }
    };

    // Dependency loading status
    this.dependenciesLoaded = {
      telegram: false,
      supabase: false,
      leaflet: false,
      leafletHeat: false,
      fontAwesome: false
    };

    // Error tracking
    this.errors = [];
    this.fallbackMode = false;

    this.tg = window.Telegram.WebApp;
    this.currentLanguage = 'en';
    this.userData = null;
    this.nearbyReports = [];
    this.userReports = [];
    this.selectedVibe = null;
    this.isConnected = false;
    this.userLocation = null;
    this.isAuthenticated = false;

    // Geofence properties
    this.geofenceEnabled = false;
    this.geofenceSettings = null;
    this.geofences = [];
    this.geofenceWatchId = null;
    this.currentGeofenceZones = new Set(); // Track which zones user is currently in
    this.lastGeofenceCheck = null;

    // Initialize with error handling
    this.initializeApp();
  }

  // Medium-term error handling - balanced approach
  async initializeApp() {
    console.log('Initializing HyperApp...');

    // Quick dependency check for critical services
    await this.checkCriticalDependencies();

    // Initialize Supabase with basic error handling
    try {
      this.supabase = window.supabase.createClient(this.config.supabaseUrl, this.config.supabaseKey);
    } catch (error) {
      console.warn('Supabase initialization failed:', error);
      this.showNotification('Database connection limited', 'warning');
    }

    // Check authentication state
    this.checkAuthState();

    // Bind methods and initialize
    this.bindMethods();
    this.init();
  }

  // Check only critical dependencies
  async checkCriticalDependencies() {
    // Simple check for Supabase (most critical)
    if (typeof window.supabase === 'undefined') {
      console.warn('Supabase library not loaded');
      this.showNotification('Some features may be limited', 'info');
    }

    // Check Telegram WebApp
    if (!window.Telegram || !window.Telegram.WebApp) {
      console.warn('Telegram WebApp not available');
    }
  }

  // Bind all methods to maintain proper 'this' context
  bindMethods() {
    const methods = [
      'init', 'setupEventListeners', 'syncUserWithSupabase', 'updateConnectionStatus',
      'updateUserInfo', 'loadInitialData', 'loadNearbyReports', 'displayNearbyReports',
      'loadUserReports', 'displayUserReports', 'voteReport', 'showReportModal',
      'selectVibe', 'submitReport', 'showEmergencyReport', 'submitEmergencyReport',
      'showView', 'loadMap', 'displayMap', 'loadTopAreas', 'toggleLanguage',
      'changeLanguage', 'applyLanguage', 'showNotification', 'closeModal',
      'getVibeIcon', 'getVibeArabicName', 'capitalizeFirstLetter', 'formatTimeAgo',
      'updateTextDirection', 'requestUserLocation', 'checkAuthState',
      'showAuthModal', 'hideAuthModal', 'setupAuthListeners', 'handleAuthLogin',
      'handleAuthSignup', 'loadWeatherData', 'updateSafetyHub', 'generateDynamicSafetyTips',
      'calculateUserReputation', 'updateUserReputation', 'getUserBadges', 'checkBadgeUnlocks',
      'showBadgeNotification', 'loadEnhancedStats', 'renderStatsCharts', 'setupWeatherAlerts',
      'checkWeatherAlerts', 'sendWeatherAlert', 'updateCommunityInsights',
      // Geofence methods
      'loadGeofenceSettings', 'saveGeofenceSettings', 'toggleGeofenceMonitoring',
      'classifyGeofenceZones', 'startGeofenceMonitoring', 'stopGeofenceMonitoring',
      'checkGeofenceStatus', 'handleGeofenceEvent', 'sendGeofenceNotification',
      'getGeofenceNotificationPriority', 'getGeofenceNotificationMessage'
    ];

    methods.forEach(method => {
      this[method] = this[method].bind(this);
    });
  }

  // Load cached community stats (simplified)
  loadCachedCommunityStats() {
    try {
      const cachedStats = localStorage.getItem('hyperapp_cached_community_stats');
      const cacheTime = localStorage.getItem('hyperapp_cached_stats_time');

      if (cachedStats && cacheTime) {
        const age = Date.now() - parseInt(cacheTime);
        if (age < 24 * 60 * 60 * 1000) {
          const stats = JSON.parse(cachedStats);
          this.updateCommunityStatsWithCache(stats);
          this.updateCommunityVibeWithCache(stats);
          this.showCachedDataIndicator();
          return true;
        }
      }

      // Create sample data for immediate display
      const sampleStats = {
        totalReports: 127,
        activeUsers: 32,
        vibeCounts: { calm: 43, crowded: 28, noisy: 19, festive: 15, suspicious: 12, dangerous: 10 },
        dominantVibe: 'calm',
        dominantVibePercentage: 34,
        timestamp: new Date().toISOString()
      };

      localStorage.setItem('hyperapp_cached_community_stats', JSON.stringify(sampleStats));
      localStorage.setItem('hyperapp_cached_stats_time', Date.now().toString());

      this.updateCommunityStatsWithCache(sampleStats);
      this.updateCommunityVibeWithCache(sampleStats);
      this.showCachedDataIndicator();

      return false;
    } catch (error) {
      console.error('Error loading cached Community Stats:', error);
      this.showCommunityStatsDefaults();
      return false;
    }
  }

  // Update Community Stats display with cached data
  updateCommunityStatsWithCache(stats) {
    // Update total reports count
    const totalReportsEl = document.getElementById('totalReports');
    if (totalReportsEl) {
      totalReportsEl.textContent = stats.totalReports || 0;
    }

    // Update active users estimate
    const activeUsersEl = document.getElementById('activeUsers');
    if (activeUsersEl) {
      activeUsersEl.textContent = stats.activeUsers || Math.max(1, Math.floor((stats.totalReports || 0) / 3));
    }
  }

  // Update Community Vibe sidebar with cached data
  updateCommunityVibeWithCache(stats) {
    // Update dominant vibe display
    if (stats.dominantVibe || stats.vibeCounts) {
      const dominantVibe = stats.dominantVibe;
      const vibePercentage = stats.dominantVibePercentage || 0;

      const dominantVibeElement = document.getElementById('dominantVibe');
      if (dominantVibeElement) {
        const iconElement = dominantVibeElement.querySelector('i');
        const nameElement = dominantVibeElement.querySelector('span:first-of-type');
        const percentageElement = dominantVibeElement.querySelector('.vibe-percentage');

        if (iconElement) iconElement.className = `fas fa-${this.getVibeIconName(dominantVibe)}`;
        if (nameElement) nameElement.textContent = this.capitalizeFirstLetter(dominantVibe);
        if (percentageElement) percentageElement.textContent = `${vibePercentage}%`;
      }
    }

    // Update vibe sidebars chart
    if (stats.vibeCounts) {
      this.updateVibeSidebarsWithCache(stats.vibeCounts);
    }
  }

  // Update vibe sidebars chart with cached data
  updateVibeSidebarsWithCache(vibeCounts) {
    const sidebarChart = document.getElementById('vibeSidebarsChart');
    if (!sidebarChart) return;

    const totalReports = Object.values(vibeCounts).reduce((sum, count) => sum + count, 0);
    if (totalReports === 0) return;

    const sortedVibes = Object.entries(vibeCounts)
      .sort(([,a], [,b]) => b - a) // Sort by count descending
      .filter(([, count]) => count > 0); // Only show vibes with reports

    const sidebarHtml = sortedVibes.map(([vibe, count]) => {
      const percentage = (count / totalReports) * 100;
      return `
        <div class="vibe-sidebar-item">
          <div class="vibe-sidebar-label">
            <i class="fas fa-${this.getVibeIconName(vibe)}"></i>
            <span>${this.capitalizeFirstLetter(vibe)}</span>
          </div>
          <div class="vibe-sidebar-bar">
            <div class="vibe-sidebar-fill" style="width: ${percentage}%; background: ${this.getVibeColor(vibe)}"></div>
          </div>
          <div class="vibe-sidebar-count">${count}</div>
          <div class="vibe-sidebar-percentage">${percentage.toFixed(1)}%</div>
        </div>
      `;
    }).join('');

    sidebarChart.innerHTML = sidebarHtml;
  }

  // Helper method to get FontAwesome icon class name
  getVibeIconName(vibeType) {
    const icons = {
      crowded: 'users',
      noisy: 'volume-up',
      festive: 'glass-cheers',
      calm: 'peace',
      suspicious: 'eye-slash',
      dangerous: 'exclamation-triangle'
    };
    return icons[vibeType] || 'question-circle';
  }

  // Show subtle indicator that cached data is being displayed
  showCachedDataIndicator() {
    // Add a very subtle indicator in the stats section
    const statsGrid = document.getElementById('statsGrid');
    if (statsGrid) {
      // Add a tiny "cached" indicator that doesn't distract
      const indicator = document.createElement('div');
      indicator.id = 'cached-indicator';
      indicator.style.cssText = `
        position: absolute;
        top: 5px;
        right: 5px;
        font-size: 8px;
        color: var(--text-muted);
        opacity: 0.4;
        pointer-events: none;
        font-weight: 300;
      `;
      indicator.textContent = 'cached';

      // Make stats grid position relative if not already
      statsGrid.style.position = 'relative';

      // Remove any existing indicator first
      const existing = statsGrid.querySelector('#cached-indicator');
      if (existing) {
        existing.remove();
      }

      statsGrid.appendChild(indicator);
    }
  }

  // Show default values when no cached data is available
  showCommunityStatsDefaults() {
    // Show basic defaults - these will be updated when fresh data loads
    const totalReportsEl = document.getElementById('totalReports');
    if (totalReportsEl) totalReportsEl.textContent = '0';

    const activeUsersEl = document.getElementById('activeUsers');
    if (activeUsersEl) activeUsersEl.textContent = '0';

    // Show default vibe state
    const dominantVibeElement = document.getElementById('dominantVibe');
    if (dominantVibeElement) {
      const iconElement = dominantVibeElement.querySelector('i');
      const nameElement = dominantVibeElement.querySelector('span:first-of-type');
      const percentageElement = dominantVibeElement.querySelector('.vibe-percentage');

      if (iconElement) iconElement.className = 'fas fa-peace';
      if (nameElement) nameElement.textContent = 'Calm';
      if (percentageElement) percentageElement.textContent = '0%';
    }

    // Clear vibe sidebars chart
    const sidebarChart = document.getElementById('vibeSidebarsChart');
    if (sidebarChart) {
      sidebarChart.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 20px;">Loading community vibe data...</div>';
    }
  }

  // Load fresh data asynchronously after cached data is displayed
  async startAsyncDataLoading() {
    console.log('Starting async fresh data loading...');

    try {
      // Step 1: Load fresh community stats and update UI seamlessly (WITHOUT showing loading states)
      setTimeout(async () => {
        try {
          await this.loadAndUpdateFreshCommunityStats();
        } catch (error) {
          console.warn('Failed to refresh community stats:', error);
        }
      }, 1000); // Small delay to let UI settle

      // Step 2: Load other data that depends on location/connection (non-blocking)
      this.loadOtherDataInBackground();

    } catch (error) {
      console.warn('Error in async data loading:', error);
      // Don't crash the app - cached data is already displayed
    }
  }

  // Load other data in background without affecting Community Stats
  async loadOtherDataInBackground() {
    try {
      const promises = [
        // Load reports data (critical for nearby reports)
        this.loadNearbyReports().catch(err => {
          console.warn('Failed to load nearby reports:', err);
        }),

        // Try to get user location (needed for location-based features)
        this.requestLocationImmediately().then(() => {
          // Once we have location, these can load:
          if (this.userLocation) {
            // Parallel load of location-dependent features
            return Promise.all([
              // Map data (heavy but important)
              this.loadMapReports().catch(err => console.warn('Map reports failed:', err)),
              // Weather data (useful)
              this.loadWeatherData().catch(err => console.warn('Weather data failed:', err))
            ]);
          }
        }).catch(err => console.warn('Location request failed:', err)),

        // Auth-dependent data (if authenticated)
        this.loadAuthDependentData().catch(err => console.warn('Auth data failed:', err))
      ];

      await Promise.allSettled(promises);
      console.log('Background data loading completed');

    } catch (error) {
      console.warn('Error loading background data:', error);
    }
  }

  // Load and cache fresh community stats
  async loadAndCacheFreshCommunityStats() {
    try {
      console.log('Loading fresh community stats for cache...');
      const freshStats = await this.getCommunityStats();

      if (freshStats && freshStats.totalReports >= 0) {
        // Calculate derived stats for caching
        const totalReports = freshStats.totalReports;

        // Find dominant vibe
        let dominantVibe = 'calm';
        let maxVibeCount = 0;
        let dominantVibePercentage = 0;

        if (totalReports > 0 && freshStats.vibeCounts) {
          Object.entries(freshStats.vibeCounts).forEach(([vibe, count]) => {
            if (count > maxVibeCount) {
              maxVibeCount = count;
              dominantVibe = vibe;
            }
          });
          dominantVibePercentage = Math.round((maxVibeCount / totalReports) * 100);
        }

        // Prepare cache object
        const cacheData = {
          totalReports: totalReports,
          activeUsers: Math.max(1, Math.floor(totalReports / 3)), // Rough estimate
          vibeCounts: freshStats.vibeCounts || {},
          dominantVibe: dominantVibe,
          dominantVibePercentage: dominantVibePercentage,
          timestamp: freshStats.timestamp
        };

        // Update cache
        localStorage.setItem('hyperapp_cached_community_stats', JSON.stringify(cacheData));
        localStorage.setItem('hyperapp_cached_stats_time', Date.now().toString());

        // Remove cached indicator since we now have fresh data
        const indicator = document.getElementById('cached-indicator');
        if (indicator) {
          indicator.remove();
        }

        // Update UI with fresh data seamlessly
        this.updateCommunityStatsWithCache(cacheData);
        this.updateCommunityVibeWithCache(cacheData);

        console.log('Fresh community stats cached and UI updated');
      }
    } catch (error) {
      console.warn('Failed to load fresh community stats for cache:', error);
      // Keep old cached data if fresh load fails
    }
  }

  // Load authentication-dependent data
  async loadAuthDependentData() {
    if (!this.isAuthenticated) return;

    try {
      console.log('Loading auth-dependent data...');

      // Load user reports
      await this.loadUserReports();

      // Update user reputation
      await this.updateUserReputation();

      // Load geofence settings
      await this.loadGeofenceSettings();

      console.log('Auth-dependent data loaded');
    } catch (error) {
      console.warn('Error loading auth-dependent data:', error);
    }
  }

  async init() {
    // CRITICAL: Show Community Stats IMMEDIATELY before any other operations
    // This must happen first to ensure instant loading
    this.showImmediateCommunityStats();

    // Load saved theme
    const savedTheme = localStorage.getItem('hyperapp-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Update theme toggle icon
    const themeIcon = document.querySelector('#themeToggle i');
    if (themeIcon) {
      themeIcon.className = savedTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    }

    // Always force fresh data load on app initialization
    this.forceFreshDataLoad = true;
    // Clear local data to ensure fresh load (but Community Stats already loaded from cache)
    this.nearbyReports = [];
    this.userReports = [];
    // Clear any cached weather data
    localStorage.removeItem('hyperapp_weather_data');
    localStorage.removeItem('hyperapp_weather_time');
    console.log('App initialization - cached stats loaded, now loading fresh data in background');

    // Set up auth listeners first
    this.setupAuthListeners();

    // Initialize Telegram WebApp
    if (this.tg) {
      this.tg.expand();
      this.tg.MainButton.hide();

      // Get user data
      const user = this.tg.initDataUnsafe.user;
      if (user) {
        this.userData = user;
        this.isAuthenticated = true;
        await this.syncUserWithSupabase();
        this.updateUserInfo();
      }

      // Update connection status
      this.updateConnectionStatus(true);
    } else {
      this.updateConnectionStatus(false);
      this.showNotification("Running in standalone mode", "info");

      // For testing without Telegram, show auth modal
      this.showAuthModal();
    }

    // Set up event listeners early
    this.setupEventListeners();

    // Validate database schema on startup (don't await - run in background)
    this.validateDatabaseSchema().catch(err => console.warn('Schema validation failed:', err));

    // OPTIMIZATION: Start data loading asynchronously without blocking UI
    // Load fresh data in background while cached stats are already displayed
    this.startAsyncDataLoading();

    // Set up real-time subscriptions after initial data load (also async)
    this.setupRealtimeSubscriptions();

    // Initialize geofence functionality (async)
    if (this.isAuthenticated) {
      this.loadGeofenceSettings().catch(err => console.warn('Geofence settings failed:', err));
    }

    // Initialize service worker for offline authentication (async)
    this.initializeServiceWorker();

    // Make app instance globally available
    window.hyperApp = this;
    window.app = this; // Also assign to window.app for backward compatibility
  }

  // CRITICAL OPTIMIZATION: Show Community Stats synchronously and immediately
  showImmediateCommunityStats() {
    try {
      console.log('Showing Community Stats immediately...');

      // Get cached data synchronously
      const cachedStats = this.getCachedStatsFast();
      if (cachedStats) {
        // Update UI synchronously for immediate display
        this.updateCommunityStatsSynchronous(cachedStats);
        this.updateCommunityVibeSynchronous(cachedStats);
        this.showCachedDataIndicator();
        console.log('Community Stats displayed immediately from cache');
        return true;
      }

      // No cache - create instant sample data
      console.log('No cache found, creating instant sample data...');
      const sampleStats = this.getInstantSampleStats();
      this.updateCommunityStatsSynchronous(sampleStats);
      this.updateCommunityVibeSynchronous(sampleStats);
      this.showCachedDataIndicator();
      console.log('Community Stats displayed immediately with sample data');
      return false;

    } catch (error) {
      console.error('Error showing immediate Community Stats:', error);
      // Final fallback - show basic defaults synchronously
      this.showImmediateDefaults();
      return false;
    }
  }

  // Get cached stats synchronously (no async operations)
  getCachedStatsFast() {
    try {
      const cachedStats = localStorage.getItem('hyperapp_cached_community_stats');
      const cacheTime = localStorage.getItem('hyperapp_cached_stats_time');

      if (cachedStats && cacheTime) {
        const age = Date.now() - parseInt(cacheTime);
        // Use cache if less than 24 hours old
        if (age < 24 * 60 * 60 * 1000) {
          return JSON.parse(cachedStats);
        }
      }
    } catch (error) {
      console.warn('Error reading cache:', error);
    }
    return null;
  }

  // Create instant sample data (fast, no calculations)
  getInstantSampleStats() {
    return {
      totalReports: 127,
      activeUsers: 32,
      vibeCounts: {
        calm: 43,
        crowded: 28,
        noisy: 19,
        festive: 15,
        suspicious: 12,
        dangerous: 10
      },
      dominantVibe: 'calm',
      dominantVibePercentage: 34,
      timestamp: new Date().toISOString()
    };
  }

  // Update Community Stats synchronously (no async operations)
  updateCommunityStatsSynchronous(stats) {
    // Update total reports count
    const totalReportsEl = document.getElementById('totalReports');
    if (totalReportsEl) {
      totalReportsEl.textContent = stats.totalReports || 0;
    }

    // Update active users estimate
    const activeUsersEl = document.getElementById('activeUsers');
    if (activeUsersEl) {
      activeUsersEl.textContent = stats.activeUsers || Math.max(1, Math.floor((stats.totalReports || 0) / 3));
    }
  }

  // Update Community Vibe synchronously
  updateCommunityVibeSynchronous(stats) {
    // Update dominant vibe display
    if (stats.dominantVibe || stats.vibeCounts) {
      const dominantVibe = stats.dominantVibe;
      const vibePercentage = stats.dominantVibePercentage || 0;

      const dominantVibeElement = document.getElementById('dominantVibe');
      if (dominantVibeElement) {
        const iconElement = dominantVibeElement.querySelector('i');
        const nameElement = dominantVibeElement.querySelector('span:first-of-type');
        const percentageElement = dominantVibeElement.querySelector('.vibe-percentage');

        if (iconElement) iconElement.className = `fas fa-${this.getVibeIconName(dominantVibe)}`;
        if (nameElement) nameElement.textContent = this.capitalizeFirstLetter(dominantVibe);
        if (percentageElement) percentageElement.textContent = `${vibePercentage}%`;
      }
    }

    // Update vibe sidebars chart
    if (stats.vibeCounts) {
      this.updateVibeSidebarsSynchronous(stats.vibeCounts);
    }
  }

  // Update vibe sidebars synchronously
  updateVibeSidebarsSynchronous(vibeCounts) {
    const sidebarChart = document.getElementById('vibeSidebarsChart');
    if (!sidebarChart) return;

    const totalReports = Object.values(vibeCounts).reduce((sum, count) => sum + count, 0);
    if (totalReports === 0) return;

    const sortedVibes = Object.entries(vibeCounts)
      .sort(([,a], [,b]) => b - a) // Sort by count descending
      .filter(([, count]) => count > 0); // Only show vibes with reports

    const sidebarHtml = sortedVibes.map(([vibe, count]) => {
      const percentage = (count / totalReports) * 100;
      return `<div class="vibe-sidebar-item"><div class="vibe-sidebar-label"><i class="fas fa-${this.getVibeIconName(vibe)}"></i><span>${this.capitalizeFirstLetter(vibe)}</span></div><div class="vibe-sidebar-bar"><div class="vibe-sidebar-fill" style="width: ${percentage}%; background: ${this.getVibeColor(vibe)}"></div></div><div class="vibe-sidebar-count">${count}</div><div class="vibe-sidebar-percentage">${percentage.toFixed(1)}%</div></div>`;
    }).join('');

    sidebarChart.innerHTML = sidebarHtml;
  }

  // Show immediate defaults if everything else fails
  showImmediateDefaults() {
    const totalReportsEl = document.getElementById('totalReports');
    if (totalReportsEl) totalReportsEl.textContent = '0';

    const activeUsersEl = document.getElementById('activeUsers');
    if (activeUsersEl) activeUsersEl.textContent = '0';

    const dominantVibeElement = document.getElementById('dominantVibe');
    if (dominantVibeElement) {
      const iconElement = dominantVibeElement.querySelector('i');
      const nameElement = dominantVibeElement.querySelector('span:first-of-type');
      const percentageElement = dominantVibeElement.querySelector('.vibe-percentage');

      if (iconElement) iconElement.className = 'fas fa-peace';
      if (nameElement) nameElement.textContent = 'Calm';
      if (percentageElement) percentageElement.textContent = '0%';
    }

    const sidebarChart = document.getElementById('vibeSidebarsChart');
    if (sidebarChart) {
      sidebarChart.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 20px;">Loading community vibe data...</div>';
    }
  }

  // Service Worker Integration for Offline Authentication
  async initializeServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        // Register service worker
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration);

        // Set up message handling
        navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this));

        // Store auth state when user logs in
        this.setupAuthStateSync();

        // Handle online/offline events
        this.setupConnectivityMonitoring();

        // Check for pending offline data
        this.checkPendingOfflineData();

      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    } else {
      console.warn('Service Workers not supported in this browser');
    }
  }

  setupAuthStateSync() {
    // Listen for authentication changes and sync with service worker
    const originalHandleAuthLogin = this.handleAuthLogin;
    const originalHandleAuthSignup = this.handleAuthSignup;
    const originalHandleLogout = this.handleLogout;

    this.handleAuthLogin = async (...args) => {
      const result = await originalHandleAuthLogin.apply(this, args);
      if (this.isAuthenticated) {
        this.syncAuthStateWithServiceWorker();
      }
      return result;
    };

    this.handleAuthSignup = async (...args) => {
      const result = await originalHandleAuthSignup.apply(this, args);
      if (this.isAuthenticated) {
        this.syncAuthStateWithServiceWorker();
      }
      return result;
    };

    this.handleLogout = async (...args) => {
      const result = await originalHandleLogout.apply(this, args);
      this.clearAuthStateFromServiceWorker();
      return result;
    };
  }

  setupConnectivityMonitoring() {
    // Monitor online/offline status
    window.addEventListener('online', () => {
      console.log('Back online');
      this.updateConnectionStatus(true);
      this.notifyServiceWorkerOnlineStatus(true);
      this.syncPendingOfflineData();
    });

    window.addEventListener('offline', () => {
      console.log('Gone offline');
      this.updateConnectionStatus(false);
      this.notifyServiceWorkerOnlineStatus(false);
    });

    // Initial status
    this.notifyServiceWorkerOnlineStatus(navigator.onLine);
  }

  async syncAuthStateWithServiceWorker() {
    if (!this.isAuthenticated || !this.supabase) return;

    try {
      // Get current session
      const { data: { session }, error } = await this.supabase.auth.getSession();

      if (error || !session) {
        console.error('Failed to get session for service worker sync:', error);
        return;
      }

      // Send auth state to service worker
      const authState = {
        session: {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at,
          user: {
            id: session.user.id,
            email: session.user.email
          }
        },
        timestamp: Date.now(),
        offline: false
      };

      await this.sendMessageToServiceWorker('STORE_AUTH_STATE', authState);
      console.log('Auth state synced with service worker');

    } catch (error) {
      console.error('Error syncing auth state with service worker:', error);
    }
  }

  async clearAuthStateFromServiceWorker() {
    try {
      await this.sendMessageToServiceWorker('CLEAR_AUTH_STATE');
      console.log('Auth state cleared from service worker');
    } catch (error) {
      console.error('Error clearing auth state from service worker:', error);
    }
  }

  notifyServiceWorkerOnlineStatus(online) {
    this.sendMessageToServiceWorker('SET_ONLINE_STATUS', { online })
      .catch(error => console.error('Error notifying service worker of online status:', error));
  }

  async sendMessageToServiceWorker(type, data = {}) {
    return new Promise((resolve, reject) => {
      if (!navigator.serviceWorker.controller) {
        reject(new Error('No service worker controller available'));
        return;
      }

      const messageChannel = new MessageChannel();

      messageChannel.port1.onmessage = (event) => {
        if (event.data.type === 'ACK') {
          resolve();
        } else {
          reject(new Error('Unexpected response from service worker'));
        }
      };

      // Set timeout for response
      setTimeout(() => {
        reject(new Error('Service worker message timeout'));
      }, 5000);

      navigator.serviceWorker.controller.postMessage({ type, data }, [messageChannel.port2]);
    });
  }

  handleServiceWorkerMessage(event) {
    const { type, data } = event.data;

    switch (type) {
      case 'OFFLINE_MODE':
        this.handleOfflineMode(data);
        break;
      case 'OFFLINE_DATA_SYNCED':
        this.handleOfflineDataSynced(data);
        break;
      default:
        console.log('Unhandled service worker message:', type, data);
    }
  }

  handleOfflineMode(data) {
    if (data.offline) {
      this.showNotification('You are now offline. Some features may be limited.', 'info');
      // Update UI to show offline indicators
      document.body.classList.add('offline-mode');
    } else {
      this.showNotification('Back online!', 'success');
      document.body.classList.remove('offline-mode');
    }
  }

  handleOfflineDataSynced(data) {
    const { syncedCount, failedCount } = data;
    if (syncedCount > 0) {
      this.showNotification(`${syncedCount} offline ${syncedCount === 1 ? 'item' : 'items'} synced successfully`, 'success');
    }
    if (failedCount > 0) {
      this.showNotification(`${failedCount} offline ${failedCount === 1 ? 'item' : 'items'} failed to sync`, 'warning');
    }
  }

  async checkPendingOfflineData() {
    // Check if there's any pending offline data to sync
    try {
      const pendingData = await this.getPendingOfflineData();
      if (pendingData && pendingData.length > 0) {
        this.showNotification(`${pendingData.length} offline ${pendingData.length === 1 ? 'item' : 'items'} pending sync`, 'info');
      }
    } catch (error) {
      console.error('Error checking pending offline data:', error);
    }
  }

  async getPendingOfflineData() {
    // This would check IndexedDB for pending offline data
    // Implementation depends on how offline data is stored
    return [];
  }

  async syncPendingOfflineData() {
    if (!navigator.onLine) return;

    try {
      // Trigger background sync
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('background-sync-reports');
      console.log('Background sync registered');
    } catch (error) {
      console.error('Error registering background sync:', error);
    }
  }

  // Enhanced error handling for offline scenarios
  async handleApiError(error, operation) {
    if (!navigator.onLine) {
      // Store operation for offline sync
      await this.storeOfflineOperation(operation);
      this.showNotification('Operation stored for offline sync', 'info');
      return true; // Handled
    }

    // Check if it's an authentication error
    if (error.message && error.message.includes('JWT')) {
      this.showNotification('Authentication expired. Please login again.', 'error');
      this.showAuthModal();
      return true; // Handled
    }

    return false; // Not handled, let caller handle it
  }

  async storeOfflineOperation(operation) {
    // Store operation details for later sync
    const offlineOps = JSON.parse(localStorage.getItem('hyperapp_offline_ops') || '[]');
    offlineOps.push({
      ...operation,
      timestamp: Date.now(),
      id: Date.now().toString()
    });

    localStorage.setItem('hyperapp_offline_ops', JSON.stringify(offlineOps));
  }

  // Override network requests to handle offline scenarios
  async makeAuthenticatedRequest(url, options = {}) {
    try {
      // Add auth headers
      const headers = new Headers(options.headers || {});
      if (this.supabase) {
        const { data: { session } } = await this.supabase.auth.getSession();
        if (session) {
          headers.set('Authorization', `Bearer ${session.access_token}`);
        }
      }

      const requestOptions = {
        ...options,
        headers
      };

      const response = await fetch(url, requestOptions);
      return response;

    } catch (error) {
      // Handle offline/network errors
      if (!navigator.onLine || error.name === 'TypeError') {
        throw new Error('offline');
      }
      throw error;
    }
  }

  async validateDatabaseSchema() {
    try {
      console.log('🔍 Validating database schema...');

      if (typeof DatabaseValidator !== 'undefined') {
        const validator = new DatabaseValidator(this.supabase);
        const isValid = await validator.validateSchema();

        if (isValid) {
          console.log('✅ Database schema validation passed');
          this.showNotification('Database schema validated successfully', 'success');
        } else {
          console.warn('⚠️ Database schema validation found issues');
          this.showNotification('Database schema has some issues - some features may be limited', 'warning');
        }
      } else {
        console.warn('DatabaseValidator not available, skipping schema validation');
      }
    } catch (error) {
      console.error('❌ Database schema validation failed:', error);
      this.showNotification('Database validation failed - some features may not work properly', 'error');
    }
  }

  async fastInitialLoad() {
    try {
      // Load only essential data first - use force refresh on page reload
      const forceRefresh = this.forceFreshDataLoad || false;
      await this.loadNearbyReports(0, forceRefresh);

      // Load enhanced stats first (this creates the UI)
      await this.loadEnhancedStats();

      // Now update all UI components in sequence to avoid race conditions
      await this.updateStats();

      // Load map (lightweight)
      this.loadMap();

      // Try to load weather data immediately
      this.loadWeatherData();

    } catch (error) {
      console.error('Error in fastInitialLoad:', error);
      // Fallback: try to update UI anyway with empty data
      this.updateStats();
    }
  }

  async loadAdvancedFeatures() {
    // Load heavier features after initial render
    if (this.isAuthenticated) {
      await this.loadUserReports();
      await this.updateUserReputation();
    }

    // Load enhanced stats
    await this.loadEnhancedStats();

    // Set up weather alerts (with real API)
    this.setupWeatherAlerts();

    // Update community insights periodically (less frequent)
    setInterval(() => {
      this.updateCommunityInsights();
    }, 300000); // Update every 5 minutes instead of 1 minute
  }

  async checkAuthState() {
    // Check if we have a Telegram user first
    if (this.tg && this.tg.initDataUnsafe && this.tg.initDataUnsafe.user) {
      const telegramUser = this.tg.initDataUnsafe.user;
      this.userData = telegramUser;
      this.isAuthenticated = true;
      await this.syncUserWithSupabase();
      this.updateUserInfo();
      await this.loadUserMoodVote(); // Load existing mood vote
      return;
    }

    // Check Supabase authentication as fallback
    const { data: { session }, error } = await this.supabase.auth.getSession();
    if (session && session.user) {
      this.isAuthenticated = true;
      this.userData = {
        id: session.user.id,
        email: session.user.email,
        ...session.user.user_metadata
      };
      await this.syncUserWithSupabase();
      this.updateUserInfo();
      await this.loadUserMoodVote(); // Load existing mood vote
    } else {
      // Show auth modal if no authentication found
      this.showAuthModal();
    }
  }

  showAuthModal() {
    document.getElementById('authModal').style.display = 'block';
  }

  hideAuthModal() {
    document.getElementById('authModal').style.display = 'none';
  }

  async setupAuthListeners() {
    // Auth tabs
    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const tabName = e.target.getAttribute('data-tab');
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(f => f.classList.add('hidden'));
        e.target.classList.add('active');
        document.getElementById(tabName + 'Form').classList.remove('hidden');
      });
    });

    // Close auth modal
    document.getElementById('closeAuth').addEventListener('click', () => {
      this.hideAuthModal();
    });

    // Login button
    document.getElementById('loginBtn').addEventListener('click', this.handleAuthLogin);

    // Signup button
    document.getElementById('signupBtn').addEventListener('click', this.handleAuthSignup);
  }

  async handleAuthLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
      this.showNotification("Please fill all fields", "error");
      return;
    }

    // Show loading state
    const loginBtn = document.getElementById('loginBtn');
    const originalText = loginBtn.textContent;
    loginBtn.textContent = 'Logging in...';
    loginBtn.disabled = true;

    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        let errorMessage = error.message;
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = "Account not found. Please sign up first.";
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = "Please check your email and confirm your account.";
        }
        this.showNotification(errorMessage, "error");
      } else {
        this.isAuthenticated = true;
        this.userData = {
          id: data.user.id,
          email: data.user.email,
          ...data.user.user_metadata
        };
        await this.syncUserWithSupabase();
        this.updateUserInfo();
        this.hideAuthModal();
        this.loadInitialData();
        this.showNotification("Login successful", "success");
      }
    } catch (error) {
      this.showNotification("Login failed. Please try again.", "error");
      console.error("Login error:", error);
    } finally {
      // Reset button state
      loginBtn.textContent = originalText;
      loginBtn.disabled = false;
    }
  }

  async handleAuthSignup() {
    const username = document.getElementById('signupUsername').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const passwordConfirm = document.getElementById('signupPasswordConfirm').value;

    if (!username || !email || !password || !passwordConfirm) {
      this.showNotification("Please fill all fields", "error");
      return;
    }

    if (password !== passwordConfirm) {
      this.showNotification("Passwords don't match", "error");
      return;
    }

    if (password.length < 6) {
      this.showNotification("Password must be at least 6 characters", "error");
      return;
    }

    // Show loading state
    const signupBtn = document.getElementById('signupBtn');
    const originalText = signupBtn.textContent;
    signupBtn.textContent = 'Signing up...';
    signupBtn.disabled = true;

    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username,
            reputation: 0,
            language: 'en'
          }
        }
      });

      if (error) {
        let errorMessage = error.message;
        if (error.message.includes('User already registered')) {
          errorMessage = "Account already exists. Please login instead.";
        }
        this.showNotification(errorMessage, "error");
      } else {
        this.showNotification("Signup successful! Please check your email for verification.", "success");
        // Switch to login tab
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(f => f.classList.add('hidden'));
        document.querySelector('[data-tab="login"]').classList.add('active');
        document.getElementById('loginForm').classList.remove('hidden');
      }
    } catch (error) {
      this.showNotification("Signup failed. Please try again.", "error");
      console.error("Signup error:", error);
    } finally {
      // Reset button state
      signupBtn.textContent = originalText;
      signupBtn.disabled = false;
    }
  }

  async handleLogout() {
    try {
      const { error } = await this.supabase.auth.signOut();

      if (error) {
        this.showNotification("Logout failed", "error");
        console.error("Logout error:", error);
      } else {
        // Reset app state
        this.isAuthenticated = false;
        this.userData = null;
        this.userReports = [];
        this.nearbyReports = [];

        // Update UI
        this.updateUserInfo();
        this.showAuthModal();
        this.loadInitialData();

        this.showNotification("Logged out successfully", "success");
      }
    } catch (error) {
      this.showNotification("Logout failed", "error");
      console.error("Logout error:", error);
    }
  }

  async syncUserWithSupabase() {
    if (!this.userData) {
      return false;
    }

    try {
      // Check if user exists in users table
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('user_id', this.userData.id)
        .maybeSingle();

      if (error) {
        return false;
      } else if (data) {
        // Update user data with Supabase info
        this.userData.reputation = data.reputation || 0;
        this.userData.language = data.language || 'en';
        this.currentLanguage = data.language || 'en';
        this.applyLanguage(this.currentLanguage);

        // Update language selector
        document.getElementById('languageSelect').value = this.currentLanguage;
        document.getElementById('currentLanguage').textContent = this.currentLanguage === 'en' ? 'EN' : 'AR';

        return true;
      } else {
        // User doesn't exist in users table, create a new record
        const { data: newUser, error: insertError } = await this.supabase
          .from('users')
          .insert([
            {
              user_id: this.userData.id,
              username: this.userData.username || this.userData.first_name || 'User',
              reputation: 0,
              language: 'en'
            }
          ])
          .select()
          .single();

        if (insertError) {
          return false;
        }

        this.userData.reputation = 0;
        this.userData.language = 'en';
        return true;
      }
    } catch (error) {
      return false;
    }
  }

  updateConnectionStatus(connected) {
    this.isConnected = connected;
    const statusElement = document.getElementById('connectionStatus');

    if (statusElement) {
      if (connected) {
        statusElement.innerHTML = '<i class="fas fa-check-circle connected"></i> <span data-en="Connected" data-ar="متصل">Connected</span>';
        statusElement.classList.add('connected');
        statusElement.classList.remove('disconnected');
      } else {
        statusElement.innerHTML = '<i class="fas fa-times-circle disconnected"></i> <span data-en="Disconnected" data-ar="غير متصل">Disconnected</span>';
        statusElement.classList.add('disconnected');
        statusElement.classList.remove('connected');
      }
    }
  }

  updateUserInfo() {
    if (this.userData) {
      const usernameElement = document.getElementById('settingsUsername');
      if (usernameElement) {
        usernameElement.textContent = this.userData.username || this.userData.first_name;
      }

      document.getElementById('userReputation').textContent = this.userData.reputation || 0;
      document.getElementById('settingsReputation').textContent = this.userData.reputation || 0;
    }
  }

  async loadInitialData() {
    await this.loadNearbyReports();
    if (this.isAuthenticated) {
      await this.loadUserReports();
    }
    this.loadMap();
  }

  async loadNearbyReports(retryCount = 0, force = false) {
    const maxRetries = 3;

    try {
      // Show loading state with better UX
      const container = document.getElementById('nearbyReports');
      if (!container) return;

      // Always show loading spinner on initial load or when forced refresh (not retries)
      if (retryCount === 0 || force) {
        container.innerHTML = '<div class="loading-spinner"></div>';
      }

      // Force fresh data by using different query parameters and clearing any client-side cache
      const cacheBust = force ? `&t=${Date.now()}` : '';

      // Create fresh Supabase client instance for forced refresh to avoid any caching
      let supabaseClient = this.supabase;
      if (force) {
        supabaseClient = window.supabase.createClient(this.supabaseUrl, this.supabaseKey);
      }

      const { data: reports, error } = await supabaseClient
        .from('reports')
        .select(`id, vibe_type, location, notes, created_at, upvotes, downvotes, latitude, longitude, votes (user_id, vote_type)`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        // Enhanced error handling with specific messages
        let errorMessage = this.currentLanguage === 'en' ? 'Error loading reports.' : 'خطأ في تحميل التقارير.';
        let retryText = this.currentLanguage === 'en' ? 'Tap to retry' : 'اضغط لإعادة المحاولة';

        if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = this.currentLanguage === 'en' ? 'Network error. Check your connection.' : 'خطأ في الشبكة. تحقق من اتصالك.';
        } else if (error.message.includes('permission')) {
          errorMessage = this.currentLanguage === 'en' ? 'Permission denied.' : 'تم رفض الإذن.';
        }

        // Retry on network errors with exponential backoff
        if (retryCount < maxRetries && (error.message.includes('network') || error.message.includes('fetch'))) {
          const delay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Exponential backoff, max 5s

          setTimeout(() => this.loadNearbyReports(retryCount + 1, force), delay);
          return;
        }

        // Show error with retry option
        container.innerHTML = `
          <div class="no-data error-state" onclick="window.app.loadNearbyReports()">
            <i class="fas fa-exclamation-triangle"></i>
            <p>${errorMessage}</p>
            <small style="color: var(--text-muted); cursor: pointer;">${retryText}</small>
          </div>
        `;
        throw new Error(`Failed to load reports: ${error.message}`);
      }

      // Process reports data
      this.nearbyReports = reports.map(report => {
        const userVote = report.votes && report.votes.length > 0 ?
          report.votes.find(v => v.user_id === this.userData?.id)?.vote_type : null;

        return { ...report, user_vote: userVote };
      });

      this.displayNearbyReports();

      // Update connection status to connected
      this.updateConnectionStatus(true);

      return true; // Success indicator

    } catch (error) {
      console.error('Error in loadNearbyReports:', error);

      if (retryCount < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
        setTimeout(() => this.loadNearbyReports(retryCount + 1, force), delay);
        return;
      }

      // Show final error state
      const container = document.getElementById('nearbyReports');
      if (container) {
        const errorMsg = this.currentLanguage === 'en' ? 'Unable to load reports. Please check your connection and try again.' : 'تعذر تحميل التقارير. يرجى التحقق من اتصالك وحاول مرة أخرى.';
        container.innerHTML = `
          <div class="no-data error-state" onclick="window.app.loadNearbyReports()">
            <i class="fas fa-wifi-slash"></i>
            <p>${errorMsg}</p>
            <small style="color: var(--text-muted); cursor: pointer;">${this.currentLanguage === 'en' ? 'Tap to retry' : 'اضغط لإعادة المحاولة'}</small>
          </div>
        `;
      }

      // Update connection status to disconnected
      this.updateConnectionStatus(false);

      throw error; // Re-throw to indicate failure
    }
  }

  displayNearbyReports() {
    const container = document.getElementById('nearbyReports');

    if (!this.nearbyReports || this.nearbyReports.length === 0) {
      container.innerHTML = '<div class="no-data" data-en="No reports nearby" data-ar="لا توجد تقارير قريبة">No reports nearby</div>';
      this.updateTextDirection();
      return;
    }

    container.innerHTML = this.nearbyReports.map(report => `
      <div class="report-item" data-id="${report.id}">
        <div class="report-info">
          <div class="report-type">
            <i class="${this.getVibeIcon(report.vibe_type)}"></i>
            <span data-en="${this.capitalizeFirstLetter(report.vibe_type)}" data-ar="${this.getVibeArabicName(report.vibe_type)}">
              ${this.capitalizeFirstLetter(report.vibe_type)}
            </span>
          </div>
          <div class="report-details">${report.notes || ''}</div>
          <div class="report-meta">
            <span>${report.location || 'Unknown location'}</span>
            <span>${this.formatTimeAgo(report.created_at)}</span>
          </div>
        </div>
        <div class="report-actions">
          <button class="vote-btn upvote-btn ${report.user_vote === 'upvote' ? 'active' : ''}" data-report-id="${report.id}" data-vote-type="upvote" ${!this.isAuthenticated ? 'aria-disabled="true" title="Login to vote"' : ''}>
            <i class="fas fa-thumbs-up"></i> ${report.upvotes || 0}
          </button>
          <button class="vote-btn downvote-btn ${report.user_vote === 'downvote' ? 'active' : ''}" data-report-id="${report.id}" data-vote-type="downvote" ${!this.isAuthenticated ? 'aria-disabled="true" title="Login to vote"' : ''}>
            <i class="fas fa-thumbs-down"></i> ${report.downvotes || 0}
          </button>
        </div>
      </div>
    `).join('');

    // Vote buttons are handled by delegated event listener in setupEventListeners()

    this.updateTextDirection();
  }

  async loadUserReports() {
    if (!this.userData) return;

    try {
      document.getElementById('userReports').innerHTML = '<div class="loading-spinner"></div>';

      const { data: reports, error } = await this.supabase
        .from('reports')
        .select('*')
        .eq('user_id', this.userData.id)
        .order('created_at', { ascending: false });

      if (error) {
        document.getElementById('userReports').innerHTML =
          '<div class="no-data" data-en="Error loading your reports" data-ar="خطأ في تحميل تقاريرك">Error loading your reports</div>';
        return;
      }

      this.userReports = reports;
      this.displayUserReports();
    } catch (error) {
      document.getElementById('userReports').innerHTML =
        '<div class="no-data" data-en="Error loading your reports" data-ar="خطأ في تحميل تقاريرك">Error loading your reports</div>';
    }
  }

  displayUserReports() {
    const container = document.getElementById('userReports');

    if (!this.userReports || this.userReports.length === 0) {
      container.innerHTML = '<div class="no-data" data-en="You haven\'t submitted any reports" data-ar="لم تقم بإرسال أي تقارير">You haven\'t submitted any reports</div>';
      this.updateTextDirection();
      return;
    }

    container.innerHTML = this.userReports.map(report => `
      <div class="report-item">
        <div class="report-info">
          <div class="report-type">
            <i class="${this.getVibeIcon(report.vibe_type)}"></i>
            <span data-en="${this.capitalizeFirstLetter(report.vibe_type)}" data-ar="${this.getVibeArabicName(report.vibe_type)}">
              ${this.capitalizeFirstLetter(report.vibe_type)}
            </span>
          </div>
          <div class="report-details">${report.notes || ''}</div>
          <div class="report-meta">
            <span>${report.location || 'Unknown location'}</span>
            <span>${this.formatTimeAgo(report.created_at)}</span>
            <span>👍 ${report.upvotes || 0} 👎 ${report.downvotes || 0}</span>
          </div>
        </div>
      </div>
    `).join('');

    this.updateTextDirection();
  }

  async voteReport(reportId, voteType) {
    if (!this.isAuthenticated) {
      this.showAuthModal();
      this.showNotification("Please login to vote", "error");
      return;
    }

    try {
      // Get current session to ensure we're authenticated
      const { data: sessionData, error: sessionError } = await this.supabase.auth.getSession();

      if (sessionError || !sessionData.session) {
        this.showNotification("Authentication expired. Please login again.", "error");
        this.showAuthModal();
        return;
      }

      // Use the authenticated user ID from the session
      const authUserId = sessionData.session.user.id;

      const { data: existingVote, error: voteError } = await this.supabase
        .from('votes')
        .select('*')
        .eq('user_id', authUserId)
        .eq('report_id', reportId)
        .maybeSingle();

      if (voteError && voteError.code !== 'PGRST116') {
        console.error("Error checking vote:", voteError);
        this.showNotification("Failed to submit vote", "error");
        return;
      }

      let operation;

      if (existingVote) {
        if (existingVote.vote_type === voteType) {
          const { error: deleteError } = await this.supabase
            .from('votes')
            .delete()
            .eq('id', existingVote.id);

          if (deleteError) {
            console.error("Error removing vote:", deleteError);
            this.showNotification("Failed to update vote", "error");
            return;
          }

          operation = 'remove';
        } else {
          const { error: updateError } = await this.supabase
            .from('votes')
            .update({ vote_type: voteType })
            .eq('id', existingVote.id);

          if (updateError) {
            console.error("Error updating vote:", updateError);
            this.showNotification("Failed to update vote", "error");
            return;
          }

          operation = 'change';
        }
      } else {
        const { error: insertError } = await this.supabase
          .from('votes')
          .insert([
            {
              user_id: authUserId,
              report_id: reportId,
              vote_type: voteType
            }
          ]);

        if (insertError) {
          console.error("Error inserting vote:", insertError);
          this.showNotification("Failed to submit vote", "error");
          return;
        }

        operation = 'add';
      }

      // Update UI locally for immediate feedback
      this.updateVoteUI(reportId, voteType, operation);
      this.showNotification("Vote recorded", "success");
    } catch (error) {
      console.error("Error voting on report:", error);
      this.showNotification("Failed to submit vote", "error");
    }
  }

  updateVoteUI(reportId, voteType, operation) {
    // Find the report item in the DOM
    const reportItem = document.querySelector(`.report-item[data-id="${reportId}"]`);
    if (!reportItem) return;

    // Find the vote buttons
    const upvoteBtn = reportItem.querySelector('.upvote-btn');
    const downvoteBtn = reportItem.querySelector('.downvote-btn');

    if (!upvoteBtn || !downvoteBtn) return;

    // Get current vote counts from the buttons
    let upvotes = parseInt(upvoteBtn.textContent.match(/\d+/)[0]) || 0;
    let downvotes = parseInt(downvoteBtn.textContent.match(/\d+/)[0]) || 0;

    // Update vote counts based on operation
    if (operation === 'add') {
      if (voteType === 'upvote') {
        upvotes++;
        upvoteBtn.classList.add('active');
        downvoteBtn.classList.remove('active');
      } else if (voteType === 'downvote') {
        downvotes++;
        downvoteBtn.classList.add('active');
        upvoteBtn.classList.remove('active');
      }
    } else if (operation === 'change') {
      if (voteType === 'upvote') {
        upvotes++;
        downvotes--;
        upvoteBtn.classList.add('active');
        downvoteBtn.classList.remove('active');
      } else if (voteType === 'downvote') {
        downvotes++;
        upvotes--;
        downvoteBtn.classList.add('active');
        upvoteBtn.classList.remove('active');
      }
    } else if (operation === 'remove') {
      if (voteType === 'upvote') {
        upvotes--;
        upvoteBtn.classList.remove('active');
      } else if (voteType === 'downvote') {
        downvotes--;
        downvoteBtn.classList.remove('active');
      }
    }

    // Update button text with new counts
    upvoteBtn.innerHTML = `<i class="fas fa-thumbs-up"></i> ${upvotes}`;
    downvoteBtn.innerHTML = `<i class="fas fa-thumbs-down"></i> ${downvotes}`;

    // Update local data for consistency
    const reportIndex = this.nearbyReports.findIndex(r => r.id == reportId);
    if (reportIndex !== -1) {
      this.nearbyReports[reportIndex].upvotes = upvotes;
      this.nearbyReports[reportIndex].downvotes = downvotes;
      this.nearbyReports[reportIndex].user_vote = operation === 'remove' ? null : voteType;
    }
  }

  showReportModal() {
    this.selectedVibe = null;
    document.querySelectorAll('.vibe-option').forEach(option => {
      option.classList.remove('selected');
    });

    // Get current location automatically
    this.getCurrentLocation((location) => {
      this.currentReportLocation = location;
    });

    document.getElementById('reportNotes').value = '';
    document.getElementById('reportModal').style.display = 'block';
  }

  selectVibe(vibe) {
    this.selectedVibe = vibe;
    document.querySelectorAll('.vibe-option').forEach(option => {
      option.classList.remove('selected');
    });
    document.querySelector(`.vibe-option[data-vibe="${vibe}"]`).classList.add('selected');
  }

  async selectMood(moodType) {
    if (!this.isAuthenticated) {
      this.showAuthModal();
      this.showNotification("Please login to vote on mood", "error");
      return;
    }

    const selectedCard = document.querySelector(`.mood-vote-card[data-mood="${moodType}"]`);
    const isCurrentlySelected = selectedCard && selectedCard.classList.contains('selected');

    // Check if any mood is currently selected (not the one being clicked)
    const hasOtherMoodSelected = document.querySelector('.mood-vote-card.selected') !== null && !isCurrentlySelected;

    try {
      if (isCurrentlySelected) {
        // Deselect the current mood - remove the vote from database
        const { error: deleteError } = await this.supabase
          .from('mood_votes')
          .delete()
          .eq('user_id', this.userData.id)
          .eq('mood_type', moodType);

        if (deleteError) {
          console.error("Error removing mood vote:", deleteError);
          this.showNotification("Failed to update mood vote", "error");
          return;
        }

        // Remove selection from UI
        selectedCard.classList.remove('selected');
        this.showNotification("Mood vote removed - you can now select a different mood or see community votes", "info");

      } else if (hasOtherMoodSelected) {
        // User is trying to select a different mood while one is already selected
        // Require them to unselect first
        this.showNotification("Please unselect your current mood first before choosing a different one", "warning");
        return;

      } else {
        // No mood is currently selected, so select this one
        // Add new vote to database
        const { data, error } = await this.supabase
          .from('mood_votes')
          .insert([{
            user_id: this.userData.id,
            mood_type: moodType,
            latitude: this.userLocation?.latitude,
            longitude: this.userLocation?.longitude
          }]);

        if (error) {
          console.error("Error submitting mood vote:", error);
          this.showNotification("Failed to submit mood vote", "error");
          return;
        }

        // Select the new mood in UI
        if (selectedCard) {
          selectedCard.classList.add('selected');
        }

        this.showNotification(`Your mood set to ${this.capitalizeFirstLetter(moodType)}`, "success");
      }

      // Update mood counts and UI display mode
      await this.updateMoodCounts();
      this.updateMoodVotingDisplayMode();

      // Check if we should show population mood (50+ votes)
      await this.checkPopulationMoodThreshold();

    } catch (error) {
      console.error("Error selecting mood:", error);
      this.showNotification("Failed to update mood", "error");
    }
  }

  updateMoodVotingDisplayMode() {
    // Always show community mood counts and status - never hide them
    document.querySelectorAll('.mood-count').forEach(count => {
      count.style.display = 'block';
    });

    // Always show mood voting status with dominant mood and percentage
    const moodVotingStatus = document.getElementById('moodVotingStatus');
    if (moodVotingStatus) {
      moodVotingStatus.style.display = 'block';
    }

    // Enable all mood cards for voting
    document.querySelectorAll('.mood-vote-card').forEach(card => {
      card.classList.remove('disabled');
      card.style.pointerEvents = 'auto';
      card.style.opacity = '1';
    });

    // Ensure mood voting status is always visible by adding a minimum display time
    if (moodVotingStatus) {
      moodVotingStatus.style.display = 'block';
      // Add a class to prevent flickering
      moodVotingStatus.classList.add('always-visible');
    }
  }

  async updateMoodCounts() {
    try {
      // Get mood vote counts from the last 24 hours
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { data: moodVotes, error } = await this.supabase
        .from('mood_votes')
        .select('mood_type')
        .gte('created_at', yesterday.toISOString());

      if (error) {
        console.error("Error fetching mood votes:", error);
        return;
      }

      // Count votes by mood type
      const moodCounts = {};
      moodVotes.forEach(vote => {
        moodCounts[vote.mood_type] = (moodCounts[vote.mood_type] || 0) + 1;
      });

      // Update UI with counts
      Object.keys(moodCounts).forEach(moodType => {
        const countElement = document.getElementById(`${moodType}Count`);
        if (countElement) {
          countElement.textContent = moodCounts[moodType];
        }
      });

      // Always show mood voting status with dominant mood and percentage
      const totalVotes = Object.values(moodCounts).reduce((sum, count) => sum + count, 0);
      const moodVotingStatus = document.getElementById('moodVotingStatus');

      if (moodVotingStatus) {
        // Find dominant mood
        let dominantMood = null;
        let maxCount = 0;
        Object.entries(moodCounts).forEach(([mood, count]) => {
          if (count > maxCount) {
            maxCount = count;
            dominantMood = mood;
          }
        });

        if (dominantMood && totalVotes > 0) {
          const percentage = Math.round((maxCount / totalVotes) * 100);
          const populationMoodDisplay = document.getElementById('populationMoodDisplay');

          if (populationMoodDisplay) {
            populationMoodDisplay.innerHTML = `
              <i class="${this.getMoodEmoji(dominantMood)}"></i>
              <span data-en="${this.capitalizeFirstLetter(dominantMood)} (${percentage}%)" data-ar="${this.getMoodArabicName(dominantMood)} (${percentage}%)">
                ${this.capitalizeFirstLetter(dominantMood)} (${percentage}%)
              </span>
            `;
          }
        } else if (totalVotes === 0) {
          // Show message when no votes in the area
          const populationMoodDisplay = document.getElementById('populationMoodDisplay');
          if (populationMoodDisplay) {
            populationMoodDisplay.innerHTML = `
              <i class="fas fa-info-circle"></i>
              <span data-en="No Votes in The Area" data-ar="لا توجد تصويتات في المنطقة">No Votes in The Area</span>
            `;
          }
        }

        // Always show the mood voting status
        moodVotingStatus.style.display = 'block';
      }

    } catch (error) {
      console.error("Error updating mood counts:", error);
    }
  }

  async checkPopulationMoodThreshold() {
    // Mood voting status is now always visible - no threshold checking needed
    // This function is kept for backward compatibility but no longer hides the status
    try {
      // Count total mood votes in the last 24 hours for potential future features
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { data: moodVotes, error } = await this.supabase
        .from('mood_votes')
        .select('mood_type')
        .gte('created_at', yesterday.toISOString());

      if (error) {
        console.error("Error checking population mood threshold:", error);
        return;
      }

      // Mood voting status is always visible now
      const moodVotingStatus = document.getElementById('moodVotingStatus');
      if (moodVotingStatus) {
        moodVotingStatus.style.display = 'block';
      }

    } catch (error) {
      console.error("Error checking population mood threshold:", error);
    }
  }

  getMoodEmoji(moodType) {
    const emojis = {
      chill: '😎',
      excited: '🤩',
      anxious: '😰',
      sad: '😢',
      angry: '😠',
      happy: '😀',
      tired: '😴',
      confused: '🤔'
    };
    return emojis[moodType] || '😐';
  }

  getMoodArabicName(moodType) {
    const names = {
      chill: 'هادئ',
      excited: 'مثير',
      anxious: 'قلق',
      sad: 'حزين',
      angry: 'غاضب',
      happy: 'سعيد',
      tired: 'متعب',
      confused: 'مشوش'
    };
    return names[moodType] || moodType;
  }

  async submitReport() {
    if (!this.selectedVibe) {
      this.showNotification("Please select a vibe type", "error");
      return;
    }

    if (!this.currentReportLocation) {
      this.showNotification("Unable to get your location. Please try again.", "error");
      return;
    }

    // Show loading state
    const submitBtn = document.getElementById('submitReportBtn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Submitting...';
    submitBtn.disabled = true;

    try {
      const notes = document.getElementById('reportNotes').value;

      // Check for existing report with same vibe and location
      const { data: existingReports, error: checkError } = await this.supabase
        .from('reports')
        .select('id, created_at')
        .eq('vibe_type', this.selectedVibe)
        .eq('location', this.currentReportLocation)
        .order('created_at', { ascending: false })
        .limit(1);

      if (checkError) {
        console.error("Error checking for existing reports:", checkError);
      } else if (existingReports && existingReports.length > 0) {
        const existingReport = existingReports[0];
        const reportTime = new Date(existingReport.created_at);
        const now = new Date();
        const timeDiff = (now - reportTime) / (1000 * 60); // Difference in minutes

        // If a similar report exists within the last 30 minutes, don't create a duplicate
        if (timeDiff < 30) {
          this.showNotification(`A ${this.capitalizeFirstLetter(this.selectedVibe)} report already exists for this location. Please try again later.`, "warning");
          this.closeModal('reportModal');
          return;
        }
      }

      // Prepare report data with coordinates if available
      const reportData = {
        user_id: null, // Anonymous report - no user association
        vibe_type: this.selectedVibe,
        location: this.currentReportLocation,
        notes: notes || null
      };

      // Add coordinates if available
      if (this.userLocation) {
        reportData.latitude = this.userLocation.latitude;
        reportData.longitude = this.userLocation.longitude;
      }

      const { data, error } = await this.supabase
        .from('reports')
        .insert([reportData])
        .select();

      if (error) {
        console.error("Error submitting report:", error);
        let errorMessage = "Failed to submit report";
        if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = "Network error. Please check your connection and try again.";
        } else {
          errorMessage = `Failed to submit report: ${error.message}`;
        }
        this.showNotification(errorMessage, "error");
      } else {
        // Add the new report to nearbyReports immediately for instant UI feedback
        const newReport = {
          ...reportData,
          id: data[0].id,
          created_at: data[0].created_at,
          upvotes: 0,
          downvotes: 0,
          user_vote: null
        };
        this.nearbyReports.unshift(newReport);

        // Also add to mapReports if it has coordinates (for immediate map display)
        if (newReport.latitude && newReport.longitude) {
          if (!this.mapReports) {
            this.mapReports = [];
          }
          this.mapReports.unshift(newReport);
        }

        this.showNotification("Report submitted successfully", "success");
        this.closeModal('reportModal');
        // Update UI immediately
        this.displayNearbyReports();
        // Refresh map markers immediately if map is loaded
        if (this.map) {
          this.addReportMarkers();
          this.addHeatMapLayer();
        }
        // Reload data in background to ensure consistency
        this.loadNearbyReports();
      }
    } catch (error) {
      console.error("Error submitting report:", error);
      let errorMessage = "Unable to get your location";
      if (error.code === 1) {
        errorMessage = "Location access denied. Please enable location permissions in your browser settings.";
      } else if (error.code === 2) {
        errorMessage = "Location unavailable. Please check your GPS settings and try again.";
      } else if (error.code === 3) {
        errorMessage = "Location request timed out. This can happen in poor signal areas. Please try again.";
      }
      this.showNotification(errorMessage, "error");
    } finally {
      // Reset button state
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  }

  // Complete the missing methods
  async loadUserMoodVote() {
    if (!this.isAuthenticated || !this.userData) return;

    try {
      const { data: moodVote, error } = await this.supabase
        .from('mood_votes')
        .select('mood_type')
        .eq('user_id', this.userData.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error("Error loading user mood vote:", error);
        return;
      }

      if (moodVote && moodVote.length > 0) {
        const selectedCard = document.querySelector(`.mood-vote-card[data-mood="${moodVote[0].mood_type}"]`);
        if (selectedCard) {
          selectedCard.classList.add('selected');
        }
      }
    } catch (error) {
      console.error("Error loading user mood vote:", error);
    }
  }

  getVibeColor(vibeType) {
    const colors = {
      calm: '#4CAF50',
      crowded: '#FF9800',
      noisy: '#F44336',
      festive: '#9C27B0',
      suspicious: '#607D8B',
      dangerous: '#D32F2F'
    };
    return colors[vibeType] || '#9E9E9E';
  }

  getVibeIcon(vibeType) {
    const icons = {
      calm: 'fas fa-peace',
      crowded: 'fas fa-users',
      noisy: 'fas fa-volume-up',
      festive: 'fas fa-glass-cheers',
      suspicious: 'fas fa-eye-slash',
      dangerous: 'fas fa-exclamation-triangle'
    };
    return icons[vibeType] || 'fas fa-question-circle';
  }

  getVibeArabicName(vibeType) {
    const names = {
      calm: 'هادئ',
      crowded: 'مزدحم',
      noisy: 'صاخب',
      festive: 'احتفالي',
      suspicious: 'مشبوه',
      dangerous: 'خطر'
    };
    return names[vibeType] || vibeType;
  }

  capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  formatTimeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) {
      return this.currentLanguage === 'en' ? 'Just now' : 'الآن';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return this.currentLanguage === 'en' ? `${minutes}m ago` : `منذ ${minutes} دقيقة`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return this.currentLanguage === 'en' ? `${hours}h ago` : `منذ ${hours} ساعة`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return this.currentLanguage === 'en' ? `${days}d ago` : `منذ ${days} يوم`;
    }
  }

  updateTextDirection() {
    const direction = this.currentLanguage === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('dir', direction);
  }

  requestUserLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.userLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
          resolve(this.userLocation);
        },
        (error) => {
          let errorMessage = 'Unable to get your location.';
          if (error.code === 1) {
            errorMessage = 'Location access denied. Please enable location permissions.';
          } else if (error.code === 2) {
            errorMessage = 'Location unavailable. Please check your GPS settings.';
          } else if (error.code === 3) {
            errorMessage = 'Location request timed out.';
          }
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }

  async requestLocationImmediately() {
    try {
      await this.requestUserLocation();
      console.log('Location obtained:', this.userLocation);
    } catch (error) {
      console.warn('Failed to get location:', error.message);
    }
  }

  getCurrentLocation(callback) {
    if (this.userLocation) {
      callback(this.userLocation.latitude + ', ' + this.userLocation.longitude);
    } else {
      this.requestUserLocation().then(() => {
        callback(this.userLocation.latitude + ', ' + this.userLocation.longitude);
      }).catch((error) => {
        console.error('Error getting location:', error);
        callback('Unknown location');
      });
    }
  }

  async loadWeatherData() {
    if (!this.userLocation) {
      console.log('No user location available for weather data');
      return;
    }

    try {
      const cachedWeather = localStorage.getItem('hyperapp_weather_data');
      const cacheTime = localStorage.getItem('hyperapp_weather_time');

      if (cachedWeather && cacheTime) {
        const age = Date.now() - parseInt(cacheTime);
        if (age < 30 * 60 * 1000) { // 30 minutes
          const weatherData = JSON.parse(cachedWeather);
          this.updateWeatherUI(weatherData);
          return;
        }
      }

      const apiKey = this.config.weatherApiKey;
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${this.userLocation.latitude}&lon=${this.userLocation.longitude}&appid=${apiKey}&units=metric`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.cod === 200) {
        localStorage.setItem('hyperapp_weather_data', JSON.stringify(data));
        localStorage.setItem('hyperapp_weather_time', Date.now().toString());
        this.updateWeatherUI(data);
      } else {
        console.warn('Weather API error:', data.message);
      }
    } catch (error) {
      console.error('Error loading weather data:', error);
    }
  }

  updateWeatherUI(data) {
    const weatherElement = document.getElementById('weatherInfo');
    if (!weatherElement) return;

    const temp = Math.round(data.main.temp);
    const description = data.weather[0].description;
    const icon = data.weather[0].icon;

    weatherElement.innerHTML = `
      <i class="fas fa-thermometer-half"></i>
      <span>${temp}°C</span>
      <img src="https://openweathermap.org/img/wn/${icon}.png" alt="${description}" style="width: 20px; height: 20px;">
    `;
  }

  updateSafetyHub() {
    // Update safety tips based on current reports and weather
    const safetyTips = document.getElementById('safetyTips');
    if (!safetyTips) return;

    const tips = this.generateDynamicSafetyTips();
    safetyTips.innerHTML = tips.map(tip => `<li>${tip}</li>`).join('');
  }

  generateDynamicSafetyTips() {
    const tips = [];
    const currentHour = new Date().getHours();

    // Time-based tips
    if (currentHour >= 22 || currentHour <= 5) {
      tips.push(this.currentLanguage === 'en' ? 'Night time: Stay in well-lit areas and travel with others' : 'وقت الليل: ابق في الأماكن المضيئة وسافر مع الآخرين');
    }

    // Weather-based tips
    const weatherData = JSON.parse(localStorage.getItem('hyperapp_weather_data') || '{}');
    if (weatherData.main) {
      const temp = weatherData.main.temp;
      if (temp < 10) {
        tips.push(this.currentLanguage === 'en' ? 'Cold weather: Dress warmly and be cautious of icy conditions' : 'طقس بارد: ارتدِ ملابس دافئة وكن حذراً من الظروف الجليدية');
      } else if (temp > 35) {
        tips.push(this.currentLanguage === 'en' ? 'Hot weather: Stay hydrated and avoid prolonged sun exposure' : 'طقس حار: ابق رطباً وتجنب التعرض الطويل للشمس');
      }
    }

    // Report-based tips
    if (this.nearbyReports) {
      const dangerousReports = this.nearbyReports.filter(r => r.vibe_type === 'dangerous');
      if (dangerousReports.length > 0) {
        tips.push(this.currentLanguage === 'en' ? 'Reports of dangerous areas nearby - exercise caution' : 'تقارير عن مناطق خطرة قريبة - كن حذراً');
      }

      const crowdedReports = this.nearbyReports.filter(r => r.vibe_type === 'crowded');
      if (crowdedReports.length > 0) {
        tips.push(this.currentLanguage === 'en' ? 'Crowded areas reported - be aware of your surroundings' : 'تم الإبلاغ عن مناطق مزدحمة - كن على دراية بمحيطك');
      }
    }

    // Default tips
    if (tips.length === 0) {
      tips.push(this.currentLanguage === 'en' ? 'Stay aware of your surroundings and trust your instincts' : 'ابق على دراية بمحيطك وثق بغريزتك');
      tips.push(this.currentLanguage === 'en' ? 'Keep emergency contacts easily accessible' : 'احتفظ بجهات الاتصال الطارئة متاحة بسهولة');
    }

    return tips;
  }

  calculateUserReputation() {
    if (!this.userData) return 0;

    let reputation = 0;

    // Base reputation from reports
    if (this.userReports) {
      reputation += this.userReports.length * 5; // 5 points per report
    }

    // Reputation from votes received
    if (this.userReports) {
      this.userReports.forEach(report => {
        reputation += (report.upvotes || 0) * 2; // 2 points per upvote
        reputation -= (report.downvotes || 0) * 1; // -1 point per downvote
      });
    }

    return Math.max(0, reputation);
  }

  async updateUserReputation() {
    if (!this.isAuthenticated || !this.userData) return;

    try {
      const reputation = this.calculateUserReputation();

      const { error } = await this.supabase
        .from('users')
        .update({ reputation: reputation })
        .eq('user_id', this.userData.id);

      if (error) {
        console.error('Error updating user reputation:', error);
      } else {
        this.userData.reputation = reputation;
        this.updateUserInfo();
      }
    } catch (error) {
      console.error('Error calculating user reputation:', error);
    }
  }

  getUserBadges() {
    const badges = [];
    const reputation = this.userData?.reputation || 0;

    if (reputation >= 100) badges.push('Trusted Reporter');
    if (reputation >= 50) badges.push('Active Contributor');
    if (this.userReports && this.userReports.length >= 10) badges.push('Community Helper');

    return badges;
  }

  checkBadgeUnlocks() {
    const badges = this.getUserBadges();
    const unlockedBadges = JSON.parse(localStorage.getItem('hyperapp_unlocked_badges') || '[]');

    badges.forEach(badge => {
      if (!unlockedBadges.includes(badge)) {
        unlockedBadges.push(badge);
        this.showBadgeNotification(badge);
      }
    });

    localStorage.setItem('hyperapp_unlocked_badges', JSON.stringify(unlockedBadges));
  }

  showBadgeNotification(badge) {
    this.showNotification(`🏆 New badge unlocked: ${badge}!`, 'success');
  }

  async loadEnhancedStats() {
    try {
      // Load community stats
      const stats = await this.getCommunityStats();
      if (stats) {
        this.updateStats();
      }

      // Load enhanced features
      await this.loadTopAreas();
      await this.updateCommunityInsights();
    } catch (error) {
      console.error('Error loading enhanced stats:', error);
    }
  }

  async getCommunityStats() {
    try {
      const { data: reports, error } = await this.supabase
        .from('reports')
        .select('vibe_type, created_at')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (error) {
        console.error('Error fetching community stats:', error);
        return null;
      }

      const totalReports = reports.length;
      const activeUsers = Math.max(1, Math.floor(totalReports / 3));

      const vibeCounts = {};
      reports.forEach(report => {
        vibeCounts[report.vibe_type] = (vibeCounts[report.vibe_type] || 0) + 1;
      });

      return {
        totalReports,
        activeUsers,
        vibeCounts,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting community stats:', error);
      return null;
    }
  }

  updateStats() {
    // Update stats display
    const stats = this.getCommunityStats();
    if (stats) {
      document.getElementById('totalReports').textContent = stats.totalReports;
      document.getElementById('activeUsers').textContent = stats.activeUsers;
    }
  }

  renderStatsCharts() {
    // Render charts for stats visualization
    const vibeCounts = this.getCommunityStats()?.vibeCounts || {};
    const chartContainer = document.getElementById('statsCharts');

    if (!chartContainer) return;

    // Simple bar chart for vibe distribution
    const chartHtml = Object.entries(vibeCounts)
      .map(([vibe, count]) => `
        <div class="chart-bar">
          <div class="chart-label">${this.capitalizeFirstLetter(vibe)}</div>
          <div class="chart-fill" style="width: ${count * 10}px; background: ${this.getVibeColor(vibe)}"></div>
          <div class="chart-count">${count}</div>
        </div>
      `).join('');

    chartContainer.innerHTML = chartHtml;
  }

  setupWeatherAlerts() {
    // Set up weather alert monitoring
    setInterval(() => {
      this.checkWeatherAlerts();
    }, 15 * 60 * 1000); // Check every 15 minutes
  }

  async checkWeatherAlerts() {
    if (!this.userLocation) return;

    try {
      const apiKey = this.config.weatherApiKey;
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${this.userLocation.latitude}&lon=${this.userLocation.longitude}&appid=${apiKey}&units=metric`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.cod === 200) {
        // Check for severe weather conditions
        const weatherId = data.weather[0].id;
        const temp = data.main.temp;

        if (weatherId >= 200 && weatherId < 300) {
          // Thunderstorm
          this.sendWeatherAlert('Thunderstorm warning', 'Severe weather approaching');
        } else if (temp < 0) {
          // Freezing temperatures
          this.sendWeatherAlert('Freezing temperatures', 'Dress warmly and take precautions');
        } else if (temp > 40) {
          // Extreme heat
          this.sendWeatherAlert('Extreme heat', 'Stay hydrated and avoid prolonged sun exposure');
        }
      }
    } catch (error) {
      console.error('Error checking weather alerts:', error);
    }
  }

  sendWeatherAlert(title, message) {
    // Send weather alert notification
    this.showNotification(`${title}: ${message}`, 'warning');

    // Could also send push notification here
    if ('serviceWorker' in navigator && 'Notification' in window) {
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(title, {
          body: message,
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png'
        });
      });
    }
  }

  updateCommunityInsights() {
    // Update community insights based on recent data
    const insights = this.generateCommunityInsights();
    const insightsElement = document.getElementById('communityInsights');

    if (insightsElement) {
      insightsElement.innerHTML = insights.map(insight => `<div class="insight">${insight}</div>`).join('');
    }
  }

  generateCommunityInsights() {
    const insights = [];

    if (this.nearbyReports) {
      const recentReports = this.nearbyReports.filter(r =>
        new Date(r.created_at) > new Date(Date.now() - 60 * 60 * 1000) // Last hour
      );

      if (recentReports.length > 5) {
        insights.push(this.currentLanguage === 'en' ? 'High activity in your area recently' : 'نشاط عالي في منطقتك مؤخراً');
      }

      const dangerousReports = recentReports.filter(r => r.vibe_type === 'dangerous');
      if (dangerousReports.length > 0) {
        insights.push(this.currentLanguage === 'en' ? 'Increased safety concerns reported' : 'تم الإبلاغ عن مخاوف أمنية متزايدة');
      }
    }

    return insights;
  }

  // Geofence methods
  async loadGeofenceSettings() {
    if (!this.isAuthenticated) return;

    try {
      const { data: settings, error } = await this.supabase
        .from('geofence_settings')
        .select('*')
        .eq('user_id', this.userData.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading geofence settings:', error);
        return;
      }

      this.geofenceSettings = settings;
      this.geofenceEnabled = settings?.enabled || false;

      if (this.geofenceEnabled) {
        await this.startGeofenceMonitoring();
      }
    } catch (error) {
      console.error('Error loading geofence settings:', error);
    }
  }

  async saveGeofenceSettings(settings) {
    if (!this.isAuthenticated) return;

    try {
      const { error } = await this.supabase
        .from('geofence_settings')
        .upsert({
          user_id: this.userData.id,
          ...settings
        });

      if (error) {
        console.error('Error saving geofence settings:', error);
        return false;
      }

      this.geofenceSettings = { ...this.geofenceSettings, ...settings };
      return true;
    } catch (error) {
      console.error('Error saving geofence settings:', error);
      return false;
    }
  }

  async toggleGeofenceMonitoring(enabled) {
    this.geofenceEnabled = enabled;

    if (enabled) {
      await this.startGeofenceMonitoring();
    } else {
      this.stopGeofenceMonitoring();
    }

    await this.saveGeofenceSettings({ enabled });
  }

  async startGeofenceMonitoring() {
    if (!this.userLocation) {
      console.warn('Cannot start geofence monitoring without user location');
      return;
    }

    try {
      // Load geofence zones
      await this.classifyGeofenceZones();

      // Start watching position
      if ('geolocation' in navigator) {
        this.geofenceWatchId = navigator.geolocation.watchPosition(
          (position) => {
            this.handleGeofenceEvent(position);
          },
          (error) => {
            console.error('Geofence position watch error:', error);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
          }
        );
      }
    } catch (error) {
      console.error('Error starting geofence monitoring:', error);
    }
  }

  stopGeofenceMonitoring() {
    if (this.geofenceWatchId) {
      navigator.geolocation.clearWatch(this.geofenceWatchId);
      this.geofenceWatchId = null;
    }
  }

  async classifyGeofenceZones() {
    try {
      // Get reports within a reasonable radius (e.g., 1km)
      const { data: reports, error } = await this.supabase
        .from('reports')
        .select('latitude, longitude, vibe_type')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (error) {
        console.error('Error loading reports for geofencing:', error);
        return;
      }

      // Group reports by danger level
      this.geofences = {
        dangerous: reports.filter(r => r.vibe_type === 'dangerous'),
        suspicious: reports.filter(r => r.vibe_type === 'suspicious'),
        crowded: reports.filter(r => r.vibe_type === 'crowded')
      };

    } catch (error) {
      console.error('Error classifying geofence zones:', error);
    }
  }

  handleGeofenceEvent(position) {
    const currentPos = {
      lat: position.coords.latitude,
      lng: position.coords.longitude
    };

    const currentZones = new Set();

    // Check each geofence type
    Object.entries(this.geofences).forEach(([zoneType, reports]) => {
      reports.forEach(report => {
        const distance = this.calculateDistance(currentPos, {
          lat: report.latitude,
          lng: report.longitude
        });

        // If within 500 meters of a report location
        if (distance < 0.5) {
          currentZones.add(zoneType);
        }
      });
    });

    // Check for zone changes
    const enteredZones = [...currentZones].filter(zone => !this.currentGeofenceZones.has(zone));
    const exitedZones = [...this.currentGeofenceZones].filter(zone => !currentZones.has(zone));

    // Send notifications for zone changes
    enteredZones.forEach(zone => {
      this.sendGeofenceNotification('entered', zone);
    });

    exitedZones.forEach(zone => {
      this.sendGeofenceNotification('exited', zone);
    });

    this.currentGeofenceZones = currentZones;
    this.lastGeofenceCheck = Date.now();
  }

  calculateDistance(pos1, pos2) {
    // Haversine formula for distance calculation
    const R = 6371; // Earth's radius in kilometers
    const dLat = (pos2.lat - pos1.lat) * Math.PI / 180;
    const dLng = (pos2.lng - pos1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(pos1.lat * Math.PI / 180) * Math.cos(pos2.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  sendGeofenceNotification(action, zoneType) {
    const priority = this.getGeofenceNotificationPriority(zoneType);
    const message = this.getGeofenceNotificationMessage(action, zoneType);

    // Send notification based on priority
    if (priority === 'high') {
      this.showNotification(message, 'error');
    } else if (priority === 'medium') {
      this.showNotification(message, 'warning');
    } else {
      this.showNotification(message, 'info');
    }

    // Could also trigger haptic feedback or sound alerts here
  }

  getGeofenceNotificationPriority(zoneType) {
    const priorities = {
      dangerous: 'high',
      suspicious: 'medium',
      crowded: 'low'
    };
    return priorities[zoneType] || 'low';
  }

  getGeofenceNotificationMessage(action, zoneType) {
    const messages = {
      entered: {
        dangerous: this.currentLanguage === 'en' ? '⚠️ Entering dangerous area - exercise extreme caution' : '⚠️ تدخل منطقة خطرة - كن حذراً للغاية',
        suspicious: this.currentLanguage === 'en' ? '👁️ Entering area with suspicious activity reports' : '👁️ تدخل منطقة بها تقارير عن نشاط مشبوه',
        crowded: this.currentLanguage === 'en' ? '👥 Entering crowded area - stay aware of surroundings' : '👥 تدخل منطقة مزدحمة - كن على دراية بمحيطك'
      },
      exited: {
        dangerous: this.currentLanguage === 'en' ? '✅ Left dangerous area' : '✅ غادرت المنطقة الخطرة',
        suspicious: this.currentLanguage === 'en' ? '✅ Left area with suspicious activity' : '✅ غادرت المنطقة ذات النشاط المشبوه',
        crowded: this.currentLanguage === 'en' ? '✅ Left crowded area' : '✅ غادرت المنطقة المزدحمة'
      }
    };

    return messages[action]?.[zoneType] || `${action} ${zoneType} zone`;
  }

  checkGeofenceStatus() {
    // Check current geofence status and update UI
    const statusElement = document.getElementById('geofenceStatus');
    if (statusElement) {
      if (this.geofenceEnabled) {
        const zones = [...this.currentGeofenceZones];
        if (zones.length > 0) {
          statusElement.innerHTML = `<i class="fas fa-map-marker-alt"></i> In: ${zones.join(', ')}`;
          statusElement.className = 'geofence-status active';
        } else {
          statusElement.innerHTML = '<i class="fas fa-check-circle"></i> Safe zone';
          statusElement.className = 'geofence-status safe';
        }
      } else {
        statusElement.innerHTML = '<i class="fas fa-pause-circle"></i> Disabled';
        statusElement.className = 'geofence-status disabled';
      }
    }
  }

  // Additional UI methods
  showView(viewName) {
    // Hide all views
    document.querySelectorAll('.view').forEach(view => {
      view.classList.add('hidden');
    });

    // Show selected view
    const selectedView = document.getElementById(viewName + 'View');
    if (selectedView) {
      selectedView.classList.remove('hidden');
    }

    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
    });

    const navItem = document.querySelector(`[data-view="${viewName}"]`);
    if (navItem) {
      navItem.classList.add('active');
    }
  }

  async loadMap() {
    if (!this.map) {
      // Initialize map
      this.map = L.map('map').setView([51.505, -0.09], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(this.map);

      // Load map reports
      await this.loadMapReports();
    }
  }

  async loadMapReports() {
    try {
      const { data: reports, error } = await this.supabase
        .from('reports')
        .select('id, vibe_type, latitude, longitude, location, notes')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .limit(100);

      if (error) {
        console.error('Error loading map reports:', error);
        return;
      }

      this.mapReports = reports;
      this.displayMap();
    } catch (error) {
      console.error('Error loading map reports:', error);
    }
  }

  displayMap() {
    if (!this.map || !this.mapReports) return;

    // Clear existing markers
    this.map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        this.map.removeLayer(layer);
      }
    });

    // Add markers for reports
    this.mapReports.forEach(report => {
      const marker = L.marker([report.latitude, report.longitude])
        .addTo(this.map)
        .bindPopup(`
          <strong>${this.capitalizeFirstLetter(report.vibe_type)}</strong><br>
          ${report.location}<br>
          ${report.notes || ''}
        `);
    });

    // Fit map to show all markers
    if (this.mapReports.length > 0) {
      const group = new L.featureGroup(this.mapReports.map(r =>
        L.marker([r.latitude, r.longitude])
      ));
      this.map.fitBounds(group.getBounds().pad(0.1));
    }
  }

  async loadTopAreas() {
    try {
      const { data: areas, error } = await this.supabase
        .from('reports')
        .select('location, vibe_type')
        .not('location', 'is', null);

      if (error) {
        console.error('Error loading top areas:', error);
        return;
      }

      // Count reports by location
      const locationCounts = {};
      areas.forEach(area => {
        locationCounts[area.location] = (locationCounts[area.location] || 0) + 1;
      });

      // Sort by report count
      const topAreas = Object.entries(locationCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);

      // Display top areas
      const container = document.getElementById('topAreas');
      if (container) {
        container.innerHTML = topAreas.map(([location, count]) =>
          `<div class="top-area">${location}: ${count} reports</div>`
        ).join('');
      }
    } catch (error) {
      console.error('Error loading top areas:', error);
    }
  }

  toggleLanguage() {
    this.currentLanguage = this.currentLanguage === 'en' ? 'ar' : 'en';
    this.applyLanguage(this.currentLanguage);

    // Save language preference
    if (this.isAuthenticated) {
      this.supabase
        .from('users')
        .update({ language: this.currentLanguage })
        .eq('user_id', this.userData.id)
        .then(() => {
          console.log('Language preference saved');
        })
        .catch(error => {
          console.error('Error saving language preference:', error);
        });
    }

    localStorage.setItem('hyperapp_language', this.currentLanguage);
  }

  changeLanguage(lang) {
    this.currentLanguage = lang;
    this.applyLanguage(lang);
  }

  applyLanguage(lang) {
    this.currentLanguage = lang;
    document.documentElement.lang = lang;

    // Update all text elements with data attributes
    document.querySelectorAll('[data-en], [data-ar]').forEach(element => {
      const text = element.getAttribute(`data-${lang}`);
      if (text) {
        element.textContent = text;
      }
    });

    // Update language selector
    document.getElementById('currentLanguage').textContent = lang === 'en' ? 'EN' : 'AR';

    this.updateTextDirection();
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <span>${message}</span>
      <button class="notification-close" onclick="this.parentElement.remove()">×</button>
    `;

    document.getElementById('notifications').appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'none';
    }
  }

  // Setup event listeners
  setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const view = e.currentTarget.getAttribute('data-view');
        this.showView(view);
      });
    });

    // Report modal
    document.getElementById('reportBtn').addEventListener('click', () => this.showReportModal());
    document.getElementById('submitReportBtn').addEventListener('click', () => this.submitReport());

    // Emergency modal
    document.getElementById('emergencyBtn').addEventListener('click', () => this.showEmergencyReport());
    document.getElementById('submitEmergencyBtn').addEventListener('click', () => this.submitEmergencyReport());

    // Vibe selection
    document.querySelectorAll('.vibe-option').forEach(option => {
      option.addEventListener('click', (e) => {
        this.selectVibe(e.currentTarget.getAttribute('data-vibe'));
      });
    });

    // Mood voting
    document.querySelectorAll('.mood-vote-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const moodType = e.currentTarget.getAttribute('data-mood');
        this.selectMood(moodType);
      });
    });

    // Vote buttons (delegated)
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('upvote-btn') || e.target.classList.contains('downvote-btn')) {
        e.preventDefault();
        const reportId = e.target.getAttribute('data-report-id');
        const voteType = e.target.classList.contains('upvote-btn') ? 'upvote' : 'downvote';
        this.voteReport(reportId, voteType);
      }
    });

    // Language toggle
    document.getElementById('languageToggle').addEventListener('click', () => this.toggleLanguage());

    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('hyperapp-theme', newTheme);

      // Update icon
      const icon = document.querySelector('#themeToggle i');
      if (icon) {
        icon.className = newTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
      }
    });

    // Modal close buttons
    document.querySelectorAll('.modal .close').forEach(closeBtn => {
      closeBtn.addEventListener('click', (e) => {
        e.target.closest('.modal').style.display = 'none';
      });
    });

    // Click outside modal to close
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
      }
    });

    // Geofence toggle
    const geofenceToggle = document.getElementById('geofenceToggle');
    if (geofenceToggle) {
      geofenceToggle.addEventListener('change', (e) => {
        this.toggleGeofenceMonitoring(e.target.checked);
      });
    }

    // Real-time subscriptions
    this.setupRealtimeSubscriptions();
  }

  setupRealtimeSubscriptions() {
    if (!this.supabase) return;

    // Subscribe to new reports
    this.supabase
      .channel('reports')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'reports'
      }, (payload) => {
        console.log('New report:', payload.new);
        // Refresh nearby reports
        this.loadNearbyReports();
      })
      .subscribe();

    // Subscribe to votes
    this.supabase
      .channel('votes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'votes'
      }, (payload) => {
        console.log('New vote:', payload.new);
        // Refresh reports to show updated vote counts
        this.loadNearbyReports();
      })
      .subscribe();

    // Subscribe to mood votes
    this.supabase
      .channel('mood_votes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'mood_votes'
      }, (payload) => {
        console.log('New mood vote:', payload.new);
        // Update mood counts
        this.updateMoodCounts();
      })
      .subscribe();
  }

  // Initialize the app when DOM is loaded
  static init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        window.hyperApp = new HyperApp();
      });
    } else {
      window.hyperApp = new HyperApp();
    }
  }
}

// Initialize the app
HyperApp.init();
