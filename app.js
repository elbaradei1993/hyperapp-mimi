// HyperApp Mini App - Complete Fixed Implementation with Error Handling
class HyperApp {
  constructor() {
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
      this.supabase = window.supabaseClientManager.initialize(this.config.supabaseUrl, this.config.supabaseKey);
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

  async init() {
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
    // Clear local data to ensure fresh load
    this.nearbyReports = [];
    this.userReports = [];
    // Clear any cached weather data
    localStorage.removeItem('hyperapp_weather_data');
    localStorage.removeItem('hyperapp_weather_time');
    console.log('App initialization - forcing fresh data load');

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

    // Validate database schema on startup
    await this.validateDatabaseSchema();

    // Critical: Request location immediately and wait for it before loading data
    await this.requestLocationImmediately();

    // Load all data synchronously after location is available
    await this.loadAllDataImmediately();

    // Set up real-time subscriptions after initial data load
    this.setupRealtimeSubscriptions();

    // Initialize geofence functionality
    if (this.isAuthenticated) {
      await this.loadGeofenceSettings();
    }

  // Initialize service worker for offline authentication
    this.initializeServiceWorker();

    // Make app instance globally available
    window.hyperApp = this;
    window.app = this; // Fix for HTML onclick handlers
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

      // Use the existing Supabase client instance
      const supabaseClient = this.supabase;

      const { data: reports, error } = await supabaseClient
        .from('reports')
        .select(`id, vibe_type, location, notes, created_at, upvotes, downvotes, latitude, longitude, votes (user_id, vote_type)`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        // Enhanced error handling with specific messages and fallback mechanisms
        let errorMessage = this.currentLanguage === 'en' ? 'Error loading reports.' : 'خطأ في تحميل التقارير.';
        let retryText = this.currentLanguage === 'en' ? 'Tap to retry' : 'اضغط لإعادة المحاولة';

        // Handle different error types with appropriate fallbacks
        if (error.message?.includes('network') || error.message?.includes('fetch') || error.name === 'TypeError') {
          errorMessage = this.currentLanguage === 'en' ? 'Network error. Check your connection.' : 'خطأ في الشبكة. تحقق من اتصالك.';
        } else if (error.message?.includes('permission') || error.message?.includes('auth')) {
          errorMessage = this.currentLanguage === 'en' ? 'Authentication error. Please login again.' : 'خطأ في المصادقة. يرجى تسجيل الدخول مرة أخرى.';
          // Trigger auth modal for auth errors
          setTimeout(() => this.showAuthModal(), 1000);
        } else if (error.message?.includes('timeout')) {
          errorMessage = this.currentLanguage === 'en' ? 'Request timed out. Please try again.' : 'انتهت مهلة الطلب. يرجى المحاولة مرة أخرى.';
        } else if (error.code === 'PGRST301' || error.message?.includes('rate limit')) {
          errorMessage = this.currentLanguage === 'en' ? 'Service temporarily unavailable. Please try again later.' : 'الخدمة غير متاحة مؤقتاً. يرجى المحاولة لاحقاً.';
        }

        // Retry on network errors with exponential backoff
        if (retryCount < maxRetries && (error.message?.includes('network') || error.message?.includes('fetch') || error.name === 'TypeError' || error.message?.includes('timeout'))) {
          const delay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Exponential backoff, max 5s

          setTimeout(() => this.loadNearbyReports(retryCount + 1, force), delay);
          return;
        }

        // Show error with retry option and fallback message
        const fallbackMessage = this.currentLanguage === 'en'
          ? 'Some features may be limited until connection is restored.'
          : 'قد تكون بعض الميزات محدودة حتى يتم استعادة الاتصال.';

        container.innerHTML = `
          <div class="no-data error-state" onclick="window.app.loadNearbyReports()">
            <i class="fas fa-exclamation-triangle"></i>
            <p>${errorMessage}</p>
            <p style="font-size: 12px; color: var(--text-muted); margin: 8px 0 0 0;">${fallbackMessage}</p>
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
      const userReportsContainer = document.getElementById('userReports');
      if (!userReportsContainer) {
        console.warn('User reports container not found');
        return;
      }

      userReportsContainer.innerHTML = '<div class="loading-spinner"></div>';

      const { data: reports, error } = await this.supabase
        .from('reports')
        .select('*')
        .eq('user_id', this.userData.id)
        .order('created_at', { ascending: false });

      if (error) {
        userReportsContainer.innerHTML =
          '<div class="no-data" data-en="Error loading your reports" data-ar="خطأ في تحميل تقاريرك">Error loading your reports</div>';
        return;
      }

      this.userReports = reports;
      this.displayUserReports();
    } catch (error) {
      console.error('Error in loadUserReports:', error);
      const userReportsContainer = document.getElementById('userReports');
      if (userReportsContainer) {
        userReportsContainer.innerHTML =
          '<div class="no-data" data-en="Error loading your reports" data-ar="خطأ في تحميل تقاريرك">Error loading your reports</div>';
      }
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
    if (!submitBtn) {
      console.error("Submit button not found");
      return;
    }

    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Submitting...';
    submitBtn.disabled = true;

    console.log("Starting report submission process...");

    try {
      const notes = document.getElementById('reportNotes').value;
      console.log("Report data:", {
        selectedVibe: this.selectedVibe,
        location: this.currentReportLocation,
        notes: notes,
        hasLocation: !!this.userLocation
      });

      // Check for existing report with same vibe and location
      console.log("Checking for existing reports...");
      const { data: existingReports, error: checkError } = await this.supabase
        .from('reports')
        .select('id, created_at')
        .eq('vibe_type', this.selectedVibe)
        .eq('location', this.currentReportLocation)
        .order('created_at', { ascending: false })
        .limit(1);

      if (checkError) {
        console.error("Error checking for existing reports:", checkError);
        throw new Error("Failed to check for existing reports");
      }

      if (existingReports && existingReports.length > 0) {
        const existingReport = existingReports[0];
        const reportTime = new Date(existingReport.created_at);
        const now = new Date();
        const timeDiff = (now - reportTime) / (1000 * 60); // Difference in minutes

        console.log("Found existing report from", timeDiff, "minutes ago");

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
        console.log("Adding coordinates:", this.userLocation.latitude, this.userLocation.longitude);
      }

      console.log("Submitting report data:", reportData);

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
        return;
      }

      console.log("Report submitted successfully:", data);

      // Add the new report to nearbyReports immediately for instant UI feedback
      const newReport = {
        ...reportData,
        id: data[0].id,
        created_at: data[0].created_at,
        upvotes: 0,
        downvotes: 0,
        user_vote: null
      };

      console.log("Adding new report to local data:", newReport);
      this.nearbyReports.unshift(newReport);

      // Also add to mapReports if it has coordinates (for immediate map display)
      if (newReport.latitude && newReport.longitude) {
        if (!this.mapReports) {
          this.mapReports = [];
        }
        this.mapReports.unshift(newReport);
        console.log("Added to map reports for immediate display");
      }

      this.showNotification("Report submitted successfully", "success");
      this.closeModal('reportModal');

      // Update UI immediately
      console.log("Updating UI with new report...");
      this.displayNearbyReports();

      // Refresh map markers immediately if map is loaded
      if (this.map) {
        console.log("Refreshing map markers...");
        this.addReportMarkers();
        this.addHeatMapLayer();
      }

      // Reload data in background to ensure consistency
      console.log("Reloading data in background...");
      this.loadNearbyReports();

    } catch (error) {
      console.error("Error submitting report:", error);
      let errorMessage = "Failed to submit report";
      if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = "Network error. Please check your connection and try again.";
      } else if (error.code === 1) {
        errorMessage = "Location access denied. Please enable location permissions in your browser settings.";
      } else if (error.code === 2) {
        errorMessage = "Location unavailable. Please check your GPS settings and try again.";
      } else if (error.code === 3) {
        errorMessage = "Location request timed out. This can happen in poor signal areas. Please try again.";
      } else {
        errorMessage = `Error: ${error.message}`;
      }
      this.showNotification(errorMessage, "error");
    } finally {
      // Reset button state
      console.log("Resetting button state...");
      if (submitBtn) {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
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
      this.showNotification("Unable to get your location. Please try again.", "error");
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
        this.showNotification("Please provide emergency details", "error");
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
          this.showNotification(`An emergency report already exists for this location. Emergency services may already be aware.`, "warning");
          this.closeModal('emergencyModal');
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
        this.showNotification(errorMessage, "error");
      } else {
        console.log("Emergency report submitted successfully:", data);
        this.showNotification("Emergency report submitted successfully", "success");
        this.closeModal('emergencyModal');
        // Reload data to show the new emergency report
        await this.loadNearbyReports();
        // Refresh map to show new emergency report
        this.loadMap();
      }
    } catch (error) {
      console.error("Error submitting emergency report:", error);
      let errorMessage = "Failed to submit emergency report";
      if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = "Network error. Please check your connection and try again.";
      }
      this.showNotification(errorMessage, "error");
    } finally {
      // Reset button state
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  }

  showView(viewId) {
    document.querySelectorAll('.view').forEach(view => {
      view.classList.remove('active');
    });
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.remove('active');
    });

    document.getElementById(viewId + 'View').classList.add('active');
    document.querySelector(`.nav-btn[data-view="${viewId}"]`).classList.add('active');

    if (viewId === 'map') {
      this.loadMap();
    } else if (viewId === 'reports') {
      this.loadUserDashboard();
    } else if (viewId === 'settings') {
      // Attach logout button event listener when settings view is shown
      const logoutBtn = document.getElementById('logoutBtn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', this.handleLogout);
      }
    }
  }

  async loadUserDashboard() {
    if (!this.isAuthenticated || !this.userData) {
      this.showAuthModal();
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
      const reputation = await this.calculateUserReputation(this.userData.id);

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
      const badges = await this.getUserBadges(this.userData.id);

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
      const reputation = await this.calculateUserReputation(this.userData.id);

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
    } catch (error) {
      console.error("Error loading user recent activity:", error);
      activityContainer.innerHTML = '<div class="no-data">Error loading recent activity</div>';
    }
  }

  async loadMapReports() {
    try {
      console.log('Loading all reports with coordinates for map display...');

      // Load all reports that have coordinates (not limited to recent ones)
      const { data: reports, error } = await this.supabase
        .from('reports')
        .select(`id, vibe_type, location, notes, created_at, upvotes, downvotes, latitude, longitude, votes (user_id, vote_type)`)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading map reports:', error);
        this.mapReports = [];
        return;
      }

      // Process reports data with user votes
      this.mapReports = reports.map(report => {
        const userVote = report.votes && report.votes.length > 0 ?
          report.votes.find(v => v.user_id === this.userData?.id)?.vote_type : null;

        return { ...report, user_vote: userVote };
      });

      console.log(`Loaded ${this.mapReports.length} reports with coordinates for map display`);

    } catch (error) {
      console.error('Error in loadMapReports:', error);
      this.mapReports = [];
    }
  }

  async loadMap() {
    const mapContainer = document.getElementById('mapContainer');

    // Clear any existing map
    if (this.map) {
      this.map.remove();
      this.map = null;
    }

    // Load all reports with coordinates for the map
    await this.loadMapReports();

    const hasReports = this.mapReports && this.mapReports.length > 0;

    mapContainer.innerHTML = `
      <div class="map-header">
        <h3 data-en="Community Vibe Map" data-ar="خريطة حالة المجتمع">Community Vibe Map</h3>
        <p data-en="${hasReports ? `Showing ${this.mapReports.length} reports with locations` : 'Map of your area - submit reports to see them here'}" data-ar="${hasReports ? `عرض ${this.mapReports.length} تقارير بمواقع` : 'خريطة منطقتك - أرسل التقارير لرؤيتها هنا'}">
          ${hasReports ? `Showing ${this.mapReports.length} reports with locations` : 'Map of your area - submit reports to see them here'}
        </p>
      </div>
      <div id="leaflet-map" style="height: 320px; width: 100%; position: relative;"></div>
      <div class="map-controls">
        <button id="myLocationBtn" class="map-control-btn" title="Go to my location">
          <i class="fas fa-crosshairs"></i>
        </button>
      </div>
      <div class="map-legend">
        <div class="legend-item"><i class="fas fa-users" style="color: orange;"></i> <span data-en="Crowded" data-ar="مزدحم">Crowded</span></div>
        <div class="legend-item"><i class="fas fa-volume-up" style="color: var(--secondary);"></i> <span data-en="Noisy" data-ar="صاخب">Noisy</span></div>
        <div class="legend-item"><i class="fas fa-glass-cheers" style="color: var(--success);"></i> <span data-en="Festive" data-ar="احتفالي">Festive</span></div>
        <div class="legend-item"><i class="fas fa-peace" style="color: var(--info);"></i> <span data-en="Calm" data-ar="هادئ">Calm</span></div>
        <div class="legend-item"><i class="fas fa-eye-slash" style="color: var(--warning);"></i> <span data-en="Suspicious" data-ar="مشبوه">Suspicious</span></div>
        <div class="legend-item"><i class="fas fa-exclamation-triangle" style="color: var(--danger);"></i> <span data-en="Dangerous" data-ar="خطير">Dangerous</span></div>
      </div>
    `;

    // Initialize Leaflet map
    this.initializeLeafletMap();

    this.updateTextDirection();
  }

  initializeLeafletMap() {
    const mapElement = document.getElementById('leaflet-map');
    if (!mapElement) return;

    // Default center (can be user's location if available)
    let initialCenter = [30.0444, 31.2357]; // Cairo, Egypt as default
    let initialZoom = 10;

    // If we already have user location, use it
    if (this.userLocation) {
      initialCenter = [this.userLocation.latitude, this.userLocation.longitude];
      initialZoom = 13;
    }

    // Create map
    this.map = L.map('leaflet-map').setView(initialCenter, initialZoom);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(this.map);

    // Wait for map to be fully loaded before adding markers
    this.map.whenReady(() => {
      console.log('Map ready, initializing layers...');

      // Add heat map layer first (behind markers)
      this.addHeatMapLayer();

      // Add markers for reports
      this.addReportMarkers();

      // Try to get user's location for better centering if not already available
      if (navigator.geolocation && !this.userLocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            this.userLocation = { latitude, longitude };
            this.map.setView([latitude, longitude], 13);
          },
          (error) => {
            console.error('Error getting location for map centering:', error);
          },
          { timeout: 10000, enableHighAccuracy: true }
        );
      }
    });

    // Add event listener for My Location button
    const myLocationBtn = document.getElementById('myLocationBtn');
    if (myLocationBtn) {
      myLocationBtn.addEventListener('click', () => {
        this.centerMapOnUserLocation();
      });
    }
  }

  async centerMapOnUserLocation() {
    if (!navigator.geolocation) {
      this.showNotification("Geolocation is not supported by this browser", "error");
      return;
    }

    // Show loading state
    const locationBtn = document.getElementById('myLocationBtn');
    if (locationBtn) {
      locationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      locationBtn.disabled = true;
    }

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 20000, // Increased timeout to 20 seconds
          enableHighAccuracy: true,
          maximumAge: 300000 // Accept cached position up to 5 minutes old
        });
      });

      const { latitude, longitude } = position.coords;
      this.userLocation = { latitude, longitude };

      if (this.map) {
        this.map.setView([latitude, longitude], 15);
        this.showNotification("Centered on your location", "success");
      }
    } catch (error) {
      console.error('Error getting location:', error);
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
      if (locationBtn) {
        locationBtn.innerHTML = '<i class="fas fa-crosshairs"></i>';
        locationBtn.disabled = false;
      }
    }
  }

  addReportMarkers() {
    if (!this.map || !this.mapReports) return;

    console.log('Adding report markers for', this.mapReports.length, 'reports');

    // Clear existing markers (but keep user location marker)
    this.map.eachLayer((layer) => {
      if (layer instanceof L.Marker && !layer.options.isUserLocation) {
        this.map.removeLayer(layer);
      }
    });

    // Add markers for each report
    this.mapReports.forEach(report => {
      // Use actual coordinates if available, otherwise cluster around user location or default area
      let lat, lng;
      if (report.latitude && report.longitude) {
        lat = report.latitude;
        lng = report.longitude;
      } else {
        // For reports without coordinates, place them in a cluster around the user's location
        // or default to Cairo area if no user location
        let baseLat, baseLng;
        if (this.userLocation) {
          baseLat = this.userLocation.latitude;
          baseLng = this.userLocation.longitude;
        } else {
          baseLat = 30.0444; // Cairo, Egypt
          baseLng = 31.2357;
        }

        // Create a more intelligent clustering - group reports without coordinates
        // Use report ID to create consistent positioning for the same report
        const hash = report.id % 100; // Simple hash based on report ID
        const angle = (hash / 100) * 2 * Math.PI; // Distribute in a circle
        const radius = 0.005 + (hash % 3) * 0.002; // Vary radius slightly

        lat = baseLat + Math.sin(angle) * radius;
        lng = baseLng + Math.cos(angle) * radius;
      }

      // Create custom icon based on vibe type - use Unicode symbols instead of FontAwesome for better compatibility
      const iconSymbol = this.getVibeSymbol(report.vibe_type);
      const iconHtml = `<div style="
        background: ${this.getVibeColor(report.vibe_type)};
        border: 2px solid white;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 3px 6px rgba(0,0,0,0.4);
        ${!report.latitude || !report.longitude ? 'opacity: 0.7;' : ''}
        animation: pulse 2s infinite ease-in-out;
        font-size: 16px;
        font-weight: bold;
        color: white;
      ">
        ${iconSymbol}
      </div>`;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      // Create marker
      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(this.map);

      // Add popup with report details
      const locationText = this.formatLocationForDisplay(report);
      const popupContent = `
        <div style="font-family: 'Segoe UI', sans-serif; max-width: 200px;">
          <h4 style="margin: 0 0 8px 0; color: ${this.getVibeColor(report.vibe_type)};">
            ${this.capitalizeFirstLetter(report.vibe_type)}
          </h4>
          <p style="margin: 4px 0;"><strong>Location:</strong> ${locationText}</p>
          ${report.notes ? `<p style="margin: 4px 0;"><strong>Notes:</strong> ${report.notes}</p>` : ''}
          <p style="margin: 4px 0; font-size: 12px; color: #666;">
            ${this.formatTimeAgo(report.created_at)}
          </p>
          ${!report.latitude || !report.longitude ?
            '<p style="margin: 4px 0; font-size: 11px; color: #888; font-style: italic;">Approximate location</p>' : ''}
          <div style="margin-top: 8px;">
            <span style="color: #28a745;">👍 ${report.upvotes || 0}</span>
            <span style="color: #dc3545; margin-left: 8px;">👎 ${report.downvotes || 0}</span>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
    });

    // Add user location marker if available
    this.addUserLocationMarker();

    // Ensure markers are visible by refreshing the map
    if (this.map) {
      this.map.invalidateSize();
    }

    console.log('Report markers added successfully');
  }

