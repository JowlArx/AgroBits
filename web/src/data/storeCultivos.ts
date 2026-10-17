// T-13 — Almacén en memoria de cultivos para la Fase 1 (D6: sin backend).
// Los datos viven solo durante la sesión de la aplicación: en la Fase 2 este
// módulo se sustituirá por la capa de datos de Supabase (tarea T-23) sin
// cambiar las pantallas.

import type { Cultivo, UmbralesPorTipo } from '../domain/tipos'
import { validarUmbrales } from '../domain/umbrales'
import { umbralesPorDefecto } from './catalogo'

export interface NuevoCultivo {
  nombre: string
  tipoCultivo: string
  umbrales: UmbralesPorTipo
}

export type ErrorCampo = { campo: string; motivo: string }
export type Resultado<T> =
  | { ok: true; valor: T }
  | { ok: false; errores: ErrorCampo[] }

let cultivos: Cultivo[] = []
let contador = 0
const oyentes = new Set<() => void>()

function notificar(): void {
  cultivos = [...cultivos]
  for (const oyente of oyentes) oyente()
}

export function suscribirCultivos(oyente: () => void): () => void {
  oyentes.add(oyente)
  return () => oyentes.delete(oyente)
}

export function obtenerCultivos(): Cultivo[] {
  return cultivos
}

export function obtenerCultivo(id: string): Cultivo | undefined {
  return cultivos.find((c) => c.id === id)
}

function validar(datos: NuevoCultivo, idPropio?: string): ErrorCampo[] {
  const errores: ErrorCampo[] = []

  if (datos.nombre.trim() === '') {
    errores.push({ campo: 'nombre', motivo: 'El nombre es obligatorio' })
  }
  if (datos.tipoCultivo.trim() === '') {
    errores.push({ campo: 'tipoCultivo', motivo: 'El tipo de cultivo es obligatorio' })
  }

  const duplicado = cultivos.some(
    (c) => c.id !== idPropio && c.nombre.trim().toLowerCase() === datos.nombre.trim().toLowerCase(),
  )
  if (duplicado) {
    errores.push({ campo: 'nombre', motivo: 'Ya existe un cultivo con ese nombre' })
  }

  errores.push(
    ...validarUmbrales(datos.umbrales).map((e) => ({
      campo: `umbrales.${e.tipo}`,
      motivo: e.motivo,
    })),
  )

  return errores
}

export function crearCultivo(datos: NuevoCultivo): Resultado<Cultivo> {
  const errores = validar(datos)
  if (errores.length > 0) return { ok: false, errores }

  const cultivo: Cultivo = {
    id: `c${++contador}`,
    nombre: datos.nombre.trim(),
    tipoCultivo: datos.tipoCultivo.trim(),
    umbrales: datos.umbrales,
  }
  cultivos.push(cultivo)
  notificar()
  return { ok: true, valor: cultivo }
}

export function actualizarCultivo(
  id: string,
  datos: NuevoCultivo,
): Resultado<Cultivo> {
  const existente = obtenerCultivo(id)
  if (!existente) return { ok: false, errores: [{ campo: 'id', motivo: 'Cultivo no encontrado' }] }

  const errores = validar(datos, id)
  if (errores.length > 0) return { ok: false, errores }

  const actualizado: Cultivo = { ...existente, ...datos, nombre: datos.nombre.trim() }
  cultivos = cultivos.map((c) => (c.id === id ? actualizado : c))
  notificar()
  return { ok: true, valor: actualizado }
}

export function eliminarCultivo(id: string): void {
  cultivos = cultivos.filter((c) => c.id !== id)
  notificar()
}

/** Solo para tests: vuelve al estado inicial. */
export function reiniciarCultivos(): void {
  cultivos = []
  contador = 0
  notificar()
}

/** Crea un cultivo a partir del catálogo con sus umbrales por defecto (R-11 AC1). */
export function nuevoCultivoDesdeCatalogo(tipoCultivo: string): NuevoCultivo {
  return {
    nombre: '',
    tipoCultivo,
    umbrales:
      umbralesPorDefecto(tipoCultivo) ?? {
        humedad_suelo: { min: 0, max: 100 },
        temperatura: { min: 0, max: 40 },
        humedad_ambiental: { min: 0, max: 100 },
        luminosidad: { min: 0, max: 60_000 },
      },
  }
}
