// T-24/T-25 — Pruebas del generador de lecturas simuladas (R-10 AC2, D15). La
// cadencia se verifica con relojes simulados —sin esperar 5 minutos reales—
// sobre el ProveedorDatos en memoria, es decir, por el mismo flujo que usa la
// aplicación real (tick → generarLectura → proveedor → caché). T-25: la
// evaluación de alertas es del trigger de la BD (emulado por el doble) y el
// tick recarga la caché de alertas tras escribir.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ProgramadorTemporizado,
  configurarProgramadorLecturas,
} from './programadorLecturas'
import { crearCultivo } from './storeCultivos'
import { asociarSensor, crearSensor, vaciarSensores } from './storeSensores'
import { generarLectura, obtenerMediciones } from './medicionesSimuladas'
import { cargarAlertas, obtenerAlertas } from './storeAlertas'
import { cargarDatosSesion, vaciarDatosSesion } from './cargarDatos'
import { INTERVALO_LECTURAS_MS } from './generador'
import { programadorFalsoActual } from '../tests/soporte/configurarTests'
import { TIPOS_MEDICION, type UmbralesPorTipo } from '../domain/tipos'

const UMBRALES: UmbralesPorTipo = {
  humedad_suelo: { min: 20, max: 60 },
  temperatura: { min: 5, max: 30 },
  humedad_ambiental: { min: 30, max: 80 },
  luminosidad: { min: 500, max: 40_000 },
}

/** Umbrales abiertos salvo temperatura, que queda siempre fuera de rango. */
const UMBRALES_TEMPERATURA_FUERA: UmbralesPorTipo = {
  humedad_suelo: { min: 0, max: 100 },
  temperatura: { min: 999, max: 2000 }, // el simulador genera 5–40 °C: siempre < 999
  humedad_ambiental: { min: 0, max: 100 },
  luminosidad: { min: 0, max: 60_000 },
}

async function prepararSensorConCultivo(umbrales: UmbralesPorTipo = UMBRALES): Promise<string> {
  const cultivo = await crearCultivo({ nombre: 'Huerto', tipoCultivo: 'tomate', umbrales })
  if (!cultivo.ok) throw new Error('No se pudo crear el cultivo de prueba')
  const sensor = await crearSensor('Sensor A')
  if (!sensor.ok) throw new Error('No se pudo crear el sensor de prueba')
  const asociacion = await asociarSensor(sensor.valor.id, cultivo.valor.id, () => true)
  if (!asociacion.ok) throw new Error('No se pudo asociar el sensor de prueba')
  return sensor.valor.id
}

const POR_LECTURA = TIPOS_MEDICION.length // 4 filas por tick (un valor por tipo)

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('generador de lecturas simuladas (T-24, R-10 AC2, D15)', () => {
  it('D15: tick inmediato del sensor nuevo y otro cada 5 minutos', async () => {
    const sensorId = await prepararSensorConCultivo()
    const programador = new ProgramadorTemporizado()
    configurarProgramadorLecturas(programador)

    programador.programar([sensorId])
    await vi.advanceTimersByTimeAsync(0) // sin lectura previa → tick inmediato
    expect(obtenerMediciones(sensorId)).toHaveLength(POR_LECTURA)

    await vi.advanceTimersByTimeAsync(INTERVALO_LECTURAS_MS - 1) // aún no toca
    expect(obtenerMediciones(sensorId)).toHaveLength(POR_LECTURA)

    await vi.advanceTimersByTimeAsync(1) // vence exactamente a los 5 min
    expect(obtenerMediciones(sensorId)).toHaveLength(POR_LECTURA * 2)

    await vi.advanceTimersByTimeAsync(INTERVALO_LECTURAS_MS) // el reloj sigue
    expect(obtenerMediciones(sensorId)).toHaveLength(POR_LECTURA * 3)

    programador.parar()
  })

  it('espera el tiempo restante cuando el sensor acaba de tomar una lectura', async () => {
    const sensorId = await prepararSensorConCultivo()
    await generarLectura(sensorId) // lectura recién tomada (p. ej. manual)
    expect(obtenerMediciones(sensorId)).toHaveLength(POR_LECTURA)

    const programador = new ProgramadorTemporizado()
    programador.programar([sensorId])

    await vi.advanceTimersByTimeAsync(INTERVALO_LECTURAS_MS - 1)
    expect(obtenerMediciones(sensorId)).toHaveLength(POR_LECTURA)

    await vi.advanceTimersByTimeAsync(1)
    expect(obtenerMediciones(sensorId)).toHaveLength(POR_LECTURA * 2)
    programador.parar()
  })

  it('un sensor eliminado se autodesierte y el reloj no vuelve a escribir', async () => {
    const sensorId = await prepararSensorConCultivo()
    const programador = new ProgramadorTemporizado()
    programador.programar([sensorId])
    await vi.advanceTimersByTimeAsync(0)
    expect(obtenerMediciones(sensorId)).toHaveLength(POR_LECTURA)

    vaciarSensores() // el sensor desaparece (p. ej. borrado en cascada)
    await vi.advanceTimersByTimeAsync(INTERVALO_LECTURAS_MS * 2)
    expect(obtenerMediciones(sensorId)).toHaveLength(POR_LECTURA)
  })

  it('parar() detiene los ticks (cierre de sesión)', async () => {
    const sensorId = await prepararSensorConCultivo()
    const programador = new ProgramadorTemporizado()
    programador.programar([sensorId])
    await vi.advanceTimersByTimeAsync(0)
    programador.parar()

    await vi.advanceTimersByTimeAsync(INTERVALO_LECTURAS_MS * 3)
    expect(obtenerMediciones(sensorId)).toHaveLength(POR_LECTURA)
  })

  it('las lecturas automáticas alimentan las alertas evaluadas en la BD (R-13)', async () => {
    const sensorId = await prepararSensorConCultivo(UMBRALES_TEMPERATURA_FUERA)
    const programador = new ProgramadorTemporizado()
    programador.programar([sensorId])
    await vi.advanceTimersByTimeAsync(0)
    // T-25: el tick recarga la caché de alertas tras escribir en la BD.
    await cargarAlertas()

    const activas = obtenerAlertas().filter((a) => a.estado === 'activa')
    expect(activas).toHaveLength(1)
    expect(activas[0].tipo).toBe('temperatura')
    programador.parar()
  })

  it('al abrir sesión se programan sus sensores y al cerrar se paran', async () => {
    const sensorId = await prepararSensorConCultivo()
    await cargarDatosSesion()
    expect(programadorFalsoActual().programaciones).toContainEqual([sensorId])

    vaciarDatosSesion()
    expect(programadorFalsoActual().paradas).toBe(1)
  })
})
