// Data Manager - Handles API calls and data management
class DataManager {
  constructor(app) {
    this.app = app;
  }

  checkCriticalDependencies() {
    // Simple check for Supabase (most critical)
    if (typeof window.supabase === 'undefined') {
      console.warn('Supabase library not loaded');
      this.app.uiManager.showNotification('Some features may be limited', 'info');
    }

    // Check Telegram WebApp
    if (!window.Telegram || !window.Telegram.WebApp) {
      console.warn('Telegram WebApp not available');
    }
  }

  async validateDatabaseSchema() {
    try {
      console.log('🔍 Validating database schema...');

      if (typeof DatabaseValidator !== 'undefined') {
        const validator = new DatabaseValidator(this.app.supabase);
        const isValid = await validator.validateSchema();

        if (isValid) {
          console.log('✅ Database schema validation passed');
          this.app.uiManager.showNotification('Database schema validated successfully', 'success');
        } else {
          console.warn('⚠️ Database schema validation found issues');
          this.app.uiManager.showNotification('Database schema has some issues - some features may be limited', 'warning');
        }
      } else {
        console.warn('DatabaseValidator not available, skipping schema validation');
      }
    } catch (error) {
      console.error('❌ Database schema validation failed:', error);
      this.app.uiManager.showNotification('Database validation failed - some features may not work properly', 'error');
    }
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
      let supabaseClient = this.app.supabase;
      if (force) {
        supabaseClient = window.supabase.createClient(this.app.supabaseUrl, this.app.supabaseKey);
      }

      const { data: reports, error } = await supabaseClient
        .from('reports')
        .select(`id, vibe_type, location, notes, created_at, upvotes, downvotes, latitude, longitude, votes (user_id, vote_type)`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        // Enhanced error handling with specific messages and fallback mechanisms
        let errorMessage = this.app.currentLanguage === 'en' ? 'Error loading reports.' : 'خطأ في تحميل التقارير.';
        let retryText = this.app.currentLanguage === 'en' ? 'Tap to retry' : 'اضغط لإعادة المحاولة';

        // Handle different error types with appropriate fallbacks
        if (error.message?.includes('network') || error.message?.includes('fetch') || error.name === 'TypeError') {
          errorMessage = this.app.currentLanguage === 'en' ? 'Network error. Check your connection.' : 'خطأ في الشبكة. تحقق من اتصالك.';
        } else if (error.message?.includes('permission') || error.message?.includes('auth')) {
          errorMessage = this.app.currentLanguage === 'en' ? 'Authentication error. Please login again.' : 'خطأ في المصادقة. يرجى تسجيل الدخول مرة أخرى.';
          // Trigger auth modal for auth errors
          setTimeout(() => this.app.authManager.showAuthModal(), 1000);
        } else if (error.message?.includes('timeout')) {
          errorMessage = this.app.currentLanguage === 'en' ? 'Request timed out. Please try again.' : 'انتهت مهلة الطلب. يرجى المحاولة مرة أخرى.';
        } else if (error.code === 'PGRST301' || error.message?.includes('rate limit')) {
          errorMessage = this.app.currentLanguage === 'en' ? 'Service temporarily unavailable. Please try again later.' : 'الخدمة غير متاحة مؤقتاً. يرجى المحاولة لاحقاً.';
        }

        // Retry on network errors with exponential backoff
        if (retryCount < maxRetries && (error.message?.includes('network') || error.message?.includes('fetch') || error.name === 'TypeError' || error.message?.includes('timeout'))) {
          const delay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Exponential backoff, max 5s

          setTimeout(() => this.loadNearbyReports(retryCount + 1, force), delay);
          return;
        }

        // Show error with retry option and fallback message
        const fallbackMessage = this.app.currentLanguage === 'en'
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
      this.app.nearbyReports = reports.map(report => {
        const userVote = report.votes && report.votes.length > 0 ?
          report.votes.find(v => v.user_id === this.app.userData?.id)?.vote_type : null;

        return { ...report, user_vote: userVote };
      });

      this.app.uiManager.displayNearbyReports();

      // Update connection status to connected
      this.app.uiManager.updateConnectionStatus(true);

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
        const errorMsg = this.app.currentLanguage === 'en' ? 'Unable to load reports. Please check your connection and try again.' : 'تعذر تحميل التقارير. يرجى التحقق من اتصالك وحاول مرة أخرى.';
        container.innerHTML = `
          <div class="no-data error-state" onclick="window.app.loadNearbyReports()">
            <i class="fas fa-wifi-slash"></i>
            <p>${errorMsg}</p>
            <small style="color: var(--text-muted); cursor: pointer;">${this.app.currentLanguage === 'en' ? 'Tap to retry' : 'اضغط لإعادة المحاولة'}</small>
          </div>
        `;
      }

      // Update connection status to disconnected
      this.app.uiManager.updateConnectionStatus(false);

      throw error; // Re-throw to indicate failure
    }
  }

  async loadUserReports() {
    if (!this.app.userData) return;

    try {
      const userReportsContainer = document.getElementById('userReports');
      if (!userReportsContainer) {
        console.warn('User reports container not found');
        return;
      }

      userReportsContainer.innerHTML = '<div class="loading-spinner"></div>';

      const { data: reports, error } = await this.app.supabase
        .from('reports')
        .select('*')
        .eq('user_id', this.app.userData.id)
        .order('created_at', { ascending: false });

      if (error) {
        userReportsContainer.innerHTML =
          '<div class="no-data" data-en="Error loading your reports" data-ar="خطأ في تحميل تقاريرك">Error loading your reports</div>';
        return;
      }

      this.app.userReports = reports;
      this.app.uiManager.displayUserReports();
    } catch (error) {
      console.error('Error in loadUserReports:', error);
      const userReportsContainer = document.getElementById('userReports');
      if (userReportsContainer) {
        userReportsContainer.innerHTML =
          '<div class="no-data" data-en="Error loading your reports" data-ar="خطأ في تحميل تقاريرك">Error loading your reports</div>';
      }
    }
  }

  async voteReport(reportId, voteType) {
    if (!this.app.isAuthenticated) {
      this.app.authManager.showAuthModal();
      this.app.uiManager.showNotification("Please login to vote", "error");
      return;
    }

    try {
      // Get current session to ensure we're authenticated
      const { data: sessionData, error: sessionError } = await this.app.supabase.auth.getSession();

      if (sessionError || !sessionData.session) {
        this.app.uiManager.showNotification("Authentication expired. Please login again.", "error");
        this.app.authManager.showAuthModal();
        return;
      }

      // Use the authenticated user ID from the session
      const authUserId = sessionData.session.user.id;

      const { data: existingVote, error: voteError } = await this.app.supabase
        .from('votes')
        .select('*')
        .eq('user_id', authUserId)
        .eq('report_id', reportId)
        .maybeSingle();

      if (voteError && voteError.code !== 'PGRST116') {
        console.error("Error checking vote:", voteError);
        this.app.uiManager.showNotification("Failed to submit vote", "error");
        return;
      }

      let operation;

      if (existingVote) {
        if (existingVote.vote_type === voteType) {
          const { error: deleteError } = await this.app.supabase
            .from('votes')
            .delete()
            .eq('id', existingVote.id);

          if (deleteError) {
            console.error("Error removing vote:", deleteError);
            this.app.uiManager.showNotification("Failed to update vote", "error");
            return;
          }

          operation = 'remove';
        } else {
          const { error: updateError } = await this.app.supabase
            .from('votes')
            .update({ vote_type: voteType })
            .eq('id', existingVote.id);

          if (updateError) {
            console.error("Error updating vote:", updateError);
            this.app.uiManager.showNotification("Failed to update vote", "error");
            return;
          }

          operation = 'change';
        }
      } else {
        const { error: insertError } = await this.app.supabase
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
          this.app.uiManager.showNotification("Failed to submit vote", "error");
          return;
        }

        operation = 'add';
      }

      // Update UI locally for immediate feedback
      this.updateVoteUI(reportId, voteType, operation);
      this.app.uiManager.showNotification("Vote recorded", "success");
    } catch (error) {
      console.error("Error voting on report:", error);
      this.app.uiManager.showNotification("Failed to submit vote", "error");
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
    const reportIndex = this.app.nearbyReports.findIndex(r => r.id == reportId);
    if (reportIndex !== -1) {
      this.app.nearbyReports[reportIndex].upvotes = upvotes;
      this.app.nearbyReports[reportIndex].downvotes = downvotes;
      this.app.nearbyReports[reportIndex].user_vote = operation === 'remove' ? null : voteType;
    }
  }

  async requestUserLocation() {
    return new Promise((resolve, reject) => {
      // Use cached location if available and recent (within 5 minutes)
      if (this.app.userLocation && this.app.userLocation.timestamp) {
        const age = Date.now() - this.app.userLocation.timestamp;
        if (age < 300000) { // 5 minutes
          this.getAddressFromCoordinates(this.app.userLocation.latitude, this.app.userLocation.longitude, (address) => {
            resolve(address || `${this.app.userLocation.latitude.toFixed(4)}, ${this.app.userLocation.longitude.toFixed(4)}`);
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
          this.app.userLocation = {
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

  async calculateUserReputation(userId) {
    try {
      // Get user's reports and their vote counts
      const { data: reports, error } = await this.app.supabase
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
    if (!this.app.isAuthenticated || !this.app.userData) return;

    try {
      const reputation = await this.calculateUserReputation(this.app.userData.id);

      // Update local user data
      this.app.userData.reputation = reputation;

      // Update database
      const { error } = await this.app.supabase
        .from('users')
        .update({ reputation: reputation })
        .eq('user_id', this.app.userData.id);

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
      const { data: reports, error } = await this.app.supabase
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
    if (!this.app.isAuthenticated || !this.app.userData) return;

    try {
      const currentBadges = await this.getUserBadges(this.app.userData.id);
      const badgeNames = currentBadges.map(badge => badge.name);

      // Check if user unlocked new badges
      const savedBadges = JSON.parse(localStorage.getItem('hyperapp-badges') || '[]');
      const newBadges = badgeNames.filter(name => !savedBadges.includes(name));

      if (newBadges.length > 0) {
        // Show badge notification
        newBadges.forEach(badgeName => {
          const badge = currentBadges.find(b => b.name === badgeName);
          if (badge) {
            this.app.uiManager.showBadgeNotification(badge);
          }
        });

        // Save updated badges
        localStorage.setItem('hyperapp-badges', JSON.stringify(badgeNames));
      }
    } catch (error) {
      console.error("Error checking badge unlocks:", error);
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
        this.app.uiManager.renderStatsCharts(stats);
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

      const { data: recentReports, error: reportsError } = await this.app.supabase
        .from('reports')
        .select('vibe_type, created_at')
        .gte('created_at', yesterday.toISOString());

      if (reportsError) {
        console.error("Error fetching recent reports:", reportsError);
        return this.getDefaultStats();
      }

      // Get mood votes from last 24 hours
      const { data: recentMoodVotes, error: moodError } = await this.app.supabase
        .from('mood_votes')
        .select('mood_type')
        .gte('created_at', yesterday.toISOString());

      if (moodError) {
        console.error("Error fetching mood votes:", moodError);
      }

      // Calculate stats
      const vibeCounts = {};
      recentReports.forEach(report => {
        vibeCounts[report.vibe_type] = (vibeCounts[report.vibe_type] || 0) + 1;
      });

      const moodCounts = {};
      if (recentMoodVotes) {
        recentMoodVotes.forEach(vote => {
          moodCounts[vote.mood_type] = (moodCounts[vote.mood_type] || 0) + 1;
        });
      }

      const totalReports = recentReports.length;
      const totalMoodVotes = recentMoodVotes ? recentMoodVotes.length : 0;

      return {
        totalReports,
        totalMoodVotes,
        vibeCounts,
        moodCounts,
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
      totalMoodVotes: 0,
      vibeCounts: {},
      moodCounts: {},
      timestamp: new Date().toISOString()
    };
  }

  updateStatsDisplay(stats) {
    // Update basic stats
    const totalReportsEl = document.getElementById('totalReports');
    if (totalReportsEl) {
      totalReportsEl.textContent = stats.totalReports;
    }

    const totalMoodVotesEl = document.getElementById('totalMoodVotes');
    if (totalMoodVotesEl) {
      totalMoodVotesEl.textContent = stats.totalMoodVotes;
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

  setupRealtimeSubscriptions() {
    if (!this.app.supabase) {
      console.warn('Supabase not available for real-time subscriptions');
      return;
    }

    console.log('Setting up real-time subscriptions...');

    // Subscribe to reports changes
    this.reportsSubscription = this.app.supabase
      .channel('reports_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'reports'
      }, (payload) => {
        console.log('Reports change detected:', payload.eventType, payload.new, payload.old);
        this.handleReportsChange(payload);
      })
      .subscribe((status) => {
        console.log('Reports subscription status:', status);
        if (status === 'SUBSCRIBED') {
          this.app.uiManager.updateConnectionStatus(true);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          this.app.uiManager.updateConnectionStatus(false);
          // Attempt to reconnect after delay
          setTimeout(() => this.setupRealtimeSubscriptions(), 5000);
        }
      });

    // Subscribe to votes changes
    this.votesSubscription = this.app.supabase
      .channel('votes_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'votes'
      }, (payload) => {
        console.log('Votes change detected:', payload.eventType, payload.new, payload.old);
        this.handleVotesChange(payload);
      })
      .subscribe();

    // Subscribe to mood votes changes
    this.moodVotesSubscription = this.app.supabase
      .channel('mood_votes_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'mood_votes'
      }, (payload) => {
        console.log('Mood votes change detected:', payload.eventType, payload.new, payload.old);
        this.handleMoodVotesChange(payload);
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
      const existingIndex = this.app.nearbyReports.findIndex(r => r.id === newReport.id);
      if (existingIndex === -1) {
        this.app.nearbyReports.unshift(newReport); // Add to beginning
        this.app.uiManager.displayNearbyReports();

        // Also add to mapReports if it has coordinates
        if (newReport.latitude && newReport.longitude) {
          if (!this.app.mapReports) {
            this.app.mapReports = [];
          }
          this.app.mapReports.unshift(newReport);

          // Refresh map markers immediately if map is loaded
          if (this.app.map) {
            this.app.mapManager.addReportMarkers();
            this.app.mapManager.addHeatMapLayer();
          }
        }

        this.app.uiManager.showNotification('New report added nearby', 'info');
      }
    } else if (payload.eventType === 'UPDATE') {
      // Report updated
      const updatedReport = payload.new;
      const existingIndex = this.app.nearbyReports.findIndex(r => r.id === updatedReport.id);

      if (existingIndex !== -1) {
        // Update the report while preserving user_vote
        const userVote = this.app.nearbyReports[existingIndex].user_vote;
        this.app.nearbyReports[existingIndex] = { ...updatedReport, user_vote: userVote };
        this.app.uiManager.displayNearbyReports();

        // Also update in mapReports if it exists there
        if (this.app.mapReports) {
          const mapIndex = this.app.mapReports.findIndex(r => r.id === updatedReport.id);
          if (mapIndex !== -1) {
            this.app.mapReports[mapIndex] = { ...updatedReport, user_vote: userVote };
            // Refresh map markers if map is loaded
            if (this.app.map) {
              this.app.mapManager.addReportMarkers();
              this.app.mapManager.addHeatMapLayer();
            }
          }
        }
      }
    } else if (payload.eventType === 'DELETE') {
      // Report deleted
      const deletedId = payload.old.id;
      this.app.nearbyReports = this.app.nearbyReports.filter(r => r.id !== deletedId);
      this.app.uiManager.displayNearbyReports();

      // Also remove from mapReports if it exists there
      if (this.app.mapReports) {
        this.app.mapReports = this.app.mapReports.filter(r => r.id !== deletedId);
        // Refresh map markers if map is loaded
        if (this.app.map) {
          this.app.mapManager.addReportMarkers();
          this.app.mapManager.addHeatMapLayer();
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

  handleMoodVotesChange(payload) {
    console.log('Handling mood votes change:', payload.eventType, payload.new, payload.old);

    // Update mood counts when mood votes change
    this.app.updateMoodCounts();
  }

  async loadWeatherData(force = false) {
    if (!this.app.userLocation) {
      console.log('No user location available for weather data');
      return null;
    }

    try {
      // Check cache first (weather data is valid for 30 minutes)
      const cached = localStorage.getItem('hyperapp_weather_data');
      const cacheTime = localStorage.getItem('hyperapp_weather_time');

      if (!force && cached && cacheTime) {
        const age = Date.now() - parseInt(cacheTime);
        if (age < 30 * 60 * 1000) { // 30 minutes
          return JSON.parse(cached);
        }
      }

      // Fetch fresh weather data
      const apiKey = this.app.config.weatherApiKey;
      const { latitude, longitude } = this.app.userLocation;

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
      this.app.uiManager.showNotification('Weather data unavailable', 'info');
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
          <span>${this.app.uiManager.capitalizeFirstLetter(weatherData.description)}</span>
        </div>
      </div>
    `;

    this.app.uiManager.updateTextDirection();
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
    if (!this.app.userLocation) return;

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
    this.app.uiManager.showNotification(alert.message, alert.priority === 'high' ? 'warning' : 'info', 10000);

    // Store alert timestamp
    localStorage.setItem(`weather_alert_${alert.type}`, Date.now().toString());
  }

  updateCommunityInsights() {
    // Update community mood and activity insights
    this.app.updateMoodCounts();
    this.loadEnhancedStats();
  }
}
