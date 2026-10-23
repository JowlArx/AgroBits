// D30 — Vista de cuenta: perfil editable (teléfono y localidad, D27) con el
// email de solo lectura. La escritura pasa por la store `storePerfil`, que
// valida el formato antes de delegar en el RPC `actualizar_perfil` de la BD
// (único punto servidor, D19/D27). El catálogo de localidades es el mismo
// que el registro (provincia → ciudad en cascada).
// D43 — Se añade la edición del nombre de usuario: vive en la metadata de
// Auth (D32), no en la tabla de perfiles, así que va en su propio formulario
// (una escritura distinta, un botón distinto). Y la vista se reparte en dos
// columnas (identidad / contacto a la izquierda; resumen, datos guardados y
// acciones a la derecha) para no dejar media pantalla vacía.

import { useEffect, useMemo, useState } from 'react'
import {
  guardarPerfil,
  obtenerPerfil,
  obtenerSolicitudEliminacion,
  cargarSolicitudEliminacion,
  solicitarEliminacion,
  cancelarEliminacion,
} from '../data/storePerfil'
import { actualizarNombreUsuario, cerrarSesion } from '../data/storeSesion'
import { exigirProveedor } from '../data/datos/proveedorDatos'
import type { Localidad, SolicitudEliminacion } from '../data/datos/proveedorDatos'
import type { Cultivo } from '../domain/tipos'
import type { Sensor } from '../data/storeSensores'

interface Props {
  email: string
  /** D43: nombre de usuario actual, para prellenar el campo. */
  nombreUsuario?: string
  /** D44: lo que tiene la cuenta, para ocuparla con contenido real. */
  cultivos: Cultivo[]
  sensores: Sensor[]
  alertasActivas: number
  /** D44: abre el detalle de un cultivo. */
  onVerCultivo: (id: string) => void
}

