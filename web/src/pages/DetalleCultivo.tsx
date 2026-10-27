import { useEffect, useState, useSyncExternalStore } from 'react'
import {
  generarLectura,
  obtenerMediciones,
  suscribirMediciones,
  ultimasPorTipo,
} from '../data/medicionesSimuladas'
import {
  asociarSensor,
  crearSensor,
  desasociarSensor,
  obtenerSensores,
  obtenerSensoresDeCultivo,
  suscribirSensores,
} from '../data/storeSensores'
import { cargarAlertas } from '../data/storeAlertas'
import ConfirmacionEnLinea from '../components/ConfirmacionEnLinea'
import { exigirProgramador } from '../data/programadorLecturas'
import { obtenerCultivo, suscribirCultivos, obtenerCultivos } from '../data/storeCultivos'
import { TIPOS_MEDICION, UNIDADES } from '../domain/tipos'
import { ETIQUETAS_MEDICION } from '../data/catalogo'
import { exigirProveedor } from '../data/datos/proveedorDatos'

interface Props {
  cultivoId: string
  onVolver: () => void
  onVerHistorial?: (cultivoId: string) => void
}

interface Banda {
  min: number
  max: number
}

function horaLegible(iso: string): string {
  const fecha = new Date(iso)
  return Number.isNaN(fecha.getTime()) ? iso : fecha.toLocaleString('es-ES')
}

/** Estado de una medición frente a su banda: sin banda → «—»; sin valor → «sin datos». */
function estadoDe(valor: number | undefined, banda: Banda | null): 'dentro' | 'fuera' | 'sin datos' | '—' {
  if (!banda) return '—'
  if (valor === undefined) return 'sin datos'
  return valor >= banda.min && valor <= banda.max ? 'dentro' : 'fuera'
}

/** Clase de la pastilla de estado: «dentro» y «fuera» con tono; el resto, neutro. */
function claseEstado(estado: 'dentro' | 'fuera' | 'sin datos' | '—'): string {
  if (estado === 'dentro') return 'estado-dentro'
  if (estado === 'fuera') return 'estado-fuera'
  return 'estado-sin-datos'
}

