import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icono-hoja-senial.svg', 'logo.svg'],
      manifest: {
        name: 'AgroBits',
        short_name: 'AgroBits',
        description: 'Monitoreo agrícola de sensores y cultivos',
        theme_color: '#1f3d2b',
        background_color: '#1f3d2b',
        display: 'standalone',
        scope: '/',
        start_url: '/app.html',
        icons: [
          {
            src: 'icono-hoja-senial.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,ico,png,woff2}'],
      },
    }),
  ],
  build: {
    rollupOptions: {
      // Dos páginas (decisión de arquitectura del fix SEO): `index.html` es la
      // landing estática de presentación (sin JS, servida en `/`) y `app.html`
      // es la entrada de la SPA (servida en `/app.html`).
      input: {
        landing: fileURLToPath(new URL('./index.html', import.meta.url)),
        app: fileURLToPath(new URL('./app.html', import.meta.url)),
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    // T-22: inyecta el doble de autenticación antes de cada prueba.
    setupFiles: ['./src/tests/soporte/configurarTests.ts'],
  },
})
