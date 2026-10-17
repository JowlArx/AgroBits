import { useState, useSyncExternalStore } from 'react'
import ListaCultivos from './pages/ListaCultivos'
import FormularioCultivo from './pages/FormularioCultivo'
import DetalleCultivo from './pages/DetalleCultivo'
import Alertas from './pages/Alertas'
import Autenticacion from './pages/Autenticacion'
import { cerrarSesion, obtenerSesion, suscribirSesion } from './data/storeSesion'

type Vista =
  | { tipo: 'lista' }
  | { tipo: 'nuevo' }
  | { tipo: 'editar'; id: string }
  | { tipo: 'detalle'; id: string }
  | { tipo: 'alertas' }

export default function App() {
  const [vista, setVista] = useState<Vista>({ tipo: 'lista' })
  // T-16: gate de acceso PROVISIONAL (D8) — sin sesión no se ve el contenido.
  const sesion = useSyncExternalStore(suscribirSesion, obtenerSesion)

  return (
    <div className="app">
      <header className="cabecera">
        <h1>AgroBits</h1>
        <span className="etiqueta">Fase 1 — datos simulados · acceso provisional</span>
        {sesion && (
          <>
            <span className="etiqueta" data-testid="sesion-usuario">
              {sesion.usuario.email}
            </span>
            <button type="button" data-testid="cerrar-sesion" onClick={cerrarSesion}>
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
