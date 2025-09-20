// HyperApp Mini App - Complete Implementation
class HyperApp {
    constructor() {
        this.tg = window.Telegram.WebApp;
        this.currentLanguage = 'en';
        this.userData = null;
        this.nearbyReports = [];
        this.userReports = [];
        this.selectedVibe = null;
        this.isConnected = false;
        
        this.init();
    }
    
    init() {
        console.log("Initializing HyperApp...");
        
        // Initialize Telegram WebApp
        if (this.tg) {
            this.tg.expand();
            this.tg.enableClosingConfirmation();
            this.tg.MainButton.hide();
            
            // Get user data
            const user = this.tg.initDataUnsafe.user;
            if (user) {
                this.userData = user;
                this.updateUserInfo();
            }
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Update connection status
            this.updateConnectionStatus(true);
            
            // Load initial data
            this.loadInitialData();
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
            this.loadInitialData();
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
            
            // Update reputation (would come from server in real implementation)
            const reputation = Math.floor(Math.random() * 100); // Simulated
            document.getElementById('userReputation').textContent = reputation;
            document.getElementById('settingsReputation').textContent = reputation;
        }
    }
    
    loadInitialData() {
        this.loadNearbyReports();
        this.loadUserReports();
    }
    
    async loadNearbyReports() {
        try {
            // Show loading state
            document.getElementById('nearbyReports').innerHTML = '<div class="loading-spinner"></div>';
            
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Simulated data - in real app, this would come from your backend
            this.nearbyReports = [
                {
                    id: 1,
                    type: 'crowded',
                    location: 'Downtown',
                    notes: 'Very busy with tourists',
                    timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
                    upvotes: 5,
                    downvotes: 1,
                    userVote: 'upvote'
                },
                {
                    id: 2,
                    type: 'festive',
                    location: 'Main Square',
                    notes: 'Street festival happening',
                    timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
                    upvotes: 12,
                    downvotes: 2,
                    userVote: null
                },
                {
                    id: 3,
                    type: 'calm',
                    location: 'City Park',
                    notes: 'Quiet and peaceful',
                    timestamp: new Date(Date.now() - 5 * 3600000).toISOString(),
                    upvotes: 8,
                    downvotes: 0,
                    userVote: 'upvote'
                }
            ];
            
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
            return;
        }
        
        container.innerHTML = this.nearbyReports.map(report => `
            <div class="report-item">
                <div class="report-info">
                    <div class="report-type">
                        <i class="${this.getVibeIcon(report.type)}"></i>
                        <span data-en="${this.capitalizeFirstLetter(report.type)}" data-ar="${this.getVibeArabicName(report.type)}">
                            ${this.capitalizeFirstLetter(report.type)}
                        </span>
                    </div>
                    <div class="report-details">${report.notes}</div>
                    <div class="report-meta">
                        <span>${report.location}</span>
                        <span>${this.formatTimeAgo(report.timestamp)}</span>
                    </div>
                </div>
                <div class="report-actions">
                    <button class="vote-btn upvote-btn ${report.userVote === 'upvote' ? 'active' : ''}" 
                            onclick="app.voteReport(${report.id}, 'upvote')">
                        <i class="fas fa-thumbs-up"></i> ${report.upvotes}
                    </button>
                    <button class="vote-btn downvote-btn ${report.userVote === 'downvote' ? 'active' : ''}" 
                            onclick="app.voteReport(${report.id}, 'downvote')">
                        <i class="fas fa-thumbs-down"></i> ${report.downvotes}
                    </button>
                </div>
            </div>
        `).join('');
        
        this.updateTextDirection();
    }
    
