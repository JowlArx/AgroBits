import { describe, expect, it } from 'vitest'
import { numero } from './formato'

describe('numero (formato español, solo presentación)', () => {
  it('usa coma decimal con el número de decimales pedido (por defecto 1)', () => {
    expect(numero(17.6)).toBe('17,6')
    expect(numero(45)).toBe('45,0')
    expect(numero(19.6, 1)).toBe('19,6')
  })

  it('con decimales = 0 no muestra decimales ni separador de miles', () => {
    expect(numero(1600, 0)).toBe('1600')
    expect(numero(18, 0)).toBe('18')
  })

  it('redondea a los decimales pedidos', () => {
    expect(numero(2.345, 2)).toBe('2,35')
    expect(numero(12.04, 1)).toBe('12,0')
  })
})
