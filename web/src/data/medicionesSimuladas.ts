// T-14/T-18 — Mediciones simuladas por SENSOR (R-09 + R-06 AC2, Fase 1).
// Cada sensor tiene su propio historial, que empieza vacío: hasta que no
// llega una lectura, la vista muestra "sin datos" (R-09 AC2) y nunca inventa
// valores. Un cultivo ve las mediciones de sus sensores asociados. En la
// Fase 2 este módulo se sustituirá por la capa de Supabase (T-23) con el
// mismo contrato de R-08.

import type { Medicion, TipoMedicion } from '../domain/tipos'
import { TIPOS_MEDICION } from '../domain/tipos'
import { INTERVALO_LECTURAS_MS, crearGenerador } from './generador'

const MAX_LECTURAS_POR_SENSOR = 200
const VACIO: readonly Medicion[] = []

const porSensor = new Map<string, Medicion[]>()
const contadores = new Map<string, number>()
const oyentes = new Set<() => void>()

function notificar(): void {
  for (const oyente of oyentes) oyente()
}

export function suscribirMediciones(_ambito: string, oyente: () => void): () => void {
  oyentes.add(oyente)
  return () => oyentes.delete(oyente)
}

export function obtenerMediciones(sensorId: string): readonly Medicion[] {
  return porSensor.get(sensorId) ?? VACIO
}

function semillaDe(sensorId: string): number {
  let hash = 0
  for (const letra of sensorId) hash = (Math.imul(hash, 31) + letra.charCodeAt(0)) | 0
  return hash >>> 0
}

/**
 * Añade una lectura simulada (los 4 tipos) al sensor, con marca de tiempo
 * actual. Determinista por (sensor, nº de lectura).
 */
export function generarLectura(sensorId: string): readonly Medicion[] {
  const numero = (contadores.get(sensorId) ?? 0) + 1
  contadores.set(sensorId, numero)

  const generador = crearGenerador(semillaDe(sensorId) + numero)
  const instante = new Date().toISOString()

  const nuevas: Medicion[] = TIPOS_MEDICION.map((tipo) =>
    generador.medicion({ sensorId, tipo, medidaEn: instante }),
  )

  const anteriores = porSensor.get(sensorId) ?? []
  const todas = [...anteriores, ...nuevas].slice(-MAX_LECTURAS_POR_SENSOR)
  porSensor.set(sensorId, todas)
  notificar()
  return todas
}

/**
 * Última lectura disponible por tipo entre los sensores indicados (la más
 * reciente gana); `undefined` si aún no hay datos.
 */
export function ultimasPorTipo(sensorIds: readonly string[]): Record<TipoMedicion, Medicion | undefined> {
  const resultado = {} as Record<TipoMedicion, Medicion | undefined>
  for (const tipo of TIPOS_MEDICION) resultado[tipo] = undefined

  for (const sensorId of sensorIds) {
    for (const medicion of porSensor.get(sensorId) ?? []) {
      const actual = resultado[medicion.tipo]
      if (!actual || medicion.medidaEn >= actual.medidaEn) {
        resultado[medicion.tipo] = medicion
      }
    }
  }
  return resultado
}

export function eliminarMediciones(sensorId: string): void {
  if (porSensor.delete(sensorId)) notificar()
  contadores.delete(sensorId)
}

/** Solo para tests: vuelve al estado inicial. */
export function reiniciarMediciones(): void {
  porSensor.clear()
  contadores.clear()
  notificar()
}

export const INTERVALO_SIMULADO_MS = INTERVALO_LECTURAS_MS // D15 (5 min)
