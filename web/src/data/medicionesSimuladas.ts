// T-14/T-18/T-23 — Mediciones por SENSOR con contrato R-08/R-09 (Fase 2).
// Cada sensor tiene su propia serie: hasta que no hay lectura, la vista
// muestra "sin datos" (R-09 AC2) y nunca inventa valores. La generación sigue
// siendo determinista en cliente (T-12) pero cada lectura se PERSISTE ahora
// en Supabase a través del ProveedorDatos (T-23): lo que se muestra es lo que
// hay guardado en la BD. La frecuencia automática de 5 min/sensor (D15) la
// aportará T-24; el botón manual de la vista es una herramienta de prueba.

import type { Medicion, TipoMedicion } from '../domain/tipos'
import { TIPOS_MEDICION } from '../domain/tipos'
import { INTERVALO_LECTURAS_MS, crearGenerador } from './generador'
import { exigirProveedor } from './datos/proveedorDatos'

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

/** T-23: carga desde la BD las series de los sensores indicados (las sustituye). */
export async function cargarMediciones(sensorIds: readonly string[]): Promise<void> {
  try {
    const mediciones = await exigirProveedor().cargarMediciones(sensorIds)
    porSensor.clear()
    for (const medicion of mediciones) {
      const serie = porSensor.get(medicion.sensorId) ?? []
      serie.push(medicion)
      porSensor.set(medicion.sensorId, serie)
    }
    notificar()
  } catch (error) {
    console.error('No se pudieron cargar las mediciones', error)
  }
}

function semillaDe(sensorId: string): number {
  let hash = 0
  for (const letra of sensorId) hash = (Math.imul(hash, 31) + letra.charCodeAt(0)) | 0
  return hash >>> 0
}

/**
 * Añade una lectura simulada (los 4 tipos) al sensor con marca de tiempo
 * actual, tras persistirla en la BD. Determinista por (sensor, nº de
 * lectura). Si el proveedor falla, la caché no cambia y no se notifica (no se
 * muestra como guardada lo que no se guardó).
 */
export async function generarLectura(sensorId: string): Promise<readonly Medicion[]> {
  const numero = (contadores.get(sensorId) ?? 0) + 1
  contadores.set(sensorId, numero)

  const generador = crearGenerador(semillaDe(sensorId) + numero)
  const instante = new Date().toISOString()

  const nuevas: Medicion[] = TIPOS_MEDICION.map((tipo) =>
    generador.medicion({ sensorId, tipo, medidaEn: instante }),
  )

  const resultado = await exigirProveedor().registrarLectura(nuevas)
  if (!resultado.ok) {
    console.error('No se pudo registrar la lectura', resultado.errores)
    return porSensor.get(sensorId) ?? VACIO
  }

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

/** Borra de la BD (y de la caché) las series de los sensores indicados. */
export async function eliminarMediciones(sensorIds: readonly string[]): Promise<void> {
  if (sensorIds.length === 0) return
  await exigirProveedor().eliminarMediciones(sensorIds)
  let huboCambios = false
  for (const sensorId of sensorIds) {
    if (porSensor.delete(sensorId)) huboCambios = true
    contadores.delete(sensorId)
  }
  if (huboCambios) notificar()
}

/** Vacia la caché local sin tocar el proveedor (cierre de sesión / tests). */
export function vaciarMediciones(): void {
  porSensor.clear()
  contadores.clear()
  notificar()
}

/** Solo para tests: vuelve al estado inicial. */
export function reiniciarMediciones(): void {
  vaciarMediciones()
}

export const INTERVALO_SIMULADO_MS = INTERVALO_LECTURAS_MS // D15 (5 min)
