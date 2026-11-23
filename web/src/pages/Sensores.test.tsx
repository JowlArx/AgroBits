import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import Sensores from './Sensores'
import { reiniciarCultivos } from '../data/storeCultivos'
import { cargarSensores, obtenerSensor, obtenerSensores, reiniciarSensores } from '../data/storeSensores'
import { reiniciarMediciones } from '../data/medicionesSimuladas'
import { iniciarSesion } from '../data/storeSesion'
import { datosFalsosActual } from '../tests/soporte/configurarTests'

// Sensor real: sin simulación desde la UI (botón deshabilitado + aviso).
// Sensor simulado: el botón de lectura simulada está habilitado y no hay aviso.
beforeEach(async () => {
  await iniciarSesion('pruebas@agrobits.test', 'secreta')
  reiniciarCultivos()
  reiniciarSensores()
  reiniciarMediciones()
})

async function sensorConOrigen(origen: 'real' | 'simulado'): Promise<void> {
  const datos = datosFalsosActual()
  const creado = await datos.crearSensor('Sensor de prueba')
  if (!creado.ok) throw new Error('No se pudo crear el sensor de prueba')
  if (origen === 'real') datos.marcarOrigen(creado.valor.id, 'real')
  await cargarSensores()
  render(<Sensores />)
  fireEvent.click(await screen.findByRole('button', { name: 'Ver mediciones' }))
}

