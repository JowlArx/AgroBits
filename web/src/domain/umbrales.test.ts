import { describe, expect, it } from 'vitest'
import { validarUmbrales } from './umbrales'
import { TIPOS_MEDICION, type UmbralesPorTipo } from './tipos'

function umbralesValidos(): UmbralesPorTipo {
  return {
    humedad_suelo: { min: 30, max: 70 },
    temperatura: { min: 12, max: 28 },
    humedad_ambiental: { min: 40, max: 80 },
    luminosidad: { min: 5_000, max: 40_000 },
  }
}

describe('validación de umbrales (R-05)', () => {
  it('AC1: acepta umbrales válidos (min < max) para los 4 tipos', () => {
    expect(validarUmbrales(umbralesValidos())).toEqual([])
  })

  it('AC2: rechaza min >= max e indica el tipo afectado', () => {
    const umbrales = umbralesValidos()
    umbrales.temperatura = { min: 28, max: 12 }

    const errores = validarUmbrales(umbrales)

    expect(errores).toHaveLength(1)
    expect(errores[0].tipo).toBe('temperatura')
    expect(errores[0].motivo).toMatch(/menor/)
  })

  it('AC2: rechaza min igual al máximo', () => {
    const umbrales = umbralesValidos()
    umbrales.luminosidad = { min: 100, max: 100 }

    expect(validarUmbrales(umbrales)).toHaveLength(1)
  })

  it('rechaza valores no finitos', () => {
    const umbrales = umbralesValidos()
    umbrales.humedad_suelo = { min: Number.NaN, max: 70 }

    expect(validarUmbrales(umbrales)).toHaveLength(1)
  })

  it('rechaza un cultivo al que le falta algún tipo de umbral', () => {
    const umbrales = umbralesValidos()
    delete (umbrales as Partial<UmbralesPorTipo>).humedad_ambiental

    const errores = validarUmbrales(umbrales as UmbralesPorTipo)

    expect(errores).toHaveLength(1)
    expect(errores[0].tipo).toBe('humedad_ambiental')
  })

  it('recorre los 4 tipos del MVP', () => {
    expect(Object.keys(umbralesValidos()).sort()).toEqual([...TIPOS_MEDICION].sort())
  })
})
