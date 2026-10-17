import { describe, expect, it } from 'vitest'
import { TIPOS_MEDICION, UNIDADES, RANGOS_SIMULACION } from './tipos'

describe('tipos de medición (D2)', () => {
  it('define exactamente los 4 tipos del MVP', () => {
    expect(TIPOS_MEDICION).toHaveLength(4)
    expect([...TIPOS_MEDICION].sort()).toEqual(
      ['humedad_ambiental', 'humedad_suelo', 'luminosidad', 'temperatura'].sort(),
    )
  })

  it('cada tipo tiene su unidad (R-09: mostrar valor y unidad)', () => {
    for (const tipo of TIPOS_MEDICION) {
      expect(UNIDADES[tipo]).toBeTruthy()
    }
  })

  it('cada tipo tiene rango de simulación válido', () => {
    for (const tipo of TIPOS_MEDICION) {
      const rango = RANGOS_SIMULACION[tipo]
      expect(rango.min).toBeLessThan(rango.max)
    }
  })
})
