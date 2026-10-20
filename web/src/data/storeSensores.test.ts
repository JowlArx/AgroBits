import { beforeEach, describe, expect, it } from 'vitest'
import {
  asociarSensor,
  crearSensor,
  desasociarSensor,
  eliminarSensor,
  obtenerSensores,
  obtenerSensoresDeCultivo,
  quitarAsociacionesDeCultivo,
  reiniciarSensores,
} from './storeSensores'
import { crearCultivo, reiniciarCultivos, obtenerCultivos } from './storeCultivos'
import type { UmbralesPorTipo } from '../domain/tipos'

// T-23: store con caché síncrona y acciones asíncronas delegadas al
// ProveedorDatos inyectado (doble en memoria en los tests).

const umbrales: UmbralesPorTipo = {
  humedad_suelo: { min: 30, max: 70 },
  temperatura: { min: 12, max: 28 },
  humedad_ambiental: { min: 40, max: 80 },
  luminosidad: { min: 5_000, max: 40_000 },
}

async function crearCultivoEjemplo(nombre: string): Promise<string> {
  const resultado = await crearCultivo({ nombre, tipoCultivo: 'Tomate', umbrales })
  if (!resultado.ok) throw new Error('no se pudo crear el cultivo de prueba')
  return resultado.valor.id
}

const existeCultivo = (id: string) => obtenerCultivos().some((c) => c.id === id)

beforeEach(() => {
  reiniciarCultivos()
  reiniciarSensores()
})

