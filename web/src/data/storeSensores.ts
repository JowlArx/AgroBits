// T-18 — Entidad de sensores (R-06, Fase 1).
// Modelo de asociación N–N sensor↔cultivo desde el inicio (decisión D5), con
// interfaz que asocia el sensor a UN cultivo en el MVP. La autorización
// entre usuarios (R-07) es [F2] y vive en las políticas RLS de la Fase 2.
// Almacén en memoria: en T-23 se sustituirá por la capa de Supabase.

import type { Resultado, ErrorCampo } from './storeCultivos'

export interface Sensor {
  id: string
  nombre: string
  cultivoIds: string[]
}

let sensores: Sensor[] = []
let contador = 0
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

/** R-06 AC1: alta de un sensor con nombre. */
export function crearSensor(nombre: string): Resultado<Sensor> {
  const errores: ErrorCampo[] = []
  if (nombre.trim() === '') {
    errores.push({ campo: 'nombre', motivo: 'El nombre del sensor es obligatorio' })
  }
  if (errores.length > 0) return { ok: false, errores }

  const sensor: Sensor = { id: `s${++contador}`, nombre: nombre.trim(), cultivoIds: [] }
  sensores.push(sensor)
  notificar()
  return { ok: true, valor: sensor }
}

/**
 * R-06 AC2: asocia un sensor a un cultivo (N–N: repetir para otros cultivos).
 * Devuelve error si no existen el sensor o el cultivo.
 */
export function asociarSensor(
  sensorId: string,
  cultivoId: string,
  existeCultivo: (id: string) => boolean,
): Resultado<Sensor> {
  const indice = sensores.findIndex((s) => s.id === sensorId)
  if (indice < 0) return { ok: false, errores: [{ campo: 'sensor', motivo: 'Sensor no encontrado' }] }
  if (!existeCultivo(cultivoId)) {
    return { ok: false, errores: [{ campo: 'cultivo', motivo: 'Cultivo no encontrado' }] }
  }

  const sensor = sensores[indice]
  if (sensor.cultivoIds.includes(cultivoId)) return { ok: true, valor: sensor }

  const actualizado: Sensor = { ...sensor, cultivoIds: [...sensor.cultivoIds, cultivoId] }
  sensores = sensores.map((s) => (s.id === sensorId ? actualizado : s))
  notificar()
  return { ok: true, valor: actualizado }
}

/**
 * Elimina el sensor si queda sin asociaciones y devuelve su id para que el
 * llamante limpie sus mediciones (simplificación de la Fase 1; la decisión
 * de conservar sensores huérfanos se revisará en Fase 2).
 */
export function quitarAsociacionesDeCultivo(cultivoId: string): string[] {
  const borrados: string[] = []
  const restantes: Sensor[] = []
  let huboCambios = false

  for (const sensor of sensores) {
    if (!sensor.cultivoIds.includes(cultivoId)) {
      restantes.push(sensor)
      continue
    }
    const cultivoIds = sensor.cultivoIds.filter((id) => id !== cultivoId)
    if (cultivoIds.length === 0) {
      borrados.push(sensor.id)
    } else {
      restantes.push({ ...sensor, cultivoIds })
    }
    huboCambios = true
  }

  if (huboCambios) {
    sensores = restantes
    notificar()
  }
  return borrados
}

/** Solo para tests: vuelve al estado inicial. */
export function reiniciarSensores(): void {
  sensores = []
  contador = 0
  notificar()
}
