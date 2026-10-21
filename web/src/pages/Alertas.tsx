import { useState, useSyncExternalStore } from 'react'
import { alertasOrdenadas, obtenerAlertas, suscribirAlertas, type Alerta } from '../data/storeAlertas'
import { obtenerCultivo } from '../data/storeCultivos'
import { ETIQUETAS_MEDICION } from '../data/catalogo'
import { UNIDADES } from '../domain/tipos'

function horaLegible(iso: string): string {
  const fecha = new Date(iso)
  return Number.isNaN(fecha.getTime())
    ? iso
    : fecha.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
}

function filaAlerta(alerta: Alerta) {
  const cultivo = obtenerCultivo(alerta.cultivoId)
  return (
    <li key={alerta.id} data-testid={`alerta-${alerta.id}`} className={`tarjeta-alerta alerta-${alerta.estado}`}>
      <div className="fila-alerta">
        <strong className="alerta-tipo">{ETIQUETAS_MEDICION[alerta.tipo]}</strong>
        <span className={alerta.estado === 'activa' ? 'etiqueta alerta-activa' : 'etiqueta'}>
          {alerta.estado === 'activa' ? 'Activa' : 'Resuelta'}
        </span>
      </div>
      <p className="alerta-valor" data-testid="alerta-valor">
        {alerta.valor} {UNIDADES[alerta.tipo]}
      </p>
      <p className="alerta-contexto" data-testid={`detalle-${alerta.id}`}>
        <span data-testid="alerta-cultivo">{cultivo ? cultivo.nombre : 'Cultivo eliminado'}</span>
        {' · '}
        <span data-testid="alerta-hora">
          <time dateTime={alerta.creadaEn}>{horaLegible(alerta.creadaEn)}</time>
        </span>
      </p>
      {alerta.resueltaEn && (
        <p className="alerta-cierre" data-testid="alerta-resuelta">
          Se resolvió el{' '}
          <time dateTime={alerta.resueltaEn}>{horaLegible(alerta.resueltaEn)}</time>
        </p>
      )}
    </li>
  )
}

// — Utilidades de rango de tiempo —

/// Devuelve true si `alerta.creadaEn` está dentro del rango [desde, hasta].
function enRango(alerta: Alerta, desde: Date, hasta: Date): boolean {
  const creado = new Date(alerta.creadaEn)
  return creado >= desde && creado <= hasta
}

/** Rangos de preselección (D31): 5, 10 y 15 min. */
const RANGOS_PRESELECCION = ['5min', '10min', '15min'] as const
type TipoPreseleccion = (typeof RANGOS_PRESELECCION)[number]

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
  tipo: TipoPreseleccion | 'personalizado'
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
  const todas = alertasOrdenadas()
  const enRango = aplicarFiltroTiempo(todas, rango)
  // D36: primero lo accionable (las alertas activas, las de ahora mismo) y
  // después el historial (las resueltas dentro del rango elegido). No se
  // repiten: cada alerta aparece en una de las dos secciones.
  const activas = todas.filter((a) => a.estado === 'activa')
  const historial = enRango.filter((a) => a.estado === 'resuelta')

  // --- UI ---

  return (
    <section>
      <header className="fila-entre">
        <h2>Alertas</h2>
        <p className="contador-alertas" data-testid="contador-alertas">
          <strong className={activas.length > 0 ? 'contador-activas' : undefined}>
            {activas.length} {activas.length === 1 ? 'activa' : 'activas'}
          </strong>
          {' · '}
          {historial.length} {historial.length === 1 ? 'resuelta' : 'resueltas'}
        </p>
      </header>

      {/* --- Sección 1: las alertas que hay ahora mismo --- */}
      <section className="bloque-alertas">
        <h3>Alertas activas</h3>
        {activas.length === 0 ? (
          <p data-testid="vacio-alertas" className="estado-vacio">
            No hay alertas activas: ninguna lectura está fuera de rango.
          </p>
        ) : (
          <ul className="lista-alertas" data-testid="lista-alertas">
            {activas.map(filaAlerta)}
          </ul>
        )}
      </section>

      {/* --- Sección 2: el historial, filtrado por rango de tiempo --- */}
      <section className="bloque-alertas">
        <h3>Historial de alertas</h3>
        {/* Un SOLO juego de botones (mismo `data-testid` en las dos
            plataformas): en escritorio se leen «Últimos 5 min…»; en móvil el
            grupo se convierte en un control segmentado donde se ve de un
            vistazo qué rango está activo (D35). */}
        <div className="controles-rango">
          <div
            className="segmentado-rangos"
            role="group"
            aria-label="Rango de tiempo"
            data-testid="rango-ciclo"
          >
            {RANGOS_PRESELECCION.map((tipo) => (
              <button
                key={tipo}
                data-testid={`rango-${tipo}`}
                className={rango.tipo === tipo ? 'btn-primario' : 'btn-secundario'}
                aria-pressed={rango.tipo === tipo}
                onClick={() => elegirRango({ tipo })}
              >
                <span className="solo-escritorio">Últimos </span>
                {tipo.replace('min', ' min')}
              </button>
            ))}
          </div>
          <button
            data-testid="rango-personalizado"
            className={rango.tipo === 'personalizado' ? 'btn-primario' : 'btn-secundario'}
            aria-pressed={rango.tipo === 'personalizado'}
            onClick={() => elegirRango({ tipo: 'personalizado' })}
          >
            Personalizar
          </button>
        </div>

        {rango.tipo === 'personalizado' && (
          <div className="rango-fechas">
            <label>
              Desde
              <input
                type="date"
                value={desde?.toISOString().split('T')[0] ?? ''}
                onChange={(e) => setDesde(new Date(e.target.value))}
              />
            </label>
            <label>
              Hasta
              <input
                type="date"
                value={hasta?.toISOString().split('T')[0] ?? ''}
                onChange={(e) => setHasta(new Date(e.target.value))}
              />
            </label>
          </div>
        )}

        {historial.length === 0 ? (
          <p data-testid="vacio-historial" className="estado-vacio">
            No hay alertas resueltas en el rango de tiempo seleccionado.
          </p>
        ) : (
          <ul className="lista-alertas" data-testid="lista-historial">
            {historial.map(filaAlerta)}
          </ul>
        )}
      </section>

      {/* --- Botón Descargar log (escritorio: en móvil no aporta) --- */}
      <button
        data-testid="descargar-log"
        className="btn-primario solo-escritorio descargar-log"
        onClick={() => descargarLogAlertas([...activas, ...historial])}
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
  const ahora = new Date()
  const sello = `${ahora.toISOString().split('T')[0]}_${ahora.toTimeString().slice(0, 5).replace(':', '')}`
  tmpLink.download = `alertas-${sello}.csv`
  tmpLink.click()
  URL.revokeObjectURL(url)
}
