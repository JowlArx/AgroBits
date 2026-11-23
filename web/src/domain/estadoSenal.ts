// Estado de señal de un sensor (solo sensores reales). Módulo puro, sin React ni Supabase.

import type { Sensor } from '../data/storeSensores'

/** Un sensor real sin lecturas durante más de este tiempo se considera «Sin señal». */
export const UMBRAL_SIN_SENAL_MS = 15 * 60 * 1000

export type EstadoSenal = 'activo' | 'sin_senal' | 'nunca_envio'

/**
 * Estado del sensor real: 'activo' si envió hace poco, 'sin_senal' si su última
 * lectura supera el umbral, 'nunca_envio' si nunca envió y lleva creado más del
 * umbral, y null si no aplica (simulados o sensor real recién creado sin lecturas).
 */
export function estadoSenal(sensor: Sensor, ahora: number): EstadoSenal | null {
  if (sensor.origen !== 'real') return null
  if (sensor.ultimaVezVisto) {
    return ahora - Date.parse(sensor.ultimaVezVisto) > UMBRAL_SIN_SENAL_MS ? 'sin_senal' : 'activo'
  }
  if (sensor.creadoEn && ahora - Date.parse(sensor.creadoEn) > UMBRAL_SIN_SENAL_MS) return 'nunca_envio'
  return null
}
