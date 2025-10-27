// Supabase Client Manager - Singleton Pattern Implementation
// Prevents multiple GoTrueClient instances that cause undefined behavior

class SupabaseClientManager {
  constructor() {
    this.client = null;
    this.isInitialized = false;
  }

  /**
   * Initialize or return existing Supabase client instance
   * @param {string} url - Supabase project URL
   * @param {string} key - Supabase anon key
   * @returns {object} Supabase client instance
   */
  initialize(url, key) {
    // If already initialized, return existing client
    if (this.isInitialized && this.client) {
      console.log('Returning existing Supabase client instance');
      return this.client;
    }

    // Validate inputs
    if (!url || !key) {
      throw new Error('Supabase URL and key are required');
    }

    if (!window.supabase) {
      throw new Error('Supabase library not loaded');
    }

    try {
      // Create new client instance
      this.client = window.supabase.createClient(url, key);
      this.isInitialized = true;

      console.log('New Supabase client instance created');

      // Log client creation for debugging (only in development)
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('Supabase client initialized with URL:', url);
      }

      return this.client;
    } catch (error) {
      console.error('Failed to create Supabase client:', error);
      this.isInitialized = false;
      this.client = null;
      throw error;
    }
  }

  /**
   * Get the current client instance (if initialized)
   * @returns {object|null} Supabase client instance or null
   */
  getClient() {
    return this.client;
  }

  /**
   * Check if client is initialized
   * @returns {boolean} True if client is initialized
   */
  isClientInitialized() {
    return this.isInitialized && this.client !== null;
  }

  /**
   * Reset the client (useful for testing or forced re-initialization)
   */
  reset() {
    console.warn('Resetting Supabase client manager');
    this.client = null;
    this.isInitialized = false;
  }

  /**
   * Get client statistics for debugging
   * @returns {object} Client statistics
   */
  getStats() {
    return {
      isInitialized: this.isInitialized,
      hasClient: this.client !== null,
      clientType: this.client ? typeof this.client : 'null'
    };
  }
}

// Create and export singleton instance
const supabaseClientManager = new SupabaseClientManager();

// Make it globally available
window.supabaseClientManager = supabaseClientManager;

// Export for ES modules (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = supabaseClientManager;
}
