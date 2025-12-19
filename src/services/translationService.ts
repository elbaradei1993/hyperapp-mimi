interface TranslationCache {
  [key: string]: {
    translation: string;
    timestamp: number;
    ttl: number;
  };
}

interface LibreTranslateResponse {
  translatedText: string;
}

class TranslationService {
  private readonly API_BASE_URL = 'https://libretranslate.com/translate';
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second
  private readonly CIRCUIT_BREAKER_TIMEOUT = 5 * 60 * 1000; // 5 minutes

  private cache: TranslationCache = {};
  private isTranslating = new Set<string>();
  private circuitBreakerUntil: number = 0;
  private consecutiveFailures = 0;
  private readonly MAX_CONSECUTIVE_FAILURES = 5;

  constructor() {
    this.loadCacheFromStorage();
  }

  /**
   * Check if we're in development mode
   */
  private isDevelopment(): boolean {
    return import.meta.env?.DEV === true || process.env.NODE_ENV === 'development';
  }

  /**
   * Check if text is already in Arabic (basic check)
   */
  private isArabicText(text: string): boolean {
    // Arabic Unicode range: U+0600 to U+06FF
    const arabicRegex = /[\u0600-\u06FF]/;
    return arabicRegex.test(text);
  }

  /**
   * Translate text from source language to target language
   */
  async translate(
    text: string,
    from: 'en' | 'ar',
    to: 'en' | 'ar'
  ): Promise<string> {
    if (!text || text.trim() === '') {
      return text;
    }

    // Skip translation if source and target are the same
    if (from === to) {
      return text;
    }

    const cacheKey = `${from}-${to}-${text}`;

    // Check cache first
    const cached = this.getCachedTranslation(cacheKey);
    if (cached) {
      return cached;
    }

    // Skip API calls in development mode to avoid CORS issues
    if (this.isDevelopment()) {
      console.log('🔧 Development mode: Skipping API translation, using fallback');
      return text;
    }

    // Check circuit breaker
    if (this.isCircuitBreakerActive()) {
      console.warn('🚫 Circuit breaker active, skipping translation');
      return text;
    }

    // Prevent duplicate translation requests
    if (this.isTranslating.has(cacheKey)) {
      // Wait for existing translation to complete
      return new Promise((resolve) => {
        const checkTranslation = () => {
          const result = this.getCachedTranslation(cacheKey);
          if (result) {
            resolve(result);
          } else {
            setTimeout(checkTranslation, 100);
          }
        };
        checkTranslation();
      });
    }

    this.isTranslating.add(cacheKey);

    try {
      const translatedText = await this.callLibreTranslateAPI(text, from, to);
      this.resetCircuitBreaker(); // Success, reset failures
      this.cacheTranslation(cacheKey, translatedText);
      return translatedText;
    } catch (error) {
      this.handleTranslationFailure(error);
      console.warn('Translation failed, returning original text:', error);
      return text; // Fallback to original text
    } finally {
      this.isTranslating.delete(cacheKey);
    }
  }

  /**
   * Translate multiple texts in batch
   */
  async translateBatch(
    texts: string[],
    from: 'en' | 'ar',
    to: 'en' | 'ar'
  ): Promise<string[]> {
    const results: string[] = [];

    // Process in batches to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchPromises = batch.map(text => this.translate(text, from, to));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Small delay between batches
      if (i + batchSize < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    return results;
  }

  /**
   * Check if translation is cached
   */
  private getCachedTranslation(cacheKey: string): string | null {
    const cached = this.cache[cacheKey];
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.translation;
    }

    // Remove expired cache entry
    if (cached) {
      delete this.cache[cacheKey];
      this.saveCacheToStorage();
    }

    return null;
  }

  /**
   * Cache a translation result
   */
  private cacheTranslation(cacheKey: string, translation: string): void {
    this.cache[cacheKey] = {
      translation,
      timestamp: Date.now(),
      ttl: this.CACHE_TTL
    };
    this.saveCacheToStorage();
  }

  /**
   * Call LibreTranslate API with retry logic
   */
  private async callLibreTranslateAPI(
    text: string,
    from: 'en' | 'ar',
    to: 'en' | 'ar',
    attempt = 1
  ): Promise<string> {
    try {
      const response = await fetch(this.API_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          source: from,
          target: to,
          format: 'text',
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: LibreTranslateResponse = await response.json();
      return data.translatedText || text;
    } catch (error) {
      console.warn(`Translation attempt ${attempt} failed:`, error);

      if (attempt < this.MAX_RETRIES) {
        // Exponential backoff
        const delay = this.RETRY_DELAY * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.callLibreTranslateAPI(text, from, to, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * Load cache from localStorage
   */
  private loadCacheFromStorage(): void {
    try {
      const stored = localStorage.getItem('libretranslate-cache');
      if (stored) {
        const parsedCache = JSON.parse(stored);
        // Clean expired entries
        const now = Date.now();
        Object.keys(parsedCache).forEach(key => {
          if (now - parsedCache[key].timestamp >= parsedCache[key].ttl) {
            delete parsedCache[key];
          }
        });
        this.cache = parsedCache;
      }
    } catch (error) {
      console.warn('Failed to load translation cache:', error);
      this.cache = {};
    }
  }

  /**
   * Save cache to localStorage
   */
  private saveCacheToStorage(): void {
    try {
      // Limit cache size to prevent localStorage overflow
      const cacheKeys = Object.keys(this.cache);
      if (cacheKeys.length > 1000) {
        // Remove oldest entries
        const sortedKeys = cacheKeys.sort((a, b) =>
          this.cache[a].timestamp - this.cache[b].timestamp
        );
        const keysToRemove = sortedKeys.slice(0, cacheKeys.length - 500);
        keysToRemove.forEach(key => delete this.cache[key]);
      }

      localStorage.setItem('libretranslate-cache', JSON.stringify(this.cache));
    } catch (error) {
      console.warn('Failed to save translation cache:', error);
    }
  }

  /**
   * Clear all cached translations
   */
  clearCache(): void {
    this.cache = {};
    localStorage.removeItem('libretranslate-cache');
  }

  /**
   * Check if circuit breaker is active
   */
  private isCircuitBreakerActive(): boolean {
    return Date.now() < this.circuitBreakerUntil;
  }

  /**
   * Reset circuit breaker on successful translation
   */
  private resetCircuitBreaker(): void {
    this.consecutiveFailures = 0;
    this.circuitBreakerUntil = 0;
  }

  /**
   * Handle translation failure and update circuit breaker
   */
  private handleTranslationFailure(error: any): void {
    this.consecutiveFailures++;

    // Check if error indicates rate limiting or CORS
    const isRateLimited = error?.message?.includes('429') || error?.message?.includes('Too Many Requests');
    const isCorsError = error?.message?.includes('CORS') || error?.message?.includes('Access-Control-Allow-Origin');

    if (isRateLimited || isCorsError || this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
      // Activate circuit breaker
      this.circuitBreakerUntil = Date.now() + this.CIRCUIT_BREAKER_TIMEOUT;
      console.warn(`🚫 Circuit breaker activated for ${this.CIRCUIT_BREAKER_TIMEOUT / 1000}s due to: ${isRateLimited ? 'rate limiting' : isCorsError ? 'CORS error' : 'consecutive failures'}`);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { entries: number; size: string } {
    const entries = Object.keys(this.cache).length;
    const size = JSON.stringify(this.cache).length;
    return {
      entries,
      size: `${(size / 1024).toFixed(2)} KB`
    };
  }
}

// Export singleton instance
export const translationService = new TranslationService();
export default translationService;