export default function Cuenta({
  email,
  nombreUsuario,
  cultivos,
  sensores,
  alertasActivas,
  onVerCultivo,
}: Props) {
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
  // D46: eliminación de la cuenta (petición con 7 días de gracia).
  const [solicitud, setSolicitud] = useState<SolicitudEliminacion | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [confirmacionEmail, setConfirmacionEmail] = useState('')
  const [pidiendo, setPidiendo] = useState(false)
  const [cancelando, setCancelando] = useState(false)
  const [errorEliminacion, setErrorEliminacion] = useState('')

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
  /** D46: la fecha de borrado, en formato legible. */
  const fechaBorrado = solicitud
    ? new Date(solicitud.programadaPara).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : ''
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
  // D46: al abrir la vista, se consulta si ya hay un borrado pendiente.
  useEffect(() => {
    let vivo = true
    void cargarSolicitudEliminacion().then(() => {
      if (!vivo) return
      const pendiente = obtenerSolicitudEliminacion()
      if (pendiente) setSolicitud(pendiente)
    })
    return () => {
      vivo = false
    }
  }, [])

  /** El email escrito debe coincidir con el de la cuenta (lo exige el servidor). */
  const emailCoincide =
    confirmacionEmail.trim().toLowerCase() !== '' &&
    confirmacionEmail.trim().toLowerCase() === email.trim().toLowerCase()

  /** D46: pide el borrado. El servidor programa la fecha 7 días después. */
  async function pedirEliminacion(): Promise<void> {
    if (pidiendo) return
    setPidiendo(true)
    setErrorEliminacion('')
    const resultado = await solicitarEliminacion(confirmacionEmail)
    setPidiendo(false)
    if (!resultado.ok) {
      setErrorEliminacion(resultado.errores.map((e) => e.motivo).join('. '))
      return
    }
    setSolicitud({ programadaPara: resultado.valor })
    setEliminando(false)
    setConfirmacionEmail('')
  }

  /** D46: cancela el borrado dentro del período de gracia. */
  async function cancelar(): Promise<void> {
    if (cancelando) return
    setCancelando(true)
    const resultado = await cancelarEliminacion()
    setCancelando(false)
    if (!resultado.ok) {
      setErrorEliminacion(resultado.errores.map((e) => e.motivo).join('. '))
      return
    }
    setSolicitud(null)
    setErrorEliminacion('')
  }

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

      <div className="perfil-rejilla">
        {/* Columna izquierda: lo que se edita. */}
        <div className="perfil-columna">
          {/* D43 — Nombre de usuario: se guarda en la metadata de Auth, así que
              va en su propio formulario (no comparte escritura con el perfil). */}
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
              <button
                type="submit"
                className="btn-primario"
                data-testid="guardar-perfil"
                disabled={guardando}
              >
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
        </div>

        {/* Columna derecha: el estado de la cuenta y las acciones. */}
        <aside className="perfil-lateral" aria-label="Resumen de la cuenta">
          <section className="perfil-bloque">
            <h3>Tu cuenta</h3>
            <ul className="perfil-stats">
              <li>
                <strong>{cultivos.length}</strong>
                <span>{cultivos.length === 1 ? 'cultivo' : 'cultivos'}</span>
              </li>
              <li>
                <strong>{sensores.length}</strong>
                <span>{sensores.length === 1 ? 'sensor' : 'sensores'}</span>
              </li>
              <li className={alertasActivas > 0 ? 'con-alerta' : undefined}>
                <strong>{alertasActivas}</strong>
                <span>{alertasActivas === 1 ? 'alerta activa' : 'alertas activas'}</span>
              </li>
            </ul>
          </section>

          <section className="perfil-bloque">
            <h3>Qué datos guardamos</h3>
            <dl>
              <dt>Email</dt>
              <dd>Para entrar en tu cuenta.</dd>
              <dt>Nombre</dt>
              <dd>El que ves en el panel. Opcional.</dd>
              <dt>Teléfono</dt>
              <dd>Dato de contacto de tus sensores. Solo tú lo ves.</dd>
              <dt>Provincia y localidad</dt>
              <dd>Describen el entorno de trabajo de tus sensores.</dd>
            </dl>
            <p className="panel-nota">
              Tus datos personales no se comparten con nadie y no se usan con fines comerciales
              (Ley 25.326).
            </p>
          </section>
        </aside>

        {/* D44 — Tercera columna: lo que hay en la cuenta. Antes, en pantallas
            anchas, la mitad derecha quedaba vacía; ahora se ocupa con las
            listas reales de cultivos y sensores (y da un atajo a cada cultivo). */}
        <aside className="perfil-lateral" aria-label="Tus cultivos y sensores">
          <section className="perfil-bloque">
            <h3>Tus cultivos</h3>
            {cultivos.length === 0 ? (
              <p className="panel-nota">Todavía no tienes cultivos: créalos desde «Cultivos».</p>
            ) : (
              <ul className="perfil-lista">
                {cultivos.map((cultivo) => (
                  <li key={cultivo.id}>
                    <button type="button" onClick={() => onVerCultivo(cultivo.id)}>
                      {cultivo.nombre}
                    </button>
                    <span>
                      {sensores.filter((s) => s.cultivoIds.includes(cultivo.id)).length === 1
                        ? '1 sensor'
                        : `${sensores.filter((s) => s.cultivoIds.includes(cultivo.id)).length} sensores`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="perfil-bloque">
            <h3>Tus sensores</h3>
            {sensores.length === 0 ? (
              <p className="panel-nota">Todavía no tienes sensores: añádelos a un cultivo.</p>
            ) : (
              <ul className="perfil-lista">
                {sensores.map((sensor) => (
                  <li key={sensor.id}>
                    <span className="perfil-sensor-nombre">
                      <span className="chip-color" style={{ background: `var(--linea-${sensor.colorLinea})` }} aria-hidden="true" />
                      {sensor.nombre}
                    </span>
                    <span>
                      {sensor.cultivoIds.length === 0
                        ? 'sin cultivo'
                        : sensor.cultivoIds.length === 1
                          ? '1 cultivo'
                          : `${sensor.cultivoIds.length} cultivos`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

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
          <section className="perfil-bloque perfil-zona">
            <h3>Cerrar sesión</h3>
            <p>Se cerrará esta sesión y tendrás que volver a entrar para ver tus cultivos.</p>
            <div className="acciones">
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

          {/* D46: eliminar la cuenta. Durante los 7 días de gracia la cuenta
              sigue funcionando; el aviso permite cancelar el borrado. */}
          {solicitud ? (
            <section className="perfil-bloque" data-testid="aviso-gracia">
              <h3>Tu cuenta se borrará</h3>
              <p>
                Se eliminará el {fechaBorrado}. Hasta entonces puedes seguir usándola; si te
                arrepientes, puedes cancelar el borrado.
              </p>
              <div className="acciones">
                <button
                  type="button"
                  data-testid="cancelar-eliminacion"
                  disabled={cancelando}
                  onClick={() => void cancelar()}
                >
                  {cancelando ? 'Cancelando…' : 'Cancelar el borrado'}
                </button>
              </div>
            </section>
          ) : (
            <section className="perfil-bloque perfil-zona">
              <h3>Eliminar mi cuenta</h3>
              <p>
                Se borrarán tu cuenta, tus cultivos, tus sensores y todas tus mediciones. Puedes
                cancelar el borrado durante los 7 días siguientes.
              </p>
              {!eliminando ? (
                <div className="acciones">
                  <button
                    type="button"
                    className="btn-peligro"
                    data-testid="eliminar-cuenta"
                    onClick={() => setEliminando(true)}
                  >
                    Eliminar mi cuenta
                  </button>
                </div>
              ) : (
                <div data-testid="confirmacion-eliminacion">
                  <p>
                    Vas a eliminar tu cuenta y todos sus datos. Esta acción no se puede deshacer.
                    Para confirmar, escribe tu email.
                  </p>
                  <label>
                    Tu email
                    <input
                      type="email"
                      id="campo-confirmacion-email"
                      name="confirmacionEmail"
                      autoComplete="off"
                      spellCheck={false}
                      data-testid="confirmacion-email"
                      value={confirmacionEmail}
                      onChange={(e) => setConfirmacionEmail(e.target.value)}
                      placeholder={email}
                    />
                  </label>
                  <div className="acciones">
                    <button
                      type="button"
                      className="btn-peligro"
                      data-testid="confirmar-eliminacion"
                      disabled={!emailCoincide || pidiendo}
                      onClick={() => void pedirEliminacion()}
                    >
                      {pidiendo ? 'Enviando…' : 'Eliminar definitivamente'}
                    </button>
                    <button type="button" onClick={() => setEliminando(false)}>
                      Cancelar
                    </button>
                  </div>
                  {errorEliminacion && (
                    <p role="alert" data-testid="error-eliminacion">
                      {errorEliminacion}
                    </p>
                  )}
                </div>
              )}
            </section>
          )}
        </aside>
      </div>
    </section>
  )
}
