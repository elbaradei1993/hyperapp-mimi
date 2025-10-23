// UI Manager - Handles DOM interactions and UI updates
class UIManager {
  constructor(app) {
    this.app = app;
  }

  updateConnectionStatus(connected) {
    this.app.isConnected = connected;
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
    if (this.app.userData) {
      const usernameElement = document.getElementById('settingsUsername');
      if (usernameElement) {
        usernameElement.textContent = this.app.userData.username || this.app.userData.first_name;
      }

      document.getElementById('userReputation').textContent = this.app.userData.reputation || 0;
      document.getElementById('settingsReputation').textContent = this.app.userData.reputation || 0;
    }
  }

  updateStats() {
    // Update basic stats display
    this.app.loadEnhancedStats();
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

  toggleLanguage() {
    this.app.currentLanguage = this.app.currentLanguage === 'en' ? 'ar' : 'en';
    document.getElementById('currentLanguage').textContent = this.app.currentLanguage.toUpperCase();
    this.applyLanguage(this.app.currentLanguage);

    // Save language preference if user is authenticated
    if (this.app.isAuthenticated) {
      this.app.supabase
        .from('users')
        .update({ language: this.app.currentLanguage })
        .eq('user_id', this.app.userData.id)
        .then(({ error }) => {
          if (error) {
            console.error("Error updating language preference:", error);
          }
        });
    }
  }

  changeLanguage(lang) {
    this.app.currentLanguage = lang;
    document.getElementById('currentLanguage').textContent = this.app.currentLanguage.toUpperCase();
    this.applyLanguage(this.app.currentLanguage);

    // Save language preference if user is authenticated
    if (this.app.isAuthenticated) {
      this.app.supabase
        .from('users')
        .update({ language: this.app.currentLanguage })
        .eq('user_id', this.app.userData.id)
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
    document.body.setAttribute('dir', this.app.currentLanguage === 'ar' ? 'rtl' : 'ltr');
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
      this.app.loadMap();
    } else if (viewId === 'reports') {
      this.app.loadUserDashboard();
    } else if (viewId === 'settings') {
      // Attach logout button event listener when settings view is shown
      const logoutBtn = document.getElementById('logoutBtn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', this.app.authManager.handleLogout.bind(this.app.authManager));
      }
    }
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
      const { data: reports, error } = await this.app.supabase
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

  displayNearbyReports() {
    const container = document.getElementById('nearbyReports');

    if (!this.app.nearbyReports || this.app.nearbyReports.length === 0) {
      container.innerHTML = '<div class="no-data" data-en="No reports nearby" data-ar="لا توجد تقارير قريبة">No reports nearby</div>';
      this.updateTextDirection();
      return;
    }

    container.innerHTML = this.app.nearbyReports.map(report => `
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
          <button class="vote-btn upvote-btn ${report.user_vote === 'upvote' ? 'active' : ''}" data-report-id="${report.id}" data-vote-type="upvote" ${!this.app.isAuthenticated ? 'aria-disabled="true" title="Login to vote"' : ''}>
            <i class="fas fa-thumbs-up"></i> ${report.upvotes || 0}
          </button>
          <button class="vote-btn downvote-btn ${report.user_vote === 'downvote' ? 'active' : ''}" data-report-id="${report.id}" data-vote-type="downvote" ${!this.app.isAuthenticated ? 'aria-disabled="true" title="Login to vote"' : ''}>
            <i class="fas fa-thumbs-down"></i> ${report.downvotes || 0}
          </button>
        </div>
      </div>
    `).join('');

    // Vote buttons are handled by delegated event listener in setupEventListeners()

    this.updateTextDirection();
  }

  displayUserReports() {
    const container = document.getElementById('userReports');

    if (!this.app.userReports || this.app.userReports.length === 0) {
      container.innerHTML = '<div class="no-data" data-en="You haven\'t submitted any reports" data-ar="لم تقم بإرسال أي تقارير">You haven\'t submitted any reports</div>';
      this.updateTextDirection();
      return;
    }

    container.innerHTML = this.app.userReports.map(report => `
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

  showReportModal() {
    this.app.selectedVibe = null;
    document.querySelectorAll('.vibe-option').forEach(option => {
      option.classList.remove('selected');
    });

    // Get current location automatically
    this.app.getCurrentLocation((location) => {
      this.app.currentReportLocation = location;
    });

    document.getElementById('reportNotes').value = '';
    document.getElementById('reportModal').style.display = 'block';
  }

  selectVibe(vibe) {
    this.app.selectedVibe = vibe;
    document.querySelectorAll('.vibe-option').forEach(option => {
      option.classList.remove('selected');
    });
    document.querySelector(`.vibe-option[data-vibe="${vibe}"]`).classList.add('selected');
  }

  async submitReport() {
    if (!this.app.selectedVibe) {
      this.showNotification("Please select a vibe type", "error");
      return;
    }

    if (!this.app.currentReportLocation) {
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
      const { data: existingReports, error: checkError } = await this.app.supabase
        .from('reports')
        .select('id, created_at')
        .eq('vibe_type', this.app.selectedVibe)
        .eq('location', this.app.currentReportLocation)
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
          this.showNotification(`A ${this.capitalizeFirstLetter(this.app.selectedVibe)} report already exists for this location. Please try again later.`, "warning");
          this.closeModal('reportModal');
          return;
        }
      }

      // Prepare report data with coordinates if available
      const reportData = {
        user_id: null, // Anonymous report - no user association
        vibe_type: this.app.selectedVibe,
        location: this.app.currentReportLocation,
        notes: notes || null
      };

      // Add coordinates if available
      if (this.app.userLocation) {
        reportData.latitude = this.app.userLocation.latitude;
        reportData.longitude = this.app.userLocation.longitude;
      }

      const { data, error } = await this.app.supabase
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
        this.app.nearbyReports.unshift(newReport);

        // Also add to mapReports if it has coordinates (for immediate map display)
        if (newReport.latitude && newReport.longitude) {
          if (!this.app.mapReports) {
            this.app.mapReports = [];
          }
          this.app.mapReports.unshift(newReport);

          // Refresh map markers immediately if map is loaded
          if (this.app.map) {
            this.app.addReportMarkers();
            this.app.addHeatMapLayer();
          }
        }

        this.showNotification("Report submitted successfully", "success");
        this.closeModal('reportModal');
        // Update UI immediately
        this.displayNearbyReports();
        // Refresh map markers immediately if map is loaded
        if (this.app.map) {
          this.app.addReportMarkers();
          this.app.addHeatMapLayer();
        }
        // Reload data in background to ensure consistency
        this.app.loadNearbyReports();
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

  showEmergencyReport() {
    // Get current location automatically
    this.app.getCurrentLocation((location) => {
      this.app.currentEmergencyLocation = location;
    });

    document.getElementById('emergencyDetails').value = '';
    document.getElementById('emergencyModal').style.display = 'block';
  }

  async submitEmergencyReport() {
    if (!this.app.currentEmergencyLocation) {
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
      const { data: existingReports, error: checkError } = await this.app.supabase
        .from('reports')
        .select('id, created_at')
        .eq('vibe_type', 'dangerous')
        .eq('location', this.app.currentEmergencyLocation)
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

      const { data, error } = await this.app.supabase
        .from('reports')
        .insert([
          {
            user_id: null, // Anonymous report - no user association
            vibe_type: 'dangerous',
            location: this.app.currentEmergencyLocation,
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
        await this.app.loadNearbyReports();
        // Refresh map to show new emergency report
        this.app.loadMap();
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

  updateSafetyHub() {
    // Update safety tips based on current conditions
    this.generateDynamicSafetyTips();
  }

  generateDynamicSafetyTips() {
    const tips = [];

    // Location-based tips
    if (this.app.userLocation) {
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
    if (this.app.nearbyReports && this.app.nearbyReports.length > 0) {
      const dangerousReports = this.app.nearbyReports.filter(r => r.vibe_type === 'dangerous');
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

    // Mood distribution chart
    const moodChartCanvas = document.getElementById('moodChart');
    if (moodChartCanvas) {
      const ctx = moodChartCanvas.getContext('2d');

      const moodLabels = Object.keys(stats.moodCounts);
      const moodData = Object.values(stats.moodCounts);

      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: moodLabels.map(m => this.capitalizeFirstLetter(m)),
          datasets: [{
            label: 'Votes',
            data: moodData,
            backgroundColor: 'rgba(54, 162, 235, 0.8)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                stepSize: 1
              }
            }
          }
        }
      });
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

    // Mood voting
    document.querySelectorAll('.mood-vote-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const moodType = e.currentTarget.getAttribute('data-mood');
        this.app.selectMood(moodType);
      });
    });

    // Vote buttons (delegated event listener)
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('upvote-btn') || e.target.classList.contains('downvote-btn')) {
        e.preventDefault();
        const reportId = parseInt(e.target.getAttribute('data-report-id'));
        const voteType = e.target.getAttribute('data-vote-type');
        this.app.voteReport(reportId, voteType);
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

  // Utility methods
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
      return this.app.currentLanguage === 'en' ? 'Just now' : 'الآن';
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return this.app.currentLanguage === 'en'
        ? `${diffInMinutes} min ago`
        : `منذ ${diffInMinutes} دقيقة`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return this.app.currentLanguage === 'en'
        ? `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
        : `منذ ${diffInHours} ساعة`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    return this.app.currentLanguage === 'en'
      ? `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
      : `منذ ${diffInDays} يوم`;
  }
}
