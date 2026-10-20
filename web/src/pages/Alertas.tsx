import { useState, useSyncExternalStore } from 'react'
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

// — Utilidades de rango de tiempo —

/// Devuelve true si `alerta.creadaEn` está dentro del rango [desde, hasta].
function enRango(alerta: Alerta, desde: Date, hasta: Date): boolean {
  const creado = new Date(alerta.creadaEn)
  return creado >= desde && creado <= hasta
}

/** Rangos de preselección (D31): en móvil se ciclan con un único botón. */
const RANGOS_PRESELECCION = ['5min', '10min', '15min'] as const
type TipoPreseleccion = (typeof RANGOS_PRESELECCION)[number]

const ETIQUETAS_RANGO: Record<TipoPreseleccion, string> = {
  '5min': 'Últimos 5 min',
  '10min': 'Últimos 10 min',
  '15min': 'Últimos 15 min',
}

/** Inicio y fin del día de hoy (para el rango personalizado). */
function inicioDeHoy(): Date {
  const ahora = new Date()
  return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
}

function finDeHoy(): Date {
  const fin = inicioDeHoy()
  fin.setHours(23, 59, 59, 999)
  return fin
}

interface RangoTiempo {
  tipo: '5min' | '10min' | '15min' | 'personalizado'
  desde?: Date
  hasta?: Date
}

/// Filtra el array de alertas según el rango seleccionado.
function aplicarFiltroTiempo(
  alertas: Alerta[],
  rango: RangoTiempo
): Alerta[] {
  const hacerFiltro = (corte: Date) =>
    alertas.filter((a) => new Date(a.creadaEn) >= corte)
  if (rango.tipo === '5min') {
    return hacerFiltro(new Date(Date.now() - 5 * 60 * 1000)) // hace 5 minutos
  }
  if (rango.tipo === '10min') {
    return hacerFiltro(new Date(Date.now() - 10 * 60 * 1000)) // hace 10 minutos
  }
  if (rango.tipo === '15min') {
    return hacerFiltro(new Date(Date.now() - 15 * 60 * 1000)) // hace 15 minutos
  }
  if (rango.tipo === 'personalizado' && rango.desde && rango.hasta) {
    return alertas.filter((a) => enRango(a, rango.desde!, rango.hasta!))
  }
  return alertas // sin filtro
}

