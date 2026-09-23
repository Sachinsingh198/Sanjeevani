import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const enablePwa = env.VITE_ENABLE_PWA !== 'false';

  const plugins = [
    react(),
    tailwindcss(),
  ];

  if (enablePwa) {
    plugins.push(
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'pwa-192x192.svg', 'pwa-512x512.svg'],
        manifest: {
          name: 'Sanjeevani — AI Health Assistant',
          short_name: 'Sanjeevani',
          description: 'Bilingual AI Health Assistant for Rural India',
          theme_color: '#166534',
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            {
              src: '/pwa-192x192.svg',
              sizes: '192x192',
              type: 'image/svg+xml',
              purpose: 'any maskable',
            },
            {
              src: '/pwa-512x512.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          globIgnores: ['**/wasm/**', '**/models/**'],
          runtimeCaching: [
            {
              // NEVER cache chat, auth, or sensitive API endpoints
              urlPattern: ({ url }) =>
                url.pathname.startsWith('/chat') ||
                url.pathname.startsWith('/auth') ||
                url.pathname.startsWith('/admin'),
              handler: 'NetworkOnly',
            },
            {
              // Static assets (CSS, JS, fonts, images)
              urlPattern: ({ request }) =>
                request.destination === 'style' ||
                request.destination === 'script' ||
                request.destination === 'image' ||
                request.destination === 'font',
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'sanjeevani-static-assets',
                expiration: {
                  maxEntries: 60,
                  maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
                },
              },
            },
          ],
        },
      })
    );
  }

  return {
    plugins,
    server: {
      proxy: {
        '/companion': 'http://localhost:8000',
        '/screen': 'http://localhost:8000',
        '/auth': 'http://localhost:8000',
        '/chat': 'http://localhost:8000',
        '/admin': 'http://localhost:8000',
        '/reports': 'http://localhost:8000',
        '/voice': 'http://localhost:8000',
        '/api': {
          target: 'http://localhost:8000',
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  };
});