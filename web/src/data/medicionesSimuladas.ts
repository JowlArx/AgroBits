// T-14 — Mediciones simuladas por cultivo (R-09, Fase 1).
// Cada cultivo tiene un sensor virtual cuyo historial empieza vacío: hasta
// que no llega una lectura, la vista muestra "sin datos" (R-09 AC2) y nunca
// inventa valores. En la Fase 2 este módulo se sustituirá por la capa de
// Supabase (T-23) con el mismo contrato de R-08.

import type { Cultivo, Medicion, TipoMedicion } from '../domain/tipos'
import { TIPOS_MEDICION } from '../domain/tipos'
import { INTERVALO_LECTURAS_MS, crearGenerador } from './generador'

const MAX_LECTURAS_POR_CULTIVO = 200
const VACIO: readonly Medicion[] = []

const porCultivo = new Map<string, Medicion[]>()
const contadores = new Map<string, number>()
const oyentes = new Set<() => void>()

function notificar(): void {
  for (const oyente of oyentes) oyente()
}

export function suscribirMediciones(_cultivoId: string, oyente: () => void): () => void {
  oyentes.add(oyente)
  return () => oyentes.delete(oyente)
}

export function obtenerMediciones(cultivoId: string): readonly Medicion[] {
  return porCultivo.get(cultivoId) ?? VACIO
}

function semillaDe(cultivoId: string): number {
  let hash = 0
  for (const letra of cultivoId) hash = (Math.imul(hash, 31) + letra.charCodeAt(0)) | 0
  return hash >>> 0
}

/**
 * Añade una lectura simulada (los 4 tipos) al sensor virtual del cultivo,
 * con marca de tiempo actual. Determinista por (cultivo, nº de lectura).
 */
export function generarLectura(cultivo: Cultivo): readonly Medicion[] {
  const numero = (contadores.get(cultivo.id) ?? 0) + 1
  contadores.set(cultivo.id, numero)

  const generador = crearGenerador(semillaDe(cultivo.id) + numero)
  const instante = new Date().toISOString()

  const nuevas: Medicion[] = TIPOS_MEDICION.map((tipo) =>
    generador.medicion({ sensorId: `sensor-${cultivo.id}`, tipo, medidaEn: instante }),
  )

  const anteriores = porCultivo.get(cultivo.id) ?? []
  const todas = [...anteriores, ...nuevas].slice(-MAX_LECTURAS_POR_CULTIVO)
  porCultivo.set(cultivo.id, todas)
  notificar()
  return todas
}

/** Última lectura disponible por tipo; `undefined` si aún no hay datos. */
export function ultimasPorTipo(cultivoId: string): Record<TipoMedicion, Medicion | undefined> {
  const resultado = {} as Record<TipoMedicion, Medicion | undefined>
  for (const tipo of TIPOS_MEDICION) resultado[tipo] = undefined

  for (const medicion of obtenerMediciones(cultivoId)) {
    resultado[medicion.tipo] = medicion
  }
  return resultado
}

export function eliminarMediciones(cultivoId: string): void {
  if (porCultivo.delete(cultivoId)) notificar()
  contadores.delete(cultivoId)
}

/** Solo para tests: vuelve al estado inicial. */
export function reiniciarMediciones(): void {
  porCultivo.clear()
  contadores.clear()
  notificar()
}

export const INTERVALO_SIMULADO_MS = INTERVALO_LECTURAS_MS // D15 (5 min)
