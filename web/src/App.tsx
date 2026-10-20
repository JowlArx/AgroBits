import { useEffect, useState, useSyncExternalStore } from 'react'
import ListaCultivos from './pages/ListaCultivos'
import FormularioCultivo from './pages/FormularioCultivo'
import DetalleCultivo from './pages/DetalleCultivo'
import Alertas from './pages/Alertas'
import Autenticacion from './pages/Autenticacion'
import Cuenta from './pages/Cuenta'
import Sensores from './pages/Sensores'
import PanelLateral from './components/PanelLateral'
import Tablero from './components/Tablero'
import { cerrarSesion, obtenerSesion, suscribirSesion } from './data/storeSesion'
import { cargarDatosSesion, vaciarDatosSesion } from './data/cargarDatos'
import { obtenerCultivo, obtenerCultivos, suscribirCultivos } from './data/storeCultivos'
import { obtenerSensores, suscribirSensores } from './data/storeSensores'
import { alertasOrdenadas, obtenerAlertas, suscribirAlertas } from './data/storeAlertas'
import { obtenerMediciones, suscribirMediciones } from './data/medicionesSimuladas'

type Vista =
  | { tipo: 'lista' }
  | { tipo: 'nuevo' }
  | { tipo: 'editar'; id: string }
  | { tipo: 'detalle'; id: string }
  | { tipo: 'alertas' }
  | { tipo: 'sensores' }
  | { tipo: 'cuenta' }

/** Título del topbar (D31) según la vista actual. */
function tituloVista(vista: Vista): string {
  switch (vista.tipo) {
    case 'detalle':
      return obtenerCultivo(vista.id)?.nombre ?? 'Detalle del cultivo'
    case 'nuevo':
      return 'Nuevo cultivo'
    case 'editar':
      return 'Editar cultivo'
    case 'alertas':
      return 'Alertas'
    case 'sensores':
      return 'Sensores'
    case 'cuenta':
      return 'Mi cuenta'
    default:
      return 'Cultivos'
  }
}

/** Subtítulo contextual del topbar (D31): resumen de la vista. */
function resumenTopbar(vista: Vista, nCultivos: number, nSensores: number, nAlertas: number): string {
  switch (vista.tipo) {
    case 'lista':
      return `${nCultivos} ${nCultivos === 1 ? 'cultivo' : 'cultivos'} · ${nSensores} ${
        nSensores === 1 ? 'sensor activo' : 'sensores activos'
      }`
    case 'alertas':
      return `${nAlertas} ${nAlertas === 1 ? 'alerta activa' : 'alertas activas'} en el momento`
    case 'sensores':
      return `${nSensores} ${nSensores === 1 ? 'sensor registrado' : 'sensores registrados'}`
    case 'detalle':
      return 'Sensores y últimas mediciones del cultivo'
    case 'nuevo':
    case 'editar':
      return 'Nombre, tipo y umbrales de alerta'
    default:
      return 'Teléfono, localidad y acceso'
  }
}

// D33 — iconos de la cabecera (SVG en línea con currentColor, sin assets).
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

