// T-23 — Implementación real del ProveedorDatos sobre Supabase (PostgREST).
// Traduce filas ⇄ modelos de dominio sin que las store ni las pantallas
// conozcan SQL. Puntos clave verificados en T-20/T-21:
//  - crops/sensors exigen `user_id`; se toma del token de sesión actual (RLS
//    `with check (user_id = auth.uid())` lo valida en el servidor).
//  - measurements y sensor_crop no llevan user_id: la herencia de propiedad
//    es vía sensor/crop y las políticas RLS filtran en consecuencia.
//  - `measured_at` llega como timestamptz con desplazamiento (`+00:00`); se
//    normaliza a ISO con `Z` para que las comparaciones lexicográficas de la
//    UI (R-09: "la más reciente gana") sigan siendo correctas.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { ColorSensor, Cultivo, Medicion, TipoMedicion, UmbralesPorTipo } from '../../domain/tipos'
import { TIPOS_MEDICION, esColorSensor } from '../../domain/tipos'
import type {
  NuevoCultivo,
  Perfil,
  ProveedorDatos,
  Localidad,
  Resultado,
  SolicitudEliminacion,
  AgregadoDiario,
} from './proveedorDatos'
import type { Sensor } from '../storeSensores'
import type { Alerta } from '../storeAlertas'
import { CATALOGO_CULTIVOS } from '../catalogo'

interface FilaUmbral {
  tipo: TipoMedicion
  min: number
  max: number
}

interface FilaCultivo {
  id: string
  name: string
  crop_type: string
  crop_thresholds: FilaUmbral[] | null
}

interface FilaSensor {
  id: string
  name: string
  color_linea?: string | null
  sensor_crop: { crop_id: string }[] | null
}

const SELECT_SENSOR = 'id, name, color_linea, sensor_crop(crop_id)'

interface FilaMedicion {
  sensor_id: string
  tipo: TipoMedicion
  value: number
  unit: string
  measured_at: string
}

interface FilaAgregado {
  sensor_id: string
  tipo: TipoMedicion
  dia: string
  valor_medio: number
  valor_min: number
  valor_max: number
  n: number
}

interface FilaAlerta {
  id: string
  crop_id: string
  tipo: TipoMedicion
  value: number
  estado: 'activa' | 'resuelta'
  created_at: string
  resolved_at: string | null
}

/** Umbrales de relleno si una fila falta (mismos límites que el catálogo base). */
const UMBRALES_BASE: UmbralesPorTipo = {
  humedad_suelo: { min: 0, max: 100 },
  temperatura: { min: 0, max: 40 },
  humedad_ambiental: { min: 0, max: 100 },
  luminosidad: { min: 0, max: 60_000 },
}

const MAX_LECTURAS_POR_SENSOR = 200

function aISO(texto: string): string {
  const fecha = new Date(texto)
  return Number.isNaN(fecha.getTime()) ? texto : fecha.toISOString()
}

function aUmbrales(filas: FilaUmbral[] | null): UmbralesPorTipo {
  const resultado: UmbralesPorTipo = { ...UMBRALES_BASE }
  for (const fila of filas ?? []) {
    if (TIPOS_MEDICION.includes(fila.tipo)) resultado[fila.tipo] = { min: fila.min, max: fila.max }
  }
  return resultado
}

function aCultivo(fila: FilaCultivo): Cultivo {
  return {
    id: fila.id,
    nombre: fila.name,
    tipoCultivo: fila.crop_type,
    umbrales: aUmbrales(fila.crop_thresholds),
  }
}

function aSensor(fila: FilaSensor): Sensor {
  return {
    id: fila.id,
    nombre: fila.name,
    cultivoIds: (fila.sensor_crop ?? []).map((enlace) => enlace.crop_id),
    // D30: si la fila viniera de una versión previa sin color, se usa el verde.
    colorLinea: esColorSensor(fila.color_linea ?? '') ? (fila.color_linea as ColorSensor) : 'verde',
  }
}