describe('store de sensores (T-18/R-06, T-23)', () => {
  it('AC1: crear un sensor con nombre válido lo añade con id y sin cultivos', async () => {
    const resultado = await crearSensor('Sensor 1')

    expect(resultado.ok).toBe(true)
    if (resultado.ok) {
      expect(resultado.valor.id).toMatch(/^s\d+$/)
      expect(resultado.valor.cultivoIds).toEqual([])
    }
    expect(obtenerSensores()).toHaveLength(1)
  })

  it('AC1: rechaza el nombre vacío', async () => {
    const resultado = await crearSensor('   ')

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.errores[0].motivo).toMatch(/obligatorio/)
    expect(obtenerSensores()).toHaveLength(0)
  })

  it('AC2: asocia un sensor a un cultivo existente', async () => {
    const cultivoId = await crearCultivoEjemplo('Huerto')
    const sensor = await crearSensor('Sensor A')
    if (!sensor.ok) throw new Error('esperaba crear')

    const resultado = await asociarSensor(sensor.valor.id, cultivoId, existeCultivo)

    expect(resultado.ok).toBe(true)
    expect(obtenerSensoresDeCultivo(cultivoId)).toHaveLength(1)
  })

  it('rechaza asociar a un cultivo inexistente', async () => {
    const sensor = await crearSensor('Sensor B')
    if (!sensor.ok) throw new Error('esperaba crear')

    const resultado = await asociarSensor(sensor.valor.id, 'no-existe', existeCultivo)

    expect(resultado.ok).toBe(false)
    expect(obtenerSensores()[0].cultivoIds).toEqual([])
  })

  it('rechaza asociar un sensor inexistente', async () => {
    const cultivoId = await crearCultivoEjemplo('Huerto')

    const resultado = await asociarSensor('no-existe', cultivoId, existeCultivo)

    expect(resultado.ok).toBe(false)
  })

  it('AC3: el modelo admite un sensor en varios cultivos (N–N)', async () => {
    const uno = await crearCultivoEjemplo('Huerto uno')
    const dos = await crearCultivoEjemplo('Huerto dos')
    const sensor = await crearSensor('Sensor compartido')
    if (!sensor.ok) throw new Error('esperaba crear')

    await asociarSensor(sensor.valor.id, uno, existeCultivo)
    const segunda = await asociarSensor(sensor.valor.id, dos, existeCultivo)

    expect(segunda.ok).toBe(true)
    expect(obtenerSensoresDeCultivo(uno)).toHaveLength(1)
    expect(obtenerSensoresDeCultivo(dos)).toHaveLength(1)
    expect(obtenerSensores()).toHaveLength(1)
  })

  it('asociar dos veces al mismo cultivo es idempotente', async () => {
    const cultivoId = await crearCultivoEjemplo('Huerto')
    const sensor = await crearSensor('Sensor C')
    if (!sensor.ok) throw new Error('esperaba crear')

    await asociarSensor(sensor.valor.id, cultivoId, existeCultivo)
    await asociarSensor(sensor.valor.id, cultivoId, existeCultivo)

    expect(obtenerSensores()[0].cultivoIds).toEqual([cultivoId])
  })

  it('quitarAsociaciones elimina el sensor sin cultivos y devuelve su id', async () => {
    const cultivoId = await crearCultivoEjemplo('Huerto')
    const sensor = await crearSensor('Sensor D')
    if (!sensor.ok) throw new Error('esperaba crear')
    await asociarSensor(sensor.valor.id, cultivoId, existeCultivo)

    const borrados = await quitarAsociacionesDeCultivo(cultivoId)

    expect(borrados).toEqual([sensor.valor.id])
    expect(obtenerSensores()).toHaveLength(0)
  })

  it('quitarAsociaciones conserva el sensor que sigue en otro cultivo', async () => {
    const uno = await crearCultivoEjemplo('Huerto uno')
    const dos = await crearCultivoEjemplo('Huerto dos')
    const sensor = await crearSensor('Sensor E')
    if (!sensor.ok) throw new Error('esperaba crear')
    await asociarSensor(sensor.valor.id, uno, existeCultivo)
    await asociarSensor(sensor.valor.id, dos, existeCultivo)

    const borrados = await quitarAsociacionesDeCultivo(uno)

    expect(borrados).toEqual([])
    expect(obtenerSensores()).toHaveLength(1)
    expect(obtenerSensores()[0].cultivoIds).toEqual([dos])
  })

  it('D34: desasociar saca el sensor del cultivo pero lo conserva en la cuenta', async () => {
    const cultivoId = await crearCultivoEjemplo('Huerto')
    const sensor = await crearSensor('Sensor F')
    if (!sensor.ok) throw new Error('esperaba crear')
    await asociarSensor(sensor.valor.id, cultivoId, existeCultivo)

    const resultado = await desasociarSensor(sensor.valor.id, cultivoId)

    expect(resultado.ok).toBe(true)
    expect(obtenerSensoresDeCultivo(cultivoId)).toHaveLength(0)
    expect(obtenerSensores()).toHaveLength(1)
    expect(obtenerSensores()[0].cultivoIds).toEqual([])
  })

  it('D34: desasociar un sensor que no está en el cultivo se rechaza', async () => {
    const cultivoId = await crearCultivoEjemplo('Huerto')
    const sensor = await crearSensor('Sensor G')
    if (!sensor.ok) throw new Error('esperaba crear')

    const resultado = await desasociarSensor(sensor.valor.id, cultivoId)

    expect(resultado.ok).toBe(false)
    expect(obtenerSensores()).toHaveLength(1)
  })

  it('D34: eliminarSensor quita el sensor de la cuenta', async () => {
    const cultivoId = await crearCultivoEjemplo('Huerto')
    const sensor = await crearSensor('Sensor H')
    if (!sensor.ok) throw new Error('esperaba crear')
    await asociarSensor(sensor.valor.id, cultivoId, existeCultivo)

    const resultado = await eliminarSensor(sensor.valor.id)

    expect(resultado.ok).toBe(true)
    expect(obtenerSensores()).toHaveLength(0)
    expect(obtenerSensoresDeCultivo(cultivoId)).toHaveLength(0)
  })

  it('D34: eliminar un sensor inexistente se rechaza', async () => {
    const resultado = await eliminarSensor('no-existe')

    expect(resultado.ok).toBe(false)
  })
})
