function sendCommand(command) {
  if (window.Telegram.WebApp) {
    Telegram.WebApp.sendData(command);
  } else {
    alert("Command: " + command);
  }
}

if (window.Telegram.WebApp) {
  Telegram.WebApp.expand();
  Telegram.WebApp.MainButton.text = "Open HyperApp";
  Telegram.WebApp.MainButton.show();
}