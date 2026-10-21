/**
 * D40 — El estado que dice «dónde está el usuario» vive también en la URL.
 *
 * Antes de este cambio la navegación era estado de React: recargar perdía el
 * sitio y el botón «atrás» del navegador (clave en móvil) salía de la
 * aplicación en vez de volver a la sección anterior. Con la URL reflecting
 * el estado, cada vista es enlazable y el historial funciona.
 *
 * Uso típico:
 * - Navegar entre vistas → `push` (cada visita es un paso del historial).
 * - Cambiar un filtro → `replace` (no llena el historial de pasos).
 */

/** Lee un parámetro de la query string (`null` si no está). */
export function leerParam(nombre: string): string | null {
  return new URLSearchParams(window.location.search).get(nombre)
}

/**
 * Escribe parámetros en la URL sin recargar la página. Un valor `null` (o
 * vacío) borra el parámetro.
 */
export function escribirParams(
  cambios: Record<string, string | null>,
  modo: 'push' | 'replace' = 'replace',
): void {
  const params = new URLSearchParams(window.location.search)
  for (const [clave, valor] of Object.entries(cambios)) {
    if (valor === null || valor === '') params.delete(clave)
    else params.set(clave, valor)
  }
  const query = params.toString()
  const url = `${window.location.pathname}${query ? `?${query}` : ''}`
  if (modo === 'push') window.history.pushState(null, '', url)
  else window.history.replaceState(null, '', url)
}

/** Avisa de los cambios de URL (botón «atrás» / «adelante» del navegador). */
export function alCambiarUrl(oyente: () => void): () => void {
  window.addEventListener('popstate', oyente)
  return () => window.removeEventListener('popstate', oyente)
}
