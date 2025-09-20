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
        
        // Initialize Supabase with the correct API key
        this.supabaseUrl = 'https://nqwejzbayquzsvcodunl.supabase.co';
        this.supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xd2VqemJheXF1enN2Y29kdW5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzOTA0MjAsImV4cCI6MjA3Mzk2NjQyMH0.01yifC-tfEbBHD5u315fpb_nZrqMZCbma_UrMacMb78';
        this.supabase = window.supabase.createClient(this.supabaseUrl, this.supabaseKey);
        
        // Bind all methods to maintain 'this' context
        this.bindMethods();
        
        this.init();
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
            'updateTextDirection', 'requestUserLocation'
        ];
        
        methods.forEach(method => {
            this[method] = this[method].bind(this);
        });
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
            
            // Try to get user location
            this.requestUserLocation();
            
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
        
        // Make app instance globally available for HTML onclick handlers
        window.hyperApp = this;
    }
    
    async requestUserLocation() {
        if (this.tg && this.tg.showPopup && this.tg.isLocationRequested) {
            try {
                // Request location permission
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
                console.log("Location request not available in this Telegram version");
            }
        }
    }
    
    setupEventListeners() {
        // Navigation buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.currentTarget.getAttribute('data-view');
                this.showView(view);
            });
        });
        
        // Language switcher
        const languageSwitcher = document.getElementById('languageSwitcher');
        if (languageSwitcher) {
            languageSwitcher.addEventListener('click', this.toggleLanguage);
        }
        
        // Refresh button
        const refreshBtn = document.querySelector('.refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', this.loadNearbyReports);
        }
        
        // Quick action buttons
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.getAttribute('data-action');
                if (action === 'report') {
                    this.showReportModal();
                } else if (action === 'areas') {
                    this.loadTopAreas();
                } else if (action === 'emergency') {
                    this.showEmergencyReport();
                }
            });
        });
        
        // Vibe option buttons
        document.querySelectorAll('.vibe-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const vibe = e.currentTarget.getAttribute('data-vibe');
                this.selectVibe(vibe);
            });
        });
        
        // Modal close buttons
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    this.closeModal(modal.id);
                }
            });
        });
        
        // Form submit buttons
        const reportSubmitBtn = document.querySelector('[data-action="submit-report"]');
        if (reportSubmitBtn) {
            reportSubmitBtn.addEventListener('click', this.submitReport);
        }
        
        const emergencySubmitBtn = document.querySelector('[data-action="submit-emergency"]');
        if (emergencySubmitBtn) {
            emergencySubmitBtn.addEventListener('click', this.submitEmergencyReport);
        }
        
        // Language select dropdown
        const languageSelect = document.getElementById('languageSelect');
        if (languageSelect) {
            languageSelect.addEventListener('change', (e) => {
                this.changeLanguage(e.target.value);
            });
        }
        
        // Vote buttons (delegated event handling)
        document.addEventListener('click', (e) => {
            if (e.target.closest('.upvote-btn')) {
                const reportItem = e.target.closest('.report-item');
                if (reportItem) {
                    const reportId = parseInt(reportItem.dataset.id);
                    this.voteReport(reportId, 'upvote');
                }
            } else if (e.target.closest('.downvote-btn')) {
                const reportItem = e.target.closest('.report-item');
                if (reportItem) {
                    const reportId = parseInt(reportItem.dataset.id);
                    this.voteReport(reportId, 'downvote');
                }
            }
        });
        
        // Map button in empty state
        document.addEventListener('click', (e) => {
            if (e.target.id === 'firstReportBtn' || e.target.closest('#firstReportBtn')) {
                this.showReportModal();
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
                    if (insertError.message.includes('row-level security')) {
                        this.showNotification("Please check database permissions", "error");
                    } else {
                        this.showNotification("Account setup incomplete. Some features may be limited.", "warning");
                    }
                    return false;
                }
                
                this.userData.reputation = 0;
                this.userData.language = 'en';
                return true;
            } else if (error) {
                console.error("Error checking user:", error);
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
        await this.loadUserReports();
        this.loadMap();
    }
    
    async loadNearbyReports() {
        try {
            document.getElementById('nearbyReports').innerHTML = '<div class="loading-spinner"></div>';
            
            const { data: reports, error } = await this.supabase
                .from('reports')
                .select(`*, votes (vote_type)`)
                .order('created_at', { ascending: false })
                .limit(20);
            
            if (error) {
                console.error("Error loading reports:", error);
                if (error.message.includes('row-level security')) {
                    this.showNotification("Database permissions issue. Please contact support.", "error");
                } else {
                    this.showNotification("Failed to load reports", "error");
                }
                document.getElementById('nearbyReports').innerHTML = 
                    '<div class="no-data" data-en="Error loading reports" data-ar="خطأ في تحميل التقارير">Error loading reports</div>';
                return;
            }
            
            this.nearbyReports = reports.map(report => {
                const userVote = report.votes && report.votes.length > 0 ? 
                    report.votes.find(v => v.user_id === this.userData?.id)?.vote_type : null;
                
                return { ...report, user_vote: userVote };
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
                    <button class="vote-btn upvote-btn ${report.user_vote === 'upvote' ? 'active' : ''}">
                        <i class="fas fa-thumbs-up"></i> ${report.upvotes || 0}
                    </button>
                    <button class="vote-btn downvote-btn ${report.user_vote === 'downvote' ? 'active' : ''}">
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
            document.getElementById('userReports').innerHTML = '<div class="loading-spinner"></div>';
            
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
            const { data: existingVote, error: voteError } = await this.supabase
                .from('votes')
                .select('*')
                .eq('user_id', this.userData.id)
                .eq('report_id', reportId)
                .maybeSingle();
            
            if (voteError && voteError.code !== 'PGRST116') {
                console.error("Error checking vote:", voteError);
                if (voteError.message.includes('row-level security')) {
                    this.showNotification("Database permissions issue. Please contact support.", "error");
                } else {
                    this.showNotification("Failed to submit vote", "error");
                }
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
                    .insert([{ user_id: this.userData.id, report_id: reportId, vote_type: voteType }]);
                
                if (insertError) {
                    console.error("Error adding vote:", insertError);
                    if (insertError.message.includes('row-level security')) {
                        this.showNotification("Database permissions issue. Please contact support.", "error");
                    } else {
                        this.showNotification("Failed to submit vote", "error");
                    }
                    return;
                }
                
                operation = 'add';
            }
            
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
            
            const { error: updateError } = await this.supabase
                .from('reports')
                .update({ upvotes, downvotes })
                .eq('id', reportId);
            
            if (updateError) {
                console.error("Error updating report votes:", updateError);
            }
            
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
        
        // Ensure user exists in the database before submitting report
        const userSynced = await this.syncUserWithSupabase();
        if (!userSynced) {
            this.showNotification("User account not ready. Please try again.", "error");
            return;
        }
        
        const notes = document.getElementById('reportNotes').value;
        
        try {
            let location = "Unknown Location";
            let latitude = null;
            let longitude = null;
            
            if (this.tg && this.tg.initDataUnsafe.user && this.tg.initDataUnsafe.user.location) {
                const userLocation = this.tg.initDataUnsafe.user.location;
                latitude = userLocation.latitude;
                longitude = userLocation.longitude;
                location = `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`;
            }
            
            const { data, error } = await this.supabase
                .from('reports')
                .insert([{
                    user_id: this.userData.id,
                    vibe_type: this.selectedVibe,
                    notes: notes,
                    location: location,
                    latitude: latitude,
                    longitude: longitude,
                    emergency: false,
                    upvotes: 0,
                    downvotes: 0
                }])
                .select();
            
            if (error) {
                console.error("Error submitting report:", error);
                if (error.message.includes('row-level security')) {
                    this.showNotification("Database permissions issue. Please run the SQL fix or contact support.", "error");
                } else if (error.message.includes('foreign key constraint')) {
                    this.showNotification("User account issue. Please try again.", "error");
                } else {
                    this.showNotification(`Failed to submit report: ${error.message}`, "error");
                }
                return;
            }
            
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
                console.log("Could not update reputation");
            }
            
            document.getElementById('reportModal').style.display = 'none';
            this.showNotification("Report submitted successfully", "success");
            
            await this.loadNearbyReports();
            await this.loadUserReports();
            this.loadMap();
            
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
        
        // Ensure user exists in the database before submitting report
        const userSynced = await this.syncUserWithSupabase();
        if (!userSynced) {
            this.showNotification("User account not ready. Please try again.", "error");
            return;
        }
        
        const emergencyType = document.getElementById('emergencyType').value;
        const details = document.getElementById('emergencyDetails').value;
        
        if (!details.trim()) {
            this.showNotification("Please provide emergency details", "error");
            return;
        }
        
        try {
            let location = "Unknown Location";
            let latitude = null;
            let longitude = null;
            
            if (this.tg && this.tg.initDataUnsafe.user && this.tg.initDataUnsafe.user.location) {
                const userLocation = this.tg.initDataUnsafe.user.location;
                latitude = userLocation.latitude;
                longitude = userLocation.longitude;
                location = `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`;
            }
            
            const { data, error } = await this.supabase
                .from('reports')
                .insert([{
                    user_id: this.userData.id,
                    vibe_type: 'dangerous',
                    notes: `EMERGENCY (${emergencyType}): ${details}`,
                    location: location,
                    latitude: latitude,
                    longitude: longitude,
                    emergency: true,
                    upvotes: 0,
                    downvotes: 0
                }])
                .select();
            
            if (error) {
                console.error("Error submitting emergency report:", error);
                if (error.message.includes('row-level security')) {
                    this.showNotification("Database permissions issue. Please run the SQL fix or contact support.", "error");
                } else if (error.message.includes('foreign key constraint')) {
                    this.showNotification("User account issue. Please try again.", "error");
                } else {
                    this.showNotification(`Failed to submit emergency report: ${error.message}`, "error");
                }
                return;
            }
            
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
                console.log("Could not update reputation");
            }
            
            document.getElementById('emergencyModal').style.display = 'none';
            this.showNotification("Emergency report submitted", "success");
            
            await this.loadNearbyReports();
            await this.loadUserReports();
            this.loadMap();
            
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
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`.nav-btn[data-view="${viewName}"]`).classList.add('active');
        
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });
        document.getElementById(`${viewName}View`).classList.add('active');
        
        if (viewName === 'map') {
            this.loadMap();
        } else if (viewName === 'reports') {
            this.loadUserReports();
        }
    }
    
    async loadMap() {
        try {
            document.getElementById('mapContainer').innerHTML = '<div class="loading-spinner"></div>';
            
            const { data: reports, error } = await this.supabase
                .from('reports')
                .select('*')
                .not('latitude', 'is', null)
                .not('longitude', 'is', null)
                .limit(50);
            
            if (error) {
                console.error("Error loading map data:", error);
                this.displayMap([]);
                return;
            }
            
            this.displayMap(reports || []);
        } catch (error) {
            console.error("Error loading map:", error);
            this.displayMap([]);
        }
    }
    
    displayMap(reports) {
        const container = document.getElementById('mapContainer');
        
        if (reports.length === 0) {
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
                            <button class="btn btn-primary" id="firstReportBtn">
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
            // Generate random positions for demo purposes
            const getRandomPosition = () => Math.floor(Math.random() * 80) + 10;
            
            container.innerHTML = `
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
                                 style="top: ${getRandomPosition()}%; left: ${getRandomPosition()}%;" 
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
        }
        
        this.updateTextDirection();
    }
    
    async loadTopAreas() {
        try {
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
            
            // For demo purposes, create sample data if none exists
            let locationCounts = {};
            
            if (areas && areas.length > 0) {
                areas.forEach(report => {
                    if (!locationCounts[report.location]) {
                        locationCounts[report.location] = { count: 0, vibes: {} };
                    }
                    locationCounts[report.location].count++;
                    
                    if (!locationCounts[report.location].vibes[report.vibe_type]) {
                        locationCounts[report.location].vibes[report.vibe_type] = 0;
                    }
                    locationCounts[report.location].vibes[report.vibe_type]++;
                });
            } else {
                // Sample data for demonstration
                locationCounts = {
                    "Downtown": { count: 15, vibes: { crowded: 5, noisy: 7, festive: 3 } },
                    "City Park": { count: 12, vibes: { calm: 8, festive: 4 } },
                    "Shopping District": { count: 8, vibes: { crowded: 6, noisy: 2 } }
                };
            }
            
            const topAreas = Object.entries(locationCounts)
                .map(([location, data]) => ({ location, ...data }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10);
            
            const modalContent = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2 data-en="Top Areas" data-ar="أهم المناطق">Top Areas</h2>
                        <span class="close">&times;</span>
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
            
            let modal = document.getElementById('topAreasModal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'topAreasModal';
                modal.className = 'modal';
                document.body.appendChild(modal);
            }
            
            modal.innerHTML = modalContent;
            modal.style.display = 'block';
            
            // Add event listener to close button
            const closeBtn = modal.querySelector('.close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    modal.style.display = 'none';
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
        this.applyLanguage(this.currentLanguage);
        
        document.getElementById('currentLanguage').textContent = this.currentLanguage === 'en' ? 'EN' : 'AR';
        
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
        
        document.getElementById('languageSelect').value = this.currentLanguage;
        document.getElementById('currentLanguage').textContent = this.currentLanguage === 'en' ? 'EN' : 'AR';
        
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
    }
    
    applyLanguage(lang) {
        // Update text direction
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
        
        // Update all elements with data attributes
        document.querySelectorAll('[data-en], [data-ar]').forEach(element => {
            const text = lang === 'ar' ? element.getAttribute('data-ar') : element.getAttribute('data-en');
            if (text && element.textContent !== text) {
                element.textContent = text;
            }
        });
        
        // Update placeholders
        const textarea = document.getElementById('reportNotes');
        const emergencyTextarea = document.getElementById('emergencyDetails');
        if (textarea) {
            textarea.placeholder = lang === 'ar' ? 'صف ما تواجهه...' : 'Describe what you\'re experiencing...';
        }
        if (emergencyTextarea) {
            emergencyTextarea.placeholder = lang === 'ar' ? 'يرجى تقديم أكبر عدد ممكن من التفاصيل...' : 'Please provide as many details as possible...';
        }
        
        this.updateTextDirection();
    }
    
    updateTextDirection() {
        document.querySelectorAll('[data-en], [data-ar]').forEach(element => {
            if (this.currentLanguage === 'ar') {
                element.style.textAlign = 'right';
                element.style.direction = 'rtl';
            } else {
                element.style.textAlign = 'left';
                element.style.direction = 'ltr';
            }
        });
    }
    
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        const messageElement = document.getElementById('notificationMessage');
        
        if (!notification || !messageElement) return;
        
        // Set message and type
        messageElement.textContent = message;
        notification.className = `notification ${type}`;
        
        // Show notification
        notification.classList.remove('hidden');
        
        // Auto hide after 3 seconds
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 3000);
    }
    
    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }
    
    getVibeIcon(vibeType) {
        const icons = {
            crowded: 'fas fa-users',
            noisy: 'fas fa-volume-up',
            festive: 'fas fa-music',
            calm: 'fas fa-peace',
            suspicious: 'fas fa-eye',
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
            suspicious: 'مريب',
            dangerous: 'خطر'
        };
        return names[vibeType] || vibeType;
    }
    
    capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
    
    formatTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);
        
        if (seconds < 60) return this.currentLanguage === 'en' ? 'Just now' : 'الآن';
        
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return this.currentLanguage === 'en' ? `${minutes}m ago` : `منذ ${minutes} دقيقة`;
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return this.currentLanguage === 'en' ? `${hours}h ago` : `منذ ${hours} ساعة`;
        
        const days = Math.floor(hours / 24);
        if (days < 7) return this.currentLanguage === 'en' ? `${days}d ago` : `منذ ${days} يوم`;
        
        return date.toLocaleDateString(this.currentLanguage === 'en' ? 'en-US' : 'ar-EG');
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', function() {
    window.app = new HyperApp();
});