// T-22 — Proveedor de autenticación REAL sobre Supabase Auth (D8). Traduce
// los errores de GoTrue a mensajes en español (riesgo de T-22: «reglas de
// contraseña mal documentadas») y mantiene la sesión en caché a partir de
// los eventos de `onAuthStateChange` (expiración incluida, R-03).

import type { AuthError, Session, SupabaseClient } from '@supabase/supabase-js'
import type { Resultado } from '../storeCultivos'
import type { PerfilRegistro, ProveedorAuth, Sesion } from './proveedorAuth'

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

/** Nombre de usuario opcional guardado en `user_metadata` (D32). */
function nombreDeUsuario(
  usuario: { user_metadata?: Record<string, unknown> } | null | undefined,
): string | undefined {
  const nombre = usuario?.user_metadata?.nombre_usuario
  return typeof nombre === 'string' && nombre.trim() !== '' ? nombre.trim() : undefined
}

function aSesion(sesion: Session | null): Sesion | null {
  const email = sesion?.user?.email
  if (!email) return null
  const nombreUsuario = nombreDeUsuario(sesion.user)
  return { usuario: { email, ...(nombreUsuario ? { nombreUsuario } : {}) } }
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
    const nombreUsuario = nombreDeUsuario(data.user)
    return {
      ok: true,
      valor: { usuario: { email: data.user.email ?? email, ...(nombreUsuario ? { nombreUsuario } : {}) } },
    }
  }

  async registrarse(email: string, clave: string, perfil: PerfilRegistro): Promise<Resultado<Sesion>> {
    // T-27 (D27): el teléfono y la localidad viajan como metadata del signup;
    // el trigger de la BD (`crear_perfil_de_usuario`) los copia a `perfiles`.
    // D32: el nombre de usuario opcional viaja en la MISMA metadata y vive
    // solo en Auth (la BD no lo lee; la UI lo muestra o, si falta, el texto
    // del email anterior a la «@»).
    const { data, error } = await this.cliente.auth.signUp({
      email,
      password: clave,
      options: {
        data: {
          telefono: perfil.telefono,
          localidad_id: perfil.localidadId,
          ...(perfil.nombreUsuario ? { nombre_usuario: perfil.nombreUsuario } : {}),
        },
      },
    })
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
    const nombreUsuario = nombreDeUsuario(data.user)
    return {
      ok: true,
      valor: { usuario: { email: data.user?.email ?? email, ...(nombreUsuario ? { nombreUsuario } : {}) } },
    }
  }

  async cerrarSesion(): Promise<void> {
    await this.cliente.auth.signOut()
  }
}
