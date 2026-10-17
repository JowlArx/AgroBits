import { useSyncExternalStore } from 'react'
import {
  eliminarCultivo,
  obtenerCultivos,
  obtenerEstadoCarga,
  suscribirCultivos,
} from '../data/storeCultivos'
import { quitarAsociacionesDeCultivo } from '../data/storeSensores'
import { eliminarMediciones } from '../data/medicionesSimuladas'
import { cargarAlertas } from '../data/storeAlertas'
import { TIPOS_MEDICION, UNIDADES } from '../domain/tipos'

interface Props {
  onNuevo: () => void
  onEditar: (id: string) => void
  onVerMediciones: (id: string) => void
}

export default function ListaCultivos({ onNuevo, onEditar, onVerMediciones }: Props) {
  const cultivos = useSyncExternalStore(suscribirCultivos, obtenerCultivos)
  const estadoCarga = useSyncExternalStore(suscribirCultivos, obtenerEstadoCarga)

  async function eliminar(cultivoId: string): Promise<void> {
    // T-23: la cadena va contra la BD (cascada en el servidor para los
    // enlaces; los sensores huérfanos se borran con sus mediciones).
    try {
      const borrados = await quitarAsociacionesDeCultivo(cultivoId)
      await eliminarMediciones(borrados)
      await eliminarCultivo(cultivoId)
      // T-25: en la BD las alertas caen en cascada con el cultivo; aquí solo
      // se recarga la caché local.
      await cargarAlertas()
    } catch (error) {
      console.error('No se pudo eliminar el cultivo', error)
    }
  }

  return (
    <section>
      <header className="fila-entre">
        <h2>Mis cultivos</h2>
        <button type="button" className="btn-primario" onClick={onNuevo}>
          Nuevo cultivo
        </button>
      </header>

      {estadoCarga === 'sin-cargar' || estadoCarga === 'cargando' ? (
        <p data-testid="cargando">Cargando cultivos…</p>
      ) : estadoCarga === 'error' ? (
        <p data-testid="error-carga">No se pudieron cargar los cultivos. Inténtalo más tarde.</p>
      ) : cultivos.length === 0 ? (
        <p data-testid="vacio" className="estado-vacio">
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
                    className="btn-peligro"
                    data-testid={`eliminar-${cultivo.id}`}
                    onClick={() => {
                      // T-18: al borrar el cultivo se retiran sus asociaciones;
                      // los sensores que quedan sin cultivos se eliminan junto
                      // con sus mediciones. T-17: sus alertas no quedan huérfanas.
                      void eliminar(cultivo.id)
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
