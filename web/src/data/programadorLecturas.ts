// T-24 — Generador de mediciones simuladas de Fase 2 (R-10 AC2, D15).
// Mientras la SPA está abierta con sesión, este programador mantiene un tick
// por sensor a razón de 1 lectura cada 5 minutos (decisión D15). Cada tick
// reutiliza el mismo flujo que el botón manual: `generarLectura()` persiste en
// la BD a través del ProveedorDatos —con el token y las políticas RLS del
// usuario— y actualiza la caché que consume la interfaz. Es el sustituto del
// sensor físico «cuando no hay hardware conectado» (R-10); el ESP32 de una
// fase posterior escribirá contra la misma API REST con su propio token.
//
// Reglas de programación:
// - Sensor sin lecturas (recién creado o serie vacía) → tick inmediato.
// - Sensor con lectura reciente → espera el tiempo restante hasta 5 minutos.
// - Al terminar un tick se reprograma el siguiente (autorreloj).
// - Sensor eliminado → el tick se autodesierte y no vuelve a programarse.
// - Cierre de sesión → `parar()` limpia todos los temporizadores.
//
// Inyección: `ProgramadorTemporizado` en `main.tsx` (aplicación real) y
// `ProgramadorFalso` en `src/tests/soporte/configurarTests.ts`.

import { INTERVALO_LECTURAS_MS } from './generador'
import { generarLectura, obtenerMediciones, ultimasPorTipo } from './medicionesSimuladas'
import { obtenerCultivo } from './storeCultivos'
import { obtenerSensor, obtenerSensoresDeCultivo } from './storeSensores'
import { procesarLecturas } from './storeAlertas'

export interface ProgramadorLecturas {
  /** (Re)programa el tick de cada sensor indicado según su última lectura. */
  programar(sensorIds: readonly string[]): void
  /** Detiene todos los ticks (cierre de sesión / tests). */
  parar(): void
}

/**
 * Evalúa las últimas mediciones de los cultivos del sensor contra sus
 * umbrales (modelo D14, R-13) para que las lecturas automáticas mantengan
 * viva la regla de alertas mientras esa lógica siga en cliente (T-25 la
 * moverá a la BD).
 */
function evaluarAlertasDeSensor(sensorId: string): void {
  const sensor = obtenerSensor(sensorId)
  if (!sensor) return
  for (const cultivoId of sensor.cultivoIds) {
    const cultivo = obtenerCultivo(cultivoId)
    if (!cultivo) continue
    const idsDeCultivo = obtenerSensoresDeCultivo(cultivoId).map((s) => s.id)
    procesarLecturas(cultivo, ultimasPorTipo(idsDeCultivo))
  }
}

/** Retraso hasta el siguiente tick: 0 si no hay lectura o si ya está vencida. */
function retrasoHastaSiguiente(sensorId: string, ahora: number): number {
  const serie = obtenerMediciones(sensorId)
  const ultima = serie[serie.length - 1]
  if (!ultima) return 0
  const vence = Date.parse(ultima.medidaEn) + INTERVALO_LECTURAS_MS
  return Math.max(0, vence - ahora)
}

export class ProgramadorTemporizado implements ProgramadorLecturas {
  private readonly temporizadores = new Map<string, ReturnType<typeof setTimeout>>()

  programar(sensorIds: readonly string[]): void {
    for (const sensorId of sensorIds) {
      this.cancelar(sensorId) // idempotente: un solo temporizador por sensor
      const retraso = retrasoHastaSiguiente(sensorId, Date.now())
      this.temporizadores.set(
        sensorId,
        setTimeout(() => {
          void this.tick(sensorId)
        }, retraso),
      )
    }
  }

  parar(): void {
    for (const sensorId of [...this.temporizadores.keys()]) this.cancelar(sensorId)
  }

  private cancelar(sensorId: string): void {
    const temporizador = this.temporizadores.get(sensorId)
    if (temporizador !== undefined) clearTimeout(temporizador)
    this.temporizadores.delete(sensorId)
  }

  private async tick(sensorId: string): Promise<void> {
    this.temporizadores.delete(sensorId)
    // Sensor borrado mientras tanto (o sesión cerrada): se autodesierte.
    if (!obtenerSensor(sensorId)) return

    try {
      await generarLectura(sensorId)
    } catch (error) {
      // Un fallo transitorio no detiene el reloj: el próximo tick reintentará.
      console.error('El generador no pudo registrar la lectura', error)
    }

    // Si la sesión se cerró durante la escritura, no se reprograma nada.
    if (!obtenerSensor(sensorId)) return
    evaluarAlertasDeSensor(sensorId)
    this.programar([sensorId])
  }
}

let programador: ProgramadorLecturas | null = null

/** Inyecta el programador de lecturas (una vez, al arrancar la app o el test). */
export function configurarProgramadorLecturas(nuevo: ProgramadorLecturas): void {
  programador = nuevo
}

export function exigirProgramador(): ProgramadorLecturas {
  if (!programador) throw new Error('Programador de lecturas no configurado (ver main.tsx)')
  return programador
}
