import { useEffect, useState, useSyncExternalStore } from 'react'
import ListaCultivos from './pages/ListaCultivos'
import FormularioCultivo from './pages/FormularioCultivo'
import DetalleCultivo from './pages/DetalleCultivo'
import Alertas from './pages/Alertas'
import Autenticacion from './pages/Autenticacion'
import { cerrarSesion, obtenerSesion, suscribirSesion } from './data/storeSesion'
import { cargarDatosSesion, vaciarDatosSesion } from './data/cargarDatos'

type Vista =
  | { tipo: 'lista' }
  | { tipo: 'nuevo' }
  | { tipo: 'editar'; id: string }
  | { tipo: 'detalle'; id: string }
  | { tipo: 'alertas' }

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

  return (
    <div className="app">
      {/* WCAG 2.4.1: el teclado puede saltarse la cabecera. */}
      <a className="saltar-contenido" href="#contenido">
        Saltar al contenido
      </a>
      <header className="cabecera">
        <h1>
          <svg className="marca" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              fill="currentColor"
              d="M12 3c-1.5 3-4 5-7 5.5C6 14 8.5 18 12 21c3.5-3 6-7 7-12.5-3-.5-5.5-2.5-7-5.5Z"
            />
          </svg>
          AgroBits
        </h1>
        <span className="etiqueta">Acceso y datos con Supabase (T-24)</span>
        {sesion && (
          <>
            <span className="etiqueta" data-testid="sesion-usuario">
              {sesion.usuario.email}
            </span>
            <button type="button" data-testid="cerrar-sesion" onClick={() => void cerrarSesion()}>
              Cerrar sesión
            </button>
            <nav aria-label="Principal">
              <button
                type="button"
                data-testid="nav-cultivos"
                aria-current={vista.tipo === 'alertas' ? undefined : 'page'}
                onClick={() => setVista({ tipo: 'lista' })}
              >
                Cultivos
              </button>
              <button
                type="button"
                data-testid="nav-alertas"
                aria-current={vista.tipo === 'alertas' ? 'page' : undefined}
                onClick={() => setVista({ tipo: 'alertas' })}
              >
                Alertas
              </button>
            </nav>
          </>
        )}
      </header>

      <main id="contenido">
        {!sesion ? (
          <Autenticacion />
        ) : (
          <>
            {vista.tipo === 'lista' && (
              <ListaCultivos
                onNuevo={() => setVista({ tipo: 'nuevo' })}
                onEditar={(id) => setVista({ tipo: 'editar', id })}
                onVerMediciones={(id) => setVista({ tipo: 'detalle', id })}
              />
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
          </>
        )}
      </main>
    </div>
  )
}
