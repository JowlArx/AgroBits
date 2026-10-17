import { useSyncExternalStore } from 'react'
import {
  eliminarCultivo,
  obtenerCultivos,
  suscribirCultivos,
} from '../data/storeCultivos'
import { eliminarMediciones } from '../data/medicionesSimuladas'
import { TIPOS_MEDICION, UNIDADES } from '../domain/tipos'

interface Props {
  onNuevo: () => void
  onEditar: (id: string) => void
  onVerMediciones: (id: string) => void
}

export default function ListaCultivos({ onNuevo, onEditar, onVerMediciones }: Props) {
  const cultivos = useSyncExternalStore(suscribirCultivos, obtenerCultivos)

  return (
    <section>
      <header className="fila-entre">
        <h2>Mis cultivos</h2>
        <button type="button" onClick={onNuevo}>
          Nuevo cultivo
        </button>
      </header>

      {cultivos.length === 0 ? (
        <p data-testid="vacio">
          Todavía no hay cultivos. Crea el primero para ver sus umbrales y, más
          adelante, sus mediciones.
        </p>
      ) : (
        <ul className="lista-cultivos" data-testid="lista-cultivos">
          {cultivos.map((cultivo) => (
            <li key={cultivo.id} className="tarjeta-cultivo">
              <div className="fila-entre">
                <div>
                  <strong>{cultivo.nombre}</strong>{' '}
                  <span className="etiqueta">{cultivo.tipoCultivo}</span>
                </div>
                <div className="acciones">
                  <button type="button" onClick={() => onVerMediciones(cultivo.id)}>
                    Ver mediciones
                  </button>
                  <button type="button" onClick={() => onEditar(cultivo.id)}>
                    Editar
                  </button>
                  <button
                    type="button"
                    data-testid={`eliminar-${cultivo.id}`}
                    onClick={() => {
                      eliminarMediciones(cultivo.id)
                      eliminarCultivo(cultivo.id)
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
              <table className="tabla-umbrales">
                <thead>
                  <tr>
                    <th>Medición</th>
                    <th>Mínimo</th>
                    <th>Máximo</th>
                  </tr>
                </thead>
                <tbody>
                  {TIPOS_MEDICION.map((tipo) => (
                    <tr key={tipo}>
                      <td>{UNIDADES[tipo] ? tipo.replace(/_/g, ' ') : tipo}</td>
                      <td>{cultivo.umbrales[tipo].min}</td>
                      <td>{cultivo.umbrales[tipo].max}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
