// Barra lateral del panel (adaptación de AgroBits al layout del diseño de
// Figma «Snow Dashboard», node 98469:145265). Conserva los data-testid de la
// navegación (nav-cultivos / nav-alertas) y de la sesión (sesion-usuario /
// cerrar-sesion) que exigen los E2E: solo cambia la disposición, no el
// contrato. D30: se añaden «Sensores» (nav-sensores) y la entrada de cuenta
// (nav-cuenta) junto al cierre de sesión. Los iconos son SVG en línea con
// currentColor (sin assets externos) para que sigan el token de color de cada
// tema.

import { cerrarSesion } from '../data/storeSesion'

interface Props {
  enCultivos: boolean
  enAlertas: boolean
  enSensores: boolean
  enCuenta: boolean
  email: string
  /** Nombre de usuario opcional (D32); sin él se muestra el email antes de la «@». */
  nombre?: string
  onCultivos: () => void
  onAlertas: () => void
  onSensores: () => void
  onCuenta: () => void
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

const iconoSensor = (
  <svg className="icono-nav" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
    <circle cx="8" cy="11" r="1.6" fill="currentColor" />
    <path d="M4.8 8.2a4.5 4.5 0 0 1 6.4 0" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    <path d="M2.6 5.9a7.6 7.6 0 0 1 10.8 0" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
)

const iconoCuenta = (
  <svg className="icono-nav" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
    <circle cx="8" cy="5.5" r="2.8" fill="none" stroke="currentColor" strokeWidth="1.4" />
    <path d="M2.8 14c.6-2.8 2.7-4.2 5.2-4.2s4.6 1.4 5.2 4.2" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
)

export default function BarraLateral({ enCultivos, enAlertas, enSensores, enCuenta, email, nombre, onCultivos, onAlertas, onSensores, onCuenta }: Props) {
  // D32: se muestra el nombre de usuario si existe; si no, el texto del email
  // antes de la «@» (el email completo queda en el tooltip del botón).
  const nombreVisible = nombre?.trim() || email.split('@')[0]
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
          aria-current={enCultivos ? 'page' : undefined}
          onClick={onCultivos}
        >
          {iconoHoja}
          Cultivos
        </button>
        <button type="button" data-testid="nav-alertas" aria-current={enAlertas ? 'page' : undefined} onClick={onAlertas}>
          {iconoCampana}
          Alertas
        </button>
        <button type="button" data-testid="nav-sensores" aria-current={enSensores ? 'page' : undefined} onClick={onSensores}>
          {iconoSensor}
          Sensores
        </button>
      </nav>
      <div className="pie-sesion">
        <button
          type="button"
          className="btn-cuenta"
          data-testid="nav-cuenta"
          aria-current={enCuenta ? 'page' : undefined}
          onClick={onCuenta}
        >
          {iconoCuenta}
          <span className="etiqueta" data-testid="sesion-usuario" title={email}>
            {nombreVisible}
          </span>
        </button>
        <button type="button" data-testid="cerrar-sesion" onClick={() => void cerrarSesion()}>
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
