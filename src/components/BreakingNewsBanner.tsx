import React, { useState, useEffect, useRef } from 'react';
import { rssService, NewsAlert } from '../services/rss';

interface BreakingNewsBannerProps {
  rssUrl?: string;
  alerts?: NewsAlert[];
  autoHide?: boolean;
  hideDelay?: number;
}

const BreakingNewsBanner: React.FC<BreakingNewsBannerProps> = ({
  rssUrl,
  alerts: customAlerts,
  autoHide = false,
  hideDelay = 30000
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [currentAlerts, setCurrentAlerts] = useState<NewsAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tickerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const scrollPositionRef = useRef<number>(0);

  // Initialize with default content immediately, then fetch RSS
  useEffect(() => {
    // Show default content immediately
    if (!customAlerts) {
      setCurrentAlerts([
        {
          id: 'loading-1',
          time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
          headline: "Loading latest news...",
          source: "Community Hub",
          category: "NEWS",
          priority: "medium"
        },
        {
          id: 'loading-2',
          time: new Date(Date.now() - 2 * 60000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
          headline: "Stay tuned for community updates and local news",
          source: "Community Hub",
          category: "UPDATE",
          priority: "low"
        }
      ]);
    }

    // Fetch RSS feed immediately for instant loading
    const fetchNews = async () => {
      try {
        setIsLoading(true);
        setError(null);

        let alerts: NewsAlert[];

        if (customAlerts) {
          // Use custom alerts if provided
          alerts = customAlerts;
        } else {
          // Fetch from RSS feed immediately
          alerts = await rssService.fetchRSSFeed(rssUrl);
        }

        // Update with fresh data immediately
        setCurrentAlerts(alerts);
      } catch (err) {
        console.error('Error fetching news:', err);
        setError('Failed to load news');
        // Keep existing content if fetch fails
      } finally {
        setIsLoading(false);
      }
    };

    // Fetch immediately without delay for instant loading
    fetchNews();
  }, [rssUrl, customAlerts]);

  // Auto-hide functionality
  useEffect(() => {
    if (autoHide && isVisible) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, hideDelay);

      return () => clearTimeout(timer);
    }
  }, [autoHide, hideDelay, isVisible]);

  // Get color based on alert category
  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'EMERGENCY': return 'rgba(239, 68, 68, 0.8)'; // red
      case 'ALERT': return 'rgba(245, 158, 11, 0.8)'; // amber
      case 'UPDATE': return 'rgba(59, 130, 246, 0.8)'; // blue
      case 'EVENT': return 'rgba(139, 92, 246, 0.8)'; // purple
      case 'SAFETY': return 'rgba(16, 185, 129, 0.8)'; // green
      default: return 'rgba(107, 114, 128, 0.8)'; // gray
    }
  };

  // Populate ticker with alerts - SIMPLIFIED VERSION
  const populateTicker = () => {
    if (!tickerRef.current) return;

    const tickerContent = tickerRef.current;
    tickerContent.innerHTML = '';

    // Create a flat list of items (original + duplicate for seamless looping)
    const allAlerts = [...currentAlerts, ...currentAlerts];

    allAlerts.forEach(alert => {
      const alertItem = document.createElement('div');
      alertItem.className = 'news-item';
      alertItem.style.cssText = `
        display: inline-flex;
        align-items: center;
        padding: 0 30px;
        font-size: 0.95rem;
        color: white;
        border-right: 1px solid rgba(255, 255, 255, 0.2);
        white-space: nowrap;
        flex-shrink: 0;
      `;

      alertItem.innerHTML = `
        <span class="news-time" style="
          font-size: 0.7rem;
          color: rgba(255, 255, 255, 0.8);
          margin-right: 8px;
          font-weight: 500;
        ">${alert.time}</span>
        <span class="news-headline" style="
          font-weight: 500;
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 0.8rem;
        ">${alert.headline}</span>
        <span class="news-source" style="
          font-size: 0.65rem;
          color: rgba(255, 255, 255, 0.8);
          margin-left: 6px;
          font-style: italic;
          margin-right: 8px;
        ">${alert.source}</span>
        <span class="news-badge" style="
          background: ${getCategoryColor(alert.category)};
          padding: 1px 6px;
          border-radius: 10px;
          font-size: 0.6rem;
          margin-left: 8px;
          font-weight: 600;
          text-transform: uppercase;
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
        ">${alert.category}</span>
      `;

      tickerContent.appendChild(alertItem);
    });
  };

  // Continuous scrolling animation function - TRANSFORM-BASED
  const startScrolling = () => {
    if (animationRef.current) return; // Already running

    const scrollSpeed = 1; // pixels per frame

    const animate = () => {
      if (!tickerRef.current || isPaused) {
        animationRef.current = null;
        return;
      }

      scrollPositionRef.current -= scrollSpeed;

      // Reset position when content has scrolled half its width (one full set of items)
      // We use scrollWidth to get the full width of the content, including overflow
      const totalWidth = tickerRef.current.scrollWidth;
      const singleSetWidth = totalWidth / 2;

      if (Math.abs(scrollPositionRef.current) >= singleSetWidth) {
        scrollPositionRef.current = 0;
      }

      // Apply transform to create smooth scrolling effect
      tickerRef.current.style.transform = `translateX(${scrollPositionRef.current}px)`;
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  // Stop scrolling animation
  const stopScrolling = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  };

  // Initialize ticker on mount and when alerts change
  useEffect(() => {
    populateTicker();
  }, [currentAlerts]);

  // Start/stop scrolling based on pause state
  useEffect(() => {
    if (isPaused) {
      stopScrolling();
    } else {
      startScrolling();
    }

    return () => stopScrolling();
  }, [isPaused]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopScrolling();
  }, []);

  // Don't render if not visible
  if (!isVisible) return null;

  const styles = {
    banner: {
      background: 'linear-gradient(135deg, #d4183d 0%, #a00e2b 100%)',
      padding: '12px 0',
      position: 'relative' as const,
      overflow: 'hidden',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
      zIndex: 1000,
      width: '100%',
      borderRadius: '0 0 16px 16px',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'absolute' as const,
      left: 0,
      top: 0,
      height: '100%',
      background: 'rgba(0, 0, 0, 0.2)',
      padding: '0 20px',
      zIndex: 10,
      borderRight: '1px solid rgba(255, 255, 255, 0.2)',
    },
    label: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontWeight: 700,
      fontSize: '0.9rem',
      color: 'white',
      textTransform: 'uppercase' as const,
      letterSpacing: '1px',
      whiteSpace: 'nowrap' as const,
    },
    labelIcon: {
      animation: 'pulse 1.5s infinite',
    },
    ticker: {
      display: 'flex',
      alignItems: 'center',
      overflow: 'hidden',
      marginLeft: '140px',
      position: 'relative' as const,
      height: '20px',
    },
    tickerContent: {
      display: 'flex',
      whiteSpace: 'nowrap' as const,
      width: 'max-content', // Ensure container expands to fit all items
    },
    // Animations
    '@keyframes pulse': {
      '0%': { transform: 'scale(1)' },
      '50%': { transform: 'scale(1.1)' },
      '100%': { transform: 'scale(1)' }
    },
  };

  return (
    <>
      <div
        style={styles.banner}
        id="breakingNews"
        className="breaking-news-banner"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Breaking News Header */}
        <div style={styles.header} className="breaking-header">
          <div style={styles.label} className="breaking-label">
            <i className="fas fa-newspaper" style={styles.labelIcon}></i>
            <span className="latest-text">Latest</span> News
          </div>
        </div>

        {/* News Ticker */}
        <div style={styles.ticker} className="news-ticker">
          <div
            ref={tickerRef}
            style={styles.tickerContent}
            id="tickerContent"
          >
            {/* Alert items populated by JavaScript */}
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style>
        {`
            @keyframes pulse {
              0% {
                transform: scale(1);
              }
              50% {
                transform: scale(1.1);
              }
              100% {
                transform: scale(1);
              }
            }

            /* Responsive styles */
            @media (max-width: 768px) {
              .breaking-news-banner .breaking-header {
                padding: 0 10px !important;
              }

              .breaking-news-banner .breaking-label {
                font-size: 0.7rem;
              }

              .breaking-news-banner .latest-text {
                display: none;
              }

              .breaking-news-banner .news-ticker {
                margin-left: 70px !important;
                height: 20px;
              }

              .breaking-news-banner .news-item {
                padding: 0 15px;
                font-size: 0.7rem;
              }

              .breaking-news-banner .news-time {
                font-size: 0.6rem;
              }

              .breaking-news-banner .news-source {
                font-size: 0.55rem;
              }

              .breaking-news-banner .news-badge {
                font-size: 0.55rem;
                padding: 1px 5px;
              }
            }
          `}
      </style>
    </>
  );
};

export default BreakingNewsBanner;
