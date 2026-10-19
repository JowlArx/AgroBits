import { useEffect, useState, useSyncExternalStore } from 'react'
import ListaCultivos from './pages/ListaCultivos'
import FormularioCultivo from './pages/FormularioCultivo'
import DetalleCultivo from './pages/DetalleCultivo'
import Alertas from './pages/Alertas'
import Autenticacion from './pages/Autenticacion'
import BarraLateral from './components/BarraLateral'
import PanelLateral from './components/PanelLateral'
import Tablero from './components/Tablero'
import { obtenerSesion, suscribirSesion } from './data/storeSesion'
import { cargarDatosSesion, vaciarDatosSesion } from './data/cargarDatos'

type Vista =
  | { tipo: 'lista' }
  | { tipo: 'nuevo' }
  | { tipo: 'editar'; id: string }
  | { tipo: 'detalle'; id: string }
  | { tipo: 'alertas' }

/** Etiqueta del migas (breadcrumb) del topbar según la vista actual. */
function seccionActual(vista: Vista): string {
  switch (vista.tipo) {
    case 'alertas':
      return 'Alertas'
    case 'detalle':
      return 'Detalle del cultivo'
    case 'nuevo':
    case 'editar':
      return 'Formulario de cultivo'
    default:
      return 'Cultivos'
  }
}

export default function App() {
  const [vista, setVista] = useState<Vista>({ tipo: 'lista' })
  // T-16/T-22: gate de acceso (D8) — sin sesión no se ve el contenido.
  const sesion = useSyncExternalStore(suscribirSesion, obtenerSesion)

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

  return (
    <div className="estructura">
      {/* WCAG 2.4.1: el teclado puede saltarse la barra lateral. */}
      <a className="saltar-contenido" href="#contenido">
        Saltar al contenido
      </a>
      <BarraLateral
        enAlertas={vista.tipo === 'alertas'}
        email={sesion.usuario.email}
        onCultivos={() => setVista({ tipo: 'lista' })}
        onAlertas={() => setVista({ tipo: 'alertas' })}
      />
      <div className="zona-derecha">
        <header className="topbar">
          <nav aria-label="Migas">
            <p className="migas">
              AgroBits <span aria-hidden="true">/</span> <strong>{seccionActual(vista)}</strong>
            </p>
          </nav>
          <span className="etiqueta">Acceso y datos con Supabase (T-24)</span>
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
          </main>
          {vista.tipo === 'lista' && <PanelLateral />}
        </div>
      </div>
    </div>
  )
}
