// HyperApp Mini App - Complete Fixed Implementation with Error Handling
    class HyperApp {
      constructor() {
        // Configuration - Move these to environment variables in production
        this.config = {
          supabaseUrl: 'https://nqwejzbayquzsvcodunl.supabase.co',
          supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xd2VqemJheXF1enN2Y29kdW5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzOTA0MjAsImV4cCI6MjA3Mzk2NjQyMH0.01yifC-tfEbBHD5u315fpb_nZrqMZCbma_UrMacMb78',
          weatherApiKey: 'bd5e378503939ddaee76f12ad7a97608',
          // Feature flags for graceful degradation
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

        // Make app instance globally available
        window.hyperApp = this;
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
            this.showNotification("Report submitted successfully", "success");
            this.closeModal('reportModal');
            // Reload data to show the new report
            await this.loadNearbyReports();
            // Refresh map to show new report
            this.loadMap();
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
            this.showNotification(errorMessage, "error");
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

      loadMap() {
        const mapContainer = document.getElementById('mapContainer');
        const hasReports = this.nearbyReports && this.nearbyReports.length > 0;

        // Clear any existing map
        if (this.map) {
          this.map.remove();
          this.map = null;
        }

        mapContainer.innerHTML = `
          <div class="map-header">
            <h3 data-en="Community Vibe Map" data-ar="خريطة حالة المجتمع">Community Vibe Map</h3>
            <p data-en="${hasReports ? 'Showing recent reports in your area' : 'Map of your area - submit reports to see them here'}" data-ar="${hasReports ? 'عرض التقارير الحديثة في منطقتك' : 'خريطة منطقتك - أرسل التقارير لرؤيتها هنا'}">
              ${hasReports ? 'Showing recent reports in your area' : 'Map of your area - submit reports to see them here'}
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
        if (!this.map || !this.nearbyReports) return;

        console.log('Adding report markers for', this.nearbyReports.length, 'reports');

        // Clear existing markers (but keep user location marker)
        this.map.eachLayer((layer) => {
          if (layer instanceof L.Marker && !layer.options.isUserLocation) {
            this.map.removeLayer(layer);
          }
        });

        // Add markers for each report
        this.nearbyReports.forEach(report => {
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
        if (!this.map || !this.nearbyReports) {
          console.log('Heat map: No map or reports available');
          return;
        }

        console.log('Adding heat map layer with', this.nearbyReports.length, 'points');

        // Remove existing heat map layer
        this.map.eachLayer((layer) => {
          if (layer.options && layer.options.isHeatMap) {
            this.map.removeLayer(layer);
          }
        });

        // Prepare heat map data from reports
        const heatData = [];
        const maxIntensity = 1.0; // Maximum intensity for heat map

        this.nearbyReports.forEach((report, index) => {
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
                // Update location-based data when we have a valid cached location
                this.updateLocationBasedData();
              });
              return;
            }
          }

          if (navigator.geolocation) {
            // Show loading notification for location
            this.showNotification("Getting your location...", "info");

            navigator.geolocation.getCurrentPosition(
              (position) => {
                const { latitude, longitude } = position.coords;
                this.userLocation = {
                  latitude,
                  longitude,
                  timestamp: Date.now()
                };

                // Try to get address from coordinates (reverse geocoding)
                this.getAddressFromCoordinates(latitude, longitude, (address) => {
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
                maximumAge: 300000 // Accept cached position up to 5 minutes
              }
            );
          } else {
            reject(new Error('Geolocation not supported'));
          }
        });
      }

      getAddressFromCoordinates(lat, lng, callback) {
        // Use Nominatim (OpenStreetMap) for reverse geocoding
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`)
          .then(response => response.json())
          .then(data => {
            if (data && data.display_name) {
              // Extract a simplified address
              const address = data.display_name.split(',')[0] + ', ' + data.display_name.split(',')[1];
              callback(address.trim());
            } else {
              callback(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            }
          })
          .catch(error => {
            callback(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
          });
      }

      requestUserLocation() {
        if (this.tg && this.tg.showPopup && this.tg.isLocationRequested) {
          try {
            this.tg.showPopup({
              title: "Location Access",
              message: "HyperApp needs your location to show nearby reports and map features.",
              buttons: [{ type: "ok", text: "Allow" }, { type: "cancel", text: "Deny" }]
            }, async (buttonId) => {
              if (buttonId === "ok") {
                this.tg.requestLocation();
              }
            });
          } catch (e) {
            // Location request not available in this Telegram version
          }
        }
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
          await this.loadNearbyReports(0, true);

          // Load enhanced stats (includes UI rendering)
          await this.loadEnhancedStats();

          // Update stats UI
          this.updateStats();

          // Load map data (lightweight)
          this.loadMap();

          // Load weather data
          this.loadWeatherData();

          // Load user-specific data if authenticated
          if (this.isAuthenticated) {
            await this.loadUserReports();
            await this.updateUserReputation();
          }

          console.log('All data loaded immediately');

        } catch (error) {
          console.error('Error loading data immediately:', error);
          // Still show the app even if some data fails to load
          this.updateStats();
        }
      }

      async requestBrowserLocationSilently() {
        // Try to get location using standard browser API without showing UI
        if (!navigator.geolocation) {
          console.log('Geolocation not supported by this browser');
          return;
        }

        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 20000, // Increased timeout for better accuracy
              enableHighAccuracy: true,
              maximumAge: 60000 // Accept cached position up to 1 minute old for better accuracy
            });
          });

          const { latitude, longitude, accuracy } = position.coords;

          // Only accept positions with reasonable accuracy (within 100 meters)
          if (accuracy > 100) {
            this.showNotification("Location accuracy is low. Please ensure GPS is enabled and try again.", "warning");
          }

          this.userLocation = {
            latitude,
            longitude,
            accuracy,
            timestamp: Date.now()
          };

          console.log('Location obtained silently:', latitude, longitude);

          // Update location-based data immediately
          this.updateLocationBasedData();

          // Refresh enhanced stats to show location-based data
          await this.loadEnhancedStats();

        } catch (error) {
          // Silently fail - user can manually enable location later
          console.log('Location not available on app start, user can enable it manually');
        }
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
          this.showNotification("Location enabled! Loading local reports...", "success");

          // Update location-based data immediately
          this.updateLocationBasedData();

          // Refresh all data to show location-based content
          await this.loadEnhancedStats();

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

          this.showNotification(errorMessage, "error");

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

          const localStats = this.calculateLocalAreaStats(stats);
          this.updateLocalAreaDisplay(localStats);

          // Update community stats to reflect location-based data
          this.updateCommunityStatsWithLocation();
        }
      }

      // Update community stats to include location-based insights
      updateCommunityStatsWithLocation() {
        if (!this.userLocation || this.nearbyReports.length === 0) return;

        // Calculate location-based community stats
        const locationBasedStats = this.calculateLocationBasedCommunityStats();

        // Update the community stats display with location context
        this.updateCommunityStatsDisplay(locationBasedStats);
      }

      // Calculate community stats based on user's location
      calculateLocationBasedCommunityStats() {
        const stats = {
          nearbyReports: 0,
          localVibeDistribution: {},
          dominantLocalVibe: null,
          localSafetyScore: 0,
          address: null
        };

        if (!this.userLocation) return stats;

        const userLat = this.userLocation.latitude;
        const userLng = this.userLocation.longitude;

        // Count reports within 5km radius for "nearby" stats
        this.nearbyReports.forEach(report => {
          if (report.latitude && report.longitude) {
            const distance = this.calculateDistance(userLat, userLng, report.latitude, report.longitude);
            if (distance <= 5) { // 5km radius for community stats
              stats.nearbyReports++;
              stats.localVibeDistribution[report.vibe_type] = (stats.localVibeDistribution[report.vibe_type] || 0) + 1;
            }
          }
        });

        // Calculate dominant local vibe
        if (stats.nearbyReports > 0) {
          let maxCount = 0;
          for (const [vibe, count] of Object.entries(stats.localVibeDistribution)) {
            if (count > maxCount) {
              maxCount = count;
              stats.dominantLocalVibe = vibe;
            }
          }

          // Calculate local safety score (higher is safer)
          const dangerousCount = stats.localVibeDistribution.dangerous || 0;
          stats.localSafetyScore = Math.round(((stats.nearbyReports - dangerousCount) / stats.nearbyReports) * 100);
        }

        // Get address for the location
        this.getAddressFromCoordinates(userLat, userLng, (address) => {
          stats.address = address;
          this.updateCommunityStatsDisplay(stats);
        });

        return stats;
      }

      // Update community stats display with location data
      updateCommunityStatsDisplay(locationStats) {
        // Update the stats grid to show location-aware data
        const totalReportsElement = document.getElementById('totalReports');
        const activeUsersElement = document.getElementById('activeUsers');

        if (totalReportsElement && locationStats.nearbyReports > 0) {
          // Show nearby reports count instead of total
          totalReportsElement.textContent = locationStats.nearbyReports;
          // Add tooltip or subtitle to indicate these are nearby reports
          totalReportsElement.title = `Reports within 5km of your location`;
        }

        // Update active users estimate based on nearby activity
        if (activeUsersElement && locationStats.nearbyReports > 0) {
          const estimatedUsers = Math.max(1, Math.floor(locationStats.nearbyReports / 2)); // Estimate users from reports
          activeUsersElement.textContent = estimatedUsers;
          activeUsersElement.title = `Estimated active users in your area`;
        }

        // Update the community vibe sidebar with local data if available
        if (locationStats.dominantLocalVibe) {
          const dominantVibeElement = document.getElementById('dominantVibe');
          if (dominantVibeElement) {
            const iconElement = dominantVibeElement.querySelector('i');
            const nameElement = dominantVibeElement.querySelector('span:first-of-type');
            const percentageElement = dominantVibeElement.querySelector('.vibe-percentage');

            if (iconElement) iconElement.className = `${this.getVibeIcon(locationStats.dominantLocalVibe)}`;
            if (nameElement) nameElement.textContent = this.capitalizeFirstLetter(locationStats.dominantLocalVibe);
            if (percentageElement) {
              const totalLocal = Object.values(locationStats.localVibeDistribution).reduce((a, b) => a + b, 0);
              const dominantCount = locationStats.localVibeDistribution[locationStats.dominantLocalVibe] || 0;
              const percentage = totalLocal > 0 ? Math.round((dominantCount / totalLocal) * 100) : 0;
              percentageElement.textContent = `${percentage}%`;
            }
          }
        }

        // Add location context to the community stats card title
        const communityStatsCard = document.querySelector('.card-title span[data-en="Community Stats"]');
        if (communityStatsCard && locationStats.address) {
          const currentTitle = communityStatsCard.getAttribute('data-en');
          const locationAwareTitle = `Community Stats - ${locationStats.address}`;
          communityStatsCard.setAttribute('data-en', locationAwareTitle);
          communityStatsCard.textContent = locationAwareTitle;
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

      formatLocationForDisplay(report) {
        // Format location for display, preferring readable addresses over coordinates
        if (!report.location) {
          return 'Unknown location';
        }

        // If location looks like coordinates (contains comma and numbers), try to get a readable address
        if (report.location.match(/^-?\d+\.\d+,\s*-?\d+\.\d+$/)) {
          // This is coordinates, try to get address if we have coordinates
          if (report.latitude && report.longitude) {
            // For now, return a simplified version. In production, you might cache addresses
            return `${report.latitude.toFixed(2)}, ${report.longitude.toFixed(2)}`;
          }
          return 'Approximate location';
        }

        // Return the stored location (should be a readable address)
        return report.location;
      }

      updateLocalAreaDisplay(localStats) {
        // Update the local area display with new stats
        const localVibeIcon = document.querySelector('.local-vibe-icon');
        const localVibeName = document.querySelector('.local-vibe-name');
        const localVibePercentage = document.querySelector('.local-vibe-percentage');
        const localAreaAddress = document.querySelector('.local-area-address');

        if (localVibeIcon && localStats.dominantVibe) {
          localVibeIcon.style.background = this.getVibeColor(localStats.dominantVibe);
          localVibeIcon.innerHTML = `<i class="${this.getVibeIcon(localStats.dominantVibe)}"></i>`;
        }

        if (localVibeName) {
          localVibeName.textContent = localStats.dominantVibe ? this.capitalizeFirstLetter(localStats.dominantVibe) : 'No Data';
        }

        if (localVibePercentage) {
          localVibePercentage.textContent = localStats.dominantVibe ? localStats.percentage + '%' : '';
        }

        if (localAreaAddress) {
          const addressText = localStats.address && localStats.address !== 'Unknown Location' ? localStats.address : 'Adres';
          // Update only the text content, keep the icon
          const iconElement = localAreaAddress.querySelector('i');
          const textNode = localAreaAddress.lastChild;
          if (textNode && textNode.nodeType === Node.TEXT_NODE) {
            textNode.textContent = ' ' + addressText;
          } else {
            localAreaAddress.innerHTML = `<i class="fas fa-map-pin"></i> ${addressText}`;
          }
        }

        // Force update the local area stats display
        this.forceLocalAreaUpdate(localStats);
      }

      forceLocalAreaUpdate(localStats) {
        // Ensure the local area display is updated immediately
        const localAreaCard = document.querySelector('.local-area-stats');
        if (localAreaCard) {
          // Trigger a re-render by temporarily hiding and showing
          localAreaCard.style.display = 'none';
          localAreaCard.offsetHeight; // Force reflow
          localAreaCard.style.display = 'block';
        }
      }

      setupWeatherAlerts() {
        // Set up weather alert checking (would run periodically)
        this.weatherAlertInterval = setInterval(() => {
          this.checkWeatherAlerts();
        }, 300000); // Check every 5 minutes

        // Initial check
        this.checkWeatherAlerts();
      }

      async checkWeatherAlerts() {
        if (!this.userLocation) return;

        try {
          const apiKey = 'bd5e378503939ddaee76f12ad7a97608'; // Working API key
          const { latitude, longitude } = this.userLocation;

          const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`
          );

          if (!response.ok) return;

          const weatherData = await response.json();

          // Check for severe weather conditions
          const severeConditions = ['thunderstorm', 'rain', 'snow', 'fog'];
          const isSevere = severeConditions.includes(weatherData.weather[0].main.toLowerCase()) ||
                          weatherData.main.temp < 5 ||
                          weatherData.main.temp > 35;

          if (isSevere) {
            // Check if we already alerted recently (prevent spam)
            const lastAlert = localStorage.getItem('hyperapp_last_weather_alert');
            const now = Date.now();

            if (!lastAlert || (now - parseInt(lastAlert)) > 3600000) { // 1 hour cooldown
              this.sendWeatherAlert(weatherData);
              localStorage.setItem('hyperapp_last_weather_alert', now.toString());
            }
          }
        } catch (error) {
          console.error("Error checking weather alerts:", error);
        }
      }

      sendWeatherAlert(weatherData) {
        const temp = Math.round(weatherData.main.temp);
        const condition = weatherData.weather[0].description;
        const mainCondition = weatherData.weather[0].main.toLowerCase();

        let alertMessage = '';
        let alertType = 'warning';

        if (mainCondition === 'thunderstorm') {
          alertMessage = `⚡ Thunderstorm Warning: ${temp}°C with ${condition}. Stay indoors and avoid open areas!`;
        } else if (mainCondition === 'rain' || mainCondition === 'drizzle') {
          alertMessage = `🌧️ Heavy Rain Alert: ${temp}°C with ${condition}. Drive carefully and watch for flooding.`;
        } else if (mainCondition === 'snow') {
          alertMessage = `❄️ Snow Warning: ${temp}°C with ${condition}. Roads may be slippery - take precautions.`;
        } else if (mainCondition === 'fog') {
          alertMessage = `🌫️ Dense Fog Alert: ${temp}°C with ${condition}. Reduce speed and use headlights.`;
        } else if (temp < 5) {
          alertMessage = `🥶 Extreme Cold Warning: ${temp}°C. Dress warmly and avoid prolonged exposure.`;
        } else if (temp > 35) {
          alertMessage = `🔥 Extreme Heat Warning: ${temp}°C. Stay hydrated and avoid direct sun exposure.`;
        }

        if (alertMessage) {
          const notification = document.createElement('div');
          notification.className = `notification ${alertType}`;
          notification.innerHTML = `<i class="fas fa-cloud-sun"></i> <span>${alertMessage}</span>`;

          // Remove any existing notification
          const existingNotification = document.querySelector('.notification');
          if (existingNotification) {
            existingNotification.remove();
          }

          document.body.appendChild(notification);

          // Weather alerts stay longer (10 seconds)
          setTimeout(() => {
            if (notification.parentNode) {
              notification.remove();
            }
          }, 10000);
        }
      }

      updateSafetyHub() {
        // Only load weather data if we haven't loaded it recently (every 30 minutes)
        const lastWeatherUpdate = localStorage.getItem('hyperapp_last_weather_update');
        const now = Date.now();

        if (!lastWeatherUpdate || (now - parseInt(lastWeatherUpdate)) > 1800000) { // 30 minutes
          this.loadWeatherData();
          localStorage.setItem('hyperapp_last_weather_update', now.toString());
        }

        // Generate dynamic safety tips based on recent reports
        this.generateDynamicSafetyTips();
      }

      generateDynamicSafetyTips() {
        const safetyTipsContainer = document.getElementById('safetyTips');

        if (!this.nearbyReports || this.nearbyReports.length === 0) {
          // Default tips when no reports
          safetyTipsContainer.innerHTML = `
            <div class="guideline-item">
              <i class="fas fa-users"></i>
              <span data-en="Avoid crowded areas after dark" data-ar="تجنب المناطق المزدحمة بعد الظلام">Avoid crowded areas after dark</span>
            </div>
            <div class="guideline-item">
              <i class="fas fa-mobile-alt"></i>
              <span data-en="Keep your phone charged" data-ar="احتفظ بهاتفك مشحوناً">Keep your phone charged</span>
            </div>
            <div class="guideline-item">
              <i class="fas fa-share-alt"></i>
              <span data-en="Share your location with trusted contacts" data-ar="شارك موقعك مع جهات الاتصال الموثوقة">Share your location with trusted contacts</span>
            </div>
          `;
          return;
        }

        // Analyze recent reports to generate relevant safety tips
        const recentReports = this.nearbyReports.slice(0, 10); // Last 10 reports
        const vibeCounts = {};

        recentReports.forEach(report => {
          vibeCounts[report.vibe_type] = (vibeCounts[report.vibe_type] || 0) + 1;
        });

        const tips = [];

        // Generate tips based on most common vibes
        if (vibeCounts.dangerous > 0) {
          tips.push({
            icon: 'fas fa-exclamation-triangle',
            text: this.currentLanguage === 'en'
              ? 'High danger reports in area - stay vigilant'
              : 'تقارير خطر عالية في المنطقة - كن يقظاً'
          });
        }

        if (vibeCounts.crowded > vibeCounts.calm) {
          tips.push({
            icon: 'fas fa-users',
            text: this.currentLanguage === 'en'
              ? 'Area appears crowded - be aware of surroundings'
              : 'المنطقة تبدو مزدحمة - كن على دراية بمحيطك'
          });
        }

        if (vibeCounts.suspicious > 0) {
          tips.push({
            icon: 'fas fa-eye-slash',
            text: this.currentLanguage === 'en'
              ? 'Suspicious activity reported - trust your instincts'
              : 'تم الإبلاغ عن نشاط مشبوه - ثق بغريزتك'
          });
        }

        // Add default tips if we don't have enough specific ones
        if (tips.length < 3) {
          const defaultTips = [
            {
              icon: 'fas fa-mobile-alt',
              text: this.currentLanguage === 'en'
                ? 'Keep your phone charged and accessible'
                : 'احتفظ بهاتفك مشحوناً ومتاحاً'
            },
            {
              icon: 'fas fa-share-alt',
              text: this.currentLanguage === 'en'
                ? 'Share your location with trusted contacts'
                : 'شارك موقعك مع جهات الاتصال الموثوقة'
            },
            {
              icon: 'fas fa-users',
              text: this.currentLanguage === 'en'
                ? 'Stay aware of your surroundings'
                : 'ابق على دراية بمحيطك'
            }
          ];

          // Add default tips to fill up to 3
          while (tips.length < 3 && defaultTips.length > 0) {
            const tip = defaultTips.shift();
            if (!tips.find(t => t.text === tip.text)) {
              tips.push(tip);
            }
          }
        }

        // Limit to 3 tips and update UI
        const displayTips = tips.slice(0, 3);
        safetyTipsContainer.innerHTML = displayTips.map(tip => `
          <div class="guideline-item">
            <i class="${tip.icon}"></i>
            <span>${tip.text}</span>
          </div>
        `).join('');
      }

      showPrivacyPolicy() {
        const modalContent = `
          <div class="modal-content">
            <div class="modal-header">
              <h2 data-en="Privacy Policy" data-ar="سياسة الخصوصية">Privacy Policy</h2>
              <span class="close" data-dismiss="privacyModal">&times;</span>
            </div>
            <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
              <div style="text-align: left; line-height: 1.6;">
                <h3 data-en="Data Collection" data-ar="جمع البيانات">Data Collection</h3>
                <p data-en="HyperApp collects location data and safety reports to help communities stay informed about local conditions. All reports are anonymous by default." data-ar="يجمع HyperApp بيانات الموقع وتقارير السلامة لمساعدة المجتمعات على البقاء على اطلاع بظروف المنطقة المحلية. جميع التقارير مجهولة افتراضياً.">
                  HyperApp collects location data and safety reports to help communities stay informed about local conditions. All reports are anonymous by default.
                </p>

                <h3 data-en="Location Data" data-ar="بيانات الموقع">Location Data</h3>
                <p data-en="Location information is used solely for safety reporting and map visualization. We do not share your precise location with third parties." data-ar="تُستخدم معلومات الموقع فقط للإبلاغ عن السلامة وتصور الخريطة. نحن لا نشارك موقعك الدقيق مع أطراف ثالثة.">
                  Location information is used solely for safety reporting and map visualization. We do not share your precise location with third parties.
                </p>

                <h3 data-en="Anonymous Reporting" data-ar="الإبلاغ المجهول">Anonymous Reporting</h3>
                <p data-en="You can submit safety reports without creating an account. Reports are stored anonymously and cannot be traced back to individual users." data-ar="يمكنك إرسال تقارير السلامة دون إنشاء حساب. يتم تخزين التقارير بشكل مجهول ولا يمكن تتبعها إلى مستخدمين فرديين.">
                  You can submit safety reports without creating an account. Reports are stored anonymously and cannot be traced back to individual users.
                </p>

                <h3 data-en="Account Data (Optional)" data-ar="بيانات الحساب (اختياري)">Account Data (Optional)</h3>
                <p data-en="If you choose to create an account, we store your email and username for authentication and reputation tracking. This data is encrypted and never shared." data-ar="إذا اخترت إنشاء حساب، نحن نخزن بريدك الإلكتروني واسم المستخدم للمصادقة وتتبع السمعة. هذه البيانات مشفرة ولا تُشارك أبداً.">
                  If you choose to create an account, we store your email and username for authentication and reputation tracking. This data is encrypted and never shared.
                </p>

                <h3 data-en="Data Retention" data-ar="الاحتفاظ بالبيانات">Data Retention</h3>
                <p data-en="Safety reports are retained indefinitely to maintain community safety records. Account data is kept as long as your account is active." data-ar="يتم الاحتفاظ بتقارير السلامة إلى أجل غير مسمى للحفاظ على سجلات السلامة المجتمعية. يتم الاحتفاظ ببيانات الحساب طالما كان حسابك نشطاً.">
                  Safety reports are retained indefinitely to maintain community safety records. Account data is kept as long as your account is active.
                </p>

                <h3 data-en="Contact Us" data-ar="اتصل بنا">Contact Us</h3>
                <p data-en="If you have any questions about this Privacy Policy, please contact us through the app or email us at privacy@hyperapp.com." data-ar="إذا كان لديك أي أسئلة حول سياسة الخصوصية هذه، يرجى الاتصال بنا من خلال التطبيق أو مراسلتنا عبر البريد الإلكتروني على privacy@hyperapp.com.">
                  If you have any questions about this Privacy Policy, please contact us through the app or email us at privacy@hyperapp.com.
                </p>
              </div>
            </div>
          </div>
        `;

        // Create or update modal
        let modal = document.getElementById('privacyModal');
        if (!modal) {
          modal = document.createElement('div');
          modal.id = 'privacyModal';
          modal.className = 'modal';
          document.body.appendChild(modal);
        }
        modal.innerHTML = modalContent;
        modal.style.display = 'block';

        // Attach close button event listener
        const closeBtn = modal.querySelector('.close');
        if (closeBtn) {
          closeBtn.addEventListener('click', () => {
            this.closeModal('privacyModal');
          });
        }

        this.updateTextDirection();
      }

      async calculateUserReputation(userId) {
        if (!userId) return 0;

        try {
          // Get user's reports
          const { data: reports, error: reportsError } = await this.supabase
            .from('reports')
            .select('id, vibe_type, upvotes, downvotes, created_at')
            .eq('user_id', userId);

          if (reportsError) {
            console.error("Error fetching user reports for reputation:", reportsError);
            return 0;
          }

          // Get user's votes
          const { data: votes, error: votesError } = await this.supabase
            .from('votes')
            .select('vote_type')
            .eq('user_id', userId);

          if (votesError) {
            console.error("Error fetching user votes for reputation:", votesError);
            return 0;
          }

          let reputation = 0;

          // Base points for reports (10 points each)
          reputation += reports.length * 10;

          // Emergency reports bonus (2x multiplier)
          const emergencyReports = reports.filter(r => r.vibe_type === 'dangerous').length;
          reputation += emergencyReports * 10; // Additional 10 points for emergency reports

          // Quality multiplier based on upvotes/downvotes
          reports.forEach(report => {
            const totalVotes = (report.upvotes || 0) + (report.downvotes || 0);
            if (totalVotes > 0) {
              const upvoteRatio = (report.upvotes || 0) / totalVotes;
              if (upvoteRatio > 0.7) {
                reputation += 5; // Quality bonus for highly upvoted reports
              } else if (upvoteRatio < 0.3) {
                reputation -= 2; // Penalty for downvoted reports
              }
            }
          });

          // Community engagement bonus (voting on reports)
          reputation += votes.length * 2;

          // Consistency bonus (reports in last 7 days)
          const recentReports = reports.filter(r => {
            const reportDate = new Date(r.created_at);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return reportDate > weekAgo;
          }).length;

          if (recentReports > 0) {
            reputation += Math.min(recentReports * 3, 15); // Up to 15 points for consistency
          }

          // Minimum reputation of 0
          return Math.max(0, Math.round(reputation));
        } catch (error) {
          console.error("Error calculating reputation:", error);
          return 0;
        }
      }

      async updateUserReputation() {
        if (!this.isAuthenticated || !this.userData) return;

        try {
          const reputation = await this.calculateUserReputation(this.userData.id);

          // Update user data
          this.userData.reputation = reputation;

          // Update UI
          document.getElementById('userReputation').textContent = reputation;
          document.getElementById('settingsReputation').textContent = reputation;

          // Update database
          await this.supabase
            .from('users')
            .update({ reputation: reputation })
            .eq('user_id', this.userData.id);

          // Check for badge unlocks
          await this.checkBadgeUnlocks();

        } catch (error) {
          console.error("Error updating user reputation:", error);
        }
      }

      async getUserBadges(userId) {
        if (!userId) return [];

        try {
          // Get user's stats for badge calculation
          const { data: reports, error: reportsError } = await this.supabase
            .from('reports')
            .select('vibe_type, upvotes, created_at')
            .eq('user_id', userId);

          if (reportsError) {
            console.error("Error fetching reports for badges:", reportsError);
            return [];
          }

          const badges = [];
          const totalReports = reports.length;
          const totalUpvotes = reports.reduce((sum, r) => sum + (r.upvotes || 0), 0);
          const emergencyReports = reports.filter(r => r.vibe_type === 'dangerous').length;

          // Reporting Badges
          if (totalReports >= 1) badges.push({
            id: 'first_report',
            name: 'First Responder',
            icon: 'fas fa-plus-circle',
            description: 'Submitted your first safety report',
            color: '#28A745',
            unlocked: true
          });

          if (totalReports >= 10) badges.push({
            id: 'safety_guardian',
            name: 'Safety Guardian',
            icon: 'fas fa-shield-alt',
            description: 'Submitted 10+ safety reports',
            color: '#17A2B8',
            unlocked: true
          });

          if (emergencyReports >= 5) badges.push({
            id: 'emergency_responder',
            name: 'Emergency Responder',
            icon: 'fas fa-exclamation-triangle',
            description: 'Reported 5+ emergencies',
            color: '#DC3545',
            unlocked: true
          });

          // Community Badges
          if (totalUpvotes >= 50) badges.push({
            id: 'helpful_citizen',
            name: 'Helpful Citizen',
            icon: 'fas fa-hands-helping',
            description: 'Received 50+ upvotes on reports',
            color: '#FFC107',
            unlocked: true
          });

          if (totalUpvotes >= 100) badges.push({
            id: 'community_leader',
            name: 'Community Leader',
            icon: 'fas fa-crown',
            description: 'Received 100+ upvotes on reports',
            color: '#FF6B35',
            unlocked: true
          });

          // Quality Badges
          const highQualityReports = reports.filter(r => (r.upvotes || 0) > 5).length;
          if (highQualityReports >= 3) badges.push({
            id: 'trusted_reporter',
            name: 'Trusted Reporter',
            icon: 'fas fa-star',
            description: '3+ reports with high community approval',
            color: '#28A745',
            unlocked: true
          });

          // Engagement Badges
          const recentReports = reports.filter(r => {
            const reportDate = new Date(r.created_at);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return reportDate > weekAgo;
          }).length;

          if (recentReports >= 3) badges.push({
            id: 'active_contributor',
            name: 'Active Contributor',
            icon: 'fas fa-fire',
            description: '3+ reports in the last week',
            color: '#FF6B35',
            unlocked: true
          });

          return badges;
        } catch (error) {
          console.error("Error getting user badges:", error);
          return [];
        }
      }

      async checkBadgeUnlocks() {
        if (!this.isAuthenticated || !this.userData) return;

        try {
          const currentBadges = await this.getUserBadges(this.userData.id);
          const unlockedBadgeIds = currentBadges.map(b => b.id);

          // Check if we have new badges (this would need to be stored in localStorage or database)
          const previouslyUnlocked = JSON.parse(localStorage.getItem('hyperapp_unlocked_badges') || '[]');
          const newBadges = unlockedBadgeIds.filter(id => !previouslyUnlocked.includes(id));

          if (newBadges.length > 0) {
            // Show badge notification for new unlocks
            newBadges.forEach(badgeId => {
              const badge = currentBadges.find(b => b.id === badgeId);
              if (badge) {
                this.showBadgeNotification(badge);
              }
            });

            // Update stored badges
            localStorage.setItem('hyperapp_unlocked_badges', JSON.stringify(unlockedBadgeIds));
          }
        } catch (error) {
          console.error("Error checking badge unlocks:", error);
        }
      }

      showBadgeNotification(badge) {
        const notification = document.createElement('div');
        notification.className = 'notification success';
        notification.innerHTML = `
          <i class="fas fa-trophy"></i>
          <span><strong>Badge Unlocked!</strong> ${badge.name} - ${badge.description}</span>
        `;

        // Remove any existing notification
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
          existingNotification.remove();
        }

        document.body.appendChild(notification);

        // Auto-remove after 5 seconds for badge notifications
        setTimeout(() => {
          if (notification.parentNode) {
            notification.remove();
          }
        }, 5000);
      }

      async loadEnhancedStats() {
        try {
          // Get comprehensive stats
          const { data: reports, error } = await this.supabase
            .from('reports')
            .select('vibe_type, created_at, upvotes, downvotes, latitude, longitude')
            .order('created_at', { ascending: false })
            .limit(500);

          if (error) {
            console.error("Error loading enhanced stats:", error);
            // Don't render with incomplete data - just return
            return;
          }

          // Process stats data
          const stats = this.processStatsData(reports);

          // Update the stats display only if we have valid data
          if (stats && stats.totalReports >= 0) {
            this.renderStatsCharts(stats);
          }

        } catch (error) {
          console.error("Error loading enhanced stats:", error);
          // Don't render on error - keep existing data or show loading state
        }
      }

      processStatsData(reports) {
        const stats = {
          totalReports: reports.length,
          reports: reports, // Include reports array for local area calculation
          vibeDistribution: {},
          hourlyActivity: new Array(24).fill(0),
          dailyActivity: {},
          topLocations: {},
          averageUpvotes: 0,
          safetyScore: 0
        };

        let totalUpvotes = 0;

        reports.forEach(report => {
          // Vibe distribution
          stats.vibeDistribution[report.vibe_type] = (stats.vibeDistribution[report.vibe_type] || 0) + 1;

          // Hourly activity
          const hour = new Date(report.created_at).getHours();
          stats.hourlyActivity[hour]++;

          // Daily activity
          const date = new Date(report.created_at).toDateString();
          stats.dailyActivity[date] = (stats.dailyActivity[date] || 0) + 1;

          // Top locations (simplified)
          const location = report.latitude && report.longitude
            ? `${report.latitude.toFixed(2)},${report.longitude.toFixed(2)}`
            : 'Unknown';
          stats.topLocations[location] = (stats.topLocations[location] || 0) + 1;

          // Upvotes
          totalUpvotes += report.upvotes || 0;
        });

        stats.averageUpvotes = reports.length > 0 ? (totalUpvotes / reports.length).toFixed(1) : 0;

        // Calculate safety score (higher is safer)
        const dangerousReports = stats.vibeDistribution.dangerous || 0;
        const totalReports = stats.totalReports;
        stats.safetyScore = totalReports > 0 ? Math.round(((totalReports - dangerousReports) / totalReports) * 100) : 100;

        return stats;
      }

      renderStatsCharts(stats) {
        // Update existing stats
        document.getElementById('totalReports').textContent = stats.totalReports;

        // Calculate local area stats (within 1km of user location)
        const localStats = this.calculateLocalAreaStats(stats);

        // Always show enhanced stats display (responsive for mobile)
        const isMobile = window.innerWidth <= 768;

        const enhancedStatsHtml = `
          <div class="stats-grid">
            <!-- Stats cards removed from UI as requested -->
          </div>

          <div class="card">
            <div class="local-area-stats">
              <div class="local-vibe-display">
                <div class="local-vibe-icon" style="background: ${localStats.dominantVibe ? this.getVibeColor(localStats.dominantVibe) : '#ccc'}; box-shadow: 0 0 20px ${localStats.dominantVibe ? this.getVibeColor(localStats.dominantVibe) + '40' : '#ccc40'};">
                  <i class="${localStats.dominantVibe ? this.getVibeIcon(localStats.dominantVibe) : 'fas fa-question-circle'}"></i>
                </div>
                <div class="local-vibe-info">
                  <div class="local-vibe-name" style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">${localStats.dominantVibe ? this.capitalizeFirstLetter(localStats.dominantVibe) : 'No Data'}</div>
                  <div class="local-vibe-percentage" style="font-size: 32px; font-weight: bold; background: linear-gradient(135deg, var(--primary), var(--primary-dark)); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 8px;">${localStats.dominantVibe && localStats.percentage > 0 ? localStats.percentage + '%' : ''}</div>
                  <div class="local-area-address" style="font-size: 14px; color: var(--text-light); display: flex; align-items: center; gap: 6px; margin-top: 8px;"><i class="fas fa-map-pin"></i> ${localStats.address || 'Your Area'}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-title">
              <i class="fas fa-chart-bar"></i>
              <span data-en="Community Vibe" data-ar="حالة المجتمع">Community Vibe</span>
            </div>
            <div class="vibe-sidebars-chart">
              ${Object.entries(stats.vibeDistribution)
                .sort(([,a], [,b]) => b - a) // Sort by count descending
                .map(([vibe, count]) => {
                  const percentage = stats.totalReports > 0 ? (count / stats.totalReports) * 100 : 0;
                  return `
                    <div class="vibe-sidebar-item">
                      <div class="vibe-sidebar-label">
                        <i class="${this.getVibeIcon(vibe)}"></i>
                        <span>${this.capitalizeFirstLetter(vibe)}</span>
                      </div>
                      <div class="vibe-sidebar-bar">
                        <div class="vibe-sidebar-fill" style="width: ${percentage}%; background: ${this.getVibeColor(vibe)}"></div>
                      </div>
                      <div class="vibe-sidebar-count">${count}</div>
                      <div class="vibe-sidebar-percentage">${percentage.toFixed(1)}%</div>
                    </div>
                  `;
                }).join('')}
            </div>
          </div>

          <div class="card">
            <div class="card-title">
              <i class="fas fa-chart-line"></i>
              <span data-en="Safety Trend Analysis" data-ar="تحليل اتجاهات السلامة">Safety Trend Analysis</span>
            </div>
            <div class="safety-trend-chart">
              <div class="trend-metrics">
                <div class="trend-metric">
                  <div class="trend-label" data-en="Safety Score Trend" data-ar="اتجاه درجة السلامة">Safety Score Trend</div>
                  <div class="trend-value ${stats.safetyScore >= 70 ? 'safe' : stats.safetyScore >= 40 ? 'moderate' : 'dangerous'}">
                    ${stats.safetyScore}%
                  </div>
                </div>
                <div class="trend-metric">
                  <div class="trend-label" data-en="Danger Reports" data-ar="تقارير الخطر">Danger Reports</div>
                  <div class="trend-value dangerous">
                    ${stats.vibeDistribution.dangerous || 0}
                  </div>
                </div>
                <div class="trend-metric">
                  <div class="trend-label" data-en="Community Response" data-ar="استجابة المجتمع">Community Response</div>
                  <div class="trend-value ${stats.averageUpvotes >= 2 ? 'good' : 'moderate'}">
                    ${stats.averageUpvotes} avg upvotes
                  </div>
                </div>
              </div>
              <div class="safety-indicators">
                <div class="safety-indicator">
                  <div class="indicator-bar">
                    <div class="indicator-fill ${stats.safetyScore >= 70 ? 'safe' : stats.safetyScore >= 40 ? 'moderate' : 'dangerous'}"
                         style="width: ${100 - stats.safetyScore}%"></div>
                  </div>
                  <div class="indicator-labels">
                    <span data-en="Low Risk" data-ar="خطر منخفض">Low Risk</span>
                    <span data-en="Moderate" data-ar="متوسط">Moderate</span>
                    <span data-en="High Risk" data-ar="خطر عالي">High Risk</span>
                  </div>
                </div>
              </div>
              <div class="trend-insights">
                <div class="insight-item">
                  <i class="fas ${stats.safetyScore >= 70 ? 'fa-shield-alt' : stats.safetyScore >= 40 ? 'fa-exclamation-triangle' : 'fa-exclamation-circle'}"></i>
                  <span data-en="${stats.safetyScore >= 70 ? 'Area appears generally safe' : stats.safetyScore >= 40 ? 'Exercise caution in this area' : 'High danger reports - take precautions'}" data-ar="${stats.safetyScore >= 70 ? 'المنطقة تبدو آمنة بشكل عام' : stats.safetyScore >= 40 ? 'تحلى بالحذر في هذه المنطقة' : 'تقارير خطر عالية - اتخذ احتياطاتك'}">
                    ${stats.safetyScore >= 70 ? 'Area appears generally safe' : stats.safetyScore >= 40 ? 'Exercise caution in this area' : 'High danger reports - take precautions'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        `;

        // Replace the stats grid with enhanced version
        const statsContainer = document.getElementById('statsGrid').parentElement;
        statsContainer.innerHTML = enhancedStatsHtml;

        this.updateTextDirection();
      }

      calculateLocalAreaStats(stats) {
        // Calculate stats for reports within expanding radius of user location
        const localStats = {
          totalLocalReports: 0,
          vibeDistribution: {},
          dominantVibe: null,
          percentage: 0,
          radius: 1,
          address: null,
          hasLocationData: false
        };

        // DEBUG: Log location and report data status
        console.log('=== Local Area Stats Debug ===');
        console.log('User location available:', !!this.userLocation);
        if (this.userLocation) {
          console.log('User coordinates:', this.userLocation.latitude, this.userLocation.longitude);
        }
        console.log('Reports available:', !!stats.reports);
        console.log('Number of reports:', stats.reports ? stats.reports.length : 0);

        if (stats.reports && stats.reports.length > 0) {
          console.log('Sample report data:');
          console.log('Report 1:', {
            id: stats.reports[0].id,
            vibe_type: stats.reports[0].vibe_type,
            location: stats.reports[0].location,
            hasLatitude: !!stats.reports[0].latitude,
            hasLongitude: !!stats.reports[0].longitude,
            latitude: stats.reports[0].latitude,
            longitude: stats.reports[0].longitude
          });
        }

        if (!stats.reports) {
          console.log('❌ Returning "No Data" - no reports available');
          return localStats;
        }

        if (!this.userLocation) {
          console.log('No user location available, will fall back to general community stats');
          // Continue to fallback logic below
        }

        const userLat = this.userLocation.latitude;
        const userLng = this.userLocation.longitude;

        // Try expanding radii until we find reports (strictly location-based only)
        const radii = [1, 2, 5, 10, 25];

        for (const radius of radii) {
          localStats.totalLocalReports = 0;
          localStats.vibeDistribution = {};
          localStats.radius = radius;

          stats.reports.forEach(report => {
            if (report.latitude && report.longitude) {
              const distance = this.calculateDistance(userLat, userLng, report.latitude, report.longitude);
              if (distance <= radius) {
                localStats.totalLocalReports++;
                localStats.vibeDistribution[report.vibe_type] = (localStats.vibeDistribution[report.vibe_type] || 0) + 1;
                localStats.hasLocationData = true;
              }
            }
          });

          if (localStats.totalLocalReports > 0) {
            break; // Found reports within this radius, use it
          }
        }

        // Always try to get address for user location if available
        if (this.userLocation) {
          this.getAddressFromCoordinates(userLat, userLng, (address) => {
            localStats.address = address;
            this.updateLocalAreaDisplay(localStats);
          });
        }

        // Calculate dominant vibe and percentage (only for location-based reports)
        if (localStats.totalLocalReports > 0 && localStats.hasLocationData) {
          let maxCount = 0;
          for (const [vibe, count] of Object.entries(localStats.vibeDistribution)) {
            if (count > maxCount) {
              maxCount = count;
              localStats.dominantVibe = vibe;
            }
          }
          localStats.percentage = Math.round((maxCount / localStats.totalLocalReports) * 100);
        }

        // If no local reports found, fall back to general community stats
        if (localStats.totalLocalReports === 0) {
          localStats.totalLocalReports = stats.totalReports;
          localStats.vibeDistribution = stats.vibeDistribution;
          localStats.radius = 'General Area';
          // Calculate dominant vibe from general stats
          let maxCount = 0;
          for (const [vibe, count] of Object.entries(stats.vibeDistribution)) {
            if (count > maxCount) {
              maxCount = count;
              localStats.dominantVibe = vibe;
            }
          }
          localStats.percentage = stats.totalReports > 0 ? Math.round((maxCount / stats.totalReports) * 100) : 0;
        }

        return localStats;
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

      formatLocationForDisplay(report) {
        // Format location for display, preferring readable addresses over coordinates
        if (!report.location) {
          return 'Unknown location';
        }

        // If location looks like coordinates (contains comma and numbers), try to get a readable address
        if (report.location.match(/^-?\d+\.\d+,\s*-?\d+\.\d+$/)) {
          // This is coordinates, try to get address if we have coordinates
          if (report.latitude && report.longitude) {
            // For now, return a simplified version. In production, you might cache addresses
            return `${report.latitude.toFixed(2)}, ${report.longitude.toFixed(2)}`;
          }
          return 'Approximate location';
        }

        // Return the stored location (should be a readable address)
        return report.location;
      }

      updateLocalAreaDisplay(localStats) {
        // Update the local area display with new stats
        const localVibeIcon = document.querySelector('.local-vibe-icon');
        const localVibeName = document.querySelector('.local-vibe-name');
        const localVibePercentage = document.querySelector('.local-vibe-percentage');
        const localAreaAddress = document.querySelector('.local-area-address');

        if (localVibeIcon && localStats.dominantVibe) {
          localVibeIcon.style.background = this.getVibeColor(localStats.dominantVibe);
          localVibeIcon.innerHTML = `<i class="${this.getVibeIcon(localStats.dominantVibe)}"></i>`;
        }

        if (localVibeName) {
          localVibeName.textContent = localStats.dominantVibe ? this.capitalizeFirstLetter(localStats.dominantVibe) : 'No Data';
        }

        if (localVibePercentage) {
          localVibePercentage.textContent = localStats.dominantVibe ? localStats.percentage + '%' : '';
        }

        if (localAreaAddress) {
          const addressText = localStats.address && localStats.address !== 'Unknown Location' ? localStats.address : 'Adres';
          // Update only the text content, keep the icon
          const iconElement = localAreaAddress.querySelector('i');
          const textNode = localAreaAddress.lastChild;
          if (textNode && textNode.nodeType === Node.TEXT_NODE) {
            textNode.textContent = ' ' + addressText;
          } else {
            localAreaAddress.innerHTML = `<i class="fas fa-map-pin"></i> ${addressText}`;
          }
        }

        // Force update the local area stats display
        this.forceLocalAreaUpdate(localStats);
      }

      forceLocalAreaUpdate(localStats) {
        // Ensure the local area display is updated immediately
        const localAreaCard = document.querySelector('.local-area-stats');
        if (localAreaCard) {
          // Trigger a re-render by temporarily hiding and showing
          localAreaCard.style.display = 'none';
          localAreaCard.offsetHeight; // Force reflow
          localAreaCard.style.display = 'block';
        }
      }

      setupWeatherAlerts() {
        // Set up weather alert checking (would run periodically)
        this.weatherAlertInterval = setInterval(() => {
          this.checkWeatherAlerts();
        }, 300000); // Check every 5 minutes

        // Initial check
        this.checkWeatherAlerts();
      }

      async checkWeatherAlerts() {
        if (!this.userLocation) return;

        try {
          const apiKey = 'bd5e378503939ddaee76f12ad7a97608'; // Working API key
          const { latitude, longitude } = this.userLocation;

          const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`
          );

          if (!response.ok) return;

          const weatherData = await response.json();

          // Check for severe weather conditions
          const severeConditions = ['thunderstorm', 'rain', 'snow', 'fog'];
          const isSevere = severeConditions.includes(weatherData.weather[0].main.toLowerCase()) ||
                          weatherData.main.temp < 5 ||
                          weatherData.main.temp > 35;

          if (isSevere) {
            // Check if we already alerted recently (prevent spam)
            const lastAlert = localStorage.getItem('hyperapp_last_weather_alert');
            const now = Date.now();

            if (!lastAlert || (now - parseInt(lastAlert)) > 3600000) { // 1 hour cooldown
              this.sendWeatherAlert(weatherData);
              localStorage.setItem('hyperapp_last_weather_alert', now.toString());
            }
          }
        } catch (error) {
          console.error("Error checking weather alerts:", error);
        }
      }

      sendWeatherAlert(weatherData) {
        const temp = Math.round(weatherData.main.temp);
        const condition = weatherData.weather[0].description;
        const mainCondition = weatherData.weather[0].main.toLowerCase();

        let alertMessage = '';
        let alertType = 'warning';

        if (mainCondition === 'thunderstorm') {
          alertMessage = `⚡ Thunderstorm Warning: ${temp}°C with ${condition}. Stay indoors and avoid open areas!`;
        } else if (mainCondition === 'rain' || mainCondition === 'drizzle') {
          alertMessage = `🌧️ Heavy Rain Alert: ${temp}°C with ${condition}. Drive carefully and watch for flooding.`;
        } else if (mainCondition === 'snow') {
          alertMessage = `❄️ Snow Warning: ${temp}°C with ${condition}. Roads may be slippery - take precautions.`;
        } else if (mainCondition === 'fog') {
          alertMessage = `🌫️ Dense Fog Alert: ${temp}°C with ${condition}. Reduce speed and use headlights.`;
        } else if (temp < 5) {
          alertMessage = `🥶 Extreme Cold Warning: ${temp}°C. Dress warmly and avoid prolonged exposure.`;
        } else if (temp > 35) {
          alertMessage = `🔥 Extreme Heat Warning: ${temp}°C. Stay hydrated and avoid direct sun exposure.`;
        }

        if (alertMessage) {
          const notification = document.createElement('div');
          notification.className = `notification ${alertType}`;
          notification.innerHTML = `<i class="fas fa-cloud-sun"></i> <span>${alertMessage}</span>`;

          // Remove any existing notification
          const existingNotification = document.querySelector('.notification');
          if (existingNotification) {
            existingNotification.remove();
          }

          document.body.appendChild(notification);

          // Weather alerts stay longer (10 seconds)
          setTimeout(() => {
            if (notification.parentNode) {
              notification.remove();
            }
          }, 10000);
        }
      }

      updateSafetyHub() {
        // Only load weather data if we haven't loaded it recently (every 30 minutes)
        const lastWeatherUpdate = localStorage.getItem('hyperapp_last_weather_update');
        const now = Date.now();

        if (!lastWeatherUpdate || (now - parseInt(lastWeatherUpdate)) > 1800000) { // 30 minutes
          this.loadWeatherData();
          localStorage.setItem('hyperapp_last_weather_update', now.toString());
        }

        // Generate dynamic safety tips based on recent reports
        this.generateDynamicSafetyTips();
      }

      generateDynamicSafetyTips() {
        const safetyTipsContainer = document.getElementById('safetyTips');

        if (!this.nearbyReports || this.nearbyReports.length === 0) {
          // Default tips when no reports
          safetyTipsContainer.innerHTML = `
            <div class="guideline-item">
              <i class="fas fa-users"></i>
              <span data-en="Avoid crowded areas after dark" data-ar="تجنب المناطق المزدحمة بعد الظلام">Avoid crowded areas after dark</span>
            </div>
            <div class="guideline-item">
              <i class="fas fa-mobile-alt"></i>
              <span data-en="Keep your phone charged" data-ar="احتفظ بهاتفك مشحوناً">Keep your phone charged</span>
            </div>
            <div class="guideline-item">
              <i class="fas fa-share-alt"></i>
              <span data-en="Share your location with trusted contacts" data-ar="شارك موقعك مع جهات الاتصال الموثوقة">Share your location with trusted contacts</span>
            </div>
          `;
          return;
        }

        // Analyze recent reports to generate relevant safety tips
        const recentReports = this.nearbyReports.slice(0, 10); // Last 10 reports
        const vibeCounts = {};

        recentReports.forEach(report => {
          vibeCounts[report.vibe_type] = (vibeCounts[report.vibe_type] || 0) + 1;
        });

        const tips = [];

        // Generate tips based on most common vibes
        if (vibeCounts.dangerous > 0) {
          tips.push({
            icon: 'fas fa-exclamation-triangle',
            text: this.currentLanguage === 'en'
              ? 'High danger reports in area - stay vigilant'
              : 'تقارير خطر عالية في المنطقة - كن يقظاً'
          });
        }

        if (vibeCounts.crowded > vibeCounts.calm) {
          tips.push({
            icon: 'fas fa-users',
            text: this.currentLanguage === 'en'
              ? 'Area appears crowded - be aware of surroundings'
              : 'المنطقة تبدو مزدحمة - كن على دراية بمحيطك'
          });
        }

        if (vibeCounts.suspicious > 0) {
          tips.push({
            icon: 'fas fa-eye-slash',
            text: this.currentLanguage === 'en'
              ? 'Suspicious activity reported - trust your instincts'
              : 'تم الإبلاغ عن نشاط مشبوه - ثق بغريزتك'
          });
        }

        // Add default tips if we don't have enough specific ones
        if (tips.length < 3) {
          const defaultTips = [
            {
              icon: 'fas fa-mobile-alt',
              text: this.currentLanguage === 'en'
                ? 'Keep your phone charged and accessible'
                : 'احتفظ بهاتفك مشحوناً ومتاحاً'
            },
            {
              icon: 'fas fa-share-alt',
              text: this.currentLanguage === 'en'
                ? 'Share your location with trusted contacts'
                : 'شارك موقعك مع جهات الاتصال الموثوقة'
            },
            {
              icon: 'fas fa-users',
              text: this.currentLanguage === 'en'
                ? 'Stay aware of your surroundings'
                : 'ابق على دراية بمحيطك'
            }
          ];

          // Add default tips to fill up to 3
          while (tips.length < 3 && defaultTips.length > 0) {
            const tip = defaultTips.shift();
            if (!tips.find(t => t.text === tip.text)) {
              tips.push(tip);
            }
          }
        }

        // Limit to 3 tips and update UI
        const displayTips = tips.slice(0, 3);
        safetyTipsContainer.innerHTML = displayTips.map(tip => `
          <div class="guideline-item">
            <i class="${tip.icon}"></i>
            <span>${tip.text}</span>
          </div>
        `).join('');
      }

      showPrivacyPolicy() {
        const modalContent = `
          <div class="modal-content">
            <div class="modal-header">
              <h2 data-en="Privacy Policy" data-ar="سياسة الخصوصية">Privacy Policy</h2>
              <span class="close" data-dismiss="privacyModal">&times;</span>
            </div>
            <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
              <div style="text-align: left; line-height: 1.6;">
                <h3 data-en="Data Collection" data-ar="جمع البيانات">Data Collection</h3>
                <p data-en="HyperApp collects location data and safety reports to help communities stay informed about local conditions. All reports are anonymous by default." data-ar="يجمع HyperApp بيانات الموقع وتقارير السلامة لمساعدة المجتمعات على البقاء على اطلاع بظروف المنطقة المحلية. جميع التقارير مجهولة افتراضياً.">
                  HyperApp collects location data and safety reports to help communities stay informed about local conditions. All reports are anonymous by default.
                </p>

                <h3 data-en="Location Data" data-ar="بيانات الموقع">Location Data</h3>
                <p data-en="Location information is used solely for safety reporting and map visualization. We do not share your precise location with third parties." data-ar="تُستخدم معلومات الموقع فقط للإبلاغ عن السلامة وتصور الخريطة. نحن لا نشارك موقعك الدقيق مع أطراف ثالثة.">
                  Location information is used solely for safety reporting and map visualization. We do not share your precise location with third parties.
                </p>

                <h3 data-en="Anonymous Reporting" data-ar="الإبلاغ المجهول">Anonymous Reporting</h3>
                <p data-en="You can submit safety reports without creating an account. Reports are stored anonymously and cannot be traced back to individual users." data-ar="يمكنك إرسال تقارير السلامة دون إنشاء حساب. يتم تخزين التقارير بشكل مجهول ولا يمكن تتبعها إلى مستخدمين فرديين.">
                  You can submit safety reports without creating an account. Reports are stored anonymously and cannot be traced back to individual users.
                </p>

                <h3 data-en="Account Data (Optional)" data-ar="بيانات الحساب (اختياري)">Account Data (Optional)</h3>
                <p data-en="If you choose to create an account, we store your email and username for authentication and reputation tracking. This data is encrypted and never shared." data-ar="إذا اخترت إنشاء حساب، نحن نخزن بريدك الإلكتروني واسم المستخدم للمصادقة وتتبع السمعة. هذه البيانات مشفرة ولا تُشارك أبداً.">
                  If you choose to create an account, we store your email and username for authentication and reputation tracking. This data is encrypted and never shared.
                </p>

                <h3 data-en="Data Retention" data-ar="الاحتفاظ بالبيانات">Data Retention</h3>
                <p data-en="Safety reports are retained indefinitely to maintain community safety records. Account data is kept as long as your account is active." data-ar="يتم الاحتفاظ بتقارير السلامة إلى أجل غير مسمى للحفاظ على سجلات السلامة المجتمعية. يتم الاحتفاظ ببيانات الحساب طالما كان حسابك نشطاً.">
                  Safety reports are retained indefinitely to maintain community safety records. Account data is kept as long as your account is active.
                </p>

                <h3 data-en="Contact Us" data-ar="اتصل بنا">Contact Us</h3>
                <p data-en="If you have any questions about this Privacy Policy, please contact us through the app or email us at privacy@hyperapp.com." data-ar="إذا كان لديك أي أسئلة حول سياسة الخصوصية هذه، يرجى الاتصال بنا من خلال التطبيق أو مراسلتنا عبر البريد الإلكتروني على privacy@hyperapp.com.">
                  If you have any questions about this Privacy Policy, please contact us through the app or email us at privacy@hyperapp.com.
                </p>
              </div>
            </div>
          </div>
        `;

        // Create or update modal
        let modal = document.getElementById('privacyModal');
        if (!modal) {
          modal = document.createElement('div');
          modal.id = 'privacyModal';
          modal.className = 'modal';
          document.body.appendChild(modal);
        }
        modal.innerHTML = modalContent;
        modal.style.display = 'block';

        // Attach close button event listener
        const closeBtn = modal.querySelector('.close');
        if (closeBtn) {
          closeBtn.addEventListener('click', () => {
            this.closeModal('privacyModal');
          });
        }

        this.updateTextDirection();
      }

      async calculateUserReputation(userId) {
        if (!userId) return 0;

        try {
          // Get user's reports
          const { data: reports, error: reportsError } = await this.supabase
            .from('reports')
            .select('id, vibe_type, upvotes, downvotes, created_at')
            .eq('user_id', userId);

          if (reportsError) {
            console.error("Error fetching user reports for reputation:", reportsError);
            return 0;
          }

          // Get user's votes
          const { data: votes, error: votesError } = await this.supabase
            .from('votes')
            .select('vote_type')
            .eq('user_id', userId);

          if (votesError) {
            console.error("Error fetching user votes for reputation:", votesError);
            return 0;
          }

          let reputation = 0;

          // Base points for reports (10 points each)
          reputation += reports.length * 10;

          // Emergency reports bonus (2x multiplier)
          const emergencyReports = reports.filter(r => r.vibe_type === 'dangerous').length;
          reputation += emergencyReports * 10; // Additional 10 points for emergency reports

          // Quality multiplier based on upvotes/downvotes
          reports.forEach(report => {
            const totalVotes = (report.upvotes || 0) + (report.downvotes || 0);
            if (totalVotes > 0) {
              const upvoteRatio = (report.upvotes || 0) / totalVotes;
              if (upvoteRatio > 0.7) {
                reputation += 5; // Quality bonus for highly upvoted reports
              } else if (upvoteRatio < 0.3) {
                reputation -= 2; // Penalty for downvoted reports
              }
            }
          });

          // Community engagement bonus (voting on reports)
          reputation += votes.length * 2;

          // Consistency bonus (reports in last 7 days)
          const recentReports = reports.filter(r => {
            const reportDate = new Date(r.created_at);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return reportDate > weekAgo;
          }).length;

          if (recentReports > 0) {
            reputation += Math.min(recentReports * 3, 15); // Up to 15 points for consistency
          }

          // Minimum reputation of 0
          return Math.max(0, Math.round(reputation));
        } catch (error) {
          console.error("Error calculating reputation:", error);
          return 0;
        }
      }

      async updateUserReputation() {
        if (!this.isAuthenticated || !this.userData) return;

        try {
          const reputation = await this.calculateUserReputation(this.userData.id);

          // Update user data
          this.userData.reputation = reputation;

          // Update UI
          document.getElementById('userReputation').textContent = reputation;
          document.getElementById('settingsReputation').textContent = reputation;

          // Update database
          await this.supabase
            .from('users')
            .update({ reputation: reputation })
            .eq('user_id', this.userData.id);

          // Check for badge unlocks
          await this.checkBadgeUnlocks();

        } catch (error) {
          console.error("Error updating user reputation:", error);
        }
      }

      async getUserBadges(userId) {
        if (!userId) return [];

        try {
          // Get user's stats for badge calculation
          const { data: reports, error: reportsError } = await this.supabase
            .from('reports')
            .select('vibe_type, upvotes, created_at')
            .eq('user_id', userId);

          if (reportsError) {
            console.error("Error fetching reports for badges:", reportsError);
            return [];
          }

          const badges = [];
          const totalReports = reports.length;
          const totalUpvotes = reports.reduce((sum, r) => sum + (r.upvotes || 0), 0);
          const emergencyReports = reports.filter(r => r.vibe_type === 'dangerous').length;

          // Reporting Badges
          if (totalReports >= 1) badges.push({
            id: 'first_report',
            name: 'First Responder',
            icon: 'fas fa-plus-circle',
            description: 'Submitted your first safety report',
            color: '#28A745',
            unlocked: true
          });

          if (totalReports >= 10) badges.push({
            id: 'safety_guardian',
            name: 'Safety Guardian',
            icon: 'fas fa-shield-alt',
            description: 'Submitted 10+ safety reports',
            color: '#17A2B8',
            unlocked: true
          });

          if (emergencyReports >= 5) badges.push({
            id: 'emergency_responder',
            name: 'Emergency Responder',
            icon: 'fas fa-exclamation-triangle',
            description: 'Reported 5+ emergencies',
            color: '#DC3545',
            unlocked: true
          });

          // Community Badges
          if (totalUpvotes >= 50) badges.push({
            id: 'helpful_citizen',
            name: 'Helpful Citizen',
            icon: 'fas fa-hands-helping',
            description: 'Received 50+ upvotes on reports',
            color: '#FFC107',
            unlocked: true
          });

          if (totalUpvotes >= 100) badges.push({
            id: 'community_leader',
            name: 'Community Leader',
            icon: 'fas fa-crown',
            description: 'Received 100+ upvotes on reports',
            color: '#FF6B35',
            unlocked: true
          });

          // Quality Badges
          const highQualityReports = reports.filter(r => (r.upvotes || 0) > 5).length;
          if (highQualityReports >= 3) badges.push({
            id: 'trusted_reporter',
            name: 'Trusted Reporter',
            icon: 'fas fa-star',
            description: '3+ reports with high community approval',
            color: '#28A745',
            unlocked: true
          });

          // Engagement Badges
          const recentReports = reports.filter(r => {
            const reportDate = new Date(r.created_at);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return reportDate > weekAgo;
          }).length;

          if (recentReports >= 3) badges.push({
            id: 'active_contributor',
            name: 'Active Contributor',
            icon: 'fas fa-fire',
            description: '3+ reports in the last week',
            color: '#FF6B35',
            unlocked: true
          });

          return badges;
        } catch (error) {
          console.error("Error getting user badges:", error);
          return [];
        }
      }

      async checkBadgeUnlocks() {
        if (!this.isAuthenticated || !this.userData) return;

        try {
          const currentBadges = await this.getUserBadges(this.userData.id);
          const unlockedBadgeIds = currentBadges.map(b => b.id);

          // Check if we have new badges (this would need to be stored in localStorage or database)
          const previouslyUnlocked = JSON.parse(localStorage.getItem('hyperapp_unlocked_badges') || '[]');
          const newBadges = unlockedBadgeIds.filter(id => !previouslyUnlocked.includes(id));

          if (newBadges.length > 0) {
            // Show badge notification for new unlocks
            newBadges.forEach(badgeId => {
              const badge = currentBadges.find(b => b.id === badgeId);
              if (badge) {
                this.showBadgeNotification(badge);
              }
            });

            // Update stored badges
            localStorage.setItem('hyperapp_unlocked_badges', JSON.stringify(unlockedBadgeIds));
          }
        } catch (error) {
          console.error("Error checking badge unlocks:", error);
        }
      }

      showBadgeNotification(badge) {
        const notification = document.createElement('div');
        notification.className = 'notification success';
        notification.innerHTML = `
          <i class="fas fa-trophy"></i>
          <span><strong>Badge Unlocked!</strong> ${badge.name} - ${badge.description}</span>
        `;

        // Remove any existing notification
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
          existingNotification.remove();
        }

        document.body.appendChild(notification);

        // Auto-remove after 5 seconds for badge notifications
        setTimeout(() => {
          if (notification.parentNode) {
            notification.remove();
          }
        }, 5000);
      }

      async loadEnhancedStats() {
        try {
          // Get comprehensive stats
          const { data: reports, error } = await this.supabase
            .from('reports')
            .select('vibe_type, created_at, upvotes, downvotes, latitude, longitude')
            .order('created_at', { ascending: false })
            .limit(500);

          if (error) {
            console.error("Error loading enhanced stats:", error);
            // Don't render with incomplete data - just return
            return;
          }

          // Process stats data
          const stats = this.processStatsData(reports);

          // Update the stats display only if we have valid data
          if (stats && stats.totalReports >= 0) {
            this.renderStatsCharts(stats);
          }

        } catch (error) {
          console.error("Error loading enhanced stats:", error);
          // Don't render on error - keep existing data or show loading state
        }
      }

      processStatsData(reports) {
        const stats = {
          totalReports: reports.length,
          reports: reports, // Include reports array for local area calculation
          vibeDistribution: {},
          hourlyActivity: new Array(24).fill(0),
          dailyActivity: {},
          topLocations: {},
          averageUpvotes: 0,
          safetyScore: 0
        };

        let totalUpvotes = 0;

        reports.forEach(report => {
          // Vibe distribution
          stats.vibeDistribution[report.vibe_type] = (stats.vibeDistribution[report.vibe_type] || 0) + 1;

          // Hourly activity
          const hour = new Date(report.created_at).getHours();
          stats.hourlyActivity[hour]++;

          // Daily activity
          const date = new Date(report.created_at).toDateString();
          stats.dailyActivity[date] = (stats.dailyActivity[date] || 0) + 1;

          // Top locations (simplified)
          const location = report.latitude && report.longitude
            ? `${report.latitude.toFixed(2)},${report.longitude.toFixed(2)}`
            : 'Unknown';
          stats.topLocations[location] = (stats.topLocations[location] || 0) + 1;

          // Upvotes
          totalUpvotes += report.upvotes || 0;
        });

        stats.averageUpvotes = reports.length > 0 ? (totalUpvotes / reports.length).toFixed(1) : 0;

        // Calculate safety score (higher is safer)
        const dangerousReports = stats.vibeDistribution.dangerous || 0;
        const totalReports = stats.totalReports;
        stats.safetyScore = totalReports > 0 ? Math.round(((totalReports - dangerousReports) / totalReports) * 100) : 100;

        return stats;
      }

      renderStatsCharts(stats) {
        // Update existing stats
        document.getElementById('totalReports').textContent = stats.totalReports;

        // Calculate local area stats (within 1km of user location)
        const localStats = this.calculateLocalAreaStats(stats);

        // Always show enhanced stats display (responsive for mobile)
        const isMobile = window.innerWidth <= 768;

        const enhancedStatsHtml = `
          <div class="stats-grid">
            <!-- Stats cards removed from UI as requested -->
          </div>

          <div class="card">
            <div class="local-area-stats">
              <div class="local-vibe-display">
                <div class="local-vibe-icon" style="background: ${localStats.dominantVibe ? this.getVibeColor(localStats.dominantVibe) : '#ccc'}; box-shadow: 0 0 20px ${localStats.dominantVibe ? this.getVibeColor(localStats.dominantVibe) + '40' : '#ccc40'};">
                  <i class="${localStats.dominantVibe ? this.getVibeIcon(localStats.dominantVibe) : 'fas fa-question-circle'}"></i>
                </div>
                <div class="local-vibe-info">
                  <div class="local-vibe-name" style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">${localStats.dominantVibe ? this.capitalizeFirstLetter(localStats.dominantVibe) : 'No Data'}</div>
                  <div class="local-vibe-percentage" style="font-size: 32px; font-weight: bold; background: linear-gradient(135deg, var(--primary), var(--primary-dark)); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 8px;">${localStats.dominantVibe && localStats.percentage > 0 ? localStats.percentage + '%' : ''}</div>
                  <div class="local-area-address" style="font-size: 14px; color: var(--text-light); display: flex; align-items: center; gap: 6px; margin-top: 8px;"><i class="fas fa-map-pin"></i> ${localStats.address || 'Your Area'}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-title">
              <i class="fas fa-chart-bar"></i>
              <span data-en="Community Vibe" data-ar="حالة المجتمع">Community Vibe</span>
            </div>
            <div class="vibe-sidebars-chart">
              ${Object.entries(stats.vibeDistribution)
                .sort(([,a], [,b]) => b - a) // Sort by count descending
                .map(([vibe, count]) => {
                  const percentage = stats.totalReports > 0 ? (count / stats.totalReports) * 100 : 0;
                  return `
                    <div class="vibe-sidebar-item">
                      <div class="vibe-sidebar-label">
                        <i class="${this.getVibeIcon(vibe)}"></i>
                        <span>${this.capitalizeFirstLetter(vibe)}</span>
                      </div>
                      <div class="vibe-sidebar-bar">
                        <div class="vibe-sidebar-fill" style="width: ${percentage}%; background: ${this.getVibeColor(vibe)}"></div>
                      </div>
                      <div class="vibe-sidebar-count">${count}</div>
                      <div class="vibe-sidebar-percentage">${percentage.toFixed(1)}%</div>
                    </div>
                  `;
                }).join('')}
            </div>
          </div>

          <div class="card">
            <div class="card-title">
              <i class="fas fa-chart-line"></i>
              <span data-en="Safety Trend Analysis" data-ar="تحليل اتجاهات السلامة">Safety Trend Analysis</span>
            </div>
            <div class="safety-trend-chart">
              <div class="trend-metrics">
                <div class="trend-metric">
                  <div class="trend-label" data-en="Safety Score Trend" data-ar="اتجاه درجة السلامة">Safety Score Trend</div>
                  <div class="trend-value ${stats.safetyScore >= 70 ? 'safe' : stats.safetyScore >= 40 ? 'moderate' : 'dangerous'}">
                    ${stats.safetyScore}%
                  </div>
                </div>
                <div class="trend-metric">
                  <div class="trend-label" data-en="Danger Reports" data-ar="تقارير الخطر">Danger Reports</div>
                  <div class="trend-value dangerous">
                    ${stats.vibeDistribution.dangerous || 0}
                  </div>
                </div>
                <div class="trend-metric">
                  <div class="trend-label" data-en="Community Response" data-ar="استجابة المجتمع">Community Response</div>
                  <div class="trend-value ${stats.averageUpvotes >= 2 ? 'good' : 'moderate'}">
                    ${stats.averageUpvotes} avg upvotes
                  </div>
                </div>
              </div>
              <div class="safety-indicators">
                <div class="safety-indicator">
                  <div class="indicator-bar">
                    <div class="indicator-fill ${stats.safetyScore >= 70 ? 'safe' : stats.safetyScore >= 40 ? 'moderate' : 'dangerous'}"
                         style="width: ${100 - stats.safetyScore}%"></div>
                  </div>
                  <div class="indicator-labels">
                    <span data-en="Low Risk" data-ar="خطر منخفض">Low Risk</span>
                    <span data-en="Moderate" data-ar="متوسط">Moderate</span>
                    <span data-en="High Risk" data-ar="خطر عالي">High Risk</span>
                  </div>
                </div>
              </div>
              <div class="trend-insights">
                <div class="insight-item">
                  <i class="fas ${stats.safetyScore >= 70 ? 'fa-shield-alt' : stats.safetyScore >= 40 ? 'fa-exclamation-triangle' : 'fa-exclamation-circle'}"></i>
                  <span data-en="${stats.safetyScore >= 70 ? 'Area appears generally safe' : stats.safetyScore >= 40 ? 'Exercise caution in this area' : 'High danger reports - take precautions'}" data-ar="${stats.safetyScore >= 70 ? 'المنطقة تبدو آمنة بشكل عام' : stats.safetyScore >= 40 ? 'تحلى بالحذر في هذه المنطقة' : 'تقارير خطر عالية - اتخذ احتياطاتك'}">
                    ${stats.safetyScore >= 70 ? 'Area appears generally safe' : stats.safetyScore >= 40 ? 'Exercise caution in this area' : 'High danger reports - take precautions'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        `;

        // Replace the stats grid with enhanced version
        const statsContainer = document.getElementById('statsGrid').parentElement;
        statsContainer.innerHTML = enhancedStatsHtml;

        this.updateTextDirection();
      }

      calculateLocalAreaStats(stats) {
        // Calculate stats for reports within expanding radius of user location
        const localStats = {
          totalLocalReports: 0,
          vibeDistribution: {},
          dominantVibe: null,
          percentage: 0,
          radius: 1,
          address: null,
          hasLocationData: false
        };

        // DEBUG: Log location and report data status
        console.log('=== Local Area Stats Debug ===');
        console.log('User location available:', !!this.userLocation);
        if (this.userLocation) {
          console.log('User coordinates:', this.userLocation.latitude, this.userLocation.longitude);
        }
        console.log('Reports available:', !!stats.reports);
        console.log('Number of reports:', stats.reports ? stats.reports.length : 0);

        if (stats.reports && stats.reports.length > 0) {
          console.log('Sample report data:');
          console.log('Report 1:', {
            id: stats.reports[0].id,
            vibe_type: stats.reports[0].vibe_type,
            location: stats.reports[0].location,
            hasLatitude: !!stats.reports[0].latitude,
            hasLongitude: !!stats.reports[0].longitude,
            latitude: stats.reports[0].latitude,
            longitude: stats.reports[0].longitude
          });
        }

        if (!stats.reports) {
          console.log('❌ Returning "No Data" - no reports available');
          return localStats;
        }

        if (!this.userLocation) {
          console.log('No user location available, will fall back to general community stats');
          // Continue to fallback logic below
        }

        const userLat = this.userLocation.latitude;
        const userLng = this.userLocation.longitude;

        // Try expanding radii until we find reports (strictly location-based only)
        const radii = [1, 2, 5, 10, 25];

        for (const radius of radii) {
          localStats.totalLocalReports = 0;
          localStats.vibeDistribution = {};
          localStats.radius = radius;

          stats.reports.forEach(report => {
            if (report.latitude && report.longitude) {
              const distance = this.calculateDistance(userLat, userLng, report.latitude, report.longitude);
              if (distance <= radius) {
                localStats.totalLocalReports++;
                localStats.vibeDistribution[report.vibe_type] = (localStats.vibeDistribution[report.vibe_type] || 0) + 1;
                localStats.hasLocationData = true;
              }
            }
          });

          if (localStats.totalLocalReports > 0) {
            break; // Found reports within this radius, use it
          }
        }

        // Always try to get address for user location if available
        if (this.userLocation) {
          this.getAddressFromCoordinates(userLat, userLng, (address) => {
            localStats.address = address;
            this.updateLocalAreaDisplay(localStats);
          });
        }

        // Calculate dominant vibe and percentage (only for location-based reports)
        if (localStats.totalLocalReports > 0 && localStats.hasLocationData) {
          let maxCount = 0;
          for (const [vibe, count] of Object.entries(localStats.vibeDistribution)) {
            if (count > maxCount) {
              maxCount = count;
              localStats.dominantVibe = vibe;
            }
          }
          localStats.percentage = Math.round((maxCount / localStats.totalLocalReports) * 100);
        }

        // If no local reports found, fall back to general community stats
        if (localStats.totalLocalReports === 0) {
          localStats.totalLocalReports = stats.totalReports;
          localStats.vibeDistribution = stats.vibeDistribution;
          localStats.radius = 'General Area';
          // Calculate dominant vibe from general stats
          let maxCount = 0;
          for (const [vibe, count] of Object.entries(stats.vibeDistribution)) {
            if (count > maxCount) {
              maxCount = count;
              localStats.dominantVibe = vibe;
            }
          }
          localStats.percentage = stats.totalReports > 0 ? Math.round((maxCount / stats.totalReports) * 100) : 0;
        }

        return localStats;
      }

      // Load weather data
      async loadWeatherData() {
        if (!this.userLocation) {
          console.log('No user location available for weather data');
          return;
        }

        try {
          const apiKey = 'bd5e378503939ddaee76f12ad7a97608'; // Working API key
          const { latitude, longitude } = this.userLocation;

          const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`
          );

          if (!response.ok) {
            console.error('Weather API error:', response.status);
            return;
          }

          const weatherData = await response.json();

          // Store weather data with timestamp
          const weatherInfo = {
            temperature: Math.round(weatherData.main.temp),
            condition: weatherData.weather[0].description,
            icon: weatherData.weather[0].icon,
            humidity: weatherData.main.humidity,
            windSpeed: weatherData.wind.speed,
            timestamp: Date.now()
          };

          localStorage.setItem('hyperapp_weather_data', JSON.stringify(weatherInfo));
          localStorage.setItem('hyperapp_weather_time', Date.now().toString());

          // Update weather display
          this.updateWeatherDisplay(weatherInfo);

        } catch (error) {
          console.error('Error loading weather data:', error);
        }
      }

      // Update weather display in UI
      updateWeatherDisplay(weatherData) {
        const weatherContainer = document.getElementById('weatherInfo');
        if (!weatherContainer || !weatherData) return;

        const temp = weatherData.temperature;
        const condition = weatherData.condition;
        const icon = weatherData.icon;

        weatherContainer.innerHTML = `
          <div class="weather-item">
            <i class="fas fa-thermometer-half"></i>
            <span>${temp}°C</span>
          </div>
          <div class="weather-item">
            <img src="https://openweathermap.org/img/wn/${icon}.png" alt="${condition}" style="width: 24px; height: 24px;">
            <span>${condition}</span>
          </div>
        `;

        this.updateTextDirection();
      }

      // Load user mood vote (if exists)
      async loadUserMoodVote() {
        if (!this.isAuthenticated || !this.userData) return;

        try {
          const { data: moodVote, error } = await this.supabase
            .from('mood_votes')
            .select('*')
            .eq('user_id', this.userData.id)
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
            .order('created_at', { ascending: false })
            .limit(1);

          if (error) {
            console.error("Error loading user mood vote:", error);
            return;
          }

          if (moodVote && moodVote.length > 0) {
            const vote = moodVote[0];
            // Update UI to show selected mood
            const moodCard = document.querySelector(`.mood-vote-card[data-mood="${vote.mood_type}"]`);
            if (moodCard) {
              moodCard.classList.add('selected');
            }
          }
        } catch (error) {
          console.error("Error loading user mood vote:", error);
        }
      }

      // Setup real-time subscriptions
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
            console.log('New report received:', payload);
            // Refresh nearby reports
            this.loadNearbyReports();
          })
          .subscribe();

        // Subscribe to report votes
        this.supabase
          .channel('votes')
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'votes'
          }, (payload) => {
            console.log('New vote received:', payload);
            // Refresh nearby reports to show updated vote counts
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
            console.log('New mood vote received:', payload);
            // Update mood counts
            this.updateMoodCounts();
          })
          .subscribe();
      }

      // Update stats (legacy method for backward compatibility)
      updateStats() {
        // This method is kept for backward compatibility
        // The actual stats updating is now handled in renderStatsCharts
        this.loadEnhancedStats();
      }

      // Get current location (legacy method)
      getCurrentLocation(callback) {
        this.getCurrentLocationPromise().then(callback).catch(() => callback(null));
      }

      // Get current location as promise
      getCurrentLocationPromise() {
        return new Promise((resolve, reject) => {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const { latitude, longitude } = position.coords;
                resolve(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
              },
              (error) => {
                reject(error);
              },
              {
                timeout: 10000,
                enableHighAccuracy: true,
                maximumAge: 300000
              }
            );
          } else {
            reject(new Error('Geolocation not supported'));
          }
        });
      }

      // Get address from coordinates
      getAddressFromCoordinates(lat, lng, callback) {
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`)
          .then(response => response.json())
          .then(data => {
            if (data && data.display_name) {
              const address = data.display_name.split(',')[0] + ', ' + data.display_name.split(',')[1];
              callback(address.trim());
            } else {
              callback(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            }
          })
          .catch(error => {
            callback(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
          });
      }

      // Load top areas (legacy method)
      loadTopAreas() {
        // Implementation moved to the main loadTopAreas method
        this.loadTopAreas();
      }

      // Setup event listeners
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

        // Close modals
        document.querySelectorAll('.close').forEach(closeBtn => {
          closeBtn.addEventListener('click', (e) => {
            const modalId = e.currentTarget.getAttribute('data-dismiss');
            this.closeModal(modalId);
          });
        });

        // Vibe selection
        document.querySelectorAll('.vibe-option').forEach(option => {
          option.addEventListener('click', (e) => {
            const vibe = e.currentTarget.getAttribute('data-vibe');
            this.selectVibe(vibe);
          });
        });

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

        // Vote buttons (delegated)
        document.addEventListener('click', (e) => {
          if (e.target.classList.contains('upvote-btn') || e.target.classList.contains('downvote-btn')) {
            e.preventDefault();
            const reportId = e.target.getAttribute('data-report-id');
            const voteType = e.target.getAttribute('data-vote-type');
            this.voteReport(reportId, voteType);
          }
        });

        // Mood voting
        document.querySelectorAll('.mood-vote-card').forEach(card => {
          card.addEventListener('click', (e) => {
            const moodType = e.currentTarget.getAttribute('data-mood');
            this.selectMood(moodType);
          });
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

        // Location button
        const locationBtn = document.getElementById('locationBtn');
        if (locationBtn) {
          locationBtn.addEventListener('click', () => this.requestUserLocationManually());
        }

        // Privacy policy
        const privacyBtn = document.getElementById('privacyBtn');
        if (privacyBtn) {
          privacyBtn.addEventListener('click', () => this.showPrivacyPolicy());
        }

        // Top areas
        const topAreasBtn = document.getElementById('topAreasBtn');
        if (topAreasBtn) {
          topAreasBtn.addEventListener('click', () => this.loadTopAreas());
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
          // Escape key closes modals
          if (e.key === 'Escape') {
            document.querySelectorAll('.modal').forEach(modal => {
              modal.style.display = 'none';
            });
          }

          // Ctrl/Cmd + R reloads data
          if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
            e.preventDefault();
            this.loadNearbyReports(0, true);
          }
        });

        // Window resize handling
        window.addEventListener('resize', () => {
          // Update map size if visible
          if (this.map) {
            this.map.invalidateSize();
          }
        });

        // Online/offline handling
        window.addEventListener('online', () => {
          this.updateConnectionStatus(true);
          this.showNotification('Back online', 'success');
          // Sync any offline data
          this.syncOfflineData();
        });

        window.addEventListener('offline', () => {
          this.updateConnectionStatus(false);
          this.showNotification('You are offline. Some features may be limited.', 'warning');
        });

        // Page visibility change
        document.addEventListener('visibilitychange', () => {
          if (!document.hidden) {
            // Page became visible again, refresh data
            this.loadNearbyReports(0, true);
          }
        });
      }

      // Toggle theme
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

        this.showNotification(`Switched to ${newTheme} theme`, 'info');
      }

      // Sync offline data when back online
      async syncOfflineData() {
        try {
          // Check for offline reports to sync
          const offlineReports = JSON.parse(localStorage.getItem('hyperapp_offline_reports') || '[]');

          for (const report of offlineReports) {
            try {
              const { data, error } = await this.supabase
                .from('reports')
                .insert([report]);

              if (!error) {
                console.log('Synced offline report:', report.id);
              }
            } catch (error) {
              console.error('Failed to sync offline report:', error);
            }
          }

          // Clear offline reports after sync attempt
          localStorage.removeItem('hyperapp_offline_reports');
        } catch (error) {
          console.error('Error syncing offline data:', error);
        }
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
            console.error("Error loading geofence settings:", error);
            return;
          }

          this.geofenceSettings = settings || {
            enabled: false,
            radius: 1000, // 1km default
            zones: []
          };

          this.geofenceEnabled = this.geofenceSettings.enabled;

          if (this.geofenceEnabled) {
            this.startGeofenceMonitoring();
          }
        } catch (error) {
          console.error("Error loading geofence settings:", error);
        }
      }

      async saveGeofenceSettings() {
        if (!this.isAuthenticated || !this.geofenceSettings) return;

        try {
          const { error } = await this.supabase
            .from('geofence_settings')
            .upsert({
              user_id: this.userData.id,
              enabled: this.geofenceSettings.enabled,
              radius: this.geofenceSettings.radius,
              zones: this.geofenceSettings.zones
            });

          if (error) {
            console.error("Error saving geofence settings:", error);
          }
        } catch (error) {
          console.error("Error saving geofence settings:", error);
        }
      }

      toggleGeofenceMonitoring() {
        this.geofenceEnabled = !this.geofenceEnabled;

        if (this.geofenceEnabled) {
          this.startGeofenceMonitoring();
        } else {
          this.stopGeofenceMonitoring();
        }

        this.saveGeofenceSettings();
      }

      startGeofenceMonitoring() {
        if (!navigator.geolocation || !this.geofenceSettings) return;

        this.stopGeofenceMonitoring(); // Stop any existing monitoring

        this.geofenceWatchId = navigator.geolocation.watchPosition(
          (position) => {
            this.handleGeofencePositionUpdate(position);
          },
          (error) => {
            console.error("Geofence position error:", error);
          },
          {
            enableHighAccuracy: true,
            timeout: 30000,
            maximumAge: 60000
          }
        );

        console.log('Geofence monitoring started');
      }

      stopGeofenceMonitoring() {
        if (this.geofenceWatchId) {
          navigator.geolocation.clearWatch(this.geofenceWatchId);
          this.geofenceWatchId = null;
        }

        this.currentGeofenceZones.clear();
        console.log('Geofence monitoring stopped');
      }

      handleGeofencePositionUpdate(position) {
        const { latitude, longitude } = position.coords;
        const currentPosition = { latitude, longitude };

        // Check if we've moved significantly since last check
        if (this.lastGeofenceCheck) {
          const distance = this.calculateDistance(
            this.lastGeofenceCheck.latitude,
            this.lastGeofenceCheck.longitude,
            latitude,
            longitude
          );

          // Only check geofences if moved more than 50 meters
          if (distance < 0.05) return;
        }

        this.lastGeofenceCheck = currentPosition;

        // Check proximity to dangerous areas
        this.checkGeofenceStatus(currentPosition);
      }

      async checkGeofenceStatus(position) {
        try {
          // Get recent dangerous reports within geofence radius
          const { data: dangerousReports, error } = await this.supabase
            .from('reports')
            .select('id, vibe_type, location, latitude, longitude, created_at')
            .eq('vibe_type', 'dangerous')
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
            .not('latitude', 'is', null)
            .not('longitude', 'is', null);

          if (error) {
            console.error("Error checking geofence status:", error);
            return;
          }

          const currentZones = new Set();
          const radius = this.geofenceSettings?.radius || 1000; // meters

          dangerousReports.forEach(report => {
            const distance = this.calculateDistance(
              position.latitude,
              position.longitude,
              report.latitude,
              report.longitude
            ) * 1000; // Convert to meters

            if (distance <= radius) {
              currentZones.add(report.id);
            }
          });

          // Check for entered zones
          const enteredZones = [...currentZones].filter(id => !this.currentGeofenceZones.has(id));
          const exitedZones = [...this.currentGeofenceZones].filter(id => !currentZones.has(id));

          // Handle zone transitions
          enteredZones.forEach(zoneId => {
            const report = dangerousReports.find(r => r.id === zoneId);
            if (report) {
              this.handleGeofenceEvent('enter', report);
            }
          });

          exitedZones.forEach(zoneId => {
            const report = dangerousReports.find(r => r.id === zoneId);
            if (report) {
              this.handleGeofenceEvent('exit', report);
            }
          });

          this.currentGeofenceZones = currentZones;
        } catch (error) {
          console.error("Error checking geofence status:", error);
        }
      }

      handleGeofenceEvent(eventType, report) {
        const priority = this.getGeofenceNotificationPriority(report);
        const message = this.getGeofenceNotificationMessage(eventType, report);

        // Send notification
        this.sendGeofenceNotification(message, priority);

        // Log geofence event
        console.log(`Geofence ${eventType}:`, report);
      }

      getGeofenceNotificationPriority(report) {
        // Calculate priority based on report recency and upvotes
        const hoursSinceReport = (Date.now() - new Date(report.created_at).getTime()) / (1000 * 60 * 60);
        const upvotes = report.upvotes || 0;

        if (hoursSinceReport < 1 && upvotes >= 5) return 'high';
        if (hoursSinceReport < 6 && upvotes >= 2) return 'medium';
        return 'low';
      }

      getGeofenceNotificationMessage(eventType, report) {
        const location = report.location || 'Unknown location';

        if (eventType === 'enter') {
          return `⚠️ Entering dangerous area: ${location}. Stay alert and consider alternative routes.`;
        } else {
          return `✅ Exited dangerous area: ${location}.`;
        }
      }

      sendGeofenceNotification(message, priority = 'medium') {
        // Use the notification system
        const type = priority === 'high' ? 'error' : priority === 'medium' ? 'warning' : 'info';
        this.showNotification(message, type);

        // If high priority and supported, could also send push notification
        if (priority === 'high' && 'Notification' in window && Notification.permission === 'granted') {
          new Notification('HyperApp Safety Alert', {
            body: message,
            icon: '/icon-192x192.png'
          });
        }
      }

      // Utility methods
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

      calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
      }

      updateTextDirection() {
        document.body.setAttribute('dir', this.currentLanguage === 'ar' ? 'rtl' : 'ltr');
      }

      // Error handling and logging
      logError(error) {
        console.error('HyperApp Error:', error);
        // Could send to error reporting service
      }

      // Performance monitoring
      startPerformanceMonitoring() {
        if ('performance' in window && 'PerformanceObserver' in window) {
          // Monitor long tasks
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.duration > 50) { // Tasks longer than 50ms
                console.warn('Long task detected:', entry);
              }
            }
          });
          observer.observe({ entryTypes: ['longtask'] });
        }
      }

      // Memory management
      cleanup() {
        // Clear intervals
        if (this.weatherAlertInterval) {
          clearInterval(this.weatherAlertInterval);
        }

        // Stop geofence monitoring
        this.stopGeofenceMonitoring();

        // Clear event listeners (would need to store references)
        // Unsubscribe from real-time subscriptions
        if (this.supabase) {
          this.supabase.removeAllChannels();
        }
      }
    }

    // Initialize the app when DOM is loaded
    document.addEventListener('DOMContentLoaded', () => {
      window.hyperApp = new HyperApp();
    });

    // Export for module usage (if needed)
    if (typeof module !== 'undefined' && module.exports) {
      module.exports = HyperApp;
    }
