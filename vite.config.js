import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// Temporarily disable PWA plugin to fix Firebase service worker conflicts
// import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    // Temporarily disabled PWA plugin to fix Firebase service worker issues
    // VitePWA({...})
  ],
  server: {
    port: 3000,
    open: true,
    host: '0.0.0.0' // Allow connections from network
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      external: ['@codetrix-studio/capacitor-google-auth']
    }
  }
})
