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
                    // Check if it's RLS error and try to handle it
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
                // Check if it's RLS error
                if (error.message.includes('row-level security')) {
                    this.showNotification("Database permissions issue. Please contact support.", "error");
                } else {
                    this.showNotification("Failed to load reports", "error");
                }
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
                    if (insertError.message.includes('row-level security')) {
                        this.showNotification("Database permissions issue. Please contact support.", "error");
                    } else {
                        this.showNotification("Failed to submit vote", "error");
                    }
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
                if (error.message.includes('row-level security')) {
                    this.showNotification("Database permissions issue. Please run the SQL fix or contact support.", "error");
                } else {
                    this.showNotification(`Failed to submit report: ${error.message}`, "error");
                }
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
                if (error.message.includes('row-level security')) {
                    this.showNotification("Database permissions issue. Please run the SQL fix or contact support.", "error");
                } else {
                    this.showNotification(`Failed to submit emergency report: ${error.message}`, "error");
                }
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
    
    // ... rest of the methods remain the same as previous version ...
}

// Initialize the app when the page loads
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new HyperApp();
});