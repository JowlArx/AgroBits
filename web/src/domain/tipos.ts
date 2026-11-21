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

/** Tipos de alerta: las mediciones más los índices diarios calculados en la BD. */
export type TipoAlerta = TipoMedicion | 'dli' | 'sol_directo'

/** Unidad de cada tipo de alerta: las mediciones usan UNIDADES; DLI y sol directo, sus propias. */
export const UNIDADES_ALERTA: Record<TipoAlerta, string> = {
  ...UNIDADES,
  dli: 'mol/m²/día',
  sol_directo: 'h',
}

/** Umbrales precargados en cultivos nuevos para los tipos que los tienen por defecto. */
export const UMBRALES_POR_DEFECTO: Partial<Record<TipoMedicion, Umbral>> = {
  luminosidad: { min: 100, max: 1500 },
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

// La luminosidad no tiene umbral en lux: se evalúa por DLI (perfil del cultivo).
export type UmbralesPorTipo = Record<Exclude<TipoMedicion, 'luminosidad'>, Umbral> &
  Partial<Record<'luminosidad', Umbral>>

export interface Cultivo {
  id: string
  nombre: string
  tipoCultivo: string
  umbrales: UmbralesPorTipo
}

/** Origen de las lecturas: `simulado` (genera el simulador de la SPA) o `real` (hardware; el simulador no actúa). */
export type OrigenSensor = 'simulado' | 'real'

export interface Sensor {
  id: string
  nombre: string
  origen: OrigenSensor
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
  tipo: TipoAlerta
  valor: number
  estado: EstadoAlerta
}

// D30 — Paleta nombrada del color de línea de cada sensor. Se persiste el
// ID (validado con CHECK en BD), nunca un hex: así el tema claro/oscuro
// decide el valor real vía CSS (var(--linea-<color>)). Sin ámbar/rojo para
// no competir con la señal de alertas (D20).
export const COLORES_SENSOR = ['verde', 'azul', 'violeta', 'cian', 'rosa', 'gris'] as const

export type ColorSensor = (typeof COLORES_SENSOR)[number]

export function esColorSensor(valor: string): valor is ColorSensor {
  return (COLORES_SENSOR as readonly string[]).includes(valor)
}
