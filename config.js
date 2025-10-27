// Environment Configuration for HyperApp
// This file loads configuration from environment variables or defaults

class Config {
  constructor() {
    this.loadConfig();
  }

  loadConfig() {
    // Supabase Configuration
    this.supabaseUrl = this.getEnvVar('VITE_SUPABASE_URL') ||
                      'https://nqwejzbayquzsvcodunl.supabase.co';

    this.supabaseKey = this.getEnvVar('VITE_SUPABASE_ANON_KEY') ||
                      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xd2VqemJheXF1enN2Y29kdW5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzOTA0MjAsImV4cCI6MjA3Mzk2NjQyMH0.01yifC-tfEbBHD5u315fpb_nZrqMZCbma_UrMacMb78';

    // Weather API Configuration
    this.weatherApiKey = this.getEnvVar('VITE_OPENWEATHER_API_KEY') ||
                        'bd5e378503939ddaee76f12ad7a97608';

    // Feature Flags
    this.features = {
      realtime: this.getEnvVar('VITE_FEATURE_REALTIME') !== 'false',
      geofencing: this.getEnvVar('VITE_FEATURE_GEOFENCING') !== 'false',
      weather: this.getEnvVar('VITE_FEATURE_WEATHER') !== 'false',
      map: this.getEnvVar('VITE_FEATURE_MAP') !== 'false'
    };

    // API Endpoints
    this.api = {
      weather: 'https://api.openweathermap.org/data/2.5',
      geocoding: 'https://nominatim.openstreetmap.org'
    };

    // Validation
    this.validateConfig();
  }

  getEnvVar(name) {
    // Check for environment variables (works in Node.js environments)
    if (typeof process !== 'undefined' && process.env) {
      return process.env[name];
    }

    // Check for global window variables (client-side fallback)
    if (typeof window !== 'undefined' && window[name]) {
      return window[name];
    }

    // Check for meta tags in HTML (another client-side option)
    if (typeof document !== 'undefined') {
      const metaTag = document.querySelector(`meta[name="${name}"]`);
      if (metaTag) {
        return metaTag.getAttribute('content');
      }
    }

    return null;
  }

  validateConfig() {
    const required = ['supabaseUrl', 'supabaseKey', 'weatherApiKey'];

    for (const key of required) {
      if (!this[key]) {
        console.warn(`Warning: ${key} is not configured. Using default or placeholder value.`);
      }
    }

    // Validate Supabase URL format
    if (this.supabaseUrl && !this.supabaseUrl.match(/^https:\/\/[a-zA-Z0-9]+\.supabase\.co$/)) {
      console.warn('Warning: Supabase URL format appears invalid');
    }

    // Validate Supabase key format (basic JWT check)
    if (this.supabaseKey && !this.supabaseKey.match(/^eyJ[a-zA-Z0-9\-_]+\.eyJ[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+$/)) {
      console.warn('Warning: Supabase key format appears invalid');
    }
  }

  // Method to update config at runtime (useful for testing)
  updateConfig(newConfig) {
    Object.assign(this, newConfig);
    this.validateConfig();
  }

  // Get current config (safe version without sensitive data)
  getSafeConfig() {
    return {
      supabaseUrl: this.supabaseUrl,
      features: this.features,
      api: this.api,
      // Don't expose keys in safe config
      hasSupabaseKey: !!this.supabaseKey,
      hasWeatherApiKey: !!this.weatherApiKey
    };
  }
}

// Create global config instance
const config = new Config();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = config;
}

// Make available globally
if (typeof window !== 'undefined') {
  window.appConfig = config;
}
