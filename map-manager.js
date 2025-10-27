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
      <div id="leaflet-map" style="height: 400px; width: 100%; position: relative;"></div>
      <div class="map-controls">
        <button id="myLocationBtn" class="map-control-btn" title="Go to my location">
          <i class="fas fa-crosshairs"></i>
        </button>
        <button id="heatmapToggleBtn" class="map-control-btn" title="Toggle heatmap">
          <i class="fas fa-fire"></i>
        </button>
      </div>
      <div class="map-legend">
        <div class="legend-item"><div class="legend-circle" style="background: #FFA500;"></div> <span data-en="Crowded" data-ar="مزدحم">Crowded</span></div>
        <div class="legend-item"><div class="legend-circle" style="background: #FF6B35;"></div> <span data-en="Noisy" data-ar="صاخب">Noisy</span></div>
        <div class="legend-item"><div class="legend-circle" style="background: #28A745;"></div> <span data-en="Festive" data-ar="احتفالي">Festive</span></div>
        <div class="legend-item"><div class="legend-circle" style="background: #17A2B8;"></div> <span data-en="Calm" data-ar="هادئ">Calm</span></div>
        <div class="legend-item"><div class="legend-circle" style="background: #FFC107;"></div> <span data-en="Suspicious" data-ar="مشبوه">Suspicious</span></div>
        <div class="legend-item"><div class="legend-circle" style="background: #DC3545;"></div> <span data-en="Dangerous" data-ar="خطير">Dangerous</span></div>
      </div>
    `;

    // Initialize Leaflet map
    this.initializeLeafletMap();

    if (this.app && this.app.updateTextDirection) {
      this.app.updateTextDirection();
    }
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

      // Ensure map has proper dimensions before adding layers
      this.map.invalidateSize();

      // Add markers for reports first
      this.addReportMarkers();

      // Add heat map layer after ensuring proper initialization
      this.initializeHeatMapLayer();

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

    // Add event listener for Heatmap Toggle button
    const heatmapToggleBtn = document.getElementById('heatmapToggleBtn');
    if (heatmapToggleBtn) {
      heatmapToggleBtn.addEventListener('click', () => {
        this.toggleHeatmap();
      });
    }
  }

  async centerMapOnUserLocation() {
    if (!navigator.geolocation) {
      if (this.app && this.app.showNotification) {
        this.app.showNotification("Geolocation is not supported by this browser", "error");
      }
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
        if (this.app && this.app.showNotification) {
          this.app.showNotification("Centered on your location", "success");
        }
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
      if (this.app && this.app.showNotification) {
        this.app.showNotification(errorMessage, "error");
      }
    } finally {
      // Reset button state
      if (locationBtn) {
        locationBtn.innerHTML = '<i class="fas fa-crosshairs"></i>';
        locationBtn.disabled = false;
      }
    }
  }

  addReportMarkers() {
    if (!this.map || !this.app || !this.app.mapReports) return;

    console.log('Adding professional report markers for', this.app.mapReports.length, 'reports');

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

      // Create professional marker with advanced styling
      const vibeIcon = this.getVibeIcon(report.vibe_type);
      const vibeColor = this.getVibeColor(report.vibe_type);
      const isHighPriority = report.vibe_type === 'dangerous' || report.vibe_type === 'suspicious';

      // Professional size hierarchy
      const markerSize = this.getProfessionalMarkerSize(report.vibe_type);
      const iconSize = this.getProfessionalIconSize(report.vibe_type);
      const borderWidth = this.getProfessionalBorderWidth(report.vibe_type);

      // Professional marker HTML with advanced styling
      const iconHtml = `
        <div class="professional-marker marker-${report.vibe_type}" style="
          position: relative;
          width: ${markerSize}px;
          height: ${markerSize}px;
          background: ${this.getProfessionalMarkerBackground(report.vibe_type)};
          border: ${borderWidth}px solid ${this.getProfessionalBorderColor(report.vibe_type)};
          ${this.getProfessionalMarkerShape(report.vibe_type)}
          box-shadow: ${this.getProfessionalShadow(report.vibe_type)};
          animation: ${this.getProfessionalAnimation(report.vibe_type)};
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          transform-origin: center bottom;
          ${!report.latitude || !report.longitude ? 'opacity: 0.85;' : ''}
          z-index: 1000;
          cursor: pointer;
        ">
          <div class="marker-icon-container" style="
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
          ">
            <div class="icon-background" style="
              position: absolute;
              width: ${iconSize + 8}px;
              height: ${iconSize + 8}px;
              background: ${this.getProfessionalIconBackground(report.vibe_type)};
              border-radius: 50%;
              opacity: 0.9;
              box-shadow: ${this.getProfessionalIconShadow(report.vibe_type)};
            "></div>
            <i class="${vibeIcon}" style="
              position: relative;
              z-index: 2;
              color: ${this.getProfessionalIconColor(report.vibe_type)};
              font-size: ${iconSize}px;
              text-shadow: ${this.getProfessionalTextShadow(report.vibe_type)};
              filter: ${this.getProfessionalIconFilter(report.vibe_type)};
            "></i>
          </div>
          ${this.getProfessionalPriorityIndicator(report.vibe_type)}
          ${this.getProfessionalBadge(report.vibe_type)}
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: `professional-marker marker-${report.vibe_type}`,
        iconSize: [markerSize, markerSize],
        iconAnchor: [markerSize/2, markerSize], // Anchor at bottom center for clean positioning
        popupAnchor: [0, -markerSize - 15] // Position popup above marker
      });

      // Create marker
      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(this.map);

      // Add popup with professional styling
      const locationText = this.app && this.app.formatLocationForDisplay ? this.app.formatLocationForDisplay(report) : report.location || 'Unknown location';
      const popupContent = `
        <div style="font-family: 'Segoe UI', system-ui, sans-serif; max-width: 280px; padding: 16px; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.1);">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid ${vibeColor}20;">
            <div style="width: 40px; height: 40px; background: ${this.getProfessionalMarkerBackground(report.vibe_type)}; border-radius: 8px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px ${vibeColor}40;">
              <i class="${vibeIcon}" style="color: white; font-size: 18px;"></i>
            </div>
            <div>
              <h4 style="margin: 0 0 4px 0; color: ${vibeColor}; font-size: 16px; font-weight: 600;">
                ${this.app && this.app.capitalizeFirstLetter ? this.app.capitalizeFirstLetter(report.vibe_type) : report.vibe_type}
              </h4>
              <p style="margin: 0; font-size: 12px; color: #6c757d; font-weight: 500;">
                Safety Report • ${this.app && this.app.formatTimeAgo ? this.app.formatTimeAgo(report.created_at) : new Date(report.created_at).toLocaleString()}
              </p>
            </div>
          </div>
          <div style="margin-bottom: 12px;">
            <p style="margin: 0 0 8px 0; font-weight: 600; color: #495057;">
              <i class="fas fa-map-marker-alt" style="color: ${vibeColor}; margin-right: 8px;"></i>
              Location
            </p>
            <p style="margin: 0; color: #6c757d; font-size: 14px; line-height: 1.4;">${locationText}</p>
          </div>
          ${report.notes ? `
            <div style="margin-bottom: 12px;">
              <p style="margin: 0 0 8px 0; font-weight: 600; color: #495057;">
                <i class="fas fa-sticky-note" style="color: ${vibeColor}; margin-right: 8px;"></i>
                Details
              </p>
              <p style="margin: 0; color: #6c757d; font-size: 14px; line-height: 1.4; background: #f8f9fa; padding: 8px; border-radius: 6px; border-left: 3px solid ${vibeColor}40;">${report.notes}</p>
            </div>
          ` : ''}
          ${!report.latitude || !report.longitude ?
            '<div style="margin-bottom: 12px;"><p style="margin: 0; font-size: 11px; color: #868e96; font-style: italic; background: #fff3cd; padding: 6px; border-radius: 4px; border: 1px solid #ffeaa7;"><i class="fas fa-info-circle" style="margin-right: 6px;"></i>📍 Location approximated for privacy</p></div>' : ''}
          <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 8px; border-top: 1px solid #dee2e6;">
            <div style="display: flex; align-items: center; gap: 16px;">
              <span style="display: flex; align-items: center; gap: 4px; color: #28a745; font-size: 13px; font-weight: 600;">
                <i class="fas fa-thumbs-up"></i> ${report.upvotes || 0}
              </span>
              <span style="display: flex; align-items: center; gap: 4px; color: #dc3545; font-size: 13px; font-weight: 600;">
                <i class="fas fa-thumbs-down"></i> ${report.downvotes || 0}
              </span>
            </div>
            <div style="font-size: 11px; color: #868e96;">
              ID: ${report.id}
            </div>
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

    console.log('Professional report markers added successfully');
  }

  addHeatMapLayer() {
    if (!this.map || !this.app || !this.app.mapReports) {
      console.log('Heat map: No map or reports available');
      return;
    }

    // Check if map container has proper dimensions
    const mapContainer = this.map.getContainer();
    if (!mapContainer || mapContainer.offsetWidth === 0 || mapContainer.offsetHeight === 0) {
      console.log('Heat map: Map container has no dimensions, retrying in 500ms');
      setTimeout(() => this.addHeatMapLayer(), 500);
      return;
    }

    console.log('Adding heat map layer with', this.app.mapReports.length, 'points');

    // Remove existing heat map layer
    this.map.eachLayer((layer) => {
      if (layer.options && layer.options.isHeatMap) {
        this.map.removeLayer(layer);
      }
    });

    // Prepare heat map data from reports with debugging
    const heatData = [];
    const maxIntensity = 1.0;
    let validReports = 0;

    this.app.mapReports.forEach((report, index) => {
      // Use actual coordinates if available, otherwise use clustered positions
      let lat, lng;
      if (report.latitude && report.longitude) {
        lat = parseFloat(report.latitude);
        lng = parseFloat(report.longitude);
        validReports++;
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

      // Validate coordinates
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        console.warn(`Invalid coordinates for report ${index}: ${lat}, ${lng}`);
        return;
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

    console.log('Heat map data prepared:', heatData.length, 'points from', validReports, 'valid reports');
    console.log('Sample heat data points:', heatData.slice(0, 3));

    // Create heat map layer if we have data
    if (heatData.length > 0) {
      try {
        // Ensure the Leaflet heat plugin is available
        if (typeof L.heatLayer !== 'function') {
          console.error('L.heatLayer is not available. Heat plugin may not be loaded.');
          this.showHeatmapError('Heat plugin not available');
          return;
        }

        console.log('Creating heatmap layer with data:', heatData);

        this.heatLayer = L.heatLayer(heatData, {
          radius: 40, // Balanced radius for good visibility without too much spread
          blur: 25,   // Moderate blur for smooth heat distribution
          maxZoom: 18,
          max: maxIntensity,
          minOpacity: 0.2, // Lower minimum opacity to show subtle variations
          gradient: {
            0.2: '#00ff00', // Green for low intensity (safe areas)
            0.3: '#40ff00', // Brighter green
            0.4: '#80ff00', // Light green-yellow
            0.5: '#c0ff00', // Yellow-green
            0.6: '#ffff00', // Yellow for moderate
            0.7: '#ffbf00', // Orange-yellow
            0.8: '#ff8000', // Orange for higher
            0.9: '#ff4000', // Red-orange
            1.0: '#ff0000'  // Red for high danger
          },
          isHeatMap: true // Custom property to identify heat map layer
        });

        console.log('Heat layer created, adding to map...');
        this.heatLayer.addTo(this.map);
        console.log('Heat map layer added successfully');
        console.log('Heat layer object:', this.heatLayer);

        // Force map to render the heatmap
        setTimeout(() => {
          if (this.map && this.heatLayer) {
            this.map.invalidateSize();
            this.heatLayer.redraw();
            console.log('Heat layer redrawn and map invalidated');
          }
        }, 200);

        // Additional redraw after a longer delay
        setTimeout(() => {
          if (this.heatLayer) {
            this.heatLayer.redraw();
            console.log('Heat layer redrawn again');
          }
        }, 500);

      } catch (error) {
        console.error('Error creating heat map layer:', error);
        this.showHeatmapError('Failed to create heatmap: ' + error.message);
      }
    } else {
      console.log('No heat map data available - no valid coordinates found');
      this.showHeatmapError('No location data available for heatmap');
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

  toggleHeatmap() {
    if (!this.map) return;

    const heatmapBtn = document.getElementById('heatmapToggleBtn');
    if (!heatmapBtn) return;

    // Check if heatmap layer exists and is currently visible
    const isHeatmapVisible = this.heatLayer && this.map.hasLayer(this.heatLayer);

    if (isHeatmapVisible) {
      // Hide heatmap
      if (this.heatLayer) {
        this.map.removeLayer(this.heatLayer);
        console.log('Heatmap layer hidden');
      }
      // Update button appearance
      heatmapBtn.innerHTML = '<i class="fas fa-fire" style="opacity: 0.5;"></i>';
      heatmapBtn.title = "Show heatmap";
      if (this.app && this.app.showNotification) {
        this.app.showNotification("Heatmap hidden", "info");
      }
    } else {
      // Show heatmap
      if (this.heatLayer) {
        console.log('Adding existing heatmap layer to map');
        this.heatLayer.addTo(this.map);
        console.log('Heatmap layer shown');
      } else {
        console.log('Creating new heatmap layer');
        // If heatmap layer doesn't exist, create it
        this.addHeatMapLayer();
      }
      // Update button appearance
      heatmapBtn.innerHTML = '<i class="fas fa-fire" style="color: #ff6b35;"></i>';
      heatmapBtn.title = "Hide heatmap";
      if (this.app && this.app.showNotification) {
        this.app.showNotification("Heatmap shown", "info");
      }
    }

    // Force map refresh
    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
        console.log('Map invalidated after heatmap toggle');
      }
    }, 100);
  }

  initializeHeatMapLayer() {
    // Ensure proper timing for heatmap initialization with better error handling
    console.log('Initializing heatmap layer...');

    // Wait for map to be fully ready and reports to be loaded
    const initializeHeatmap = () => {
      console.log('Attempting to create heatmap layer...');

      // Check if we have the required data
      if (!this.app || !this.app.mapReports || this.app.mapReports.length === 0) {
        console.log('No reports available for heatmap, retrying in 1 second...');
        setTimeout(initializeHeatmap, 1000);
        return;
      }

      // Check if Leaflet heat plugin is available
      if (typeof L === 'undefined' || !L.heatLayer) {
        console.error('Leaflet heat plugin not available');
        this.showHeatmapError('Heatmap plugin not loaded');
        return;
      }

      // Check if map container is ready
      const mapContainer = this.map.getContainer();
      if (!mapContainer || mapContainer.offsetWidth === 0) {
        console.log('Map container not ready, retrying in 500ms...');
        setTimeout(initializeHeatmap, 500);
        return;
      }

      try {
        console.log('Creating heatmap with', this.app.mapReports.length, 'reports');
        this.addHeatMapLayer();
        console.log('Heatmap initialization completed');
      } catch (error) {
        console.error('Error initializing heatmap:', error);
        this.showHeatmapError('Failed to create heatmap: ' + error.message);
      }
    };

    // Start initialization with a delay to ensure everything is ready
    setTimeout(initializeHeatmap, 500);
  }

  showHeatmapError(message) {
    console.error('Heatmap error:', message);

    // Show error notification to user
    if (this.app && this.app.showNotification) {
      this.app.showNotification('Heatmap unavailable: ' + message, 'warning');
    }

    // Update heatmap toggle button to show error state
    const heatmapBtn = document.getElementById('heatmapToggleBtn');
    if (heatmapBtn) {
      heatmapBtn.innerHTML = '<i class="fas fa-exclamation-triangle" style="color: #dc3545;"></i>';
      heatmapBtn.title = "Heatmap unavailable";
      setTimeout(() => {
        heatmapBtn.innerHTML = '<i class="fas fa-fire" style="opacity: 0.5;"></i>';
        heatmapBtn.title = "Show heatmap";
      }, 3000);
    }
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

  // Enhanced marker styling methods
  getEnhancedMarkerBackground(vibeType) {
    const gradients = {
      crowded: 'linear-gradient(135deg, #FFA500, #FF8C00)',
      noisy: 'linear-gradient(135deg, #FF6B35, #FF4500)',
      festive: 'linear-gradient(135deg, #28A745, #20C997)',
      calm: 'linear-gradient(135deg, #17A2B8, #0DCAF0)',
      suspicious: 'linear-gradient(135deg, #FFC107, #FD7E14)',
      dangerous: 'linear-gradient(135deg, #DC3545, #B02A37)'
    };
    return gradients[vibeType] || 'linear-gradient(135deg, #6C757D, #5A6268)';
  }

  getEnhancedBorderColor(vibeType) {
    const borders = {
      crowded: '#FF8C00',
      noisy: '#FF4500',
      festive: '#20C997',
      calm: '#0DCAF0',
      suspicious: '#FD7E14',
      dangerous: '#B02A37'
    };
    return borders[vibeType] || '#5A6268';
  }

  getEnhancedShadow(vibeType) {
    const shadows = {
      crowded: '0 4px 12px rgba(255, 165, 0, 0.4), 0 2px 4px rgba(0,0,0,0.2)',
      noisy: '0 4px 12px rgba(255, 107, 53, 0.4), 0 2px 4px rgba(0,0,0,0.2)',
      festive: '0 4px 12px rgba(40, 167, 69, 0.4), 0 2px 4px rgba(0,0,0,0.2)',
      calm: '0 4px 12px rgba(23, 162, 184, 0.4), 0 2px 4px rgba(0,0,0,0.2)',
      suspicious: '0 4px 12px rgba(255, 193, 7, 0.4), 0 2px 4px rgba(0,0,0,0.2)',
      dangerous: '0 6px 16px rgba(220, 53, 69, 0.5), 0 3px 6px rgba(0,0,0,0.3)'
    };
    return shadows[vibeType] || '0 4px 12px rgba(108, 117, 125, 0.4), 0 2px 4px rgba(0,0,0,0.2)';
  }

  getEnhancedIconColor(vibeType) {
    const iconColors = {
      crowded: '#FFFFFF',
      noisy: '#FFFFFF',
      festive: '#FFFFFF',
      calm: '#FFFFFF',
      suspicious: '#212529',
      dangerous: '#FFFFFF'
    };
    return iconColors[vibeType] || '#FFFFFF';
  }

  getMarkerAnimation(vibeType) {
    const animations = {
      crowded: 'pulse-crowded',
      noisy: 'pulse-noisy',
      festive: 'pulse-festive',
      calm: 'pulse-calm',
      suspicious: 'pulse-suspicious',
      dangerous: 'pulse-dangerous'
    };
    return animations[vibeType] || 'pulse-calm';
  }

  // ===== PROFESSIONAL MARKER STYLING METHODS =====

  getProfessionalMarkerSize(vibeType) {
    const sizes = {
      dangerous: 42,    // Largest - highest priority
      suspicious: 38,   // High priority
      crowded: 34,      // Medium priority
      noisy: 34,        // Medium priority
      festive: 30,      // Lower priority
      calm: 30         // Lower priority
    };
    return sizes[vibeType] || 32;
  }

  getProfessionalIconSize(vibeType) {
    const sizes = {
      dangerous: 22,    // Larger icons for high priority
      suspicious: 20,   // High priority
      crowded: 18,      // Standard size
      noisy: 18,        // Standard size
      festive: 16,      // Smaller for low priority
      calm: 16         // Smaller for low priority
    };
    return sizes[vibeType] || 18;
  }

  getProfessionalBorderWidth(vibeType) {
    const widths = {
      dangerous: 3,     // Thicker border for high priority
      suspicious: 3,    // Thicker border for high priority
      crowded: 2,       // Standard border
      noisy: 2,         // Standard border
      festive: 2,       // Standard border
      calm: 2          // Standard border
    };
    return widths[vibeType] || 2;
  }

  getProfessionalMarkerBackground(vibeType) {
    const backgrounds = {
      dangerous: 'linear-gradient(135deg, #C41E3A 0%, #FF6B47 50%, #E74C3C 100%)',
      suspicious: 'linear-gradient(135deg, #FF8C00 0%, #FFD700 50%, #F39C12 100%)',
      crowded: 'linear-gradient(135deg, #FF6B35 0%, #FF8C00 50%, #E67E22 100%)',
      noisy: 'linear-gradient(135deg, #E74C3C 0%, #F39C12 50%, #FF6B35 100%)',
      festive: 'linear-gradient(135deg, #27AE60 0%, #1ABC9C 50%, #2ECC71 100%)',
      calm: 'linear-gradient(135deg, #34495E 0%, #3498DB 50%, #5DADE2 100%)'
    };
    return backgrounds[vibeType] || 'linear-gradient(135deg, #6C757D, #5A6268)';
  }

  getProfessionalBorderColor(vibeType) {
    const borders = {
      dangerous: 'linear-gradient(135deg, #8B0000, #DC143C)',
      suspicious: 'linear-gradient(135deg, #DAA520, #FFD700)',
      crowded: 'linear-gradient(135deg, #FF8C00, #FF6347)',
      noisy: 'linear-gradient(135deg, #B22222, #FF4500)',
      festive: 'linear-gradient(135deg, #228B22, #32CD32)',
      calm: 'linear-gradient(135deg, #2F4F4F, #4682B4)'
    };
    return borders[vibeType] || 'linear-gradient(135deg, #5A6268, #6C757D)';
  }

  getProfessionalMarkerShape(vibeType) {
    const shapes = {
      dangerous: 'clip-path: polygon(25% 0%, 75% 0%, 100% 25%, 100% 75%, 75% 100%, 25% 100%, 0% 75%, 0% 25%);', // Octagon
      suspicious: 'clip-path: polygon(25% 0%, 75% 0%, 100% 25%, 100% 75%, 75% 100%, 25% 100%, 0% 75%, 0% 25%);', // Octagon
      crowded: 'clip-path: polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%);', // Rounded hexagon
      noisy: 'clip-path: polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%);', // Rounded hexagon
      festive: 'border-radius: 8px;', // Rounded square
      calm: 'border-radius: 8px;' // Rounded square
    };
    return shapes[vibeType] || 'border-radius: 50%;';
  }

  getProfessionalShadow(vibeType) {
    const shadows = {
      dangerous: '0 8px 25px rgba(196, 30, 58, 0.6), 0 4px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
      suspicious: '0 6px 20px rgba(255, 140, 0, 0.5), 0 3px 10px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.2)',
      crowded: '0 5px 18px rgba(255, 107, 53, 0.45), 0 3px 8px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.15)',
      noisy: '0 5px 18px rgba(231, 76, 60, 0.45), 0 3px 8px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.15)',
      festive: '0 4px 15px rgba(39, 174, 96, 0.4), 0 2px 6px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)',
      calm: '0 4px 15px rgba(52, 73, 94, 0.4), 0 2px 6px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)'
    };
    return shadows[vibeType] || '0 4px 12px rgba(108, 117, 125, 0.4), 0 2px 4px rgba(0,0,0,0.2)';
  }

  getProfessionalAnimation(vibeType) {
    const animations = {
      dangerous: 'professional-float-dangerous 3s ease-in-out infinite',
      suspicious: 'professional-float-suspicious 3.5s ease-in-out infinite',
      crowded: 'professional-float-crowded 4s ease-in-out infinite',
      noisy: 'professional-float-noisy 4s ease-in-out infinite',
      festive: 'professional-float-festive 4.5s ease-in-out infinite',
      calm: 'professional-float-calm 5s ease-in-out infinite'
    };
    return animations[vibeType] || 'professional-float-calm 4s ease-in-out infinite';
  }

  getProfessionalIconBackground(vibeType) {
    const backgrounds = {
      dangerous: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
      suspicious: 'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.8) 100%)',
      crowded: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.75) 100%)',
      noisy: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.75) 100%)',
      festive: 'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.8) 100%)',
      calm: 'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.8) 100%)'
    };
    return backgrounds[vibeType] || 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)';
  }

  getProfessionalIconShadow(vibeType) {
    const shadows = {
      dangerous: '0 2px 8px rgba(196, 30, 58, 0.4), inset 0 1px 2px rgba(255,255,255,0.3)',
      suspicious: '0 2px 6px rgba(255, 140, 0, 0.3), inset 0 1px 2px rgba(255,255,255,0.3)',
      crowded: '0 2px 6px rgba(255, 107, 53, 0.3), inset 0 1px 2px rgba(255,255,255,0.3)',
      noisy: '0 2px 6px rgba(231, 76, 60, 0.3), inset 0 1px 2px rgba(255,255,255,0.3)',
      festive: '0 2px 6px rgba(39, 174, 96, 0.3), inset 0 1px 2px rgba(255,255,255,0.3)',
      calm: '0 2px 6px rgba(52, 73, 94, 0.3), inset 0 1px 2px rgba(255,255,255,0.3)'
    };
    return shadows[vibeType] || '0 2px 6px rgba(108, 117, 125, 0.3), inset 0 1px 2px rgba(255,255,255,0.3)';
  }

  getProfessionalIconColor(vibeType) {
    const colors = {
      dangerous: '#FFFFFF',
      suspicious: '#2C3E50',
      crowded: '#FFFFFF',
      noisy: '#FFFFFF',
      festive: '#FFFFFF',
      calm: '#FFFFFF'
    };
    return colors[vibeType] || '#FFFFFF';
  }

  getProfessionalTextShadow(vibeType) {
    const shadows = {
      dangerous: '0 1px 3px rgba(0,0,0,0.5), 0 0 6px rgba(196, 30, 58, 0.3)',
      suspicious: '0 1px 2px rgba(0,0,0,0.4)',
      crowded: '0 1px 3px rgba(0,0,0,0.4)',
      noisy: '0 1px 3px rgba(0,0,0,0.4)',
      festive: '0 1px 3px rgba(0,0,0,0.4)',
      calm: '0 1px 3px rgba(0,0,0,0.4)'
    };
    return shadows[vibeType] || '0 1px 2px rgba(0,0,0,0.3)';
  }

  getProfessionalIconFilter(vibeType) {
    const filters = {
      dangerous: 'drop-shadow(0 2px 4px rgba(196, 30, 58, 0.4))',
      suspicious: 'drop-shadow(0 1px 3px rgba(255, 140, 0, 0.3))',
      crowded: 'drop-shadow(0 1px 3px rgba(255, 107, 53, 0.3))',
      noisy: 'drop-shadow(0 1px 3px rgba(231, 76, 60, 0.3))',
      festive: 'drop-shadow(0 1px 3px rgba(39, 174, 96, 0.3))',
      calm: 'drop-shadow(0 1px 3px rgba(52, 73, 94, 0.3))'
    };
    return filters[vibeType] || 'drop-shadow(0 1px 2px rgba(108, 117, 125, 0.3))';
  }

  getProfessionalPriorityIndicator(vibeType) {
    if (vibeType === 'dangerous') {
      return `
        <div class="priority-indicator" style="
          position: absolute;
          top: -3px;
          right: -3px;
          width: 14px;
          height: 14px;
          background: linear-gradient(135deg, #FF4444, #CC0000);
          border: 2px solid #FFFFFF;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(255, 68, 68, 0.6);
          animation: professional-priority-pulse 2s infinite ease-in-out;
          z-index: 3;
        ">
          <i class="fas fa-exclamation" style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-size: 8px;
            text-shadow: 0 0 2px rgba(0,0,0,0.5);
          "></i>
        </div>
      `;
    } else if (vibeType === 'suspicious') {
      return `
        <div class="priority-indicator" style="
          position: absolute;
          top: -2px;
          right: -2px;
          width: 12px;
          height: 12px;
          background: linear-gradient(135deg, #FF8C00, #FFD700);
          border: 2px solid #FFFFFF;
          border-radius: 50%;
          box-shadow: 0 2px 6px rgba(255, 140, 0, 0.5);
          animation: professional-suspicious-pulse 2.5s infinite ease-in-out;
          z-index: 3;
        ">
          <i class="fas fa-eye" style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #2C3E50;
            font-size: 6px;
            text-shadow: 0 0 1px rgba(255,255,255,0.8);
          "></i>
        </div>
      `;
    }
    return '';
  }

  getProfessionalBadge(vibeType) {
    const badges = {
      dangerous: '<div class="vibe-badge badge-danger" style="position: absolute; top: -8px; left: -8px; background: linear-gradient(135deg, #C41E3A, #E74C3C); color: white; padding: 2px 6px; border-radius: 10px; font-size: 9px; font-weight: bold; box-shadow: 0 2px 6px rgba(196, 30, 58, 0.4); z-index: 3; min-width: 16px; height: 16px; display: flex; align-items: center; justify-content: center;">D</div>',
      suspicious: '<div class="vibe-badge badge-suspicious" style="position: absolute; top: -6px; left: -6px; background: linear-gradient(135deg, #FF8C00, #F39C12); color: #2C3E50; padding: 2px 6px; border-radius: 8px; font-size: 8px; font-weight: bold; box-shadow: 0 2px 5px rgba(255, 140, 0, 0.3); z-index: 3; min-width: 14px; height: 14px; display: flex; align-items: center; justify-content: center;">S</div>',
      crowded: '<div class="vibe-badge badge-crowded" style="position: absolute; bottom: -6px; right: -6px; background: linear-gradient(135deg, #FF6B35, #E67E22); color: white; padding: 1px 5px; border-radius: 8px; font-size: 7px; font-weight: bold; box-shadow: 0 1px 4px rgba(255, 107, 53, 0.3); z-index: 3; min-width: 12px; height: 12px; display: flex; align-items: center; justify-content: center;">C</div>',
      noisy: '<div class="vibe-badge badge-noisy" style="position: absolute; bottom: -6px; left: -6px; background: linear-gradient(135deg, #E74C3C, #FF6B35); color: white; padding: 1px 5px; border-radius: 8px; font-size: 7px; font-weight: bold; box-shadow: 0 1px 4px rgba(231, 76, 60, 0.3); z-index: 3; min-width: 12px; height: 12px; display: flex; align-items: center; justify-content: center;">N</div>',
      festive: '<div class="vibe-badge badge-festive" style="position: absolute; bottom: -5px; right: -5px; background: linear-gradient(135deg, #27AE60, #2ECC71); color: white; padding: 1px 4px; border-radius: 6px; font-size: 6px; font-weight: bold; box-shadow: 0 1px 3px rgba(39, 174, 96, 0.3); z-index: 3; min-width: 10px; height: 10px; display: flex; align-items: center; justify-content: center;">F</div>',
      calm: '<div class="vibe-badge badge-calm" style="position: absolute; top: -5px; left: -5px; background: linear-gradient(135deg, #34495E, #5DADE2); color: white; padding: 1px 4px; border-radius: 6px; font-size: 6px; font-weight: bold; box-shadow: 0 1px 3px rgba(52, 73, 94, 0.3); z-index: 3; min-width: 10px; height: 10px; display: flex; align-items: center; justify-content: center;">P</div>'
    };
    return badges[vibeType] || '';
  }

  displayMap() {
    // This will be called when the map view is shown
    this.loadMap();
  }
}

// Make MapManager globally available
window.MapManager = MapManager;
