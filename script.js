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
            this.tg.enableClosingConfirmation();
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
        if (!this.userData) return;
        
        try {
            // Check if user exists in Supabase
            const { data, error } = await this.supabase
                .from('users')
                .select('*')
                .eq('user_id', this.userData.id)
                .single();
            
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
                    ]);
                
                if (insertError) {
                    console.error("Error creating user:", insertError);
                }
            } else if (error) {
                console.error("Error checking user:", error);
            } else {
                // Update user data with Supabase info
                this.userData.reputation = data.reputation;
                this.userData.language = data.language;
                this.currentLanguage = data.language;
                this.applyLanguage(this.currentLanguage);
                
                // Update language selector
                document.getElementById('languageSelect').value = this.currentLanguage;
                document.getElementById('currentLanguage').textContent = this.currentLanguage === 'en' ? 'EN' : 'AR';
            }
        } catch (error) {
            console.error("Error syncing user with Supabase:", error);
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
    }
    
    async loadNearbyReports() {
        try {
            // Show loading state
            document.getElementById('nearbyReports').innerHTML = '<div class="loading-spinner"></div>';
            
            // Get reports from Supabase
            const { data: reports, error } = await this.supabase
                .from('reports')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20);
            
            if (error) {
                console.error("Error loading reports:", error);
                this.showNotification("Failed to load reports", "error");
                return;
            }
            
            this.nearbyReports = reports;
            this.displayNearbyReports();
        } catch (error) {
            console.error("Error loading nearby reports:", error);
            this.showNotification("Failed to load reports", "error");
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
                return;
            }
            
            this.userReports = reports;
            this.displayUserReports();
        } catch (error) {
            console.error("Error loading user reports:", error);
            this.showNotification("Failed to load your reports", "error");
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
                .single();
            
            if (voteError && voteError.code !== 'PGRST116') {
                console.error("Error checking vote:", voteError);
                this.showNotification("Failed to submit vote", "error");
                return;
            }
            
            if (existingVote) {
                // User already voted, update the vote
                if (existingVote.vote_type === voteType) {
                    // Same vote type, remove the vote
                    const { error: deleteError } = await this.supabase
                        .from('votes')
                        .delete()
                        .eq('id', existingVote.id);
                    
                    if (deleteError) {
                        console.error("Error removing vote:", deleteError);
                        this.showNotification("Failed to update vote", "error");
                        return;
                    }
                    
                    // Update report vote counts
                    const updateData = {};
                    updateData[voteType === 'upvote' ? 'upvotes' : 'downvotes'] = 
                        (this.nearbyReports.find(r => r.id === reportId)[voteType === 'upvote' ? 'upvotes' : 'downvotes'] || 0) - 1;
                    
                    const { error: updateError } = await this.supabase
                        .from('reports')
                        .update(updateData)
                        .eq('id', reportId);
                    
                    if (updateError) {
                        console.error("Error updating report votes:", updateError);
                    }
                    
                    this.showNotification("Vote removed", "info");
                } else {
                    // Different vote type, update the vote
                    const { error: updateError } = await this.supabase
                        .from('votes')
                        .update({ vote_type: voteType })
                        .eq('id', existingVote.id);
                    
                    if (updateError) {
                        console.error("Error updating vote:", updateError);
                        this.showNotification("Failed to update vote", "error");
                        return;
                    }
                    
                    // Update report vote counts
                    const oldVoteType = existingVote.vote_type;
                    const updateData = {};
                    updateData[oldVoteType === 'upvote' ? 'upvotes' : 'downvotes'] = 
                        (this.nearbyReports.find(r => r.id === reportId)[oldVoteType === 'upvote' ? 'upvotes' : 'downvotes'] || 0) - 1;
                    updateData[voteType === 'upvote' ? 'upvotes' : 'downvotes'] = 
                        (this.nearbyReports.find(r => r.id === reportId)[voteType === 'upvote' ? 'upvotes' : 'downvotes'] || 0) + 1;
                    
                    const { error: updateReportError } = await this.supabase
                        .from('reports')
                        .update(updateData)
                        .eq('id', reportId);
                    
                    if (updateReportError) {
                        console.error("Error updating report votes:", updateReportError);
                    }
                    
                    this.showNotification(`Vote changed to ${voteType}`, "success");
                }
            } else {
                // New vote
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
                
                // Update report vote counts
                const updateData = {};
                updateData[voteType === 'upvote' ? 'upvotes' : 'downvotes'] = 
                    (this.nearbyReports.find(r => r.id === reportId)[voteType === 'upvote' ? 'upvotes' : 'downvotes'] || 0) + 1;
                
                const { error: updateError } = await this.supabase
                    .from('reports')
                    .update(updateData)
                    .eq('id', reportId);
                
                if (updateError) {
                    console.error("Error updating report votes:", updateError);
                }
                
                this.showNotification(`Vote ${voteType === 'upvote' ? 'upvoted' : 'downvoted'}`, "success");
            }
            
            // Refresh reports
            await this.loadNearbyReports();
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
            let location = null;
            let latitude = null;
            let longitude = null;
            
            if (this.tg && this.tg.initDataUnsafe.user && this.tg.initDataUnsafe.user.location) {
                const userLocation = this.tg.initDataUnsafe.user.location;
                latitude = userLocation.latitude;
                longitude = userLocation.longitude;
                
                // Reverse geocode to get location name
                // This would be implemented with a geocoding service
                location = "User location";
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
                ]);
            
            if (error) {
                console.error("Error submitting report:", error);
                this.showNotification("Failed to submit report", "error");
                return;
            }
            
            // Update user reputation
            const { error: updateError } = await this.supabase
                .from('users')
                .update({ reputation: (this.userData.reputation || 0) + 10 })
                .eq('user_id', this.userData.id);
            
            if (updateError) {
                console.error("Error updating reputation:", updateError);
            } else {
                this.userData.reputation = (this.userData.reputation || 0) + 10;
                this.updateUserInfo();
            }
            
            // Close modal
            document.getElementById('reportModal').style.display = 'none';
            
            // Show success message
            this.showNotification("Report submitted successfully", "success");
            
            // Refresh reports
            await this.loadNearbyReports();
            await this.loadUserReports();
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
            let location = null;
            let latitude = null;
            let longitude = null;
            
            if (this.tg && this.tg.initDataUnsafe.user && this.tg.initDataUnsafe.user.location) {
                const userLocation = this.tg.initDataUnsafe.user.location;
                latitude = userLocation.latitude;
                longitude = userLocation.longitude;
                
                // Reverse geocode to get location name
                // This would be implemented with a geocoding service
                location = "User location";
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
                ]);
            
            if (error) {
                console.error("Error submitting emergency report:", error);
                this.showNotification("Failed to submit emergency report", "error");
                return;
            }
            
            // Update user reputation
            const { error: updateError } = await this.supabase
                .from('users')
                .update({ reputation: (this.userData.reputation || 0) + 15 })
                .eq('user_id', this.userData.id);
            
            if (updateError) {
                console.error("Error updating reputation:", updateError);
            } else {
                this.userData.reputation = (this.userData.reputation || 0) + 15;
                this.updateUserInfo();
            }
            
            // Close modal
            document.getElementById('emergencyModal').style.display = 'none';
            
            // Show success message
            this.showNotification("Emergency report submitted", "success");
            
            // Refresh reports
            await this.loadNearbyReports();
            await this.loadUserReports();
            
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
        }
    }
    
    loadMap() {
        // Simulate map loading
        document.getElementById('mapContainer').innerHTML = '<div class="loading-spinner"></div>';
        
        setTimeout(() => {
            document.getElementById('mapContainer').innerHTML = `
                <div class="map-placeholder">
                    <i class="fas fa-map-marked-alt"></i>
                    <p data-en="Interactive map would be displayed here" data-ar="سيتم عرض الخريطة التفاعلية هنا">Interactive map would be displayed here</p>
                </div>
            `;
            this.updateTextDirection();
        }, 1000);
    }
    
    loadTopAreas() {
        // This would load top areas in a real implementation
        this.showNotification("Top areas feature coming soon", "info");
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
