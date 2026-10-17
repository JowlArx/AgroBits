// T-26 — Spec 2/5: cultivos y umbrales (R-04 AC1–AC3, R-05 AC1–AC2,
// R-11 AC1–AC2). Cada test se limpia a sí mismo; los nombres llevan sello
// único para que ejecuciones previas no interfieran.

import { test, expect } from '@playwright/test'
import { cuentaA, crearCultivo, cultivoEn, eliminarCultivo, iniciarSesion, sello } from './entorno'

test.beforeEach(async ({ page }) => {
  await iniciarSesion(page, cuentaA)
})

test('R-11 AC1/AC2 + R-05 AC1 + R-04 AC1/AC3: crear con precarga del catálogo, aviso y eliminar', async ({ page }) => {
  const nombre = `Huerto R04 ${sello()}`

  await page.getByTestId('nav-cultivos').click()
  await page.getByRole('button', { name: 'Nuevo cultivo' }).click()

  // R-11 AC1: umbrales del catálogo precargados (Tomate: temperatura 15–28)
  await expect(page.getByTestId('min-temperatura')).toHaveValue('15')
  await expect(page.getByTestId('max-temperatura')).toHaveValue('28')
  // R-11 AC2: el aviso de referencia orientativa está en pantalla
  await expect(page.getByTestId('aviso-catalogo')).toContainText('referencia orientativa')

  await page.locator('input[name="nombre"]').fill(nombre)
  await page.locator('select[name="tipoCultivo"]').selectOption('Tomate')
  await page.getByRole('button', { name: 'Guardar' }).click()

  // R-04 AC1: aparece en la lista; R-04 AC2: persiste tras recargar
  await expect(cultivoEn(page, nombre)).toBeVisible()
  await page.reload()
  await expect(cultivoEn(page, nombre)).toBeVisible()

  // R-04 AC3: eliminar lo saca de la lista y también tras recargar
  await eliminarCultivo(page, nombre)
  await page.reload()
  await expect(cultivoEn(page, nombre)).toHaveCount(0)
})

test('R-04 AC2 + R-12 AC1: sobreescribir un umbral lo guarda y persiste', async ({ page }) => {
  const nombre = `Huerto R12 ${sello()}`
  await crearCultivo(page, nombre)

  await cultivoEn(page, nombre).getByRole('button', { name: 'Editar' }).click()
  await page.getByTestId('min-temperatura').fill('5')
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(cultivoEn(page, nombre)).toBeVisible()

  // La reapertura del formulario muestra el valor guardado (persistencia real)
  await page.reload()
  await cultivoEn(page, nombre).getByRole('button', { name: 'Editar' }).click()
  await expect(page.getByTestId('min-temperatura')).toHaveValue('5')

  await eliminarCultivo(page, nombre)
})

test('R-05 AC2: un umbral inválido (mín ≥ máx) se rechaza informando del error', async ({ page }) => {
  const nombre = `Huerto inválido ${sello()}`
  await page.getByTestId('nav-cultivos').click()
  await page.getByRole('button', { name: 'Nuevo cultivo' }).click()
  await page.locator('input[name="nombre"]').fill(nombre)
  await page.getByTestId('min-temperatura').fill('30')
  await page.getByTestId('max-temperatura').fill('28')
  await page.getByRole('button', { name: 'Guardar' }).click()

  await expect(page.getByTestId('errores')).toContainText('El umbral mínimo debe ser menor que el máximo')
  await expect(page.getByTestId('aviso-catalogo')).toBeVisible() // sigue en el formulario

  // Cancelar: el cultivo no llegó a guardarse
  await page.getByRole('button', { name: 'Cancelar' }).click()
  await expect(cultivoEn(page, nombre)).toHaveCount(0)
})
