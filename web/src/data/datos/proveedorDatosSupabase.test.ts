import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ProveedorDatosSupabase } from './proveedorDatosSupabase'
import type { Medicion, UmbralesPorTipo } from '../../domain/tipos'

// T-23 — Tests del proveedor real con el cliente supabase DOBLADO: cubren el
// contrato de PostgREST verificado en T-20/T-21 (user_id del token de
// sesión, umbrales en crop_thresholds, herencia de propiedad en
// measurements/sensor_crop) y el mapeo filas ⇄ dominio, incluida la
// normalización de horas (`+00:00` → `Z`) de R-09.

interface Captura {
  tabla: string
  operaciones: string[]
  cargas: unknown[]
}

type Respuesta = { data?: unknown; error?: { message: string } | null } | null
type Responder = (captura: Captura) => Respuesta

class CadenaFalsa {
  readonly operaciones: string[] = []
  readonly cargas: unknown[] = []

  constructor(
    private readonly tabla: string,
    private readonly responder: Responder,
  ) {}

  select(cols?: string) {
    this.operaciones.push(`select ${cols ?? ''}`)
    return this
  }
  insert(fila: unknown) {
    this.operaciones.push('insert')
    this.cargas.push(fila)
    return this
  }
  update(fila: unknown) {
    this.operaciones.push('update')
    this.cargas.push(fila)
    return this
  }
  upsert(filas: unknown) {
    this.operaciones.push('upsert')
    this.cargas.push(filas)
    return this
  }
  delete() {
    this.operaciones.push('delete')
    return this
  }
  eq(columna: string, valor: unknown) {
    this.operaciones.push(`eq ${columna}`)
    this.cargas.push(valor)
    return this
  }
  in(columna: string, valores: unknown) {
    this.operaciones.push(`in ${columna}`)
    this.cargas.push(valores)
    return this
  }
  order(columna: string) {
    this.operaciones.push(`order ${columna}`)
    return this
  }
  limit(n: number) {
    this.operaciones.push(`limit ${n}`)
    return this
  }
  single() {
    this.operaciones.push('single')
    return this
  }

  captura(): Captura {
    return { tabla: this.tabla, operaciones: [...this.operaciones], cargas: [...this.cargas] }
  }

  then<T>(
    resolver: (respuesta: Respuesta) => T,
    rechazar?: (error: unknown) => T,
  ): Promise<T> {
    return Promise.resolve(this.responder(this.captura())).then(resolver, rechazar)
  }
}

function clienteFalso(responder: Responder, usuario: string | null = 'user-1'): SupabaseClient {
  return {
    auth: {
      getSession: async () => ({ data: { session: usuario ? { user: { id: usuario } } : null } }),
    },
    from: (tabla: string) => new CadenaFalsa(tabla, responder),
  } as unknown as SupabaseClient
}

const umbrales: UmbralesPorTipo = {
  humedad_suelo: { min: 30, max: 70 },
  temperatura: { min: 12, max: 28 },
  humedad_ambiental: { min: 40, max: 80 },
  luminosidad: { min: 5_000, max: 40_000 },
}

