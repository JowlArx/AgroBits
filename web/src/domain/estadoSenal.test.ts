import { describe, expect, it } from 'vitest'
import { estadoSenal, UMBRAL_SIN_SENAL_MS } from './estadoSenal'
import type { Sensor } from '../data/storeSensores'

const AHORA = Date.UTC(2026, 10, 23, 12, 0, 0)
const MIN = 60 * 1000

function hace(minutos: number): string {
  return new Date(AHORA - minutos * MIN).toISOString()
}

function sensor(parcial: Partial<Sensor>): Sensor {
  return {
    id: 's1',
    nombre: 'Sensor',
    cultivoIds: [],
    colorLinea: 'verde',
    origen: 'real',
    ...parcial,
  }
}

describe('estadoSenal', () => {
  it('umbral de 15 minutos', () => {
    expect(UMBRAL_SIN_SENAL_MS).toBe(15 * MIN)
  })

  it('real con última lectura hace 5 min → activo', () => {
    expect(estadoSenal(sensor({ ultimaVezVisto: hace(5) }), AHORA)).toBe('activo')
  })

  it('real con última lectura hace exactamente 15 min → activo (umbral estricto)', () => {
    expect(estadoSenal(sensor({ ultimaVezVisto: hace(15) }), AHORA)).toBe('activo')
  })

  it('real con última lectura hace 30 min → sin_senal', () => {
    expect(estadoSenal(sensor({ ultimaVezVisto: hace(30) }), AHORA)).toBe('sin_senal')
  })

  it('real sin lecturas y creado hace 5 min → null', () => {
    expect(estadoSenal(sensor({ ultimaVezVisto: null, creadoEn: hace(5) }), AHORA)).toBeNull()
  })

  it('real sin lecturas y creado hace 30 min → nunca_envio', () => {
    expect(estadoSenal(sensor({ ultimaVezVisto: null, creadoEn: hace(30) }), AHORA)).toBe('nunca_envio')
  })

  it('simulado con última lectura hace 30 min → null', () => {
    expect(estadoSenal(sensor({ origen: 'simulado', ultimaVezVisto: hace(30) }), AHORA)).toBeNull()
  })
})
