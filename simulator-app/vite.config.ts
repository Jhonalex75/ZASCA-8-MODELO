import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['vite.svg', 'icons/*.png'],
      manifest: false, // Usamos manifest.json manual en public/
      workbox: {
        // Cache de assets estáticos (JS, CSS, imágenes, fuentes)
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // Runtime caching para la API del plc-bridge
        runtimeCaching: [
          {
            // Cache de la API REST del plc-bridge (status, inventory)
            urlPattern: /^http:\/\/.*:3001\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'plc-bridge-api',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 5, // 5 minutos
              },
              networkTimeoutSeconds: 3,
            },
          },
        ],
      },
      devOptions: {
        enabled: false, // Solo en build de producción
      },
    }),
  ],
  server: {
    host: '0.0.0.0', // Accesible desde tablet en la misma red
    port: 5173,
  },
})
