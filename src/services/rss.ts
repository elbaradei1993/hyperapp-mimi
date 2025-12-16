interface RSSItem {
  title: string;
  link: string;
  description?: string;
  pubDate: string;
  guid?: string;
  category?: string[];
  author?: string;
}

interface RSSFeed {
  title: string;
  description: string;
  link: string;
  items: RSSItem[];
  lastBuildDate?: string;
  language?: string;
}

interface NewsAlert {
  id: string;
  time: string;
  headline: string;
  source: string;
  category: 'NEWS' | 'UPDATE' | 'ALERT' | 'BREAKING' | 'FEATURE';
  priority: 'high' | 'medium' | 'low';
  url?: string;
}

interface RSSFeedConfig {
  url: string;
  name: string;
  proxy: string;
}

class RSSService {
  private cache: Map<string, { data: NewsAlert[]; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes for better performance
  private readonly NEWSAPI_KEY = import.meta.env.VITE_NEWSAPI_KEY;
  private readonly NEWSAPI_BASE_URL = 'https://newsapi.org/v2';

  // Multiple RSS feeds with different proxies for reliability (fallback only)
  // Note: External RSS services may be unreliable, so we prioritize NewsAPI if available
  private readonly RSS_FEEDS: RSSFeedConfig[] = [
    // Temporarily disabled external RSS feeds due to API reliability issues
    // Keeping structure for future use when services are stable
  ];

  /**
   * Fetch and parse RSS feed with automatic fallbacks - OPTIMIZED VERSION
   */
  async fetchRSSFeed(preferredUrl?: string): Promise<NewsAlert[]> {
    // FIRST: Try to return cached data immediately for instant display
    const cachedData = this.getAnyCachedData();
    if (cachedData && cachedData.length > 0) {
      console.log('🚀 Using cached news data for instant display');
      // Start background refresh but return cached data immediately
      this.refreshInBackground(preferredUrl);
      return cachedData;
    }

    // No cache available, fetch fresh data
    console.log('📡 No cached data, fetching fresh news...');
    return await this.fetchFreshData(preferredUrl);
  }

  /**
   * Get any available cached data for instant display
   */
  private getAnyCachedData(): NewsAlert[] | null {
    // Try NewsAPI cache first
    if (this.NEWSAPI_KEY && this.NEWSAPI_KEY !== 'your_newsapi_key_here') {
      const cached = this.getCachedData('newsapi-top-headlines');
      if (cached) return cached;
    }

    // Try preferred URL if specified
    // Try RSS feed caches
    for (const feed of this.RSS_FEEDS) {
      const cached = this.getCachedData(feed.url);
      if (cached) return cached;
    }

    return null;
  }

  /**
   * Fetch fresh data with parallel processing and smart fallbacks
   */
  private async fetchFreshData(preferredUrl?: string): Promise<NewsAlert[]> {
    const fetchPromises: Promise<NewsAlert[]>[] = [];

    // Add NewsAPI if available
    if (this.NEWSAPI_KEY && this.NEWSAPI_KEY !== 'your_newsapi_key_here') {
      fetchPromises.push(
        this.fetchFromNewsAPI().catch(error => {
          console.warn('NewsAPI failed:', error.message);
          return [];
        })
      );
    }

    // Add preferred URL if specified
    if (preferredUrl) {
      // Try rss2json first (most reliable)
      fetchPromises.push(
        this.fetchFromRSS2JSON(preferredUrl).catch(() => [])
      );
      // Fallback to allorigins
      fetchPromises.push(
        this.tryFetchFeed(preferredUrl, 'https://api.allorigins.win/get?url=').catch(() => [])
      );
    }

    // Add all RSS feeds with rss2json and fast proxies
    for (const feed of this.RSS_FEEDS.slice(0, 2)) { // Limit to first 2 feeds for speed
      // Try rss2json
      fetchPromises.push(
        this.fetchFromRSS2JSON(feed.url).catch(() => [])
      );

      // Try allorigins proxy
      fetchPromises.push(
        this.tryFetchFeed(feed.url, 'https://api.allorigins.win/get?url=').catch(() => [])
      );
    }

    // Wait for first successful result with timeout
    try {
      // Use Promise.allSettled for better compatibility
      const results = await Promise.allSettled(fetchPromises);

      // Find first successful result
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value && result.value.length > 0) {
          console.log(`✅ Fresh news loaded: ${result.value.length} items`);
          // Cache successful result
          this.setCachedData('fresh-news', result.value);
          return result.value;
        }
      }

      // If no results succeeded within timeout, try a simpler approach
      console.log('🔄 No parallel results, trying sequential fetch...');
      return await this.trySequentialFetch(preferredUrl);

    } catch (error) {
      console.warn('Parallel fetch failed:', error);
      // Fallback to sequential approach
      return await this.trySequentialFetch(preferredUrl);
    }

