// T-22 — Store de sesión con autenticación REAL (D8: Fase 2 = Supabase Auth).
// La store NO conoce Supabase: delega en el ProveedorAuth inyectado (capa
// intercambiable, plan.md §2). La aplicación real inyecta ProveedorSupabase
// en `main.tsx`; los tests inyectan un doble en memoria desde
// `src/tests/soporte/configurarTests.ts`. El acceso simulado de la Fase 1
// (T-16) queda retirado: aquí solo vive la validación de formato barata
// (email y longitud mínima de la contraseña, R-01 AC3) y la traducción de
// los resultados del proveedor.

import type { Resultado, ErrorCampo } from './storeCultivos'
import type { ProveedorAuth, Sesion } from './sesion/proveedorAuth'
import { LONGITUD_MINIMA_CLAVE } from './sesion/reglas'

export type { Sesion }
export { LONGITUD_MINIMA_CLAVE }

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

let proveedor: ProveedorAuth | null = null

/** Inyecta el proveedor de autenticación (una vez, al arrancar la app). */
export function configurarProveedorAuth(nuevo: ProveedorAuth): void {
  proveedor = nuevo
}

function exigirProveedor(): ProveedorAuth {
  if (!proveedor) throw new Error('Proveedor de autenticación no configurado (ver main.tsx)')
  return proveedor
}

export function suscribirSesion(oyente: () => void): () => void {
  return exigirProveedor().suscribir(oyente)
}

/** Instantánea para `useSyncExternalStore` (misma referencia mientras no cambie). */
export function obtenerSesion(): Sesion | null {
  return proveedor ? proveedor.sesionActual() : null
}

function validar(email: string, clave: string): ErrorCampo[] {
  const errores: ErrorCampo[] = []
  if (!RE_EMAIL.test(email.trim())) {
    errores.push({ campo: 'email', motivo: 'Introduce un email válido (ejemplo@dominio.com)' })
  }
  if (clave === '') {
    errores.push({ campo: 'clave', motivo: 'La contraseña es obligatoria' })
  } else if (clave.length < LONGITUD_MINIMA_CLAVE) {
    errores.push({
      campo: 'clave',
      motivo: `La contraseña debe tener al menos ${LONGITUD_MINIMA_CLAVE} caracteres`,
    })
  }
  return errores
}

/** Inicio de sesión real (R-01/R-03): valida el formato y delega en el proveedor. */
export async function iniciarSesion(email: string, clave: string): Promise<Resultado<Sesion>> {
  const errores = validar(email, clave)
  if (errores.length > 0) return { ok: false, errores }
  return exigirProveedor().iniciarSesion(email.trim(), clave)
}

/** Registro real (R-01): el proveedor rechaza los emails ya registrados. */
export async function registrarse(email: string, clave: string): Promise<Resultado<Sesion>> {
  const errores = validar(email, clave)
  if (errores.length > 0) return { ok: false, errores }
  return exigirProveedor().registrarse(email.trim(), clave)
}

/** Cierre de sesión (R-03 AC1): al volver, el gate vuelve a exigir acceso. */
export async function cerrarSesion(): Promise<void> {
  await exigirProveedor().cerrarSesion()
}
