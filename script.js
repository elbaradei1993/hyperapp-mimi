// Initialize Telegram WebApp
let tg = window.Telegram.WebApp;
let debugMode = true;
let currentView = 'main';
let currentVoteType = '';

// Debug logging
function logDebug(message, data = null) {
    if (debugMode) {
        console.log(`[HyperApp Debug] ${message}`, data || '');
    }
}

// View Management
function showMainView() {
    document.getElementById('mainView').classList.remove('hidden');
    document.getElementById('reportView').classList.add('hidden');
    document.getElementById('voteView').classList.add('hidden');
    currentView = 'main';
}

function showReportView() {
    document.getElementById('mainView').classList.add('hidden');
    document.getElementById('reportView').classList.remove('hidden');
    document.getElementById('voteView').classList.add('hidden');
    currentView = 'report';
}

function showVoteView(voteType) {
    document.getElementById('mainView').classList.add('hidden');
    document.getElementById('reportView').classList.add('hidden');
    document.getElementById('voteView').classList.remove('hidden');
    currentView = 'vote';
    currentVoteType = voteType;
    
    // Update vote title
    const voteTitle = document.getElementById('voteTitle');
    if (voteTitle) {
        voteTitle.textContent = voteType === 'upvote' ? 'Upvote Report' : 'Downvote Report';
    }
}

// Initialize the app
function init() {
    logDebug('Initializing HyperApp...');
    
    if (tg) {
        logDebug('Telegram WebApp detected');
        
        // Expand to full height
        tg.expand();
        
        // Set up theme based on Telegram theme
        updateTheme();
        
        // Set up main button
        tg.MainButton.hide();
        
        // Get user data and update UI accordingly
        let user = tg.initDataUnsafe.user;
        if (user) {
            updateUserInfo(user);
        }
        
        // Update connection status
        updateConnectionStatus('connected');
        
        // Listen for theme changes
        tg.onEvent('themeChanged', updateTheme);
        
        logDebug('App initialized successfully with Telegram WebApp');
        
    } else {
        logDebug('Not in Telegram environment - running in standalone mode');
        updateConnectionStatus('not_connected');
    }
}

// Update theme based on Telegram theme
function updateTheme() {
    if (!tg) return;
    
    const theme = tg.colorScheme;
    logDebug('Current theme:', theme);
    
    if (theme === 'dark') {
        document.body.style.background = 'linear-gradient(135deg, #0A192F 0%, #142538 100%)';
        document.body.style.color = '#F8F9FC';
    } else {
        document.body.style.background = 'linear-gradient(135deg, #E6EFFF 0%, #FFFFFF 100%)';
        document.body.style.color = '#121726';
    }
}

// Update user information in the UI
function updateUserInfo(user) {
    logDebug('User info received:', user);
}

// Update connection status
function updateConnectionStatus(status) {
    const statusElement = document.querySelector('.connection-status');
    if (!statusElement) return;
    
    if (status === 'connected') {
        statusElement.innerHTML = '<i class="fas fa-check-circle connected"></i> Connected to Bot';
        statusElement.classList.add('connected');
        statusElement.classList.remove('disconnected');
    } else {
        statusElement.innerHTML = '<i class="fas fa-times-circle disconnected"></i> Not Connected';
        statusElement.classList.add('disconnected');
        statusElement.classList.remove('connected');
    }
}

// Test connection function
function testConnection() {
    logDebug("Testing connection to bot...");
    
    if (tg) {
        showTempMessage('Connection test successful!', 'success');
        logDebug("Connection test completed successfully");
    } else {
        showTempMessage('Not in Telegram environment', 'warning');
    }
}

// Send command to the bot
function sendCommand(command) {
    logDebug('Sending command:', command);
    
    if (tg && tg.sendData) {
        try {
            // Send the command to your bot
            tg.sendData(command);
            logDebug('Command sent successfully to bot:', command);
            
            // Show success feedback
            showTempMessage('Command sent successfully', 'success');
            
        } catch (error) {
            logDebug('Error sending command:', error);
            showTempMessage('Error sending command', 'error');
        }
    } else {
        logDebug('Not in Telegram environment, simulating command:', command);
        showTempMessage('Simulated: ' + command, 'warning');
    }
}

// Report Flow Functions
function startReportFlow() {
    showReportView();
}

function startEmergencyReport() {
    showReportView();
    document.getElementById('reportCategory').value = 'Dangerous';
    showTempMessage('Emergency report mode activated', 'warning');
}

function submitReport() {
    const category = document.getElementById('reportCategory').value;
    const context = document.getElementById('reportContext').value;
    
    if (!context.trim()) {
        showTempMessage('Please provide context notes', 'error');
        return;
    }
    
    // Send report data to bot
    const reportData = JSON.stringify({
        type: 'report',
        category: category,
        context: context,
        emergency: category === 'Dangerous'
    });
    
    sendCommand(reportData);
    showMainView();
}

// Vote Flow Functions
function startVoteFlow(voteType) {
    currentVoteType = voteType;
    showVoteView(voteType);
}

function submitVote() {
    const reportId = document.getElementById('reportId').value;
    
    if (!reportId) {
        showTempMessage('Please enter a report ID', 'error');
        return;
    }
    
    // Send vote data to bot
    const voteData = JSON.stringify({
        type: 'vote',
        voteType: currentVoteType,
        reportId: parseInt(reportId)
    });
    
    sendCommand(voteData);
    showMainView();
}

// Language handling
function handleLanguageChange() {
    sendCommand('/language');
}

// Show temporary message
function showTempMessage(message, type = 'info') {
    // Create message element
    const messageEl = document.createElement('div');
    messageEl.className = 'message';
    messageEl.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        opacity: 0;
        max-width: 80%;
        text-align: center;
    `;
    
    // Set background color based on type
    if (type === 'success') {
        messageEl.style.background = 'var(--success)';
    } else if (type === 'error') {
        messageEl.style.background = 'var(--danger)';
    } else if (type === 'warning') {
        messageEl.style.background = 'var(--warning)';
        messageEl.style.color = 'black';
    } else {
        messageEl.style.background = 'var(--info)';
    }
    
    messageEl.textContent = message;
    document.body.appendChild(messageEl);
    
    // Animate in
    setTimeout(() => {
        messageEl.style.opacity = '1';
    }, 10);
    
    // Remove after delay
    setTimeout(() => {
        messageEl.style.opacity = '0';
        setTimeout(() => {
            if (document.body.contains(messageEl)) {
                document.body.removeChild(messageEl);
            }
        }, 300);
    }, 3000);
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', function() {
    logDebug('DOM content loaded, initializing app');
    init();
    
    // Enable debug mode with URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('debug') === '1') {
        debugMode = true;
        logDebug('Debug mode enabled via URL parameter');
    }
});

// Error handling
window.addEventListener('error', function(e) {
    logDebug('Global error:', e.error);
});