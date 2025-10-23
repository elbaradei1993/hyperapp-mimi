// Map Manager - Handles map functionality and visualization
class MapManager {
  constructor(app) {
    this.app = app;
    this.map = null;
    this.heatLayer = null;
    this.userLocationMarkerAdded = false;
  }

  async loadMapReports() {
    try {
      console.log('Loading all reports with coordinates for map display...');

      // Load all reports that have coordinates (not limited to recent ones)
      const { data: reports, error } = await this.app.supabase
        .from('reports')
        .select(`id, vibe_type, location, notes, created_at, upvotes, downvotes, latitude, longitude, votes (user_id, vote_type)`)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading map reports:', error);
        this.app.mapReports = [];
        return;
      }

      // Process reports data with user votes
      this.app.mapReports = reports.map(report => {
        const userVote = report.votes && report.votes.length > 0 ?
          report.votes.find(v => v.user_id === this.app.userData?.id)?.vote_type : null;

        return { ...report, user_vote: userVote };
      });

      console.log(`Loaded ${this.app.mapReports.length} reports with coordinates for map display`);

    } catch (error) {
      console.error('Error in loadMapReports:', error);
      this.app.mapReports = [];
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

    const hasReports = this.app.mapReports && this.app.mapReports.length > 0;

    mapContainer.innerHTML = `
      <div class="map-header">
        <h3 data-en="Community Vibe Map" data-ar="خريطة حالة المجتمع">Community Vibe Map</h3>
        <p data-en="${hasReports ? `Showing ${this.app.mapReports.length} reports with locations` : 'Map of your area - submit reports to see them here'}" data-ar="${hasReports ? `عرض ${this.app.mapReports.length} تقارير بمواقع` : 'خريطة منطقتك - أرسل التقارير لرؤيتها هنا'}">
          ${hasReports ? `Showing ${this.app.mapReports.length} reports with locations` : 'Map of your area - submit reports to see them here'}
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

    this.app.uiManager.updateTextDirection();
  }

  initializeLeafletMap() {
    const mapElement = document.getElementById('leaflet-map');
    if (!mapElement) return;

    // Default center (can be user's location if available)
    let initialCenter = [30.0444, 31.2357]; // Cairo, Egypt as default
    let initialZoom = 10;

    // If we already have user location, use it
    if (this.app.userLocation) {
      initialCenter = [this.app.userLocation.latitude, this.app.userLocation.longitude];
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
      if (navigator.geolocation && !this.app.userLocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            this.app.userLocation = { latitude, longitude };
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
      this.app.uiManager.showNotification("Geolocation is not supported by this browser", "error");
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
      this.app.userLocation = { latitude, longitude };

      if (this.map) {
        this.map.setView([latitude, longitude], 15);
        this.app.uiManager.showNotification("Centered on your location", "success");
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
      this.app.uiManager.showNotification(errorMessage, "error");
    } finally {
      // Reset button state
      if (locationBtn) {
        locationBtn.innerHTML = '<i class="fas fa-crosshairs"></i>';
        locationBtn.disabled = false;
      }
    }
  }

  addReportMarkers() {
    if (!this.map || !this.app.mapReports) return;

    console.log('Adding report markers for', this.app.mapReports.length, 'reports');

    // Clear existing markers (but keep user location marker)
    this.map.eachLayer((layer) => {
      if (layer instanceof L.Marker && !layer.options.isUserLocation) {
        this.map.removeLayer(layer);
      }
    });

    // Add markers for each report
    this.app.mapReports.forEach(report => {
      // Use actual coordinates if available, otherwise cluster around user location or default area
      let lat, lng;
      if (report.latitude && report.longitude) {
        lat = report.latitude;
        lng = report.longitude;
      } else {
        // For reports without coordinates, place them in a cluster around the user's location
        // or default to Cairo area if no user location
        let baseLat, baseLng;
        if (this.app.userLocation) {
          baseLat = this.app.userLocation.latitude;
          baseLng = this.app.userLocation.longitude;
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
      const iconSymbol = this.app.uiManager.getVibeSymbol(report.vibe_type);
      const iconHtml = `<div style="
        background: ${this.app.uiManager.getVibeColor(report.vibe_type)};
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
      const locationText = this.app.dataManager.formatLocationForDisplay(report);
      const popupContent = `
        <div style="font-family: 'Segoe UI', sans-serif; max-width: 200px;">
          <h4 style="margin: 0 0 8px 0; color: ${this.app.uiManager.getVibeColor(report.vibe_type)};">
            ${this.app.uiManager.capitalizeFirstLetter(report.vibe_type)}
          </h4>
          <p style="margin: 4px 0;"><strong>Location:</strong> ${locationText}</p>
          ${report.notes ? `<p style="margin: 4px 0;"><strong>Notes:</strong> ${report.notes}</p>` : ''}
          <p style="margin: 4px 0; font-size: 12px; color: #666;">
            ${this.app.uiManager.formatTimeAgo(report.created_at)}
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
    if (!this.map || !this.app.mapReports) {
      console.log('Heat map: No map or reports available');
      return;
    }

    console.log('Adding heat map layer with', this.app.mapReports.length, 'points');

    // Remove existing heat map layer
    this.map.eachLayer((layer) => {
      if (layer.options && layer.options.isHeatMap) {
        this.map.removeLayer(layer);
      }
    });

    // Prepare heat map data from reports
    const heatData = [];
    const maxIntensity = 1.0; // Maximum intensity for heat map

    this.app.mapReports.forEach((report, index) => {
      // Use actual coordinates if available, otherwise use clustered positions
      let lat, lng;
      if (report.latitude && report.longitude) {
        lat = parseFloat(report.latitude);
        lng = parseFloat(report.longitude);
        console.log(`Report ${index}: Using real coordinates ${lat}, ${lng} for ${report.vibe_type}`);
      } else {
        // For reports without coordinates, use clustered positions around user location
        let baseLat, baseLng;
        if (this.app.userLocation) {
          baseLat = this.app.userLocation.latitude;
          baseLng = this.app.userLocation.longitude;
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
    if (!this.map || !this.app.userLocation) {
      console.log('Cannot add user location marker: map or userLocation not available');
      return;
    }

    console.log('Adding user location marker at:', this.app.userLocation.latitude, this.app.userLocation.longitude);

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
    const userMarker = L.marker([this.app.userLocation.latitude, this.app.userLocation.longitude], {
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
          ${this.app.userLocation.latitude.toFixed(6)}, ${this.app.userLocation.longitude.toFixed(6)}
        </p>
        <p style="margin: 4px 0; font-size: 12px; color: #666;">
          Last updated: ${new Date(this.app.userLocation.timestamp || Date.now()).toLocaleTimeString()}
        </p>
      </div>
    `;

    userMarker.bindPopup(popupContent);

    // Center map on user location if this is the first time adding the marker
    if (!this.userLocationMarkerAdded) {
      this.map.setView([this.app.userLocation.latitude, this.app.userLocation.longitude], 15);
      this.userLocationMarkerAdded = true;
    }

    console.log('User location marker added successfully');
  }

  displayMap() {
    // This will be called when the map view is shown
    this.loadMap();
  }
}

// Make MapManager globally available
window.MapManager = MapManager;
