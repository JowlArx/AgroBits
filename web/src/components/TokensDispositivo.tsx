// Panel de tokens de dispositivo de UN sensor (ingesta `x-device-token`).
// El token en claro se muestra UNA sola vez tras generarlo: vive solo en el
// estado de este componente y no se vuelve a consultar. Solo se listan
// metadatos; el hash no llega nunca a la UI.

import { useEffect, useState, type FormEvent } from 'react'
import {
  crearTokenDispositivo,
  listarTokensDispositivo,
  revocarTokenDispositivo,
  revocarTokensDeSensor,
  type TokenDispositivo,
} from '../data/tokensDispositivo'
import ConfirmacionEnLinea from './ConfirmacionEnLinea'

interface Props {
  sensorId: string
  sensorNombre: string
}

function fechaLegible(iso: string | null): string {
  if (!iso) return 'Nunca'
  const fecha = new Date(iso)
  return Number.isNaN(fecha.getTime()) ? iso : fecha.toLocaleString('es-ES')
}

const MENSAJE_CARGA = 'No se pudieron cargar los tokens. Inténtalo de nuevo.'

export default function TokensDispositivo({ sensorId, sensorNombre }: Props) {
  const [tokens, setTokens] = useState<TokenDispositivo[]>([])
  const [nombre, setNombre] = useState('')
  const [revocarAnteriores, setRevocarAnteriores] = useState(true)
  const [tokenNuevo, setTokenNuevo] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    let vigente = true
    listarTokensDispositivo(sensorId)
      .then((lista) => {
        if (vigente) setTokens(lista)
      })
      .catch((err: unknown) => {
        console.error('listarTokensDispositivo:', err)
        if (vigente) setError(MENSAJE_CARGA)
      })
    return () => {
      vigente = false
    }
  }, [sensorId])

  async function recargar(): Promise<void> {
    try {
      setTokens(await listarTokensDispositivo(sensorId))
    } catch (err) {
      console.error('listarTokensDispositivo:', err)
      setError(MENSAJE_CARGA)
    }
  }

  async function generar(evento: FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault()
    setError('')
    setCopiado(false)
    // Se valida antes de revocar: un nombre vacío no debe dejar tokens revocados.
    if (nombre.trim() === '') {
      setError('El nombre del token es obligatorio')
      return
    }
    setOcupado(true)
    try {
      if (revocarAnteriores) {
        const revocados = await revocarTokensDeSensor(sensorId)
        if (!revocados.ok) {
          setError(revocados.errores.map((e) => e.motivo).join('. '))
          await recargar()
          return
        }
      }
      const resultado = await crearTokenDispositivo(sensorId, nombre)
      if (!resultado.ok) {
        setError(resultado.errores.map((e) => e.motivo).join('. '))
        await recargar()
        return
      }
      setTokenNuevo(resultado.valor.token)
      setNombre('')
      await recargar()
    } catch (err) {
      console.error('generarTokenDispositivo:', err)
      setError('No se pudo generar el token. Inténtalo de nuevo.')
      await recargar()
    } finally {
      setOcupado(false)
    }
  }

  async function revocar(id: string): Promise<void> {
    setError('')
    try {
      const resultado = await revocarTokenDispositivo(id)
      if (!resultado.ok) {
        setError(resultado.errores.map((e) => e.motivo).join('. '))
        return
      }
      await recargar()
    } catch (err) {
      console.error('revocarTokenDispositivo:', err)
      setError('No se pudo revocar el token. Inténtalo de nuevo.')
    }
  }

  async function copiar(): Promise<void> {
    if (!tokenNuevo) return
    try {
      await navigator.clipboard.writeText(tokenNuevo)
      setCopiado(true)
    } catch {
      setError('No se pudo copiar. Selecciona el token y cópialo a mano.')
    }
  }

  return (
    <section
      className="tokens-dispositivo"
      data-testid="tokens-dispositivo"
      aria-label={`Tokens de dispositivo de ${sensorNombre}`}
    >
      <h5>Tokens de dispositivo</h5>
      <p className="aviso">
        Usa un token por dispositivo y envíalo en la cabecera <code>x-device-token</code> al enviar lecturas.
      </p>

      <form onSubmit={(evento) => void generar(evento)} className="formulario-token">
        <label>
          Nombre del token{' '}
          <input
            type="text"
            value={nombre}
            onChange={(evento) => setNombre(evento.target.value)}
            data-testid="nombre-token"
          />
        </label>
        <label className="campo-check">
          <input
            type="checkbox"
            checked={revocarAnteriores}
            onChange={(evento) => setRevocarAnteriores(evento.target.checked)}
            data-testid="revocar-anteriores"
          />
          <span>Revocar los tokens anteriores de este sensor</span>
        </label>
        <p className="ayuda">
          Desmárcalo si otro dispositivo usa este mismo sensor. Si está marcada, los tokens activos de este sensor
          dejarán de funcionar.
        </p>
        <button type="submit" className="btn-primario" disabled={ocupado} data-testid="generar-token">
          Generar token
        </button>
      </form>

      {tokenNuevo && (
        <div role="status" className="token-nuevo" data-testid="token-nuevo">
          <p>
            <strong>Copia este token ahora.</strong> Se muestra una sola vez y no se volverá a mostrar. Si lo
            pierdes, revoca el token y genera otro.
          </p>
          <code data-testid="token-en-claro">{tokenNuevo}</code>
          <div className="acciones">
            <button type="button" onClick={() => void copiar()}>
              {copiado ? 'Copiado' : 'Copiar token'}
            </button>
            <button
              type="button"
              onClick={() => {
                setTokenNuevo(null)
                setCopiado(false)
              }}
            >
              Ya lo guardé
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" data-testid="error-token">
          {error}
        </p>
      )}

      {tokens.length === 0 ? (
        <p className="estado-vacio">Este sensor aún no tiene tokens de dispositivo.</p>
      ) : (
        <ul className="lista-tokens">
          {tokens.map((token) => (
            <li key={token.id} data-testid="token-dispositivo">
              <strong>{token.nombre}</strong>{' '}
              <span>
                Creado: <time dateTime={token.createdAt}>{fechaLegible(token.createdAt)}</time>
              </span>{' · '}
              <span>Último uso: {fechaLegible(token.lastSeenAt)}</span>{' · '}
              <span data-testid="estado-token">
                {token.activo
                  ? 'Activo'
                  : token.revokedAt
                    ? `Revocado el ${fechaLegible(token.revokedAt)}`
                    : 'Revocado'}
              </span>
              {token.activo && (
                <ConfirmacionEnLinea
                  etiqueta="Revocar"
                  pregunta={`¿Revocar el token «${token.nombre}»? Los dispositivos que lo usen dejarán de enviar lecturas.`}
                  className="btn-peligro"
                  testId="revocar-token"
                  onConfirmar={() => void revocar(token.id)}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
