// T-22 — Store de sesión con autenticación REAL (D8: Fase 2 = Supabase Auth).
// La store NO conoce Supabase: delega en el ProveedorAuth inyectado (capa
// intercambiable, plan.md §2). La aplicación real inyecta ProveedorSupabase
// en `main.tsx`; los tests inyectan un doble en memoria desde
// `src/tests/soporte/configurarTests.ts`. El acceso simulado de la Fase 1
// (T-16) queda retirado: aquí solo vive la validación de formato barata
// (email y longitud mínima de la contraseña, R-01 AC3) y la traducción de
// los resultados del proveedor.
// T-27 (D27, R-01 v3): el registro exige además confirmación de contraseña
// (AC4), teléfono (AC5) y localidad del catálogo (AC5) — TODO validado aquí,
// antes de tocar el proveedor, de modo que un registro inválido nunca llega
// al servidor. El perfil persistido se verifica en BD (AC6, suite SQL T-27).

import type { Resultado, ErrorCampo } from './storeCultivos'
import type { ProveedorAuth, Sesion } from './sesion/proveedorAuth'
import { LONGITUD_MINIMA_CLAVE } from './sesion/reglas'

export type { Sesion }
export { LONGITUD_MINIMA_CLAVE }

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Formato admitido de teléfono: dígitos con `+ ( ) . -` y espacios (D27). */
const RE_TELEFONO = /^\+?[\d\s().-]+$/
const DIGITOS_MIN_TELEFONO = 6
const DIGITOS_MAX_TELEFONO = 20

/** Datos del formulario de registro (R-01 v3, D27). */
export interface DatosRegistro {
  email: string
  clave: string
  confirmacion: string
  telefono: string
  /** id de la fila elegida en el catálogo `localidades` (0 = sin elegir). */
  localidadId: number
}

/** El teléfono es obligatorio: 6–20 dígitos, admite `+ ( ) . -` y espacios. */
export function telefonoValido(telefono: string): boolean {
  const limpio = telefono.trim()
  if (!RE_TELEFONO.test(limpio)) return false
  const digitos = limpio.replace(/\D/g, '').length
  return digitos >= DIGITOS_MIN_TELEFONO && digitos <= DIGITOS_MAX_TELEFONO
}

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

/** Validación del registro (R-01 v3): formato + perfil, sin tocar el proveedor. */
function validarRegistro(datos: DatosRegistro): ErrorCampo[] {
  const errores = validar(datos.email, datos.clave)
  if (datos.clave !== datos.confirmacion) {
    errores.push({ campo: 'confirmacion', motivo: 'Las contraseñas no coinciden' })
  }
  if (datos.telefono.trim() === '') {
    errores.push({ campo: 'telefono', motivo: 'El teléfono es obligatorio' })
  } else if (!telefonoValido(datos.telefono)) {
    errores.push({
      campo: 'telefono',
      motivo: 'El teléfono debe tener entre 6 y 20 dígitos (admite +, espacios, paréntesis, puntos y guiones)',
    })
  }
  if (!Number.isInteger(datos.localidadId) || datos.localidadId <= 0) {
    errores.push({ campo: 'localidad', motivo: 'Selecciona una provincia y una localidad' })
  }
  return errores
}

/** Registro real (R-01 v3, D27): valida el PERFIL aquí (AC4/AC5) y delega. */
export async function registrarse(datos: DatosRegistro): Promise<Resultado<Sesion>> {
  const errores = validarRegistro(datos)
  if (errores.length > 0) return { ok: false, errores }
  return exigirProveedor().registrarse(datos.email.trim(), datos.clave, {
    telefono: datos.telefono.trim(),
    localidadId: datos.localidadId,
  })
}

/** Cierre de sesión (R-03 AC1): al volver, el gate vuelve a exigir acceso. */
export async function cerrarSesion(): Promise<void> {
  await exigirProveedor().cerrarSesion()
}
