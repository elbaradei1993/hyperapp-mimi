function sendCommand(command) {
    if (window.Telegram.WebApp) {
        Telegram.WebApp.sendData(command);
    } else {
        alert("This command will be sent to the bot: " + command);
    }
}

// Initialize Telegram WebApp features
if (window.Telegram.WebApp) {
    Telegram.WebApp.expand();
    Telegram.WebApp.MainButton.text = "Open HyperApp / فتح هايبر آب";
    Telegram.WebApp.MainButton.show();
}
