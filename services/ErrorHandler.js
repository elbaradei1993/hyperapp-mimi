/**
 * Error Handler Service
 * Centralized error handling and user feedback
 */
class ErrorHandler {
  constructor(notificationService) {
    this.notificationService = notificationService;
    this.errors = [];
    this.maxErrors = 50; // Keep last 50 errors for debugging
  }

  /**
   * Handle API errors with appropriate user feedback
   * @param {Error} error - The error object
   * @param {string} operation - Description of the operation that failed
   * @param {boolean} showNotification - Whether to show user notification
   */
  async handleApiError(error, operation = 'operation', showNotification = true) {
    console.error(`Error in ${operation}:`, error);

    // Store error for debugging
    this.logError(error, operation);

    // Check if it's an offline/network error
    if (!navigator.onLine || this.isNetworkError(error)) {
      if (showNotification) {
        this.notificationService.showWarning('You appear to be offline. Changes will be synced when connection is restored.');
      }
      return { handled: true, type: 'offline' };
    }

    // Check if it's an authentication error
    if (this.isAuthError(error)) {
      if (showNotification) {
        this.notificationService.showError('Your session has expired. Please login again.');
      }
      // Trigger auth modal or redirect
      if (window.app && window.app.showAuthModal) {
        window.app.showAuthModal();
      }
      return { handled: true, type: 'auth' };
    }

    // Handle specific error types
    const errorType = this.categorizeError(error);

    if (showNotification) {
      this.showErrorNotification(error, operation, errorType);
    }

    return { handled: true, type: errorType };
  }

  /**
   * Categorize error type for appropriate handling
   * @param {Error} error - The error object
   */
  categorizeError(error) {
    const message = error.message?.toLowerCase() || '';
    const code = error.code || error.status;

    // Network errors
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return 'network';
    }

    // Authentication errors
    if (message.includes('jwt') || message.includes('unauthorized') || message.includes('forbidden') || code === 401 || code === 403) {
      return 'auth';
    }

    // Validation errors
    if (message.includes('validation') || message.includes('invalid') || code === 400) {
      return 'validation';
    }

    // Server errors
    if (code >= 500 || message.includes('server') || message.includes('internal')) {
      return 'server';
    }

    // Rate limiting
    if (code === 429 || message.includes('rate') || message.includes('limit')) {
      return 'rate_limit';
    }

    // Database errors
    if (message.includes('database') || message.includes('sql') || message.includes('constraint')) {
      return 'database';
    }

