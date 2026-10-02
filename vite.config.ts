import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { handleYouTubeInfo, handleYouTubeStream } from './src/server/youtubeBackend.ts';

function youtubeBackendPlugin(): Plugin {
  return {
    name: 'youtube-backend-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url) return next();
        if (req.url.startsWith('/api/health')) {
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          });
          res.end(JSON.stringify({ status: 'ok', service: 'Offline Media Vault Engine (Local PC)' }));
          return;
        }
        if (req.url.startsWith('/api/youtube/info')) {
          return handleYouTubeInfo(req, res);
        }
        if (req.url.startsWith('/api/youtube/stream')) {
          return handleYouTubeStream(req, res);
        }
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url) return next();
        if (req.url.startsWith('/api/health')) {
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          });
          res.end(JSON.stringify({ status: 'ok', service: 'Offline Media Vault Engine (Local PC)' }));
          return;
        }
        if (req.url.startsWith('/api/youtube/info')) {
          return handleYouTubeInfo(req, res);
        }
        if (req.url.startsWith('/api/youtube/stream')) {
          return handleYouTubeStream(req, res);
        }
        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    base: '/',
    plugins: [
      youtubeBackendPlugin(),
      react(),
      tailwindcss(),
      VitePWA({
        base: '/',
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: ['icon.svg', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png'],
        manifest: {
          id: '/',
          name: 'Offline Media Vault',
          short_name: 'MediaVault',
          description: 'Tu biblioteca multimedia offline para audio y video autorizados.',
          theme_color: '#090d16',
          background_color: '#090d16',
          display: 'standalone',
          orientation: 'portrait-primary',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          navigateFallback: '/index.html',
          navigateFallbackAllowlist: [/^(?!\/__).*/],
          clientsClaim: true,
          skipWaiting: true,
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.mode === 'navigate',
              handler: 'NetworkFirst',
              options: {
                cacheName: 'navigation-cache',
                networkTimeoutSeconds: 3,
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

