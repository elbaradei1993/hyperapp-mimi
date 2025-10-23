// Geofence Manager - Handles geofencing functionality
class GeofenceManager {
  constructor(app) {
    this.app = app;
    this.geofenceEnabled = false;
    this.geofenceSettings = null;
    this.geofences = [];
    this.geofenceWatchId = null;
    this.currentGeofenceZones = new Set(); // Track which zones user is currently in
    this.lastGeofenceCheck = null;
  }

  async loadGeofenceSettings() {
    if (!this.app.isAuthenticated) return;

    try {
      const { data, error } = await this.app.supabase
        .from('user_geofence_settings')
        .select('*')
        .eq('user_id', this.app.userData.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading geofence settings:', error);
        return;
      }

      if (data) {
        this.geofenceSettings = data;
        this.geofenceEnabled = data.enabled;
      } else {
        // Create default settings
        this.geofenceSettings = {
          user_id: this.app.userData.id,
          enabled: false,
          radius: 500, // 500 meters
          notify_on_enter: true,
          notify_on_exit: false
        };
        await this.saveGeofenceSettings();
      }

      // Update UI based on settings
      this.updateGeofenceToggleUI();
    } catch (error) {
      console.error('Error in loadGeofenceSettings:', error);
    }
  }

  async saveGeofenceSettings() {
    if (!this.app.isAuthenticated || !this.geofenceSettings) return;

    try {
      const { error } = await this.app.supabase
        .from('user_geofence_settings')
        .upsert(this.geofenceSettings);

      if (error) {
        console.error('Error saving geofence settings:', error);
        this.app.uiManager.showNotification("Failed to save geofence settings", "error");
      } else {
        this.app.uiManager.showNotification("Geofence settings saved", "success");
      }
    } catch (error) {
      console.error('Error in saveGeofenceSettings:', error);
      this.app.uiManager.showNotification("Failed to save geofence settings", "error");
    }
  }

  async toggleGeofenceMonitoring() {
    if (!this.app.isAuthenticated) {
      this.app.authManager.showAuthModal();
      return;
    }

    this.geofenceEnabled = !this.geofenceEnabled;

    if (this.geofenceSettings) {
      this.geofenceSettings.enabled = this.geofenceEnabled;
      await this.saveGeofenceSettings();
    }

    if (this.geofenceEnabled) {
      await this.startGeofenceMonitoring();
      this.app.uiManager.showNotification("Geofence monitoring enabled", "success");
    } else {
      this.stopGeofenceMonitoring();
      this.app.uiManager.showNotification("Geofence monitoring disabled", "info");
    }

    this.updateGeofenceToggleUI();
  }

  updateGeofenceToggleUI() {
    // Update the geofence toggle in the safety hub
    const geofenceControl = document.getElementById('geofenceControl');
    const geofenceToggleBtn = document.getElementById('geofenceToggleBtn');
    const geofenceStatusText = document.getElementById('geofenceStatusText');

    if (!geofenceControl || !geofenceToggleBtn || !geofenceStatusText) return;

    // Update toggle button state
    if (this.geofenceEnabled) {
      geofenceToggleBtn.classList.add('active');
      geofenceStatusText.textContent = 'Active - Monitoring zones';
      geofenceStatusText.setAttribute('data-en', 'Active - Monitoring zones');
      geofenceStatusText.setAttribute('data-ar', 'نشط - مراقبة المناطق');
      geofenceControl.classList.add('active');
    } else {
      geofenceToggleBtn.classList.remove('active');
      geofenceStatusText.textContent = 'Disabled - Click to enable';
      geofenceStatusText.setAttribute('data-en', 'Disabled - Click to enable');
      geofenceStatusText.setAttribute('data-ar', 'معطل - اضغط للتفعيل');
      geofenceControl.classList.remove('active');
    }

    // Update text direction for the status text
    this.app.uiManager.updateTextDirection();
  }

  async classifyGeofenceZones() {
    try {
      // Load geofence zones from database (or create based on reports)
      const { data: existingGeofences, error } = await this.app.supabase
        .from('geofences')
        .select('*')
        .eq('is_active', true);

      if (error) {
        console.error('Error loading geofences:', error);
        return [];
      }

      if (existingGeofences && existingGeofences.length > 0) {
        this.geofences = existingGeofences;
        return existingGeofences;
      }

      // If no geofences exist, create them based on report clusters
      const zones = await this.createGeofenceZonesFromReports();
      this.geofences = zones;
      return zones;
    } catch (error) {
      console.error('Error in classifyGeofenceZones:', error);
      return [];
    }
  }

