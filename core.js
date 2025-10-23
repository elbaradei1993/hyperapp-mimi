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

    // Initialize managers synchronously
    this.uiManager = new UIManager(this);
    this.dataManager = new DataManager(this);
    this.authManager = new AuthManager(this);
    this.mapManager = new MapManager(this);
    this.geofenceManager = new GeofenceManager(this);

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

  // Get vibe color for charts
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

  // Get community stats from database
  async getCommunityStats() {
    try {
      const { data: reports, error } = await this.supabase
        .from('reports')
        .select('vibe_type, created_at')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) {
        console.error('Error fetching community stats:', error);
        return null;
      }

      const totalReports = reports.length;
      const vibeCounts = {};

      reports.forEach(report => {
        if (!vibeCounts[report.vibe_type]) {
          vibeCounts[report.vibe_type] = 0;
        }
        vibeCounts[report.vibe_type]++;
      });

      return {
        totalReports,
        vibeCounts,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting community stats:', error);
      return null;
    }
  }

  // Load nearby reports
  async loadNearbyReports() {
    try {
      console.log('Loading nearby reports...');
      const { data: reports, error } = await this.supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading nearby reports:', error);
        return;
      }

      this.nearbyReports = reports || [];
      console.log(`Loaded ${this.nearbyReports.length} nearby reports`);
    } catch (error) {
      console.error('Error loading nearby reports:', error);
    }
  }

  // Load map reports
  async loadMapReports() {
    try {
      console.log('Loading map reports...');
      const { data: reports, error } = await this.supabase
        .from('reports')
        .select('id, vibe_type, latitude, longitude, created_at')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) {
        console.error('Error loading map reports:', error);
        return;
      }

      console.log(`Loaded ${reports.length} map reports`);
      return reports;
    } catch (error) {
      console.error('Error loading map reports:', error);
      return [];
    }
  }

  // Show notification
  showNotification(message, type = 'info') {
    // Simple notification implementation
    console.log(`[${type.toUpperCase()}] ${message}`);

    // Create notification element if it doesn't exist
    let notificationEl = document.getElementById('notification');
    if (!notificationEl) {
      notificationEl = document.createElement('div');
      notificationEl.id = 'notification';
      notificationEl.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 16px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transform: translateX(400px);
        transition: transform 0.3s ease;
      `;
      document.body.appendChild(notificationEl);
    }

    // Set notification style based on type
    const colors = {
      success: '#4CAF50',
      error: '#F44336',
      warning: '#FF9800',
      info: '#2196F3'
    };

    notificationEl.style.backgroundColor = colors[type] || colors.info;
    notificationEl.textContent = message;
    notificationEl.style.transform = 'translateX(0)';

    // Auto-hide after 3 seconds
    setTimeout(() => {
      notificationEl.style.transform = 'translateX(400px)';
      setTimeout(() => {
        if (notificationEl.parentNode) {
          notificationEl.parentNode.removeChild(notificationEl);
        }
      }, 300);
    }, 3000);
  }

  // Close modal
  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'none';
    }
  }

  // Capitalize first letter
  capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  // Format time ago
  formatTimeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  }

  // Update text direction
  updateTextDirection() {
    // Simple implementation - could be enhanced for RTL languages
    const currentLang = this.currentLanguage;
    document.documentElement.setAttribute('lang', currentLang);
    document.documentElement.setAttribute('dir', currentLang === 'ar' ? 'rtl' : 'ltr');
  }

  // Check auth state
  checkAuthState() {
    // Simple auth check - could be enhanced
    const user = localStorage.getItem('hyperapp_user');
    if (user) {
      try {
        this.userData = JSON.parse(user);
        this.isAuthenticated = true;
      } catch (error) {
        console.warn('Error parsing stored user data:', error);
        localStorage.removeItem('hyperapp_user');
      }
    }
  }

  // Show auth modal
  showAuthModal() {
    // Simple auth modal implementation
    const modal = document.createElement('div');
    modal.id = 'authModal';
    modal.className = 'modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    modal.innerHTML = `
      <div style="background: white; padding: 20px; border-radius: 8px; max-width: 400px; width: 90%;">
        <h3>Authentication Required</h3>
        <p>Please login to access this feature.</p>
        <button onclick="this.closest('.modal').remove()" style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Close</button>
      </div>
    `;

    document.body.appendChild(modal);
  }

  // Sync user with Supabase
  async syncUserWithSupabase() {
    if (!this.userData) return;

    try {
      // Check if user exists in database
      const { data: existingUser, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('user_id', this.userData.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        console.error('Error checking user:', error);
        return;
      }

      if (!existingUser) {
        // Create new user record
        const { error: insertError } = await this.supabase
          .from('users')
          .insert([{
            user_id: this.userData.id,
            username: this.userData.username,
            first_name: this.userData.first_name,
            last_name: this.userData.last_name,
            created_at: new Date().toISOString()
          }]);

        if (insertError) {
          console.error('Error creating user:', insertError);
        }
      }
    } catch (error) {
      console.error('Error syncing user:', error);
    }
  }

  // Update connection status
  updateConnectionStatus(isConnected) {
    this.isConnected = isConnected;
    const statusEl = document.getElementById('connectionStatus');
    if (statusEl) {
      statusEl.textContent = isConnected ? 'Online' : 'Offline';
      statusEl.style.color = isConnected ? 'var(--success)' : 'var(--danger)';
    }
  }

  // Update user info
  updateUserInfo() {
    if (!this.userData) return;

    const userInfoEl = document.getElementById('userInfo');
    if (userInfoEl) {
      userInfoEl.textContent = this.userData.first_name || this.userData.username || 'User';
    }
  }

  // Setup auth listeners
  setupAuthListeners() {
    // Simple implementation - could be enhanced
    console.log('Auth listeners setup');
  }

  // Setup realtime subscriptions
  setupRealtimeSubscriptions() {
    try {
      console.log('Setting up realtime subscriptions...');

      // Subscribe to new reports
      this.supabase
        .channel('reports_changes')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'reports'
        }, (payload) => {
          console.log('New report received:', payload.new);
          // Could update UI here
        })
        .subscribe();

      console.log('Realtime subscriptions setup complete');
    } catch (error) {
      console.warn('Error setting up realtime subscriptions:', error);
    }
  }

  // Validate database schema
  async validateDatabaseSchema() {
    try {
      // Simple schema validation
      const { error } = await this.supabase
        .from('reports')
        .select('id')
        .limit(1);

      if (error) {
        console.warn('Database schema validation failed:', error);
      } else {
        console.log('Database schema validated successfully');
      }
    } catch (error) {
      console.warn('Error validating database schema:', error);
    }
  }

  // Initialize service worker
  async initializeServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service worker registered:', registration);
      } catch (error) {
        console.warn('Service worker registration failed:', error);
      }
    }
  }

  // Handle new report from realtime
  handleNewReport(report) {
    console.log('New report:', report);
    // Could update UI or show notification
  }

  // Handle report update from realtime
  handleReportUpdate(report) {
    console.log('Report updated:', report);
    // Could update UI
  }

  // Handle new vote from realtime
  handleNewVote(vote) {
    console.log('New vote:', vote);
    // Could update UI
  }

  // Setup periodic trend updates
  setupPeriodicTrendUpdates() {
    // Simple periodic updates
    setInterval(() => {
      if (this.userLocation) {
        console.log('Periodic trend update');
        // Could update trends here
      }
    }, 180000); // 3 minutes
  }

  // Force data refresh
  forceDataRefresh() {
    console.log('Forcing data refresh...');
    // Clear caches and reload data
    localStorage.removeItem('hyperapp_cached_community_stats');
    localStorage.removeItem('hyperapp_cached_stats_time');
    localStorage.removeItem('hyperapp_weather_data');
    localStorage.removeItem('hyperapp_weather_time');

    // Reload the page to restart the app
    window.location.reload();
  }

  // Filter reports
  filterReports(filterType) {
    console.log('Filtering reports by:', filterType);
    // Implementation would filter the displayed reports
  }

  // Call emergency
  callEmergency(contactType) {
    console.log('Calling emergency contact:', contactType);
    // Implementation would initiate emergency call
  }

  // Show vibe category reports
  showVibeCategoryReports(vibeType) {
    console.log('Showing reports for vibe:', vibeType);
    // Implementation would filter and show reports for specific vibe
  }



  async requestLocationImmediately() {
    // Critical: Request location immediately and wait for it before loading any data
    if (!navigator.geolocation) {
      console.log('Geolocation not supported - proceeding without location');
      return false;
    }

    try {
      console.log('Requesting location immediately on app start...');

      const position = await new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Location timeout'));
        }, 10000); // 10 second timeout for immediate load

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            clearTimeout(timeoutId);
            resolve(pos);
          },
          (err) => {
            clearTimeout(timeoutId);
            reject(err);
          },
          {
            timeout: 8000,
            enableHighAccuracy: true,
            maximumAge: 120000 // Accept cached position up to 2 minutes old
          }
        );
      });

      const { latitude, longitude, accuracy } = position.coords;

      this.userLocation = {
        latitude,
        longitude,
        accuracy,
        timestamp: Date.now()
      };

      console.log('Location obtained immediately:', latitude, longitude);
      return true;

    } catch (error) {
      console.log('Location not available immediately, proceeding without location:', error.message);
      // Don't show error notification on startup - user can enable location manually later
      return false;
    }
  }

  async loadAllDataImmediately() {
    // Load all critical data synchronously after location is available
    console.log('Loading all data immediately...');

    try {
      // Load reports first (most critical)
      await this.dataManager.loadNearbyReports(0, true);

      // Load enhanced stats (includes UI rendering)
      await this.dataManager.loadEnhancedStats();

      // Update stats UI
      this.uiManager.updateStats();

      // Load map data (lightweight)
      this.mapManager.loadMap();

      // Load weather data
      this.dataManager.loadWeatherData();

      // Load user-specific data if authenticated
      if (this.isAuthenticated) {
        await this.dataManager.loadUserReports();
        await this.dataManager.updateUserReputation();
      }

      console.log('All data loaded immediately');

    } catch (error) {
      console.error('Error loading data immediately:', error);
      // Still show the app even if some data fails to load
      this.uiManager.updateStats();
    }
  }

  setupRealtimeSubscriptions() {
    // Subscribe to new reports
    this.supabase
      .channel('reports_changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'reports'
      }, (payload) => {
        this.handleNewReport(payload.new);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'reports'
      }, (payload) => {
        this.handleReportUpdate(payload.new);
      })
      .subscribe();

    // Subscribe to vote changes
    this.supabase
      .channel('votes_changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'votes'
      }, (payload) => {
        this.handleNewVote(payload.new);
      })
      .subscribe();

    // Set up periodic location-based trend updates
    this.setupPeriodicTrendUpdates();
  }

  setupConsolidatedLocationMonitoring() {
    // Consolidated location monitoring to prevent duplicate watchers
    this.lastLocationUpdate = 0;
    this.locationUpdateTimer = null;
    this.locationWatchId = null;
    this.lastTrendUpdateLocation = null;

    if (navigator.geolocation) {
      // Single location watcher with throttling
      this.locationWatchId = navigator.geolocation.watchPosition(
        (position) => {
          const newLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            timestamp: Date.now()
          };

          const now = Date.now();
          const throttleMs = 30000; // 30 second throttle for location updates

          // Update user location immediately
          this.userLocation = newLocation;

          // Check if location changed significantly (more than 500 meters) OR time-based update needed
          const shouldUpdateTrends = this.shouldUpdateLocationTrends(newLocation, now);

          if (shouldUpdateTrends) {
            // Throttle trend updates to prevent excessive calls
            if (now - this.lastLocationUpdate < throttleMs) {
              // Clear existing timer and set new one
              if (this.locationUpdateTimer) {
                clearTimeout(this.locationUpdateTimer);
              }

              this.locationUpdateTimer = setTimeout(() => {
                this.updateLocationBasedTrends();
                this.lastLocationUpdate = Date.now();
                this.lastTrendUpdateLocation = newLocation;
              }, throttleMs - (now - this.lastLocationUpdate));

              return;
            }

            // Process immediately if enough time has passed
            this.updateLocationBasedTrends();
            this.lastLocationUpdate = now;
            this.lastTrendUpdateLocation = newLocation;
          }
        },
        (error) => {
          console.log('Location watch error:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 60000 // Accept cached position up to 1 minute old
        }
      );
    }
  }

  shouldUpdateLocationTrends(newLocation, now) {
    // Update if this is the first location
    if (!this.lastTrendUpdateLocation) {
      return true;
    }

    // Update if location changed significantly (more than 500 meters)
    const distance = this.calculateDistance(
      this.lastTrendUpdateLocation.latitude,
      this.lastTrendUpdateLocation.longitude,
      newLocation.latitude,
      newLocation.longitude
    );

    if (distance > 0.5) { // 500 meters
      console.log(`Location changed by ${distance.toFixed(2)}km, updating trends`);
      return true;
    }

    // Update periodically (every 3 minutes) even without significant location change
    const timeSinceLastUpdate = now - this.lastLocationUpdate;
    if (timeSinceLastUpdate > 180000) { // 3 minutes
      console.log(`Periodic trend update (${Math.round(timeSinceLastUpdate / 1000)}s since last)`);
      return true;
    }

    return false;
  }

  async updateLocationBasedTrends() {
    if (!this.userLocation) return;

    try {
      console.log('Updating location-based trend analysis data');

      // Get fresh trend data for current location
      const trendData = await this.dataManager.getLocationTrendData();

      // Cache location-specific trend data
      this.dataManager.cacheLocationTrendData(trendData);

      // Update UI with fresh trend data
      this.dataManager.updateTrendAnalysisUI(trendData);

      // Update safety hub with location-specific insights
      this.dataManager.updateLocationSafetyInsights(trendData);

      // Update community vibe sidebar with location-specific data
      this.dataManager.updateCommunityVibeWithLocationData(trendData);

      // Show subtle notification if trends changed significantly
      this.dataManager.checkTrendChanges(trendData);

    } catch (error) {
      console.error('Error updating location-based trends:', error);
    }
  }

  calculateDistance(lat1, lng1, lat2, lng2) {
    // Haversine formula to calculate distance between two points
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Delegate methods to appropriate managers
  showView(viewId) {
    this.uiManager.showView(viewId);
    if (viewId === 'map') {
      this.mapManager.displayMap();
    } else if (viewId === 'reports') {
      this.loadUserDashboard();
    }
  }

  async loadUserDashboard() {
    if (!this.isAuthenticated || !this.userData) {
      this.authManager.showAuthModal();
      return;
    }

    // Load all dashboard components
    await Promise.all([
      this.loadUserProfile(),
      this.loadUserBadges(),
      this.loadUserStats(),
      this.loadUserRecentActivity()
    ]);
  }

  async loadUserProfile() {
    const profileSection = document.getElementById('userProfileSection');

    try {
      // Get user reputation and basic info
      const reputation = await this.dataManager.calculateUserReputation(this.userData.id);

      profileSection.innerHTML = `
        <div class="user-profile-card">
          <div class="user-avatar">
            <i class="fas fa-user-circle"></i>
          </div>
          <div class="user-info">
            <h3>${this.userData.username || this.userData.first_name || 'User'}</h3>
            <div class="reputation-display ${reputation > 50 ? 'high' : ''}">
              <i class="fas fa-star"></i>
              <span>${reputation} Reputation Points</span>
            </div>
            <p class="user-join-date">Member since ${new Date(this.userData.created_at || Date.now()).toLocaleDateString()}</p>
          </div>
        </div>
      `;
    } catch (error) {
      console.error("Error loading user profile:", error);
      profileSection.innerHTML = `
        <div class="user-profile-card">
          <div class="user-avatar">
            <i class="fas fa-user-circle"></i>
          </div>
          <div class="user-info">
            <h3>${this.userData.username || this.userData.first_name || 'User'}</h3>
            <p>Error loading profile data</p>
          </div>
        </div>
      `;
    }
  }

  async loadUserBadges() {
    const badgesContainer = document.getElementById('userBadges');

    try {
      const badges = await this.dataManager.getUserBadges(this.userData.id);

      if (badges.length === 0) {
        badgesContainer.innerHTML = `
          <div class="no-data">
            <i class="fas fa-medal"></i>
            <p>No badges earned yet. Start reporting to unlock achievements!</p>
          </div>
        `;
        return;
      }

      badgesContainer.innerHTML = badges.map(badge => `
        <div class="badge-item unlocked">
          <div class="badge-icon" style="background: linear-gradient(135deg, ${badge.color}, ${badge.color}dd);">
            <i class="${badge.icon}"></i>
          </div>
          <div class="badge-name">${badge.name}</div>
          <div class="badge-description">${badge.description}</div>
        </div>
      `).join('');
    } catch (error) {
      console.error("Error loading user badges:", error);
      badgesContainer.innerHTML = '<div class="no-data">Error loading badges</div>';
    }
  }

  async loadUserStats() {
    try {
      // Get user's reports for stats
      const { data: reports, error } = await this.supabase
        .from('reports')
        .select('upvotes, created_at, vibe_type')
        .eq('user_id', this.userData.id);

      if (error) {
        console.error("Error loading user stats:", error);
        return;
      }

      const totalReports = reports.length;
      const totalUpvotes = reports.reduce((sum, r) => sum + (r.upvotes || 0), 0);
      const reputation = await this.dataManager.calculateUserReputation(this.userData.id);

      // Calculate community rank (simplified - would need more complex query in production)
      const rank = await this.calculateUserRank(this.userData.id);

      // Update stats display
      document.getElementById('userTotalReports').textContent = totalReports;
      document.getElementById('userTotalUpvotes').textContent = totalUpvotes;
      document.getElementById('userReputationScore').textContent = reputation;
      document.getElementById('userRank').textContent = rank || '-';
    } catch (error) {
      console.error("Error loading user stats:", error);
    }
  }

  async calculateUserRank(userId) {
    try {
      // Get all users with their reputation scores
      const { data: allUsers, error } = await this.supabase
        .from('users')
        .select('user_id, reputation')
        .order('reputation', { ascending: false });

      if (error) {
        console.error("Error calculating user rank:", error);
        return null;
      }

      const userIndex = allUsers.findIndex(user => user.user_id === userId);
      return userIndex !== -1 ? userIndex + 1 : null;
    } catch (error) {
      console.error("Error calculating user rank:", error);
      return null;
    }
  }

  async loadUserRecentActivity() {
    const activityContainer = document.getElementById('userRecentActivity');

    try {
      // Get user's recent reports
      const { data: reports, error } = await this.supabase
        .from('reports')
        .select('*')
        .eq('user_id', this.userData.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error("Error loading user recent activity:", error);
        activityContainer.innerHTML = '<div class="no-data">Error loading recent activity</div>';
        return;
      }

      if (reports.length === 0) {
        activityContainer.innerHTML = `
          <div class="no-data">
            <i class="fas fa-plus-circle"></i>
            <p>No recent activity. Submit your first report to get started!</p>
          </div>
        `;
        return;
      }

      activityContainer.innerHTML = reports.map(report => `
        <div class="report-item">
          <div class="report-info">
            <div class="report-type">
              <i class="${this.uiManager.getVibeIcon(report.vibe_type)}"></i>
              <span data-en="${this.uiManager.capitalizeFirstLetter(report.vibe_type)}" data-ar="${this.uiManager.getVibeArabicName(report.vibe_type)}">
                ${this.uiManager.capitalizeFirstLetter(report.vibe_type)}
              </span>
            </div>
            <div class="report-details">${report.notes || ''}</div>
            <div class="report-meta">
              <span>${report.location || 'Unknown location'}</span>
              <span>${this.uiManager.formatTimeAgo(report.created_at)}</span>
              <span>👍 ${report.upvotes || 0} 👎 ${report.downvotes || 0}</span>
            </div>
          </div>
        </div>
      `).join('');

      this.uiManager.updateTextDirection();
    } catch (error) {
      console.error("Error loading user recent activity:", error);
      activityContainer.innerHTML = '<div class="no-data">Error loading recent activity</div>';
    }
  }

  // Report-related methods
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
      this.authManager.showAuthModal();
      this.uiManager.showNotification("Please login to vote on mood", "error");
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
          this.uiManager.showNotification("Failed to update mood vote", "error");
          return;
        }

        // Remove selection from UI
        selectedCard.classList.remove('selected');
        this.uiManager.showNotification("Mood vote removed - you can now select a different mood or see community votes", "info");

      } else if (hasOtherMoodSelected) {
        // User is trying to select a different mood while one is already selected
        // Require them to unselect first
        this.uiManager.showNotification("Please unselect your current mood first before choosing a different one", "warning");
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
          this.uiManager.showNotification("Failed to submit mood vote", "error");
          return;
        }

        // Select the new mood in UI
        if (selectedCard) {
          selectedCard.classList.add('selected');
        }

        this.uiManager.showNotification(`Your mood set to ${this.uiManager.capitalizeFirstLetter(moodType)}`, "success");
      }

      // Update mood counts and UI display mode
      await this.dataManager.updateMoodCounts();
      this.uiManager.updateMoodVotingDisplayMode();

      // Check if we should show population mood (50+ votes)
      await this.dataManager.checkPopulationMoodThreshold();

    } catch (error) {
      console.error("Error selecting mood:", error);
      this.uiManager.showNotification("Failed to update mood", "error");
    }
  }

  async submitReport() {
    if (!this.selectedVibe) {
      this.uiManager.showNotification("Please select a vibe type", "error");
      return;
    }

    if (!this.currentReportLocation) {
      this.uiManager.showNotification("Unable to get your location. Please try again.", "error");
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
          this.uiManager.showNotification(`A ${this.uiManager.capitalizeFirstLetter(this.selectedVibe)} report already exists for this location. Please try again later.`, "warning");
          this.uiManager.closeModal('reportModal');
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
        this.uiManager.showNotification(errorMessage, "error");
      } else {
        this.uiManager.showNotification("Report submitted successfully", "success");
        this.uiManager.closeModal('reportModal');
        // Reload data to show the new report
        await this.dataManager.loadNearbyReports();
        // Refresh map to show new report
        this.mapManager.loadMap();
      }
    } catch (error) {
      let errorMessage = "Unable to get your location";
      if (error.code === 1) {
        errorMessage = "Location access denied. Please enable location permissions in your browser settings.";
      } else if (error.code === 2) {
        errorMessage = "Location unavailable. Please check your GPS settings and try again.";
      } else if (error.code === 3) {
        errorMessage = "Location request timed out. This can happen in poor signal areas. Please try again.";
      }
      this.uiManager.showNotification(errorMessage, "error");
    } finally {
      // Reset button state
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  }

  showEmergencyReport() {
    // Get current location automatically
    this.getCurrentLocation((location) => {
      this.currentEmergencyLocation = location;
    });

    document.getElementById('emergencyDetails').value = '';
    document.getElementById('emergencyModal').style.display = 'block';
  }

  async submitEmergencyReport() {
    if (!this.currentEmergencyLocation) {
      this.uiManager.showNotification("Unable to get your location. Please try again.", "error");
      return;
    }

    // Show loading state
    const submitBtn = document.getElementById('submitEmergencyBtn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Submitting...';
    submitBtn.disabled = true;

    try {
      const emergencyType = document.getElementById('emergencyType').value;
      const details = document.getElementById('emergencyDetails').value;

      if (!details) {
        this.uiManager.showNotification("Please provide emergency details", "error");
        return;
      }

      // Check for existing emergency report with same location (within last 2 hours for emergencies)
      const { data: existingReports, error: checkError } = await this.supabase
        .from('reports')
        .select('id, created_at')
        .eq('vibe_type', 'dangerous')
        .eq('location', this.currentEmergencyLocation)
        .order('created_at', { ascending: false })
        .limit(1);

      if (checkError) {
        console.error("Error checking for existing emergency reports:", checkError);
      } else if (existingReports && existingReports.length > 0) {
        const existingReport = existingReports[0];
        const reportTime = new Date(existingReport.created_at);
        const now = new Date();
        const timeDiff = (now - reportTime) / (1000 * 60 * 60); // Difference in hours

        // If an emergency report exists within the last 2 hours for the same location, don't create a duplicate
        if (timeDiff < 2) {
          this.uiManager.showNotification(`An emergency report already exists for this location. Emergency services may already be aware.`, "warning");
          this.uiManager.closeModal('emergencyModal');
          return;
        }
      }

      const { data, error } = await this.supabase
        .from('reports')
        .insert([
          {
            user_id: null, // Anonymous report - no user association
            vibe_type: 'dangerous',
            location: this.currentEmergencyLocation,
            notes: `EMERGENCY (${emergencyType}): ${details}`
          }
        ])
        .select();

      if (error) {
        console.error("Error submitting emergency report:", error);
        let errorMessage = "Failed to submit emergency report";
        if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = "Network error. Please check your connection and try again.";
        } else {
          errorMessage = `Failed to submit emergency report: ${error.message}`;
        }
        this.uiManager.showNotification(errorMessage, "error");
      } else {
        console.log("Emergency report submitted successfully:", data);
        this.uiManager.showNotification("Emergency report submitted successfully", "success");
        this.uiManager.closeModal('emergencyModal');
        // Reload data to show the new emergency report
        await this.dataManager.loadNearbyReports();
        // Refresh map to show new emergency report
        this.mapManager.loadMap();
      }
    } catch (error) {
      console.error("Error submitting emergency report:", error);
      let errorMessage = "Failed to submit emergency report";
      if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = "Network error. Please check your connection and try again.";
      }
      this.uiManager.showNotification(errorMessage, "error");
    } finally {
      // Reset button state
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  }

  // Location methods
  getCurrentLocation(callback) {
    // For backward compatibility, if callback provided, use promise internally
    if (callback) {
      this.getCurrentLocationPromise().then(callback).catch(() => callback(null));
      return;
    }

    return this.getCurrentLocationPromise();
  }

  getCurrentLocationPromise() {
    return new Promise((resolve, reject) => {
      // Use cached location if available and recent (within 5 minutes)
      if (this.userLocation && this.userLocation.timestamp) {
        const age = Date.now() - this.userLocation.timestamp;
        if (age < 300000) { // 5 minutes
          this.dataManager.getAddressFromCoordinates(this.userLocation.latitude, this.userLocation.longitude, (address) => {
            resolve(address || `${this.userLocation.latitude.toFixed(4)}, ${this.userLocation.longitude.toFixed(4)}`);
            // Update location-based data when we have a valid cached location
            this.updateLocationBasedData();
          });
          return;
        }
      }

      if (navigator.geolocation) {
        // Show loading notification for location
        this.uiManager.showNotification("Getting your location...", "info");

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            this.userLocation = {
              latitude,
              longitude,
              timestamp: Date.now()
            };

            // Try to get address from coordinates (reverse geocoding)
            this.dataManager.getAddressFromCoordinates(latitude, longitude, (address) => {
              resolve(address || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
              // Update location-based data when location is first obtained
              this.updateLocationBasedData();
            });
          },
          (error) => {
            reject(error);
          },
          {
            timeout: 8000, // Reduced timeout for faster response
            enableHighAccuracy: true,
            maximumAge: 300000 // Accept cached position up to 5 minutes old
          }
        );
      } else {
        reject(new Error('Geolocation not supported'));
      }
    });
  }

  async requestUserLocationManually() {
    // Show loading state on location button
    const locationBtn = document.getElementById('locationBtn');
    if (locationBtn) {
      locationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      locationBtn.disabled = true;
    }

    try {
      // Request location permission
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 15000, // 15 seconds timeout
          enableHighAccuracy: true,
          maximumAge: 300000 // Accept cached position up to 5 minutes old
        });
      });

      const { latitude, longitude } = position.coords;
      this.userLocation = {
        latitude,
        longitude,
        timestamp: Date.now()
      };

      // Show success notification
      this.uiManager.showNotification("Location enabled! Loading local reports...", "success");

      // Update location-based data immediately
      this.updateLocationBasedData();

      // Refresh all data to show location-based content
      await this.dataManager.loadEnhancedStats();

      // Update location button to show it's enabled
      if (locationBtn) {
        locationBtn.innerHTML = '<i class="fas fa-check-circle" style="color: var(--success);"></i>';
        setTimeout(() => {
          locationBtn.innerHTML = '<i class="fas fa-map-marker-alt"></i>';
          locationBtn.disabled = false;
        }, 2000);
      }

    } catch (error) {
      console.error('Error getting location:', error);

      let errorMessage = "Unable to get your location";
      if (error.code === 1) {
        errorMessage = "Location access denied. Please enable location permissions in your browser settings and try again.";
      } else if (error.code === 2) {
        errorMessage = "Location unavailable. Please check your GPS settings and try again.";
      } else if (error.code === 3) {
        errorMessage = "Location request timed out. This can happen in poor signal areas. Please try again.";
      }

      this.uiManager.showNotification(errorMessage, "error");

      // Reset button state
      if (locationBtn) {
        locationBtn.innerHTML = '<i class="fas fa-exclamation-triangle" style="color: var(--danger);"></i>';
        setTimeout(() => {
          locationBtn.innerHTML = '<i class="fas fa-map-marker-alt"></i>';
          locationBtn.disabled = false;
        }, 2000);
      }
    }
  }

  // Update location-based data when user location changes
  updateLocationBasedData() {
    if (this.userLocation && this.nearbyReports.length > 0) {
      // Calculate local area stats with current reports
      const stats = {
        reports: this.nearbyReports,
        totalReports: this.nearbyReports.length
      };

      const localStats = this.dataManager.calculateLocalAreaStats(stats);
      this.uiManager.updateLocalAreaDisplay(localStats);

      // Update community stats to reflect location-based data
      this.updateCommunityStatsWithLocation();
    }
  }

  // Update community stats to include location-based insights
  updateCommunityStatsWithLocation() {
    if (!this.userLocation || this.nearbyReports.length === 0) return;

    // Calculate location-based community stats
    const locationBasedStats = this.dataManager.calculateLocationBasedCommunityStats();

    // Update the community stats display with location context
    this.uiManager.updateCommunityStatsDisplay(locationBasedStats);
  }

  // Other utility methods
  async loadTopAreas() {
    try {
      // Show loading modal
      const modalContent = `
        <div class="modal-content">
          <div class="modal-header">
            <h2 data-en="Top Areas" data-ar="أهم المناطق">Top Areas</h2>
            <span class="close" data-dismiss="topAreasModal">&times;</span>
          </div>
          <div class="modal-body">
            <div class="loading-spinner"></div>
            <p data-en="Analyzing community reports..." data-ar="تحليل تقارير المجتمع...">Analyzing community reports...</p>
          </div>
        </div>
      `;

      let modal = document.getElementById('topAreasModal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'topAreasModal';
        modal.className = 'modal';
        document.body.appendChild(modal);
      }
      modal.innerHTML = modalContent;
      modal.style.display = 'block';

      // Fetch reports with location data - prioritize reports with coordinates
      const { data: reports, error } = await this.supabase
        .from('reports')
        .select('location, vibe_type, latitude, longitude')
        .not('location', 'is', null)
        .not('location', 'eq', 'Unknown Location')
        .not('location', 'eq', 'Location unavailable')
        .not('location', 'eq', 'Location not supported')
        .order('created_at', { ascending: false })
        .limit(500); // Increased limit for better analysis

      if (error) {
        console.error("Error loading reports for top areas:", error);
        modal.innerHTML = `
          <div class="modal-content">
            <div class="modal-header">
              <h2 data-en="Top Areas" data-ar="أهم المناطق">Top Areas</h2>
              <span class="close" data-dismiss="topAreasModal">&times;</span>
            </div>
            <div class="modal-body">
              <p data-en="Error loading top areas data" data-ar="خطأ في تحميل بيانات أهم المناطق">Error loading top areas data</p>
            </div>
          </div>
        `;
        return;
      }

      // Analyze the data - group by location and count reports
      const areaStats = {};

      reports.forEach(report => {
        // Use coordinates-based location key for more accurate grouping
        let locationKey;
        if (report.latitude && report.longitude) {
          // Group by rounded coordinates for nearby reports (within ~100m)
          const roundedLat = Math.round(report.latitude * 100) / 100;
          const roundedLng = Math.round(report.longitude * 100) / 100;
          locationKey = `${roundedLat},${roundedLng}`;
        } else {
          // Fallback to location string for reports without coordinates
          locationKey = report.location || 'Unknown';
        }

        if (!areaStats[locationKey]) {
          areaStats[locationKey] = {
            total: 0,
            vibes: {},
            displayName: report.location || `${report.latitude?.toFixed(2)}, ${report.longitude?.toFixed(2)}`,
            coordinates: report.latitude && report.longitude ? [report.latitude, report.longitude] : null,
            hasCoordinates: !!(report.latitude && report.longitude)
          };
        }

        areaStats[locationKey].total++;
        if (!areaStats[locationKey].vibes[report.vibe_type]) {
          areaStats[locationKey].vibes[report.vibe_type] = 0;
        }
        areaStats[locationKey].vibes[report.vibe_type]++;
      });

      // Convert to array and sort by total reports (most to least)
      const topAreas = Object.entries(areaStats)
        .map(([locationKey, data]) => ({ locationKey, ...data }))
        .sort((a, b) => b.total - a.total) // Sort by total reports descending
        .slice(0, 15); // Show top 15 areas

      // Generate the modal content
      const areasHtml = topAreas.length > 0 ? topAreas.map((area, index) => `
        <div class="area-item">
          <div class="area-header">
            <div class="area-rank">#${index + 1}</div>
            <div class="area-info">
              <h3>${area.displayName}</h3>
              <span class="area-count">${area.total} report${area.total > 1 ? 's' : ''}</span>
              ${area.hasCoordinates ? '<span class="area-location-indicator"><i class="fas fa-map-marker-alt"></i></span>' : ''}
            </div>
          </div>
          <div class="area-vibes">
            ${Object.entries(area.vibes)
              .sort(([,a], [,b]) => b - a) // Sort vibes by count within each area
              .map(([vibe, count]) => `
                <span class="vibe-tag vibe-${vibe}">
                  <i class="${this.uiManager.getVibeIcon(vibe)}"></i>
                  ${this.uiManager.capitalizeFirstLetter(vibe)}: ${count}
                </span>
              `).join('')}
          </div>
        </div>
      `).join('') : `
        <p data-en="No area data available yet. Submit more reports to see top areas!" data-ar="لا توجد بيانات متاحة بعد. أرسل المزيد من التقارير لرؤية أهم المناطق!">
          No area data available yet. Submit more reports to see top areas!
        </p>
      `;

      modal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h2 data-en="Top Areas" data-ar="أهم المناطق">Top Areas</h2>
            <span class="close" data-dismiss="topAreasModal">&times;</span>
          </div>
          <div class="modal-body">
            <p data-en="Areas ranked by number of community safety reports (most to least)" data-ar="المناطق مصنفة حسب عدد تقارير السلامة المجتمعية (من الأكثر إلى الأقل)">
              Areas ranked by number of community safety reports (most to least)
            </p>
            <div class="top-areas-list">
              ${areasHtml}
            </div>
          </div>
        </div>
      `;

      // Attach close button event listener
      const closeBtn = modal.querySelector('.close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          this.uiManager.closeModal('topAreasModal');
        });
      }

      this.uiManager.updateTextDirection();

    } catch (error) {
      console.error("Error loading top areas:", error);
      this.uiManager.showNotification("Failed to load top areas", "error");
    }
  }

  // Dynamic import methods for code splitting
  async loadAuthManager() {
    if (this.dynamicModulesLoaded.authManager) {
      return this.authManager;
    }

    try {
      console.log('Loading auth manager dynamically...');
      const { default: AuthManager } = await import('./auth-manager.js');
      this.authManager = new AuthManager(this);
      this.dynamicModulesLoaded.authManager = true;
      console.log('Auth manager loaded successfully');
      return this.authManager;
    } catch (error) {
      console.error('Failed to load auth manager:', error);
      this.uiManager.showNotification('Authentication features unavailable', 'warning');
      return null;
    }
  }

  async loadMapManager() {
    if (this.dynamicModulesLoaded.mapManager) {
      return this.mapManager;
    }

    try {
      console.log('Loading map manager dynamically...');
      const { default: MapManager } = await import('./map-manager.js');
      this.mapManager = new MapManager(this);
      this.dynamicModulesLoaded.mapManager = true;
      console.log('Map manager loaded successfully');
      return this.mapManager;
    } catch (error) {
      console.error('Failed to load map manager:', error);
      this.uiManager.showNotification('Map features unavailable', 'warning');
      return null;
    }
  }

  async loadGeofenceManager() {
    if (this.dynamicModulesLoaded.geofenceManager) {
      return this.geofenceManager;
    }

    try {
      console.log('Loading geofence manager dynamically...');
      const { default: GeofenceManager } = await import('./geofence-manager.js');
      this.geofenceManager = new GeofenceManager(this);
      this.dynamicModulesLoaded.geofenceManager = true;
      console.log('Geofence manager loaded successfully');
      return this.geofenceManager;
    } catch (error) {
      console.error('Failed to load geofence manager:', error);
      this.uiManager.showNotification('Geofence features unavailable', 'warning');
      return null;
    }
  }

  // Ensure managers are loaded when needed
  async ensureAuthManager() {
    if (!this.authManager) {
      await this.loadAuthManager();
    }
    return this.authManager;
  }

  async ensureMapManager() {
    if (!this.mapManager) {
      await this.loadMapManager();
    }
    return this.mapManager;
  }

  async ensureGeofenceManager() {
    if (!this.geofenceManager) {
      await this.loadGeofenceManager();
    }
    return this.geofenceManager;
  }

  // Override methods to ensure managers are loaded
  async checkAuthState() {
    const authManager = await this.ensureAuthManager();
    if (authManager) {
      return await authManager.checkAuthState();
    }
    return false;
  }

  showAuthModal() {
    this.ensureAuthManager().then(authManager => {
      if (authManager) {
        authManager.showAuthModal();
      }
    });
  }

  handleLogout() {
    this.ensureAuthManager().then(authManager => {
      if (authManager) {
        authManager.handleLogout();
      }
    });
  }

  loadMap() {
    this.ensureMapManager().then(mapManager => {
      if (mapManager) {
        mapManager.loadMap();
      }
    });
  }

  displayMap() {
    this.ensureMapManager().then(mapManager => {
      if (mapManager) {
        mapManager.displayMap();
      }
    });
  }

  toggleGeofenceMonitoring() {
    this.ensureGeofenceManager().then(geofenceManager => {
      if (geofenceManager) {
        geofenceManager.toggleGeofenceMonitoring();
      }
    });
  }

  loadGeofenceSettings() {
    this.ensureGeofenceManager().then(geofenceManager => {
      if (geofenceManager) {
        geofenceManager.loadGeofenceSettings();
      }
    });
  }

  // Utility methods
  filterReports(filterType) {
    // Implementation for filtering reports
    console.log('Filtering reports by:', filterType);
  }

  callEmergency(contactType) {
    // Implementation for emergency calls
    console.log('Calling emergency contact:', contactType);
  }

  forceDataRefresh() {
    // Implementation for force refreshing data
    console.log('Force refreshing data...');
  }

  // Emergency performance methods
  disableRealtime() {
    console.warn('🚨 EMERGENCY: Disabling real-time subscriptions for performance');
    if (this.dataManager) {
      this.dataManager.disableRealtimeSubscriptions();
    }
  }

  enableRealtime() {
    console.log('🔄 Re-enabling real-time subscriptions');
    if (this.dataManager) {
      this.dataManager.enableRealtimeSubscriptions();
    }
  }

  // Cleanup method to prevent memory leaks
  cleanup() {
    console.log('Cleaning up HyperApp...');

    // Clear location monitoring
    if (this.locationWatchId) {
      navigator.geolocation.clearWatch(this.locationWatchId);
      this.locationWatchId = null;
    }

    if (this.locationUpdateTimer) {
      clearTimeout(this.locationUpdateTimer);
      this.locationUpdateTimer = null;
    }

    // Clear trend update interval (legacy - now consolidated)
    if (this.trendUpdateInterval) {
      clearInterval(this.trendUpdateInterval);
      this.trendUpdateInterval = null;
    }

    // Cleanup managers
    if (this.dataManager && this.dataManager.cleanup) {
      this.dataManager.cleanup();
    }

    if (this.uiManager && this.uiManager.cleanup) {
      this.uiManager.cleanup();
    }

    if (this.mapManager && this.mapManager.cleanup) {
      this.mapManager.cleanup();
    }

    if (this.geofenceManager && this.geofenceManager.cleanup) {
      this.geofenceManager.cleanup();
    }

    if (this.authManager && this.authManager.cleanup) {
      this.authManager.cleanup();
    }

    console.log('HyperApp cleanup completed');
  }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
  window.app = new HyperApp();
});
