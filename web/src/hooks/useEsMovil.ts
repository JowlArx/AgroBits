import { useEffect, useState } from 'react'

/**
 * D34 — Ancho (px) del breakpoint móvil. Debe coincidir con el `@media
 * (max-width: 48rem)` de `estilos.css`: con la raíz de 16 px, 48rem = 768 px.
 */
const ANCHO_MOVIL = 768

function enMovil(): boolean {
  return typeof window !== 'undefined' && window.innerWidth <= ANCHO_MOVIL
}

/**
 * D34 — Indica si la ventana entra en el breakpoint móvil.
 *
 * En móvil la navegación se dibuja en una barra inferior de iconos y en
 * escritorio en la cabecera, así que el DOM debe renderizar **una u otra**
 * (nunca las dos: los `data-testid` se repetirían y el contrato E2E se
 * rompería). El ancho se lee con `innerWidth` para no depender de
 * `matchMedia` (no existe en el entorno de pruebas jsdom).
 */
export function useEsMovil(): boolean {
  const [movil, setMovil] = useState(enMovil)

  useEffect(() => {
    const alRedimensionar = (): void => setMovil(enMovil())
    window.addEventListener('resize', alRedimensionar)
    return () => window.removeEventListener('resize', alRedimensionar)
  }, [])

  return movil
}
