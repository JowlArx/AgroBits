// T-15 — Store de alertas (R-13/R-14, modelo D14).
// Una única alerta ACTIVA por (cultivo, tipo): se crea al salir del rango,
// se mantiene mientras persista (sin duplicados) y se resuelve al volver
// dentro de rango. Usa la regla pura evaluarAlerta() de T-11.

import { evaluarAlerta } from '../domain/alertas'
import { TIPOS_MEDICION, type Cultivo, type Medicion, type TipoMedicion } from '../domain/tipos'

export interface Alerta {
  id: string
  cultivoId: string
  tipo: TipoMedicion
  valor: number
  estado: 'activa' | 'resuelta'
  creadaEn: string
  resueltaEn?: string
}

let alertas: Alerta[] = []
let contador = 0
const oyentes = new Set<() => void>()

function notificar(): void {
  alertas = [...alertas]
  for (const oyente of oyentes) oyente()
}

export function suscribirAlertas(oyente: () => void): () => void {
  oyentes.add(oyente)
  return () => oyentes.delete(oyente)
}

export function obtenerAlertas(): Alerta[] {
  return alertas
}

function buscarActiva(cultivoId: string, tipo: TipoMedicion): Alerta | undefined {
  return alertas.find((a) => a.cultivoId === cultivoId && a.tipo === tipo && a.estado === 'activa')
}

/**
 * Evalúa las últimas mediciones de cada tipo frente a los umbrales del
 * cultivo y aplica el modelo D14 (crear / mantener / resolver / nada).
 */
export function procesarLecturas(
  cultivo: Cultivo,
  ultimas: Record<TipoMedicion, Medicion | undefined>,
): void {
  let huboCambios = false

  for (const tipo of TIPOS_MEDICION) {
    const medicion = ultimas[tipo]
    if (!medicion) continue

    const activa = buscarActiva(cultivo.id, tipo)
    const accion = evaluarAlerta(medicion.valor, cultivo.umbrales[tipo], activa !== undefined)

    if (accion === 'crear') {
      alertas.push({
        id: `a${++contador}`,
        cultivoId: cultivo.id,
        tipo,
        valor: medicion.valor,
        estado: 'activa',
        creadaEn: medicion.medidaEn,
      })
      huboCambios = true
    } else if (accion === 'mantener' && activa) {
      // La alerta activa pasa a reflejar la última lectura (sin duplicar).
      alertas = alertas.map((a) => (a.id === activa.id ? { ...a, valor: medicion.valor } : a))
      huboCambios = true
    } else if (accion === 'resolver' && activa) {
      alertas = alertas.map((a) =>
        a.id === activa.id ? { ...a, estado: 'resuelta' as const, valor: medicion.valor, resueltaEn: medicion.medidaEn } : a,
      )
      huboCambios = true
    }
  }

  if (huboCambios) notificar()
}

/** Activas primero y, dentro de cada grupo, más recientes primero. */
export function alertasOrdenadas(): Alerta[] {
  const peso = (a: Alerta) => (a.estado === 'activa' ? 0 : 1)
  return [...alertas].sort((a, b) => peso(a) - peso(b) || b.creadaEn.localeCompare(a.creadaEn))
}

export function reiniciarAlertas(): void {
  alertas = []
  contador = 0
  notificar()
}

/**
 * Hallazgo de la revisión T-17 (M3): al eliminar un cultivo sus alertas no
 * deben quedar huérfanas (mismo criterio de limpieza que T-18 aplicó a
 * asociaciones y mediciones).
 */
export function eliminarAlertasDeCultivo(cultivoId: string): void {
  const antes = alertas.length
  alertas = alertas.filter((a) => a.cultivoId !== cultivoId)
  if (alertas.length !== antes) notificar()
}
