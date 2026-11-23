// T-23/T-25 — Doble en memoria del ProveedorDatos para los tests (sin red).
// Sustituye a la lógica en memoria de la Fase 1: las stores pasaron a delegar
// en el proveedor, de modo que estas pruebas ejercitan el mismo flujo que la
// aplicación real (store → proveedor → caché), con ids `cN`/`sN` estables
// (mismo criterio de numeración que la Fase 1, esperado por los tests).
// T-25: `registrarLectura` EMULA el trigger de la BD (evaluación D14 con la
// misma regla del dominio de T-11) y `cargarAlertas` devuelve el resultado;
// la semántica REAL del trigger se verifica con la suite SQL versionada en
// `supabase/tests/20261017_t25_evaluacion_alertas.sql`.

import { evaluarAlerta } from '../../domain/alertas'
import {
  TIPOS_MEDICION,
  esColorSensor,
  type ColorSensor,
  type Cultivo,
  type Medicion,
  type TipoMedicion,
} from '../../domain/tipos'
import type {
  AgregadoDiario,
  EntradaCatalogoCultivo,
  ErrorCampo,
  Localidad,
  NuevoCultivo,
  Perfil,
  ProveedorDatos,
  Resultado,
  TokenDispositivo,
} from '../../data/datos/proveedorDatos'
import type { Sensor } from '../../data/storeSensores'
import type { Alerta } from '../../data/storeAlertas'

/** Catálogo mínimo para los tests de UI del registro (D27). */
const LOCALIDADES_FALSAS: Localidad[] = [
  { id: 1, provincia: 'Buenos Aires', localidad: 'La Plata' },
  { id: 2, provincia: 'Buenos Aires', localidad: 'Mar del Plata' },
  { id: 3, provincia: 'Córdoba', localidad: 'Córdoba' },
  { id: 4, provincia: 'Santa Fe', localidad: 'Rosario' },
  { id: 5, provincia: 'Mendoza', localidad: 'Mendoza' },
]

/** Catálogo de cultivos del doble (T2): los 4 tipos estáticos más uno solo de la base. */
const CATALOGO_FALSO: EntradaCatalogoCultivo[] = [
  { tipoCultivo: 'Tomate', umbrales: { humedad_suelo: { min: 40, max: 75 }, temperatura: { min: 15, max: 28 }, humedad_ambiental: { min: 50, max: 80 } } },
  { tipoCultivo: 'Lechuga', umbrales: { humedad_suelo: { min: 45, max: 75 }, temperatura: { min: 10, max: 22 }, humedad_ambiental: { min: 50, max: 80 } } },
  { tipoCultivo: 'Albahaca', umbrales: { humedad_suelo: { min: 40, max: 70 }, temperatura: { min: 18, max: 30 }, humedad_ambiental: { min: 50, max: 80 } } },
  { tipoCultivo: 'Pimiento', umbrales: { humedad_suelo: { min: 40, max: 70 }, temperatura: { min: 16, max: 30 }, humedad_ambiental: { min: 50, max: 80 } } },
  // Solo en la base: sin luminosidad, para probar el relleno con UMBRALES_POR_DEFECTO.
  { tipoCultivo: 'Zanahoria', umbrales: { humedad_suelo: { min: 60, max: 85 }, temperatura: { min: 7, max: 24 } } },
]

/** Valida una zona IANA con el mismo criterio que el servidor (`pg_timezone_names`). */
function zonaValida(zona: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zona })
    return true
  } catch {
    return false
  }
}

const exito = <T>(valor: T): Resultado<T> => ({ ok: true, valor })
const fallo = (errores: ErrorCampo[]): Resultado<never> => ({ ok: false, errores })

export class DatosFalsos implements ProveedorDatos {
  private cultivos: Cultivo[] = []
  private contadorCultivo = 0
  private sensores: Sensor[] = []
  private contadorSensor = 0
  private ultimasVistas = new Map<string, string | null>()
  private mediciones = new Map<string, Medicion[]>()
  private alertas: Alerta[] = []

  /** Solo para tests: añade una alerta ya construida (p. ej. resueltas para probar el historial paginado) sin depender de lecturas. */
  sembrarAlerta(alerta: Alerta): void {
    this.alertas = [...this.alertas, alerta]
  }
  private contadorAlerta = 0
  private perfil: Perfil | null = null

  // — Cultivos ————————————————————————————————————————————————