function aMedicion(fila: FilaMedicion): Medicion {
  return {
    sensorId: fila.sensor_id,
    tipo: fila.tipo,
    valor: fila.value,
    unidad: fila.unit,
    medidaEn: aISO(fila.measured_at),
  }
}

function aAgregado(fila: FilaAgregado): AgregadoDiario {
  return {
    sensorId: fila.sensor_id,
    tipo: fila.tipo,
    dia: fila.dia,
    valorMedio: fila.valor_medio,
    valorMin: fila.valor_min,
    valorMax: fila.valor_max,
    n: fila.n,
  }
}

function aAlerta(fila: FilaAlerta): Alerta {
  return {
    id: fila.id,
    cultivoId: fila.crop_id,
    tipo: fila.tipo,
    valor: fila.value,
    estado: fila.estado,
    creadaEn: aISO(fila.created_at),
    resueltaEn: fila.resolved_at ? aISO(fila.resolved_at) : undefined,
  }
}

const SERVIDOR = (motivo: string, accion: string): Resultado<never> => ({
  ok: false,
  errores: [{ campo: 'general', motivo: `No se pudo ${accion} en el servidor: ${motivo}` }],
})

export class ProveedorDatosSupabase implements ProveedorDatos {
  constructor(private readonly cliente: SupabaseClient) {}

  /** Identificador del usuario de la sesión actual (para los `user_id`). */
  private async usuarioActual(): Promise<string | null> {
    const { data } = await this.cliente.auth.getSession()
    return data.session?.user.id ?? null
  }

  // — Cultivos ————————————————————————————————————————————————

  async cargarCultivos(): Promise<Cultivo[]> {
    const { data, error } = await this.cliente
      .from('crops')
      .select('id, name, crop_type, crop_thresholds(tipo, min, max)')
      .order('created_at', { ascending: true })
    if (error) throw new Error(`No se pudieron cargar los cultivos (${error.message})`)
    return ((data ?? []) as unknown as FilaCultivo[]).map(aCultivo)
  }

  async crearCultivo(datos: NuevoCultivo): Promise<Resultado<Cultivo>> {
    const usuario = await this.usuarioActual()
    if (!usuario) return SERVIDOR('no hay sesión abierta', 'guardar el cultivo')

    const insertado = await this.cliente
      .from('crops')
      .insert({
        user_id: usuario,
        name: datos.nombre.trim(),
        crop_type: datos.tipoCultivo.trim(),
        es_personalizado: !CATALOGO_CULTIVOS.some((e) => e.tipoCultivo === datos.tipoCultivo.trim()),
      })
      .select('id')
      .single()
    if (insertado.error || !insertado.data) {
      const motivo = insertado.error?.message ?? 'sin identificador devuelto'
      console.error('crearCultivo:', insertado.error)
      return SERVIDOR(motivo, 'guardar el cultivo')
    }

    const id = (insertado.data as { id: string }).id
    if (!(await this.guardarUmbrales(id, datos.umbrales))) {
      // Compensación: no dejar un cultivo sin umbrales si falló la segunda fila.
      await this.cliente.from('crops').delete().eq('id', id)
      return SERVIDOR('no se pudieron guardar los umbrales', 'guardar el cultivo')
    }

    return {
      ok: true,
      valor: { id, nombre: datos.nombre.trim(), tipoCultivo: datos.tipoCultivo.trim(), umbrales: datos.umbrales },
    }
  }