export default function DetalleCultivo({ cultivoId, onVolver, onVerHistorial }: Props) {
  // Suscripciones a los almacenes que puede cambiar esta vista.
  // Nota: getSnapshot debe devolver valores estables; por eso se usan
  // referencias del store (cambian solo al notificar) y una huella de texto
  // para las mediciones (cambia cuando crece el nº de lecturas).
  useSyncExternalStore(suscribirCultivos, obtenerCultivos)
  useSyncExternalStore(suscribirSensores, obtenerSensores)
  useSyncExternalStore(
    (oyente) => suscribirMediciones(cultivoId, oyente),
    () =>
      obtenerSensoresDeCultivo(cultivoId)
        .map((s) => `${s.id}:${obtenerMediciones(s.id).length}`)
        .join('|'),
  )

  const [nombreSensor, setNombreSensor] = useState('')
  const [errorSensor, setErrorSensor] = useState('')
  // D35: asociar un sensor que ya es de la cuenta (el contrapresto de
  // «desasociar»: sin esto, desasociar era irreversible desde la interfaz).
  const [sensorParaAsociar, setSensorParaAsociar] = useState('')
  // Formularios de sensor plegados por defecto; `null` = sin elección manual
  // (se despliegan solo si el cultivo no tiene sensores).
  const [asociarManual, setAsociarManual] = useState<boolean | null>(null)
  // DLI de ayer (UTC) de ESTE cultivo: lo calcula el proveedor (R-H4) con los
  // sensores enlazados al cultivo. `null` (se muestra «—») si no hay lecturas
  // de luz ayer o aún no ha llegado la respuesta.
  const [dliAyer, setDliAyer] = useState<number | null>(null)
  useEffect(() => {
    let vigente = true
    exigirProveedor()
      .consultarDliDeAyer(cultivoId)
      .then((valor) => {
        if (vigente) setDliAyer(valor)
      })
      .catch(() => {
        if (vigente) setDliAyer(null)
      })
    return () => {
      vigente = false
    }
  }, [cultivoId])

  // Banda DLI del tipo de cultivo (perfil público `crop_type_perfil`).
  const tipoCultivo = obtenerCultivo(cultivoId)?.tipoCultivo
  const [bandaDli, setBandaDli] = useState<Banda | null>(null)
  useEffect(() => {
    if (!tipoCultivo) return
    let vigente = true
    exigirProveedor()
      .consultarBandaDli(tipoCultivo)
      .then((banda) => {
        if (vigente) setBandaDli(banda)
      })
      .catch(() => {
        if (vigente) setBandaDli(null)
      })
    return () => {
      vigente = false
    }
  }, [tipoCultivo])

  const cultivo = obtenerCultivo(cultivoId)
  if (!cultivo) {
    return (
      <section>
        <p>Cultivo no encontrado.</p>
        <button type="button" onClick={onVolver}>
          Volver
        </button>
      </section>
    )
  }

  const sensores = obtenerSensoresDeCultivo(cultivoId)
  // D35: sensores de la cuenta que aún no están en este cultivo.
  const sensoresDisponibles = obtenerSensores().filter((s) => !s.cultivoIds.includes(cultivoId))
  const ultimas = ultimasPorTipo(sensores.map((s) => s.id))
  const conDatos = TIPOS_MEDICION.filter((tipo) => ultimas[tipo] !== undefined).length
  const formulariosAbiertos = asociarManual ?? sensores.length === 0

  async function crearYAsociar(evento: React.FormEvent): Promise<void> {
    evento.preventDefault()
    const sensor = await crearSensor(nombreSensor)
    if (!sensor.ok) {
      setErrorSensor(sensor.errores.map((e) => e.motivo).join('. '))
      return
    }
    const asociacion = await asociarSensor(sensor.valor.id, cultivoId, (id) => obtenerCultivo(id) !== undefined)
    if (!asociacion.ok) {
      setErrorSensor(asociacion.errores.map((e) => e.motivo).join('. '))
      return
    }
    setErrorSensor('')
    setNombreSensor('')
    // T-24: el sensor recién conectado toma su primera lectura ya (tick
    // inmediato) y la serie continúa cada 5 minutos mientras haya sesión
    // abierta (decisión D15, R-10 AC2).
    exigirProgramador().programar([asociacion.valor.id])
  }

  /**
   * D34: desasocia el sensor de este cultivo. El sensor sigue en la cuenta
   * del usuario (con sus lecturas); solo deja de medir este cultivo.
   */
  async function desasociar(sensorId: string): Promise<void> {
    const resultado = await desasociarSensor(sensorId, cultivoId)
    setErrorSensor(resultado.ok ? '' : resultado.errores.map((e) => e.motivo).join('. '))
  }

  /** D35:asocia a este cultivo un sensor que ya pertenece a la cuenta. */
  async function asociarExistente(evento: React.FormEvent): Promise<void> {
    evento.preventDefault()
    if (!sensorParaAsociar) return
    const resultado = await asociarSensor(sensorParaAsociar, cultivoId, (id) => obtenerCultivo(id) !== undefined)
    if (!resultado.ok) {
      setErrorSensor(resultado.errores.map((e) => e.motivo).join('. '))
      return
    }
    setErrorSensor('')
    setSensorParaAsociar('')
    exigirProgramador().programar([sensorParaAsociar])
  }

  return (
    <section>
      <header className="fila-entre">
        <div>
          {/* El nombre del cultivo ya lo muestra el título del panel superior. */}
          <span className="etiqueta">{cultivo.tipoCultivo}</span>
        </div>
        <button type="button" onClick={onVolver}>
          Volver
        </button>
        {onVerHistorial && (
          <button type="button" data-testid="ver-historial" onClick={() => onVerHistorial(cultivoId)}>
            Ver historial
          </button>
        )}
      </header>

      {/* 1. Matriz de mediciones: lo primero que mira el usuario. */}
      <div className="fila-entre">
        <h2>Mediciones</h2>
        <p data-testid="resumen-medicion">
          {sensores.length === 0
            ? 'Sin sensores: no hay lecturas que mostrar.'
            : conDatos === 0
              ? 'Sin lecturas todavía: sensor sin datos.'
              : `Lecturas disponibles: ${conDatos} de ${TIPOS_MEDICION.length} tipos.`}
        </p>
      </div>

      <table className="tabla-umbrales tabla-mediciones" data-testid="tabla-mediciones">
        <thead>
          <tr>
            <th scope="col">Medición</th>
            <th scope="col">Valor</th>
            <th scope="col">Hora</th>
            <th scope="col">Banda</th>
            <th scope="col">Estado</th>
          </tr>
        </thead>
        <tbody>
          {TIPOS_MEDICION.map((tipo) => {
            const medicion = ultimas[tipo]
            // La luminosidad no tiene banda propia: se evalúa por DLI (R-H4).
            const banda: Banda | null = tipo === 'luminosidad' ? null : cultivo.umbrales[tipo]
            const estado = estadoDe(medicion?.valor, banda)
            return (
              <tr key={tipo} data-testid={`fila-${tipo}`}>
                <td>{ETIQUETAS_MEDICION[tipo]}</td>
                <td data-testid={`valor-${tipo}`} data-label="Valor">
                  {medicion ? (
                    <>
                      {medicion.valor} {medicion.unidad}
                    </>
                  ) : (
                    <span className="sin-datos">sin datos</span>
                  )}
                </td>
                <td data-testid={`hora-${tipo}`} data-label="Hora">
                  {medicion ? <time dateTime={medicion.medidaEn}>{horaLegible(medicion.medidaEn)}</time> : '—'}
                </td>
                <td data-testid={`banda-${tipo}`} data-label="Banda">
                  {banda ? `${banda.min}–${banda.max} ${UNIDADES[tipo]}` : ''}
                </td>
                <td data-testid={`estado-${tipo}`} data-label="Estado">
                  <span className={`pastilla ${claseEstado(estado)}`}>{estado}</span>
                </td>
              </tr>
            )
          })}
          <tr className="fila-dli" data-testid="fila-dli_ayer">
            <td>DLI de ayer</td>
            <td data-testid="valor-dli_ayer" data-label="Valor">
              {dliAyer === null ? (
                <span className="sin-datos">sin datos</span>
              ) : (
                `${dliAyer.toFixed(1)} mol/m²/día`
              )}
            </td>
            <td data-testid="hora-dli_ayer" data-label="Hora" />
            <td data-testid="banda-dli_ayer" data-label="Banda">
              {bandaDli ? `${bandaDli.min}–${bandaDli.max} mol/m²/día` : ''}
            </td>
            <td data-testid="estado-dli_ayer" data-label="Estado">
              <span className={`pastilla ${claseEstado(estadoDe(dliAyer ?? undefined, bandaDli))}`}>
                {estadoDe(dliAyer ?? undefined, bandaDli)}
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      {/* 2. Sensores del cultivo. */}
      <h3>Sensores</h3>
      {sensores.length === 0 ? (
        <p data-testid="sin-sensores" className="estado-vacio">Este cultivo aún no tiene sensores asociados.</p>
      ) : (
        <ul data-testid="lista-sensores" className="lista-sensores-cultivo">
          {sensores.map((sensor) => (
            <li key={sensor.id} className="fila-sensor-cultivo">
              <span className="nombre-sensor-cultivo">{sensor.nombre}</span>
              <ConfirmacionEnLinea
                etiqueta="Desasociar"
                pregunta={`¿Desasociar «${sensor.nombre}» de este cultivo?`}
                className="btn-peligro"
                testId="desasociar-sensor"
                onConfirmar={() => void desasociar(sensor.id)}
              />
            </li>
          ))}
        </ul>
      )}

      {/* 3. Formularios plegados tras un único botón; abiertos si no hay sensores. */}
      <button
        type="button"
        aria-expanded={formulariosAbiertos}
        onClick={() => setAsociarManual(!formulariosAbiertos)}
      >
        ＋ Asociar sensor
      </button>

      {formulariosAbiertos && (
        <>
      {/* D35: sensors de la cuenta que todavía no están en este cultivo. */}
      {sensoresDisponibles.length > 0 && (
        <form onSubmit={asociarExistente} className="fila-sensor">
          <label>
            Sensor de tu cuenta
            <select
              name="sensorParaAsociar"
              data-testid="sensor-para-asociar"
              value={sensorParaAsociar}
              onChange={(e) => setSensorParaAsociar(e.target.value)}
            >
              <option value="">— Elige un sensor —</option>
              {sensoresDisponibles.map((sensor) => (
                <option key={sensor.id} value={sensor.id}>
                  {sensor.nombre}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn-primario" data-testid="asociar-sensor" disabled={!sensorParaAsociar}>
            Asociar
          </button>
        </form>
      )}

      <form onSubmit={crearYAsociar} className="fila-sensor">
        <label>
          Nombre del sensor
          <input
            type="text"
            name="nombreSensor"
            autoComplete="off"
            data-testid="nombre-sensor"
            value={nombreSensor}
            onChange={(e) => setNombreSensor(e.target.value)}
            placeholder="Ej.: Sensor del balcón"
          />
        </label>
        <button type="submit" className="btn-primario" data-testid="crear-sensor">
          Crear y asociar
        </button>
        {errorSensor && (
          <p role="alert" data-testid="error-sensor">
            {errorSensor}
          </p>
        )}
      </form>
        </>
      )}

      {/* 4. Simulación y aviso. */}
      {sensores.length > 0 && (
        <button
          type="button"
          className="btn-primario"
          data-testid="simular-lectura"
          onClick={() => {
            void (async () => {
              // T-23: cada lectura se guarda en la BD antes de mostrarse.
              for (const sensor of sensores) await generarLectura(sensor.id)
              // T-25: la evaluación de alertas (D14, R-13) es del trigger de
              // la BD; se recargan para que la vista de alertas (R-14) las
              // muestre en esta sesión sin recargar la página.
              await cargarAlertas()
            })()
          }}
        >
          Generar lectura simulada
        </button>
      )}

      <p className="aviso aviso-compacto">
        Las lecturas simuladas se guardan en el servidor y se generan automáticamente cada 5
        minutos por sensor mientras la sesión está abierta.
      </p>
    </section>
  )
}
