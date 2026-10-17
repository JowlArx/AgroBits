// T-11 — Tipos de medición del MVP (decisión D2) y modelos del dominio.
// Módulo puro: sin dependencias de UI, red ni almacenamiento.

export const TIPOS_MEDICION = [
  'humedad_suelo',
  'temperatura',
  'humedad_ambiental',
  'luminosidad',
] as const

export type TipoMedicion = (typeof TIPOS_MEDICION)[number]

export const UNIDADES: Record<TipoMedicion, string> = {
  humedad_suelo: '% vol',
  temperatura: '°C',
  humedad_ambiental: '% HR',
  luminosidad: 'lux',
}

/** Rangos plausibles para el generador de datos simulados (T-12). */
export const RANGOS_SIMULACION: Record<
  TipoMedicion,
  { min: number; max: number }
> = {
  humedad_suelo: { min: 5, max: 80 },
  temperatura: { min: 5, max: 40 },
  humedad_ambiental: { min: 20, max: 95 },
  luminosidad: { min: 0, max: 60_000 },
}

export interface Umbral {
  min: number
  max: number
}

export type UmbralesPorTipo = Record<TipoMedicion, Umbral>

export interface Cultivo {
  id: string
  nombre: string
  tipoCultivo: string
  umbrales: UmbralesPorTipo
}

export interface Sensor {
  id: string
  nombre: string
}

/** Contrato de medición (R-08): compartido por mocks, generador y futuro ESP32. */
export interface Medicion {
  sensorId: string
  tipo: TipoMedicion
  valor: number
  unidad: string
  medidaEn: string // fecha ISO 8601
}

export type EstadoAlerta = 'activa' | 'resuelta'

export interface Alerta {
  id: string
  cultivoId: string
  tipo: TipoMedicion
  valor: number
  estado: EstadoAlerta
}