export default function Alertas() {
  // Estado del rango de tiempo: '5min' | '10min' | '15min' (por defecto) o 'personalizado'.
  // El cambio de rango se gestiona en `elegirRango` (sin efectos): los
  // preseleccionados limpian las fechas y «personalizar» propone hoy entero.
  const [rango, setRango] = useState<RangoTiempo>({ tipo: '15min' })
  const [desde, setDesde] = useState<Date | undefined>(undefined)
  const [hasta, setHasta] = useState<Date | undefined>(undefined)

  function elegirRango(nuevo: RangoTiempo): void {
    setRango(nuevo)
    if (nuevo.tipo === 'personalizado') {
      setDesde(inicioDeHoy())
      setHasta(finDeHoy())
    } else {
      setDesde(undefined)
      setHasta(undefined)
    }
  }

  // Suscripción al store de alertas.
  useSyncExternalStore(suscribirAlertas, obtenerAlertas)

  // Aplica el filtro de tiempo y ordena. SIN memorización: `aplicarFiltroTiempo`
  // depende de `Date.now()` y del contenido del store; un `useMemo([rango])`
  // congelaba la lista calculada en el mount y ocultaba para siempre (hasta
  // cambiar de rango) las alertas que llegaban después — p. ej. la de la
  // primera lectura, que el tick recarga ~150 ms tras abrir la página.
  const alertas = aplicarFiltroTiempo(alertasOrdenadas(), rango)

  // D31: el botón conmutador de móvil cicla 5 → 10 → 15 min (y desde
  // personalizado vuelve a 5 min). En escritorio siguen los 3 botones.
  const tipoPreseleccion: TipoPreseleccion = RANGOS_PRESELECCION.includes(rango.tipo as TipoPreseleccion)
    ? (rango.tipo as TipoPreseleccion)
    : '5min'
  function ciclarRango(): void {
    const indice = RANGOS_PRESELECCION.indexOf(tipoPreseleccion)
    elegirRango({ tipo: RANGOS_PRESELECCION[(indice + 1) % RANGOS_PRESELECCION.length] })
  }

  // --- UI ---

  return (
    <section>
      <h2>Alertas Activas</h2>

      {/* --- Controles de rango de tiempo --- */}
      <div className="fila-entre" style={{ gap: '0.5rem', alignItems: 'center' }}>
        <button
          data-testid="rango-ciclo"
          className="solo-movil conmutador-rango"
          aria-label={`Rango de tiempo: ${ETIQUETAS_RANGO[tipoPreseleccion]}. Pulsa para cambiar`}
          onClick={ciclarRango}
        >
          {ETIQUETAS_RANGO[tipoPreseleccion]}
        </button>
        <button
          data-testid="rango-5min"
          className={`solo-escritorio ${rango.tipo === '5min' ? 'btn-primario' : 'btn-secundario'}`}
          onClick={() => elegirRango({ tipo: '5min' })}
        >
          Últimos 5 min
        </button>
        <button
          data-testid="rango-10min"
          className={`solo-escritorio ${rango.tipo === '10min' ? 'btn-primario' : 'btn-secundario'}`}
          onClick={() => elegirRango({ tipo: '10min' })}
        >
          Últimos 10 min
        </button>
        <button
          data-testid="rango-15min"
          className={`solo-escritorio ${rango.tipo === '15min' ? 'btn-primario' : 'btn-secundario'}`}
          onClick={() => elegirRango({ tipo: '15min' })}
        >
          Últimos 15 min
        </button>
        <button
          data-testid="rango-personalizado"
          className={rango.tipo === 'personalizado' ? 'btn-primario' : 'btn-secundario'}
          onClick={() => elegirRango({ tipo: 'personalizado' })}
        >
          Personalizar
        </button>

        {rango.tipo === 'personalizado' && (
          <>
            <span>Desde</span>
            <input
              type="date"
              value={desde?.toISOString().split('T')[0] ?? ''}
              onChange={(e) => setDesde(new Date(e.target.value))}
              style={{ width: '120px' }}
            />
            <span>Hasta</span>
            <input
              type="date"
              value={hasta?.toISOString().split('T')[0] ?? ''}
              onChange={(e) => setHasta(new Date(e.target.value))}
              style={{ width: '120px' }}
            />
          </>
        )}
      </div>

      {/* --- Mensaje cuando no hay alertas en el rango --- */}
      {alertas.length === 0 ? (
        <p data-testid="vacio-alertas" className="estado-vacio">
          No hay alertas en el rango de tiempo seleccionado.
        </p>
      ) : (
        <ul className="lista-cultivos" data-testid="lista-alertas">
          {alertas.map(filaAlerta)}
        </ul>
      )}

      {/* --- Botón Descargar log --- */}
      <button
        data-testid="descargar-log"
        className="btn-primario"
        onClick={() => descargarLogAlertas(alertas)}
        style={{ marginTop: '1rem' }}
      >
        Descargar log
      </button>
    </section>
  )
}

/// Genera un archivo CSV con las alertas y dispara la descarga.
function descargarLogAlertas(alertas: Alerta[]): void {
  if (alertas.length === 0) return

  const cabeceras = ['Cultivo', 'Tipo', 'Valor', 'Estado', 'Hora de creación']
  const filas = alertas.map((a) => {
    const cultivo = obtenerCultivo(a.cultivoId)?.nombre ?? 'Cultivo eliminado'
    return [
      cultivo,
      ETIQUETAS_MEDICION[a.tipo] ?? a.tipo,
      a.valor,
      a.estado,
      new Date(a.creadaEn).toLocaleString('es-ES'),
    ]
  })

  const csvContent =
    [cabeceras.join(','), ...filas.map((f) => f.join(','))].join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const tmpLink = document.createElement('a')
  tmpLink.href = url
  tmpLink.download = `alertas-${new Date().toISOString().split('T')[0]}.csv`
  tmpLink.click()
  URL.revokeObjectURL(url)
}