    // Fallback to any cached data
    const fallbackData = this.getAnyCachedData();
    if (fallbackData) {
      console.log('📁 Using fallback cached data');
      return fallbackData;
    }

    // Last resort: default alerts
    console.log('⚠️ Using default news alerts');
    return this.getDefaultNewsAlerts();
  }

  /**
   * Try sequential fetch as fallback when parallel fetch fails
   */
  private async trySequentialFetch(preferredUrl?: string): Promise<NewsAlert[]> {
    // Try NewsAPI first if available
    if (this.NEWSAPI_KEY && this.NEWSAPI_KEY !== 'your_newsapi_key_here') {
      try {
        console.log('Trying NewsAPI sequentially...');
        const alerts = await this.fetchFromNewsAPI();
        console.log(`Successfully loaded ${alerts.length} items from NewsAPI`);
        this.setCachedData('newsapi-top-headlines', alerts);
        return alerts;
      } catch (error) {
        console.warn('NewsAPI failed:', error instanceof Error ? error.message : String(error));
      }
    }

    // Try preferred URL if specified
    if (preferredUrl) {
      try {
        console.log('Trying preferred URL with rss2json...');
        const alerts = await this.fetchFromRSS2JSON(preferredUrl);
        this.setCachedData(preferredUrl, alerts);
        return alerts;
      } catch (error) {
        console.warn(`Preferred feed ${preferredUrl} failed with rss2json:`, error);
      }
    }

    // Try RSS feeds sequentially
    for (const feed of this.RSS_FEEDS) {
      try {
        console.log(`Trying RSS feed sequentially: ${feed.name} with rss2json`);
        const alerts = await this.fetchFromRSS2JSON(feed.url);
        console.log(`Successfully loaded ${alerts.length} items from ${feed.name}`);
        this.setCachedData(feed.url, alerts);
        return alerts;
      } catch (error) {
        console.warn(`Feed ${feed.name} failed with rss2json:`, error);

        // Fallback to proxy
        try {
          console.log(`Retrying ${feed.name} with proxy...`);
          const alerts = await this.tryFetchFeed(feed.url, feed.proxy);
          this.setCachedData(feed.url, alerts);
          return alerts;
        } catch (proxyError) {
          console.warn(`Feed ${feed.name} failed with proxy:`, proxyError);
          continue;
        }
      }
    }

    // All feeds failed
    console.error('All sequential feeds failed');
    return this.getDefaultNewsAlerts();
  }

  /**
   * Refresh news data in background without blocking UI
   */
  private async refreshInBackground(preferredUrl?: string): Promise<void> {
    try {
      const freshData = await this.fetchFreshData(preferredUrl);
      if (freshData && freshData.length > 0) {
        // Update cache with fresh data
        this.setCachedData('background-refresh', freshData);
        console.log('🔄 Background news refresh completed');
      }
    } catch (error) {
      console.warn('Background refresh failed:', error);
    }
  }

  /**
   * Fetch news from NewsAPI
   */
  private async fetchFromNewsAPI(): Promise<NewsAlert[]> {
    if (!this.NEWSAPI_KEY || this.NEWSAPI_KEY === 'your_newsapi_key_here') {
      throw new Error('NewsAPI key not configured');
    }

    const url = `${this.NEWSAPI_BASE_URL}/top-headlines?country=us&apiKey=${this.NEWSAPI_KEY}&pageSize=10`;

    console.log('Fetching from NewsAPI:', url.replace(this.NEWSAPI_KEY, '[API_KEY]'));

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`NewsAPI HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.status !== 'ok') {
      throw new Error(`NewsAPI error: ${data.message || 'Unknown error'}`);
    }

    return data.articles.map((article: any, index: number) => {
      const pubDate = article.publishedAt ? new Date(article.publishedAt) : new Date();
      const title = article.title || '';
      const description = article.description || '';

      // Determine category based on content
      const category = this.determineCategory(title, description);

      // Format publication date
      const timeString = this.isToday(pubDate)
        ? pubDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
        : pubDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      return {
        id: article.url || `newsapi-${index}`,
        time: timeString,
        headline: this.cleanHeadline(title),
        source: article.source?.name || 'NewsAPI',
        category,
        priority: this.determinePriority(title, description, pubDate, category),
        url: article.url
      };
    });
  }

  /**
   * Fetch from rss2json.com API (more reliable than CORS proxies)
   */
  private async fetchFromRSS2JSON(rssUrl: string): Promise<NewsAlert[]> {
    const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;

    console.log(`Fetching via rss2json: ${apiUrl}`);

    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`rss2json HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.status !== 'ok') {
      throw new Error(`rss2json error: ${data.message || 'Unknown error'}`);
    }

    const feedTitle = data.feed?.title || 'News Source';

    return data.items.map((item: any, index: number) => {
      const pubDate = item.pubDate ? new Date(item.pubDate.replace(/-/g, '/')) : new Date(); // Fix for Safari/mobile date parsing
      const title = item.title || '';
      const description = item.description || '';

      // Determine category based on content
      const category = this.determineCategory(title, description);

      // Format publication date
      const timeString = this.isToday(pubDate)
        ? pubDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
        : pubDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      return {
        id: item.guid || `rss2json-${index}`,
        time: timeString,
        headline: this.cleanHeadline(title),
        source: this.cleanSource(feedTitle),
        category,
        priority: this.determinePriority(title, description, pubDate, category),
        url: item.link
      };
    });
  }

  /**
   * Try to fetch a specific RSS feed with a given proxy
   */
  private async tryFetchFeed(url: string, proxy: string): Promise<NewsAlert[]> {
    const proxyUrl = proxy.includes('allorigins')
      ? `${proxy}${encodeURIComponent(url)}`
      : `${proxy}/${url}`;

    console.log(`Fetching: ${proxyUrl}`);

    const response = await fetch(proxyUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/xml, text/xml, */*',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const xmlText = await response.text();
    return this.parseRSSXML(xmlText, url);
  }

  /**
   * Parse RSS XML directly using DOMParser
   */
  private parseRSSXML(xmlText: string, sourceUrl: string): NewsAlert[] {
    try {
      console.log('Parsing RSS response (first 200 chars):', xmlText.substring(0, 200));

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

      // Check for parser errors
      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) {
        console.error('XML parsing error:', parserError.textContent);
        return this.getDefaultNewsAlerts();
      }

      // Find RSS element
      const rssElement = xmlDoc.querySelector('rss');
      if (!rssElement) {
        console.warn('No RSS element found in response. Available root elements:', Array.from(xmlDoc.children).map(el => el.tagName).join(', '));
        return this.getDefaultNewsAlerts();
      }

      const channel = rssElement.querySelector('channel');
      if (!channel) {
        console.warn('No channel element found in RSS');
        return this.getDefaultNewsAlerts();
      }

      const items = Array.from(channel.querySelectorAll('item'));
      const feedTitle = channel.querySelector('title')?.textContent || 'News Source';

      console.log(`Successfully parsed RSS feed: ${feedTitle} with ${items.length} items`);

      return items.slice(0, 10).map((item, index) => {
        const title = item.querySelector('title')?.textContent || '';
        const link = item.querySelector('link')?.textContent || '';
        const description = item.querySelector('description')?.textContent || '';
        const pubDate = item.querySelector('pubDate')?.textContent || '';
        const guid = item.querySelector('guid')?.textContent || link || `rss-${index}`;

        // Determine category based on content
        const category = this.determineCategory(title, description);

        // Format publication date
        const pubDateObj = pubDate ? new Date(pubDate) : new Date();
        const timeString = this.isToday(pubDateObj)
          ? pubDateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
          : pubDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        return {
          id: guid,
          time: timeString,
          headline: this.cleanHeadline(title),
          source: this.cleanSource(feedTitle),
          category,
          priority: this.determinePriority(title, description, pubDateObj, category),
          url: link
        };
      });
    } catch (error) {
      console.error('Error parsing RSS XML:', error);
      return this.getDefaultNewsAlerts();
    }
  }

  /**
   * Determine news category based on content
   */
  private determineCategory(title: string, description: string): NewsAlert['category'] {
    const titleLower = title.toLowerCase();
    const descLower = description.toLowerCase();

    // Check for breaking news keywords
    if (titleLower.includes('breaking') || titleLower.includes('urgent') || descLower.includes('breaking')) {
      return 'BREAKING';
    }

    // Check for alert keywords
    if (titleLower.includes('alert') || titleLower.includes('warning') || titleLower.includes('emergency')) {
      return 'ALERT';
    }

    // Check for update keywords
    if (titleLower.includes('update') || titleLower.includes('latest') || descLower.includes('update')) {
      return 'UPDATE';
    }

    // Default to NEWS
    return 'NEWS';
  }

  /**
   * Determine priority based on content and timing
   */
  private determinePriority(title: string, description: string, pubDate: Date, category: NewsAlert['category']): NewsAlert['priority'] {
    // Breaking news always high priority
    if (category === 'BREAKING') return 'high';

    // Recent items get higher priority
    const hoursSincePublished = (Date.now() - pubDate.getTime()) / (1000 * 60 * 60);

    if (hoursSincePublished < 2) return 'high';
    if (hoursSincePublished < 6) return 'medium';

    return 'low';
  }

  /**
   * Clean and format headline
   */
  private cleanHeadline(title: string): string {
    return title
      .replace(/^\s*-\s*/, '') // Remove leading dash
      .replace(/\s*-\s*$/, '') // Remove trailing dash
      .trim();
  }

  /**
   * Clean and format source name
   */
  private cleanSource(source: string): string {
    return source
      .replace(/\s*-\s*RSS\s*$/i, '') // Remove " - RSS" suffix
      .replace(/\s*RSS\s*$/i, '') // Remove "RSS" suffix
      .trim();
  }

  /**
   * Check if date is today
   */
  private isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  /**
   * Get cached data if still valid
   */
  private getCachedData(url: string): NewsAlert[] | null {
    const cached = this.cache.get(url);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  /**
   * Set cached data
   */
  private setCachedData(url: string, data: NewsAlert[]): void {
    this.cache.set(url, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Get default news alerts for immediate display
   */
  private getDefaultNewsAlerts(): NewsAlert[] {
    return [
      {
        id: 'default-1',
        time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        headline: "Welcome to the Community News Feed",
        source: "Community Hub",
        category: "NEWS",
        priority: "medium"
      },
      {
        id: 'default-2',
        time: new Date(Date.now() - 5 * 60000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        headline: "Stay connected with local updates and community events",
        source: "Community Hub",
        category: "UPDATE",
        priority: "low"
      },
      {
        id: 'default-3',
        time: new Date(Date.now() - 15 * 60000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        headline: "Loading latest news from trusted sources...",
        source: "Community Hub",
        category: "FEATURE",
        priority: "low"
      }
    ];
  }

  /**
   * Pre-load news data for instant display
   */
  async preLoadNews(): Promise<void> {
    try {
      console.log('Pre-loading news data...');
      // Pre-load the default news feed in background
      await this.fetchRSSFeed();
      console.log('News data pre-loaded successfully');
    } catch (error) {
      console.warn('Failed to pre-load news data:', error);
      // Don't throw - pre-loading failure shouldn't break the app
    }
  }

  /**
   * Clear cache for specific URL
   */
  clearCache(url?: string): void {
    if (url) {
      this.cache.delete(url);
    } else {
      this.cache.clear();
    }
  }
}

// Export singleton instance
export const rssService = new RSSService();
export type { NewsAlert };
