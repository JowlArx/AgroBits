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
  await expect(page.getByTestId('sesion-usuario')).toContainText(cuentaA.correo)
  await abrirDetalle(page, nombre)
  await expect(page.getByTestId('resumen-medicion')).toContainText('4 de 4')
  await expect(page.getByTestId('valor-temperatura')).not.toContainText('sin datos')

  // El botón manual (mismo flujo de escritura) produce OTRA lectura
  const tablaAntes = await page.getByTestId('tabla-mediciones').textContent()
  await page.getByTestId('simular-lectura').click()
  await expect(page.getByTestId('tabla-mediciones')).not.toHaveText(tablaAntes ?? '')

  await eliminarCultivo(page, nombre)
})
