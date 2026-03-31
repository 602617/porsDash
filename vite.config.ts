// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',   // oppdaterer SW automatisk
      strategies: 'injectManifest',
      srcDir: 'public',
      filename: 'sw.js',
      manifest: {
        name: 'PorsDash',
        short_name: 'PorsDash',
        description: 'Utleie-app som PWA',
        theme_color: '#2563eb',
        display: 'standalone',
        icons: [
          {
            src: '/icon-192-v2.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512-v2.png',
            sizes: '512x512',
            type: 'image/png'
          },
          // du kan generere flere (maskable osv.)
        ]
      },
      injectManifest: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ]
});
