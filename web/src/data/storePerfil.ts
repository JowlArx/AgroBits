// D30 — Store de perfil editable (teléfono y localidad, D27): la vista
// Cuenta lee aquí y delega la escritura en el ProveedorDatos inyectado. La
// validación de formato vive ANTES de tocar el servidor (mismo criterio que
// storeSesion): teléfono 6–20 dígitos con `+ ( ) . -` y espacios, y
// localidad del catálogo (>0). La escritura REAL es del RPC
// `actualizar_perfil` (único punto servidor, D19/D27).

import type { Resultado, Perfil } from './datos/proveedorDatos'
import { exigirProveedor } from './datos/proveedorDatos'
import { telefonoValido } from './storeSesion'

let perfil: Perfil | null = null
const oyentes = new Set<() => void>()

function notificar(): void {
  for (const oyente of oyentes) oyente()
}

export function suscribirPerfil(oyente: () => void): () => void {
  oyentes.add(oyente)
  return () => oyentes.delete(oyente)
}

/** Instantánea para `useSyncExternalStore` (misma referencia mientras no cambie). */
export function obtenerPerfil(): Perfil | null {
  return perfil
}

/** Carga el perfil propio desde la BD (`null` si la cuenta no tiene fila). */
export async function cargarPerfil(): Promise<void> {
  try {
    const leido = await exigirProveedor().cargarPerfil()
    perfil = leido
    notificar()
  } catch (error) {
    console.error('No se pudo cargar el perfil', error)
  }
}

/** Valida y guarda el perfil; al fallar, la caché no cambia. */
export async function guardarPerfil(telefono: string, localidadId: number): Promise<Resultado<Perfil>> {
  const errores = []
  if (telefono.trim() === '') {
    errores.push({ campo: 'telefono', motivo: 'El teléfono es obligatorio' })
  } else if (!telefonoValido(telefono)) {
    errores.push({
      campo: 'telefono',
      motivo: 'El teléfono debe tener entre 6 y 20 dígitos (admite +, espacios, paréntesis, puntos y guiones)',
    })
  }
  if (!Number.isInteger(localidadId) || localidadId <= 0) {
    errores.push({ campo: 'localidad', motivo: 'Selecciona una provincia y una localidad' })
  }
  if (errores.length > 0) return { ok: false, errores }

  const resultado = await exigirProveedor().actualizarPerfil(telefono, localidadId)
  if (resultado.ok) {
    perfil = resultado.valor
    notificar()
  }
  return resultado
}

/** Vacia la caché local sin tocar el proveedor (cierre de sesión / tests). */
export function vaciarPerfil(): void {
  perfil = null
  notificar()
}

/** Solo para tests: vuelve al estado inicial. */
export function reiniciarPerfil(): void {
  vaciarPerfil()
}
