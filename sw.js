// Service Worker for HyperApp - Offline Functionality
const CACHE_NAME = 'hyperapp-v1.0.0';
const STATIC_CACHE = 'hyperapp-static-v1.0.0';
const DYNAMIC_CACHE = 'hyperapp-dynamic-v1.0.0';

// Files to cache immediately
const STATIC_FILES = [
  '/',
  '/index.html',
  '/app.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://telegram.org/js/telegram-web-app.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js'
];

// Install event - cache static files
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('[SW] Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests differently
  if (url.hostname.includes('supabase.co') ||
      url.hostname.includes('openweathermap.org') ||
      url.hostname.includes('nominatim.openstreetmap.org')) {
    event.respondWith(networkFirstStrategy(request));
  } else {
    event.respondWith(cacheFirstStrategy(request));
  }
});

// Cache-first strategy for static assets
async function cacheFirstStrategy(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Cache-first failed:', error);
    // Return offline fallback for HTML requests
    if (request.headers.get('accept').includes('text/html')) {
      return caches.match('/index.html');
    }
  }
}

// Network-first strategy for API calls
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);

    // Cache successful API responses
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Network-first failed, trying cache:', error);

    // Try to serve from cache if network fails
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline API fallback
    return new Response(JSON.stringify({
      error: 'offline',
      message: 'You are currently offline. Some features may be limited.'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Background sync for offline reports
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync-reports') {
    event.waitUntil(syncOfflineReports());
  }
});

// Sync offline reports when back online
async function syncOfflineReports() {
  try {
    const offlineReports = await getOfflineReports();

    for (const report of offlineReports) {
      try {
        // Attempt to submit the report
        const response = await fetch('/api/reports', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(report)
        });

        if (response.ok) {
          // Remove from offline storage
          await removeOfflineReport(report.id);
          console.log('[SW] Synced offline report:', report.id);
        }
      } catch (error) {
        console.log('[SW] Failed to sync report:', report.id, error);
      }
    }
  } catch (error) {
    console.log('[SW] Background sync failed:', error);
  }
}

// IndexedDB helpers for offline storage
async function getOfflineReports() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('hyperapp-offline', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['reports'], 'readonly');
      const store = transaction.objectStore('reports');
      const getAllRequest = store.getAll();

      getAllRequest.onsuccess = () => resolve(getAllRequest.result);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('reports')) {
        db.createObjectStore('reports', { keyPath: 'id' });
      }
    };
  });
}

async function removeOfflineReport(id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('hyperapp-offline', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['reports'], 'readwrite');
      const store = transaction.objectStore('reports');
      const deleteRequest = store.delete(id);

      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
  });
}

// Push notifications for emergency alerts
self.addEventListener('push', event => {
  if (!event.data) return;

  const data = event.data.json();

  const options = {
    body: data.message,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/'
    },
    actions: [
      {
        action: 'view',
        title: 'View Details'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'HyperApp Alert', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});

// Periodic background tasks
self.addEventListener('periodicsync', event => {
  if (event.tag === 'update-weather') {
    event.waitUntil(updateWeatherInBackground());
  }
});

async function updateWeatherInBackground() {
  // This would update weather data in the background
  // Implementation depends on your specific needs
  console.log('[SW] Background weather update');
}

// Error logging
self.addEventListener('error', event => {
  console.error('[SW] Error:', event.error);
  // Send error to logging service
  logError({
    type: 'service_worker_error',
    message: event.error.message,
    stack: event.error.stack,
    url: event.filename,
    line: event.lineno,
    column: event.colno
  });
});

self.addEventListener('unhandledrejection', event => {
  console.error('[SW] Unhandled rejection:', event.reason);
  // Send error to logging service
  logError({
    type: 'unhandled_rejection',
    message: event.reason.message || event.reason,
    stack: event.reason.stack
  });
});

function logError(error) {
  // Send to error logging service (e.g., Sentry, LogRocket, etc.)
  // For now, just store locally
  const errorLog = {
    timestamp: Date.now(),
    ...error
  };

  // Store in IndexedDB for later analysis
  storeErrorLog(errorLog);
}

async function storeErrorLog(errorLog) {
  try {
    const request = indexedDB.open('hyperapp-logs', 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('errors')) {
        const store = db.createObjectStore('errors', { keyPath: 'timestamp' });
        store.createIndex('type', 'type', { unique: false });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['errors'], 'readwrite');
      const store = transaction.objectStore('errors');
      store.add(errorLog);
    };
  } catch (error) {
    console.error('[SW] Failed to store error log:', error);
  }
}
