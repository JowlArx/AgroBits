// T-27 — Spec 6: validación del registro enriquecido (R-01 v3, D27).
// Cubre AC4 y AC5 EN CLIENTE: los rechazos ocurren antes de tocar el
// servidor, así que este spec NO consume cuota de signup (D21/T-22: la suite
// no da de alta cuentas reales). El catálogo de localidades se lee del
// servidor real con sesión anónima (política `localidades_read`).
// AC6 (perfil persistido) se verifica con la suite SQL versionada en
// `supabase/tests/20261019_t27_perfiles_localidades.sql`.

import { test, expect, type Page } from '@playwright/test'
import { sello } from './entorno'

/** Cuenta las llamadas de signup para probar que los rechazos son locales. */
function cuentadorDeSignups(page: Page): { total: () => number } {
  let total = 0
  page.on('request', (solicitud) => {
    if (solicitud.url().includes('/auth/v1/signup')) total++
  })
  return { total: () => total }
}

async function abrirRegistro(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByTestId('cambiar-modo').click()
  await expect(page.getByRole('heading', { name: 'Crear cuenta' })).toBeVisible()
  // Espera a que el catálogo anónimo cargue (provincias > placeholder).
  await expect(page.getByTestId('provincia').locator('option')).not.toHaveCount(1)
}

async function rellenarRegistro(
  page: Page,
  datos: {
    email: string
    clave?: string
    confirmacion?: string
    telefono?: string
    provincia?: string
    localidad?: string
  },
): Promise<void> {
  await page.getByTestId('email').fill(datos.email)
  await page.getByTestId('clave').fill(datos.clave ?? 'secreta1')
  await page.getByTestId('confirmar-clave').fill(datos.confirmacion ?? datos.clave ?? 'secreta1')
  await page.getByTestId('telefono').fill(datos.telefono ?? '+54 9 261 555-1234')
  if (datos.provincia) await page.getByTestId('provincia').selectOption({ label: datos.provincia })
  if (datos.localidad) await page.getByTestId('localidad').selectOption({ label: datos.localidad })
}

test('AC4: la confirmación que no coincide se rechaza en cliente, sin llamar al servidor', async ({ page }) => {
  const signups = cuentadorDeSignups(page)
  await abrirRegistro(page)

  await rellenarRegistro(page, { email: `prueba-${sello()}@agrobits.test`, confirmacion: 'distinta1' })
  await page.getByTestId('enviar-acceso').click()

  await expect(page.getByTestId('error-acceso')).toContainText('Las contraseñas no coinciden')
  await expect(page.getByTestId('pantalla-acceso')).toBeVisible() // no entra
  expect(signups.total()).toBe(0) // el rechazo no llegó al servidor
})

test('AC5: el teléfono vacío o con formato inválido se rechaza indicando el campo', async ({ page }) => {
  const signups = cuentadorDeSignups(page)
  await abrirRegistro(page)

  await rellenarRegistro(page, { email: `prueba-${sello()}@agrobits.test`, telefono: '' })
  await page.getByTestId('enviar-acceso').click()
  await expect(page.getByTestId('error-acceso')).toContainText('El teléfono es obligatorio')

  await page.getByTestId('telefono').fill('123') // < 6 dígitos
  await page.getByTestId('enviar-acceso').click()
  await expect(page.getByTestId('error-acceso')).toContainText('entre 6 y 20 dígitos')

  await expect(page.getByTestId('pantalla-acceso')).toBeVisible() // nunca entró
  expect(signups.total()).toBe(0)
})

test('AC5: sin localidad seleccionada se rechaza indicando la selección', async ({ page }) => {
  const signups = cuentadorDeSignups(page)
  await abrirRegistro(page)

  await rellenarRegistro(page, { email: `prueba-${sello()}@agrobits.test`, provincia: 'Santa Fe' })
  await page.getByTestId('enviar-acceso').click()

  await expect(page.getByTestId('error-acceso')).toContainText('Selecciona una provincia y una localidad')
  await expect(page.getByTestId('pantalla-acceso')).toBeVisible()
  expect(signups.total()).toBe(0)
})

test('el catálogo carga sin sesión y la cascada provincia→localidad filtra', async ({ page }) => {
  await abrirRegistro(page)

  const opcionesProvincia = await page.getByTestId('provincia').locator('option').allTextContents()
  expect(opcionesProvincia).toContain('Santa Fe')
  expect(opcionesProvincia.length).toBeGreaterThan(2) // placeholder + las 24 provincias

  await page.getByTestId('provincia').selectOption({ label: 'Santa Fe' })
  const opcionesLocalidad = await page.getByTestId('localidad').locator('option').allTextContents()
  expect(opcionesLocalidad).toContain('Rosario')
  expect(opcionesLocalidad).not.toContain('Mendoza') // filtrado por provincia

  // Tras elegir provincia, la localidad vuelve a exigir selección (AC5).
  expect(await page.getByTestId('localidad').inputValue()).toBe('')
})
