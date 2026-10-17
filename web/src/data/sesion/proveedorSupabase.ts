// T-22 — Proveedor de autenticación REAL sobre Supabase Auth (D8). Traduce
// los errores de GoTrue a mensajes en español (riesgo de T-22: «reglas de
// contraseña mal documentadas») y mantiene la sesión en caché a partir de
// los eventos de `onAuthStateChange` (expiración incluida, R-03).

import type { AuthError, Session, SupabaseClient } from '@supabase/supabase-js'
import type { Resultado } from '../storeCultivos'
import type { ProveedorAuth, Sesion } from './proveedorAuth'

/** Traduce los errores habituales de GoTrue a mensajes comprensibles. */
export function mensajeAuth(error: AuthError): string {
  const mensaje = error.message
  if (error.code === 'user_already_exists' || /already (been )?registered/i.test(mensaje)) {
    return 'Ya existe una cuenta con ese email.'
  }
  if (/invalid login credentials/i.test(mensaje)) {
    return 'Email o contraseña incorrectos.'
  }
  if (error.code === 'weak_password' || /password should be at least/i.test(mensaje)) {
    return 'La contraseña debe tener al menos 6 caracteres.'
  }
  if (/email not confirmed/i.test(mensaje)) {
    return 'Confirma tu email (revisa tu bandeja de entrada) antes de iniciar sesión.'
  }
  return mensaje
}

function aSesion(sesion: Session | null): Sesion | null {
  const email = sesion?.user?.email
  return email ? { usuario: { email } } : null
}

export class ProveedorSupabase implements ProveedorAuth {
  private cache: Sesion | null = null
  private readonly oyentes = new Set<() => void>()

  constructor(private readonly cliente: SupabaseClient) {
    // Mantiene la caché alineada con el servidor: login, logout, arranque con
    // sesión persistida y expiración del token (R-03).
    this.cliente.auth.onAuthStateChange((_evento, sesion) => {
      this.cache = aSesion(sesion)
      this.notificar()
    })
  }

  sesionActual(): Sesion | null {
    return this.cache
  }

  suscribir(oyente: () => void): () => void {
    this.oyentes.add(oyente)
    return () => {
      this.oyentes.delete(oyente)
    }
  }

  private notificar(): void {
    for (const oyente of this.oyentes) oyente()
  }

  async iniciarSesion(email: string, clave: string): Promise<Resultado<Sesion>> {
    const { data, error } = await this.cliente.auth.signInWithPassword({ email, password: clave })
    if (error) return { ok: false, errores: [{ campo: 'clave', motivo: mensajeAuth(error) }] }
    return { ok: true, valor: { usuario: { email: data.user.email ?? email } } }
  }

  async registrarse(email: string, clave: string): Promise<Resultado<Sesion>> {
    const { data, error } = await this.cliente.auth.signUp({ email, password: clave })
    if (error) return { ok: false, errores: [{ campo: 'clave', motivo: mensajeAuth(error) }] }
    if (!data.session) {
      // GoTrue OFUSCA los emails ya registrados (anti-enumeración): responde
      // 200 con un usuario sintético SIN identidades y sin sesión. Ese es el
      // único indicador fiable del duplicado y permite cumplir R-01 AC2 con
      // mensaje explícito (verificado en E2E el 17/10/2026).
      if (data.user && (data.user.identities?.length ?? 0) === 0) {
        return { ok: false, errores: [{ campo: 'email', motivo: 'Ya existe una cuenta con ese email.' }] }
      }
      // Registro nuevo con confirmación de email activa: la cuenta existe pero
      // no hay sesión todavía. Se informa para que confirme y entre.
      return {
        ok: false,
        errores: [
          {
            campo: 'email',
            motivo: 'Cuenta creada: revisa tu correo para confirmarla y luego inicia sesión.',
          },
        ],
      }
    }
    return { ok: true, valor: { usuario: { email: data.user?.email ?? email } } }
  }

  async cerrarSesion(): Promise<void> {
    await this.cliente.auth.signOut()
  }
}
