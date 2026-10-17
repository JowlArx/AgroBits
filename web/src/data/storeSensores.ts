// T-18/T-23 — Store de sensores: modelo N–N sensor↔cultivo (decisión D5) con
// caché síncrona para la UI y acciones asíncronas que delegan en el
// ProveedorDatos inyectado. La autorización entre usuarios (R-07) vive en las
// políticas RLS de la Fase 2 (T-20/T-21).

import type { Resultado, ErrorCampo } from './datos/proveedorDatos'
import { exigirProveedor } from './datos/proveedorDatos'

export interface Sensor {
  id: string
  nombre: string
  cultivoIds: string[]
}

let sensores: Sensor[] = []
const oyentes = new Set<() => void>()

function notificar(): void {
  sensores = [...sensores]
  for (const oyente of oyentes) oyente()
}

export function suscribirSensores(oyente: () => void): () => void {
  oyentes.add(oyente)
  return () => oyentes.delete(oyente)
}

export function obtenerSensores(): Sensor[] {
  return sensores
}

export function obtenerSensor(id: string): Sensor | undefined {
  return sensores.find((s) => s.id === id)
}

export function obtenerSensoresDeCultivo(cultivoId: string): Sensor[] {
  return sensores.filter((s) => s.cultivoIds.includes(cultivoId))
}

/** T-23: carga los sensores (y sus enlaces N–N) desde el proveedor. */
export async function cargarSensores(): Promise<void> {
  try {
    sensores = await exigirProveedor().cargarSensores()
    notificar()
  } catch (error) {
    console.error('No se pudieron cargar los sensores', error)
  }
}

/** R-06 AC1: alta de un sensor con nombre. */
export async function crearSensor(nombre: string): Promise<Resultado<Sensor>> {
  const errores: ErrorCampo[] = []
  if (nombre.trim() === '') {
    errores.push({ campo: 'nombre', motivo: 'El nombre del sensor es obligatorio' })
  }
  if (errores.length > 0) return { ok: false, errores }

  const resultado = await exigirProveedor().crearSensor(nombre)
  if (resultado.ok) {
    sensores.push(resultado.valor)
    notificar()
  }
  return resultado
}

/**
 * R-06 AC2: asocia un sensor a un cultivo (N–N: repetir para otros cultivos).
 * Devuelve error si no existen el sensor o el cultivo.
 */
export async function asociarSensor(
  sensorId: string,
  cultivoId: string,
  existeCultivo: (id: string) => boolean,
): Promise<Resultado<Sensor>> {
  const indice = sensores.findIndex((s) => s.id === sensorId)
  if (indice < 0) return { ok: false, errores: [{ campo: 'sensor', motivo: 'Sensor no encontrado' }] }
  if (!existeCultivo(cultivoId)) {
    return { ok: false, errores: [{ campo: 'cultivo', motivo: 'Cultivo no encontrado' }] }
  }

  const sensor = sensores[indice]
  if (sensor.cultivoIds.includes(cultivoId)) return { ok: true, valor: sensor }

  const resultado = await exigirProveedor().asociarSensor(sensorId, cultivoId)
  if (resultado.ok) {
    sensores = sensores.map((s) => (s.id === sensorId ? resultado.valor : s))
    notificar()
  }
  return resultado
}

/**
 * Quita los enlaces con el cultivo; los sensores que quedan sin cultivos se
 * eliminan (y sus mediciones, en cascada en la BD) y sus ids se devuelven
 * para que el llamante limpie su caché.
 */
export async function quitarAsociacionesDeCultivo(cultivoId: string): Promise<string[]> {
  const borrados = await exigirProveedor().quitarAsociacionesDeCultivo(cultivoId)
  await cargarSensores()
  return borrados
}

/** Vacia la caché local sin tocar el proveedor (cierre de sesión / tests). */
export function vaciarSensores(): void {
  sensores = []
  notificar()
}

/** Solo para tests: vuelve al estado inicial. */
export function reiniciarSensores(): void {
  vaciarSensores()
}