describe('ProveedorDatosSupabase — cultivos', () => {
  it('cargarCultivos mapea filas a modelos y rellena los umbrales que falten', async () => {
    const proveedor = new ProveedorDatosSupabase(
      clienteFalso(() => ({
        data: [
          {
            id: 'u1',
            name: 'Tomates',
            crop_type: 'Tomate',
            crop_thresholds: [{ tipo: 'temperatura', min: 12, max: 28 }],
          },
        ],
        error: null,
      })),
    )

    const cultivos = await proveedor.cargarCultivos()

    expect(cultivos).toHaveLength(1)
    expect(cultivos[0]).toEqual({
      id: 'u1',
      nombre: 'Tomates',
      tipoCultivo: 'Tomate',
      umbrales: {
        temperatura: { min: 12, max: 28 },
        humedad_suelo: { min: 0, max: 100 },
        humedad_ambiental: { min: 0, max: 100 },
        luminosidad: { min: 0, max: 60_000 },
      },
    })
  })

  it('crearCultivo inserta el crop con user_id del token y luego 4 umbrales', async () => {
    const capturas: Captura[] = []
    const proveedor = new ProveedorDatosSupabase(
      clienteFalso((captura) => {
        capturas.push(captura)
        return captura.operaciones.includes('single') ? { data: { id: 'nuevo' }, error: null } : { data: null, error: null }
      }),
    )

    const resultado = await proveedor.crearCultivo({ nombre: 'Huerto', tipoCultivo: 'Tomate', umbrales })

    expect(resultado.ok).toBe(true)
    if (resultado.ok) expect(resultado.valor.id).toBe('nuevo')

    expect(capturas[0].tabla).toBe('crops')
    expect(capturas[0].operaciones).toEqual(['insert', 'select id', 'single'])
    expect(capturas[0].cargas[0]).toMatchObject({ user_id: 'user-1', name: 'Huerto', crop_type: 'Tomate' })

    expect(capturas[1].tabla).toBe('crop_thresholds')
    const filasUmbral = capturas[1].cargas[0] as { crop_id: string; tipo: string; min: number; max: number }[]
    expect(filasUmbral).toHaveLength(4)
    expect(filasUmbral).toContainEqual({ crop_id: 'nuevo', tipo: 'temperatura', min: 12, max: 28 })
  })

  it('crearCultivo compensa (borra el crop) si fallan los umbrales', async () => {
    const capturas: Captura[] = []
    const proveedor = new ProveedorDatosSupabase(
      clienteFalso((captura) => {
        capturas.push(captura)
        if (captura.tabla === 'crop_thresholds') return { data: null, error: { message: 'fallo de umbral' } }
        if (captura.operaciones.includes('single')) return { data: { id: 'nuevo' }, error: null }
        return { data: null, error: null }
      }),
    )

    const resultado = await proveedor.crearCultivo({ nombre: 'Huerto', tipoCultivo: 'Tomate', umbrales })

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.errores[0].motivo).toMatch(/servidor/)
    expect(capturas.some((c) => c.tabla === 'crops' && c.operaciones.includes('delete'))).toBe(true)
  })

  it('crearCultivo sin sesión devuelve error (no inventa user_id)', async () => {
    const capturas: Captura[] = []
    const proveedor = new ProveedorDatosSupabase(
      clienteFalso((captura) => {
        capturas.push(captura)
        return { data: null, error: null }
      }, null),
    )

    const resultado = await proveedor.crearCultivo({ nombre: 'Huerto', tipoCultivo: 'Tomate', umbrales })

    expect(resultado.ok).toBe(false)
    expect(capturas).toHaveLength(0)
  })

  it('actualizarCultivo llama a update y rehace los umbrales (upsert)', async () => {
    const capturas: Captura[] = []
    const proveedor = new ProveedorDatosSupabase(
      clienteFalso((captura) => {
        capturas.push(captura)
        return { data: null, error: null }
      }),
    )

    const resultado = await proveedor.actualizarCultivo('u1', { nombre: 'Huerto editado', tipoCultivo: 'Lechuga', umbrales })

    expect(resultado.ok).toBe(true)
    expect(capturas[0].tabla).toBe('crops')
    expect(capturas[0].operaciones).toContain('update')
    expect(capturas[1].tabla).toBe('crop_thresholds')
    expect(capturas[1].operaciones).toContain('upsert')
  })
})

