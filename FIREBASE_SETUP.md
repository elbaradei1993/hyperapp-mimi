# Firebase Cloud Messaging Setup Guide

This guide will help you set up Firebase Cloud Messaging (FCM) for true push notifications in your HyperApp.

## 🚀 Quick Setup (5 minutes)

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" (or select existing)
3. Enable Google Analytics if desired
4. Wait for project creation

### 2. Add Web App to Firebase
1. In your Firebase project, click the `</>` icon to add a web app
2. Register your app with name "HyperApp"
3. **Copy the Firebase config values** - you'll need them in step 4

### 3. Enable Cloud Messaging
1. In Firebase Console, go to **Project Settings** (gear icon)
2. Click on **Cloud Messaging** tab
3. Click **Generate key pair** under "Web Push certificates"
4. **Copy the VAPID key** - you'll need it in step 4

### 4. Configure Environment Variables

Create/update your `.env` file with Firebase configuration:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_VAPID_KEY=your_vapid_key_here

# Supabase Edge Functions (for push sending)
FIREBASE_SERVER_KEY=your_server_key_here
```

**Where to find these values:**
- **API Key, Auth Domain, Project ID, Storage Bucket, App ID**: From Firebase web app config (step 2)
- **Messaging Sender ID**: From Firebase web app config
- **VAPID Key**: Generated in step 3
- **Server Key**: Go to Project Settings → Cloud Messaging → Server key

### 5. Deploy Supabase Edge Function

Run this command in your project root:

```bash
supabase functions deploy send-push-notifications
```

### 6. Run Database Migration

Execute the SQL in `push-subscriptions-migration.sql` in your Supabase SQL editor.

## 🔧 How It Works

### When App is Open:
```
Report → Supabase Realtime → Instant In-App Notification
```

### When App is Closed:
```
Report → Supabase Edge Function → FCM → Push to Device
```

### Emergency Reports:
- **High Priority**: Wake device immediately
- **Location-based**: Only users within 5km
- **Instant delivery**: Bypasses Doze mode on Android

## 📱 User Experience

1. **First Visit**: App requests notification permission
2. **Permission Granted**: FCM token stored in Supabase
3. **Emergency Reported**: Push notification sent to nearby users
4. **Tap Notification**: Opens app and navigates to location

## 🧪 Testing Push Notifications

### Test from Firebase Console:
1. Go to Firebase Console → Cloud Messaging
2. Click "Send your first message"
3. Select your web app
4. Send a test notification

### Test from App:
1. Submit an emergency report
2. Check browser console for push sending logs
3. Check Supabase Edge Function logs

## 🔒 Security & Privacy

- **User Consent**: Notifications only sent to users who granted permission
- **Location Privacy**: Only sends to users within notification radius
- **No Spam**: Emergency reports only trigger push notifications
- **User Control**: Users can disable notifications in settings

## 🐛 Troubleshooting

### Common Issues:

**"Messaging: This browser doesn't support the API"**
- Solution: Use HTTPS and modern browser (Chrome, Firefox, Edge)

**"FCM token not available"**
- Solution: Check Firebase config and VAPID key

**"Push notifications not working on mobile"**
- Solution: Ensure app is installed as PWA and permissions granted

**"Edge function not found"**
- Solution: Deploy the function: `supabase functions deploy send-push-notifications`

## 📊 Monitoring

- **Firebase Console**: View push delivery stats
- **Supabase Dashboard**: Monitor edge function usage
- **Browser DevTools**: Check console logs for debugging

## 💰 Cost

- **Firebase FCM**: 1M free messages/month
- **Supabase Edge Functions**: Included in your plan
- **Total**: $0 for normal usage

## 🎯 Next Steps

1. Complete Firebase setup above
2. Test with emergency reports
3. Add notification preferences in settings
4. Monitor delivery rates
5. Consider adding more notification types

---

**Need help?** Check the Firebase documentation or Supabase Edge Functions guide.
