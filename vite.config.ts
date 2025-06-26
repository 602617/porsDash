// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',   // oppdaterer SW automatisk
      manifest: {
        name: 'PorsDash',
        short_name: 'PorsDash',
        description: 'Utleie-app som PWA',
        theme_color: '#2563eb',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          // du kan generere flere (maskable osv.)
        ]
      },
      workbox: {
        // hvilke filer som caches
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ]
});
