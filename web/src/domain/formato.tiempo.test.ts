import { describe, expect, it } from 'vitest'
import { tiempoRelativo } from './formato'

// Hora local fija (27/10/2026 15:00) para que los casos no dependan del reloj.
const ahora = new Date(2026, 9, 27, 15, 0)

describe('tiempoRelativo', () => {
  it('mismo día, hace 3 min', () => {
    expect(tiempoRelativo(new Date(2026, 9, 27, 14, 57).toISOString(), ahora)).toBe('hace 3 min')
  })

  it('mismo día, hace 2 h', () => {
    expect(tiempoRelativo(new Date(2026, 9, 27, 13, 0).toISOString(), ahora)).toBe('hace 2 h')
  })

  it('día anterior: «ayer HH:MM»', () => {
    expect(tiempoRelativo(new Date(2026, 9, 26, 9, 5).toISOString(), ahora)).toMatch(/^ayer 09:05$/)
  })
})
