// T-12 — Generador de datos simulados en cliente (R-10 AC1).
// Produce mediciones que cumplen el contrato de R-08 (sensorId, tipo, valor,
// unidad, medidaEn). Determinista con semilla para que los tests sean
// reproducibles. La frecuencia por defecto es de 1 lectura cada 5 minutos
// por sensor (decisión D15), la misma que usará el generador de Fase 2.

import {
  RANGOS_SIMULACION,
  TIPOS_MEDICION,
  UNIDADES,
  type Medicion,
  type TipoMedicion,
} from '../domain/tipos'

/** PRNG mulberry32: pequeño, reproducible y sin dependencias. */
function mulberry32(semilla: number): () => number {
  let estado = semilla >>> 0
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0
    let t = estado
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Decimales apropiados por tipo: % y °C con un decimal, lux entero. */
const DECIMALES: Record<TipoMedicion, number> = {
  humedad_suelo: 1,
  temperatura: 1,
  humedad_ambiental: 1,
  luminosidad: 0,
}

export interface EntradaMedicion {
  sensorId: string
  tipo: TipoMedicion
  /** ISO 8601. Si se omite, se usa la fecha actual. */
  medidaEn?: string
}

export interface Generador {
  /** Genera una medición aleatoria plausible dentro del rango del tipo. */
  medicion(entrada: EntradaMedicion): Medicion
}

export function crearGenerador(semilla = 1): Generador {
  const aleatorio = mulberry32(semilla)

  return {
    medicion({ sensorId, tipo, medidaEn }: EntradaMedicion): Medicion {
      const rango = RANGOS_SIMULACION[tipo]
      const bruto = rango.min + aleatorio() * (rango.max - rango.min)
      const factor = 10 ** DECIMALES[tipo]

      return {
        sensorId,
        tipo,
        valor: Math.round(bruto * factor) / factor,
        unidad: UNIDADES[tipo],
        medidaEn: medidaEn ?? new Date().toISOString(),
      }
    },
  }
}

export const INTERVALO_LECTURAS_MS = 5 * 60 * 1000 // D15: 5 minutos

export interface EntradaSerie {
  sensorId: string
  tipos?: readonly TipoMedicion[]
  /** ISO 8601 de la primera lectura. */
  desde: string
  /** Número de lecturas por tipo. */
  cantidad: number
  intervaloMs?: number
}

/**
 * Genera una serie de mediciones a intervalos regulares (por defecto 5 min)
 * para los tipos indicados. Determinista para la misma semilla.
 */
export function generarSerie(
  generador: Generador,
  { sensorId, tipos = TIPOS_MEDICION, desde, cantidad, intervaloMs = INTERVALO_LECTURAS_MS }: EntradaSerie,
): Medicion[] {
  const inicio = Date.parse(desde)
  const mediciones: Medicion[] = []

  for (let i = 0; i < cantidad; i++) {
    const instante = new Date(inicio + i * intervaloMs).toISOString()
    for (const tipo of tipos) {
      mediciones.push(generador.medicion({ sensorId, tipo, medidaEn: instante }))
    }
  }

  return mediciones
}
