import { beforeEach, describe, expect, it } from 'vitest'
import {
  alertasOrdenadas,
  cargarAlertas,
  obtenerAlertas,
  suscribirAlertas,
  vaciarAlertas,
} from './storeAlertas'
import { crearCultivo, eliminarCultivo, reiniciarCultivos } from './storeCultivos'
import { asociarSensor, crearSensor, reiniciarSensores } from './storeSensores'
import { exigirProveedor } from './datos/proveedorDatos'
import type { Medicion, TipoMedicion, UmbralesPorTipo } from '../domain/tipos'
import { UNIDADES } from '../domain/tipos'

// T-25 — Store de alertas: la EVALUACIÓN vive en la BD (trigger
// `evaluar_alertas_de_sensor`, migración 20261017000004, verificada con la
// suite SQL supabase/tests/20261017_t25_evaluacion_alertas.sql: 8/8 con
// ROLLBACK). Este store es solo una fachada lectora con caché: aquí se
// cubre que carga desde el ProveedorDatos, notifica, ordena y se vacía.
// La semántica D14 (R-13) la emula el doble DatosFalsos con la MISMA regla
// del dominio de T-11, de modo que los tests de flujo de la interfaz
// (Alertas.test.tsx, DetalleCultivo.test.tsx) siguen verificando R-13/R-14.

const umbrales: UmbralesPorTipo = {
  humedad_suelo: { min: 30, max: 70 },
  temperatura: { min: 12, max: 28 },
  humedad_ambiental: { min: 40, max: 80 },
  luminosidad: { min: 5_000, max: 40_000 },
}

beforeEach(() => {
  reiniciarCultivos()
  reiniciarSensores()
  vaciarAlertas()
})

/** Cultivo con un sensor asociado (emulación del trigger vía DatosFalsos). */
async function cultivoConSensor(nombre = 'Huerto', umbralesPropios = umbrales) {
  const cultivo = await crearCultivo({ nombre, tipoCultivo: 'Tomate', umbrales: umbralesPropios })
  if (!cultivo.ok) throw new Error('no se pudo crear el cultivo')
  const sensor = await crearSensor(`Sensor de ${nombre}`)
  if (!sensor.ok) throw new Error('no se pudo crear el sensor')
  const enlace = await asociarSensor(sensor.valor.id, cultivo.valor.id, (id) => id === cultivo.valor.id)
  if (!enlace.ok) throw new Error('no se pudo asociar el sensor')
  return { cultivoId: cultivo.valor.id, sensorId: sensor.valor.id }
}

/** Escribe una lectura directamente por el proveedor (como haría el sensor). */
async function leer(sensorId: string, tipo: TipoMedicion, valor: number, medidaEn: string): Promise<void> {
  const medicion: Medicion = { sensorId, tipo, valor, unidad: UNIDADES[tipo], medidaEn }
  const resultado = await exigirProveedor().registrarLectura([medicion])
  if (!resultado.ok) throw new Error('no se pudo registrar la lectura')
}

