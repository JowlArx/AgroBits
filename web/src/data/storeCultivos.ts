// T-13/T-23 — Store de cultivos: caché síncrona para la UI (suscripciones y
// `useSyncExternalStore` sin cambios) + acciones ASÍNCRONAS que delegan en el
// ProveedorDatos inyectado (capa intercambiable, plan.md §2). La validación
// barata (nombre, tipo, duplicado, umbrales) sigue siendo local y síncrona;
// el proveedor aporta la persistencia real (Supabase en la app, memoria en
// los tests).

import type { Cultivo } from '../domain/tipos'
import { validarUmbrales } from '../domain/umbrales'
import { umbralesPorDefecto } from './catalogo'
import {
  exigirProveedor,
  type ErrorCampo,
  type NuevoCultivo,
  type Resultado,
} from './datos/proveedorDatos'

export type { ErrorCampo, NuevoCultivo, Resultado }

export type EstadoCarga = 'sin-cargar' | 'cargando' | 'listo' | 'error'

let cultivos: Cultivo[] = []
let estadoCarga: EstadoCarga = 'sin-cargar'
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

export function obtenerEstadoCarga(): EstadoCarga {
  return estadoCarga
}

/** T-23: carga la lista desde el proveedor (la app la llama al abrir sesión). */
export async function cargarCultivos(): Promise<void> {
  estadoCarga = 'cargando'
  notificar()
  try {
    cultivos = await exigirProveedor().cargarCultivos()
    estadoCarga = 'listo'
  } catch (error) {
    console.error('No se pudieron cargar los cultivos', error)
    estadoCarga = 'error'
  }
  notificar()
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

export async function crearCultivo(datos: NuevoCultivo): Promise<Resultado<Cultivo>> {
  const errores = validar(datos)
  if (errores.length > 0) return { ok: false, errores }

  const resultado = await exigirProveedor().crearCultivo(datos)
  if (resultado.ok) {
    cultivos.push(resultado.valor)
    notificar()
  }
  return resultado
}

export async function actualizarCultivo(id: string, datos: NuevoCultivo): Promise<Resultado<Cultivo>> {
  const existente = obtenerCultivo(id)
  if (!existente) return { ok: false, errores: [{ campo: 'id', motivo: 'Cultivo no encontrado' }] }

  const errores = validar(datos, id)
  if (errores.length > 0) return { ok: false, errores }

  const resultado = await exigirProveedor().actualizarCultivo(id, datos)
  if (resultado.ok) {
    cultivos = cultivos.map((c) => (c.id === id ? resultado.valor : c))
    notificar()
  }
  return resultado
}

export async function eliminarCultivo(id: string): Promise<void> {
  await exigirProveedor().eliminarCultivo(id)
  cultivos = cultivos.filter((c) => c.id !== id)
  notificar()
}

/** Vacia la caché local sin tocar el proveedor (cierre de sesión / tests). */
export function vaciarCultivos(): void {
  cultivos = []
  estadoCarga = 'sin-cargar'
  notificar()
}

/** Solo para tests: vuelve al estado inicial. */
export function reiniciarCultivos(): void {
  vaciarCultivos()
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
