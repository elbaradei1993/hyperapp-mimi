// Initialize Telegram WebApp
let tg = window.Telegram.WebApp;
let debugMode = true;

// Debug logging
function logDebug(message, data = null) {
    if (debugMode) {
        console.log(`[HyperApp Debug] ${message}`, data || '');
    }
}

// Initialize the app
function init() {
    logDebug('Initializing app...');
    
    if (tg) {
        tg.expand();
        tg.enableClosingConfirmation();
        
        // Set up theme based on Telegram theme
        updateTheme();
        
        // Set up main button
        tg.MainButton.text = "Open HyperApp";
        tg.MainButton.show();
        
        // Get user data and update UI accordingly
        let user = tg.initDataUnsafe.user;
        if (user) {
            updateUserInfo(user);
        }
        
        // Listen for theme changes
        tg.onEvent('themeChanged', updateTheme);
        
        logDebug('App initialized successfully');
    } else {
        logDebug('Not in Telegram environment');
        updateConnectionStatus('not_connected');
    }
}

// Update theme based on Telegram theme
function updateTheme() {
    if (!tg) return;
    
    const theme = tg.colorScheme;
    if (theme === 'dark') {
        document.body.style.background = 'linear-gradient(135deg, #0A192F 0%, #142538 100%)';
        document.body.style.color = '#F8F9FC';
    } else {
        document.body.style.background = 'linear-gradient(135deg, #E6EFFF 0%, #FFFFFF 100%)';
        document.body.style.color = '#121726';
    }
    
    logDebug('Theme updated:', theme);
}

// Update user information in the UI
function updateUserInfo(user) {
    logDebug('User info:', user);
    
    // Update user ID display if element exists
    const userIdElement = document.querySelector('.user-id');
    if (userIdElement) {
        userIdElement.textContent = user.id;
        document.querySelector('.user-id-display').style.display = 'flex';
    }
}

// Update connection status
function updateConnectionStatus(status) {
    const statusElement = document.querySelector('.connection-status');
    if (statusElement) {
        if (status === 'connected') {
            statusElement.innerHTML = '<i class="fas fa-check-circle"></i> Connected to Bot';
            statusElement.style.color = '#28A745';
        } else {
            statusElement.innerHTML = '<i class="fas fa-times-circle"></i> Not Connected';
            statusElement.style.color = '#DC3545';
        }
    }
}

// Test connection function
function testConnection() {
    logDebug("Testing connection to bot...");
    
    if (tg) {
        logDebug("Telegram WebApp detected:", tg);
        logDebug("Init data:", tg.initData);
        logDebug("User data:", tg.initDataUnsafe.user);
        
        // Show connection status
        updateConnectionStatus('connected');
        
        logDebug("Connection test completed successfully");
    } else {
        logDebug("Not in Telegram environment");
        updateConnectionStatus('not_connected');
    }
}

// Send command to the bot
function sendCommand(command) {
    logDebug('Sending command:', command);
    
    if (tg) {
        tg.sendData(command);
        logDebug('Command sent successfully');
        
        // Update last response display
        const lastResponseElement = document.getElementById('lastResponse');
        if (lastResponseElement) {
            lastResponseElement.textContent = `Sent: ${command}`;
        }
        
        // Visual feedback
        if (event && event.currentTarget) {
            const button = event.currentTarget;
            button.style.background = 'rgba(45, 91, 255, 0.3)';
            setTimeout(() => {
                button.style.background = '';
            }, 300);
        }
    } else {
        logDebug('Not in Telegram environment, would send:', command);
        alert("Command: " + command);
    }
}

// Test functions
function testSimpleCommand() {
    if (tg) {
        const testStatusElement = document.getElementById('testStatus');
        if (testStatusElement) {
            testStatusElement.textContent = 'Testing...';
            testStatusElement.style.color = '#FFC107';
        }
        
        // Send a test command
        tg.sendData('/test');
        
        setTimeout(() => {
            if (testStatusElement) {
                testStatusElement.textContent = 'Command sent - check bot response';
                testStatusElement.style.color = '#28A745';
            }
        }, 1000);
    }
}

function testReportCommand() {
    if (tg) {
        const testStatusElement = document.getElementById('testStatus');
        if (testStatusElement) {
            testStatusElement.textContent = 'Testing report command...';
            testStatusElement.style.color = '#FFC107';
        }
        
        // Send a report command
        tg.sendData('/report');
        
        setTimeout(() => {
            if (testStatusElement) {
                testStatusElement.textContent = 'Report command sent';
                testStatusElement.style.color = '#28A745';
            }
        }, 1000);
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', function() {
    logDebug('DOM loaded, initializing app');
    init();
    testConnection();
});