describe('store de alertas (T-25, fachada lectora de la evaluación de la BD)', () => {
  it('AC1: lectura fuera de rango → carga una alerta activa con tipo, valor y hora', async () => {
    const { cultivoId, sensorId } = await cultivoConSensor()
    await leer(sensorId, 'humedad_suelo', 10, '2026-10-17T12:00:00.000Z')

    await cargarAlertas()

    const alertas = obtenerAlertas()
    expect(alertas).toHaveLength(1)
    expect(alertas[0].estado).toBe('activa')
    expect(alertas[0].cultivoId).toBe(cultivoId)
    expect(alertas[0].tipo).toBe('humedad_suelo')
    expect(alertas[0].valor).toBe(10)
    expect(alertas[0].creadaEn).toBe('2026-10-17T12:00:00.000Z')
  })

  it('AC2: lecturas sucesivas fuera de rango → 1 alerta con el último valor', async () => {
    const { sensorId } = await cultivoConSensor()
    await leer(sensorId, 'humedad_suelo', 10, '2026-10-17T12:00:00.000Z')
    await leer(sensorId, 'humedad_suelo', 8, '2026-10-17T12:05:00.000Z')
    await leer(sensorId, 'humedad_suelo', 5, '2026-10-17T12:10:00.000Z')

    await cargarAlertas()

    const alertas = obtenerAlertas()
    expect(alertas).toHaveLength(1)
    expect(alertas[0].valor).toBe(5)
  })

  it('AC3: volver al rango con alerta activa → se resuelve con su hora', async () => {
    const { sensorId } = await cultivoConSensor()
    await leer(sensorId, 'humedad_suelo', 10, '2026-10-17T12:00:00.000Z')
    await leer(sensorId, 'humedad_suelo', 50, '2026-10-17T12:10:00.000Z')

    await cargarAlertas()

    const alertas = obtenerAlertas()
    expect(alertas).toHaveLength(1)
    expect(alertas[0].estado).toBe('resuelta')
    expect(alertas[0].resueltaEn).toBe('2026-10-17T12:10:00.000Z')
  })

  it('AC4: lectura dentro del rango sin alerta previa → no crea nada', async () => {
    const { sensorId } = await cultivoConSensor()
    await leer(sensorId, 'humedad_suelo', 50, '2026-10-17T12:00:00.000Z')
    await leer(sensorId, 'temperatura', 20, '2026-10-17T12:00:00.000Z')

    await cargarAlertas()

    expect(obtenerAlertas()).toHaveLength(0)
  })

  it('tras resolverse, una nueva salida del rango crea OTRA alerta activa', async () => {
    const { sensorId } = await cultivoConSensor()
    await leer(sensorId, 'humedad_suelo', 10, '2026-10-17T12:00:00.000Z')
    await leer(sensorId, 'humedad_suelo', 50, '2026-10-17T12:10:00.000Z')
    await leer(sensorId, 'humedad_suelo', 12, '2026-10-17T12:20:00.000Z')

    await cargarAlertas()

    const alertas = obtenerAlertas()
    expect(alertas).toHaveLength(2)
    expect(alertas.filter((a) => a.estado === 'activa')).toHaveLength(1)
    expect(alertas.filter((a) => a.estado === 'resuelta')).toHaveLength(1)
  })

  it('evalúa cada tipo por separado con sus propios umbrales', async () => {
    const { sensorId } = await cultivoConSensor()
    await leer(sensorId, 'humedad_suelo', 10, '2026-10-17T12:00:00.000Z')
    await leer(sensorId, 'temperatura', 20, '2026-10-17T12:00:00.000Z')

    await cargarAlertas()

    const alertas = obtenerAlertas()
    expect(alertas).toHaveLength(1)
    expect(alertas[0].tipo).toBe('humedad_suelo')
  })

  it('N–N: el mismo sensor evalúa cada cultivo con SUS umbrales', async () => {
    const { cultivoId, sensorId } = await cultivoConSensor()
    const estricto = await crearCultivo({
      nombre: 'Estricto',
      tipoCultivo: 'Lechuga',
      umbrales: { ...umbrales, humedad_suelo: { min: 0, max: 5 } },
    })
    if (!estricto.ok) throw new Error('no se pudo crear el cultivo estricto')
    await asociarSensor(sensorId, estricto.valor.id, (id) => id === estricto.valor.id)

    // 40 está DENTRO de [30,70] pero FUERA de [0,5] → solo alerta del estricto.
    await leer(sensorId, 'humedad_suelo', 40, '2026-10-17T12:00:00.000Z')

    await cargarAlertas()

    const alertas = obtenerAlertas()
    expect(alertas).toHaveLength(1)
    expect(alertas[0].cultivoId).toBe(estricto.valor.id)
    expect(cultivoId).not.toBe(alertas[0].cultivoId)
  })

  it('T-17: eliminar el cultivo retira sus alertas (cascada de la BD)', async () => {
    const { cultivoId, sensorId } = await cultivoConSensor()
    await leer(sensorId, 'humedad_suelo', 10, '2026-10-17T12:00:00.000Z')

    await eliminarCultivo(cultivoId)
    await cargarAlertas()

    expect(obtenerAlertas()).toHaveLength(0)
  })

  it('la eliminación no afecta a las alertas de otros cultivos', async () => {
    const uno = await cultivoConSensor('Primero')
    const dos = await cultivoConSensor('Segundo')
    await leer(uno.sensorId, 'humedad_suelo', 10, '2026-10-17T12:00:00.000Z')
    await leer(dos.sensorId, 'temperatura', 5, '2026-10-17T12:00:00.000Z')

    await eliminarCultivo(uno.cultivoId)
    await cargarAlertas()

    const alertas = obtenerAlertas()
    expect(alertas).toHaveLength(1)
    expect(alertas[0].cultivoId).toBe(dos.cultivoId)
  })

  it('alertasOrdenadas pone las activas antes que las resueltas', async () => {
    const activo = await cultivoConSensor('Con activa')
    const resuelto = await cultivoConSensor('Con resuelta')
    await leer(activo.sensorId, 'humedad_suelo', 10, '2026-10-17T12:00:00.000Z')
    await leer(resuelto.sensorId, 'humedad_suelo', 10, '2026-10-17T13:00:00.000Z')
    await leer(resuelto.sensorId, 'humedad_suelo', 50, '2026-10-17T13:10:00.000Z')

    await cargarAlertas()

    const orden = alertasOrdenadas()
    expect(orden[0].estado).toBe('activa')
    expect(orden[0].cultivoId).toBe(activo.cultivoId)
    expect(orden[1].estado).toBe('resuelta')
  })

  it('cargarAlertas notifica a los suscriptores y vaciarAlertas limpia la caché', async () => {
    const { sensorId } = await cultivoConSensor()
    await leer(sensorId, 'humedad_suelo', 10, '2026-10-17T12:00:00.000Z')

    let notificaciones = 0
    const cancelar = suscribirAlertas(() => {
      notificaciones += 1
    })

    await cargarAlertas()
    expect(notificaciones).toBeGreaterThan(0)
    expect(obtenerAlertas()).toHaveLength(1)

    vaciarAlertas()
    expect(obtenerAlertas()).toHaveLength(0)

    const notificacionesTrasCancelar = notificaciones
    cancelar()
    vaciarAlertas()
    expect(notificaciones).toBe(notificacionesTrasCancelar)
  })
})
