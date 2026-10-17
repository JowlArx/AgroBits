// T-15/T-25 — Store de alertas (R-13/R-14, modelo D14). Desde T-25 la
// EVALUACIÓN vive en la BD: un trigger sobre `measurements`
// (`evaluar_alertas_de_sensor`, migración T-25) crea, mantiene y resuelve las
// alertas con la regla del dominio, de modo que cualquier escritor de
// mediciones —la SPA hoy, el ESP32 o un generador continuo mañana— queda
// evaluado en un único punto, y el índice único parcial de D14
// (`alerts_unica_activa_por_cultivo_tipo`) hace imposible el duplicado bajo
// concurrencia. Este store es solo una fachada con caché síncrona que carga
// desde el ProveedorDatos (mismo patrón que cultivos/sensores/mediciones).

import { exigirProveedor } from './datos/proveedorDatos'
import type { TipoMedicion } from '../domain/tipos'

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

/** T-25: carga desde la BD las alertas de los cultivos del usuario (R-14). */
export async function cargarAlertas(): Promise<void> {
  try {
    alertas = await exigirProveedor().cargarAlertas()
    notificar()
  } catch (error) {
    console.error('No se pudieron cargar las alertas', error)
  }
}

/** Activas primero y, dentro de cada grupo, más recientes primero. */
export function alertasOrdenadas(): Alerta[] {
  const peso = (a: Alerta) => (a.estado === 'activa' ? 0 : 1)
  return [...alertas].sort((a, b) => peso(a) - peso(b) || b.creadaEn.localeCompare(a.creadaEn))
}

/** Vacia la caché local sin tocar el proveedor (cierre de sesión / tests). */
export function vaciarAlertas(): void {
  alertas = []
  notificar()
}
