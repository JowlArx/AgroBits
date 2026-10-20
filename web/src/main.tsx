import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { clienteSupabase } from './data/clienteSupabase'
import { ProveedorSupabase } from './data/sesion/proveedorSupabase'
import { configurarProveedorAuth } from './data/storeSesion'
import { ProveedorDatosSupabase } from './data/datos/proveedorDatosSupabase'
import { configurarProveedorDatos } from './data/datos/proveedorDatos'
import { ProgramadorTemporizado, configurarProgramadorLecturas } from './data/programadorLecturas'
import './tokens.css'
import './estilos.css'

// T-22/T-23/T-24: la app real usa auth y datos de Supabase (D8, capa
// intercambiable) y el generador de lecturas simuladas (1/5 min/sensor, D15).
// Los tests NO pasan por aquí: inyectan dobles en memoria en
// src/tests/soporte/configurarTests.ts.
configurarProveedorAuth(new ProveedorSupabase(clienteSupabase))
configurarProveedorDatos(new ProveedorDatosSupabase(clienteSupabase))
configurarProgramadorLecturas(new ProgramadorTemporizado())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
