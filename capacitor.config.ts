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
