import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/admin/' : '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Diwan Berlin · Admin',
        short_name: 'Diwan Admin',
        description: 'Restaurant operations dashboard for Cafe Diwan Berlin',
        theme_color: '#180e04',
        background_color: '#180e04',
        display: 'standalone',
        orientation: 'any',
        start_url: '/admin/',
        icons: [
          { src: '/uploads/diwan-logo-new.png', sizes: '192x192', type: 'image/png' },
          { src: '/uploads/diwan-logo-new.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^\/api\/admin\//,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-admin-cache', expiration: { maxAgeSeconds: 60 } },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:3000', ws: true, changeOrigin: true },
      '/uploads': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
}));
