// Panel derecho (adaptación de AgroBits al layout del diseño de Figma
// «Snow Dashboard», node 98469:145265): secciones «Notificaciones» y
// «Activities» traducidas a «Alertas» (las activas primero, con la señal
// ámbar reservada a las alertas activas según D20) y «Lecturas recientes»
// (últimas mediciones de los sensores). Presentación pura sobre los stores
// existentes; no usa los data-testid de la vista de alertas para no
// interferir con la suite E2E.

import { useSyncExternalStore } from 'react'
import { alertasOrdenadas, obtenerAlertas, suscribirAlertas } from '../data/storeAlertas'
import { obtenerCultivo, obtenerCultivos, suscribirCultivos } from '../data/storeCultivos'
import { obtenerSensores, suscribirSensores } from '../data/storeSensores'
import { obtenerMediciones, suscribirMediciones } from '../data/medicionesSimuladas'
import { ETIQUETAS_MEDICION } from '../data/catalogo'
import type { Medicion } from '../domain/tipos'

function horaLegible(iso: string): string {
  const fecha = new Date(iso)
  return Number.isNaN(fecha.getTime()) ? iso : fecha.toLocaleString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

interface FilaLectura {
  clave: string
  medicion: Medicion
}

/** Última lectura de cada sensor, más reciente primero. */
function ultimasLecturas(): FilaLectura[] {
  const filas: FilaLectura[] = []
  for (const sensor of obtenerSensores()) {
    const serie = obtenerMediciones(sensor.id)
    const ultima = serie[serie.length - 1]
    if (ultima) filas.push({ clave: sensor.id, medicion: ultima })
  }
  return filas.sort((a, b) => b.medicion.medidaEn.localeCompare(a.medicion.medidaEn)).slice(0, 6)
}

export default function PanelLateral({ onVerAlertas }: { onVerAlertas?: () => void }) {
  useSyncExternalStore(suscribirCultivos, obtenerCultivos)
  useSyncExternalStore(suscribirSensores, obtenerSensores)
  useSyncExternalStore(suscribirAlertas, obtenerAlertas)
  useSyncExternalStore(
    (oyente) => suscribirMediciones('panel-lateral', oyente),
    () => obtenerSensores().map((s) => `${s.id}:${obtenerMediciones(s.id).length}`).join('|'),
  )

  const activas = alertasOrdenadas().filter((a) => a.estado === 'activa')
  const recientes = ultimasLecturas()

  return (
    <aside className="panel-lateral" aria-label="Alertas y actividad reciente">
      <section>
        <header className="fila-entre panel-cabecera">
          <h2>Alertas activas</h2>
          {activas.length > 0 && <span className="contador-panel">{activas.length}</span>}
        </header>
        {activas.length === 0 ? (
          <p className="panel-vacio">Sin alertas activas: ninguna medición está fuera de rango.</p>
        ) : (
          <>
            <ul className="lista-panel">
              {activas.slice(0, 3).map((alerta) => {
                const cultivo = obtenerCultivo(alerta.cultivoId)
                return (
                  <li key={alerta.id} className="item-panel item-alerta">
                    <div className="item-cabecera">
                      <strong>{ETIQUETAS_MEDICION[alerta.tipo]}</strong>
                      {/* D31: la hora queda aislada en la esquina superior derecha. */}
                      <time className="item-hora" dateTime={alerta.creadaEn}>
                        {horaLegible(alerta.creadaEn)}
                      </time>
                    </div>
                    <p className="item-detalles">
                      {cultivo ? cultivo.nombre : 'Cultivo eliminado'} · {alerta.valor}
                    </p>
                  </li>
                )
              })}
            </ul>
            {activas.length > 3 && (
              <p className="panel-nota">Y {activas.length - 3} alerta{activas.length - 3 === 1 ? '' : 's'} más.</p>
            )}
            {onVerAlertas && (
              <button type="button" className="enlace-panel" onClick={onVerAlertas}>
                Ver todas las alertas
              </button>
            )}
          </>
        )}
      </section>

      <section>
        <h2>Lecturas recientes</h2>
        {recientes.length === 0 ? (
          <p className="panel-vacio">Sin lecturas todavía: conecta un sensor para empezar.</p>
        ) : (
          <ul className="lista-panel">
            {recientes.map(({ clave, medicion }) => (
              <li key={clave} className="item-panel">
                <div className="item-cabecera">
                  <strong>{ETIQUETAS_MEDICION[medicion.tipo]}</strong>
                  {/* D31: la hora queda aislada en la esquina superior derecha. */}
                  <time className="item-hora" dateTime={medicion.medidaEn}>
                    {horaLegible(medicion.medidaEn)}
                  </time>
                </div>
                <p className="item-detalles">
                  {medicion.valor} {medicion.unidad}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  )
}
