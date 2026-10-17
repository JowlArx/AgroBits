import { describe, expect, it } from 'vitest'
import {
  INTERVALO_LECTURAS_MS,
  crearGenerador,
  generarSerie,
} from './generador'
import {
  RANGOS_SIMULACION,
  TIPOS_MEDICION,
  UNIDADES,
  type Medicion,
} from '../domain/tipos'

const DESDE = '2026-10-17T10:00:00.000Z'

function expectContratoValido(medicion: Medicion): void {
  expect(medicion.sensorId).toBeTruthy()
  expect(TIPOS_MEDICION).toContain(medicion.tipo)
  expect(typeof medicion.valor).toBe('number')
  expect(Number.isFinite(medicion.valor)).toBe(true)
  expect(medicion.unidad).toBe(UNIDADES[medicion.tipo])
  expect(medicion.medidaEn).toMatch(/^\d{4}-\d{2}-\d{2}T/) // ISO 8601
}

describe('generador de datos simulados (T-12)', () => {
  it('produce mediciones válidas según el contrato R-08 para los 4 tipos', () => {
    const generador = crearGenerador(42)

    for (const tipo of TIPOS_MEDICION) {
      const medicion = generador.medicion({ sensorId: 's1', tipo, medidaEn: DESDE })
      expectContratoValido(medicion)
      expect(medicion.tipo).toBe(tipo)
    }
  })

  it('los valores caen dentro del rango de simulación del tipo', () => {
    const generador = crearGenerador(7)

    for (let i = 0; i < 200; i++) {
      for (const tipo of TIPOS_MEDICION) {
        const { valor } = generador.medicion({ sensorId: 's1', tipo })
        const rango = RANGOS_SIMULACION[tipo]
        expect(valor).toBeGreaterThanOrEqual(rango.min)
        expect(valor).toBeLessThanOrEqual(rango.max)
      }
    }
  })

  it('es determinista: la misma semilla produce la misma secuencia', () => {
    const a = crearGenerador(123)
    const b = crearGenerador(123)

    const serieA = generarSerie(a, { sensorId: 's1', desde: DESDE, cantidad: 10 })
    const serieB = generarSerie(b, { sensorId: 's1', desde: DESDE, cantidad: 10 })

    expect(serieA).toEqual(serieB)
  })

  it('semillas distintas producen secuencias distintas', () => {
    const a = crearGenerador(1)
    const b = crearGenerador(2)

    const valoresA = generarSerie(a, { sensorId: 's1', desde: DESDE, cantidad: 20 })
      .map((m) => m.valor)
      .join()
    const valoresB = generarSerie(b, { sensorId: 's1', desde: DESDE, cantidad: 20 })
      .map((m) => m.valor)
      .join()

    expect(valoresA).not.toBe(valoresB)
  })

  it('la serie respeta 1 lectura cada 5 minutos por sensor (D15)', () => {
    const generador = crearGenerador(9)
    const serie = generarSerie(generador, {
      sensorId: 's1',
      tipos: ['temperatura'],
      desde: DESDE,
      cantidad: 4,
    })

    expect(serie).toHaveLength(4)
    const instantes = serie.map((m) => Date.parse(m.medidaEn))
    for (let i = 1; i < instantes.length; i++) {
      expect(instantes[i] - instantes[i - 1]).toBe(INTERVALO_LECTURAS_MS)
    }
    expect(instantes[0]).toBe(Date.parse(DESDE))
  })

  it('la serie incluye los 4 tipos por defecto en cada instante', () => {
    const generador = crearGenerador(3)
    const serie = generarSerie(generador, { sensorId: 's1', desde: DESDE, cantidad: 5 })

    expect(serie).toHaveLength(5 * TIPOS_MEDICION.length)
    for (const medicion of serie) expectContratoValido(medicion)
  })
})
