import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
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

// Notificaciones nativas (Capacitor) solo en la app empaquetada.
if (Capacitor.isNativePlatform()) {
  // OAuth nativo: captura el redirect y completa la sesión.
  void import('@capacitor/app').then(({ App }) => {
    App.addListener('appUrlOpen', async (event) => {
      const url = event.url
      console.log('OAuth redirect:', url)
      if (url.includes('code=')) {
        const { data, error } = await clienteSupabase.auth.exchangeCodeForSession(url)
        console.log('OAuth exchange:', data, error)
        void import('@capacitor/browser').then(({ Browser }) => Browser.close())
      }
    })
  })
  let ultimoTokenPush: string | null = null
  void import('@capacitor/push-notifications').then(({ PushNotifications }) => {
    void PushNotifications.requestPermissions().then((permiso) => {
      if (permiso.receive === 'granted') void PushNotifications.register()
    })
    PushNotifications.addListener('registration', async (token) => {
      console.log('Push registration token:', token.value)
      ultimoTokenPush = token.value
      const { data } = await clienteSupabase.auth.getUser()
      if (!data.user) {
        console.log('Push: sin sesion, token pendiente')
        return
      }
      const { error } = await clienteSupabase.from('push_tokens').upsert(
        {
          user_id: data.user.id,
          token: token.value,
          platform: Capacitor.getPlatform(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'token' },
      )
      if (error) console.error('Push save error:', error.message)
      else console.log('Push token guardado:', token.value)
    })
    PushNotifications.addListener('registrationError', (error) => {
      console.error('Push registration error:', error)
    })
    PushNotifications.addListener('pushNotificationReceived', (notificacion) => {
      console.log('Push recibida:', notificacion)
    })
  })

  clienteSupabase.auth.onAuthStateChange((_evento, sesion) => {
    if (sesion && ultimoTokenPush) {
      void clienteSupabase.from('push_tokens').upsert(
        {
          user_id: sesion.user.id,
          token: ultimoTokenPush,
          platform: Capacitor.getPlatform(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'token' },
      )
    }
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
