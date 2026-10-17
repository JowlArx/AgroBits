// T-26 — Configuración de la suite E2E (Playwright) del hito M4.
// Ejecuta los specs de `e2e/` contra el servidor de desarrollo de Vite en el
// puerto 5173: se reutiliza el servidor que ya esté levantado; si no lo hay,
// Playwright lanza `npm run dev` automáticamente y lo apaga al terminar.
//
// Credenciales de las cuentas de prueba (A y B): `web/.env.local` (gitignored),
// variables E2E_EMAIL_A / E2E_PASSWORD_A / E2E_EMAIL_B / E2E_PASSWORD_B.
// Ningún secreto vive en el repo; la suite falla con un mensaje claro si
// faltan (ver `e2e/entorno.ts`).

import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  // Las dos cuentas comparten datos entre specs: ejecución secuencial.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000, // el borrado en cascada de un cultivo puede tardar >12 s
  expect: { timeout: 15_000 },
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    locale: 'es-ES',
    timezoneId: 'UTC', // horas de las lecturas/alertas predecibles
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
