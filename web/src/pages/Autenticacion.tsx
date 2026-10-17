import { useState } from 'react'
import { iniciarSesion, registrarse } from '../data/storeSesion'

// T-16 — Pantallas de acceso PROVISIONALES (D6/D8). Maqueta de flujos de
// registro e inicio de sesión con usuario simulado. No valida R-01…R-03:
// la autenticación real (Supabase Auth + RLS) llega en la Fase 2.

type Modo = 'sesion' | 'registro'

export default function Autenticacion() {
  const [modo, setModo] = useState<Modo>('sesion')
  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState('')

  function enviar(evento: React.FormEvent): void {
    evento.preventDefault()
    const resultado = modo === 'sesion' ? iniciarSesion(email, clave) : registrarse(email, clave)
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

      <p className="aviso" data-testid="aviso-provisional">
        Acceso provisional (Fase 1): esta pantalla es una maqueta y <strong>no valida credenciales
        ni crea cuentas reales</strong>. La autenticación real llegará con Supabase en la Fase 2
        (requisitos R-01 a R-03).
      </p>

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
            data-testid="clave"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
          />
        </label>
        <button type="submit" data-testid="enviar-acceso">
          {modo === 'sesion' ? 'Entrar' : 'Crear cuenta'}
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
