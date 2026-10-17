// T-26 — Spec 4/5: alertas (R-12 AC1, R-13 AC1–AC4, R-14 AC2). La
// evaluación vive en la BD (trigger T-25): el spec verifica el ciclo
// completo contra datos reales — creación por la primera lectura
// automática, no duplicar, resolución al editar el umbral y silencio
// cuando todo está en rango.

import { test, expect, type Page } from '@playwright/test'
import {
  abrirDetalle,
  cuentaA,
  crearCultivo,
  crearSensor,
  cultivoEn,
  eliminarCultivo,
  esperarLectura,
  iniciarSesion,
  sello,
} from './entorno'

/** Fila de la lista de alertas que pertenece a un cultivo concreto. */
function alertasDe(page: Page, nombreCultivo: string) {
  return page.locator('li[data-testid^="alerta-"]').filter({ hasText: nombreCultivo })
}

test('R-13 AC1/AC2/AC3 + R-12 AC1 + R-14 AC2: ciclo completo de una alerta', async ({ page }) => {
  const nombre = `Invernadero ${sello()}`
  await iniciarSesion(page, cuentaA)
  // Temperatura 999–2000 °C: el simulador (5–40 °C) queda SIEMPRE fuera.
  await crearCultivo(page, nombre, ['999', '2000'])
  await abrirDetalle(page, nombre)
  await crearSensor(page, `Sensor ${sello()}`)
  await esperarLectura(page, 'temperatura')

  // AC1: la lectura automática crea UNA alerta con tipo, valor leído y hora
  await page.getByTestId('nav-alertas').click()
  const fila = alertasDe(page, nombre)
  await expect(fila).toHaveCount(1)
  await expect(fila).toContainText('Temperatura') // tipo (detalle R-14 AC2)
  await expect(fila).toContainText('Activa')
  await expect(fila.getByTestId('alerta-cultivo')).toHaveText(nombre)
  await expect(fila.getByTestId('alerta-valor')).toContainText('°C')
  await expect(fila.getByTestId('alerta-hora')).not.toBeEmpty()

  // AC2: una segunda lectura fuera de rango NO duplica la alerta activa
  await abrirDetalle(page, nombre)
  await page.getByTestId('simular-lectura').click()
  await page.getByTestId('nav-alertas').click()
  await expect(alertasDe(page, nombre)).toHaveCount(1)

  // R-12 AC1 + AC3: editar el umbral a rango abierto y la siguiente lectura
  // (la del botón manual) resuelve la alerta con su hora
  await page.getByTestId('nav-cultivos').click()
  await page.locator('li.tarjeta-cultivo').filter({ hasText: nombre }).getByRole('button', { name: 'Editar' }).click()
  await page.getByTestId('min-temperatura').fill('0')
  await page.getByTestId('max-temperatura').fill('100')
  await page.getByRole('button', { name: 'Guardar' }).click()
  // El guardado es asíncrono (PATCH del cultivo + upsert de umbrales); la app
  // sólo vuelve a la lista cuando `onGuardado` confirma que terminó. Esperar
  // la lista evita que la lectura siguiente se cruce con los umbrales viejos.
  await expect(cultivoEn(page, nombre)).toBeVisible()

  await abrirDetalle(page, nombre)
  await page.getByTestId('simular-lectura').click()
  await page.getByTestId('nav-alertas').click()
  await expect(fila).toContainText('Resuelta')
  await expect(fila.getByTestId('alerta-resuelta')).toBeVisible()

  // Limpieza: al eliminar el cultivo, sus alertas caen en cascada
  await eliminarCultivo(page, nombre)
  await expect(alertasDe(page, nombre)).toHaveCount(0)
})

test('R-13 AC4: una lectura dentro del rango sin alerta previa no crea nada', async ({ page }) => {
  const nombre = `Tranquilo ${sello()}`
  await iniciarSesion(page, cuentaA)
  await crearCultivo(page, nombre) // umbrales abiertos: todo en rango
  await abrirDetalle(page, nombre)
  await crearSensor(page, `Sensor ${sello()}`)
  await esperarLectura(page, 'temperatura')

  await page.getByTestId('nav-alertas').click()
  await expect(alertasDe(page, nombre)).toHaveCount(0)

  await eliminarCultivo(page, nombre)
})
