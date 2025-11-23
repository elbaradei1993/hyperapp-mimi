// Firebase configuration and initialization
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';

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
  // Only initialize messaging if we're in a browser environment and FCM is supported
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    messaging = getMessaging(app);
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
      if (!messaging) {
        console.warn('Firebase Messaging not available');
        return null;
      }

      // Request permission
      const permission = await Notification.requestPermission();

      if (permission !== 'granted') {
        console.log('Notification permission denied');
        return null;
      }

      // Get FCM token
      const token = await getToken(messaging, {
        vapidKey: this.vapidKey,
      });

      if (token) {
        console.log('FCM token obtained:', token.substring(0, 20) + '...');
        return token;
      } else {
        console.warn('No FCM token available');
        return null;
      }
    } catch (error) {
      console.error('Error requesting FCM permission:', error);
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
  isSupported(): boolean {
    return !!(
      messaging &&
      'serviceWorker' in navigator &&
      'Notification' in window
    );
  }

  // Get current permission status
  getPermissionStatus(): NotificationPermission {
    if (!('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  }
}

// Export singleton instance
export const fcmService = FCMService.getInstance();
