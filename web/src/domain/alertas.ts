// T-11 — Evaluación de alertas (R-13, modelo D14):
// una única alerta activa por (cultivo, tipo) que se mantiene mientras la
// medición siga fuera de rango y se resuelve al volver al rango.

import type { Umbral } from './tipos'

/** Fuera de rango cuando el valor es estrictamente menor que el mínimo o
 *  estrictamente mayor que el máximo. Los valores exactos en el límite
 *  cuentan como dentro de rango. */
export function estaFueraDeRango(valor: number, umbral: Umbral): boolean {
  return valor < umbral.min || valor > umbral.max
}

export type AccionAlerta = 'crear' | 'mantener' | 'resolver' | 'ninguna'

/**
 * Decide qué hacer con la alerta de (cultivo, tipo) tras una nueva medición.
 * - 'crear'    → fuera de rango y no había alerta activa (R-13 AC1)
 * - 'mantener' → fuera de rango y ya había alerta activa: sin duplicados (AC2)
 * - 'resolver' → dentro de rango y había alerta activa (AC3)
 * - 'ninguna'  → dentro de rango y sin alerta previa (AC4)
 */
export function evaluarAlerta(
  valor: number,
  umbral: Umbral,
  hayAlertaActiva: boolean,
): AccionAlerta {
  const fuera = estaFueraDeRango(valor, umbral)
  if (fuera) return hayAlertaActiva ? 'mantener' : 'crear'
  return hayAlertaActiva ? 'resolver' : 'ninguna'
}
