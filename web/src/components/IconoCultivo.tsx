// D31 — Icono decorativo por tipo de cultivo: SVG en línea con currentColor
// (sin assets externos), acoplado al catálogo D27 — «Pimiento» lleva icono de
// pimiento, «Tomate» de tomate, etc. Los tipos personalizados o desconocidos
// usan un brote genérico. Es presentación pura: no afecta a los datos ni a
// los data-testid de las listas.

import type { ReactNode } from 'react'

/** Trazados por nombre de tipo (en minúsculas); «brotes» es el comodín. */
const TRAZADOS: Record<string, ReactNode> = {
  tomate: (
    <>
      <circle cx="12" cy="14.5" r="6.5" />
      <path d="M12 8V5" />
      <path d="M8.5 5.5C10 6 11 6.6 12 8c1-1.4 2-2 3.5-2.5" />
    </>
  ),
  pimiento: (
    <>
      <path d="M8.5 9.5c0-2.5 1.5-4 3.5-4s3.5 1.5 3.5 4c0 4.5-1.4 9.5-3.5 9.5s-3.5-5-3.5-9.5z" />
      <path d="M12 5.5V3.5" />
      <path d="M12 4.5c1.4-.8 3-.6 3.8.4" />
    </>
  ),
  lechuga: (
    <>
      <path d="M12 20.5c-5 0-8.5-3.4-8.5-7.8C3.5 8.2 7 4.8 12 4.8s8.5 3.4 8.5 7.9c0 4.4-3.5 7.8-8.5 7.8z" />
      <path d="M7.5 13.5c1-3 2.6-4.6 4.5-4.6s3.5 1.6 4.5 4.6" />
      <path d="M9.8 16.8c.3-2.2 1-3.7 2.2-4.6" />
    </>
  ),
  albahaca: (
    <>
      <path d="M12 20.5V10" />
      <path d="M12 13.5c2.2 0 4.8-1.9 5.3-5-3-.2-5 1.7-5.3 5z" />
      <path d="M12 10.5c-2.2 0-4.8-1.9-5.3-5 3-.2 5 1.7 5.3 5z" />
    </>
  ),
  brotes: (
    <>
      <path d="M12 20.5V9.5" />
      <path d="M12 13.5c-2.7 0-5.2-2-5.7-5.2 3.2-.2 5.4 1.9 5.7 5.2z" />
      <path d="M12 10.2c2.7 0 5.2-2 5.7-5.2-3.2-.2-5.4 1.9-5.7 5.2z" />
    </>
  ),
}

export default function IconoCultivo({ tipoCultivo, tamano = 18 }: { tipoCultivo: string; tamano?: number }) {
  const clave = tipoCultivo.trim().toLowerCase()
  return (
    <svg
      className="icono-cultivo"
      viewBox="0 0 24 24"
      width={tamano}
      height={tamano}
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {TRAZADOS[clave] ?? TRAZADOS.brotes}
    </svg>
  )
}
