import { useEffect, useMemo, useState } from 'react'
import { iniciarSesion, iniciarSesionConGoogle, registrarse, LONGITUD_MINIMA_CLAVE } from '../data/storeSesion'
import { redirigir } from '../data/sesion/redireccion'
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
// T-28: acceso con Google (OAuth). El botón pide la URL al proveedor y
// navega (la redirección va aislada en `data/sesion/redireccion.ts`); la
// sesión llega sola cuando el navegador vuelve.

/** Ojo para mostrar u ocultar la contraseña del campo que lo acompaña. */
function BotonVerClave({ visible, onAlternar }: { visible: boolean; onAlternar: () => void }) {
  return (
    <button
      type="button"
      className="boton-ver-clave"
      aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      aria-pressed={visible}
      onClick={onAlternar}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
        <circle cx="12" cy="12" r="3" />
        {visible && <path d="M3 3l18 18" />}
      </svg>
    </button>
  )
}

type Modo = 'sesion' | 'registro'

/** Logotipo oficial de Google (G de cuatro colores) para el botón de acceso. */
const iconoGoogle = (
  <svg className="icono-google" width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
    <path
      fill="#FFC107"
      d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"
    />
    <path
      fill="#FF3D00"
      d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
    />
    <path
      fill="#4CAF50"
      d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-4.8C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.6 39.6 16.2 44 24 44z"
    />
    <path
      fill="#1976D2"
      d="M43.6 20.5H42V20H24v8h11.3c-1.3 3.6-4.6 6-8.3 6-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C6.4 37.9 14.3 44 24 44c11 0 20-8.9 20-20 0-1.2-.1-2.3-.4-3.5z"
    />
  </svg>
)

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
  const [mostrarClave, setMostrarClave] = useState(false)
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false)
  const [nombreUsuario, setNombreUsuario] = useState('')
  const [telefono, setTelefono] = useState('')
  const [provincia, setProvincia] = useState('')
  const [localidadId, setLocalidadId] = useState('')
  const [localidades, setLocalidades] = useState<Localidad[]>([])
  const [error, setError] = useState('')
  const [camposError, setCamposError] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)
  const [enviandoGoogle, setEnviandoGoogle] = useState(false)

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

  // D35: tras un envío fallido, el foco va al primer campo con problema.
  useEffect(() => {
    if (camposError.length === 0) return
    document.getElementById(`campo-${camposError[0]}`)?.focus()
  }, [camposError])

  async function enviar(evento: React.FormEvent): Promise<void> {
    evento.preventDefault()
    setEnviando(true)
    const resultado =
      modo === 'sesion'
        ? await iniciarSesion(email, clave)
        : await registrarse({
            email,
            clave,
            confirmacion,
            telefono,
            localidadId: Number(localidadId),
            nombreUsuario,
          })
    setEnviando(false)
    if (!resultado.ok) {
      setError(resultado.errores.map((e) => e.motivo).join('. '))
      // D35: se marca el campo culpable y se le lleva el foco.
      setCamposError(resultado.errores.map((e) => e.campo))
      return
    }
    setError('')
    setCamposError([])
  }

  function cambiarModo(): void {
    setModo((m) => (m === 'sesion' ? 'registro' : 'sesion'))
    setError('')
    setCamposError([])
  }

  const invalido = (campo: string): boolean => camposError.includes(campo)

  /**
   * T-28 — Acceso con Google: el proveedor devuelve la URL de OAuth y el
   * navegador viaja a ella; la sesión llega al volver (R-03). Si el
   * proveedor falla, el motivo se muestra en la misma pantalla.
   */
  async function entrarConGoogle(): Promise<void> {
    setEnviandoGoogle(true)
    const resultado = await iniciarSesionConGoogle()
    setEnviandoGoogle(false)
    if (!resultado.ok) {
      setError(resultado.errores.map((e) => e.motivo).join('. '))
      return
    }
    setError('')
    redirigir(resultado.valor.url)
  }

  return (
    <section data-testid="pantalla-acceso" className="pantalla-acceso">
      <div className="pantalla-acceso-marca" aria-hidden="true">
        <img className="marca-grande" src="/icono-hoja-senial.svg" width="96" height="96" alt="" />
        <h1 className="marca-titulo">AgroBits</h1>
        <p className="marca-lema">El cultivo te avisa cuando algo no anda bien.</p>
      </div>
      <div className="pantalla-acceso-formulario">
        <h2>{modo === 'sesion' ? 'Iniciar sesión' : 'Crear cuenta'}</h2>

      {/* T-28 — Acceso con Google (OAuth). */}
      <button
        type="button"
        className="boton-google"
        data-testid="boton-google"
        onClick={() => void entrarConGoogle()}
        disabled={enviandoGoogle}
      >
        {iconoGoogle}
        {enviandoGoogle ? 'Redirigiendo…' : modo === 'sesion' ? 'Continuar con Google' : 'Registrarse con Google'}
      </button>
      {modo === 'registro' && (
        <p className="nota-google">
          Si te registras con Google, podrás completar tu teléfono y tu localidad en «Mi cuenta».
        </p>
      )}
      <p className="separador-o" aria-hidden="true">
        o
      </p>

      <form onSubmit={enviar}>
        <label>
          Email
          {/* type="text": la validación de formato es nuestra (mensaje en
              español y pruebaable); la nativa del navegador la bloquearía. */}
          <input
            type="text"
            id="campo-email"
            name="email"
            inputMode="email"
            autoComplete="email"
            /* D40: el corrector ortográfico no tiene nada que aportar a un email. */
            spellCheck={false}
            aria-invalid={invalido('email') || undefined}
            data-testid="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="persona@ejemplo.com"
          />
        </label>
        <label>
          Contraseña
          <div className="campo-clave">
            <input
              type={mostrarClave ? 'text' : 'password'}
              id="campo-clave"
              name="clave"
              aria-label="Contraseña"
              autoComplete={modo === 'sesion' ? 'current-password' : 'new-password'}
              aria-describedby="reglas-clave"
              aria-invalid={invalido('clave') || undefined}
              data-testid="clave"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
            />
            <BotonVerClave visible={mostrarClave} onAlternar={() => setMostrarClave(!mostrarClave)} />
          </div>
          {/* R-01 AC3 / riesgo T-22: la regla queda documentada en pantalla. */}
          <small id="reglas-clave" data-testid="reglas-clave">Mínimo {LONGITUD_MINIMA_CLAVE} caracteres.</small>
        </label>
        {modo === 'registro' && (
          <>
            <label>
              Repite la contraseña
              <div className="campo-clave">
                <input
                  type={mostrarConfirmacion ? 'text' : 'password'}
                  id="campo-confirmacion"
                  name="confirmacion"
                  aria-label="Repite la contraseña"
                  autoComplete="new-password"
                  aria-invalid={invalido('confirmacion') || undefined}
                  data-testid="confirmar-clave"
                  value={confirmacion}
                  onChange={(e) => setConfirmacion(e.target.value)}
                />
                <BotonVerClave visible={mostrarConfirmacion} onAlternar={() => setMostrarConfirmacion(!mostrarConfirmacion)} />
              </div>
            </label>
            <label>
              Nombre de usuario (opcional)
              {/* D32: se guarda como metadata de Auth (sin BD). Si se deja
                  vacío, el panel muestra el texto del email antes de la «@». */}
              <input
                type="text"
                id="campo-nombreUsuario"
                name="nombreUsuario"
                autoComplete="nickname"
                spellCheck={false}
                aria-invalid={invalido('nombreUsuario') || undefined}
                data-testid="nombre-usuario"
                value={nombreUsuario}
                onChange={(e) => setNombreUsuario(e.target.value)}
                placeholder="Ej.: Joel"
                maxLength={30}
              />
              <small>Se mostrará en el panel en lugar de tu email. Déjalo vacío si prefieres el email.</small>
            </label>
            <label>
              Teléfono
              {/* D27: dato de contacto y base futura de notificaciones; se
                  valida en la store (6–20 dígitos, admite + ( ) . - y
                  espacios) antes de tocar el servidor. */}
              <input
                type="tel"
                id="campo-telefono"
                name="telefono"
                inputMode="tel"
                autoComplete="tel"
                aria-invalid={invalido('telefono') || undefined}
                data-testid="telefono"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="+54 9 261 555-1234"
              />
            </label>
            <label>
              Provincia
              <select
                id="campo-provincia"
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
                id="campo-localidad"
                name="localidad"
                data-testid="localidad"
                aria-invalid={invalido('localidad') || undefined}
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
        <div className="acciones acciones-formulario">
          <button type="submit" className="btn-primario" data-testid="enviar-acceso" disabled={enviando}>
            {enviando ? 'Un momento…' : modo === 'sesion' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </div>
      </form>

      {/* El error vive fuera del formulario: también lo produce el acceso con
          Google (T-28), que no usa el formulario. */}
      {error && (
        <p role="alert" data-testid="error-acceso">
          {error}
        </p>
      )}

      <button type="button" className="enlace-boton" data-testid="cambiar-modo" onClick={cambiarModo}>
        {modo === 'sesion' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
      </button>
      </div>
    </section>
  )
}
