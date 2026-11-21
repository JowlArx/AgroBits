// Tokens de dispositivo para la ingesta (cabecera `x-device-token`). El token en
// claro se genera en el navegador, se muestra UNA sola vez y NO se persiste: solo
// se guarda su SHA-256 hex (`device_tokens.token_hash`). La persistencia delega
// en el ProveedorDatos inyectado, como el resto de stores. Se devuelve Resultado
// (no void) para que la UI muestre el motivo del error.

import type { ErrorCampo, Resultado, TokenDispositivo } from './datos/proveedorDatos'
import { exigirProveedor } from './datos/proveedorDatos'

export type { TokenDispositivo }

/** 32 bytes aleatorios → 64 caracteres hex. */
const BYTES_TOKEN = 32

function aHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** Token en claro: 32 bytes criptográficamente aleatorios en hex minúsculas. */
export function generarTokenDispositivo(): string {
  const bytes = new Uint8Array(BYTES_TOKEN)
  crypto.getRandomValues(bytes)
  return aHex(bytes)
}

/** SHA-256 del texto en hex minúsculas (el hash es lo único que se persiste). */
export async function sha256Hex(texto: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto))
  return aHex(new Uint8Array(digest))
}

/**
 * Crea un token para el sensor. Devuelve el token en claro UNA vez; la BD solo
 * recibe el hash.
 */
export async function crearTokenDispositivo(
  sensorId: string,
  nombre: string,
): Promise<Resultado<{ id: string; token: string }>> {
  const errores: ErrorCampo[] = []
  if (nombre.trim() === '') errores.push({ campo: 'nombre', motivo: 'El nombre del token es obligatorio' })
  if (errores.length > 0) return { ok: false, errores }

  const token = generarTokenDispositivo()
  const tokenHash = await sha256Hex(token)
  const resultado = await exigirProveedor().registrarTokenDispositivo(sensorId, nombre, tokenHash)
  if (!resultado.ok) return resultado
  return { ok: true, valor: { id: resultado.valor.id, token } }
}

/** Metadatos de los tokens del sensor (nunca el hash). */
export function listarTokensDispositivo(sensorId: string): Promise<TokenDispositivo[]> {
  return exigirProveedor().cargarTokensDispositivo(sensorId)
}

/** Revoca el token (`activo = false`, `revoked_at = now()`). */
export function revocarTokenDispositivo(id: string): Promise<Resultado<null>> {
  return exigirProveedor().revocarTokenDispositivo(id)
}

/** Revoca de una vez todos los tokens activos del sensor (una sola sentencia). */
export function revocarTokensDeSensor(sensorId: string): Promise<Resultado<null>> {
  return exigirProveedor().revocarTokensDeSensor(sensorId)
}
