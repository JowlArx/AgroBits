import { useState } from 'react'
import ListaCultivos from './pages/ListaCultivos'
import FormularioCultivo from './pages/FormularioCultivo'
import DetalleCultivo from './pages/DetalleCultivo'
import Alertas from './pages/Alertas'

type Vista =
  | { tipo: 'lista' }
  | { tipo: 'nuevo' }
  | { tipo: 'editar'; id: string }
  | { tipo: 'detalle'; id: string }
  | { tipo: 'alertas' }

export default function App() {
  const [vista, setVista] = useState<Vista>({ tipo: 'lista' })

  return (
    <div className="app">
      <header className="cabecera">
        <h1>AgroBits</h1>
        <span className="etiqueta">Fase 1 — datos simulados · acceso provisional</span>
        <nav>
          <button type="button" data-testid="nav-cultivos" onClick={() => setVista({ tipo: 'lista' })}>
            Cultivos
          </button>
          <button type="button" data-testid="nav-alertas" onClick={() => setVista({ tipo: 'alertas' })}>
            Alertas
          </button>
        </nav>
      </header>

      <main>
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
      </main>
    </div>
  )
}
