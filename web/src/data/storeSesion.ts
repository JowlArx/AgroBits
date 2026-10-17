// T-16 — Sesión simulada (D6/D8): ACCESO PROVISIONAL de la Fase 1.
//
// IMPORTANTE: esta store NO implementa autenticación real. No verifica
// credenciales contra ningún servidor, no almacena contraseñas y no impide
// registros duplicados: solo valida el formato del email y que la clave no
// esté vacía para poder maquetar los flujos. R-01, R-02 y R-03 se validan
// únicamente en la Fase 2 con Supabase (RLS + Auth).

import type { Resultado, ErrorCampo } from './storeCultivos'

export interface Sesion {
  usuario: { email: string }
}

let sesion: Sesion | null = null
const oyentes = new Set<() => void>()

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function notificar(): void {
  for (const oyente of oyentes) oyente()
}

export function suscribirSesion(oyente: () => void): () => void {
  oyentes.add(oyente)
  return () => oyentes.delete(oyente)
}

/** Devuelve la sesión simulada o `null` si no hay acceso (provisional). */
export function obtenerSesion(): Sesion | null {
  return sesion
}

function validar(email: string, clave: string): ErrorCampo[] {
  const errores: ErrorCampo[] = []
  if (!RE_EMAIL.test(email.trim())) {
    errores.push({ campo: 'email', motivo: 'Introduce un email válido (ejemplo@dominio.com)' })
  }
  if (clave === '') {
    errores.push({ campo: 'clave', motivo: 'La contraseña es obligatoria' })
  }
  return errores
}

/**
 * Maqueta del inicio de sesión (R-01 [F2]): acepta cualquier email con
 * formato válido y clave no vacía. NO es autenticación real.
 */
export function iniciarSesion(email: string, clave: string): Resultado<Sesion> {
  const errores = validar(email, clave)
  if (errores.length > 0) return { ok: false, errores }

  sesion = { usuario: { email: email.trim() } }
  notificar()
  return { ok: true, valor: sesion }
}

/**
 * Maqueta del registro (R-01 [F2]): entra directamente en la aplicación.
 * NO crea ninguna cuenta real y NO comprueba emails duplicados.
 */
export function registrarse(email: string, clave: string): Resultado<Sesion> {
  return iniciarSesion(email, clave)
}

export function cerrarSesion(): void {
  sesion = null
  notificar()
}

/** Solo para tests: vuelve al estado sin sesión. */
export function reiniciarSesion(): void {
  sesion = null
  notificar()
}
