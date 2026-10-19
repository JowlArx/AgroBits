// Barra lateral del panel (adaptación de AgroBits al layout del diseño de
// Figma «Snow Dashboard», node 98469:145265). Conserva los data-testid de la
// navegación (nav-cultivos / nav-alertas) y de la sesión (sesion-usuario /
// cerrar-sesion) que exigen los E2E: solo cambia la disposición, no el
// contrato. Los iconos son SVG en línea con currentColor (sin assets
// externos) para que sigan el token de color de cada tema.

import { cerrarSesion } from '../data/storeSesion'

interface Props {
  enAlertas: boolean
  email: string
  onCultivos: () => void
  onAlertas: () => void
}

const iconoHoja = (
  <svg className="icono-nav" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
    <path
      d="M2.5 13.5C2.5 8 6 3.5 13.5 2.5c1 7.5-3.5 11-9 11z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
    <path d="M3 13c3-4 6-6.5 8.5-8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
)

const iconoCampana = (
  <svg className="icono-nav" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
    <path
      d="M8 2a4 4 0 0 0-4 4v2.5L3 11h10l-1-2.5V6a4 4 0 0 0-4-4z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
    <path d="M6.5 13a1.5 1.5 0 0 0 3 0" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
)

export default function BarraLateral({ enAlertas, email, onCultivos, onAlertas }: Props) {
  return (
    <aside className="barra-lateral">
      <h1>
        <img className="marca" src="/logo.png" width="28" height="28" alt="" />
        AgroBits
      </h1>
      <nav aria-label="Principal" className="nav-lateral">
        <button
          type="button"
          data-testid="nav-cultivos"
          aria-current={enAlertas ? undefined : 'page'}
          onClick={onCultivos}
        >
          {iconoHoja}
          Cultivos
        </button>
        <button type="button" data-testid="nav-alertas" aria-current={enAlertas ? 'page' : undefined} onClick={onAlertas}>
          {iconoCampana}
          Alertas
        </button>
      </nav>
      <div className="pie-sesion">
        <span className="etiqueta" data-testid="sesion-usuario">
          {email}
        </span>
        <button type="button" data-testid="cerrar-sesion" onClick={() => void cerrarSesion()}>
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
