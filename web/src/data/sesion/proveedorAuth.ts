// T-22 — Contrato de la capa de autenticación (intercambiable, plan.md §2).
// La store de sesión no conoce Supabase: delega en un ProveedorAuth. La
// aplicación inyecta el proveedor real (proveedorSupabase.ts, vía main.tsx)
// y los tests inyectan un doble en memoria (src/tests/soporte/authFalso.ts),
// que reproduce exactamente este contrato.

import type { Resultado } from '../storeCultivos'

export interface Sesion {
  usuario: { email: string }
}

/** Datos de perfil del registro (R-01 v3, D27): van como metadata del signup. */
export interface PerfilRegistro {
  telefono: string
  localidadId: number
}

export interface ProveedorAuth {
  /** Instantánea síncrona y estable para `useSyncExternalStore`. */
  sesionActual(): Sesion | null
  /** Suscripción a cambios de sesión (login, logout, expiración). */
  suscribir(oyente: () => void): () => void
  iniciarSesion(email: string, clave: string): Promise<Resultado<Sesion>>
  registrarse(email: string, clave: string, perfil: PerfilRegistro): Promise<Resultado<Sesion>>
  cerrarSesion(): Promise<void>
}
