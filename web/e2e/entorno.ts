// T-26 — Utilidades compartidas de la suite E2E (hito M4).
// Lee las credenciales de las cuentas de prueba desde `web/.env.local`
// (gitignored, nunca en el repo). Los cultivos se nombran con un sello
// único por test para que las ejecuciones no se pisen, y cada spec se
// limpia a sí misma al terminar.

import { readFileSync } from 'node:fs'
import { expect, type Page } from '@playwright/test'

function cargarEnvLocal(): Record<string, string> {
  const texto = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  const variables: Record<string, string> = {}
  for (const linea of texto.split(/\r?\n/)) {
    const coincidencia = /^([A-Z0-9_]+)=(.*)$/.exec(linea.trim())
    if (coincidencia) variables[coincidencia[1]] = coincidencia[2]
  }
  return variables
}

const env = cargarEnvLocal()

function exigir(clave: string): string {
  const valor = env[clave]
  if (!valor) {
    throw new Error(
      `Falta ${clave} en web/.env.local. Crea las cuentas E2E (e2e-a@agrobits.test / e2e-b@agrobits.test) vía SQL y añade sus credenciales al .env.local (gitignored).`,
    )
  }
  return valor
}

export const cuentaA = { correo: exigir('E2E_EMAIL_A'), clave: exigir('E2E_PASSWORD_A') }
export const cuentaB = { correo: exigir('E2E_EMAIL_B'), clave: exigir('E2E_PASSWORD_B') }

/** Marca única por test (nombre de cultivo) para no cruzar datos. */
export function sello(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 1000)}`
}

export async function iniciarSesion(
  page: Page,
  cuenta: { correo: string; clave: string },
): Promise<void> {
  await page.goto('/app.html')
  await expect(page.getByTestId('pantalla-acceso')).toBeVisible()
  await page.getByTestId('email').fill(cuenta.correo)
  await page.getByTestId('clave').fill(cuenta.clave)
  await page.getByTestId('enviar-acceso').click()
  // D32: el panel muestra el nombre de usuario o, sin él, la parte local del email.
  await expect(page.getByTestId('sesion-usuario')).toContainText(cuenta.correo.split('@')[0])
}

export async function cerrarSesion(page: Page): Promise<void> {
  // D33: el cierre vive en el menú de la cuenta (disparador «menu-usuario»).
  await page.getByTestId('menu-usuario').click()
  await page.getByTestId('cerrar-sesion').click()
  await expect(page.getByTestId('pantalla-acceso')).toBeVisible()
}

/**
 * Crea un cultivo con los 4 umbrales abiertos (ninguna lectura del simulador
 * dispara alertas) y, si se indica, la temperatura al rango pedido — p. ej.
 * ['999', '2000'] para forzar que TODO quede fuera de rango (5–40 °C).
 */
export async function crearCultivo(page: Page, nombre: string, temperatura?: [string, string]): Promise<void> {
  await page.getByTestId('nav-cultivos').click()
  await page.getByRole('button', { name: 'Nuevo cultivo' }).click()
  await page.locator('input[name="nombre"]').fill(nombre)
  await page.getByTestId('min-humedad_suelo').fill('0')
  await page.getByTestId('max-humedad_suelo').fill('100')
  await page.getByTestId('min-temperatura').fill(temperatura?.[0] ?? '0')
  await page.getByTestId('max-temperatura').fill(temperatura?.[1] ?? '100')
  await page.getByTestId('min-humedad_ambiental').fill('0')
  await page.getByTestId('max-humedad_ambiental').fill('100')
  await page.getByTestId('min-luminosidad').fill('0')
  await page.getByTestId('max-luminosidad').fill('60000')
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByTestId('lista-cultivos')).toContainText(nombre)
}

export function cultivoEn(page: Page, nombre: string) {
  return page.locator('li.tarjeta-cultivo').filter({ hasText: nombre })
}

export async function abrirDetalle(page: Page, nombre: string): Promise<void> {
  await page.getByTestId('nav-cultivos').click()
  await cultivoEn(page, nombre).getByRole('button', { name: 'Ver mediciones' }).click()
  await expect(page.getByTestId('tabla-mediciones')).toBeVisible()
}

export async function crearSensor(page: Page, nombre: string): Promise<void> {
  await page.getByTestId('nombre-sensor').fill(nombre)
  await page.getByTestId('crear-sensor').click()
  await expect(page.getByTestId('lista-sensores')).toContainText(nombre)
}

/** Espera a que el generador (T-24) haya escrito la primera lectura. */
export async function esperarLectura(page: Page, tipo = 'temperatura'): Promise<void> {
  // Primero exige que la celda exista (evita que `not.toContainText` pase en
  // vacío si la página dejó de estar en el detalle), luego la lectura.
  await expect(page.getByTestId(`valor-${tipo}`)).toBeVisible({ timeout: 60_000 })
  await expect(page.getByTestId(`valor-${tipo}`)).not.toContainText('sin datos', { timeout: 60_000 })
}

export async function eliminarCultivo(page: Page, nombre: string): Promise<void> {
  await page.getByTestId('nav-cultivos').click()
  await cultivoEn(page, nombre).getByRole('button', { name: 'Eliminar' }).click()
  // La cascada de la BD (enlaces, mediciones y alertas) puede tardar.
  await expect(cultivoEn(page, nombre)).toHaveCount(0, { timeout: 90_000 })
}
