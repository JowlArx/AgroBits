// T-26 — Spec 5/5: aislamiento entre dos cuentas (R-02 AC1–AC2, R-14 AC1).
// Dos contextos de navegador independientes (cookies y storage separados),
// uno por cuenta. La garantía profunda de escritura cruzada está en la
// suite SQL de T-21 (`supabase/tests/…`, RLS con identidades simuladas);
// aquí se verifica el resultado observable en la aplicación.

import { test, expect } from '@playwright/test'
import {
  abrirDetalle,
  cuentaA,
  cuentaB,
  crearCultivo,
  crearSensor,
  cultivoEn,
  eliminarCultivo,
  esperarLectura,
  iniciarSesion,
  sello,
} from './entorno'

test('R-02 AC1/AC2 + R-14 AC1: la cuenta B no ve ni toca los datos de la cuenta A', async ({ browser }) => {
  const nombreA = `Privado A ${sello()}`
  const nombreB = `Privado B ${sello()}`

  // — Cuenta A: cultivo + sensor + lectura (genera una alerta activa) —
  const contextoA = await browser.newContext()
  const paginaA = await contextoA.newPage()
  await iniciarSesion(paginaA, cuentaA)
  await crearCultivo(paginaA, nombreA, ['999', '2000'])
  await abrirDetalle(paginaA, nombreA)
  await crearSensor(paginaA, `Sensor A ${sello()}`)
  await esperarLectura(paginaA, 'temperatura')

  // — Cuenta B: sesión propia en un navegador limpio —
  const contextoB = await browser.newContext()
  const paginaB = await contextoB.newPage()
  await iniciarSesion(paginaB, cuentaB)

  // R-02 AC2: los datos de A no se devuelven a B (cultivos y alertas)
  await expect(cultivoEn(paginaB, nombreA)).toHaveCount(0)
  await paginaB.getByTestId('nav-alertas').click()
  await expect(paginaB.locator('li[data-testid^="alerta-"]').filter({ hasText: nombreA })).toHaveCount(0) // R-14 AC1

  // B escribe lo suyo y A no lo ve (aislamiento en ambos sentidos)
  await crearCultivo(paginaB, nombreB)
  await paginaA.reload()
  await expect(cultivoEn(paginaA, nombreB)).toHaveCount(0)

  // Limpieza de ambos lados
  await eliminarCultivo(paginaB, nombreB)
  await eliminarCultivo(paginaA, nombreA)
  await contextoB.close()
  await contextoA.close()
})