  async actualizarCultivo(id: string, datos: NuevoCultivo): Promise<Resultado<Cultivo>> {
    const { error } = await this.cliente
      .from('crops')
      .update({
        name: datos.nombre.trim(),
        crop_type: datos.tipoCultivo.trim(),
        es_personalizado: !CATALOGO_CULTIVOS.some((e) => e.tipoCultivo === datos.tipoCultivo.trim()),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
    if (error) {
      console.error('actualizarCultivo:', error)
      return SERVIDOR(error.message, 'actualizar el cultivo')
    }
    if (!(await this.guardarUmbrales(id, datos.umbrales))) {
      return SERVIDOR('no se pudieron guardar los umbrales', 'actualizar el cultivo')
    }
    return {
      ok: true,
      valor: { id, nombre: datos.nombre.trim(), tipoCultivo: datos.tipoCultivo.trim(), umbrales: datos.umbrales },
    }
  }

  async eliminarCultivo(id: string): Promise<void> {
    const { error } = await this.cliente.from('crops').delete().eq('id', id)
    if (error) {
      console.error('eliminarCultivo:', error)
      throw new Error(`No se pudo eliminar el cultivo (${error.message})`)
    }
  }

  private async guardarUmbrales(cropId: string, umbrales: UmbralesPorTipo): Promise<boolean> {
    const filas = TIPOS_MEDICION.map((tipo) => ({
      crop_id: cropId,
      tipo,
      min: umbrales[tipo].min,
      max: umbrales[tipo].max,
    }))
    const { error } = await this.cliente.from('crop_thresholds').upsert(filas, { onConflict: 'crop_id,tipo' })
    if (error) {
      console.error('guardarUmbrales:', error)
      return false
    }
    return true
  }

  // — Sensores ———————————————————————————————————————————————

  async cargarSensores(): Promise<Sensor[]> {
    const { data, error } = await this.cliente
      .from('sensors')
      .select(SELECT_SENSOR)
      .order('created_at', { ascending: true })
    if (error) throw new Error(`No se pudieron cargar los sensores (${error.message})`)
    return ((data ?? []) as unknown as FilaSensor[]).map(aSensor)
  }

  async crearSensor(nombre: string): Promise<Resultado<Sensor>> {
    const usuario = await this.usuarioActual()
    if (!usuario) return SERVIDOR('no hay sesión abierta', 'guardar el sensor')

    const { data, error } = await this.cliente
      .from('sensors')
      .insert({ user_id: usuario, name: nombre.trim() })
      .select('id')
      .single()
    if (error || !data) {
      console.error('crearSensor:', error)
      return SERVIDOR(error?.message ?? 'sin identificador devuelto', 'guardar el sensor')
    }
    const id = (data as { id: string }).id
    return { ok: true, valor: { id, nombre: nombre.trim(), cultivoIds: [], colorLinea: 'verde' } }
  }

  async asociarSensor(sensorId: string, cultivoId: string): Promise<Resultado<Sensor>> {
    const enlace = await this.cliente
      .from('sensor_crop')
      .upsert({ sensor_id: sensorId, crop_id: cultivoId }, { onConflict: 'sensor_id,crop_id', ignoreDuplicates: true })
    if (enlace.error) {
      // La FK violada (cultivo inexistente) cae aquí: mismo mensaje de R-06.
      const motivo = enlace.error.message.toLowerCase().includes('foreign key') ? 'Cultivo no encontrado' : enlace.error.message
      console.error('asociarSensor:', enlace.error)
      return { ok: false, errores: [{ campo: 'cultivo', motivo }] }
    }

    const { data, error } = await this.cliente
      .from('sensors')
      .select(SELECT_SENSOR)
      .eq('id', sensorId)
      .single()
    if (error || !data) {
      console.error('asociarSensor (relectura):', error)
      return SERVIDOR(error?.message ?? 'sin datos', 'asociar el sensor')
    }
    return { ok: true, valor: aSensor(data as unknown as FilaSensor) }
  }

  /** D30: persiste el color de la línea del sensor (RLS sensors_update_own). */
  async actualizarColorSensor(sensorId: string, color: ColorSensor): Promise<Resultado<Sensor>> {
    if (!esColorSensor(color)) {
      return { ok: false, errores: [{ campo: 'color', motivo: 'Color de línea no disponible' }] }
    }
    const { error } = await this.cliente.from('sensors').update({ color_linea: color }).eq('id', sensorId)
    if (error) {
      console.error('actualizarColorSensor:', error)
      return SERVIDOR(error.message, 'guardar el color del sensor')
    }
    const { data, error: relectura } = await this.cliente
      .from('sensors')
      .select(SELECT_SENSOR)
      .eq('id', sensorId)
      .single()
    if (relectura || !data) {
      console.error('actualizarColorSensor (relectura):', relectura)
      return SERVIDOR(relectura?.message ?? 'sin datos', 'guardar el color del sensor')
    }
    return { ok: true, valor: aSensor(data as unknown as FilaSensor) }
  }

  /**
   * D34: desasocia un sensor de un cultivo. Borra SOLO el enlace N–N: el
   * sensor sigue en la cuenta del usuario (con sus lecturas) y deja de
   * estar en este cultivo.
   */
  async desasociarSensor(sensorId: string, cultivoId: string): Promise<Resultado<Sensor>> {
    const { error } = await this.cliente
      .from('sensor_crop')
      .delete()
      .eq('sensor_id', sensorId)
      .eq('crop_id', cultivoId)
    if (error) {
      console.error('desasociarSensor:', error)
      return SERVIDOR(error.message, 'desasociar el sensor')
    }

    const { data, error: relectura } = await this.cliente
      .from('sensors')
      .select(SELECT_SENSOR)
      .eq('id', sensorId)
      .single()
    if (relectura || !data) {
      console.error('desasociarSensor (relectura):', relectura)
      return SERVIDOR(relectura?.message ?? 'sin datos', 'desasociar el sensor')
    }
    return { ok: true, valor: aSensor(data as unknown as FilaSensor) }
  }

  /**
   * D34: elimina el sensor de la cuenta. Las FK `on delete cascade` borran
   * también sus enlaces (`sensor_crop`) y sus mediciones (`measurements`).
   */
  async eliminarSensor(sensorId: string): Promise<void> {
    const { error } = await this.cliente.from('sensors').delete().eq('id', sensorId)
    if (error) {
      console.error('eliminarSensor:', error)
      throw new Error(`No se pudo eliminar el sensor (${error.message})`)
    }
  }

  async quitarAsociacionesDeCultivo(cultivoId: string): Promise<string[]> {
    const previos = await this.cliente.from('sensor_crop').select('sensor_id').eq('crop_id', cultivoId)
    if (previos.error) throw new Error(`No se pudieron quitar las asociaciones (${previos.error.message})`)
    const sensorIds = ((previos.data ?? []) as { sensor_id: string }[]).map((f) => f.sensor_id)
    if (sensorIds.length === 0) return []

    const borradoEnlaces = await this.cliente.from('sensor_crop').delete().eq('crop_id', cultivoId)
    if (borradoEnlaces.error) throw new Error(`No se pudieron quitar las asociaciones (${borradoEnlaces.error.message})`)

    const restantes = await this.cliente.from('sensor_crop').select('sensor_id').in('sensor_id', sensorIds)
    if (restantes.error) throw new Error(`No se pudieron revisar los sensores (${restantes.error.message})`)
    const conCultivo = new Set(((restantes.data ?? []) as { sensor_id: string }[]).map((f) => f.sensor_id))
    const huerfanos = sensorIds.filter((id) => !conCultivo.has(id))
    if (huerfanos.length === 0) return []

    // El borrado en cascada de sensors elimina también sus measurements (FK).
    const borradoSensores = await this.cliente.from('sensors').delete().in('id', huerfanos)
    if (borradoSensores.error) throw new Error(`No se pudieron eliminar los sensores (${borradoSensores.error.message})`)
    return huerfanos
  }

  // — Mediciones —————————————————————————————————————————————

  async cargarMediciones(sensorIds: readonly string[]): Promise<Medicion[]> {
    const series = await Promise.all(
      sensorIds.map(async (sensorId) => {
        const { data, error } = await this.cliente
          .from('measurements')
          .select('sensor_id, tipo, value, unit, measured_at')
          .eq('sensor_id', sensorId)
          .order('measured_at', { ascending: false })
          .limit(MAX_LECTURAS_POR_SENSOR)
        if (error) throw new Error(`No se pudieron cargar las mediciones (${error.message})`)
        return ((data ?? []) as unknown as FilaMedicion[]).map(aMedicion).reverse()
      }),
    )
    return series.flat()
  }

  // — Historial de mediciones (R-H1, R-H4) ————————————————————————

  async cargarMedicionesRango(sensorIds: readonly string[], desde: string, hasta: string): Promise<Medicion[]> {
    if (sensorIds.length === 0) return []
    const { data, error } = await this.cliente
      .from('measurements')
      .select('sensor_id, tipo, value, unit, measured_at')
      .in('sensor_id', [...sensorIds])
      .gte('measured_at', desde)
      .lte('measured_at', hasta)
      .order('measured_at', { ascending: true })
      .limit(5000)
    if (error) throw new Error(`No se pudo cargar el historial (${error.message})`)
    return ((data ?? []) as unknown as FilaMedicion[]).map(aMedicion)
  }

  async cargarAgregadosDiarios(sensorIds: readonly string[], desde: string, hasta: string): Promise<AgregadoDiario[]> {
    if (sensorIds.length === 0) return []
    const { data, error } = await this.cliente
      .from('mediciones_diarias')
      .select('sensor_id, tipo, dia, valor_medio, valor_min, valor_max, n')
      .in('sensor_id', [...sensorIds])
      .gte('dia', desde.slice(0, 10))
      .lte('dia', hasta.slice(0, 10))
      .order('dia', { ascending: true })
    if (error) throw new Error(`No se pudieron cargar los agregados (${error.message})`)
    return ((data ?? []) as unknown as FilaAgregado[]).map(aAgregado)
  }

  async registrarLectura(mediciones: readonly Medicion[]): Promise<Resultado<Medicion[]>> {
    if (mediciones.length === 0) return { ok: true, valor: [] }
    const filas = mediciones.map((m) => ({
      sensor_id: m.sensorId,
      tipo: m.tipo,
      value: m.valor,
      unit: m.unidad,
      measured_at: m.medidaEn,
    }))
    const { error } = await this.cliente.from('measurements').insert(filas)
    if (error) {
      console.error('registrarLectura:', error)
      return SERVIDOR(error.message, 'registrar la lectura')
    }
    return { ok: true, valor: [...mediciones] }
  }

  async eliminarMediciones(sensorIds: readonly string[]): Promise<void> {
    if (sensorIds.length === 0) return
    const { error } = await this.cliente.from('measurements').delete().in('sensor_id', [...sensorIds])
    if (error) {
      console.error('eliminarMediciones:', error)
      throw new Error(`No se pudieron eliminar las mediciones (${error.message})`)
    }
  }

  // — Alertas (R-13/R-14) ————————————————————————————————————————

  // T-25: la evaluación (crear/mantener/resolver, D14) es del trigger de la
  // BD; aquí solo se leen las alertas de los cultivos del usuario (RLS).
  async cargarAlertas(): Promise<Alerta[]> {
    const { data, error } = await this.cliente
      .from('alerts')
      .select('id, crop_id, tipo, value, estado, created_at, resolved_at')
      .order('created_at', { ascending: false })
    if (error) throw new Error(`No se pudieron cargar las alertas (${error.message})`)
    return ((data ?? []) as unknown as FilaAlerta[]).map(aAlerta)
  }

  // — Catálogo de localidades (registro, D27 / R-01 v3) ————————————

  // Legible SIN sesión: el formulario de registro se carga antes del login y
  // la política `localidades_read` permite a `anon` y `authenticated` leer el
  // catálogo (dato de referencia sin datos personales).
  async cargarLocalidades(): Promise<Localidad[]> {
    const { data, error } = await this.cliente
      .from('localidades')
      .select('id, provincia, localidad')
      .order('provincia')
      .order('localidad')
    if (error) throw new Error(`No se pudo cargar el catálogo de localidades (${error.message})`)
    return (data ?? []) as Localidad[]
  }

  // — Perfil editable (D30) ————————————————————————————————————

  // Lectura propia (RLS `perfiles_select_own`, D27). Cuentas previas a D27
  // sin fila devuelven `null` y la vista ofrece el formulario vacío.
  async cargarPerfil(): Promise<Perfil | null> {
    const { data, error } = await this.cliente.from('perfiles').select('telefono, localidad_id').maybeSingle()
    if (error) {
      console.error('cargarPerfil:', error)
      return null
    }
    if (!data) return null
    const fila = data as { telefono: string; localidad_id: number }
    return { telefono: fila.telefono, localidadId: fila.localidad_id }
  }

  // Escritura vía RPC `actualizar_perfil` (SECURITY DEFINER, D19/D27): el
  // servidor valida teléfono y localidad y hace upsert del perfil propio.
  async actualizarPerfil(telefono: string, localidadId: number): Promise<Resultado<Perfil>> {
    const { data, error } = await this.cliente.rpc('actualizar_perfil', {
      p_telefono: telefono.trim(),
      p_localidad_id: localidadId,
    })
    if (error) {
      console.error('actualizarPerfil:', error)
      const motivo = error.message.includes('telefono_invalido')
        ? 'El teléfono debe tener entre 6 y 20 dígitos (admite +, espacios, paréntesis, puntos y guiones)'
        : error.message.includes('localidad_inexistente')
          ? 'La localidad seleccionada ya no está disponible'
          : error.message
      return { ok: false, errores: [{ campo: 'general', motivo: `No se pudo guardar el perfil: ${motivo}` }] }
    }
    const fila = data as { telefono: string; localidad_id: number } | null
    if (!fila) return SERVIDOR('sin datos devueltos', 'guardar el perfil')
    return { ok: true, valor: { telefono: fila.telefono, localidadId: fila.localidad_id } }
  }

  // — Eliminación de la cuenta (D46) ——————————————————————————————

  async cargarSolicitudEliminacion(): Promise<SolicitudEliminacion | null> {
    const { data, error } = await this.cliente
      .from('solicitudes_eliminacion')
      .select('programada_para')
      .maybeSingle()
    if (error) {
      console.error('cargarSolicitudEliminacion:', error)
      return null
    }
    const fila = data as { programada_para: string } | null
    if (!fila) return null
    return { programadaPara: fila.programada_para }
  }

  async solicitarEliminacion(confirmacionEmail: string): Promise<Resultado<string>> {
    const { data, error } = await this.cliente.rpc('solicitar_eliminacion_cuenta', {
      confirmacion_email: confirmacionEmail.trim(),
    })
    if (error) {
      console.error('solicitarEliminacion:', error)
      const motivo = error.message.includes('confirmacion_incorrecta')
        ? 'El email no coincide con el de tu cuenta'
        : error.message.includes('sesion_requerida')
          ? 'Inicia sesión de nuevo para continuar'
          : error.message
      return { ok: false, errores: [{ campo: 'confirmacion', motivo }] }
    }
    return { ok: true, valor: String(data) }
  }

  async cancelarEliminacion(): Promise<Resultado<null>> {
    const { error } = await this.cliente
      .from('solicitudes_eliminacion')
      .delete()
      .eq('user_id', (await this.cliente.auth.getUser()).data.user?.id ?? '')
    if (error) {
      console.error('cancelarEliminacion:', error)
      return { ok: false, errores: [{ campo: 'general', motivo: 'No se pudo cancelar el borrado. Inténtalo de nuevo.' }] }
    }
    return { ok: true, valor: null }
  }
}
