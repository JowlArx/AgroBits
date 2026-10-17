import { useState, useSyncExternalStore } from 'react'
import {
  generarLectura,
  obtenerMediciones,
  suscribirMediciones,
  ultimasPorTipo,
} from '../data/medicionesSimuladas'
import {
  asociarSensor,
  crearSensor,
  obtenerSensores,
  obtenerSensoresDeCultivo,
  suscribirSensores,
} from '../data/storeSensores'
import { procesarLecturas } from '../data/storeAlertas'
import { obtenerCultivo, suscribirCultivos, obtenerCultivos } from '../data/storeCultivos'
import { TIPOS_MEDICION } from '../domain/tipos'
import { ETIQUETAS_MEDICION } from '../data/catalogo'

interface Props {
  cultivoId: string
  onVolver: () => void
}

function horaLegible(iso: string): string {
  const fecha = new Date(iso)
  return Number.isNaN(fecha.getTime()) ? iso : fecha.toLocaleString('es-ES')
}

export default function DetalleCultivo({ cultivoId, onVolver }: Props) {
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
  const ultimas = ultimasPorTipo(sensores.map((s) => s.id))
  const conDatos = TIPOS_MEDICION.filter((tipo) => ultimas[tipo] !== undefined).length

  function crearYAsociar(evento: React.FormEvent): void {
    evento.preventDefault()
    const sensor = crearSensor(nombreSensor)
    if (!sensor.ok) {
      setErrorSensor(sensor.errores.map((e) => e.motivo).join('. '))
      return
    }
    const asociacion = asociarSensor(sensor.valor.id, cultivoId, (id) => obtenerCultivo(id) !== undefined)
    if (!asociacion.ok) {
      setErrorSensor(asociacion.errores.map((e) => e.motivo).join('. '))
      return
    }
    setErrorSensor('')
    setNombreSensor('')
  }

  return (
    <section>
      <header className="fila-entre">
        <div>
          <h2>{cultivo.nombre}</h2>
          <span className="etiqueta">{cultivo.tipoCultivo}</span>
        </div>
        <button type="button" onClick={onVolver}>
          Volver
        </button>
      </header>

      <h3>Sensores</h3>
      {sensores.length === 0 ? (
        <p data-testid="sin-sensores">Este cultivo aún no tiene sensores asociados.</p>
      ) : (
        <ul data-testid="lista-sensores">
          {sensores.map((sensor) => (
            <li key={sensor.id}>{sensor.nombre}</li>
          ))}
        </ul>
      )}

      <form onSubmit={crearYAsociar} className="fila-sensor">
        <label>
          Nombre del sensor
          <input
            type="text"
            name="nombreSensor"
            data-testid="nombre-sensor"
            value={nombreSensor}
            onChange={(e) => setNombreSensor(e.target.value)}
            placeholder="Ej.: Sensor del balcón"
          />
        </label>
        <button type="submit" data-testid="crear-sensor">
          Crear y asociar
        </button>
        {errorSensor && (
          <p role="alert" data-testid="error-sensor">
            {errorSensor}
          </p>
        )}
      </form>

      <h3>Últimas mediciones</h3>
      <p data-testid="resumen-medicion">
        {sensores.length === 0
          ? 'Sin sensores: no hay lecturas que mostrar.'
          : conDatos === 0
            ? 'Sin lecturas todavía: sensor sin datos.'
            : `Lecturas disponibles: ${conDatos} de ${TIPOS_MEDICION.length} tipos.`}
      </p>

      {sensores.length > 0 && (
        <button
          type="button"
          data-testid="simular-lectura"
          onClick={() => {
            sensores.forEach((sensor) => generarLectura(sensor.id))
            // R-13: cada nueva lectura se evalúa contra los umbrales (D14).
            procesarLecturas(cultivo, ultimasPorTipo(sensores.map((s) => s.id)))
          }}
        >
          Generar lectura simulada
        </button>
      )}

      <table className="tabla-umbrales" data-testid="tabla-mediciones">
        <thead>
          <tr>
            <th>Medición</th>
            <th>Valor</th>
            <th>Hora</th>
          </tr>
        </thead>
        <tbody>
          {TIPOS_MEDICION.map((tipo) => {
            const medicion = ultimas[tipo]
            return (
              <tr key={tipo} data-testid={`fila-${tipo}`}>
                <td>{ETIQUETAS_MEDICION[tipo]}</td>
                <td data-testid={`valor-${tipo}`}>
                  {medicion ? (
                    <>
                      {medicion.valor} {medicion.unidad}
                    </>
                  ) : (
                    <span className="sin-datos">sin datos</span>
                  )}
                </td>
                <td data-testid={`hora-${tipo}`}>
                  {medicion ? <time dateTime={medicion.medidaEn}>{horaLegible(medicion.medidaEn)}</time> : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <p className="aviso">
        Datos simulados en la interfaz (Fase 1). En la Fase 2 las lecturas llegarán cada 5 minutos
        por sensor (decisión D15).
      </p>
    </section>
  )
}