describe('vista de sensores: simulación según el origen del sensor', () => {
  it('sensor real: el botón de lectura simulada está deshabilitado y se ve el aviso', async () => {
    await sensorConOrigen('real')

    const boton = await screen.findByTestId('simular-lectura-sensor')
    expect((boton as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByTestId('aviso-sensor-real').textContent).toBe('Sensor real: sin simulación.')
  })

  it('sensor simulado: el botón de lectura simulada está habilitado y no hay aviso', async () => {
    await sensorConOrigen('simulado')

    const boton = await screen.findByTestId('simular-lectura-sensor')
    expect((boton as HTMLButtonElement).disabled).toBe(false)
    expect(screen.queryByTestId('aviso-sensor-real')).toBeNull()
  })
})

describe('vista de sensores: alternar origen real/simulado con confirmación', () => {
  it('marcar como real: la store y la UI pasan a Real, el simulador queda desactivado; al revertir vuelve a Simulado', async () => {
    await sensorConOrigen('simulado')
    const id = obtenerSensores()[0].id
    expect(screen.getByTestId('origen-sensor').textContent).toBe('Simulado')

    fireEvent.click(screen.getByTestId('alternar-origen-sensor'))
    fireEvent.click(await screen.findByTestId('alternar-origen-sensor-confirmar'))

    await waitFor(() => expect(obtenerSensor(id)?.origen).toBe('real'))
    await waitFor(() => expect(screen.getByTestId('origen-sensor').textContent).toBe('Real'))
    expect((screen.getByTestId('simular-lectura-sensor') as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByTestId('alternar-origen-sensor').textContent).toBe('Marcar como simulado')

    fireEvent.click(screen.getByTestId('alternar-origen-sensor'))
    fireEvent.click(await screen.findByTestId('alternar-origen-sensor-confirmar'))

    await waitFor(() => expect(obtenerSensor(id)?.origen).toBe('simulado'))
    await waitFor(() => expect(screen.getByTestId('origen-sensor').textContent).toBe('Simulado'))
    expect((screen.getByTestId('simular-lectura-sensor') as HTMLButtonElement).disabled).toBe(false)
  })

  it('cancelar la confirmación no cambia el origen', async () => {
    await sensorConOrigen('simulado')
    const id = obtenerSensores()[0].id

    fireEvent.click(screen.getByTestId('alternar-origen-sensor'))
    fireEvent.click(await screen.findByTestId('alternar-origen-sensor-cancelar'))

    expect(obtenerSensor(id)?.origen).toBe('simulado')
    expect(screen.getByTestId('origen-sensor').textContent).toBe('Simulado')
  })
})

describe('vista de sensores: aviso de sin señal (solo sensores reales)', () => {
  async function renderSensor(origen: 'real' | 'simulado', ultimaVezVisto: string | null): Promise<void> {
    const datos = datosFalsosActual()
    const creado = await datos.crearSensor('Sensor de campo')
    if (!creado.ok) throw new Error('No se pudo crear el sensor de prueba')
    datos.marcarOrigen(creado.valor.id, origen)
    datos.marcarUltimaVezVisto(creado.valor.id, ultimaVezVisto)
    await cargarSensores()
    render(<Sensores />)
    await screen.findByTestId('tarjeta-sensor')
  }

  it('real con última lectura hace 5 min: badge «Activo» y sin aviso de sin señal', async () => {
    await renderSensor('real', new Date(Date.now() - 5 * 60_000).toISOString())
    expect(screen.getByTestId('activo-sensor').textContent).toBe('Activo')
    expect(screen.queryByTestId('sin-senal-sensor')).toBeNull()
  })

  it('real con última lectura hace 30 min: «Sin señal» y tiempo transcurrido', async () => {
    await renderSensor('real', new Date(Date.now() - 30 * 60_000).toISOString())
    expect(screen.getByTestId('sin-senal-sensor').textContent).toBe('Sin señal')
    expect(screen.getByTestId('texto-sin-senal').textContent).toBe('Última lectura hace 30 min')
  })

  it('simulado con última lectura hace 30 min: ninguna etiqueta de estado', async () => {
    await renderSensor('simulado', new Date(Date.now() - 30 * 60_000).toISOString())
    expect(screen.queryByTestId('activo-sensor')).toBeNull()
    expect(screen.queryByTestId('sin-senal-sensor')).toBeNull()
    expect(screen.queryByTestId('nunca-envio-sensor')).toBeNull()
    expect(screen.queryByTestId('texto-sin-senal')).toBeNull()
  })

  it('simulado sin lecturas de dispositivo: ninguna etiqueta de estado', async () => {
    await renderSensor('simulado', null)
    expect(screen.queryByTestId('sin-senal-sensor')).toBeNull()
    expect(screen.queryByTestId('nunca-envio-sensor')).toBeNull()
    expect(screen.queryByTestId('texto-sin-senal')).toBeNull()
  })

  it('real sin lecturas de dispositivo creado hace 30 min: «Nunca ha enviado» y sin «Sin señal»', async () => {
    const datos = datosFalsosActual()
    const creado = await datos.crearSensor('Sensor de campo')
    if (!creado.ok) throw new Error('No se pudo crear el sensor de prueba')
    datos.marcarOrigen(creado.valor.id, 'real')
    datos.marcarCreadoEn(creado.valor.id, new Date(Date.now() - 30 * 60_000).toISOString())
    await cargarSensores()
    render(<Sensores />)
    await screen.findByTestId('tarjeta-sensor')
    expect(screen.getByTestId('nunca-envio-sensor').textContent).toBe('Nunca ha enviado')
    expect(screen.queryByTestId('sin-senal-sensor')).toBeNull()
  })

  it('real sin lecturas de dispositivo creado hace 5 min: sin aviso de sin señal ni de nunca enviado', async () => {
    const datos = datosFalsosActual()
    const creado = await datos.crearSensor('Sensor de campo')
    if (!creado.ok) throw new Error('No se pudo crear el sensor de prueba')
    datos.marcarOrigen(creado.valor.id, 'real')
    datos.marcarCreadoEn(creado.valor.id, new Date(Date.now() - 5 * 60_000).toISOString())
    await cargarSensores()
    render(<Sensores />)
    await screen.findByTestId('tarjeta-sensor')
    expect(screen.queryByTestId('nunca-envio-sensor')).toBeNull()
    expect(screen.queryByTestId('sin-senal-sensor')).toBeNull()
  })
})
