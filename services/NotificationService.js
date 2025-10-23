/**
 * Notification Service
 * Handles all user notifications and alerts
 */
class NotificationService {
  constructor() {
    this.notifications = [];
    this.maxNotifications = 5;
  }

  /**
   * Show a notification to the user
   * @param {string} message - The notification message
   * @param {string} type - Type of notification (success, error, warning, info)
   * @param {number} duration - Duration in milliseconds (default: 3000)
   */
  showNotification(message, type = 'info', duration = 3000) {
    // Remove any existing notification with the same message
    this.removeExistingNotification(message);

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;

    // Add icon based on notification type
    let icon = 'fas fa-info-circle';
    if (type === 'success') icon = 'fas fa-check-circle';
    if (type === 'error') icon = 'fas fa-exclamation-circle';
    if (type === 'warning') icon = 'fas fa-exclamation-triangle';

    notification.innerHTML = `
      <i class="${icon}"></i>
      <span>${message}</span>
    `;

    // Add close button for manual dismissal
    const closeBtn = document.createElement('button');
    closeBtn.className = 'notification-close';
    closeBtn.innerHTML = '×';
    closeBtn.onclick = () => this.removeNotification(notification);
    notification.appendChild(closeBtn);

    document.body.appendChild(notification);

    // Store notification reference
    notification.dataset.message = message;
    this.notifications.push(notification);

    // Limit number of simultaneous notifications
    if (this.notifications.length > this.maxNotifications) {
      this.removeNotification(this.notifications[0]);
    }

    // Auto-remove after specified duration
    const timeoutId = setTimeout(() => {
      if (notification.parentNode) {
        this.removeNotification(notification);
      }
    }, duration);

    // Store timeout ID for potential clearing
    notification.dataset.timeoutId = timeoutId;

    // Add hover behavior to pause auto-dismiss
    notification.addEventListener('mouseenter', () => {
      clearTimeout(timeoutId);
    });

    notification.addEventListener('mouseleave', () => {
      const newTimeoutId = setTimeout(() => {
        if (notification.parentNode) {
          this.removeNotification(notification);
        }
      }, duration);
      notification.dataset.timeoutId = newTimeoutId;
    });

    return notification;
  }

  /**
   * Remove a specific notification
   * @param {HTMLElement} notification - The notification element to remove
   */
  removeNotification(notification) {
    if (notification && notification.parentNode) {
      // Clear any pending timeout
      if (notification.dataset.timeoutId) {
        clearTimeout(parseInt(notification.dataset.timeoutId));
      }

      // Remove from notifications array
      const index = this.notifications.indexOf(notification);
      if (index > -1) {
        this.notifications.splice(index, 1);
      }

      // Animate out and remove
      notification.style.animation = 'slideOutRight 0.3s ease-out';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }
  }

  /**
   * Remove existing notification with the same message
   * @param {string} message - The message to check for duplicates
   */
  removeExistingNotification(message) {
    const existing = this.notifications.find(n => n.dataset.message === message);
    if (existing) {
      this.removeNotification(existing);
    }
  }

  /**
   * Clear all notifications
   */
  clearAll() {
    this.notifications.forEach(notification => {
      this.removeNotification(notification);
    });
  }

  /**
   * Show loading notification
   * @param {string} message - Loading message
   * @returns {HTMLElement} - The notification element
   */
  showLoading(message = 'Loading...') {
    return this.showNotification(message, 'info', 0); // 0 = don't auto-dismiss
  }

  /**
   * Show success notification
   * @param {string} message - Success message
   */
  showSuccess(message) {
    return this.showNotification(message, 'success');
  }

  /**
   * Show error notification
   * @param {string} message - Error message
   */
  showError(message) {
    return this.showNotification(message, 'error', 5000); // Longer duration for errors
  }

  /**
   * Show warning notification
   * @param {string} message - Warning message
   */
  showWarning(message) {
    return this.showNotification(message, 'warning', 4000);
  }

  /**
   * Show info notification
   * @param {string} message - Info message
   */
  showInfo(message) {
    return this.showNotification(message, 'info');
  }

  /**
   * Show badge unlock notification
   * @param {Object} badge - Badge object with name, description, icon, color
   */
  showBadgeNotification(badge) {
    const notification = document.createElement('div');
    notification.className = 'badge-notification';

    notification.innerHTML = `
      <div class="badge-notification-content">
        <div class="badge-icon" style="background: ${badge.color};">
          <i class="${badge.icon}"></i>
        </div>
        <div class="badge-info">
          <h4>Badge Unlocked!</h4>
          <p><strong>${badge.name}</strong></p>
          <p>${badge.description}</p>
        </div>
        <button class="badge-close">&times;</button>
      </div>
    `;

    document.body.appendChild(notification);

    // Close button
    const closeBtn = notification.querySelector('.badge-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        notification.remove();
      });
    }

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 5000);

    return notification;
  }

  /**
   * Show geofence notification
   * @param {string} message - Geofence message
   * @param {string} priority - Priority level (info, warning, high)
   */
  showGeofenceNotification(message, priority = 'info') {
    const type = priority === 'high' ? 'warning' : 'info';
    const duration = priority === 'high' ? 10000 : 5000; // Longer for high priority

    return this.showNotification(message, type, duration);
  }

  /**
   * Show weather alert
   * @param {Object} alert - Weather alert object
   */
  showWeatherAlert(alert) {
    const type = alert.priority === 'high' ? 'warning' : 'info';
    const duration = alert.priority === 'high' ? 10000 : 5000;

    return this.showNotification(alert.message, type, duration);
  }
}

// Create global instance
const notificationService = new NotificationService();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = notificationService;
}

// Make available globally
if (typeof window !== 'undefined') {
  window.notificationService = notificationService;
}
