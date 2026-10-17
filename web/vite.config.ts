import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    // T-22: inyecta el doble de autenticación antes de cada prueba.
    setupFiles: ['./src/tests/soporte/configurarTests.ts'],
  },
})