    async loadUserReports() {
        try {
            // Show loading state
            document.getElementById('userReports').innerHTML = '<div class="loading-spinner"></div>';
            
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Simulated data
            this.userReports = [
                {
                    id: 101,
                    type: 'noisy',
                    location: 'Market Street',
                    notes: 'Construction noise',
                    timestamp: new Date(Date.now() - 24 * 3600000).toISOString(),
                    upvotes: 3,
                    downvotes: 1
                },
                {
                    id: 102,
                    type: 'suspicious',
                    location: 'Alley behind restaurant',
                    notes: 'Suspicious activity noticed',
                    timestamp: new Date(Date.now() - 3 * 24 * 3600000).toISOString(),
                    upvotes: 2,
                    downvotes: 0
                }
            ];
            
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
            return;
        }
        
        container.innerHTML = this.userReports.map(report => `
            <div class="report-item">
                <div class="report-info">
                    <div class="report-type">
                        <i class="${this.getVibeIcon(report.type)}"></i>
                        <span data-en="${this.capitalizeFirstLetter(report.type)}" data-ar="${this.getVibeArabicName(report.type)}">
                            ${this.capitalizeFirstLetter(report.type)}
                        </span>
                    </div>
                    <div class="report-details">${report.notes}</div>
                    <div class="report-meta">
                        <span>${report.location}</span>
                        <span>${this.formatTimeAgo(report.timestamp)}</span>
                        <span>👍 ${report.upvotes} 👎 ${report.downvotes}</span>
                    </div>
                </div>
            </div>
        `).join('');
        
        this.updateTextDirection();
    }
    
    async voteReport(reportId, voteType) {
        try {
            // Update UI immediately for better UX
            const report = this.nearbyReports.find(r => r.id === reportId);
            if (report) {
                // Remove previous vote
                if (report.userVote === 'upvote') report.upvotes--;
                if (report.userVote === 'downvote') report.downvotes--;
                
                // Add new vote
                if (voteType === 'upvote') report.upvotes++;
                if (voteType === 'downvote') report.downvotes++;
                
                report.userVote = report.userVote === voteType ? null : voteType;
                
                this.displayNearbyReports();
            }
            
            // Send vote to server
            if (this.tg && this.tg.sendData) {
                this.tg.sendData(JSON.stringify({
                    type: 'vote',
                    reportId: reportId,
                    voteType: voteType
                }));
            }
            
            this.showNotification(`Vote ${voteType === 'upvote' ? 'upvoted' : 'downvoted'}`, "success");
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
        if (!this.selectedVibe) {
            this.showNotification("Please select a vibe type", "error");
            return;
        }
        
        const notes = document.getElementById('reportNotes').value;
        
        try {
            // Send report to server
            if (this.tg && this.tg.sendData) {
                this.tg.sendData(JSON.stringify({
                    type: 'report',
                    vibe: this.selectedVibe,
                    notes: notes
                }));
            }
            
            // Close modal
            document.getElementById('reportModal').style.display = 'none';
            
            // Show success message
            this.showNotification("Report submitted successfully", "success");
            
            // Refresh reports
            this.loadNearbyReports();
            this.loadUserReports();
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
        const emergencyType = document.getElementById('emergencyType').value;
        const details = document.getElementById('emergencyDetails').value;
        
        if (!details.trim()) {
            this.showNotification("Please provide emergency details", "error");
            return;
        }
        
        try {
            // Send emergency report to server
            if (this.tg && this.tg.sendData) {
                this.tg.sendData(JSON.stringify({
                    type: 'emergency',
                    emergencyType: emergencyType,
                    details: details
                }));
            }
            
            // Close modal
            document.getElementById('emergencyModal').style.display = 'none';
            
            // Show success message
            this.showNotification("Emergency report submitted", "success");
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
        
        this.showNotification(`Language changed to ${this.currentLanguage === 'en' ? 'English' : 'Arabic'}`, "success");
    }
    
    changeLanguage(lang) {
        this.currentLanguage = lang;
        this.applyLanguage(lang);
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

// Global functions for HTML onclick attributes
function showReportModal() {
    app.showReportModal();
}

function closeModal(modalId) {
    app.closeModal(modalId);
}

function selectVibe(vibe) {
    app.selectVibe(vibe);
}

function submitReport() {
    app.submitReport();
}

function showEmergencyReport() {
    app.showEmergencyReport();
}

function submitEmergencyReport() {
    app.submitEmergencyReport();
}

function loadNearbyReports() {
    app.loadNearbyReports();
}

function loadTopAreas() {
    app.loadTopAreas();
}

function changeLanguage(lang) {
    app.changeLanguage(lang);
}