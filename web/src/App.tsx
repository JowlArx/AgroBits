import { useEffect, useState, useSyncExternalStore } from 'react'
import ListaCultivos from './pages/ListaCultivos'
import FormularioCultivo from './pages/FormularioCultivo'
import DetalleCultivo from './pages/DetalleCultivo'
import Alertas from './pages/Alertas'
import Autenticacion from './pages/Autenticacion'
import Cuenta from './pages/Cuenta'
import Sensores from './pages/Sensores'
import BarraLateral from './components/BarraLateral'
import PanelLateral from './components/PanelLateral'
import Tablero from './components/Tablero'
import { obtenerSesion, suscribirSesion } from './data/storeSesion'
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

export default function App() {
  const [vista, setVista] = useState<Vista>({ tipo: 'lista' })
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

  return (
    <div className="estructura">
      {/* WCAG 2.4.1: el teclado puede saltarse la barra lateral. */}
      <a className="saltar-contenido" href="#contenido">
        Saltar al contenido
      </a>
      <BarraLateral
        enCultivos={vista.tipo === 'lista'}
        enAlertas={vista.tipo === 'alertas'}
        enSensores={vista.tipo === 'sensores'}
        enCuenta={vista.tipo === 'cuenta'}
        email={sesion.usuario.email}
        nombre={sesion.usuario.nombreUsuario}
        onCultivos={() => setVista({ tipo: 'lista' })}
        onAlertas={() => setVista({ tipo: 'alertas' })}
        onSensores={() => setVista({ tipo: 'sensores' })}
        onCuenta={() => setVista({ tipo: 'cuenta' })}
      />
      <div className="zona-derecha">
        {/* D31 — topbar: título + resumen contextual a la izquierda; chip de
            estado (sensores/alertas) y acción rápida a la derecha. Sustituye a
            las migas y a la etiqueta técnica anterior. */}
        <header className="topbar">
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
            {vista.tipo === 'lista' && (
              <button
                type="button"
                className="btn-primario btn-rapido"
                data-testid="anadir-cultivo"
                onClick={() => setVista({ tipo: 'nuevo' })}
              >
                Añadir cultivo
              </button>
            )}
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