export default function App() {
  const [vista, setVista] = useState<Vista>({ tipo: 'lista' })
  // D33: menú desplegable de la cuenta (Mi cuenta / Cerrar sesión).
  const [menuAbierto, setMenuAbierto] = useState(false)
  // T-16/T-22: gate de acceso (D8) — sin sesión no se ve el contenido.
  const sesion = useSyncExternalStore(suscribirSesion, obtenerSesion)

  // D31 (topbar): el resumen de estado se deriva de los stores existentes.
  useSyncExternalStore(suscribirCultivos, obtenerCultivos)
  useSyncExternalStore(suscribirSensores, obtenerSensores)
  useSyncExternalStore(suscribirAlertas, obtenerAlertas)
  useSyncExternalStore(
    (oyente) => suscribirMediciones('topbar', oyente),
    () => obtenerSensores().map((s) => `${s.id}:${obtenerMediciones(s.id).length}`).join('|'),
  )
  const cultivos = obtenerCultivos()
  const sensores = obtenerSensores()
  const alertasActivas = alertasOrdenadas().filter((a) => a.estado === 'activa').length

  // T-23: con sesión se cargan los datos de la cuenta; al cerrar se vacía la
  // caché local para que la siguiente cuenta no vea datos de la anterior.
  useEffect(() => {
    if (sesion) void cargarDatosSesion()
    else vaciarDatosSesion()
  }, [sesion])

  if (!sesion) {
    return (
      <div className="app">
        {/* WCAG 2.4.1: el teclado puede saltarse la cabecera. */}
        <a className="saltar-contenido" href="#contenido">
          Saltar al contenido
        </a>
        <header className="cabecera">
          <h1>
            <img className="marca" src="/logo.png" width="28" height="28" alt="" />
            AgroBits
          </h1>
          <span className="etiqueta">Acceso y datos con Supabase (T-24)</span>
        </header>
        <main id="contenido">
          <Autenticacion />
        </main>
      </div>
    )
  }

  // D32/D33: nombre visible del disparador del menú (nombre o parte local del email).
  const nombreVisible = sesion.usuario.nombreUsuario?.trim() || sesion.usuario.email.split('@')[0]

  return (
    <div className="estructura">
      {/* WCAG 2.4.1: el teclado puede saltarse la cabecera del panel. */}
      <a className="saltar-contenido" href="#contenido">
        Saltar al contenido
      </a>
      <div className="zona-derecha">
        {/* D33 — cabecera del panel: la navegación (Cultivos/Alertas/Sensores)
            y la cuenta viven arriba; la barra lateral se retira porque quedaba
            demasiado vacía. Debajo sigue el topbar contextual (D31). */}
        <header className="cabecera-panel">
          <div className="fila-nav">
            <span className="marca-panel">
              <img className="marca" src="/logo.png" width="24" height="24" alt="" />
              AgroBits
            </span>
            <nav aria-label="Principal" className="nav-superior">
              <button
                type="button"
                data-testid="nav-cultivos"
                aria-current={vista.tipo === 'lista' ? 'page' : undefined}
                onClick={() => setVista({ tipo: 'lista' })}
              >
                {iconoHoja}
                Cultivos
              </button>
              <button
                type="button"
                data-testid="nav-alertas"
                aria-current={vista.tipo === 'alertas' ? 'page' : undefined}
                onClick={() => setVista({ tipo: 'alertas' })}
              >
                {iconoCampana}
                Alertas
              </button>
              <button
                type="button"
                data-testid="nav-sensores"
                aria-current={vista.tipo === 'sensores' ? 'page' : undefined}
                onClick={() => setVista({ tipo: 'sensores' })}
              >
                {iconoSensor}
                Sensores
              </button>
            </nav>
            <div className="sesion-superior">
              <button
                type="button"
                className="btn-usuario"
                data-testid="menu-usuario"
                aria-haspopup="menu"
                aria-expanded={menuAbierto}
                onClick={() => setMenuAbierto((abierto) => !abierto)}
              >
                {iconoCuenta}
                <span className="etiqueta" data-testid="sesion-usuario" title={sesion.usuario.email}>
                  {nombreVisible}
                </span>
              </button>
              {menuAbierto && (
                <>
                  {/* Clic fuera del menú: cierra sin afectar al contenido. */}
                  <div className="fondo-menu" onClick={() => setMenuAbierto(false)} aria-hidden="true" />
                  <div
                    className="menu-usuario"
                    role="menu"
                    onKeyDown={(evento) => {
                      if (evento.key === 'Escape') setMenuAbierto(false)
                    }}
                  >
                    <button
                      type="button"
                      role="menuitem"
                      data-testid="nav-cuenta"
                      onClick={() => {
                        setMenuAbierto(false)
                        setVista({ tipo: 'cuenta' })
                      }}
                    >
                      Mi cuenta
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      data-testid="cerrar-sesion"
                      onClick={() => {
                        setMenuAbierto(false)
                        void cerrarSesion()
                      }}
                    >
                      Cerrar sesión
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="topbar">
            <div className="titulo-topbar">
              <h2>{tituloVista(vista)}</h2>
              <p className="subtitulo-topbar">{resumenTopbar(vista, cultivos.length, sensores.length, alertasActivas)}</p>
            </div>
            <div className="acciones-topbar">
              <span className="chip-estado" data-testid="chip-sensores">
                <span className={sensores.length > 0 ? 'punto-estado activo' : 'punto-estado'} aria-hidden="true" />
                {sensores.length} {sensores.length === 1 ? 'sensor' : 'sensores'}
              </span>
              {alertasActivas > 0 && (
                <span className="chip-estado chip-alertas" data-testid="chip-alertas">
                  {alertasActivas} {alertasActivas === 1 ? 'alerta activa' : 'alertas activas'}
                </span>
              )}
            </div>
          </div>
        </header>
        <div className={vista.tipo === 'lista' ? 'cuerpo con-panel' : 'cuerpo'}>
          <main id="contenido">
            {vista.tipo === 'lista' && (
              <>
                <Tablero />
                <ListaCultivos
                  onNuevo={() => setVista({ tipo: 'nuevo' })}
                  onEditar={(id) => setVista({ tipo: 'editar', id })}
                  onVerMediciones={(id) => setVista({ tipo: 'detalle', id })}
                />
              </>
            )}
            {vista.tipo === 'nuevo' && (
              <FormularioCultivo onGuardado={() => setVista({ tipo: 'lista' })} onCancelar={() => setVista({ tipo: 'lista' })} />
            )}
            {vista.tipo === 'editar' && (
              <FormularioCultivo
                cultivoId={vista.id}
                onGuardado={() => setVista({ tipo: 'lista' })}
                onCancelar={() => setVista({ tipo: 'lista' })}
              />
            )}
            {vista.tipo === 'detalle' && (
              <DetalleCultivo cultivoId={vista.id} onVolver={() => setVista({ tipo: 'lista' })} />
            )}
            {vista.tipo === 'alertas' && <Alertas />}
            {vista.tipo === 'sensores' && <Sensores />}
            {vista.tipo === 'cuenta' && <Cuenta email={sesion.usuario.email} />}
          </main>
          {vista.tipo === 'lista' && <PanelLateral />}
        </div>
      </div>
    </div>
  )
}
