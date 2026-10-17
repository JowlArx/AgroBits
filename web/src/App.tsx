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
      <header className="cabecera">
        <h1>AgroBits</h1>
        <span className="etiqueta">Acceso y datos con Supabase (T-23)</span>
        {sesion && (
          <>
            <span className="etiqueta" data-testid="sesion-usuario">
              {sesion.usuario.email}
            </span>
            <button type="button" data-testid="cerrar-sesion" onClick={() => void cerrarSesion()}>
              Cerrar sesión
            </button>
            <nav>
              <button type="button" data-testid="nav-cultivos" onClick={() => setVista({ tipo: 'lista' })}>
                Cultivos
              </button>
              <button type="button" data-testid="nav-alertas" onClick={() => setVista({ tipo: 'alertas' })}>
                Alertas
              </button>
            </nav>
          </>
        )}
      </header>

      <main>
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