  async cargarCultivos(): Promise<Cultivo[]> {
    return this.cultivos.map((c) => ({ ...c, umbrales: { ...c.umbrales } }))
  }

  async crearCultivo(datos: NuevoCultivo): Promise<Resultado<Cultivo>> {
    const cultivo: Cultivo = {
      id: `c${++this.contadorCultivo}`,
      nombre: datos.nombre.trim(),
      tipoCultivo: datos.tipoCultivo.trim(),
      umbrales: datos.umbrales,
    }
    this.cultivos.push(cultivo)
    return exito(cultivo)
  }

  async actualizarCultivo(id: string, datos: NuevoCultivo): Promise<Resultado<Cultivo>> {
    const indice = this.cultivos.findIndex((c) => c.id === id)
    if (indice < 0) return fallo([{ campo: 'id', motivo: 'Cultivo no encontrado' }])
    const actualizado: Cultivo = {
      id,
      nombre: datos.nombre.trim(),
      tipoCultivo: datos.tipoCultivo.trim(),
      umbrales: datos.umbrales,
    }
    this.cultivos[indice] = actualizado
    return exito(actualizado)
  }

  async eliminarCultivo(id: string): Promise<void> {
    this.cultivos = this.cultivos.filter((c) => c.id !== id)
    // Emula la cascada de la BD (`alerts.crop_id ... on delete cascade`).
    this.alertas = this.alertas.filter((a) => a.cultivoId !== id)
  }

  // — Sensores ———————————————————————————————————————————————

  async cargarSensores(): Promise<Sensor[]> {
    return this.sensores.map((s) => ({
      ...s,
      cultivoIds: [...s.cultivoIds],
      ultimaVezVisto: this.ultimasVistas.get(s.id) ?? null,
    }))
  }

  /** Solo para tests: fija la última vez visto de un sensor (null = nunca ha enviado). */
  marcarUltimaVezVisto(sensorId: string, iso: string | null): void {
    this.ultimasVistas.set(sensorId, iso)
  }

  async cargarUltimaVezVisto(sensorIds: readonly string[]): Promise<Record<string, string | null>> {
    const resultado: Record<string, string | null> = {}
    for (const id of sensorIds) resultado[id] = this.ultimasVistas.get(id) ?? null
    return resultado
  }

  async crearSensor(nombre: string): Promise<Resultado<Sensor>> {
    const sensor: Sensor = {
      id: `s${++this.contadorSensor}`,
      creadoEn: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      nombre: nombre.trim(),
      cultivoIds: [],
      colorLinea: 'verde',
      origen: 'simulado',
    }
    this.sensores.push(sensor)
    return exito(sensor)
  }

  /** Solo para tests: fija la fecha de creación de un sensor (cargarSensores la devuelve en `creadoEn`). */
  marcarCreadoEn(sensorId: string, iso: string): void {
    this.sensores = this.sensores.map((s) => (s.id === sensorId ? { ...s, creadoEn: iso } : s))
  }

  /** Solo para tests: cambia el origen de un sensor (p. ej. a `real`). */
  marcarOrigen(sensorId: string, origen: Sensor['origen']): void {
    this.sensores = this.sensores.map((s) => (s.id === sensorId ? { ...s, origen } : s))
  }

  /** Emula el update de `sensors.origen` en la BD y devuelve la fila actualizada. */
  async actualizarOrigenSensor(sensorId: string, origen: Sensor['origen']): Promise<Resultado<Sensor>> {
    const sensor = this.sensores.find((s) => s.id === sensorId)
    if (!sensor) return fallo([{ campo: 'sensor', motivo: 'Sensor no encontrado' }])
    if (origen !== 'real' && origen !== 'simulado') {
      return fallo([{ campo: 'origen', motivo: 'Origen de sensor no válido' }])
    }
    const actualizado: Sensor = { ...sensor, origen }
    this.sensores = this.sensores.map((s) => (s.id === sensorId ? actualizado : s))
    return exito({ ...actualizado, cultivoIds: [...actualizado.cultivoIds] })
  }

  async asociarSensor(sensorId: string, cultivoId: string): Promise<Resultado<Sensor>> {
    const sensor = this.sensores.find((s) => s.id === sensorId)
    if (!sensor) return fallo([{ campo: 'sensor', motivo: 'Sensor no encontrado' }])
    if (!sensor.cultivoIds.includes(cultivoId)) sensor.cultivoIds.push(cultivoId)
    return exito({ ...sensor, cultivoIds: [...sensor.cultivoIds] })
  }

