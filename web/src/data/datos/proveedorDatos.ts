// T-23 — Contrato de la capa de datos INTERCAMBIABLE (plan.md §2 y riesgo de
// lock-in de Supabase). Las stores de cultivos/sensores/mediciones no conocen
// la base de datos: delegan en este proveedor, siguiendo el mismo patrón que
// `ProveedorAuth` (T-22). Inyección: `ProveedorDatosSupabase` en `main.tsx`
// (aplicación real) y `DatosFalsos` en `src/tests/soporte/configurarTests.ts`.

import type { ColorSensor, Cultivo, Medicion, UmbralesPorTipo } from '../../domain/tipos'
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
}

export interface ProveedorDatos {
  // Cultivos (R-04, R-05, R-11, R-12)
  cargarCultivos(): Promise<Cultivo[]>
  crearCultivo(datos: NuevoCultivo): Promise<Resultado<Cultivo>>
  actualizarCultivo(id: string, datos: NuevoCultivo): Promise<Resultado<Cultivo>>
  eliminarCultivo(id: string): Promise<void>

  // Sensores y asociación N–N (R-06)
  cargarSensores(): Promise<Sensor[]>
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

  // Mediciones (contrato R-08 / R-09)
  cargarMediciones(sensorIds: readonly string[]): Promise<Medicion[]>
  registrarLectura(mediciones: readonly Medicion[]): Promise<Resultado<Medicion[]>>
  eliminarMediciones(sensorIds: readonly string[]): Promise<void>

  // Alertas (R-13/R-14): T-25 evalúa en la BD (trigger); el cliente solo lee.
  cargarAlertas(): Promise<Alerta[]>

  // Catálogo de localidades (registro, D27): legible SIN sesión (el registro
  // es anónimo; RLS de `localidades` lo permite).
  cargarLocalidades(): Promise<Localidad[]>

  // Perfil (D30): lectura propia (RLS) y escritura vía RPC `actualizar_perfil`
  // (único punto servidor, D19/D27). `null` si la cuenta no tiene fila.
  cargarPerfil(): Promise<Perfil | null>
  actualizarPerfil(telefono: string, localidadId: number): Promise<Resultado<Perfil>>

  // Eliminación de la cuenta (D46): petición con 7 días de gracia, mediante
  // RPC `solicitar_eliminacion_cuenta` (SECURITY DEFINER). El servidor exige
  // que el email escrito coincida con el de la sesión.
  /** Estado de la solicitud: `null` si no hay ninguna pendiente. */
  cargarSolicitudEliminacion(): Promise<SolicitudEliminacion | null>
  /** Pide el borrado; devuelve la fecha programada (7 días después). */
  solicitarEliminacion(confirmacionEmail: string): Promise<Resultado<string>>
  /** Cancela la solicitud pendiente (dentro del período de gracia). */
  cancelarEliminacion(): Promise<Resultado<null>>
}

/** Solicitud de eliminación pendiente (D46). */
export interface SolicitudEliminacion {
  /** Fecha en que se borrará la cuenta (7 días después de pedirlo). */
  programadaPara: string
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
