// Initialize Telegram WebApp
let tg = window.Telegram.WebApp;

// Initialize the app
function init() {
    if (tg) {
        tg.expand();
        tg.enableClosingConfirmation();
        
        // Set up theme based on Telegram theme
        const theme = tg.colorScheme;
        if (theme === 'dark') {
            document.body.style.background = 'linear-gradient(135deg, #0A192F 0%, #142538 100%)';
        } else {
            document.body.style.background = 'linear-gradient(135deg, #E6EFFF 0%, #FFFFFF 100%)';
            document.body.style.color = '#121726';
        }
        
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
}

// Update user information in the UI
function updateUserInfo(user) {
    // You can use this to personalize the UI
    // For example, display username or reputation
}

// Send command to the bot
function sendCommand(command) {
    if (tg) {
        tg.sendData(command);
        // Provide visual feedback
        const button = event.currentTarget;
        button.style.background = 'rgba(45, 91, 255, 0.3)';
        setTimeout(() => {
            button.style.background = '';
        }, 300);
    } else {
        alert("Command: " + command);
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', init);
