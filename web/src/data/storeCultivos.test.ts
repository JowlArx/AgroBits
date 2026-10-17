import { beforeEach, describe, expect, it } from 'vitest'
import {
  actualizarCultivo,
  crearCultivo,
  eliminarCultivo,
  nuevoCultivoDesdeCatalogo,
  obtenerCultivo,
  obtenerCultivos,
  reiniciarCultivos,
} from './storeCultivos'
import type { UmbralesPorTipo } from '../domain/tipos'

const umbralesValidos: UmbralesPorTipo = {
  humedad_suelo: { min: 30, max: 70 },
  temperatura: { min: 12, max: 28 },
  humedad_ambiental: { min: 40, max: 80 },
  luminosidad: { min: 5_000, max: 40_000 },
}

function datosBase() {
  return { nombre: 'Tomates del balcón', tipoCultivo: 'Tomate', umbrales: umbralesValidos }
}

beforeEach(() => reiniciarCultivos())

describe('store de cultivos (T-13)', () => {
  it('R-04 AC1: crear un cultivo lo añade a la lista', () => {
    const resultado = crearCultivo(datosBase())

    expect(resultado.ok).toBe(true)
    expect(obtenerCultivos()).toHaveLength(1)
    expect(obtenerCultivos()[0].nombre).toBe('Tomates del balcón')
  })

  it('R-04 AC2: actualizar un cultivo propio persiste los cambios', () => {
    const creado = crearCultivo(datosBase())
    if (!creado.ok) throw new Error('esperaba crear')

    const actualizado = actualizarCultivo(creado.valor.id, { ...datosBase(), nombre: 'Otro nombre' })

    expect(actualizado.ok).toBe(true)
    expect(obtenerCultivo(creado.valor.id)?.nombre).toBe('Otro nombre')
  })

  it('R-04 AC3: eliminar un cultivo lo retira de la lista', () => {
    const creado = crearCultivo(datosBase())
    if (!creado.ok) throw new Error('esperaba crear')

    eliminarCultivo(creado.valor.id)

    expect(obtenerCultivos()).toHaveLength(0)
  })

  it('R-05 AC2: rechaza umbrales inválidos sin guardar', () => {
    const invalido = datosBase()
    invalido.umbrales = { ...umbralesValidos, temperatura: { min: 30, max: 20 } }

    const resultado = crearCultivo(invalido)

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) {
      expect(resultado.errores.some((e) => e.campo.includes('temperatura'))).toBe(true)
    }
    expect(obtenerCultivos()).toHaveLength(0)
  })

  it('R-05: rechaza nombre vacío', () => {
    const resultado = crearCultivo({ ...datosBase(), nombre: '   ' })

    expect(resultado.ok).toBe(false)
  })

  it('rechaza nombres duplicados (manteniendo el criterio de unicidad)', () => {
    crearCultivo(datosBase())
    const duplicado = crearCultivo(datosBase())

    expect(duplicado.ok).toBe(false)
  })

  it('actualizar un inexistente informa del error', () => {
    const resultado = actualizarCultivo('no-existe', datosBase())

    expect(resultado.ok).toBe(false)
  })

  it('R-11 AC1: crear desde el catálogo trae los umbrales por defecto', () => {
    const desdeCatalogo = nuevoCultivoDesdeCatalogo('Tomate')

    expect(desdeCatalogo.umbrales.temperatura).toEqual({ min: 15, max: 28 })
    expect(desdeCatalogo.umbrales.humedad_suelo).toEqual({ min: 40, max: 75 })
  })
})
