// T-23 — Doble en memoria del ProveedorDatos para los tests (sin red).
// Sustituye a la lógica en memoria de la Fase 1: las stores pasaron a delegar
// en el proveedor, de modo que estas pruebas ejercitan el mismo flujo que la
// aplicación real (store → proveedor → caché), con ids `cN`/`sN` estables
// (mismo criterio de numeración que la Fase 1, esperado por los tests).

import type { Cultivo, Medicion } from '../../domain/tipos'
import type { ErrorCampo, NuevoCultivo, ProveedorDatos, Resultado } from '../../data/datos/proveedorDatos'
import type { Sensor } from '../../data/storeSensores'

const exito = <T>(valor: T): Resultado<T> => ({ ok: true, valor })
const fallo = (errores: ErrorCampo[]): Resultado<never> => ({ ok: false, errores })

export class DatosFalsos implements ProveedorDatos {
  private cultivos: Cultivo[] = []
  private contadorCultivo = 0
  private sensores: Sensor[] = []
  private contadorSensor = 0
  private mediciones = new Map<string, Medicion[]>()

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
  }

  // — Sensores ———————————————————————————————————————————————

  async cargarSensores(): Promise<Sensor[]> {
    return this.sensores.map((s) => ({ ...s, cultivoIds: [...s.cultivoIds] }))
  }

  async crearSensor(nombre: string): Promise<Resultado<Sensor>> {
    const sensor: Sensor = { id: `s${++this.contadorSensor}`, nombre: nombre.trim(), cultivoIds: [] }
    this.sensores.push(sensor)
    return exito(sensor)
  }

  async asociarSensor(sensorId: string, cultivoId: string): Promise<Resultado<Sensor>> {
    const sensor = this.sensores.find((s) => s.id === sensorId)
    if (!sensor) return fallo([{ campo: 'sensor', motivo: 'Sensor no encontrado' }])
    if (!sensor.cultivoIds.includes(cultivoId)) sensor.cultivoIds.push(cultivoId)
    return exito({ ...sensor, cultivoIds: [...sensor.cultivoIds] })
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

  // — Mediciones —————————————————————————————————————————————

  async cargarMediciones(sensorIds: readonly string[]): Promise<Medicion[]> {
    const resultado: Medicion[] = []
    for (const id of sensorIds) resultado.push(...(this.mediciones.get(id) ?? []))
    return resultado
  }

  async registrarLectura(mediciones: readonly Medicion[]): Promise<Resultado<Medicion[]>> {
    for (const medicion of mediciones) {
      const serie = this.mediciones.get(medicion.sensorId) ?? []
      serie.push(medicion)
      this.mediciones.set(medicion.sensorId, serie)
    }
    return exito([...mediciones])
  }

  async eliminarMediciones(sensorIds: readonly string[]): Promise<void> {
    for (const id of sensorIds) this.mediciones.delete(id)
  }
}
