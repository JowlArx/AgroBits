import { describe, expect, it } from 'vitest'
import { estaFueraDeRango, evaluarAlerta } from './alertas'
import type { Umbral } from './tipos'

const umbral: Umbral = { min: 30, max: 70 }

describe('evaluación de alertas (R-13, modelo D14)', () => {
  it('AC1: fuera de rango sin alerta previa → crear', () => {
    expect(evaluarAlerta(10, umbral, false)).toBe('crear')
    expect(evaluarAlerta(90, umbral, false)).toBe('crear')
  })

  it('AC2: fuera de rango con alerta activa → mantener (sin duplicados)', () => {
    expect(evaluarAlerta(10, umbral, true)).toBe('mantener')
    expect(evaluarAlerta(90, umbral, true)).toBe('mantener')
  })

  it('AC3: dentro de rango con alerta activa → resolver', () => {
    expect(evaluarAlerta(50, umbral, true)).toBe('resolver')
  })

  it('AC4: dentro de rango sin alerta previa → ninguna', () => {
    expect(evaluarAlerta(50, umbral, false)).toBe('ninguna')
  })

  it('los valores exactos en el límite cuentan como dentro de rango', () => {
    expect(estaFueraDeRango(30, umbral)).toBe(false)
    expect(estaFueraDeRango(70, umbral)).toBe(false)
    expect(evaluarAlerta(30, umbral, true)).toBe('resolver')
    expect(evaluarAlerta(70, umbral, true)).toBe('resolver')
  })

  it('valores extremadamente fuera de rango siguen la misma regla', () => {
    expect(estaFueraDeRango(-1000, umbral)).toBe(true)
    expect(estaFueraDeRango(1000, umbral)).toBe(true)
  })
})