  addHeatMapLayer() {
    if (!this.map || !this.mapReports) {
      console.log('Heat map: No map or reports available');
      return;
    }

    console.log('Adding heat map layer with', this.mapReports.length, 'points');

    // Remove existing heat map layer
    this.map.eachLayer((layer) => {
      if (layer.options && layer.options.isHeatMap) {
        this.map.removeLayer(layer);
      }
    });

    // Prepare heat map data from reports
    const heatData = [];
    const maxIntensity = 1.0; // Maximum intensity for heat map

    this.mapReports.forEach((report, index) => {
      // Use actual coordinates if available, otherwise use clustered positions
      let lat, lng;
      if (report.latitude && report.longitude) {
        lat = parseFloat(report.latitude);
        lng = parseFloat(report.longitude);
        console.log(`Report ${index}: Using real coordinates ${lat}, ${lng} for ${report.vibe_type}`);
      } else {
        // For reports without coordinates, use clustered positions around user location
        let baseLat, baseLng;
        if (this.userLocation) {
          baseLat = this.userLocation.latitude;
          baseLng = this.userLocation.longitude;
        } else {
          baseLat = 30.0444; // Cairo, Egypt
          baseLng = 31.2357;
        }

        const hash = report.id % 100;
        const angle = (hash / 100) * 2 * Math.PI;
        const radius = 0.005 + (hash % 3) * 0.002;

        lat = baseLat + Math.sin(angle) * radius;
        lng = baseLng + Math.cos(angle) * radius;
        console.log(`Report ${index}: Using clustered coordinates ${lat}, ${lng} for ${report.vibe_type}`);
      }

      // Calculate intensity based on report type and votes
      let intensity = 0.3; // Base intensity

      // Higher intensity for dangerous reports
      if (report.vibe_type === 'dangerous') {
        intensity = 0.9;
      } else if (report.vibe_type === 'suspicious') {
        intensity = 0.7;
      } else if (report.vibe_type === 'crowded') {
        intensity = 0.5;
      } else if (report.vibe_type === 'noisy') {
        intensity = 0.4;
      } else {
        intensity = 0.2; // calm, festive
      }

      // Boost intensity based on upvotes (community validation)
      const upvotes = report.upvotes || 0;
      const downvotes = report.downvotes || 0;
      const netVotes = upvotes - downvotes;

      if (netVotes > 5) {
        intensity += 0.2; // Highly validated reports
      } else if (netVotes > 2) {
        intensity += 0.1; // Moderately validated
      } else if (netVotes < -2) {
        intensity -= 0.1; // Controversial reports
      }

      // Ensure intensity stays within bounds
      intensity = Math.max(0.1, Math.min(maxIntensity, intensity));

      // Add to heat data: [lat, lng, intensity]
      heatData.push([lat, lng, intensity]);
    });

    console.log('Heat map data prepared:', heatData.length, 'points');
    console.log('Sample heat data points:', heatData.slice(0, 3));

    // Create heat map layer if we have data
    if (heatData.length > 0) {
      try {
        this.heatLayer = L.heatLayer(heatData, {
          radius: 30, // Increased radius for better visibility
          blur: 20,   // Increased blur for smoother appearance
          maxZoom: 18,
          max: maxIntensity,
          gradient: {
            0.1: '#00ff00', // Green for low intensity (safe areas)
            0.3: '#80ff00', // Light green
            0.5: '#ffff00', // Yellow for moderate
            0.7: '#ff8000', // Orange for higher
            0.9: '#ff0000'  // Red for high danger
          },
          isHeatMap: true // Custom property to identify heat map layer
        }).addTo(this.map);

        console.log('Heat map layer added successfully');
        console.log('Heat layer object:', this.heatLayer);

        // Add heat map to layer control if it exists
        if (this.layerControl) {
          this.layerControl.addOverlay(this.heatLayer, 'Safety Heat Map');
        }

        // Force a map refresh to ensure the layer is visible
        setTimeout(() => {
          if (this.map) {
            this.map.invalidateSize();
            console.log('Map invalidated to refresh heat layer');
          }
        }, 100);

      } catch (error) {
        console.error('Error creating heat map layer:', error);
      }
    } else {
      console.log('No heat map data available');
    }
  }

