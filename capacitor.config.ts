import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hyperapp.mimi',
  appName: 'HayperApp',
  webDir: 'dist',
  bundledWebRuntime: false,
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '1096420795648-tvflndafmrrnibhc90fqkadqdn8cnssu.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
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
