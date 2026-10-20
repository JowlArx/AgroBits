// D34 — Spec 6/6: la navegación del panel en MÓVIL y la desasociación de
// sensores. Es el único spec con viewport de móvil (390×844, el breakpoint de
// 48rem): en ese ancho la navegación baja a una barra inferior de iconos con
// el icono de perfil a la derecha, y el sensor se puede quitar del cultivo
// sin eliminarlo de la cuenta.

import { test, expect } from '@playwright/test'
import {
  abrirDetalle,
  cuentaA,
  crearCultivo,
  crearSensor,
  eliminarCultivo,
  iniciarSesion,
  sello,
} from './entorno'

test.use({ viewport: { width: 390, height: 844 } })

test('D34: en móvil la navegación va en la barra inferior, con el perfil a la derecha', async ({ page }) => {
  await iniciarSesion(page, cuentaA)

  const barra = page.locator('.barra-inferior')
  await expect(barra).toBeVisible()

  // Los iconos de las secciones viven en la barra inferior…
  await expect(barra.locator('[data-testid="nav-cultivos"]')).toBeVisible()
  await expect(barra.locator('[data-testid="nav-alertas"]')).toBeVisible()
  await expect(barra.locator('[data-testid="nav-sensores"]')).toBeVisible()
  // …y no quedan duplicados en la cabecera.
  await expect(page.locator('.fila-nav [data-testid="nav-cultivos"]')).toHaveCount(0)

  // El perfil está a la derecha del todo y «sin nombre y sin nada»: solo el icono.
  const perfil = barra.locator('[data-testid="menu-usuario"]')
  await expect(perfil).toBeVisible()
  await expect(perfil).toHaveText('')
  await expect(perfil).toHaveAttribute('aria-label', 'Mi cuenta')

  // Abre el menú de la cuenta (Mi cuenta / Cerrar sesión).
  await perfil.click()
  await expect(page.getByTestId('nav-cuenta')).toBeVisible()
  await expect(page.getByTestId('cerrar-sesion')).toBeVisible()
})

test('D34: se puede desasociar un sensor del cultivo', async ({ page }) => {
  const nombre = `Huerto D34 ${sello()}`
  const nombreSensor = `Sensor D34 ${sello()}`
  await iniciarSesion(page, cuentaA)
  await crearCultivo(page, nombre)
  await abrirDetalle(page, nombre)
  await crearSensor(page, nombreSensor)

  // Desasociar: el sensor sale de la lista de sensores del cultivo…
  await page.getByRole('button', { name: /Desasociar/ }).click()
  await expect(page.getByTestId('sin-sensores')).toBeVisible()

  // …pero sigue en la cuenta (vista Sensores) hasta que se elimine explícitamente.
  await page.getByTestId('nav-sensores').click()
  const tarjeta = page.getByTestId('tarjeta-sensor').filter({ hasText: nombreSensor })
  await expect(tarjeta).toHaveCount(1)

  // Eliminar el sensor lo borra de la cuenta (el spec se limpia solo).
  await tarjeta.getByRole('button', { name: /^Eliminar/ }).click()
  await expect(tarjeta).toHaveCount(0)

  await eliminarCultivo(page, nombre)
})
