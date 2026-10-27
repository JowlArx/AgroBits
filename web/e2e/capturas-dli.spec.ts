// ESPEC DE CAPTURAS VISUALES (revisiones de diseño de la vista de cultivo).
// Abre la lista de cultivos con el detalle "Ver mediciones" y captura
// 1440, 768 y 390 px (más la matriz en 390) para comparar rondas de diseño.

import { test, expect } from '@playwright/test'
import { abrirDetalle, cuentaA, crearCultivo, crearSensor, eliminarCultivo, esperarLectura, iniciarSesion, sello } from './entorno'

const SALIDA = 'C:\\Users\\uarce\\AppData\\Local\\Temp\\opencode\\capturas'

test('capturas de la vista de cultivo en tres anchos', async ({ page }) => {
  const nombre = `Huerto captura ${sello()}`
  const nombreSensor = `Sensor captura ${sello()}`

  await iniciarSesion(page, cuentaA)
  try {
    await crearCultivo(page, nombre)
    await abrirDetalle(page, nombre)
    await crearSensor(page, nombreSensor)
    await esperarLectura(page, 'temperatura')

    await page.setViewportSize({ width: 1440, height: 900 })
    await expect(page.getByTestId('tabla-mediciones')).toBeVisible()
    await page.screenshot({ path: `${SALIDA}\\cultivo-1440.png`, fullPage: true })

    await page.setViewportSize({ width: 768, height: 1024 })
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${SALIDA}\\cultivo-768.png`, fullPage: true })

    await page.setViewportSize({ width: 390, height: 844 })
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${SALIDA}\\cultivo-390.png`, fullPage: true })
    await page.getByTestId('tabla-mediciones').scrollIntoViewIfNeeded()
    await page.waitForTimeout(200)
    await page.screenshot({ path: `${SALIDA}\\cultivo-390-matriz.png` })
  } finally {
    await eliminar(page, nombreSensor)
    await eliminarCultivo(page, nombre)
  }
})

async function eliminar(page: import('@playwright/test').Page, nombreSensor: string): Promise<void> {
  const nav = page.getByTestId('nav-sensores')
  if ((await nav.count()) === 0) return
  await nav.click()
  const tarjeta = page.getByTestId('tarjeta-sensor').filter({ hasText: nombreSensor })
  if ((await tarjeta.count()) === 0) return
  await tarjeta.getByRole('button', { name: 'Eliminar' }).click()
  await tarjeta.getByRole('button', { name: 'Sí', exact: true }).click()
  await expect(tarjeta).toHaveCount(0, { timeout: 30_000 })
}
