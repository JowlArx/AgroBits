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

// T-23: la store delega en el ProveedorDatos inyectado (doble en memoria en
// src/tests/soporte/configurarTests.ts); las acciones son asíncronas.

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

describe('store de cultivos (T-13/T-23)', () => {
  it('R-04 AC1: crear un cultivo lo añade a la lista', async () => {
    const resultado = await crearCultivo(datosBase())

    expect(resultado.ok).toBe(true)
    expect(obtenerCultivos()).toHaveLength(1)
    expect(obtenerCultivos()[0].nombre).toBe('Tomates del balcón')
  })

  it('R-04 AC2: actualizar un cultivo propio persiste los cambios', async () => {
    const creado = await crearCultivo(datosBase())
    if (!creado.ok) throw new Error('esperaba crear')

    const actualizado = await actualizarCultivo(creado.valor.id, { ...datosBase(), nombre: 'Otro nombre' })

    expect(actualizado.ok).toBe(true)
    expect(obtenerCultivo(creado.valor.id)?.nombre).toBe('Otro nombre')
  })

  it('R-04 AC3: eliminar un cultivo lo retira de la lista', async () => {
    const creado = await crearCultivo(datosBase())
    if (!creado.ok) throw new Error('esperaba crear')

    await eliminarCultivo(creado.valor.id)

    expect(obtenerCultivos()).toHaveLength(0)
  })

  it('R-05 AC2: rechaza umbrales inválidos sin guardar', async () => {
    const invalido = datosBase()
    invalido.umbrales = { ...umbralesValidos, temperatura: { min: 30, max: 20 } }

    const resultado = await crearCultivo(invalido)

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) {
      expect(resultado.errores.some((e) => e.campo.includes('temperatura'))).toBe(true)
    }
    expect(obtenerCultivos()).toHaveLength(0)
  })

  it('R-05: rechaza nombre vacío', async () => {
    const resultado = await crearCultivo({ ...datosBase(), nombre: '   ' })

    expect(resultado.ok).toBe(false)
  })

  it('rechaza nombres duplicados (manteniendo el criterio de unicidad)', async () => {
    await crearCultivo(datosBase())
    const duplicado = await crearCultivo(datosBase())

    expect(duplicado.ok).toBe(false)
  })

  it('actualizar un inexistente informa del error', async () => {
    const resultado = await actualizarCultivo('no-existe', datosBase())

    expect(resultado.ok).toBe(false)
  })

  it('R-11 AC1: crear desde el catálogo trae los umbrales por defecto', () => {
    const desdeCatalogo = nuevoCultivoDesdeCatalogo('Tomate')

    expect(desdeCatalogo.umbrales.temperatura).toEqual({ min: 15, max: 28 })
    expect(desdeCatalogo.umbrales.humedad_suelo).toEqual({ min: 40, max: 75 })
  })

  it('T-23: el proveedor y la caché quedan sincronizados tras crear', async () => {
    await crearCultivo(datosBase())
    reiniciarCultivos()

    // El proveedor (doble) conserva los datos; la caché se recarga desde él.
    const { cargarCultivos, obtenerEstadoCarga } = await import('./storeCultivos')
    await cargarCultivos()

    expect(obtenerEstadoCarga()).toBe('listo')
    expect(obtenerCultivos()).toHaveLength(1)
    expect(obtenerCultivos()[0].nombre).toBe('Tomates del balcón')
  })
})
