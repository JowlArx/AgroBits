import { useState } from 'react'
import { iniciarSesion, registrarse, LONGITUD_MINIMA_CLAVE } from '../data/storeSesion'

// T-22 — Pantallas de acceso con autenticación REAL de Supabase (D8). La
// validación de formato (email y longitud mínima, R-01 AC3) es local y la
// regla de contraseña queda documentada en pantalla; el resto (duplicados,
// credenciales) lo resuelve el proveedor y la store traduce el mensaje.

type Modo = 'sesion' | 'registro'

export default function Autenticacion() {
  const [modo, setModo] = useState<Modo>('sesion')
  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(evento: React.FormEvent): Promise<void> {
    evento.preventDefault()
    setEnviando(true)
    const resultado = modo === 'sesion' ? await iniciarSesion(email, clave) : await registrarse(email, clave)
    setEnviando(false)
    if (!resultado.ok) {
      setError(resultado.errores.map((e) => e.motivo).join('. '))
      return
    }
    setError('')
  }

  function cambiarModo(): void {
    setModo((m) => (m === 'sesion' ? 'registro' : 'sesion'))
    setError('')
  }

  return (
    <section data-testid="pantalla-acceso">
      <h2>{modo === 'sesion' ? 'Iniciar sesión' : 'Crear cuenta'}</h2>

      <form onSubmit={enviar}>
        <label>
          Email
          {/* type="text": la validación de formato es nuestra (mensaje en
              español y pruebaable); la nativa del navegador la bloquearía. */}
          <input
            type="text"
            name="email"
            autoComplete="email"
            data-testid="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="persona@ejemplo.com"
          />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            name="clave"
            autoComplete={modo === 'sesion' ? 'current-password' : 'new-password'}
            data-testid="clave"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
          />
          {/* R-01 AC3 / riesgo T-22: la regla queda documentada en pantalla. */}
          <small data-testid="reglas-clave">Mínimo {LONGITUD_MINIMA_CLAVE} caracteres.</small>
        </label>
        <button type="submit" data-testid="enviar-acceso" disabled={enviando}>
          {enviando ? 'Un momento…' : modo === 'sesion' ? 'Entrar' : 'Crear cuenta'}
        </button>
        {error && (
          <p role="alert" data-testid="error-acceso">
            {error}
          </p>
        )}
      </form>

      <button type="button" data-testid="cambiar-modo" onClick={cambiarModo}>
        {modo === 'sesion' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
      </button>
    </section>
  )
}
