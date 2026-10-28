// ESPEC DE CAPTURAS VISUALES (revisiones de diseño de la vista de cultivo).
// Captura la lista de cultivos, el detalle "Ver mediciones", la matriz en
// móvil y las acciones con el formulario expandido, en 1440, 768 y 390 px.

import { test, expect } from '@playwright/test'
import {
  abrirDetalle,
  cuentaA,
  crearCultivo,
  crearSensor,
  eliminarCultivo,
  esperarLectura,
  iniciarSesion,
  sello,
} from './entorno'

const SALIDA = 'C:\\Users\\uarce\\AppData\\Local\\Temp\\opencode\\capturas'

test('capturas de la vista de cultivo en tres anchos', async ({ page }) => {
  const nombre = `Huerto captura ${sello()}`
  const nombreSensor = `Sensor captura ${sello()}`

  await iniciarSesion(page, cuentaA)
  try {
    await crearCultivo(page, nombre)

    // Lista de cultivos: la tarjeta con sus botones (antes de abrir el detalle).
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${SALIDA}\\lista-1440.png`, fullPage: true })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${SALIDA}\\lista-390.png`, fullPage: true })
    await page.getByTestId('lista-cultivos').scrollIntoViewIfNeeded()
    await page.waitForTimeout(200)
    await page.screenshot({ path: `${SALIDA}\\tarjeta-390.png` })

    // Detalle "Ver mediciones" con su sensor y lectura.
    await page.setViewportSize({ width: 1440, height: 900 })
    await abrirDetalle(page, nombre)
    await crearSensor(page, nombreSensor)
    await esperarLectura(page, 'temperatura')
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

    // Banda inferior en móvil: sensores, alertas y gráfica colapsados a 1 columna.
    await page.getByRole('heading', { name: 'Evolución de lecturas' }).scrollIntoViewIfNeeded()
    await page.waitForTimeout(200)
    await page.screenshot({ path: `${SALIDA}\\banda-390.png` })

    // Acciones con el formulario expandido.
    await page.getByRole('button', { name: /Asociar sensor/ }).click()
    await page.getByRole('button', { name: 'Crear y asociar' }).scrollIntoViewIfNeeded()
    await page.waitForTimeout(200)
    await page.screenshot({ path: `${SALIDA}\\acciones-390.png` })
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
