import { describe, expect, it } from 'vitest'
import { exigirProveedor } from './datos/proveedorDatos'
import {
  crearTokenDispositivo,
  listarTokensDispositivo,
  revocarTokenDispositivo,
  revocarTokensDeSensor,
  sha256Hex,
} from './tokensDispositivo'
import { datosFalsosActual } from '../tests/soporte/configurarTests'

// Tokens de dispositivo: el token en claro se devuelve una vez y solo el hash
// SHA-256 llega a la capa de datos (doble en memoria en los tests).

async function sensorDePrueba(): Promise<string> {
  const resultado = await exigirProveedor().crearSensor('Sensor de prueba')
  if (!resultado.ok) throw new Error('no se pudo crear el sensor de prueba')
  return resultado.valor.id
}

describe('tokens de dispositivo', () => {
  it('el token en claro tiene 64 caracteres hex minúsculas (32 bytes)', async () => {
    const sensorId = await sensorDePrueba()
    const primero = await crearTokenDispositivo(sensorId, 'Nodo A')
    const segundo = await crearTokenDispositivo(sensorId, 'Nodo B')

    expect(primero.ok && segundo.ok).toBe(true)
    if (!primero.ok || !segundo.ok) return
    expect(primero.valor.token).toMatch(/^[0-9a-f]{64}$/)
    expect(primero.valor.token).not.toBe(segundo.valor.token)
  })

  it('SHA-256 coincide con el vector conocido de "abc"', async () => {
    expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })

  it('persiste el hash, nunca el token en claro', async () => {
    const sensorId = await sensorDePrueba()
    const resultado = await crearTokenDispositivo(sensorId, 'Nodo A')
    expect(resultado.ok).toBe(true)
    if (!resultado.ok) return

    const guardados = datosFalsosActual().tokensDispositivoGuardados()
    expect(guardados).toHaveLength(1)
    expect(guardados[0].tokenHash).toBe(await sha256Hex(resultado.valor.token))
    expect(guardados[0].tokenHash).not.toBe(resultado.valor.token)
    expect(guardados[0].tokenHash).toMatch(/^[0-9a-f]{64}$/)
    expect(JSON.stringify(guardados)).not.toContain(resultado.valor.token)
  })

  it('listar devuelve metadatos sin token_hash', async () => {
    const sensorId = await sensorDePrueba()
    await crearTokenDispositivo(sensorId, 'Nodo A')

    const lista = await listarTokensDispositivo(sensorId)
    expect(lista).toHaveLength(1)
    expect(Object.keys(lista[0]).sort()).toEqual(
      ['activo', 'createdAt', 'id', 'lastSeenAt', 'nombre', 'revokedAt'].sort(),
    )
    expect(lista[0].activo).toBe(true)
  })

  it('revocar desactiva el token y registra revoked_at', async () => {
    const sensorId = await sensorDePrueba()
    const creado = await crearTokenDispositivo(sensorId, 'Nodo A')
    if (!creado.ok) throw new Error('no se pudo crear el token de prueba')

    const revocado = await revocarTokenDispositivo(creado.valor.id)
    expect(revocado.ok).toBe(true)

    const [token] = await listarTokensDispositivo(sensorId)
    expect(token.activo).toBe(false)
    expect(token.revokedAt).not.toBeNull()
  })

  it('rechaza un nombre vacío sin persistir nada', async () => {
    const sensorId = await sensorDePrueba()
    const resultado = await crearTokenDispositivo(sensorId, '   ')

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.errores[0].motivo).toMatch(/obligatorio/)
    expect(datosFalsosActual().tokensDispositivoGuardados()).toHaveLength(0)
  })

  it('revocarTokensDeSensor revoca solo los activos de ese sensor', async () => {
    const sensorA = await sensorDePrueba()
    const sensorB = await sensorDePrueba()
    await crearTokenDispositivo(sensorA, 'Nodo A1')
    await crearTokenDispositivo(sensorA, 'Nodo A2')
    await crearTokenDispositivo(sensorB, 'Nodo B1')

    const revocado = await revocarTokensDeSensor(sensorA)
    expect(revocado.ok).toBe(true)

    const delA = await listarTokensDispositivo(sensorA)
    expect(delA.map((t) => t.activo)).toEqual([false, false])
    const delB = await listarTokensDispositivo(sensorB)
    expect(delB.map((t) => t.activo)).toEqual([true])
  })
})