  async createGeofenceZonesFromReports() {
    try {
      // Get recent reports with coordinates
      const { data: reports, error } = await this.app.supabase
        .from('reports')
        .select('latitude, longitude, vibe_type, created_at')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error || !reports || reports.length === 0) {
        return [];
      }

      // Group reports into clusters (simplified clustering)
      const clusters = this.clusterReports(reports);

      // Create geofence zones from clusters
      const zones = [];
      for (const cluster of clusters) {
        const zoneType = this.determineZoneType(cluster.reports);
        if (zoneType) {
          const zone = {
            name: `${this.app.uiManager.capitalizeFirstLetter(zoneType)} Zone ${zones.length + 1}`,
            zone_type: zoneType,
            latitude: cluster.center.lat,
            longitude: cluster.center.lng,
            radius_meters: Math.max(200, Math.min(1000, cluster.radius)), // Between 200m and 1km
            description: `Auto-generated ${zoneType} zone based on community reports`,
            is_active: true
          };

          // Save to database
          const { data: savedZone, error: saveError } = await this.app.supabase
            .from('geofences')
            .insert([zone])
            .select()
            .single();

          if (!saveError && savedZone) {
            zones.push(savedZone);
          }
        }
      }

      return zones;
    } catch (error) {
      console.error('Error creating geofence zones:', error);
      return [];
    }
  }

  clusterReports(reports) {
    // Simple clustering algorithm - group reports within 500m of each other
    const clusters = [];
    const processed = new Set();

    for (const report of reports) {
      if (processed.has(report.id)) continue;

      const cluster = {
        center: { lat: report.latitude, lng: report.longitude },
        reports: [report],
        radius: 200 // Start with 200m radius
      };

      processed.add(report.id);

      // Find nearby reports
      for (const otherReport of reports) {
        if (processed.has(otherReport.id)) continue;

        const distance = this.calculateDistance(
          report.latitude, report.longitude,
          otherReport.latitude, otherReport.longitude
        );

        if (distance <= 0.5) { // Within 500m
          cluster.reports.push(otherReport);
          processed.add(otherReport.id);

          // Update cluster center (weighted average)
          const totalWeight = cluster.reports.length;
          cluster.center.lat = cluster.reports.reduce((sum, r) => sum + r.latitude, 0) / totalWeight;
          cluster.center.lng = cluster.reports.reduce((sum, r) => sum + r.longitude, 0) / totalWeight;

          // Update radius to encompass all reports
          cluster.radius = Math.max(cluster.radius, distance * 1000);
        }
      }

      if (cluster.reports.length >= 3) { // Only create zones for clusters with 3+ reports
        clusters.push(cluster);
      }
    }

    return clusters;
  }

  determineZoneType(reports) {
    if (!reports || reports.length === 0) return null;

    // Count vibe types in the cluster
    const vibeCounts = {};
    reports.forEach(report => {
      vibeCounts[report.vibe_type] = (vibeCounts[report.vibe_type] || 0) + 1;
    });

    const totalReports = reports.length;
    const dangerousCount = vibeCounts.dangerous || 0;
    const suspiciousCount = vibeCounts.suspicious || 0;
    const calmCount = vibeCounts.calm || 0;
    const festiveCount = vibeCounts.festive || 0;

    // Determine zone type based on dominant vibes
    const dangerRatio = (dangerousCount + suspiciousCount * 0.5) / totalReports;
    const safetyRatio = (calmCount + festiveCount * 0.7) / totalReports;

    if (dangerRatio >= 0.4) {
      return 'risk'; // High danger reports
    } else if (safetyRatio >= 0.5) {
      return 'safe'; // High safety reports
    }

    return null; // Neutral zone, don't create geofence
  }

  async startGeofenceMonitoring() {
    if (!this.app.isAuthenticated || !this.app.userLocation) {
      this.app.uiManager.showNotification("Location required for geofence monitoring", "warning");
      return;
    }

    try {
      // Load geofence zones
      await this.classifyGeofenceZones();

      // Start location monitoring
      if (navigator.geolocation) {
        this.geofenceWatchId = navigator.geolocation.watchPosition(
          (position) => {
            this.handleGeofencePositionUpdate(position);
          },
          (error) => {
            console.error('Geofence location error:', error);
            this.app.uiManager.showNotification("Geofence monitoring failed - location unavailable", "error");
            this.stopGeofenceMonitoring();
          },
          {
            enableHighAccuracy: true,
            timeout: 30000,
            maximumAge: 60000
          }
        );

        // Initial check
        this.checkGeofenceStatus();
      } else {
        this.app.uiManager.showNotification("Geolocation not supported", "error");
      }
    } catch (error) {
      console.error('Error starting geofence monitoring:', error);
      this.app.uiManager.showNotification("Failed to start geofence monitoring", "error");
    }
  }

  stopGeofenceMonitoring() {
    if (this.geofenceWatchId) {
      navigator.geolocation.clearWatch(this.geofenceWatchId);
      this.geofenceWatchId = null;
    }
    this.geofenceEnabled = false;
    this.currentGeofenceZones.clear();
  }

  checkGeofenceStatus() {
    if (!this.app.userLocation || !this.geofences || this.geofences.length === 0) return;

    const currentZones = new Set();

    for (const zone of this.geofences) {
      const distance = this.calculateDistance(
        this.app.userLocation.latitude, this.app.userLocation.longitude,
        zone.latitude, zone.longitude
      );

      const distanceMeters = distance * 1000; // Convert to meters

      if (distanceMeters <= zone.radius_meters) {
        currentZones.add(zone.id);

        // Check if this is a new zone entry
        if (!this.currentGeofenceZones.has(zone.id)) {
          this.handleGeofenceEvent('enter', zone);
        }
      }
    }

    // Check for zone exits
    for (const zoneId of this.currentGeofenceZones) {
      if (!currentZones.has(zoneId)) {
        const zone = this.geofences.find(z => z.id === zoneId);
        if (zone) {
          this.handleGeofenceEvent('exit', zone);
        }
      }
    }

    this.currentGeofenceZones = currentZones;
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

      const isInside = distance <= (geofence.radius_meters / 1000); // Convert radius to km
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

  async handleGeofenceEvent(eventType, zone) {
    try {
      // Record the event in database
      if (this.app.isAuthenticated) {
        await this.app.supabase
          .from('geofence_events')
          .insert([{
            user_id: this.app.userData.id,
            geofence_id: zone.id,
            event_type: eventType,
            latitude: this.app.userLocation.latitude,
            longitude: this.app.userLocation.longitude,
            accuracy_meters: this.app.userLocation.accuracy
          }]);
      }

      // Send notification based on zone type and user preferences
      const shouldNotify = (zone.zone_type === 'safe' && this.geofenceSettings?.notify_on_enter) ||
                          (zone.zone_type === 'risk' && this.geofenceSettings?.notify_on_enter);

      if (shouldNotify) {
        const priority = this.getGeofenceNotificationPriority(zone.zone_type, eventType);
        const message = this.getGeofenceNotificationMessage(zone, eventType);

        this.sendGeofenceNotification(message, priority);
      }
    } catch (error) {
      console.error('Error handling geofence event:', error);
    }
  }

  getGeofenceNotificationPriority(zoneType, eventType) {
    // Define notification priority based on zone type and event
    if (zoneType === 'risk' && eventType === 'enter') {
      return 'high'; // Urgent: entering risk zone
    } else if (zoneType === 'risk' && eventType === 'exit') {
      return 'medium'; // Important: exiting risk zone
    } else if (zoneType === 'safe' && eventType === 'enter') {
      return 'low'; // Info: entering safe zone
    } else if (zoneType === 'safe' && eventType === 'exit') {
      return 'low'; // Info: exiting safe zone
    }
    return 'medium';
  }

  getGeofenceNotificationMessage(zone, eventType) {
    const zoneName = zone.name || `${this.app.uiManager.capitalizeFirstLetter(zone.zone_type)} Zone`;
    const action = eventType === 'enter' ? 'entered' : 'left';

    if (zone.zone_type === 'safe') {
      if (eventType === 'enter') {
        return `You've entered a Safe Zone: ${zoneName}`;
      } else {
        return `You've left the Safe Zone: ${zoneName}`;
      }
    } else if (zone.zone_type === 'risk') {
      if (eventType === 'enter') {
        return `Caution: You've entered a Risk Zone with multiple safety reports: ${zoneName}`;
      } else {
        return `You've exited the Risk Zone: ${zoneName}`;
      }
    }

    return `Geofence alert: ${action} ${zoneName}`;
  }

  sendGeofenceNotification(message, priority) {
    let notificationType = 'info';
    let duration = 4000;

    switch (priority) {
      case 'high':
        notificationType = 'warning';
        duration = 6000;
        // High priority: add vibration/sound if supported
        if ('vibrate' in navigator) {
          navigator.vibrate([200, 100, 200]);
        }
        break;
      case 'medium':
        notificationType = 'info';
        duration = 5000;
        break;
      case 'low':
        notificationType = 'success';
        duration = 3000;
        break;
    }

    this.app.uiManager.showNotification(message, notificationType, duration);
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
}

// Make GeofenceManager globally available
window.GeofenceManager = GeofenceManager;
