// Push Notification Service - Firebase FCM + Supabase Integration
import { fcmService } from '../lib/firebase';
import { supabase } from '../lib/supabase';
import type { Vibe, SOS } from '../types';

interface PushSubscription {
  id: string;
  user_id: string;
  fcm_token: string;
  user_location_lat?: number;
  user_location_lng?: number;
  notification_radius: number; // in kilometers
  emergency_alerts: boolean;
  safety_reports: boolean;
  created_at: string;
  updated_at: string;
}

class PushNotificationService {
  private static instance: PushNotificationService;
  private currentUserId: string | null = null;
  private currentToken: string | null = null;
  private unsubscribeFromMessages: (() => void) | null = null;

  private constructor() {}

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  // Initialize push notifications for a user
  async initialize(userId: string): Promise<void> {
    this.currentUserId = userId;

    try {
      // Check if FCM is supported
      if (!fcmService.isSupported()) {
        console.log('Push notifications not supported on this device');
        return;
      }

      // Request permission and get token
      const token = await fcmService.requestPermission();

      if (!token) {
        console.log('Failed to get FCM token');
        return;
      }

      this.currentToken = token;

      // Store token in Supabase
      await this.storePushSubscription(token);

      // Listen for foreground messages
      this.unsubscribeFromMessages = fcmService.onMessageReceived((payload) => {
        this.handleForegroundMessage(payload);
      });

      console.log('🔔 Push notifications initialized for user:', userId);

    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
    }
  }

  // Store FCM token in Supabase
  private async storePushSubscription(token: string): Promise<void> {
    if (!this.currentUserId) return;

    try {
      // Check if subscription already exists
      const { data: existing } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('user_id', this.currentUserId)
        .eq('fcm_token', token)
        .single();

      if (existing) {
        // Update existing subscription
        await supabase
          .from('push_subscriptions')
          .update({
            updated_at: new Date().toISOString(),
            emergency_alerts: true,
            safety_reports: true
          })
          .eq('id', existing.id);
      } else {
        // Create new subscription
        await supabase
          .from('push_subscriptions')
          .insert({
            user_id: this.currentUserId,
            fcm_token: token,
            notification_radius: 5, // 5km default
            emergency_alerts: true,
            safety_reports: true
          });
      }

      console.log('📱 Push subscription stored in database');
    } catch (error) {
      console.error('Failed to store push subscription:', error);
    }
  }

  // Handle foreground messages (when app is open)
  private handleForegroundMessage(payload: any): void {
    console.log('📨 Foreground push message received:', payload);

    const { notification, data } = payload;

    if (notification) {
      // Show in-app notification
      this.showInAppNotification({
        type: data?.type === 'emergency' ? 'error' : 'info',
        title: notification.title,
        message: notification.body,
        action: data?.url ? {
          label: 'View',
          onClick: () => {
            if (data.url) {
              window.location.href = data.url;
            }
          }
        } : undefined
      });
    }
  }

  // Show in-app notification (fallback for foreground messages)
  private showInAppNotification(notification: {
    type: 'info' | 'warning' | 'error';
    title: string;
    message: string;
    action?: { label: string; onClick: () => void };
  }): void {
    // This will be handled by the notification context
    // For now, just log it
    console.log('📢 In-app notification:', notification);
  }

  // Send push notification to nearby users (server-side function)
  async sendPushToNearbyUsers(report: Vibe | SOS, reportLocation: [number, number]): Promise<void> {
    try {
      // Call Supabase Edge Function to handle push sending
      const { data, error } = await supabase.functions.invoke('send-push-notifications', {
        body: {
          report: report,
          location: reportLocation,
          radius: 5 // 5km radius
        }
      });

      if (error) {
        console.error('Failed to send push notifications:', error);
      } else {
        console.log('📤 Push notifications sent to nearby users:', data);
      }
    } catch (error) {
      console.error('Error invoking push notification function:', error);
    }
  }

  // Update user location for targeted notifications
  async updateUserLocation(location: [number, number]): Promise<void> {
    if (!this.currentUserId) return;

    try {
      await supabase
        .from('push_subscriptions')
        .update({
          user_location_lat: location[0],
          user_location_lng: location[1],
          updated_at: new Date().toISOString()
        })
        .eq('user_id', this.currentUserId);

      console.log('📍 User location updated for push notifications');
    } catch (error) {
      console.error('Failed to update user location:', error);
    }
  }

  // Update notification preferences
  async updatePreferences(preferences: {
    emergency_alerts?: boolean;
    safety_reports?: boolean;
    notification_radius?: number;
  }): Promise<void> {
    if (!this.currentUserId) return;

    try {
      await supabase
        .from('push_subscriptions')
        .update({
          ...preferences,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', this.currentUserId);

      console.log('⚙️ Push notification preferences updated');
    } catch (error) {
      console.error('Failed to update preferences:', error);
    }
  }

  // Cleanup when user logs out
  cleanup(): void {
    if (this.unsubscribeFromMessages) {
      this.unsubscribeFromMessages();
      this.unsubscribeFromMessages = null;
    }

    this.currentUserId = null;
    this.currentToken = null;

    console.log('🧹 Push notification service cleaned up');
  }

  // Check if push notifications are enabled
  isEnabled(): boolean {
    return fcmService.getPermissionStatus() === 'granted' && !!this.currentToken;
  }

  // Get current FCM token
  getCurrentToken(): string | null {
    return this.currentToken;
  }
}

// Export singleton instance
export const pushNotificationService = PushNotificationService.getInstance();
export default pushNotificationService;
