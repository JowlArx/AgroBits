// T-23 — Contrato de la capa de datos INTERCAMBIABLE (plan.md §2 y riesgo de
// lock-in de Supabase). Las stores de cultivos/sensores/mediciones no conocen
// la base de datos: delegan en este proveedor, siguiendo el mismo patrón que
// `ProveedorAuth` (T-22). Inyección: `ProveedorDatosSupabase` en `main.tsx`
// (aplicación real) y `DatosFalsos` en `src/tests/soporte/configurarTests.ts`.

import type { ColorSensor, Cultivo, Medicion, OrigenSensor, TipoMedicion, Umbral, UmbralesPorTipo } from '../../domain/tipos'
import type { Sensor } from '../storeSensores'
import type { Alerta } from '../storeAlertas'

export interface ErrorCampo {
  campo: string
  motivo: string
}

export type Resultado<T> =
  | { ok: true; valor: T }
  | { ok: false; errores: ErrorCampo[] }

export interface NuevoCultivo {
  nombre: string
  tipoCultivo: string
  umbrales: UmbralesPorTipo
}

/** Entrada del catálogo de cultivos (tabla `crop_type_catalog`, agrupada por tipo). */
export interface EntradaCatalogoCultivo {
  tipoCultivo: string
  /** Solo los tipos de medición que la base tiene por defecto para este cultivo. */
  umbrales: Partial<Record<TipoMedicion, Umbral>>
}

/** Fila del catálogo de localidades (registro, R-01 v3 / D27). */
export interface Localidad {
  id: number
  provincia: string
  localidad: string
}

/** D30 — Perfil editable del usuario (teléfono y localidad, D27). */
export interface Perfil {
  telefono: string
  localidadId: number
  /** Zona horaria IANA (p. ej. America/Argentina/Buenos_Aires). */
  zonaHoraria: string
}

export interface ProveedorDatos {
  // Cultivos (R-04, R-05, R-11, R-12)
  cargarCultivos(): Promise<Cultivo[]>
  crearCultivo(datos: NuevoCultivo): Promise<Resultado<Cultivo>>
  actualizarCultivo(id: string, datos: NuevoCultivo): Promise<Resultado<Cultivo>>
  eliminarCultivo(id: string): Promise<void>

  // Sensores y asociación N–N (R-06)
  cargarSensores(): Promise<Sensor[]>
  /** Última vez visto por sensor (máximo `last_seen_at` de sus tokens activos); null si nunca. */
  cargarUltimaVezVisto(sensorIds: readonly string[]): Promise<Record<string, string | null>>
  crearSensor(nombre: string): Promise<Resultado<Sensor>>
  asociarSensor(sensorId: string, cultivoId: string): Promise<Resultado<Sensor>>
  /** D34: desasocia un sensor de un cultivo (borra solo el enlace N–N). */
  desasociarSensor(sensorId: string, cultivoId: string): Promise<Resultado<Sensor>>
  /** D34: elimina el sensor de la cuenta (la BD borra en cascada enlaces y mediciones). */
  eliminarSensor(sensorId: string): Promise<void>
  /** Quita los enlaces del cultivo y devuelve los ids de sensores huérfanos eliminados. */
  quitarAsociacionesDeCultivo(cultivoId: string): Promise<string[]>
  /** D30: color de la línea del gráfico del sensor (paleta nombrada). */
  actualizarColorSensor(sensorId: string, color: ColorSensor): Promise<Resultado<Sensor>>
  actualizarOrigenSensor(sensorId: string, origen: OrigenSensor): Promise<Resultado<Sensor>>

  // Mediciones (contrato R-08 / R-09)
  cargarMediciones(sensorIds: readonly string[]): Promise<Medicion[]>
  /** Historial: mediciones crudas en un rango de fechas (para exportación y reciente). */
  cargarMedicionesRango(sensorIds: readonly string[], desde: string, hasta: string): Promise<Medicion[]>
  /** Historial: agregados diarios (media/mín/máx/n) por sensor y tipo en un rango. */
  cargarAgregadosDiarios(sensorIds: readonly string[], desde: string, hasta: string): Promise<AgregadoDiario[]>
  registrarLectura(mediciones: readonly Medicion[]): Promise<Resultado<Medicion[]>>
  eliminarMediciones(sensorIds: readonly string[]): Promise<void>

