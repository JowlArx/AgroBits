import { describe, expect, it } from 'vitest'

// T-10: prueba humilde de humo para verificar que la infraestructura de
// tests funciona. Las reglas reales de dominio se cubren en T-11.
describe('infraestructura de pruebas', () => {
  it('ejecuta assertions con Vitest', () => {
    expect(1 + 1).toBe(2)
  })
})
