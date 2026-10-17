import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { clienteSupabase } from './data/clienteSupabase'
import { ProveedorSupabase } from './data/sesion/proveedorSupabase'
import { configurarProveedorAuth } from './data/storeSesion'
import './estilos.css'

// T-22: la app real usa autenticación de Supabase (D8). Los tests NO pasan
// por aquí: inyectan un doble en memoria en src/tests/soporte/configurarTests.ts.
configurarProveedorAuth(new ProveedorSupabase(clienteSupabase))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
