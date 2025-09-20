// HyperApp Mini App - Complete Implementation with Supabase
class HyperApp {
    constructor() {
        this.tg = window.Telegram.WebApp;
        this.currentLanguage = 'en';
        this.userData = null;
        this.nearbyReports = [];
        this.userReports = [];
        this.selectedVibe = null;
        this.isConnected = false;
        this.userLocation = null;
        
        // Initialize Supabase
        this.supabaseUrl = 'https://nqwejzbayquzsvcodunl.supabase.co';
        this.supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xd2VqemJheXF1enN2Y29kdW5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzOTA0MjAsImV4cCI6MjA3Mzk2NjQyMH0.01yifC-tfEbBHD5u315fpb_nZrqMZCbma_UrMacMb78';
        this.supabase = window.supabase.createClient(this.supabaseUrl, this.supabaseKey);
        
        this.init();
    }
    
    async init() {
        console.log("Initializing HyperApp with Supabase...");
        
        // Initialize Telegram WebApp
        if (this.tg) {
            this.tg.expand();
            this.tg.MainButton.hide();
            
            // Get user data
            const user = this.tg.initDataUnsafe.user;
            if (user) {
                this.userData = user;
                await this.syncUserWithSupabase();
                this.updateUserInfo();
            }
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Update connection status
            this.updateConnectionStatus(true);
            
            // Load initial data
            await this.loadInitialData();
        } else {
            console.log("Not in Telegram environment");
            this.updateConnectionStatus(false);
            this.showNotification("Running in standalone mode", "info");
            
            // Simulate user data for testing
            this.userData = {
                id: 123456789,
                first_name: "Test User",
                username: "testuser"
            };
            this.updateUserInfo();
            await this.loadInitialData();
        }
    }
    
    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.currentTarget.getAttribute('data-view');
                this.showView(view);
            });
        });
        
        // Language switcher
        document.getElementById('languageSwitcher').addEventListener('click', () => {
            this.toggleLanguage();
        });
        
        // Modal close handlers
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
    }
    
    async syncUserWithSupabase() {
        if (!this.userData) return false;
        
        try {
            // Check if user exists in Supabase
            const { data, error } = await this.supabase
                .from('users')
                .select('*')
                .eq('user_id', this.userData.id)
                .maybeSingle();
            
            if (error && error.code === 'PGRST116') {
                // User doesn't exist, create a new record
                const { data: newUser, error: insertError } = await this.supabase
                    .from('users')
                    .insert([
                        {
                            user_id: this.userData.id,
                            username: this.userData.username || this.userData.first_name,
                            reputation: 0,
                            language: 'en'
                        }
                    ])
                    .select()
                    .single();
                
                if (insertError) {
                    console.error("Error creating user:", insertError);
                    // If there's an error, we'll still proceed but show a warning
                    this.showNotification("Account setup incomplete. Some features may be limited.", "warning");
                    return false;
                }
                
                this.userData.reputation = 0;
                this.userData.language = 'en';
                return true;
            } else if (error) {
                console.error("Error checking user:", error);
                // Continue without Supabase user data
                return false;
            } else {
                // Update user data with Supabase info
                this.userData.reputation = data.reputation || 0;
                this.userData.language = data.language || 'en';
                this.currentLanguage = data.language || 'en';
                this.applyLanguage(this.currentLanguage);
                
                // Update language selector
                document.getElementById('languageSelect').value = this.currentLanguage;
                document.getElementById('currentLanguage').textContent = this.currentLanguage === 'en' ? 'EN' : 'AR';
                
                return true;
            }
        } catch (error) {
            console.error("Error syncing user with Supabase:", error);
            // Continue without Supabase user data
            return false;
        }
    }
    
    updateConnectionStatus(connected) {
        this.isConnected = connected;
        const statusElement = document.getElementById('connectionStatus');
        
        if (statusElement) {
            if (connected) {
                statusElement.innerHTML = '<i class="fas fa-check-circle"></i> <span data-en="Connected" data-ar="متصل">Connected</span>';
                statusElement.classList.add('connected');
            } else {
                statusElement.innerHTML = '<i class="fas fa-times-circle"></i> <span data-en="Disconnected" data-ar="غير متصل">Disconnected</span>';
                statusElement.classList.remove('connected');
            }
        }
    }
    
    updateUserInfo() {
        if (this.userData) {
            // Update username
            const usernameElement = document.getElementById('settingsUsername');
            if (usernameElement) {
                usernameElement.textContent = this.userData.username || this.userData.first_name;
            }
            
            // Update reputation
            document.getElementById('userReputation').textContent = this.userData.reputation || 0;
            document.getElementById('settingsReputation').textContent = this.userData.reputation || 0;
        }
    }
    
    async loadInitialData() {
        await this.loadNearbyReports();
        await this.loadUserReports();
        this.loadMap(); // Always load map, even with no data
    }
    
    async loadNearbyReports() {
        try {
            // Show loading state
            document.getElementById('nearbyReports').innerHTML = '<div class="loading-spinner"></div>';
            
            // Get reports from Supabase
            const { data: reports, error } = await this.supabase
                .from('reports')
                .select(`
                    *,
                    votes (vote_type)
                `)
                .order('created_at', { ascending: false })
                .limit(20);
            
            if (error) {
                console.error("Error loading reports:", error);
                this.showNotification("Failed to load reports", "error");
                document.getElementById('nearbyReports').innerHTML = 
                    '<div class="no-data" data-en="Error loading reports" data-ar="خطأ في تحميل التقارير">Error loading reports</div>';
                return;
            }
            
            // Process votes
            this.nearbyReports = reports.map(report => {
                const userVote = report.votes && report.votes.length > 0 ? 
                    report.votes.find(v => v.user_id === this.userData?.id)?.vote_type : null;
                
                return {
                    ...report,
                    user_vote: userVote
                };
            });
            
            this.displayNearbyReports();
        } catch (error) {
            console.error("Error loading nearby reports:", error);
            this.showNotification("Failed to load reports", "error");
            document.getElementById('nearbyReports').innerHTML = 
                '<div class="no-data" data-en="Error loading reports" data-ar="خطأ في تحميل التقارير">Error loading reports</div>';
        }
    }
    
    displayNearbyReports() {
        const container = document.getElementById('nearbyReports');
        
        if (this.nearbyReports.length === 0) {
            container.innerHTML = '<div class="no-data" data-en="No reports nearby" data-ar="لا توجد تقارير قريبة">No reports nearby</div>';
            this.updateTextDirection();
            return;
        }
        
        container.innerHTML = this.nearbyReports.map(report => `
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
                    </div>
                </div>
                <div class="report-actions">
                    <button class="vote-btn upvote-btn ${report.user_vote === 'upvote' ? 'active' : ''}" 
                            onclick="app.voteReport(${report.id}, 'upvote')">
                        <i class="fas fa-thumbs-up"></i> ${report.upvotes || 0}
                    </button>
                    <button class="vote-btn downvote-btn ${report.user_vote === 'downvote' ? 'active' : ''}" 
                            onclick="app.voteReport(${report.id}, 'downvote')">
                        <i class="fas fa-thumbs-down"></i> ${report.downvotes || 0}
                    </button>
                </div>
            </div>
        `).join('');
        
        this.updateTextDirection();
    }
    
    async loadUserReports() {
        if (!this.userData) return;
        
        try {
            // Show loading state
            document.getElementById('userReports').innerHTML = '<div class="loading-spinner"></div>';
            
            // Get user reports from Supabase
            const { data: reports, error } = await this.supabase
                .from('reports')
                .select('*')
                .eq('user_id', this.userData.id)
                .order('created_at', { ascending: false });
            
            if (error) {
                console.error("Error loading user reports:", error);
                this.showNotification("Failed to load your reports", "error");
                document.getElementById('userReports').innerHTML = 
                    '<div class="no-data" data-en="Error loading your reports" data-ar="خطأ في تحميل تقاريرك">Error loading your reports</div>';
                return;
            }
            
            this.userReports = reports;
            this.displayUserReports();
        } catch (error) {
            console.error("Error loading user reports:", error);
            this.showNotification("Failed to load your reports", "error");
            document.getElementById('userReports').innerHTML = 
                '<div class="no-data" data-en="Error loading your reports" data-ar="خطأ في تحميل تقاريرك">Error loading your reports</div>';
        }
    }
    
    displayUserReports() {
        const container = document.getElementById('userReports');
        
        if (this.userReports.length === 0) {
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
        if (!this.userData) {
            this.showNotification("Please sign in to vote", "error");
            return;
        }
        
        try {
            // Check if user already voted
            const { data: existingVote, error: voteError } = await this.supabase
                .from('votes')
                .select('*')
                .eq('user_id', this.userData.id)
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
                    // Remove vote if it's the same type
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
                    // Update vote if it's different
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
                // Add new vote
                const { error: insertError } = await this.supabase
                    .from('votes')
                    .insert([
                        {
                            user_id: this.userData.id,
                            report_id: reportId,
                            vote_type: voteType
                        }
                    ]);
                
                if (insertError) {
                    console.error("Error adding vote:", insertError);
                    this.showNotification("Failed to submit vote", "error");
                    return;
                }
                
                operation = 'add';
            }
            
            // Update report vote counts
            const report = this.nearbyReports.find(r => r.id === reportId);
            if (!report) return;
            
            let upvotes = report.upvotes || 0;
            let downvotes = report.downvotes || 0;
            
            if (operation === 'add') {
                if (voteType === 'upvote') upvotes++;
                else downvotes++;
            } else if (operation === 'remove') {
                if (voteType === 'upvote') upvotes--;
                else downvotes--;
            } else if (operation === 'change') {
                if (voteType === 'upvote') {
                    upvotes++;
                    downvotes--;
                } else {
                    downvotes++;
                    upvotes--;
                }
            }
            
            // Update the report in Supabase
            const { error: updateError } = await this.supabase
                .from('reports')
                .update({ upvotes, downvotes })
                .eq('id', reportId);
            
            if (updateError) {
                console.error("Error updating report votes:", updateError);
            }
            
            // Update UI
            report.upvotes = upvotes;
            report.downvotes = downvotes;
            report.user_vote = operation === 'remove' ? null : voteType;
            
            this.displayNearbyReports();
            this.showNotification(operation === 'remove' ? 'Vote removed' : `Vote ${voteType === 'upvote' ? 'upvoted' : 'downvoted'}`, "success");
        } catch (error) {
            console.error("Error voting:", error);
            this.showNotification("Failed to submit vote", "error");
        }
    }
    
    showReportModal() {
        this.selectedVibe = null;
        document.querySelectorAll('.vibe-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        document.getElementById('reportNotes').value = '';
        document.getElementById('reportModal').style.display = 'block';
    }
    
    selectVibe(vibe) {
        this.selectedVibe = vibe;
        document.querySelectorAll('.vibe-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        document.querySelector(`.vibe-option[data-vibe="${vibe}"]`).classList.add('selected');
    }
    
    async submitReport() {
        if (!this.userData) {
            this.showNotification("Please sign in to submit a report", "error");
            return;
        }
        
        if (!this.selectedVibe) {
            this.showNotification("Please select a vibe type", "error");
            return;
        }
        
        const notes = document.getElementById('reportNotes').value;
        
        try {
            // Get user location if available
            let location = "Unknown Location";
            let latitude = null;
            let longitude = null;
            
            if (this.tg && this.tg.initDataUnsafe.user && this.tg.initDataUnsafe.user.location) {
                const userLocation = this.tg.initDataUnsafe.user.location;
                latitude = userLocation.latitude;
                longitude = userLocation.longitude;
                location = `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`;
            }
            
            // Submit report to Supabase
            const { data, error } = await this.supabase
                .from('reports')
                .insert([
                    {
                        user_id: this.userData.id,
                        vibe_type: this.selectedVibe,
                        notes: notes,
                        location: location,
                        latitude: latitude,
                        longitude: longitude,
                        emergency: false,
                        upvotes: 0,
                        downvotes: 0
                    }
                ])
                .select();
            
            if (error) {
                console.error("Error submitting report:", error);
                this.showNotification(`Failed to submit report: ${error.message}`, "error");
                return;
            }
            
            // Update user reputation if user exists in Supabase
            try {
                const { error: updateError } = await this.supabase
                    .from('users')
                    .update({ reputation: (this.userData.reputation || 0) + 10 })
                    .eq('user_id', this.userData.id);
                
                if (!updateError) {
                    this.userData.reputation = (this.userData.reputation || 0) + 10;
                    this.updateUserInfo();
                }
            } catch (reputationError) {
                console.log("Could not update reputation (user might not exist in Supabase yet)");
            }
            
            // Close modal
            document.getElementById('reportModal').style.display = 'none';
            
            // Show success message
            this.showNotification("Report submitted successfully", "success");
            
            // Refresh all data
            await this.loadNearbyReports();
            await this.loadUserReports();
            this.loadMap(); // Refresh map with new data
            
        } catch (error) {
            console.error("Error submitting report:", error);
            this.showNotification("Failed to submit report", "error");
        }
    }
    
    showEmergencyReport() {
        document.getElementById('emergencyType').value = 'dangerous';
        document.getElementById('emergencyDetails').value = '';
        document.getElementById('emergencyModal').style.display = 'block';
    }
    
    async submitEmergencyReport() {
        if (!this.userData) {
            this.showNotification("Please sign in to submit an emergency report", "error");
            return;
        }
        
        const emergencyType = document.getElementById('emergencyType').value;
        const details = document.getElementById('emergencyDetails').value;
        
        if (!details.trim()) {
            this.showNotification("Please provide emergency details", "error");
            return;
        }
        
        try {
            // Get user location if available
            let location = "Unknown Location";
            let latitude = null;
            let longitude = null;
            
            if (this.tg && this.tg.initDataUnsafe.user && this.tg.initDataUnsafe.user.location) {
                const userLocation = this.tg.initDataUnsafe.user.location;
                latitude = userLocation.latitude;
                longitude = userLocation.longitude;
                location = `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`;
            }
            
            // Submit emergency report to Supabase
            const { data, error } = await this.supabase
                .from('reports')
                .insert([
                    {
                        user_id: this.userData.id,
                        vibe_type: 'dangerous',
                        notes: `EMERGENCY (${emergencyType}): ${details}`,
                        location: location,
                        latitude: latitude,
                        longitude: longitude,
                        emergency: true,
                        upvotes: 0,
                        downvotes: 0
                    }
                ])
                .select();
            
            if (error) {
                console.error("Error submitting emergency report:", error);
                this.showNotification(`Failed to submit emergency report: ${error.message}`, "error");
                return;
            }
            
            // Update user reputation if user exists in Supabase
            try {
                const { error: updateError } = await this.supabase
                    .from('users')
                    .update({ reputation: (this.userData.reputation || 0) + 15 })
                    .eq('user_id', this.userData.id);
                
                if (!updateError) {
                    this.userData.reputation = (this.userData.reputation || 0) + 15;
                    this.updateUserInfo();
                }
            } catch (reputationError) {
                console.log("Could not update reputation (user might not exist in Supabase yet)");
            }
            
            // Close modal
            document.getElementById('emergencyModal').style.display = 'none';
            
            // Show success message
            this.showNotification("Emergency report submitted", "success");
            
            // Refresh all data
            await this.loadNearbyReports();
            await this.loadUserReports();
            this.loadMap(); // Refresh map with new data
            
            // Send to Telegram bot if available
            if (this.tg && this.tg.sendData) {
                this.tg.sendData(JSON.stringify({
                    type: 'emergency',
                    emergencyType: emergencyType,
                    details: details
                }));
            }
        } catch (error) {
            console.error("Error submitting emergency report:", error);
            this.showNotification("Failed to submit emergency report", "error");
        }
    }
    
    showView(viewName) {
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`.nav-btn[data-view="${viewName}"]`).classList.add('active');
        
        // Update views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });
        document.getElementById(`${viewName}View`).classList.add('active');
        
        // Load data for specific views
        if (viewName === 'map') {
            this.loadMap();
        } else if (viewName === 'reports') {
            this.loadUserReports();
        }
    }
    
    async loadMap() {
        try {
            // Show loading state
            document.getElementById('mapContainer').innerHTML = '<div class="loading-spinner"></div>';
            
            // Get reports with location data
            const { data: reports, error } = await this.supabase
                .from('reports')
                .select('*')
                .not('latitude', 'is', null)
                .not('longitude', 'is', null)
                .limit(50);
            
            if (error) {
                console.error("Error loading map data:", error);
                // Still show the map with empty state
                this.displayMap([]);
                return;
            }
            
            this.displayMap(reports || []);
        } catch (error) {
            console.error("Error loading map:", error);
            // Show map with empty state on error
            this.displayMap([]);
        }
    }
    
    displayMap(reports) {
        const container = document.getElementById('mapContainer');
        
        if (reports.length === 0) {
            // Show empty map state with instructions
            container.innerHTML = `
                <div class="map-visualization">
                    <div class="map-header">
                        <h3 data-en="Vibe Map" data-ar="خريطة الحالات">Vibe Map</h3>
                        <p data-en="Submit reports to see them on the map" data-ar="قم بإرسال التقارير لرؤيتها على الخريطة">
                            Submit reports to see them on the map
                        </p>
                    </div>
                    <div class="map-points">
                        <div class="map-placeholder-center">
                            <i class="fas fa-map-marked-alt"></i>
                            <p data-en="No location data yet" data-ar="لا توجد بيانات موقع بعد">No location data yet</p>
                            <button class="btn btn-primary" onclick="app.showReportModal()" style="margin-top: 15px;">
                                <i class="fas fa-plus-circle"></i>
                                <span data-en="Submit First Report" data-ar="إرسال أول تقرير">Submit First Report</span>
                            </button>
                        </div>
                    </div>
                    <div class="map-legend">
                        <div class="legend-item"><i class="fas fa-users" style="color: #FFA500;"></i> Crowded</div>
                        <div class="legend-item"><i class="fas fa-volume-up" style="color: #FF6B35;"></i> Noisy</div>
                        <div class="legend-item"><i class="fas fa-music" style="color: #28A745;"></i> Festive</div>
                        <div class="legend-item"><i class="fas fa-peace" style="color: #17A2B8;"></i> Calm</div>
                        <div class="legend-item"><i class="fas fa-eye" style="color: #FFC107;"></i> Suspicious</div>
                        <div class="legend-item"><i class="fas fa-exclamation-triangle" style="color: #DC3545;"></i> Dangerous</div>
                    </div>
                </div>
            `;
        } else {
            // Create map with reports
            const mapHTML = `
                <div class="map-visualization">
                    <div class="map-header">
                        <h3 data-en="Vibe Map" data-ar="خريطة الحالات">Vibe Map</h3>
                        <p data-en="${reports.length} reports with location data" data-ar="${reports.length} تقرير يحتوي على بيانات الموقع">
                            ${reports.length} reports with location data
                        </p>
                    </div>
                    <div class="map-points">
                        ${reports.map(report => `
                            <div class="map-point" 
                                 style="top: ${50 + ((report.latitude || 0) % 20)}%; left: ${50 + ((report.longitude || 0) % 20)}%;" 
                                 data-vibe="${report.vibe_type}" 
                                 title="${report.vibe_type} at ${report.location}">
                                <i class="${this.getVibeIcon(report.vibe_type)}"></i>
                            </div>
                        `).join('')}
                    </div>
                    <div class="map-legend">
                        <div class="legend-item"><i class="fas fa-users" style="color: #FFA500;"></i> Crowded</div>
                        <div class="legend-item"><i class="fas fa-volume-up" style="color: #FF6B35;"></i> Noisy</div>
                        <div class="legend-item"><i class="fas fa-music" style="color: #28A745;"></i> Festive</div>
                        <div class="legend-item"><i class="fas fa-peace" style="color: #17A2B8;"></i> Calm</div>
                        <div class="legend-item"><i class="fas fa-eye" style="color: #FFC107;"></i> Suspicious</div>
                        <div class="legend-item"><i class="fas fa-exclamation-triangle" style="color: #DC3545;"></i> Dangerous</div>
                    </div>
                </div>
            `;
            
            container.innerHTML = mapHTML;
        }
        
        this.updateTextDirection();
    }
    
    async loadTopAreas() {
        try {
            // Get top areas by report count
            const { data: areas, error } = await this.supabase
                .from('reports')
                .select('location, vibe_type')
                .not('location', 'is', null)
                .not('location', 'eq', 'Unknown Location');
            
            if (error) {
                console.error("Error loading top areas:", error);
                this.showNotification("Failed to load top areas", "error");
                return;
            }
            
            // Count reports by location
            const locationCounts = {};
            areas.forEach(report => {
                if (!locationCounts[report.location]) {
                    locationCounts[report.location] = {
                        count: 0,
                        vibes: {}
                    };
                }
                locationCounts[report.location].count++;
                
                if (!locationCounts[report.location].vibes[report.vibe_type]) {
                    locationCounts[report.location].vibes[report.vibe_type] = 0;
                }
                locationCounts[report.location].vibes[report.vibe_type]++;
            });
            
            // Convert to array and sort
            const topAreas = Object.entries(locationCounts)
                .map(([location, data]) => ({ location, ...data }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10);
            
            // Show top areas in a modal
            const modalContent = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 data-en="Top Areas" data-ar="أهم المناطق">Top Areas</h2>
                        <span class="close" onclick="app.closeModal('topAreasModal')">&times;</span>
                    </div>
                    <div class="modal-body">
                        ${topAreas.length > 0 ? `
                            <div class="top-areas-list">
                                ${topAreas.map(area => `
                                    <div class="area-item">
                                        <div class="area-header">
                                            <h3>${area.location}</h3>
                                            <span class="report-count">${area.count} reports</span>
                                        </div>
                                        <div class="area-vibes">
                                            ${Object.entries(area.vibes)
                                                .map(([vibe, count]) => `
                                                    <span class="vibe-tag">
                                                        <i class="${this.getVibeIcon(vibe)}"></i>
                                                        ${vibe}: ${count}
                                                    </span>
                                                `).join('')}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : `
                            <p data-en="No area data available" data-ar="لا توجد بيانات للمناطق متاحة">
                                No area data available
                            </p>
                        `}
                    </div>
                </div>
            `;
            
            // Create or update modal
            let modal = document.getElementById('topAreasModal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'topAreasModal';
                modal.className = 'modal';
                document.body.appendChild(modal);
            }
            
            modal.innerHTML = modalContent;
            modal.style.display = 'block';
            this.updateTextDirection();
        } catch (error) {
            console.error("Error loading top areas:", error);
            this.showNotification("Failed to load top areas", "error");
        }
    }
    
    toggleLanguage() {
        this.currentLanguage = this.currentLanguage === 'en' ? 'ar' : 'en';
        this.applyLanguage(this.currentLanguage);
        
        // Update language switcher text
        document.getElementById('currentLanguage').textContent = this.currentLanguage === 'en' ? 'EN' : 'AR';
        
        // Update user language in Supabase
        if (this.userData) {
            this.supabase
                .from('users')
                .update({ language: this.currentLanguage })
                .eq('user_id', this.userData.id)
                .then(({ error }) => {
                    if (error) {
                        console.error("Error updating language:", error);
                    }
                });
        }
        
        this.showNotification(`Language changed to ${this.currentLanguage === 'en' ? 'English' : 'Arabic'}`, "success");
    }
    
    changeLanguage(lang) {
        this.currentLanguage = lang;
        this.applyLanguage(lang);
        
        // Update language selector
        document.getElementById('languageSelect').value = this.currentLanguage;
        document.getElementById('currentLanguage').textContent = this.currentLanguage === 'en' ? 'EN' : 'AR';
        
        // Update user language in Supabase
        if (this.userData) {
            this.supabase
                .from('users')
                .update({ language: this.currentLanguage })
                .eq('user_id', this.userData.id)
                .then(({ error }) => {
                    if (error) {
                        console.error("Error updating language:", error);
                    }
                });
        }
        
        this.showNotification(`Language changed to ${lang === 'en' ? 'English' : 'Arabic'}`, "success");
    }
    
    applyLanguage(lang) {
        // Update all elements with data attributes
        document.querySelectorAll('[data-en], [data-ar]').forEach(element => {
            if (element.hasAttribute(`data-${lang}`)) {
                const value = element.getAttribute(`data-${lang}`);
                if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                    element.placeholder = value;
                } else {
                    element.textContent = value;
                }
            }
        });
        
        // Update text direction
        document.body.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    }
    
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        const messageElement = document.getElementById('notificationMessage');
        
        messageElement.textContent = message;
        notification.className = `notification ${type}`;
        
        // Show notification
        notification.classList.remove('hidden');
        
        // Hide after 3 seconds
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 3000);
    }
    
    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }
    
    // Utility methods
    getVibeIcon(vibe) {
        const icons = {
            crowded: 'fas fa-users',
            noisy: 'fas fa-volume-up',
            festive: 'fas fa-music',
            calm: 'fas fa-peace',
            suspicious: 'fas fa-eye',
            dangerous: 'fas fa-exclamation-triangle'
        };
        return icons[vibe] || 'fas fa-question';
    }
    
    getVibeArabicName(vibe) {
        const names = {
            crowded: 'مزدحم',
            noisy: 'صاخب',
            festive: 'احتفالي',
            calm: 'هادئ',
            suspicious: 'مريب',
            dangerous: 'خطر'
        };
        return names[vibe] || vibe;
    }
    
    capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
    
    formatTimeAgo(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diff = now - time;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return this.currentLanguage === 'en' ? 'Just now' : 'الآن';
        if (minutes < 60) return this.currentLanguage === 'en' ? `${minutes}m ago` : `منذ ${minutes} دقيقة`;
        if (hours < 24) return this.currentLanguage === 'en' ? `${hours}h ago` : `منذ ${hours} ساعة`;
        return this.currentLanguage === 'en' ? `${days}d ago` : `منذ ${days} يوم`;
    }
    
    updateTextDirection() {
        document.querySelectorAll('[data-en], [data-ar]').forEach(element => {
            if (this.currentLanguage === 'ar') {
                element.setAttribute('dir', 'rtl');
            } else {
                element.setAttribute('dir', 'ltr');
            }
        });
    }
}

// Initialize the app when the page loads
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new HyperApp();
});