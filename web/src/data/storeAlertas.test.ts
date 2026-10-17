import { beforeEach, describe, expect, it } from 'vitest'
import { obtenerAlertas, procesarLecturas, reiniciarAlertas } from './storeAlertas'
import { crearCultivo, reiniciarCultivos } from './storeCultivos'
import type { Medicion, TipoMedicion, UmbralesPorTipo } from '../domain/tipos'
import { TIPOS_MEDICION, UNIDADES } from '../domain/tipos'

const umbrales: UmbralesPorTipo = {
  humedad_suelo: { min: 30, max: 70 },
  temperatura: { min: 12, max: 28 },
  humedad_ambiental: { min: 40, max: 80 },
  luminosidad: { min: 5_000, max: 40_000 },
}

function cultivoEjemplo() {
  const resultado = crearCultivo({ nombre: 'Huerto', tipoCultivo: 'Tomate', umbrales })
  if (!resultado.ok) throw new Error('no se pudo crear el cultivo')
  return resultado.valor
}

/** Lecturas simuladas: solo se indican los tipos que interesan. */
function ultimas(valores: Partial<Record<TipoMedicion, number>>): Record<TipoMedicion, Medicion | undefined> {
  const resultado = {} as Record<TipoMedicion, Medicion | undefined>
  for (const tipo of TIPOS_MEDICION) resultado[tipo] = undefined
  for (const [tipo, valor] of Object.entries(valores) as [TipoMedicion, number][]) {
    resultado[tipo] = {
      sensorId: 's1',
      tipo,
      valor,
      unidad: UNIDADES[tipo],
      medidaEn: '2026-10-17T12:00:00.000Z',
    }
  }
  return resultado
}

beforeEach(() => {
  reiniciarCultivos()
  reiniciarAlertas()
})

describe('store de alertas (T-15, R-13 modelo D14)', () => {
  it('AC1: medición fuera de rango sin alerta previa → crea una alerta activa', () => {
    const cultivo = cultivoEjemplo()

    procesarLecturas(cultivo, ultimas({ humedad_suelo: 10 }))

    const alertas = obtenerAlertas()
    expect(alertas).toHaveLength(1)
    expect(alertas[0].estado).toBe('activa')
    expect(alertas[0].cultivoId).toBe(cultivo.id)
    expect(alertas[0].tipo).toBe('humedad_suelo')
    expect(alertas[0].valor).toBe(10)
    expect(alertas[0].creadaEn).toBe('2026-10-17T12:00:00.000Z')
  })

  it('AC2: lecturas sucesivas fuera de rango no duplican la alerta', () => {
    const cultivo = cultivoEjemplo()

    procesarLecturas(cultivo, ultimas({ humedad_suelo: 10 }))
    procesarLecturas(cultivo, ultimas({ humedad_suelo: 8 }))
    procesarLecturas(cultivo, ultimas({ humedad_suelo: 5 }))

    const alertas = obtenerAlertas()
    expect(alertas).toHaveLength(1)
    expect(alertas[0].valor).toBe(5) // refleja la última lectura
  })

  it('AC3: volver al rango con alerta activa → se resuelve', () => {
    const cultivo = cultivoEjemplo()
    procesarLecturas(cultivo, ultimas({ humedad_suelo: 10 }))

    procesarLecturas(cultivo, ultimas({ humedad_suelo: 50 }))

    const alertas = obtenerAlertas()
    expect(alertas).toHaveLength(1)
    expect(alertas[0].estado).toBe('resuelta')
    expect(alertas[0].resueltaEn).toBe('2026-10-17T12:00:00.000Z')
  })

  it('AC4: medición dentro del rango sin alerta previa → no crea nada', () => {
    const cultivo = cultivoEjemplo()

    procesarLecturas(cultivo, ultimas({ humedad_suelo: 50, temperatura: 20 }))

    expect(obtenerAlertas()).toHaveLength(0)
  })

  it('tras resolverse, una nueva salida del rango crea OTRA alerta activa', () => {
    const cultivo = cultivoEjemplo()
    procesarLecturas(cultivo, ultimas({ humedad_suelo: 10 }))
    procesarLecturas(cultivo, ultimas({ humedad_suelo: 50 }))
    procesarLecturas(cultivo, ultimas({ humedad_suelo: 12 }))

    const alertas = obtenerAlertas()
    expect(alertas).toHaveLength(2)
    expect(alertas.filter((a) => a.estado === 'activa')).toHaveLength(1)
    expect(alertas.filter((a) => a.estado === 'resuelta')).toHaveLength(1)
  })

  it('los tipos sin lectura se ignoran', () => {
    const cultivo = cultivoEjemplo()

    procesarLecturas(cultivo, ultimas({}))

    expect(obtenerAlertas()).toHaveLength(0)
  })

  it('evalúa cada tipo por separado con sus propios umbrales', () => {
    const cultivo = cultivoEjemplo()

    procesarLecturas(cultivo, ultimas({ humedad_suelo: 10, temperatura: 20 }))

    const alertas = obtenerAlertas()
    expect(alertas).toHaveLength(1)
    expect(alertas[0].tipo).toBe('humedad_suelo')
  })
})
