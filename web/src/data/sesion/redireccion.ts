// T-28 — Redirección del navegador aislada. La pantalla de acceso navega a la
// URL que devuelve el proveedor (el viaje a Google); aquí esa navegación se
// separa del resto para poder comprobarla en los tests sin navegar de verdad
// (jsdom no navega) y para no dejar `window` por medio de las pantallas.

export type Redireccion = (url: string) => void

const irConElNavegador: Redireccion = (url) => {
  window.location.assign(url)
}

let redireccion: Redireccion = irConElNavegador

/** Sustituye la redirección (tests). */
export function configurarRedireccion(nueva: Redireccion): void {
  redireccion = nueva
}

/** Vuelve a la redirección real del navegador. */
export function restablecerRedireccion(): void {
  redireccion = irConElNavegador
}

/** Navega a la URL indicada. */
export function redirigir(url: string): void {
  redireccion(url)
}
