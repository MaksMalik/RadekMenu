import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'api-proxy',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url && req.url.includes('/api/foods-search')) {
            try {
              const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
              const searchTerm = urlObj.searchParams.get('SearchTerm') || urlObj.searchParams.get('q') || '';
              
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Access-Control-Allow-Origin', '*');

              if (!searchTerm) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'SearchTerm is required' }));
                return;
              }

              const { scrapeFatSecret } = await import('./api/foods-search');
              const products = await scrapeFatSecret(searchTerm);
              res.statusCode = 200;
              res.end(JSON.stringify(products));
            } catch (err) {
              console.error("Vite API proxy error:", err);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: String(err) }));
            }
          } else {
            next();
          }
        });
      }
    },
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'foodus-logo.png'],
      workbox: {
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/assets\//, /^\/sw\.js$/, /^\/workbox-/, /^\/api\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-cache',
              networkTimeoutSeconds: 3,
            },
          },
        ],
      },
      manifest: {
        name: 'Smakołysz — Planer Diety',
        short_name: 'Smakołysz',
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
