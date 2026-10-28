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
  // Dos sensores con espera de lectura (hasta 60 s c/u) + limpieza: supera los 120 s por defecto.
  test.setTimeout(300_000)
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

    // Acciones en móvil: botón «Generar lectura simulada» y aviso bajo él.
    await page.getByText('Las lecturas simuladas se guardan').scrollIntoViewIfNeeded()
    await page.waitForTimeout(200)
    await page.screenshot({ path: `${SALIDA}\\acciones-simular-390.png` })

    // Segundo sensor: aparece el selector de sensor en el gráfico.
    // Con un sensor el formulario va plegado: hay que abrirlo antes de rellenarlo.
    await abrirFormularioSensor(page)
    await crearSensor(page, 'Sensor captura 2 ' + sello())
    await esperarLectura(page, 'temperatura')
    await page.getByTestId('grafico-cultivo').scrollIntoViewIfNeeded()
    await page.waitForTimeout(200)
    await page.screenshot({ path: `${SALIDA}\\selector-390.png` })
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.waitForTimeout(300)
    await page.getByTestId('grafico-cultivo').scrollIntoViewIfNeeded()
    await page.waitForTimeout(200)
    await page.screenshot({ path: `${SALIDA}\\selector-1440.png` })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.waitForTimeout(300)

    // Acciones con el formulario expandido.
    await abrirFormularioSensor(page)
    await page.getByRole('button', { name: 'Crear y asociar' }).scrollIntoViewIfNeeded()
    await page.waitForTimeout(200)
    await page.screenshot({ path: `${SALIDA}\\acciones-390.png` })
  } finally {
    await eliminarSensoresCaptura(page)
    await eliminarCultivo(page, nombre)
  }
})

test('captura del botón de ojo en el acceso (1440)', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/app.html')
  await expect(page.getByTestId('pantalla-acceso')).toBeVisible()
  await page.locator('.campo-clave').first().screenshot({ path: `${SALIDA}\\ojo-1440.png` })
  await page.getByRole('button', { name: 'Mostrar contraseña' }).first().click()
  await page.locator('.campo-clave').first().screenshot({ path: `${SALIDA}\\ojo-pulsado-1440.png` })
})

test('captura de «Última lectura por tipo» (1440)', async ({ page }) => {
  test.setTimeout(300_000)
  const nombre = `Huerto barras ${sello()}`
  const nombreSensor = `Sensor captura barras ${sello()}`

  await iniciarSesion(page, cuentaA)
  try {
    await crearCultivo(page, nombre)
    await page.setViewportSize({ width: 1440, height: 900 })
    await abrirDetalle(page, nombre)
    await crearSensor(page, nombreSensor)
    await esperarLectura(page, 'temperatura')
    // Vuelve a la vista principal (tablero) y captura las barras.
    await page.goto('/app.html')
    await expect(page.locator('.barras-tipo')).toBeVisible({ timeout: 30_000 })
    await page.locator('.barras-tipo').screenshot({ path: `${SALIDA}\\barras-1440.png` })
  } finally {
    await eliminarSensoresCaptura(page)
    await eliminarCultivo(page, nombre)
  }
})

test('captura de la vista de alertas (1440 y 390)', async ({ page }) => {
  await iniciarSesion(page, cuentaA)
  await page.getByTestId('nav-alertas').click()
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${SALIDA}\\alertas-1440.png`, fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${SALIDA}\\alertas-390.png`, fullPage: true })
})

// Despliega el formulario "＋ Asociar sensor" solo si está plegado (no lo pliega).
async function abrirFormularioSensor(page: import('@playwright/test').Page): Promise<void> {
  const alterna = page.getByRole('button', { name: /Asociar sensor/ })
  if ((await alterna.getAttribute('aria-expanded')) !== 'true') await alterna.click()
}

// Borra TODOS los sensores cuyo nombre empieza por 'Sensor captura' (incluye el segundo).
async function eliminarSensoresCaptura(page: import('@playwright/test').Page): Promise<void> {
  const nav = page.getByTestId('nav-sensores')
  if ((await nav.count()) === 0) return
  await nav.click()
  const tarjetas = page.getByTestId('tarjeta-sensor').filter({ hasText: 'Sensor captura' })
  const total = await tarjetas.count()
  for (let i = 0; i < total; i++) {
    const tarjeta = tarjetas.first()
    await tarjeta.getByRole('button', { name: 'Eliminar' }).click()
    await tarjeta.getByRole('button', { name: 'Sí', exact: true }).click()
    await expect(tarjetas).toHaveCount(total - i - 1, { timeout: 30_000 })
  }
}
