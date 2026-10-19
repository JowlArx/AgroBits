import { useEffect, useMemo, useState } from 'react'
import { iniciarSesion, registrarse, LONGITUD_MINIMA_CLAVE } from '../data/storeSesion'
import { exigirProveedor } from '../data/datos/proveedorDatos'
import type { Localidad } from '../data/datos/proveedorDatos'

// T-22 — Pantallas de acceso con autenticación REAL de Supabase (D8). La
// validación de formato (email y longitud mínima, R-01 AC3) es local y la
// regla de contraseña queda documentada en pantalla; el resto (duplicados,
// credenciales) lo resuelve el proveedor y la store traduce el mensaje.
// T-27 (D27, R-01 v3): el registro añade confirmación de contraseña (AC4),
// teléfono y localidad (AC5) con catálogo provincia→localidad de la BD. La
// validación de AC4/AC5 vive en la store (antes de tocar el servidor); aquí
// solo se recogen los datos y se muestra el resultado.

type Modo = 'sesion' | 'registro'

export default function Autenticacion() {
  // La landing (`index.html`, servida en `/`) enlaza a `/app.html?acceso=registro`:
  // el SPA abre directamente en modo registro (R-01). Sin parámetro, inicio de
  // sesión como siempre.
  const [modo, setModo] = useState<Modo>(() =>
    new URLSearchParams(window.location.search).get('acceso') === 'registro' ? 'registro' : 'sesion',
  )
  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [telefono, setTelefono] = useState('')
  const [provincia, setProvincia] = useState('')
  const [localidadId, setLocalidadId] = useState('')
  const [localidades, setLocalidades] = useState<Localidad[]>([])
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  // Catálogo de localidades (D27): se carga una vez; el registro es anónimo,
  // así que sirve también antes del login (RLS de `localidades` lo permite).
  useEffect(() => {
    let vivo = true
    exigirProveedor()
      .cargarLocalidades()
      .then((filas) => {
        if (vivo) setLocalidades(filas)
      })
      .catch(() => {
        if (vivo) setError('No se pudo cargar el catálogo de localidades. Recarga la página.')
      })
    return () => {
      vivo = false
    }
  }, [])

  const provincias = useMemo(
    () => [...new Set(localidades.map((l) => l.provincia))].sort((a, b) => a.localeCompare(b, 'es')),
    [localidades],
  )
  const localidadesDeLaProvincia = useMemo(
    () => localidades.filter((l) => l.provincia === provincia),
    [localidades, provincia],
  )

  async function enviar(evento: React.FormEvent): Promise<void> {
    evento.preventDefault()
    setEnviando(true)
    const resultado =
      modo === 'sesion'
        ? await iniciarSesion(email, clave)
        : await registrarse({ email, clave, confirmacion, telefono, localidadId: Number(localidadId) })
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
    <section data-testid="pantalla-acceso" className="pantalla-acceso">
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
            aria-describedby="reglas-clave"
            data-testid="clave"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
          />
          {/* R-01 AC3 / riesgo T-22: la regla queda documentada en pantalla. */}
          <small id="reglas-clave" data-testid="reglas-clave">Mínimo {LONGITUD_MINIMA_CLAVE} caracteres.</small>
        </label>
        {modo === 'registro' && (
          <>
            <label>
              Repite la contraseña
              <input
                type="password"
                name="confirmacion"
                autoComplete="new-password"
                data-testid="confirmar-clave"
                value={confirmacion}
                onChange={(e) => setConfirmacion(e.target.value)}
              />
            </label>
            <label>
              Teléfono
              {/* D27: dato de contacto y base futura de notificaciones; se
                  valida en la store (6–20 dígitos, admite + ( ) . - y
                  espacios) antes de tocar el servidor. */}
              <input
                type="tel"
                name="telefono"
                autoComplete="tel"
                data-testid="telefono"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="+54 9 261 555-1234"
              />
            </label>
            <label>
              Provincia
              <select
                name="provincia"
                data-testid="provincia"
                value={provincia}
                onChange={(e) => {
                  setProvincia(e.target.value)
                  setLocalidadId('')
                }}
              >
                <option value="">— Elige una provincia —</option>
                {provincias.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Localidad
              <select
                name="localidad"
                data-testid="localidad"
                value={localidadId}
                disabled={provincia === ''}
                onChange={(e) => setLocalidadId(e.target.value)}
              >
                <option value="">— Elige una localidad —</option>
                {localidadesDeLaProvincia.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.localidad}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        <button type="submit" className="btn-primario" data-testid="enviar-acceso" disabled={enviando}>
          {enviando ? 'Un momento…' : modo === 'sesion' ? 'Entrar' : 'Crear cuenta'}
        </button>
        {error && (
          <p role="alert" data-testid="error-acceso">
            {error}
          </p>
        )}
      </form>

      <button type="button" className="enlace-boton" data-testid="cambiar-modo" onClick={cambiarModo}>
        {modo === 'sesion' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
      </button>
    </section>
  )
}
