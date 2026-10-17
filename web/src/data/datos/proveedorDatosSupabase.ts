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
import type { Cultivo, Medicion, TipoMedicion, UmbralesPorTipo } from '../../domain/tipos'
import { TIPOS_MEDICION } from '../../domain/tipos'
import type { NuevoCultivo, ProveedorDatos, Resultado } from './proveedorDatos'
import type { Sensor } from '../storeSensores'
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
  sensor_crop: { crop_id: string }[] | null
}

interface FilaMedicion {
  sensor_id: string
  tipo: TipoMedicion
  value: number
  unit: string
  measured_at: string
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
      .select('id, name, sensor_crop(crop_id)')
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
    return { ok: true, valor: { id, nombre: nombre.trim(), cultivoIds: [] } }
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
      .select('id, name, sensor_crop(crop_id)')
      .eq('id', sensorId)
      .single()
    if (error || !data) {
      console.error('asociarSensor (relectura):', error)
      return SERVIDOR(error?.message ?? 'sin datos', 'asociar el sensor')
    }
    return { ok: true, valor: aSensor(data as unknown as FilaSensor) }
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
}