  addUserLocationMarker() {
    if (!this.map || !this.userLocation) {
      console.log('Cannot add user location marker: map or userLocation not available');
      return;
    }

    console.log('Adding user location marker at:', this.userLocation.latitude, this.userLocation.longitude);

    // Remove existing user location marker
    this.map.eachLayer((layer) => {
      if (layer instanceof L.Marker && layer.options.isUserLocation) {
        this.map.removeLayer(layer);
      }
    });

    // Create user location marker with distinct icon
    const userIconHtml = `
      <div style="
        background: linear-gradient(135deg, #3B82F6, #1D4ED8);
        border: 3px solid white;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 8px rgba(0,0,0,0.4);
        animation: pulse-user 2s infinite ease-in-out;
      ">
        <i class="fas fa-user" style="color: white; font-size: 16px;"></i>
      </div>
    `;

    const userIcon = L.divIcon({
      html: userIconHtml,
      className: 'user-location-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    // Create marker
    const userMarker = L.marker([this.userLocation.latitude, this.userLocation.longitude], {
      icon: userIcon,
      isUserLocation: true
    }).addTo(this.map);

    // Add popup with user location info
    const popupContent = `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 200px; text-align: center;">
        <h4 style="margin: 0 0 8px 0; color: #3B82F6;">
          <i class="fas fa-user-circle"></i> Your Location
        </h4>
        <p style="margin: 4px 0;">
          <strong>Coordinates:</strong><br>
          ${this.userLocation.latitude.toFixed(6)}, ${this.userLocation.longitude.toFixed(6)}
        </p>
        <p style="margin: 4px 0; font-size: 12px; color: #666;">
          Last updated: ${new Date(this.userLocation.timestamp || Date.now()).toLocaleTimeString()}
        </p>
      </div>
    `;

    userMarker.bindPopup(popupContent);

    // Center map on user location if this is the first time adding the marker
    if (!this.userLocationMarkerAdded) {
      this.map.setView([this.userLocation.latitude, this.userLocation.longitude], 15);
      this.userLocationMarkerAdded = true;
    }

    console.log('User location marker added successfully');
  }

  getVibeColor(vibeType) {
    const colors = {
      crowded: '#FFA500',
      noisy: '#FF6B35',
      festive: '#28A745',
      calm: '#17A2B8',
      suspicious: '#FFC107',
      dangerous: '#DC3545'
    };
    return colors[vibeType] || '#6C757D';
  }

  displayMap() {
    // This will be called when the map view is shown
    this.loadMap();
  }

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
                  <i class="${this.getVibeIcon(vibe)}"></i>
                  ${this.capitalizeFirstLetter(vibe)}: ${count}
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
          this.closeModal('topAreasModal');
        });
      }

      this.updateTextDirection();

    } catch (error) {
      console.error("Error loading top areas:", error);
      this.showNotification("Failed to load top areas", "error");
    }
  }

  toggleLanguage() {
    this.currentLanguage = this.currentLanguage === 'en' ? 'ar' : 'en';
    document.getElementById('currentLanguage').textContent = this.currentLanguage.toUpperCase();
    this.applyLanguage(this.currentLanguage);

    // Save language preference if user is authenticated
    if (this.isAuthenticated) {
      this.supabase
        .from('users')
        .update({ language: this.currentLanguage })
        .eq('user_id', this.userData.id)
        .then(({ error }) => {
          if (error) {
            console.error("Error updating language preference:", error);
          }
        });
    }
  }

  changeLanguage(lang) {
    this.currentLanguage = lang;
    document.getElementById('currentLanguage').textContent = this.currentLanguage.toUpperCase();
    this.applyLanguage(this.currentLanguage);

    // Save language preference if user is authenticated
    if (this.isAuthenticated) {
      this.supabase
        .from('users')
        .update({ language: this.currentLanguage })
        .eq('user_id', this.userData.id)
        .then(({ error }) => {
          if (error) {
            console.error("Error updating language preference:", error);
          }
        });
    }
  }

  applyLanguage(lang) {
    document.querySelectorAll('[data-en]').forEach(element => {
      if (element.getAttribute('data-' + lang)) {
        element.textContent = element.getAttribute('data-' + lang);
      }
    });

    this.updateTextDirection();
  }

  updateTextDirection() {
    document.body.setAttribute('dir', this.currentLanguage === 'ar' ? 'rtl' : 'ltr');
  }

  showNotification(message, type = 'info', duration = 3000) {
    // Remove any existing notification
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
      existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;

    // Add icon based on notification type
    let icon = 'fas fa-info-circle';
    if (type === 'success') icon = 'fas fa-check-circle';
    if (type === 'error') icon = 'fas fa-exclamation-circle';
    if (type === 'warning') icon = 'fas fa-exclamation-triangle';

    notification.innerHTML = `
      <i class="${icon}"></i>
      <span>${message}</span>
    `;

    document.body.appendChild(notification);

    // Auto-remove after specified duration
    const timeoutId = setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, duration);

    // Store timeout ID for potential clearing
    notification.dataset.timeoutId = timeoutId;

    // Add hover behavior to pause auto-dismiss
    notification.addEventListener('mouseenter', () => {
      clearTimeout(timeoutId);
    });

    notification.addEventListener('mouseleave', () => {
      const newTimeoutId = setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, duration);
      notification.dataset.timeoutId = newTimeoutId;
    });

    return notification;
  }

  closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
  }

      getVibeIcon(vibeType) {
        const icons = {
          crowded: 'fas fa-users',
          noisy: 'fas fa-volume-up',
          festive: 'fas fa-glass-cheers',
          calm: 'fas fa-peace',
          suspicious: 'fas fa-eye-slash',
          dangerous: 'fas fa-exclamation-triangle'
        };

        return icons[vibeType] || 'fas fa-question-circle';
      }

      getVibeSymbol(vibeType) {
        const symbols = {
          crowded: '👥',
          noisy: '🔊',
          festive: '🎉',
          calm: '😌',
          suspicious: '👀',
          dangerous: '⚠️'
        };

        return symbols[vibeType] || '❓';
      }

  getVibeArabicName(vibeType) {
    const names = {
      crowded: 'مزدحم',
      noisy: 'صاخب',
      festive: 'احتفالي',
      calm: 'هادئ',
      suspicious: 'مشبوه',
      dangerous: 'خطير'
    };

    return names[vibeType] || vibeType;
  }

  capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  formatTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now - time) / 1000);

    if (diffInSeconds < 60) {
      return this.currentLanguage === 'en' ? 'Just now' : 'الآن';
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return this.currentLanguage === 'en'
        ? `${diffInMinutes} min ago`
        : `منذ ${diffInMinutes} دقيقة`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return this.currentLanguage === 'en'
        ? `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
        : `منذ ${diffInHours} ساعة`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    return this.currentLanguage === 'en'
      ? `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
      : `منذ ${diffInDays} يوم`;
  }

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
          this.getAddressFromCoordinates(this.userLocation.latitude, this.userLocation.longitude, (address) => {
            resolve(address || `${this.userLocation.latitude.toFixed(4)}, ${this.userLocation.longitude.toFixed(4)}`);
            // Update location-based data
          });
          return;
        }
      }

      // Get fresh location
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          this.userLocation = {
            latitude,
            longitude,
            timestamp: Date.now()
          };

          // Get address from coordinates
          this.getAddressFromCoordinates(latitude, longitude, (address) => {
            resolve(address || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          reject(error);
        },
        {
          timeout: 20000, // 20 second timeout
          enableHighAccuracy: true,
          maximumAge: 300000 // Accept cached position up to 5 minutes old
        }
      );
    });
  }

  async getAddressFromCoordinates(lat, lng, callback) {
    try {
      // Use Nominatim (OpenStreetMap) for reverse geocoding - free and no API key required
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
        headers: {
          'User-Agent': 'HyperApp/1.0' // Required by Nominatim
        }
      });

      if (!response.ok) {
        throw new Error('Reverse geocoding failed');
      }

      const data = await response.json();

      if (data && data.display_name) {
        // Extract meaningful location parts
        const address = data.address || {};
        const locationParts = [];

        // Build a readable location string
        if (address.neighbourhood) locationParts.push(address.neighbourhood);
        if (address.suburb) locationParts.push(address.suburb);
        if (address.city) locationParts.push(address.city);
        if (address.state) locationParts.push(address.state);

        const readableLocation = locationParts.length > 0 ? locationParts.join(', ') : data.display_name.split(',')[0];

        callback(readableLocation);
      } else {
        callback(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      callback(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }
  }

  formatLocationForDisplay(report) {
    if (report.latitude && report.longitude) {
      return `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`;
    }
    return report.location || 'Unknown location';
  }

  async requestUserLocation() {
    return this.getCurrentLocationPromise();
  }

  async requestLocationImmediately() {
    try {
      console.log('Requesting location immediately...');
      const location = await this.requestUserLocation();
      console.log('Location obtained:', location);
      return location;
    } catch (error) {
      console.error('Failed to get location immediately:', error);
      // Don't throw - allow app to continue without location
      return null;
    }
  }

  async loadAllDataImmediately() {
    try {
      console.log('Loading all data immediately...');

      // Load essential data first
      await this.fastInitialLoad();

      // Then load advanced features
      await this.loadAdvancedFeatures();

      console.log('All data loaded successfully');
    } catch (error) {
      console.error('Error loading all data:', error);
      // Show error but don't crash the app
      this.showNotification('Some data may not be available', 'warning');
    }
  }

  setupRealtimeSubscriptions() {
    if (!this.supabase) {
      console.warn('Supabase not available for real-time subscriptions');
      return;
    }

    console.log('Setting up real-time subscriptions...');

    // Subscribe to reports changes
    this.reportsSubscription = this.supabase
      .channel('reports_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'reports'
      }, (payload) => {
        console.log('Reports change detected:', payload);
        this.handleReportsChange(payload);
      })
      .subscribe((status) => {
        console.log('Reports subscription status:', status);
        if (status === 'SUBSCRIBED') {
          this.updateConnectionStatus(true);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          this.updateConnectionStatus(false);
          // Attempt to reconnect after delay
          setTimeout(() => this.setupRealtimeSubscriptions(), 5000);
        }
      });

    // Subscribe to votes changes
    this.votesSubscription = this.supabase
      .channel('votes_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'votes'
      }, (payload) => {
        console.log('Votes change detected:', payload);
        this.handleVotesChange(payload);
      })
      .subscribe();



    console.log('Real-time subscriptions set up');
  }

  handleReportsChange(payload) {
    console.log('Handling reports change:', payload.eventType, payload.new, payload.old);

    if (payload.eventType === 'INSERT') {
      // New report added
      const newReport = payload.new;
      // Add user_vote property for consistency
      newReport.user_vote = null;

      // Add to nearby reports if not already present
      const existingIndex = this.nearbyReports.findIndex(r => r.id === newReport.id);
      if (existingIndex === -1) {
        this.nearbyReports.unshift(newReport); // Add to beginning
        this.displayNearbyReports();

        // Also add to mapReports if it has coordinates
        if (newReport.latitude && newReport.longitude) {
          if (!this.mapReports) {
            this.mapReports = [];
          }
          this.mapReports.unshift(newReport);

          // Refresh map markers immediately if map is loaded
          if (this.map) {
            this.addReportMarkers();
            this.addHeatMapLayer();
          }
        }

        this.showNotification('New report added nearby', 'info');
      }
    } else if (payload.eventType === 'UPDATE') {
      // Report updated
      const updatedReport = payload.new;
      const existingIndex = this.nearbyReports.findIndex(r => r.id === updatedReport.id);

      if (existingIndex !== -1) {
        // Update the report while preserving user_vote
        const userVote = this.nearbyReports[existingIndex].user_vote;
        this.nearbyReports[existingIndex] = { ...updatedReport, user_vote: userVote };
        this.displayNearbyReports();

        // Also update in mapReports if it exists there
        if (this.mapReports) {
          const mapIndex = this.mapReports.findIndex(r => r.id === updatedReport.id);
          if (mapIndex !== -1) {
            this.mapReports[mapIndex] = { ...updatedReport, user_vote: userVote };
            // Refresh map markers if map is loaded
            if (this.map) {
              this.addReportMarkers();
              this.addHeatMapLayer();
            }
          }
        }
      }
    } else if (payload.eventType === 'DELETE') {
      // Report deleted
      const deletedId = payload.old.id;
      this.nearbyReports = this.nearbyReports.filter(r => r.id !== deletedId);
      this.displayNearbyReports();

      // Also remove from mapReports if it exists there
      if (this.mapReports) {
        this.mapReports = this.mapReports.filter(r => r.id !== deletedId);
        // Refresh map markers if map is loaded
        if (this.map) {
          this.addReportMarkers();
          this.addHeatMapLayer();
        }
      }
    }
  }

  handleVotesChange(payload) {
    console.log('Handling votes change:', payload.eventType, payload.new, payload.old);

    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
      // Vote changed - refresh nearby reports to get updated vote counts
      this.loadNearbyReports();
    }
  }



  setupEventListeners() {
    // Navigation buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const viewId = e.currentTarget.getAttribute('data-view');
        this.showView(viewId);
      });
    });

    // Report modal
    const reportBtn = document.getElementById('reportBtn');
    if (reportBtn) {
      reportBtn.addEventListener('click', () => this.showReportModal());
    }

    // Emergency report modal
    const emergencyBtn = document.getElementById('emergencyBtn');
    if (emergencyBtn) {
      emergencyBtn.addEventListener('click', () => this.showEmergencyReport());
    }

    // Submit report
    const submitReportBtn = document.getElementById('submitReportBtn');
    if (submitReportBtn) {
      submitReportBtn.addEventListener('click', () => this.submitReport());
    }

    // Submit emergency report
    const submitEmergencyBtn = document.getElementById('submitEmergencyBtn');
    if (submitEmergencyBtn) {
      submitEmergencyBtn.addEventListener('click', () => this.submitEmergencyReport());
    }

    // Vibe selection
    document.querySelectorAll('.vibe-option').forEach(option => {
      option.addEventListener('click', (e) => {
        const vibe = e.currentTarget.getAttribute('data-vibe');
        this.selectVibe(vibe);
      });
    });



    // Vote buttons (delegated event listener)
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('upvote-btn') || e.target.classList.contains('downvote-btn')) {
        e.preventDefault();
        const reportId = parseInt(e.target.getAttribute('data-report-id'));
        const voteType = e.target.getAttribute('data-vote-type');
        this.voteReport(reportId, voteType);
      }
    });

    // Modal close buttons
    document.querySelectorAll('.close').forEach(closeBtn => {
      closeBtn.addEventListener('click', (e) => {
        const modalId = e.currentTarget.getAttribute('data-dismiss');
        this.closeModal(modalId);
      });
    });

    // Click outside modal to close
    window.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
      }
    });

    // Language toggle
    const languageBtn = document.getElementById('languageBtn');
    if (languageBtn) {
      languageBtn.addEventListener('click', () => this.toggleLanguage());
    }

    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => this.toggleTheme());
    }

    // Top areas button
    const topAreasBtn = document.getElementById('topAreasBtn');
    if (topAreasBtn) {
      topAreasBtn.addEventListener('click', () => this.loadTopAreas());
    }

    // Settings language selector
    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect) {
      languageSelect.addEventListener('change', (e) => {
        this.changeLanguage(e.target.value);
      });
    }

    // Settings theme selector
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) {
      themeSelect.addEventListener('change', (e) => {
        this.changeTheme(e.target.value);
      });
    }

    console.log('Event listeners set up');
  }

  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('hyperapp-theme', newTheme);

    // Update theme toggle icon
    const themeIcon = document.querySelector('#themeToggle i');
    if (themeIcon) {
      themeIcon.className = newTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    }

    // Update theme selector in settings
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) {
      themeSelect.value = newTheme;
    }

    this.showNotification(`Theme changed to ${newTheme}`, 'success');
  }

  changeTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('hyperapp-theme', theme);

    // Update theme toggle icon
    const themeIcon = document.querySelector('#themeToggle i');
    if (themeIcon) {
      themeIcon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    }

    this.showNotification(`Theme changed to ${theme}`, 'success');
  }

  async calculateUserReputation(userId) {
    try {
      // Get user's reports and their vote counts
      const { data: reports, error } = await this.supabase
        .from('reports')
        .select('upvotes, downvotes')
        .eq('user_id', userId);

      if (error) {
        console.error("Error calculating reputation:", error);
        return 0;
      }

      // Calculate reputation based on net upvotes
      let reputation = 0;
      reports.forEach(report => {
        const netVotes = (report.upvotes || 0) - (report.downvotes || 0);
        reputation += Math.max(0, netVotes); // Only positive contributions count
      });

      // Add base reputation for active users
      reputation += Math.min(10, reports.length); // Up to 10 points for activity

      return Math.max(0, reputation);
    } catch (error) {
      console.error("Error calculating user reputation:", error);
      return 0;
    }
  }

  async updateUserReputation() {
    if (!this.isAuthenticated || !this.userData) return;

    try {
      const reputation = await this.calculateUserReputation(this.userData.id);

      // Update local user data
      this.userData.reputation = reputation;

      // Update database
      const { error } = await this.supabase
        .from('users')
        .update({ reputation: reputation })
        .eq('user_id', this.userData.id);

      if (error) {
        console.error("Error updating user reputation:", error);
      }

      // Update UI
      document.getElementById('userReputation').textContent = reputation;
      document.getElementById('settingsReputation').textContent = reputation;
    } catch (error) {
      console.error("Error updating user reputation:", error);
    }
  }

  async getUserBadges(userId) {
    const badges = [];
    const reputation = await this.calculateUserReputation(userId);

    // Reputation-based badges
    if (reputation >= 100) {
      badges.push({
        name: 'Community Leader',
        description: 'Earned 100+ reputation points',
        icon: 'fas fa-crown',
        color: 'linear-gradient(135deg, #FFD700, #FFA500)'
      });
    } else if (reputation >= 50) {
      badges.push({
        name: 'Trusted Reporter',
        description: 'Earned 50+ reputation points',
        icon: 'fas fa-shield-alt',
        color: 'linear-gradient(135deg, #4CAF50, #45A049)'
      });
    } else if (reputation >= 10) {
      badges.push({
        name: 'Active Contributor',
        description: 'Earned 10+ reputation points',
        icon: 'fas fa-star',
        color: 'linear-gradient(135deg, #2196F3, #1976D2)'
      });
    }

    // Activity-based badges
    try {
      const { data: reports, error } = await this.supabase
        .from('reports')
        .select('id')
        .eq('user_id', userId);

      if (!error && reports) {
        const reportCount = reports.length;

        if (reportCount >= 50) {
          badges.push({
            name: 'Safety Guardian',
            description: 'Submitted 50+ safety reports',
            icon: 'fas fa-user-shield',
            color: 'linear-gradient(135deg, #9C27B0, #7B1FA2)'
          });
        } else if (reportCount >= 20) {
          badges.push({
            name: 'Community Watch',
            description: 'Submitted 20+ safety reports',
            icon: 'fas fa-eye',
            color: 'linear-gradient(135deg, #FF5722, #D84315)'
          });
        } else if (reportCount >= 5) {
          badges.push({
            name: 'First Responder',
            description: 'Submitted 5+ safety reports',
            icon: 'fas fa-plus-circle',
            color: 'linear-gradient(135deg, #009688, #00796B)'
          });
        }
      }
    } catch (error) {
      console.error("Error checking user badges:", error);
    }

    return badges;
  }

  async checkBadgeUnlocks() {
    if (!this.isAuthenticated || !this.userData) return;

    try {
      const currentBadges = await this.getUserBadges(this.userData.id);
      const badgeNames = currentBadges.map(badge => badge.name);

      // Check if user unlocked new badges
      const savedBadges = JSON.parse(localStorage.getItem('hyperapp-badges') || '[]');
      const newBadges = badgeNames.filter(name => !savedBadges.includes(name));

      if (newBadges.length > 0) {
        // Show badge notification
        newBadges.forEach(badgeName => {
          const badge = currentBadges.find(b => b.name === badgeName);
          if (badge) {
            this.showBadgeNotification(badge);
          }
        });

        // Save updated badges
        localStorage.setItem('hyperapp-badges', JSON.stringify(badgeNames));
      }
    } catch (error) {
      console.error("Error checking badge unlocks:", error);
    }
  }

  showBadgeNotification(badge) {
    const notification = document.createElement('div');
    notification.className = 'badge-notification';

    notification.innerHTML = `
      <div class="badge-notification-content">
        <div class="badge-icon" style="background: ${badge.color};">
          <i class="${badge.icon}"></i>
        </div>
        <div class="badge-info">
          <h4>Badge Unlocked!</h4>
          <p><strong>${badge.name}</strong></p>
          <p>${badge.description}</p>
        </div>
        <button class="badge-close">&times;</button>
      </div>
    `;

    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 5000);

    // Close button
    const closeBtn = notification.querySelector('.badge-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        notification.remove();
      });
    }
  }

  async loadEnhancedStats() {
    try {
      // Get comprehensive stats
      const stats = await this.getCommunityStats();

      // Update stats display
      this.updateStatsDisplay(stats);

      // Render charts if Chart.js is available
      if (typeof Chart !== 'undefined') {
        this.renderStatsCharts(stats);
      }
    } catch (error) {
      console.error("Error loading enhanced stats:", error);
    }
  }

  async getCommunityStats() {
    try {
      // Get reports from last 24 hours
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { data: recentReports, error: reportsError } = await this.supabase
        .from('reports')
        .select('vibe_type, created_at')
        .gte('created_at', yesterday.toISOString());

      if (reportsError) {
        console.error("Error fetching recent reports:", reportsError);
        return this.getDefaultStats();
      }

      // Calculate stats
      const vibeCounts = {};
      recentReports.forEach(report => {
        vibeCounts[report.vibe_type] = (vibeCounts[report.vibe_type] || 0) + 1;
      });

      const totalReports = recentReports.length;

      return {
        totalReports,
        vibeCounts,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error("Error getting community stats:", error);
      return this.getDefaultStats();
    }
  }

  getDefaultStats() {
    return {
      totalReports: 0,
      vibeCounts: {},
      timestamp: new Date().toISOString()
    };
  }

  updateStatsDisplay(stats) {
    // Update basic stats
    const totalReportsEl = document.getElementById('totalReports');
    if (totalReportsEl) {
      totalReportsEl.textContent = stats.totalReports;
    }

    // Update vibe breakdown
    Object.keys(stats.vibeCounts).forEach(vibeType => {
      const count = stats.vibeCounts[vibeType];
      const element = document.getElementById(`${vibeType}Reports`);
      if (element) {
        element.textContent = count;
      }
    });
  }

  renderStatsCharts(stats) {
    // Vibe distribution chart
    const vibeChartCanvas = document.getElementById('vibeChart');
    if (vibeChartCanvas) {
      const ctx = vibeChartCanvas.getContext('2d');

      const vibeLabels = Object.keys(stats.vibeCounts);
      const vibeData = Object.values(stats.vibeCounts);

      new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: vibeLabels.map(v => this.capitalizeFirstLetter(v)),
          datasets: [{
            data: vibeData,
            backgroundColor: vibeLabels.map(v => this.getVibeColor(v)),
            borderWidth: 2,
            borderColor: 'rgba(255, 255, 255, 0.8)'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                padding: 20,
                usePointStyle: true
              }
            }
          }
        }
      });
    }
  }

  updateStats() {
    // Update basic stats display
    this.loadEnhancedStats();
  }

  setupWeatherAlerts() {
    // Set up weather alert checking every 30 minutes
    this.weatherAlertInterval = setInterval(() => {
      this.checkWeatherAlerts();
    }, 30 * 60 * 1000); // 30 minutes

    // Initial check
    this.checkWeatherAlerts();
  }

  async checkWeatherAlerts() {
    if (!this.userLocation) return;

    try {
      const weatherData = await this.loadWeatherData();
      if (!weatherData) return;

      // Check for severe weather conditions
      const alerts = [];

      // High temperature alert
      if (weatherData.temperature > 35) {
        alerts.push({
          type: 'heat',
          message: `High temperature alert: ${weatherData.temperature}°C`,
          priority: 'high'
        });
      }

      // Low temperature alert
      if (weatherData.temperature < 5) {
        alerts.push({
          type: 'cold',
          message: `Cold weather alert: ${weatherData.temperature}°C`,
          priority: 'medium'
        });
      }

      // Heavy rain alert
      if (weatherData.precipitation > 10) {
        alerts.push({
          type: 'rain',
          message: `Heavy rain expected: ${weatherData.precipitation}mm`,
          priority: 'high'
        });
      }

      // High wind alert
      if (weatherData.windSpeed > 30) {
        alerts.push({
          type: 'wind',
          message: `Strong winds: ${weatherData.windSpeed} km/h`,
          priority: 'medium'
        });
      }

      // Send alerts
      alerts.forEach(alert => {
        this.sendWeatherAlert(alert);
      });

    } catch (error) {
      console.error("Error checking weather alerts:", error);
    }
  }

  sendWeatherAlert(alert) {
    // Check if we've already sent this alert recently (within last hour)
    const alertKey = `${alert.type}_${Date.now()}`;
    const lastAlert = localStorage.getItem(`weather_alert_${alert.type}`);

    if (lastAlert) {
      const lastAlertTime = parseInt(lastAlert);
      const hourAgo = Date.now() - (60 * 60 * 1000);

      if (lastAlertTime > hourAgo) {
        return; // Already sent this type of alert recently
      }
    }

    // Send notification
    this.showNotification(alert.message, alert.priority === 'high' ? 'warning' : 'info', 10000);

    // Store alert timestamp
    localStorage.setItem(`weather_alert_${alert.type}`, Date.now().toString());
  }

  async loadWeatherData() {
    if (!this.userLocation) {
      console.log('No user location available for weather data');
      return null;
    }

    try {
      // Check cache first (weather data is valid for 30 minutes)
      const cached = localStorage.getItem('hyperapp_weather_data');
      const cacheTime = localStorage.getItem('hyperapp_weather_time');

      if (cached && cacheTime) {
        const age = Date.now() - parseInt(cacheTime);
        if (age < 30 * 60 * 1000) { // 30 minutes
          return JSON.parse(cached);
        }
      }

      // Fetch fresh weather data
      const apiKey = this.config.weatherApiKey;
      const { latitude, longitude } = this.userLocation;

      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`
      );

      // Handle rate limiting (429 errors)
      if (response.status === 429) {
        console.warn('Weather API rate limited, using fallback');
        this.updateWeatherAlert(null);
        return;
      }

      if (!response.ok) {
        throw new Error('Weather API request failed');
      }

      const data = await response.json();

      // Process weather data
      const weatherData = {
        temperature: Math.round(data.main.temp),
        humidity: data.main.humidity,
        windSpeed: Math.round(data.wind.speed * 3.6), // Convert m/s to km/h
        precipitation: data.rain ? data.rain['1h'] || 0 : 0,
        description: data.weather[0].description,
        icon: data.weather[0].icon,
        location: data.name,
        timestamp: Date.now()
      };

      // Cache the data
      localStorage.setItem('hyperapp_weather_data', JSON.stringify(weatherData));
      localStorage.setItem('hyperapp_weather_time', Date.now().toString());

      // Update weather display
      this.updateWeatherDisplay(weatherData);

      return weatherData;

    } catch (error) {
      console.error('Error loading weather data:', error);
      this.showNotification('Weather data unavailable', 'info');
      return null;
    }
  }

  updateWeatherDisplay(weatherData) {
    const weatherContainer = document.getElementById('weatherContainer');
    if (!weatherContainer) return;

    weatherContainer.innerHTML = `
      <div class="weather-info">
        <div class="weather-main">
          <i class="fas fa-thermometer-half"></i>
          <span class="temperature">${weatherData.temperature}°C</span>
        </div>
        <div class="weather-details">
          <div class="weather-item">
            <i class="fas fa-tint"></i>
            <span>${weatherData.humidity}% humidity</span>
          </div>
          <div class="weather-item">
            <i class="fas fa-wind"></i>
            <span>${weatherData.windSpeed} km/h</span>
          </div>
          <div class="weather-item">
            <i class="fas fa-cloud-rain"></i>
            <span>${weatherData.precipitation}mm rain</span>
          </div>
        </div>
        <div class="weather-description">
          <i class="fas fa-info-circle"></i>
          <span>${this.capitalizeFirstLetter(weatherData.description)}</span>
        </div>
      </div>
    `;

    this.updateTextDirection();
  }

  updateSafetyHub() {
    // Update safety tips based on current conditions
    this.generateDynamicSafetyTips();
  }

  generateDynamicSafetyTips() {
    const tips = [];

    // Location-based tips
    if (this.userLocation) {
      tips.push({
        icon: 'fas fa-map-marker-alt',
        text: 'Stay aware of your surroundings and report any suspicious activity.',
        priority: 'high'
      });
    }

    // Time-based tips
    const hour = new Date().getHours();
    if (hour >= 22 || hour <= 5) {
      tips.push({
        icon: 'fas fa-moon',
        text: 'Night time: Stick to well-lit areas and travel with others when possible.',
        priority: 'high'
      });
    }

    // Weather-based tips (if weather data available)
    const weatherData = JSON.parse(localStorage.getItem('hyperapp_weather_data') || 'null');
    if (weatherData) {
      if (weatherData.temperature > 35) {
        tips.push({
          icon: 'fas fa-sun',
          text: 'Hot weather: Stay hydrated and avoid prolonged sun exposure.',
          priority: 'medium'
        });
      }

      if (weatherData.precipitation > 5) {
        tips.push({
          icon: 'fas fa-umbrella',
          text: 'Rain expected: Drive carefully and watch for slippery conditions.',
          priority: 'medium'
        });
      }
    }

    // Community-based tips
    if (this.nearbyReports && this.nearbyReports.length > 0) {
      const dangerousReports = this.nearbyReports.filter(r => r.vibe_type === 'dangerous');
      if (dangerousReports.length > 0) {
        tips.push({
          icon: 'fas fa-exclamation-triangle',
          text: `Recent safety reports in your area. Stay vigilant and check recent reports.`,
          priority: 'high'
        });
      }
    }

    // Default tips if no dynamic ones
    if (tips.length === 0) {
      tips.push(
        {
          icon: 'fas fa-users',
          text: 'Connect with your community - report and stay informed about local safety.',
          priority: 'medium'
        },
        {
          icon: 'fas fa-mobile-alt',
          text: 'Keep your phone charged and emergency contacts readily available.',
          priority: 'medium'
        },
        {
          icon: 'fas fa-shield-alt',
          text: 'Trust your instincts - if something feels unsafe, remove yourself from the situation.',
          priority: 'high'
        }
      );
    }

    // Update UI
    this.displaySafetyTips(tips);
  }

  displaySafetyTips(tips) {
    const tipsContainer = document.getElementById('safetyTips');
    if (!tipsContainer) return;

    tipsContainer.innerHTML = tips.map(tip => `
      <div class="safety-tip ${tip.priority}">
        <i class="${tip.icon}"></i>
        <span>${tip.text}</span>
      </div>
    `).join('');

    this.updateTextDirection();
  }

  updateCommunityInsights() {
    // Update community mood and activity insights
    this.loadEnhancedStats();
  }

  // Geofence methods
  async loadGeofenceSettings() {
    if (!this.isAuthenticated) return;

    try {
      const { data, error } = await this.supabase
        .from('user_geofence_settings')
        .select('*')
        .eq('user_id', this.userData.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error("Error loading geofence settings:", error);
        return;
      }

      if (data) {
        this.geofenceSettings = data;
        this.geofenceEnabled = data.enabled;
      } else {
        // Create default settings
        this.geofenceSettings = {
          user_id: this.userData.id,
          enabled: false,
          radius: 500, // 500 meters
          notify_on_enter: true,
          notify_on_exit: false
        };
      }

      // Load user's geofences
      await this.loadUserGeofences();

    } catch (error) {
      console.error("Error loading geofence settings:", error);
    }
  }

  async loadUserGeofences() {
    if (!this.isAuthenticated) return;

    try {
      const { data, error } = await this.supabase
        .from('user_geofences')
        .select('*')
        .eq('user_id', this.userData.id);

      if (error) {
        console.error("Error loading user geofences:", error);
        return;
      }

      this.geofences = data || [];
    } catch (error) {
      console.error("Error loading user geofences:", error);
    }
  }

  async saveGeofenceSettings() {
    if (!this.isAuthenticated || !this.geofenceSettings) return;

    try {
      const { error } = await this.supabase
        .from('user_geofence_settings')
        .upsert(this.geofenceSettings);

      if (error) {
        console.error("Error saving geofence settings:", error);
        this.showNotification("Failed to save geofence settings", "error");
      } else {
        this.showNotification("Geofence settings saved", "success");
      }
    } catch (error) {
      console.error("Error saving geofence settings:", error);
      this.showNotification("Failed to save geofence settings", "error");
    }
  }

  toggleGeofenceMonitoring() {
    this.geofenceEnabled = !this.geofenceEnabled;

    if (this.geofenceEnabled) {
      this.startGeofenceMonitoring();
    } else {
      this.stopGeofenceMonitoring();
    }
  }

  startGeofenceMonitoring() {
    if (!navigator.geolocation) {
      this.showNotification("Geolocation not supported for geofencing", "error");
      return;
    }

    // Start watching position
    this.geofenceWatchId = navigator.geolocation.watchPosition(
      (position) => {
        this.handleGeofencePositionUpdate(position);
      },
      (error) => {
        console.error("Geofence position error:", error);
        this.showNotification("Geofence monitoring failed", "error");
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 60000
      }
    );

    this.showNotification("Geofence monitoring started", "success");
  }

  stopGeofenceMonitoring() {
    if (this.geofenceWatchId) {
      navigator.geolocation.clearWatch(this.geofenceWatchId);
      this.geofenceWatchId = null;
    }

    this.currentGeofenceZones.clear();
    this.showNotification("Geofence monitoring stopped", "info");
  }

  handleGeofencePositionUpdate(position) {
    const { latitude, longitude } = position.coords;
    const userPoint = [latitude, longitude];

    // Check each geofence
    this.geofences.forEach(geofence => {
      const distance = this.calculateDistance(
        userPoint[0], userPoint[1],
        geofence.latitude, geofence.longitude
      );

      const isInside = distance <= (geofence.radius / 1000); // Convert radius to km
      const wasInside = this.currentGeofenceZones.has(geofence.id);

      if (isInside && !wasInside) {
        // Entered geofence
        this.currentGeofenceZones.add(geofence.id);
        this.handleGeofenceEvent('enter', geofence);
      } else if (!isInside && wasInside) {
        // Exited geofence
        this.currentGeofenceZones.delete(geofence.id);
        this.handleGeofenceEvent('exit', geofence);
      }
    });
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  handleGeofenceEvent(eventType, geofence) {
    if (!this.geofenceSettings) return;

    const shouldNotify = eventType === 'enter' ? this.geofenceSettings.notify_on_enter : this.geofenceSettings.notify_on_exit;

    if (shouldNotify) {
      const message = this.getGeofenceNotificationMessage(eventType, geofence);
      const priority = this.getGeofenceNotificationPriority(geofence);

      this.sendGeofenceNotification(message, priority);
    }
  }

  getGeofenceNotificationMessage(eventType, geofence) {
    const action = eventType === 'enter' ? 'entered' : 'left';
    return `You have ${action} the ${geofence.name} area`;
  }

  getGeofenceNotificationPriority(geofence) {
    // Could be based on geofence type or user preferences
    return 'info';
  }

  sendGeofenceNotification(message, priority = 'info') {
    this.showNotification(message, priority);
  }



  // Utility method to classify geofence zones
  classifyGeofenceZones() {
    // This could classify geofences by type (home, work, dangerous areas, etc.)
    // For now, just return basic classification
    return this.geofences.map(geofence => ({
      ...geofence,
      type: geofence.name.toLowerCase().includes('home') ? 'home' :
            geofence.name.toLowerCase().includes('work') ? 'work' : 'custom'
    }));
  }

  checkGeofenceStatus() {
    // Check if geofencing is working properly
    if (this.geofenceEnabled && !this.geofenceWatchId) {
      console.warn("Geofencing enabled but not monitoring");
      this.startGeofenceMonitoring();
    }
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing HyperApp...');
  window.hyperApp = new HyperApp();
});
