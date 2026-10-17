import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { clienteSupabase } from './data/clienteSupabase'
import { ProveedorSupabase } from './data/sesion/proveedorSupabase'
import { configurarProveedorAuth } from './data/storeSesion'
import { ProveedorDatosSupabase } from './data/datos/proveedorDatosSupabase'
import { configurarProveedorDatos } from './data/datos/proveedorDatos'
import './estilos.css'

// T-22/T-23: la app real usa auth y datos de Supabase (D8, capa
// intercambiable). Los tests NO pasan por aquí: inyectan dobles en memoria en
// src/tests/soporte/configurarTests.ts.
configurarProveedorAuth(new ProveedorSupabase(clienteSupabase))
configurarProveedorDatos(new ProveedorDatosSupabase(clienteSupabase))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
