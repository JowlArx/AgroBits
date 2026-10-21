// D30 — Vista de cuenta: perfil editable (teléfono y localidad, D27) con el
// email de solo lectura. La escritura pasa por la store `storePerfil`, que
// valida el formato antes de delegar en el RPC `actualizar_perfil` de la BD
// (único punto servidor, D19/D27). El catálogo de localidades es el mismo
// que el registro (provincia → ciudad en cascada).
// D43 — Se añade la edición del nombre de usuario: vive en la metadata de
// Auth (D32), no en la tabla de perfiles, así que va en su propio formulario
// (una escritura distinta, un botón distinto).

import { useEffect, useMemo, useState } from 'react'
import { guardarPerfil, obtenerPerfil } from '../data/storePerfil'
import { actualizarNombreUsuario, cerrarSesion } from '../data/storeSesion'
import { exigirProveedor } from '../data/datos/proveedorDatos'
import type { Localidad } from '../data/datos/proveedorDatos'

interface Props {
  email: string
  /** D43: nombre de usuario actual, para prellenar el campo. */
  nombreUsuario?: string
}

export default function Cuenta({ email, nombreUsuario }: Props) {
  const [localidades, setLocalidades] = useState<Localidad[]>([])
  const [telefono, setTelefono] = useState('')
  const [provincia, setProvincia] = useState('')
  const [localidadId, setLocalidadId] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  // D43: estado del bloque de nombre de usuario (independiente del perfil).
  const [nombre, setNombre] = useState(nombreUsuario ?? '')
  const [guardandoNombre, setGuardandoNombre] = useState(false)
  const [mensajeNombre, setMensajeNombre] = useState('')
  const [errorNombre, setErrorNombre] = useState('')

  // Carga el catálogo de localidades y prellena el formulario con el perfil
  // ya cargado por `cargarDatosSesion` (D30). El setState vive en el callback
  // de la promesa (mismo patrón que Autenticacion.tsx).
  useEffect(() => {
    let vivo = true
    exigirProveedor()
      .cargarLocalidades()
      .then((filas) => {
        if (!vivo) return
        setLocalidades(filas)
        const perfilCargado = obtenerPerfil()
        if (perfilCargado) {
          const localidad = filas.find((l) => l.id === perfilCargado.localidadId)
          setTelefono(perfilCargado.telefono)
          if (localidad) {
            setProvincia(localidad.provincia)
            setLocalidadId(String(localidad.id))
          }
        }
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
    setGuardando(true)
    setMensaje('')
    const resultado = await guardarPerfil(telefono, Number(localidadId))
    setGuardando(false)
    if (!resultado.ok) {
      setError(resultado.errores.map((e) => e.motivo).join('. '))
      return
    }
    setError('')
    setMensaje('Perfil actualizado.')
  }

  /** D43: guarda el nombre de usuario (metadata de Auth). */
  async function guardarNombre(evento: React.FormEvent): Promise<void> {
    evento.preventDefault()
    if (guardandoNombre) return
    setGuardandoNombre(true)
    setMensajeNombre('')
    setErrorNombre('')
    const resultado = await actualizarNombreUsuario(nombre)
    setGuardandoNombre(false)
    if (!resultado.ok) {
      setErrorNombre(resultado.errores.map((e) => e.motivo).join('. '))
      return
    }
    setErrorNombre('')
    setMensajeNombre(
      nombre.trim() === ''
        ? 'Nombre quitado: en el panel se verá la parte de tu email anterior a la «@».'
        : 'Nombre actualizado.',
    )
  }

  return (
    <section className="perfil-cuenta" data-testid="vista-cuenta">
      <h2>Mi cuenta</h2>

      {/* D43 — Nombre de usuario: se guarda en la metadata de Auth, así que va
          en su propio formulario (no comparte escritura con el perfil). */}
      <form onSubmit={guardarNombre} noValidate data-testid="form-nombre">
        <h3>Nombre de usuario</h3>
        <label>
          Nombre visible
          <input
            type="text"
            id="campo-nombreUsuario"
            name="nombreUsuario"
            autoComplete="nickname"
            spellCheck={false}
            maxLength={30}
            data-testid="nombre-usuario-cuenta"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej.: Joel…"
          />
          <small>
            Es el nombre que aparece en el panel. Si lo dejas vacío, se muestra la parte de tu
            email anterior a la «@».
          </small>
        </label>
        <div className="acciones acciones-formulario">
          <button
            type="submit"
            className="btn-primario"
            data-testid="guardar-nombre"
            disabled={guardandoNombre}
          >
            {guardandoNombre ? 'Guardando…' : 'Guardar nombre'}
          </button>
        </div>
        {mensajeNombre && (
          <p className="aviso-exito" data-testid="nombre-guardado" role="status" aria-live="polite">
            {mensajeNombre}
          </p>
        )}
        {errorNombre && (
          <p role="alert" data-testid="error-nombre">
            {errorNombre}
          </p>
        )}
      </form>

      <form onSubmit={enviar} noValidate>
        <h3>Contacto</h3>
        {/* D35: el email lo gestiona el acceso, no el perfil: se muestra como
            texto (un input de solo lectura aparenta ser editable). */}
        <div className="campo-solo-lectura">
          <span className="etiqueta-campo">Email</span>
          <p data-testid="email-cuenta">{email}</p>
        </div>
        <label>
          Teléfono
          <input
            type="tel"
            id="campo-telefono-cuenta"
            name="telefono"
            inputMode="tel"
            autoComplete="tel"
            data-testid="telefono-cuenta"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="Ej.: +54 9 261 555-1000"
          />
        </label>
        <label>
          Provincia
          <select
            name="provincia"
            data-testid="provincia-cuenta"
            value={provincia}
            onChange={(e) => {
              setProvincia(e.target.value)
              setLocalidadId('')
            }}
          >
            <option value="">Selecciona una provincia</option>
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
            data-testid="localidad-cuenta"
            value={localidadId}
            onChange={(e) => setLocalidadId(e.target.value)}
            disabled={provincia === ''}
          >
            <option value="">Selecciona una localidad</option>
            {localidadesDeLaProvincia.map((l) => (
              <option key={l.id} value={l.id}>
                {l.localidad}
              </option>
            ))}
          </select>
        </label>

        <div className="acciones acciones-formulario">
          <button type="submit" className="btn-primario" data-testid="guardar-perfil" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>

        {/* D40: el mensaje de éxito se anuncia (polite) sin robarle el foco
            al campo que el usuario está editando. */}
        {mensaje && (
          <p className="aviso-exito" data-testid="perfil-guardado" role="status" aria-live="polite">
            {mensaje}
          </p>
        )}
        {error && (
          <p role="alert" data-testid="error-perfil">
            {error}
          </p>
        )}
      </form>

      <p className="aviso">
        Tu teléfono y tu localidad describen el entorno de trabajo de tus sensores. Se usan como
        dimensión de la futura capa analítica y solo los ves tú (dato personal, Ley 25.326).
      </p>

      {/* AGPL §13: el código fuente de la versión que se está usando. */}
      <p className="licencia-app">
        AgroBits es software libre: esta versión se publica bajo la licencia{' '}
        <a href="https://github.com/JowlArx/AgroBits" target="_blank" rel="noreferrer license">
          AGPL-3.0
        </a>
        , con el{' '}
        <a href="https://github.com/JowlArx/AgroBits" target="_blank" rel="noreferrer">
          código fuente
        </a>{' '}
        disponible. El nombre «AgroBits» y el logotipo son marca de su autor y su uso requiere
        permiso previo.
      </p>

      {/* D35: cerrar sesión también vive aquí (donde se espera), además del
          menú del icono de perfil. */}
      <div className="acciones acciones-formulario">
        <button
          type="button"
          className="btn-peligro"
          data-testid="cerrar-sesion-cuenta"
          onClick={() => void cerrarSesion()}
        >
          Cerrar sesión
        </button>
      </div>
    </section>
  )
}
