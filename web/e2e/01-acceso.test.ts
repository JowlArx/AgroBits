// T-26 — Spec 1/5: cuentas y acceso (R-01 AC3, R-03 AC1).
// R-01 AC1/AC2 (registro real contra GoTrue con confirmación híbrida de
// email) exigen un buzón real de correo y cuota de signup; se verificaron en
// el E2E de T-22 (registro, duplicado ofuscado y política de contraseñas) y
// quedan citados en el informe M4. Este spec cubre lo automatizable: la
// política de contraseñas (validación local, sin red) y el gate de sesión.

import { test, expect } from '@playwright/test'
import { cuentaA, cerrarSesion, iniciarSesion, sello } from './entorno'

test('R-01 AC3: la contraseña corta se rechaza con el motivo en pantalla', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('cambiar-modo').click()
  await expect(page.getByRole('heading', { name: 'Crear cuenta' })).toBeVisible()

  await page.getByTestId('email').fill(`prueba-${sello()}@agrobits.test`)
  await page.getByTestId('clave').fill('corta') // < 6: la validación es local
  await page.getByTestId('enviar-acceso').click()

  await expect(page.getByTestId('error-acceso')).toContainText(
    'La contraseña debe tener al menos 6 caracteres',
  )
  await expect(page.getByTestId('pantalla-acceso')).toBeVisible() // no entra
})

test('R-03 AC1: la sesión persiste al recargar y cerrar exige acceso de nuevo', async ({ page }) => {
  await iniciarSesion(page, cuentaA)

  await page.reload()
  await expect(page.getByTestId('sesion-usuario')).toContainText(cuentaA.correo) // se mantiene

  await cerrarSesion(page)
  await expect(page.getByTestId('nav-cultivos')).toHaveCount(0) // contenido protegido oculto
  await page.reload()
  await expect(page.getByTestId('pantalla-acceso')).toBeVisible() // sigue exigiendo acceso

  await iniciarSesion(page, cuentaA) // reacceso con la misma cuenta
})
