import { useSyncExternalStore } from 'react'
import {
  eliminarCultivo,
  obtenerCultivos,
  obtenerEstadoCarga,
  suscribirCultivos,
} from '../data/storeCultivos'
import { obtenerSensores, quitarAsociacionesDeCultivo, suscribirSensores } from '../data/storeSensores'
import { eliminarMediciones } from '../data/medicionesSimuladas'
import { cargarAlertas } from '../data/storeAlertas'
import { TIPOS_MEDICION, UNIDADES } from '../domain/tipos'
import IconoCultivo from '../components/IconoCultivo'
import ConfirmacionEnLinea from '../components/ConfirmacionEnLinea'

interface Props {
  onNuevo: () => void
  onEditar: (id: string) => void
  onVerMediciones: (id: string) => void
}

export default function ListaCultivos({ onNuevo, onEditar, onVerMediciones }: Props) {
  const cultivos = useSyncExternalStore(suscribirCultivos, obtenerCultivos)
  const estadoCarga = useSyncExternalStore(suscribirCultivos, obtenerEstadoCarga)
  // D35: la tarjeta resume en una línea lo que el cultivo tiene (umbrales y
  // sensores) para que la lista se pueda escanear de un vistazo.
  const sensores = useSyncExternalStore(suscribirSensores, obtenerSensores)

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
              <div className="cabecera-tarjeta">
                <div>
                  {/* D31: icono del tipo de cultivo junto al nombre. */}
                  <span className="fila-nombre-cultivo">
                    <IconoCultivo tipoCultivo={cultivo.tipoCultivo} />
                    <strong>{cultivo.nombre}</strong>
                    <span className="etiqueta">{cultivo.tipoCultivo}</span>
                  </span>
                  {/* D35: resumen de una línea (umbrales + sensores). */}
                  <p className="resumen-cultivo">
                    {TIPOS_MEDICION.length} tipos de medición
                    {' · '}
                    {sensores.filter((s) => s.cultivoIds.includes(cultivo.id)).length}{' '}
                    {sensores.filter((s) => s.cultivoIds.includes(cultivo.id)).length === 1
                      ? 'sensor'
                      : 'sensores'}
                  </p>
                </div>
                <div className="acciones acciones-tarjeta">
                  <button type="button" onClick={() => onVerMediciones(cultivo.id)}>
                    Ver mediciones
                  </button>
                  <button type="button" onClick={() => onEditar(cultivo.id)}>
                    Editar
                  </button>
                  {/* D35: confirmación en línea antes de borrar. */}
                  <ConfirmacionEnLinea
                    etiqueta="Eliminar"
                    pregunta={`¿Eliminar «${cultivo.nombre}»?`}
                    className="btn-peligro"
                    testId={`eliminar-${cultivo.id}`}
                    onConfirmar={() => void eliminar(cultivo.id)}
                  />
                </div>
              </div>
              {/* D35: la tarjeta se aligera — el resumen de umbrales se abre
                  bajo demanda en vez de ocupar cuatro filas por cultivo. */}
              <details className="umbrales-cultivo">
                <summary>Ver umbrales</summary>
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
              </details>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