  // Alertas (R-13/R-14): T-25 evalúa en la BD (trigger); el cliente solo lee.
  cargarAlertas(): Promise<Alerta[]>

  // DLI de ayer (UTC, R-H4) de un cultivo (si se pasa cropId) o de la cuenta:
  // media entre sensores con lecturas de luz ayer;
  // `null` si no hay datos. Calculo en el proveedor, no en la store.
  consultarDliDeAyer(cropId?: string): Promise<number | null>

  // Banda DLI (mol/m²/día) del tipo de cultivo, desde el perfil público
  // `crop_type_perfil` (RLS de lectura pública). `null` si no hay fila.
  consultarBandaDli(cropType: string): Promise<{ min: number; max: number } | null>

  // Catálogo de localidades (registro, D27): legible SIN sesión (el registro
  // es anónimo; RLS de `localidades` lo permite).
  cargarLocalidades(): Promise<Localidad[]>

  // Catálogo de cultivos (tabla `crop_type_catalog`): tipos y umbrales por defecto.
  cargarCatalogoCultivos(): Promise<EntradaCatalogoCultivo[]>

  // Perfil (D30): lectura propia (RLS) y escritura vía RPC `actualizar_perfil`
  // (único punto servidor, D19/D27). `null` si la cuenta no tiene fila.
  cargarPerfil(): Promise<Perfil | null>
  actualizarPerfil(telefono: string, localidadId: number, zonaHoraria: string): Promise<Resultado<Perfil>>

  // Eliminación de la cuenta (D46): petición con 7 días de gracia, mediante
  // RPC `solicitar_eliminacion_cuenta` (SECURITY DEFINER). El servidor exige
  // que el email escrito coincida con el de la sesión.
  /** Estado de la solicitud: `null` si no hay ninguna pendiente. */
  cargarSolicitudEliminacion(): Promise<SolicitudEliminacion | null>
  /** Pide el borrado; devuelve la fecha programada (7 días después). */
  solicitarEliminacion(confirmacionEmail: string): Promise<Resultado<string>>
  /** Cancela la solicitud pendiente (dentro del período de gracia). */
  cancelarEliminacion(): Promise<Resultado<null>>

  // Tokens de dispositivo (ingesta `x-device-token`). El token en claro NUNCA
  // llega al proveedor: solo se persiste su SHA-256 hex (`device_tokens.token_hash`).
  registrarTokenDispositivo(sensorId: string, nombre: string, tokenHash: string): Promise<Resultado<{ id: string }>>
  /** Metadatos de los tokens del sensor (sin hash). */
  cargarTokensDispositivo(sensorId: string): Promise<TokenDispositivo[]>
  /** Revoca el token: `activo = false` y `revoked_at = now()`. */
  revocarTokenDispositivo(id: string): Promise<Resultado<null>>
  /** Revoca en una sola sentencia todos los tokens ACTIVOS del sensor (atómico en BD). */
  revocarTokensDeSensor(sensorId: string): Promise<Resultado<null>>
}

/** Token de dispositivo visible en la UI (nunca incluye el hash). */
export interface TokenDispositivo {
  id: string
  nombre: string
  activo: boolean
  createdAt: string
  lastSeenAt: string | null
  revokedAt: string | null
}

/** Solicitud de eliminación pendiente (D46). */
export interface SolicitudEliminacion {
  /** Fecha en que se borrará la cuenta (7 días después de pedirlo). */
  programadaPara: string
}

/** Agregado diario de mediciones (historial, R-H4). */
export interface AgregadoDiario {
  sensorId: string
  tipo: TipoMedicion
  dia: string // fecha ISO (YYYY-MM-DD)
  valorMedio: number
  valorMin: number
  valorMax: number
  n: number
}

let proveedor: ProveedorDatos | null = null

/** Inyecta el proveedor de datos (una vez, al arrancar la app o el test). */
export function configurarProveedorDatos(nuevo: ProveedorDatos): void {
  proveedor = nuevo
}

export function exigirProveedor(): ProveedorDatos {
  if (!proveedor) throw new Error('Proveedor de datos no configurado (ver main.tsx)')
  return proveedor
}
