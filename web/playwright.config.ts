// T-26 — Configuración de la suite E2E (Playwright) del hito M4.
// Por defecto ejecuta los specs de `e2e/` contra el servidor de desarrollo de
// Vite en el puerto 5173: se reutiliza el servidor que ya esté levantado; si
// no lo hay, Playwright lanza `npm run dev` automáticamente y lo apaga al
// terminar.
//
// Contra un despliegue remoto (p. ej. producción): definir PLAYWRIGHT_BASE_URL
//   PLAYWRIGHT_BASE_URL=https://agrobits-jowlarxs-projects.vercel.app npm run test:e2e
// En ese caso NO se lanza servidor local; los specs usan la URL remota.
//
// Credenciales de las cuentas de prueba (A y B): `web/.env.local` (gitignored),
// variables E2E_EMAIL_A / E2E_PASSWORD_A / E2E_EMAIL_B / E2E_PASSWORD_B.
// Ningún secreto vive en el repo; la suite falla con un mensaje claro si
// faltan (ver `e2e/entorno.ts`).

import { defineConfig, devices } from '@playwright/test'

// URL objetivo: remota si se define PLAYWRIGHT_BASE_URL; si no, Vite local.
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173'
const esRemoto = Boolean(process.env.PLAYWRIGHT_BASE_URL)

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
    baseURL,
    locale: 'es-ES',
    timezoneId: 'UTC', // horas de las lecturas/alertas predecibles
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Contra un destino remoto no hay servidor local que levantar.
  webServer: esRemoto
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: true,
        timeout: 60_000,
      },
})
