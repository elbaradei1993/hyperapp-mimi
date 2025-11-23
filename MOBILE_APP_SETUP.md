# 📱 Mobile App Setup Guide

This guide will help you convert your HyperApp Mimi React web app into native Android APK and iOS mobile apps using Capacitor.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
```

### 2. Initialize Capacitor
```bash
npx cap init "HyperApp Mimi" com.hyperapp.mimi --web-dir=dist
```

### 3. Add Mobile Platforms
```bash
# Add Android platform
npx cap add android

# Add iOS platform (requires macOS)
npx cap add ios
```

### 4. Build and Sync
```bash
# Build your web app
npm run build

# Copy web assets to native projects
npx cap sync
```

## 📱 Android APK Build

### Method 1: Using npm scripts
```bash
npm run cap:build:android
```

### Method 2: Manual steps
```bash
# Open Android project in Android Studio
npx cap open android

# In Android Studio:
# 1. Wait for Gradle sync to complete
# 2. Build → Make Project (Ctrl+F9)
# 3. Build → Build Bundle(s)/APK(s) → Build APK(s)
# 4. Find APK at: android/app/build/outputs/apk/debug/app-debug.apk
```

## 🍎 iOS App Build (macOS Required)

### Method 1: Using npm scripts
```bash
npm run cap:build:ios
```

### Method 2: Manual steps
```bash
# Open iOS project in Xcode
npx cap open ios

# In Xcode:
# 1. Select your development team
# 2. Set bundle identifier if needed
# 3. Product → Archive
# 4. Distribute App → Development/Ad Hoc
# 5. Export .ipa file
```

## 🔧 Configuration Files

### capacitor.config.ts
```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hyperapp.mimi',
  appName: 'HyperApp Mimi',
  webDir: 'dist',
  bundledWebRuntime: false,
  plugins: {
    Camera: {
      allowEditing: false,
      saveToGallery: false,
      quality: 90,
      resultType: 'base64',
      direction: 'rear'
    }
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true
  },
  ios: {
    allowsLinkPreview: false,
    contentInset: 'automatic'
  }
};

export default config;
```

## 📱 Permissions Setup

### Android Permissions (AndroidManifest.xml)
Located at: `android/app/src/main/AndroidManifest.xml`

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- Camera Permission -->
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />

    <!-- Location Permissions -->
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />

    <!-- Camera Features -->
    <uses-feature android:name="android.hardware.camera" android:required="false" />
    <uses-feature android:name="android.hardware.camera.front" android:required="false" />
    <uses-feature android:name="android.hardware.location" android:required="false" />
    <uses-feature android:name="android.hardware.location.gps" android:required="false" />
</manifest>
```

### iOS Permissions (Info.plist)
Located at: `ios/App/App/Info.plist`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <!-- Camera Permissions -->
    <key>NSCameraUsageDescription</key>
    <string>This app needs camera access to capture safety reports</string>
    <key>NSPhotoLibraryUsageDescription</key>
    <string>This app needs photo library access for safety reports</string>

    <!-- Location Permissions -->
    <key>NSLocationWhenInUseUsageDescription</key>
    <string>This app needs location access to provide safety reports</string>
    <key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
    <string>This app needs location access to provide safety reports</string>
</dict>
</plist>
```

## 🧪 Testing Your Apps

### Android Testing
```bash
# Run on connected device/emulator
npx cap run android

# Or open in Android Studio and run
npx cap open android
```

### iOS Testing (macOS)
```bash
# Run on connected device/simulator
npx cap run ios

# Or open in Xcode and run
npx cap open ios
```

## 📦 Build Scripts

All available npm scripts for mobile development:

```json
{
  "cap:init": "cap init \"HyperApp Mimi\" com.hyperapp.mimi --web-dir=dist",
  "cap:add:android": "cap add android",
  "cap:add:ios": "cap add ios",
  "cap:sync": "cap sync",
  "cap:open:android": "cap open android",
  "cap:open:ios": "cap open ios",
  "cap:build:android": "cap sync android && cap open android",
  "cap:build:ios": "cap sync ios && cap open ios"
}
```

## 🚀 Deployment to App Stores

### Google Play Store (Android)
1. Generate Signed APK/AAB:
   - Android Studio → Build → Generate Signed Bundle/APK
   - Create/upload keystore
   - Choose release configuration

2. Create Google Play Console account
3. Upload APK/AAB file
4. Fill app details, screenshots, descriptions
5. Set pricing and distribution
6. Publish to production

### Apple App Store (iOS)
1. Generate App Store build:
   - Xcode → Product → Archive
   - Select archive → Distribute App
   - Choose "App Store Connect"

2. Create Apple Developer account ($99/year)
3. Use App Store Connect to upload
4. Fill app details, screenshots, descriptions
5. Submit for review
6. Wait for approval (usually 1-2 days)

## 🔧 Troubleshooting

### Common Issues:

1. **Camera not working in mobile app:**
   - Check permissions in AndroidManifest.xml / Info.plist
   - Ensure HTTPS in production (camera requires secure context)

2. **Build fails:**
   - Run `npm run build` first
   - Ensure all dependencies are installed
   - Check Capacitor version compatibility

3. **iOS build requires macOS:**
   - iOS development requires macOS and Xcode
   - Consider using Mac in Cloud services if needed

4. **Plugin issues:**
   - Some web APIs may not work in mobile
   - Use Capacitor plugins for native features

## 📋 Requirements Checklist

- ✅ Node.js 18+
- ✅ npm or yarn
- ✅ Android Studio (for Android)
- ✅ Xcode + macOS (for iOS)
- ✅ Java JDK 11+ (for Android)
- ✅ Capacitor CLI installed
- ✅ Built web app (`npm run build`)

## 🎯 Next Steps

1. **Install Capacitor** dependencies
2. **Initialize** your project
3. **Add platforms** (Android/iOS)
4. **Configure permissions**
5. **Build and test** on devices
6. **Deploy to app stores**

Your safety app will now be available as native mobile apps! 📱🚨