  /** D34: desasocia el sensor de un cultivo (borra solo el enlace N–N). */
  async desasociarSensor(sensorId: string, cultivoId: string): Promise<Resultado<Sensor>> {
    const sensor = this.sensores.find((s) => s.id === sensorId)
    if (!sensor) return fallo([{ campo: 'sensor', motivo: 'Sensor no encontrado' }])
    const actualizado: Sensor = { ...sensor, cultivoIds: sensor.cultivoIds.filter((id) => id !== cultivoId) }
    this.sensores = this.sensores.map((s) => (s.id === sensorId ? actualizado : s))
    return exito({ ...actualizado, cultivoIds: [...actualizado.cultivoIds] })
  }

  /** D34: elimina el sensor (la BD borra en cascada enlaces y mediciones). */
  async eliminarSensor(sensorId: string): Promise<void> {
    this.sensores = this.sensores.filter((s) => s.id !== sensorId)
    this.mediciones.delete(sensorId)
  }

  async quitarAsociacionesDeCultivo(cultivoId: string): Promise<string[]> {
    const borrados: string[] = []
    const restantes: Sensor[] = []
    for (const sensor of this.sensores) {
      if (!sensor.cultivoIds.includes(cultivoId)) {
        restantes.push(sensor)
        continue
      }
      const cultivoIds = sensor.cultivoIds.filter((id) => id !== cultivoId)
      if (cultivoIds.length === 0) {
        // Sin cultivos: se elimina el sensor (y sus mediciones, como en la BD).
        borrados.push(sensor.id)
        this.mediciones.delete(sensor.id)
      } else {
        restantes.push({ ...sensor, cultivoIds })
      }
    }
    this.sensores = restantes
    return borrados
  }

  /** D30: aplica el color a la caché del doble (emula el update de la BD). */
  async actualizarColorSensor(sensorId: string, color: ColorSensor): Promise<Resultado<Sensor>> {
    const sensor = this.sensores.find((s) => s.id === sensorId)
    if (!sensor) return fallo([{ campo: 'sensor', motivo: 'Sensor no encontrado' }])
    if (!esColorSensor(color)) return fallo([{ campo: 'color', motivo: 'Color de línea no disponible' }])
    const actualizado: Sensor = { ...sensor, colorLinea: color }
    this.sensores = this.sensores.map((s) => (s.id === sensorId ? actualizado : s))
    return exito({ ...actualizado, cultivoIds: [...actualizado.cultivoIds] })
  }

  // — Mediciones —————————————————————————————————————————————

  async cargarMediciones(sensorIds: readonly string[]): Promise<Medicion[]> {
    const resultado: Medicion[] = []
    for (const id of sensorIds) resultado.push(...(this.mediciones.get(id) ?? []))
    return resultado
  }

  async cargarMedicionesRango(sensorIds: readonly string[], desde: string, hasta: string): Promise<Medicion[]> {
    const desdeMs = Date.parse(desde)
    const hastaMs = Date.parse(hasta)
    const resultado: Medicion[] = []
    for (const id of sensorIds) {
      for (const m of this.mediciones.get(id) ?? []) {
        const t = Date.parse(m.medidaEn)
        if (t >= desdeMs && t <= hastaMs) resultado.push(m)
      }
    }
    return resultado.sort((a, b) => a.medidaEn.localeCompare(b.medidaEn))
  }

  async cargarAgregadosDiarios(sensorIds: readonly string[], desde: string, hasta: string): Promise<AgregadoDiario[]> {
    const desdeMs = Date.parse(desde)
    const hastaMs = Date.parse(hasta)
    const grupos = new Map<string, { sensorId: string; tipo: TipoMedicion; dia: string; vals: number[] }>()
    for (const id of sensorIds) {
      for (const m of this.mediciones.get(id) ?? []) {
        const t = Date.parse(m.medidaEn)
        if (t < desdeMs || t > hastaMs) continue
        const dia = m.medidaEn.slice(0, 10)
        const clave = `${m.sensorId}|${m.tipo}|${dia}`
        const g = grupos.get(clave) ?? { sensorId: m.sensorId, tipo: m.tipo, dia, vals: [] }
        g.vals.push(m.valor)
        grupos.set(clave, g)
      }
    }
    const resultado: AgregadoDiario[] = []
    for (const g of grupos.values()) {
      resultado.push({
        sensorId: g.sensorId,
        tipo: g.tipo,
        dia: g.dia,
        valorMedio: g.vals.reduce((a, b) => a + b, 0) / g.vals.length,
        valorMin: Math.min(...g.vals),
        valorMax: Math.max(...g.vals),
        n: g.vals.length,
      })
    }
    return resultado.sort((a, b) => a.dia.localeCompare(b.dia))
  }

