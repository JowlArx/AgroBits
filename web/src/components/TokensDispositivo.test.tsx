import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import TokensDispositivo from './TokensDispositivo'
import { exigirProveedor } from '../data/datos/proveedorDatos'
import { crearTokenDispositivo } from '../data/tokensDispositivo'
import { datosFalsosActual } from '../tests/soporte/configurarTests'

// Casilla "Revocar los tokens anteriores de este sensor" (marcada por defecto).

async function sensorConTokenPrevio(): Promise<string> {
  const sensor = await exigirProveedor().crearSensor('Sensor de prueba')
  if (!sensor.ok) throw new Error('no se pudo crear el sensor de prueba')
  const previo = await crearTokenDispositivo(sensor.valor.id, 'Nodo A')
  if (!previo.ok) throw new Error('no se pudo crear el token previo')
  return sensor.valor.id
}

function tokensDelSensor(sensorId: string) {
  return datosFalsosActual()
    .tokensDispositivoGuardados()
    .filter((t) => t.sensorId === sensorId)
}

function casilla(): HTMLInputElement {
  return screen.getByTestId('revocar-anteriores') as HTMLInputElement
}

function generarCon(nombre: string): void {
  fireEvent.change(screen.getByTestId('nombre-token'), { target: { value: nombre } })
  fireEvent.click(screen.getByTestId('generar-token'))
}

describe('TokensDispositivo: revocar tokens anteriores al generar', () => {
  it('con la casilla marcada, los tokens previos quedan revocados y solo el nuevo queda Activo', async () => {
    const sensorId = await sensorConTokenPrevio()
    render(<TokensDispositivo sensorId={sensorId} sensorNombre="Sensor de prueba" />)

    expect(casilla().checked).toBe(true)
    generarCon('Nodo B')

    await waitFor(() => expect(tokensDelSensor(sensorId)).toHaveLength(2))
    const [previo, nuevo] = tokensDelSensor(sensorId)
    expect(previo.nombre).toBe('Nodo A')
    expect(previo.activo).toBe(false)
    expect(previo.revokedAt).not.toBeNull()
    expect(nuevo.nombre).toBe('Nodo B')
    expect(nuevo.activo).toBe(true)
    expect(tokensDelSensor(sensorId).filter((t) => t.activo)).toHaveLength(1)
  })

  it('con la casilla desmarcada, el token anterior sigue Activo y hay dos activos', async () => {
    const sensorId = await sensorConTokenPrevio()
    render(<TokensDispositivo sensorId={sensorId} sensorNombre="Sensor de prueba" />)

    fireEvent.click(casilla())
    expect(casilla().checked).toBe(false)
    generarCon('Nodo B')

    await waitFor(() => expect(tokensDelSensor(sensorId)).toHaveLength(2))
    const activos = tokensDelSensor(sensorId).filter((t) => t.activo)
    expect(activos.map((t) => t.nombre).sort()).toEqual(['Nodo A', 'Nodo B'])
  })

  it('si falla la revocación, no se crea el token nuevo y se muestra el error', async () => {
    const sensorId = await sensorConTokenPrevio()
    const proveedor = exigirProveedor()
    vi.spyOn(proveedor, 'revocarTokensDeSensor').mockResolvedValueOnce({
      ok: false,
      errores: [{ campo: 'general', motivo: 'Fallo simulado al revocar' }],
    })
    render(<TokensDispositivo sensorId={sensorId} sensorNombre="Sensor de prueba" />)

    generarCon('Nodo B')

    expect((await screen.findByTestId('error-token')).textContent).toContain('Fallo simulado al revocar')
    expect(screen.queryByTestId('token-nuevo')).toBeNull()
    const tokens = tokensDelSensor(sensorId)
    expect(tokens).toHaveLength(1)
    expect(tokens[0].nombre).toBe('Nodo A')
    expect(tokens[0].activo).toBe(true)
  })
})
