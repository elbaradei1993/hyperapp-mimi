// Firebase configuration and initialization
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

// Firebase configuration - these will be set via environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging
let messaging: Messaging | null = null;

console.log('🔔 Firebase initialized successfully');

try {
  // Initialize messaging based on platform
  if (Capacitor.isNativePlatform()) {
    // On mobile, we don't need Firebase messaging directly - Capacitor handles it
    console.log('📱 Running on mobile - using Capacitor for notifications');
    messaging = null;
  } else {
    // On web, initialize Firebase messaging for PWA
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      messaging = getMessaging(app);
      console.log('🌐 Running on web - Firebase messaging initialized');
    }
  }
} catch (error) {
  console.warn('Firebase Messaging initialization failed:', error);
  messaging = null;
}

export { messaging };
export default app;

// FCM Token Management
export class FCMService {
  private static instance: FCMService;
  private vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

  private constructor() {}

  static getInstance(): FCMService {
    if (!FCMService.instance) {
      FCMService.instance = new FCMService();
    }
    return FCMService.instance;
  }

  // Request notification permission and get FCM token
  async requestPermission(): Promise<string | null> {
    try {
      if (Capacitor.isNativePlatform()) {
        // On mobile, use Capacitor's LocalNotifications plugin
        console.log('📱 Requesting notification permission via Capacitor');

        const { display } = await LocalNotifications.requestPermissions();

        if (display !== 'granted') {
          console.log('📱 Notification permission denied via Capacitor');
          return null;
        }

        console.log('📱 Notification permission granted via Capacitor');
        // On mobile, we don't need FCM token for local notifications
        // Push notifications will be handled differently
        return 'capacitor-local-notifications-enabled';

      } else {
        // On web, use Firebase messaging
        if (!messaging) {
          console.warn('Firebase Messaging not available');
          return null;
        }

        // Request notification permission
        const permission = await Notification.requestPermission();

        if (permission !== 'granted') {
          console.log('🌐 Notification permission denied');
          return null;
        }

        // Get FCM token
        const token = await getToken(messaging, {
          vapidKey: this.vapidKey,
        });

        if (token) {
          console.log('🌐 FCM token obtained:', token.substring(0, 20) + '...');
          return token;
        } else {
          console.warn('🌐 No FCM token available');
          return null;
        }
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return null;
    }
  }

  // Listen for foreground messages
  onMessageReceived(callback: (payload: any) => void): () => void {
    if (!messaging) {
      console.warn('Firebase Messaging not available for message listening');
      return () => {};
    }

    try {
      const unsubscribe = onMessage(messaging, (payload) => {
        console.log('Foreground message received:', payload);
        callback(payload);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up message listener:', error);
      return () => {};
    }
  }

  // Check if notifications are supported
  async isSupported(): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      // On mobile, check if LocalNotifications plugin is available
      try {
        const { display } = await LocalNotifications.checkPermissions();
        return display !== 'denied';
      } catch (error) {
        console.warn('Error checking Capacitor notification permissions:', error);
        return false;
      }
    } else {
      // On web, check for standard notification support
      return !!(
        messaging &&
        'serviceWorker' in navigator &&
        'Notification' in window
      );
    }
  }

  // Get current permission status
  async getPermissionStatus(): Promise<NotificationPermission | 'unknown'> {
    if (Capacitor.isNativePlatform()) {
      try {
        const { display } = await LocalNotifications.checkPermissions();
        switch (display) {
          case 'granted':
            return 'granted';
          case 'denied':
            return 'denied';
          default:
            return 'default';
        }
      } catch (error) {
        console.warn('Error getting Capacitor permission status:', error);
        return 'unknown';
      }
    } else {
      if (!('Notification' in window)) {
        return 'denied';
      }
      return Notification.permission;
    }
  }
}

// Export singleton instance
export const fcmService = FCMService.getInstance();
