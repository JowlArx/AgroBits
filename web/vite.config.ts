import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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
