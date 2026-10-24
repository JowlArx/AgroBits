// D40 — El «Historial de mediciones» ya no es una sección propia de la
// navegación: es una PESTAÑA dentro de la sección Sensores. El panel activo
// vive en la URL (`?vista=sensores&panel=historial`), así que la vista es
// enlazable y el «atrás» del navegador funciona.

import { test, expect } from '@playwright/test'
import { abrirDetalle, cuentaA, crearCultivo, eliminarCultivo, iniciarSesion, sello } from './entorno'

test('D40: el historial es una pestaña de Sensores y su estado vive en la URL', async ({ page }) => {
  await iniciarSesion(page, cuentaA)

  // La sección Sensores abre en su primer panel.
  await page.getByTestId('nav-sensores').click()
  await expect(page).toHaveURL(/[?&]vista=sensores/)
  await expect(page.getByTestId('panel-sensores')).toBeVisible()
  await expect(page.getByTestId('panel-historial')).toHaveCount(0)

  // La pestaña «Historial» abre el panel de historial y lo deja en la URL.
  await page.getByTestId('pestana-historial').click()
  await expect(page).toHaveURL(/[?&]vista=sensores/)
  await expect(page).toHaveURL(/[?&]panel=historial/)
  await expect(page.getByTestId('panel-historial')).toBeVisible()
  await expect(page.getByTestId('panel-sensores')).toHaveCount(0)
  // El topbar nombra la vista y el panel repite el título como subtítulo.
  await expect(page.locator('.titulo-topbar h2')).toHaveText('Historial de mediciones')
  await expect(
    page.getByTestId('panel-historial').getByRole('heading', { name: 'Historial de mediciones' }),
  ).toBeVisible()

  // Volver a «Sensores» deja la URL limpia y devuelve el panel de sensores.
  await page.getByTestId('pestana-sensores').click()
  await expect(page).toHaveURL(/[?&]vista=sensores/)
  await expect(page.getByTestId('panel-sensores')).toBeVisible()
  await expect(page.getByTestId('panel-historial')).toHaveCount(0)
})

test('D40: «Ver historial» de un cultivo abre la pestaña de historial con ese cultivo', async ({ page }) => {
  const nombre = `Huerto D40 ${sello()}`
  await iniciarSesion(page, cuentaA)
  await crearCultivo(page, nombre)
  await abrirDetalle(page, nombre)

  // El botón del detalle abre la PESTAÑA de historial dentro de Sensores.
  await page.getByTestId('ver-historial').click()
  await expect(page).toHaveURL(/[?&]vista=sensores/)
  await expect(page).toHaveURL(/[?&]panel=historial/)
  await expect(page.getByTestId('panel-historial')).toBeVisible()

  // El cultivo queda preseleccionado en el filtro del historial.
  const filtroCultivo = page.getByTestId('panel-historial').locator('select').first()
  await expect(filtroCultivo).not.toHaveValue('')

  await eliminarCultivo(page, nombre)
})

test.describe('en móvil (390×844)', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('D40: las pestañas de Sensores caben en 390 px sin desbordar', async ({ page }) => {
    await iniciarSesion(page, cuentaA)

    await page.getByTestId('nav-sensores').click()
    await expect(page.getByTestId('pestana-historial')).toBeVisible()

    // La barra de pestañas entra entera en el ancho del móvil…
    const caja = await page.getByTestId('pestana-historial').boundingBox()
    expect(caja).not.toBeNull()
    expect(caja!.x + caja!.width).toBeLessThanOrEqual(390)

    // …y la página no genera scroll horizontal.
    const desborda = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    )
    expect(desborda).toBe(false)

    // La pestaña cambia de panel también en móvil.
    await page.getByTestId('pestana-historial').click()
    await expect(page.getByTestId('panel-historial')).toBeVisible()
    await expect(page.getByTestId('panel-sensores')).toHaveCount(0)
  })
})
