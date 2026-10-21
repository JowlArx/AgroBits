// T-22 — Contrato de la capa de autenticación (intercambiable, plan.md §2).
// La store de sesión no conoce Supabase: delega en un ProveedorAuth. La
// aplicación inyecta el proveedor real (proveedorSupabase.ts, vía main.tsx)
// y los tests inyectan un doble en memoria (src/tests/soporte/authFalso.ts),
// que reproduce exactamente este contrato.

import type { Resultado } from '../storeCultivos'

export interface Sesion {
  /** Nombre de usuario opcional del registro (D32); si falta, la UI muestra
   *  el texto del email anterior a la «@». */
  usuario: { email: string; nombreUsuario?: string }
}

/** Datos de perfil del registro (R-01 v3, D27): van como metadata del signup. */
export interface PerfilRegistro {
  telefono: string
  localidadId: number
  /** Nombre de usuario opcional (D32): solo metadata de Auth, sin BD. */
  nombreUsuario?: string
}

/**
 * T-28 — URL de redirección a la que el navegador debe viajar para completar
 * un acceso con un proveedor externo (Google). El proveedor NO devuelve
 * sesión: la sesión llega después, cuando la app vuelve del viaje y
 * Supabase Auth resuelve el código (o el token) en la URL.
 */
export interface UrlRedireccion {
  url: string
}

export interface ProveedorAuth {
  /** Instantánea síncrona y estable para `useSyncExternalStore`. */
  sesionActual(): Sesion | null
  /** Suscripción a cambios de sesión (login, logout, expiración). */
  suscribir(oyente: () => void): () => void
  iniciarSesion(email: string, clave: string): Promise<Resultado<Sesion>>
  registrarse(email: string, clave: string, perfil: PerfilRegistro): Promise<Resultado<Sesion>>
  /**
   * T-28 — Acceso con Google (OAuth). Devuelve la URL a la que hay que ir;
   * el alta de la cuenta y el regreso a la app los resuelve Supabase Auth
   * (el alta solo ocurre si la cuenta de Google no existía).
   */
  iniciarSesionConGoogle(): Promise<Resultado<UrlRedireccion>>
  /**
   * D43 — Cambia el nombre de usuario de la sesión abierta. El nombre vive
   * en la metadata de Auth (D32), no en la tabla de perfiles. Un nombre vacío
   * lo quita: la UI vuelve a mostrar la parte del email anterior a la «@».
   */
  actualizarNombreUsuario(nombre: string): Promise<Resultado<Sesion>>
  cerrarSesion(): Promise<void>
}
