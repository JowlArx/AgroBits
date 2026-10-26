// D40/D51 — El «Historial de mediciones» es un bloque de la sección Sensores,
// debajo de la lista de sensores y siempre visible (no es una pestaña). «Ver
// historial» de un cultivo abre Sensores con el cultivo preseleccionado.

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

test('D51: el historial va debajo de la lista de sensores, sin pestañas ni panel en la URL', async ({ page }) => {
  await iniciarSesion(page, cuentaA)

  await page.getByTestId('nav-sensores').click()
  await expect(page).toHaveURL(/[?&]vista=sensores/)
  await expect(page).not.toHaveURL(/panel=/)
  await expect(page.getByTestId('pestana-historial')).toHaveCount(0)
  await expect(page.locator('.titulo-topbar h2')).toHaveText('Sensores')

  const seccion = page.getByTestId('seccion-historial')
  await expect(seccion.getByRole('heading', { name: 'Historial de mediciones' })).toBeVisible()

  // El historial empieza por debajo del bloque de sensores.
  const panel = await page.getByTestId('panel-sensores').boundingBox()
  const historial = await seccion.boundingBox()
  expect(panel).not.toBeNull()
  expect(historial).not.toBeNull()
  expect(historial!.y).toBeGreaterThanOrEqual(panel!.y + panel!.height)
})

test('D51: «Ver historial» de un cultivo lleva a Sensores con ese cultivo preseleccionado', async ({ page }) => {
  const nombre = `Huerto D51 ${sello()}`
  await iniciarSesion(page, cuentaA)
  await crearCultivo(page, nombre)
  await abrirDetalle(page, nombre)

  await page.getByTestId('ver-historial').click()
  await expect(page).toHaveURL(/[?&]vista=sensores/)
  await expect(page).toHaveURL(/[?&]cultivo=/)
  await expect(page).not.toHaveURL(/panel=/)

  const seccion = page.getByTestId('seccion-historial')
  await expect(seccion).toBeInViewport()

  // El cultivo queda preseleccionado en el filtro del historial.
  const filtroCultivo = seccion.locator('select').first()
  await expect(filtroCultivo).not.toHaveValue('')

  await eliminarCultivo(page, nombre)
})

test('D51: el historial dibuja las barras y el tooltip da media, mín y máx de la única serie bajo el cursor', async ({ page }) => {
  const nombre = `Huerto H51 ${sello()}`
  const nombreSensor = `Sensor H51 ${sello()}`
  await iniciarSesion(page, cuentaA)

  try {
    await crearCultivo(page, nombre)
    await abrirDetalle(page, nombre)

    // El sensor escribe su primera lectura contra la API (R-08): hay datos que
    // el historial debe representar.
    await crearSensor(page, nombreSensor)
    await esperarLectura(page, 'temperatura')

    await page.getByTestId('nav-sensores').click()
    await expect(page.getByTestId('seccion-historial')).toBeVisible()

    // Una barra por serie y día (las lecturas recientes se agregan en cliente
    // hasta que el job de las 03:15 consolida el día).
    const barras = page.locator('.recharts-bar-rectangle')
    await expect(barras.first()).toBeVisible({ timeout: 30_000 })
    expect(await barras.count()).toBeGreaterThan(0)

    // Con datos, la exportación a Excel está habilitada.
    await expect(page.getByRole('button', { name: 'Exportar a Excel' })).toBeEnabled()

    // D51: el historial va debajo de la lista de sensores; sin este scroll las
    // barras quedan fuera del viewport y el ratón no llega a ellas.
    await page.getByTestId('seccion-historial').scrollIntoViewIfNeeded()

    // El tooltip de la barra da la media y el rango (mín/máx) de esa serie.
    // Se apunta a la barra más alta con el ratón (hover por coordenadas: las
    // barras pequeñas quedan bajo el eje y el eje intercepta el puntero). Se
    // espera a que el gráfico tenga barras con tamaño real (el contenedor
    // responsive mide en el primer ciclo) y se reintenta porque el gráfico
    // puede redibujarse entre la medida y el movimiento del puntero.
    const medirBarras = () =>
      page.locator('.recharts-bar-rectangle path').evaluateAll((nodos) =>
        nodos.map((n) => {
          const r = n.getBoundingClientRect()
          return { x: r.x + r.width / 2, y: r.y + r.height / 2, alto: r.height }
        }),
      )
    await expect
      .poll(async () => Math.max(0, ...(await medirBarras()).map((c) => c.alto)), {
        timeout: 30_000,
      })
      .toBeGreaterThan(1)

    const tooltip = page.locator('.recharts-tooltip-wrapper')
    for (let intento = 0; intento < 3; intento++) {
      const masAlta = (await medirBarras()).sort((a, b) => b.alto - a.alto)[0]
      expect(masAlta).toBeTruthy()
      await page.mouse.move(masAlta.x, masAlta.y)
      await page.waitForTimeout(250)
      if ((await tooltip.textContent())?.includes('mín')) break
    }
    await expect(tooltip).toContainText('media')
    await expect(tooltip).toContainText('mín')
    await expect(tooltip).toContainText('máx')

    // El tooltip describe SOLO la barra bajo el cursor, no todas las series
    // del día: una única línea de datos (una sola «media»).
    const textoTooltip = (await tooltip.textContent()) ?? ''
    expect(textoTooltip.match(/media/g) ?? []).toHaveLength(1)
    // Y el título con la fecha sigue presente.
    expect(textoTooltip).toMatch(/\d{4}-\d{2}-\d{2}/)

    // D51: el tooltip no se desliza entre barras (sin transición de transform)
    // y su contenido aparece con un fade.
    expect(await tooltip.evaluate((el) => getComputedStyle(el).transition)).not.toContain('transform')
    expect(await page.locator('.tooltip-historial').evaluate((el) => getComputedStyle(el).animationName)).toBe(
      'aparecer-tooltip',
    )

    // Fuera de cualquier barra no se informa de nada: el tooltip existe solo
    // para la barra bajo el cursor.
    const area = await page.locator('.recharts-wrapper').boundingBox()
    await page.mouse.move((area?.x ?? 0) + 8, (area?.y ?? 0) + 8)
    await page.waitForTimeout(300)
    await expect(tooltip).toBeHidden()
  } finally {
    // Limpieza: sensor (con sus lecturas) y cultivo, aunque el test falle.
    await page.getByTestId('nav-sensores').click()
    const tarjeta = page.getByTestId('tarjeta-sensor').filter({ hasText: nombreSensor })
    if ((await tarjeta.count()) > 0) {
      await tarjeta.getByRole('button', { name: 'Eliminar' }).click()
      await tarjeta.getByRole('button', { name: 'Sí', exact: true }).click()
      await expect(tarjeta).toHaveCount(0, { timeout: 30_000 })
    }
    await page.getByTestId('nav-cultivos').click()
    const ficha = page.locator('li.tarjeta-cultivo').filter({ hasText: nombre })
    if ((await ficha.count()) > 0) {
      await ficha.getByRole('button', { name: 'Eliminar' }).click()
      await ficha.getByRole('button', { name: 'Sí', exact: true }).click()
      await expect(ficha).toHaveCount(0, { timeout: 90_000 })
    }
  }
})

test.describe('en móvil (390×844)', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('D51: el historial cabe en 390 px sin desbordar la página', async ({ page }) => {
    await iniciarSesion(page, cuentaA)

    await page.getByTestId('nav-sensores').click()
    await expect(page.getByTestId('seccion-historial')).toBeVisible()

    // La página no genera scroll horizontal.
    const desborda = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    )
    expect(desborda).toBe(false)
  })
})
