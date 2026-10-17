import { useState } from 'react'
import ListaCultivos from './pages/ListaCultivos'
import FormularioCultivo from './pages/FormularioCultivo'

type Vista = { tipo: 'lista' } | { tipo: 'nuevo' } | { tipo: 'editar'; id: string }

export default function App() {
  const [vista, setVista] = useState<Vista>({ tipo: 'lista' })

  return (
    <div className="app">
      <header className="cabecera">
        <h1>AgroBits</h1>
        <span className="etiqueta">Fase 1 — datos simulados · acceso provisional</span>
      </header>

      <main>
        {vista.tipo === 'lista' && (
          <ListaCultivos
            onNuevo={() => setVista({ tipo: 'nuevo' })}
            onEditar={(id) => setVista({ tipo: 'editar', id })}
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
      </main>
    </div>
  )
}
