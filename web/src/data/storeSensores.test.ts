import { beforeEach, describe, expect, it } from 'vitest'
import {
  asociarSensor,
  crearSensor,
  obtenerSensores,
  obtenerSensoresDeCultivo,
  quitarAsociacionesDeCultivo,
  reiniciarSensores,
} from './storeSensores'
import { crearCultivo, reiniciarCultivos, obtenerCultivos } from './storeCultivos'
import type { UmbralesPorTipo } from '../domain/tipos'

const umbrales: UmbralesPorTipo = {
  humedad_suelo: { min: 30, max: 70 },
  temperatura: { min: 12, max: 28 },
  humedad_ambiental: { min: 40, max: 80 },
  luminosidad: { min: 5_000, max: 40_000 },
}

function crearCultivoEjemplo(nombre: string): string {
  const resultado = crearCultivo({ nombre, tipoCultivo: 'Tomate', umbrales })
  if (!resultado.ok) throw new Error('no se pudo crear el cultivo de prueba')
  return resultado.valor.id
}

const existeCultivo = (id: string) => obtenerCultivos().some((c) => c.id === id)

beforeEach(() => {
  reiniciarCultivos()
  reiniciarSensores()
})

describe('store de sensores (T-18, R-06)', () => {
  it('AC1: crear un sensor con nombre válido lo añade con id y sin cultivos', () => {
    const resultado = crearSensor('Sensor 1')

    expect(resultado.ok).toBe(true)
    if (resultado.ok) {
      expect(resultado.valor.id).toMatch(/^s\d+$/)
      expect(resultado.valor.cultivoIds).toEqual([])
    }
    expect(obtenerSensores()).toHaveLength(1)
  })

  it('AC1: rechaza el nombre vacío', () => {
    const resultado = crearSensor('   ')

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.errores[0].motivo).toMatch(/obligatorio/)
    expect(obtenerSensores()).toHaveLength(0)
  })

  it('AC2: asocia un sensor a un cultivo existente', () => {
    const cultivoId = crearCultivoEjemplo('Huerto')
    const sensor = crearSensor('Sensor A')
    if (!sensor.ok) throw new Error('esperaba crear')

    const resultado = asociarSensor(sensor.valor.id, cultivoId, existeCultivo)

    expect(resultado.ok).toBe(true)
    expect(obtenerSensoresDeCultivo(cultivoId)).toHaveLength(1)
  })

  it('rechaza asociar a un cultivo inexistente', () => {
    const sensor = crearSensor('Sensor B')
    if (!sensor.ok) throw new Error('esperaba crear')

    const resultado = asociarSensor(sensor.valor.id, 'no-existe', existeCultivo)

    expect(resultado.ok).toBe(false)
    expect(obtenerSensores()[0].cultivoIds).toEqual([])
  })

  it('rechaza asociar un sensor inexistente', () => {
    const cultivoId = crearCultivoEjemplo('Huerto')

    const resultado = asociarSensor('no-existe', cultivoId, existeCultivo)

    expect(resultado.ok).toBe(false)
  })

  it('AC3: el modelo admite un sensor en varios cultivos (N–N)', () => {
    const uno = crearCultivoEjemplo('Huerto uno')
    const dos = crearCultivoEjemplo('Huerto dos')
    const sensor = crearSensor('Sensor compartido')
    if (!sensor.ok) throw new Error('esperaba crear')

    asociarSensor(sensor.valor.id, uno, existeCultivo)
    const segunda = asociarSensor(sensor.valor.id, dos, existeCultivo)

    expect(segunda.ok).toBe(true)
    expect(obtenerSensoresDeCultivo(uno)).toHaveLength(1)
    expect(obtenerSensoresDeCultivo(dos)).toHaveLength(1)
    expect(obtenerSensores()).toHaveLength(1)
  })

  it('asociar dos veces al mismo cultivo es idempotente', () => {
    const cultivoId = crearCultivoEjemplo('Huerto')
    const sensor = crearSensor('Sensor C')
    if (!sensor.ok) throw new Error('esperaba crear')

    asociarSensor(sensor.valor.id, cultivoId, existeCultivo)
    asociarSensor(sensor.valor.id, cultivoId, existeCultivo)

    expect(obtenerSensores()[0].cultivoIds).toEqual([cultivoId])
  })

  it('quitarAsociaciones elimina el sensor sin cultivos y devuelve su id', () => {
    const cultivoId = crearCultivoEjemplo('Huerto')
    const sensor = crearSensor('Sensor D')
    if (!sensor.ok) throw new Error('esperaba crear')
    asociarSensor(sensor.valor.id, cultivoId, existeCultivo)

    const borrados = quitarAsociacionesDeCultivo(cultivoId)

    expect(borrados).toEqual([sensor.valor.id])
    expect(obtenerSensores()).toHaveLength(0)
  })

  it('quitarAsociaciones conserva el sensor que sigue en otro cultivo', () => {
    const uno = crearCultivoEjemplo('Huerto uno')
    const dos = crearCultivoEjemplo('Huerto dos')
    const sensor = crearSensor('Sensor E')
    if (!sensor.ok) throw new Error('esperaba crear')
    asociarSensor(sensor.valor.id, uno, existeCultivo)
    asociarSensor(sensor.valor.id, dos, existeCultivo)

    const borrados = quitarAsociacionesDeCultivo(uno)

    expect(borrados).toEqual([])
    expect(obtenerSensores()).toHaveLength(1)
    expect(obtenerSensores()[0].cultivoIds).toEqual([dos])
  })
})