  async registrarLectura(mediciones: readonly Medicion[]): Promise<Resultado<Medicion[]>> {
    for (const medicion of mediciones) {
      const serie = this.mediciones.get(medicion.sensorId) ?? []
      serie.push(medicion)
      this.mediciones.set(medicion.sensorId, serie)
    }
    // T-25: emula el trigger de la BD — cada lectura evalúa sus cultivos.
    for (const medicion of mediciones) this.evaluarAlertasDeSensor(medicion.sensorId)
    return exito([...mediciones])
  }

  async eliminarMediciones(sensorIds: readonly string[]): Promise<void> {
    for (const id of sensorIds) this.mediciones.delete(id)
  }

  // — Alertas (emulación del trigger T-25) ————————————————————————

  async cargarAlertas(): Promise<Alerta[]> {
    return this.alertas.map((a) => ({ ...a }))
  }

  // — Catálogo de localidades (registro, D27) ——————————————————————

  async cargarLocalidades(): Promise<Localidad[]> {
    return LOCALIDADES_FALSAS.map((l) => ({ ...l }))
  }

  // — Catálogo de cultivos (T2) ———————————————————————————————————

  async cargarCatalogoCultivos(): Promise<EntradaCatalogoCultivo[]> {
    return CATALOGO_FALSO.map((e) => ({ ...e, umbrales: { ...e.umbrales } }))
  }

  // — Perfil editable (D30) ————————————————————————————————————

  /** Para tests: siembra el perfil de la cuenta (como si el signup lo creara). */
  sembrarPerfil(perfil: Perfil | null): void {
    this.perfil = perfil ? { ...perfil } : null
  }

  async cargarPerfil(): Promise<Perfil | null> {
    return this.perfil ? { ...this.perfil } : null
  }

  // — Eliminación de la cuenta (D46) ————————————————————————————————
  /** Solicitud pendiente en el doble (null = no hay ninguna). */
  solicitud: { programadaPara: string } | null = null
  /** Email de la cuenta, para comprobar la confirmación. */
  emailCuenta = 'pruebas@agrobits.test'

  consultarDliDeAyer(): Promise<number | null> {
    // Doble sin lecturas de luz: el DLI de ayer no está disponible.
    return Promise.resolve(null)
  }

  consultarBandaDli(): Promise<{ min: number; max: number } | null> {
    // Doble sin perfil de tipo de cultivo: no hay banda DLI.
    return Promise.resolve(null)
  }

  async cargarSolicitudEliminacion(): Promise<{ programadaPara: string } | null> {
    return this.solicitud ? { ...this.solicitud } : null
  }

  async solicitarEliminacion(confirmacionEmail: string): Promise<Resultado<string>> {
    if (confirmacionEmail.trim().toLowerCase() !== this.emailCuenta.toLowerCase()) {
      return {
        ok: false,
        errores: [{ campo: 'confirmacion', motivo: 'El email no coincide con el de tu cuenta' }],
      }
    }
    const programada = new Date(Date.now() + 7 * 24 * 60 * 60_000).toISOString()
    this.solicitud = { programadaPara: programada }
    return { ok: true, valor: programada }
  }

  async cancelarEliminacion(): Promise<Resultado<null>> {
    this.solicitud = null
    return { ok: true, valor: null }
  }

  async actualizarPerfil(telefono: string, localidadId: number, zonaHoraria: string): Promise<Resultado<Perfil>> {
    // Emula los backstops del RPC `actualizar_perfil` (D30).
    if (!LOCALIDADES_FALSAS.some((l) => l.id === localidadId)) {
      return fallo([{ campo: 'general', motivo: 'No se pudo guardar el perfil: La localidad seleccionada ya no está disponible' }])
    }
    // Emula la validación de zona del RPC (`zona_horaria_invalida`).
    if (!zonaValida(zonaHoraria.trim())) {
      return fallo([
        {
          campo: 'general',
          motivo: 'No se pudo guardar el perfil: La zona horaria no es válida (usa un nombre IANA, p. ej. America/Argentina/Buenos_Aires)',
        },
      ])
    }
    this.perfil = { telefono: telefono.trim(), localidadId, zonaHoraria: zonaHoraria.trim() }
    return exito({ ...this.perfil })
  }

