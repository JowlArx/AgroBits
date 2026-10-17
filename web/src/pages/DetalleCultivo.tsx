import { useSyncExternalStore } from 'react'
import {
  generarLectura,
  obtenerMediciones,
  suscribirMediciones,
  ultimasPorTipo,
} from '../data/medicionesSimuladas'
import { obtenerCultivo } from '../data/storeCultivos'
import { TIPOS_MEDICION, UNIDADES } from '../domain/tipos'
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
  const cultivo = obtenerCultivo(cultivoId)
  // Suscripción a los cambios del almacén de mediciones de ESTE cultivo.
  useSyncExternalStore(
    (oyente) => suscribirMediciones(cultivoId, oyente),
    () => obtenerMediciones(cultivoId),
  )

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

  const ultimas = ultimasPorTipo(cultivoId)
  const conDatos = TIPOS_MEDICION.filter((tipo) => ultimas[tipo] !== undefined).length

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

      <p data-testid="resumen-medicion">
        {conDatos === 0
          ? 'Sin lecturas todavía: sensor sin datos.'
          : `Lecturas disponibles: ${conDatos} de ${TIPOS_MEDICION.length} tipos.`}
      </p>

      <button type="button" data-testid="simular-lectura" onClick={() => generarLectura(cultivo)}>
        Generar lectura simulada
      </button>

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
        Datos simulados en la interfaz (Fase 1): {UNIDADES.temperatura} — frecuencia prevista de
        5 minutos por sensor en la Fase 2.
      </p>
    </section>
  )
}
