import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'foodus-logo.png'],
      workbox: {
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/assets\//, /^\/sw\.js$/, /^\/workbox-/],
        cleanupOutdatedCaches: true,
      },
      manifest: {
        name: 'Fooduś — Planer Diety',
        short_name: 'Fooduś',
        description: 'Inteligentny planer diety z AI — planuj posiłki, śledź makroskładniki, generuj listy zakupów.',
        theme_color: '#10b981',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
})