  // — Tokens de dispositivo ————————————————————————————————————————

  private tokensDispositivo: (TokenDispositivo & { sensorId: string; tokenHash: string })[] = []
  private contadorTokenDispositivo = 0

  /** Solo para tests: filas tal y como quedarían en la BD (incluye el hash). */
  tokensDispositivoGuardados(): (TokenDispositivo & { sensorId: string; tokenHash: string })[] {
    return this.tokensDispositivo.map((t) => ({ ...t }))
  }

  async registrarTokenDispositivo(sensorId: string, nombre: string, tokenHash: string): Promise<Resultado<{ id: string }>> {
    if (!this.sensores.some((s) => s.id === sensorId)) return fallo([{ campo: 'sensor', motivo: 'Sensor no encontrado' }])
    const id = `t${++this.contadorTokenDispositivo}`
    this.tokensDispositivo.push({
      id,
      nombre: nombre.trim(),
      activo: true,
      createdAt: new Date().toISOString(),
      lastSeenAt: null,
      revokedAt: null,
      sensorId,
      tokenHash,
    })
    return exito({ id })
  }

  async cargarTokensDispositivo(sensorId: string): Promise<TokenDispositivo[]> {
    // Sin el hash: igual que la vista de la BD para el cliente.
    return this.tokensDispositivo
      .filter((t) => t.sensorId === sensorId)
      .map((t) => ({
        id: t.id,
        nombre: t.nombre,
        activo: t.activo,
        createdAt: t.createdAt,
        lastSeenAt: t.lastSeenAt,
        revokedAt: t.revokedAt,
      }))
  }

  async revocarTokenDispositivo(id: string): Promise<Resultado<null>> {
    const token = this.tokensDispositivo.find((t) => t.id === id)
    if (!token) return fallo([{ campo: 'id', motivo: 'Token no encontrado' }])
    token.activo = false
    token.revokedAt = new Date().toISOString()
    return exito(null)
  }

  async revocarTokensDeSensor(sensorId: string): Promise<Resultado<null>> {
    const ahora = new Date().toISOString()
    for (const token of this.tokensDispositivo) {
      if (token.sensorId === sensorId && token.activo) {
        token.activo = false
        token.revokedAt = ahora
      }
    }
    return exito(null)
  }

  private hayActiva(cultivoId: string, tipo: TipoMedicion): Alerta | undefined {
    return this.alertas.find((a) => a.cultivoId === cultivoId && a.tipo === tipo && a.estado === 'activa')
  }

  /** Misma semántica que el trigger de la BD: D14 sobre la última lectura por tipo del cultivo. */
  private evaluarAlertasDeSensor(sensorId: string): void {
    const sensor = this.sensores.find((s) => s.id === sensorId)
    if (!sensor) return

    for (const cultivoId of sensor.cultivoIds) {
      const cultivo = this.cultivos.find((c) => c.id === cultivoId)
      if (!cultivo) continue

      for (const tipo of TIPOS_MEDICION) {
        // La luminosidad se evalúa a diario (DLI) en BD, no por lectura.
        if (tipo === 'luminosidad') continue
        let ultima: Medicion | undefined
        for (const s of this.sensores) {
          if (!s.cultivoIds.includes(cultivoId)) continue
          for (const medicion of this.mediciones.get(s.id) ?? []) {
            if (medicion.tipo === tipo && (!ultima || medicion.medidaEn >= ultima.medidaEn)) ultima = medicion
          }
        }
        if (!ultima) continue
        const valor = ultima.valor
        const hora = ultima.medidaEn

        const activa = this.hayActiva(cultivoId, tipo)
        const accion = evaluarAlerta(valor, cultivo.umbrales[tipo], activa !== undefined)

        if (accion === 'crear') {
          this.alertas.push({
            id: `a${++this.contadorAlerta}`,
            cultivoId,
            tipo,
            valor,
            estado: 'activa',
            creadaEn: hora,
          })
        } else if (accion === 'mantener' && activa) {
          this.alertas = this.alertas.map((a) => (a.id === activa.id ? { ...a, valor } : a))
        } else if (accion === 'resolver' && activa) {
          this.alertas = this.alertas.map((a) =>
            a.id === activa.id ? { ...a, estado: 'resuelta' as const, valor, resueltaEn: hora } : a,
          )
        }
      }
    }
  }
}
