// Initialize Telegram WebApp
let tg = window.Telegram.WebApp;
let debugMode = true; // Set to false in production

// Debug logging
function logDebug(message, data = null) {
    if (debugMode) {
        console.log(`[HyperApp Debug] ${message}`, data || '');
    }
}

// Initialize the app
function init() {
    logDebug('Initializing HyperApp...');
    
    if (tg) {
        logDebug('Telegram WebApp detected');
        
        // Expand to full height and enable closing confirmation
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
        
        // Update connection status
        updateConnectionStatus('connected');
        
        // Listen for theme changes
        tg.onEvent('themeChanged', updateTheme);
        
        // Listen for events from the bot
        tg.onEvent('viewportChanged', function() {
            logDebug('Viewport changed');
        });
        
        logDebug('App initialized successfully with Telegram WebApp');
        
    } else {
        logDebug('Not in Telegram environment - running in standalone mode');
        updateConnectionStatus('not_connected');
        
        // Simulate Telegram environment for testing
        simulateTelegramEnvironment();
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
    
    // Update debug info
    document.getElementById('debugUserId').textContent = user.id || '--';
    
    // You can add more user-specific UI updates here
    // For example, fetch user reputation from your bot's database
}

// Update connection status
function updateConnectionStatus(status) {
    const statusElement = document.querySelector('.connection-status');
    if (!statusElement) return;
    
    if (status === 'connected') {
        statusElement.innerHTML = '<i class="fas fa-check-circle connected"></i> Connected to Bot';
        statusElement.classList.add('connected');
        statusElement.classList.remove('disconnected');
        document.getElementById('debugStatus').textContent = 'Connected to Telegram Bot';
    } else {
        statusElement.innerHTML = '<i class="fas fa-times-circle disconnected"></i> Not Connected';
        statusElement.classList.add('disconnected');
        statusElement.classList.remove('connected');
        document.getElementById('debugStatus').textContent = 'Not connected to Telegram';
    }
}

// Send command to the bot
function sendCommand(command) {
    logDebug('Attempting to send command:', command);
    
    // Update debug info
    document.getElementById('debugLastCommand').textContent = command;
    
    if (tg && tg.sendData) {
        try {
            // Send the command to your bot
            tg.sendData(command);
            logDebug('Command sent successfully to bot:', command);
            
            // Provide visual feedback
            if (event && event.currentTarget) {
                const button = event.currentTarget;
                button.style.background = 'rgba(45, 91, 255, 0.3)';
                setTimeout(() => {
                    button.style.background = '';
                }, 300);
            }
            
            // Show success feedback
            showTempMessage('Command sent: ' + command, 'success');
            
        } catch (error) {
            logDebug('Error sending command:', error);
            showTempMessage('Error sending command', 'error');
        }
    } else {
        logDebug('Not in Telegram environment, simulating command:', command);
        showTempMessage('Simulated: ' + command, 'warning');
        
        // Visual feedback even in standalone mode
        if (event && event.currentTarget) {
            const button = event.currentTarget;
            button.style.background = 'rgba(45, 91, 255, 0.3)';
            setTimeout(() => {
                button.style.background = '';
            }, 300);
        }
    }
}

// Show temporary message
function showTempMessage(message, type = 'info') {
    // Create message element
    const messageEl = document.createElement('div');
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
        transition: opacity 0.3s;
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
            document.body.removeChild(messageEl);
        }, 300);
    }, 3000);
}

// Simulate Telegram environment for testing
function simulateTelegramEnvironment() {
    logDebug('Simulating Telegram environment for testing');
    
    // Show debug section
    document.querySelector('.debug-section').style.display = 'block';
    
    // Simulate user data after a delay
    setTimeout(() => {
        document.getElementById('debugUserId').textContent = '123456789';
        document.querySelector('.reputation').textContent = '85';
        updateConnectionStatus('connected');
    }, 1000);
}

// Handle WebApp data received from bot (if needed)
if (tg && tg.onEvent) {
    tg.onEvent('webAppDataReceived', function(data) {
        logDebug('Data received from bot:', data);
        // Handle any data your bot might send back
    });
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', function() {
    logDebug('DOM content loaded, initializing app');
    init();
    
    // Enable debug mode with URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('debug') === '1') {
        debugMode = true;
        document.querySelector('.debug-section').style.display = 'block';
        logDebug('Debug mode enabled via URL parameter');
    }
});

// Error handling
window.addEventListener('error', function(e) {
    logDebug('Global error:', e.error);
});

// Export functions for potential external use
window.HyperApp = {
    sendCommand: sendCommand,
    init: init,
    debugMode: debugMode
};