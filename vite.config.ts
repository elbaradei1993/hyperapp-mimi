import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.png', 'favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'HyperApp - Community Safety Platform',
        short_name: 'HyperApp',
        description: 'Real-time community safety platform with location-based reports and emergency alerts',
        theme_color: '#3b82f6',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'logo.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        categories: ['social', 'navigation', 'utilities'],
        shortcuts: [
          {
            name: 'New Report',
            short_name: 'Report',
            description: 'Create a new safety report',
            url: '/?action=new-report',
            icons: [{ src: 'logo.png', sizes: '192x192' }]
          },
          {
            name: 'Emergency',
            short_name: 'SOS',
            description: 'Send emergency alert',
            url: '/?action=emergency',
            icons: [{ src: 'logo.png', sizes: '192x192' }]
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
      }
    })
  ],
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true, // Enable source maps for debugging
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks for better caching
          vendor: ['react', 'react-dom'],
          leaflet: ['leaflet', 'react-leaflet'],
          charts: ['recharts'],
          utils: ['i18next', 'react-i18next']
        }
      }
    }
  }
})
