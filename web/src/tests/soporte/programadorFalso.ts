// T-24 — Doble en memoria del ProgramadorLecturas para los tests (sin timers):
// no genera lecturas por sí mismo —cada prueba las provoca con el botón manual
// o con relojes simulados sobre la implementación real—, pero deja registrado
// lo que la aplicación habría programado para poder verificarlo.

import type { ProgramadorLecturas } from '../../data/programadorLecturas'

export class ProgramadorFalso implements ProgramadorLecturas {
  /** Cada llamada a `programar`, con los ids recibidos. */
  readonly programaciones: string[][] = []
  paradas = 0

  programar(sensorIds: readonly string[]): void {
    this.programaciones.push([...sensorIds])
  }

  parar(): void {
    this.paradas += 1
  }
}
