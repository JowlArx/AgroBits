import { useSyncExternalStore } from 'react'
import { alertasOrdenadas, obtenerAlertas, suscribirAlertas, type Alerta } from '../data/storeAlertas'
import { obtenerCultivo } from '../data/storeCultivos'
import { ETIQUETAS_MEDICION } from '../data/catalogo'
import { UNIDADES } from '../domain/tipos'

function horaLegible(iso: string): string {
  const fecha = new Date(iso)
  return Number.isNaN(fecha.getTime()) ? iso : fecha.toLocaleString('es-ES')
}

function filaAlerta(alerta: Alerta) {
  const cultivo = obtenerCultivo(alerta.cultivoId)
  return (
    <li key={alerta.id} data-testid={`alerta-${alerta.id}`} className={`tarjeta-cultivo alerta-${alerta.estado}`}>
      <div className="fila-entre">
        <strong>{ETIQUETAS_MEDICION[alerta.tipo]}</strong>
        <span className={alerta.estado === 'activa' ? 'etiqueta alerta-activa' : 'etiqueta'}>
          {alerta.estado === 'activa' ? 'Activa' : 'Resuelta'}
        </span>
      </div>
      <dl data-testid={`detalle-${alerta.id}`}>
        <dt>Cultivo</dt>
        <dd data-testid="alerta-cultivo">{cultivo ? cultivo.nombre : 'Cultivo eliminado'}</dd>
        <dt>Valor leído</dt>
        <dd data-testid="alerta-valor">
          {alerta.valor} {UNIDADES[alerta.tipo]}
        </dd>
        <dt>Hora</dt>
        <dd data-testid="alerta-hora">
          <time dateTime={alerta.creadaEn}>{horaLegible(alerta.creadaEn)}</time>
        </dd>
        {alerta.resueltaEn && (
          <>
            <dt>Resuelta</dt>
            <dd data-testid="alerta-resuelta">
              <time dateTime={alerta.resueltaEn}>{horaLegible(alerta.resueltaEn)}</time>
            </dd>
          </>
        )}
      </dl>
    </li>
  )
}

export default function Alertas() {
  // Snapshot cacheable: la referencia del store solo cambia al notificar.
  useSyncExternalStore(suscribirAlertas, obtenerAlertas)
  const alertas = alertasOrdenadas()

  return (
    <section>
      <h2>Alertas</h2>
      {alertas.length === 0 ? (
        <p data-testid="vacio-alertas" className="estado-vacio">
          No hay alertas: ninguna medición ha salido fuera del rango de sus cultivos.
        </p>
      ) : (
        <ul className="lista-cultivos" data-testid="lista-alertas">
          {alertas.map(filaAlerta)}
        </ul>
      )}
    </section>
  )
}
