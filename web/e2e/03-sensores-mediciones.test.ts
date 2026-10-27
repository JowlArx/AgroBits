// T-26 — Spec 3/5: sensores y mediciones (R-06 AC1–AC2, R-08 AC1,
// R-09 AC1–AC2, R-10 AC2). La primera lectura es AUTOMÁTICA (generador
// T-24 con tick inmediato): el spec no pulsa ningún botón hasta verla,
// lo que re-verifica en vivo que el generador escribe contra la API.

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

test('sensor dispara lectura automática con formato R-08, unidades R-09 y persistencia', async ({ page }) => {
  const nombre = `Huerto R09 ${sello()}`
  await iniciarSesion(page, cuentaA)
  await crearCultivo(page, nombre)
  await abrirDetalle(page, nombre)

  // R-09 AC2: sin sensores no se inventa nada
  await expect(page.getByTestId('sin-sensores')).toBeVisible()
  await expect(page.getByTestId('valor-temperatura')).toContainText('sin datos')
  await expect(page.getByTestId('hora-temperatura')).toContainText('—')

  // R-06 AC1: crear el sensor lo lista; R-10 AC2: la API almacena la
  // primera lectura automáticamente (mismo formato que el hardware futuro)
  await crearSensor(page, `Sensor ${sello()}`)
  await esperarLectura(page, 'temperatura')

  // R-09 AC1: los 4 tipos con valor, unidad y hora
  await expect(page.getByTestId('resumen-medicion')).toContainText('4 de 4')
  await expect(page.getByTestId('valor-temperatura')).toContainText('°C')
  await expect(page.getByTestId('valor-humedad_suelo')).toContainText('% vol')
  await expect(page.getByTestId('valor-humedad_ambiental')).toContainText('% HR')
  await expect(page.getByTestId('valor-luminosidad')).toContainText('lux')
  await expect(page.getByTestId('hora-temperatura')).not.toContainText('—')

  // R-08 AC1: la medición persiste y se vuelve a servir tras recargar.
  // Sin router: tras recargar la SPA vuelve a la lista; se reabre el detalle.
  await page.reload()
  await expect(page.getByTestId('sesion-usuario')).toContainText(cuentaA.correo.split('@')[0]) // D32: nombre visible = parte local del email
  await abrirDetalle(page, nombre)
  await expect(page.getByTestId('resumen-medicion')).toContainText('4 de 4')
  await expect(page.getByTestId('valor-temperatura')).not.toContainText('sin datos')

  // El botón manual (mismo flujo de escritura) produce OTRA lectura
  const tablaAntes = await page.getByTestId('tabla-mediciones').textContent()
  await page.getByTestId('simular-lectura').click()
  await expect(page.getByTestId('tabla-mediciones')).not.toHaveText(tablaAntes ?? '')

  await eliminarCultivo(page, nombre)
})

test('D51: «Ver mediciones» despliega el detalle bajo su tarjeta con la última lectura de cada tipo', async ({ page }) => {
  const nombre = `Huerto D51 ${sello()}`
  const nombreSensor = `Sensor D51 ${sello()}`
  await iniciarSesion(page, cuentaA)

  try {
    await crearCultivo(page, nombre)
    await abrirDetalle(page, nombre)
    await crearSensor(page, nombreSensor)
    await esperarLectura(page, 'temperatura')

    await page.getByTestId('nav-sensores').click()
    const tarjeta = page.getByTestId('tarjeta-sensor').filter({ hasText: nombreSensor })
    await tarjeta.getByRole('button', { name: 'Ver mediciones' }).click()

    // El detalle vive dentro de la tarjeta de ESE sensor, no al final de la lista.
    const detalle = tarjeta.getByTestId('detalle-sensor')
    await expect(detalle).toBeVisible()
    await expect(tarjeta.getByRole('button', { name: 'Ocultar mediciones' })).toBeVisible()

    // La última lectura de cada tipo, en texto plano (sin tabla de mediciones).
    const unidadPorTipo: Record<string, string> = {
      temperatura: '°C',
      humedad_suelo: '% vol',
      humedad_ambiental: '% HR',
      luminosidad: 'lux',
    }
    for (const [tipo, unidad] of Object.entries(unidadPorTipo)) {
      await expect(detalle.getByTestId(`ultima-lectura-${tipo}`)).toContainText(unidad)
    }
    await expect(detalle.getByRole('table')).toHaveCount(0)

    // Ocultar cierra el detalle y devuelve el botón a «Ver mediciones».
    await tarjeta.getByRole('button', { name: 'Ocultar mediciones' }).click()
    await expect(detalle).toHaveCount(0)
    await expect(tarjeta.getByRole('button', { name: 'Ver mediciones' })).toBeVisible()
  } finally {
    // Limpieza: sensor (con sus lecturas) y cultivo, aunque el test falle.
    await page.getByTestId('nav-sensores').click()
    const tarjetaLimpieza = page.getByTestId('tarjeta-sensor').filter({ hasText: nombreSensor })
    if ((await tarjetaLimpieza.count()) > 0) {
      await tarjetaLimpieza.getByRole('button', { name: 'Eliminar' }).click()
      await tarjetaLimpieza.getByRole('button', { name: 'Sí', exact: true }).click()
      await expect(tarjetaLimpieza).toHaveCount(0, { timeout: 30_000 })
    }
    await eliminarCultivo(page, nombre)
  }
})

test.describe('en móvil (390×844)', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('la matriz de mediciones no desborda la página en 390 px', async ({ page }) => {
    const nombre = `Huerto movil ${sello()}`
    const nombreSensor = `Sensor movil ${sello()}`
    await iniciarSesion(page, cuentaA)

    try {
      await crearCultivo(page, nombre)
      await abrirDetalle(page, nombre)
      await crearSensor(page, nombreSensor)
      await esperarLectura(page, 'temperatura')

      await expect(page.getByTestId('tabla-mediciones')).toBeVisible()
      await expect(page.getByTestId('estado-dli_ayer')).toBeVisible()

      const desborda = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      )
      expect(desborda).toBe(false)
    } finally {
      await page.getByTestId('nav-sensores').click()
      const tarjetaLimpieza = page.getByTestId('tarjeta-sensor').filter({ hasText: nombreSensor })
      if ((await tarjetaLimpieza.count()) > 0) {
        await tarjetaLimpieza.getByRole('button', { name: 'Eliminar' }).click()
        await tarjetaLimpieza.getByRole('button', { name: 'Sí', exact: true }).click()
        await expect(tarjetaLimpieza).toHaveCount(0, { timeout: 30_000 })
      }
      await eliminarCultivo(page, nombre)
    }
  })
})