describe('ProveedorDatosSupabase — mediciones (contrato R-08/R-09)', () => {
  it('cargarMediciones devuelve series ascendentes y horas normalizadas a Z', async () => {
    const proveedor = new ProveedorDatosSupabase(
      clienteFalso(() => ({
        data: [
          { sensor_id: 's1', tipo: 'temperatura', value: 21.5, unit: '°C', measured_at: '2026-10-17T12:05:00+00:00' },
          { sensor_id: 's1', tipo: 'temperatura', value: 20.1, unit: '°C', measured_at: '2026-10-17T12:00:00+00:00' },
        ],
        error: null,
      })),
    )

    const mediciones = await proveedor.cargarMediciones(['s1'])

    expect(mediciones).toHaveLength(2)
    expect(mediciones[0].valor).toBe(20.1) // ascendente: la más antigua primero
    expect(mediciones[0].medidaEn).toBe('2026-10-17T12:00:00.000Z')
    expect(mediciones[1].medidaEn).toBe('2026-10-17T12:05:00.000Z')
  })

  it('registrarLectura inserta el contrato R-08 en measurements', async () => {
    const capturas: Captura[] = []
    const proveedor = new ProveedorDatosSupabase(
      clienteFalso((captura) => {
        capturas.push(captura)
        return { data: null, error: null }
      }),
    )

    const lectura: Medicion[] = [
      { sensorId: 's1', tipo: 'luminosidad', valor: 1200, unidad: 'lux', medidaEn: '2026-10-17T12:00:00.000Z' },
    ]

    const resultado = await proveedor.registrarLectura(lectura)

    expect(resultado.ok).toBe(true)
    expect(capturas[0].tabla).toBe('measurements')
    expect(capturas[0].cargas[0]).toEqual([
      { sensor_id: 's1', tipo: 'luminosidad', value: 1200, unit: 'lux', measured_at: '2026-10-17T12:00:00.000Z' },
    ])
  })

  it('registrarLectura con error del servidor no devuelve éxito', async () => {
    const proveedor = new ProveedorDatosSupabase(clienteFalso(() => ({ data: null, error: { message: 'rls' } })))

    const resultado = await proveedor.registrarLectura([
      { sensorId: 's1', tipo: 'temperatura', valor: 20, unidad: '°C', medidaEn: '2026-10-17T12:00:00.000Z' },
    ])

    expect(resultado.ok).toBe(false)
  })

  it('registrarLectura vacía no hace llamadas al servidor', async () => {
    const capturas: Captura[] = []
    const proveedor = new ProveedorDatosSupabase(
      clienteFalso((captura) => {
        capturas.push(captura)
        return { data: null, error: null }
      }),
    )

    const resultado = await proveedor.registrarLectura([])

    expect(resultado.ok).toBe(true)
    expect(capturas).toHaveLength(0)
  })
})

describe('ProveedorDatosSupabase — sensores', () => {
  it('quitarAsociaciones elimina los sensores huérfanos y devuelve sus ids', async () => {
    const capturas: Captura[] = []
    const proveedor = new ProveedorDatosSupabase(
      clienteFalso((captura) => {
        capturas.push(captura)
        if (captura.tabla === 'sensor_crop') {
          if (captura.operaciones.includes('delete')) return { data: null, error: null }
          // select: enlaces previos (dos) y restantes (s2 sigue en otro cultivo)
          return captura.operaciones.some((o) => o.startsWith('in '))
            ? { data: [{ sensor_id: 's2' }], error: null }
            : { data: [{ sensor_id: 's1' }, { sensor_id: 's2' }], error: null }
        }
        return { data: null, error: null }
      }),
    )

    const borrados = await proveedor.quitarAsociacionesDeCultivo('c1')

    expect(borrados).toEqual(['s1'])
    const borradoSensores = capturas.find((c) => c.tabla === 'sensors' && c.operaciones.includes('delete'))
    expect(borradoSensores?.cargas[0]).toEqual(['s1'])
  })

  it('crearSensor exige sesión (user_id) y devuelve el sensor sin cultivos', async () => {
    const proveedor = new ProveedorDatosSupabase(
      clienteFalso((captura) => (captura.operaciones.includes('single') ? { data: { id: 's9' }, error: null } : { data: null, error: null })),
    )

    const resultado = await proveedor.crearSensor('Sensor A')

    expect(resultado.ok).toBe(true)
    if (resultado.ok) expect(resultado.valor).toEqual({ id: 's9', nombre: 'Sensor A', cultivoIds: [] })
  })
})