    return 'unknown';
  }

  /**
   * Show appropriate error notification based on error type
   * @param {Error} error - The error object
   * @param {string} operation - The operation that failed
   * @param {string} errorType - Categorized error type
   */
  showErrorNotification(error, operation, errorType) {
    let message = '';
    let type = 'error';

    switch (errorType) {
      case 'network':
        message = `Network error during ${operation}. Please check your connection and try again.`;
        break;
      case 'auth':
        message = 'Authentication required. Please login to continue.';
        break;
      case 'validation':
        message = `Invalid data provided for ${operation}. Please check your input.`;
        break;
      case 'server':
        message = `Server error during ${operation}. Please try again later.`;
        break;
      case 'rate_limit':
        message = 'Too many requests. Please wait a moment before trying again.';
        type = 'warning';
        break;
      case 'database':
        message = `Database error during ${operation}. Please try again.`;
        break;
      default:
        message = `An error occurred during ${operation}. Please try again.`;
    }

    this.notificationService.showNotification(message, type);
  }

  /**
   * Check if error is network-related
   * @param {Error} error - The error object
   */
  isNetworkError(error) {
    const message = error.message?.toLowerCase() || '';
    return message.includes('network') ||
           message.includes('fetch') ||
           message.includes('failed to fetch') ||
           message.includes('connection') ||
           error.name === 'TypeError';
  }

  /**
   * Check if error is authentication-related
   * @param {Error} error - The error object
   */
  isAuthError(error) {
    const message = error.message?.toLowerCase() || '';
    const code = error.code || error.status;

    return message.includes('jwt') ||
           message.includes('unauthorized') ||
           message.includes('forbidden') ||
           code === 401 ||
           code === 403;
  }

  /**
   * Log error for debugging purposes
   * @param {Error} error - The error object
   * @param {string} operation - The operation context
   */
  logError(error, operation) {
    const errorLog = {
      timestamp: new Date().toISOString(),
      operation,
      message: error.message,
      stack: error.stack,
      code: error.code || error.status,
      userAgent: navigator.userAgent,
      url: window.location.href,
      online: navigator.onLine
    };

    this.errors.unshift(errorLog);

    // Keep only the last N errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }

    // Also log to console with more context
    console.error('Error logged:', errorLog);
  }

  /**
   * Get recent errors for debugging
   * @param {number} limit - Maximum number of errors to return
   */
  getRecentErrors(limit = 10) {
    return this.errors.slice(0, limit);
  }

  /**
   * Clear error logs
   */
  clearErrors() {
    this.errors = [];
  }

  /**
   * Handle unhandled promise rejections
   */
  setupGlobalErrorHandling() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      this.logError(event.reason, 'unhandled_promise_rejection');

      // Prevent the default browser behavior (logging to console)
      event.preventDefault();

      // Show user-friendly notification
      this.notificationService.showError('An unexpected error occurred. Please refresh the page if issues persist.');
    });

    // Handle uncaught errors
    window.addEventListener('error', (event) => {
      console.error('Uncaught error:', event.error);
      this.logError(event.error, 'uncaught_error');

      // Show user-friendly notification for critical errors
      if (event.error && event.error.message) {
        this.notificationService.showError('An unexpected error occurred. Please refresh the page if issues persist.');
      }
    });

    // Handle service worker errors
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'ERROR') {
          console.error('Service Worker Error:', event.data.error);
          this.logError(new Error(event.data.error.message), 'service_worker');
        }
      });
    }
  }

  /**
   * Wrap async operations with error handling
   * @param {Function} operation - Async function to wrap
   * @param {string} operationName - Name for logging
   * @param {Object} options - Options for error handling
   */
  async withErrorHandling(operation, operationName, options = {}) {
    const {
      showNotification = true,
      fallbackValue = null,
      retryCount = 0
    } = options;

    try {
      return await operation();
    } catch (error) {
      const result = await this.handleApiError(error, operationName, showNotification);

      // If it's a network error and we have retries left, try again
      if (result.type === 'network' && retryCount > 0) {
        console.log(`Retrying ${operationName} (${retryCount} attempts left)`);

        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, 3 - retryCount), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));

        return this.withErrorHandling(operation, operationName, {
          ...options,
          retryCount: retryCount - 1
        });
      }

      // Return fallback value if operation failed
      return fallbackValue;
    }
  }

  /**
   * Create a safe async function wrapper
   * @param {Function} fn - Function to wrap
   * @param {string} name - Function name for logging
   */
  createSafeAsyncFunction(fn, name) {
    return async (...args) => {
      return this.withErrorHandling(() => fn(...args), name);
    };
  }

  /**
   * Validate function parameters
   * @param {Object} params - Parameters to validate
   * @param {Object} schema - Validation schema
   */
  validateParams(params, schema) {
    const errors = [];

    for (const [key, rules] of Object.entries(schema)) {
      const value = params[key];

      // Check required fields
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${key} is required`);
        continue;
      }

      // Skip validation if value is not provided and not required
      if (value === undefined || value === null) continue;

      // Type validation
      if (rules.type && typeof value !== rules.type) {
        errors.push(`${key} must be of type ${rules.type}`);
      }

      // String validations
      if (rules.type === 'string') {
        if (rules.minLength && value.length < rules.minLength) {
          errors.push(`${key} must be at least ${rules.minLength} characters`);
        }
        if (rules.maxLength && value.length > rules.maxLength) {
          errors.push(`${key} must be no more than ${rules.maxLength} characters`);
        }
        if (rules.pattern && !rules.pattern.test(value)) {
          errors.push(`${key} format is invalid`);
        }
      }

      // Number validations
      if (rules.type === 'number') {
        if (rules.min !== undefined && value < rules.min) {
          errors.push(`${key} must be at least ${rules.min}`);
        }
        if (rules.max !== undefined && value > rules.max) {
          errors.push(`${key} must be no more than ${rules.max}`);
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    return true;
  }
}

// Create global instance
const errorHandler = new ErrorHandler(window.notificationService || {
  showNotification: console.log,
  showError: console.error,
  showWarning: console.warn
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = errorHandler;
}

// Make available globally
if (typeof window !== 'undefined') {
  window.errorHandler = errorHandler;
}
