import { useState, useSyncExternalStore } from 'react'
import { alertasOrdenadas, obtenerAlertas, suscribirAlertas, type Alerta } from '../data/storeAlertas'
import { obtenerCultivo } from '../data/storeCultivos'
import { ETIQUETAS_MEDICION } from '../data/catalogo'
import { UNIDADES } from '../domain/tipos'
import { numero } from '../domain/formato'
import { useParamsUrl } from '../hooks/useParamsUrl'

function horaLegible(iso: string): string {
  const fecha = new Date(iso)
  return Number.isNaN(fecha.getTime())
    ? iso
    : fecha.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
}

/** Alertas del historial que se muestran antes de pulsar «Mostrar más». */
const ALERTAS_POR_PAGINA = 10

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
        {numero(alerta.valor, Number.isInteger(alerta.valor) ? 0 : 1)} {UNIDADES[alerta.tipo]}
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

/**
 * D40 — Fecha en formato `YYYY-MM-DD` con las componentes **locales**.
 * `toISOString()` convertía a UTC: a última hora de la tarde, la fecha
 * mostrada era la del día siguiente.
 */
function aIsoLocal(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${fecha.getFullYear()}-${mes}-${dia}`
}

/**
 * D40 — Fecha local a medianoche. `new Date('2026-10-20')` se interpretaba
 * como UTC y, con desfase negativo, el rango empezaba unas horas antes (la
 * tarde del día anterior) y el «Hasta» excluía el final del día.
 */
function desdeIsoLocal(valor: string): Date {
  return new Date(`${valor}T00:00:00`)
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
  // D40: el rango vive en la URL (`?rango=5min`, `?rango=personalizado&desde=…`):
  // un filtro se puede compartir y el «atrás» del navegador no se llena de
  // pasos. Como es un filtro, sustituye la entrada actual (no la empuja).
  const [params, escribirParamsUrl] = useParamsUrl<{
    rango: string | null
    desde: string | null
    hasta: string | null
  }>({ rango: '15min', desde: null, hasta: null })
  const tipoRango: TipoPreseleccion | 'personalizado' =
    params.rango === 'personalizado'
      ? 'personalizado'
      : (RANGOS_PRESELECCION as readonly string[]).includes(params.rango ?? '')
        ? (params.rango as TipoPreseleccion)
        : '15min'
  const desde = params.desde ? desdeIsoLocal(params.desde) : undefined
  const hasta = params.hasta ? desdeIsoLocal(params.hasta) : undefined
  const rango: RangoTiempo = { tipo: tipoRango, desde, hasta }
  const [mostradas, setMostradas] = useState(ALERTAS_POR_PAGINA)

  function elegirRango(tipo: TipoPreseleccion | 'personalizado'): void {
    setMostradas(ALERTAS_POR_PAGINA)
    if (tipo === 'personalizado') {
      escribirParamsUrl(
        { rango: 'personalizado', desde: aIsoLocal(desde ?? inicioDeHoy()), hasta: aIsoLocal(hasta ?? finDeHoy()) },
        'replace',
      )
      return
    }
    escribirParamsUrl({ rango: tipo, desde: null, hasta: null }, 'replace')
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
        <h3>Alertas</h3>
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
        <div className="fila-entre">
          <h3>Alertas activas</h3>
          {activas.length > 0 && (
            <button
              type="button"
              className="btn-secundario"
              data-testid="descargar-activas"
              onClick={() => descargarLogAlertas(activas, 'activas')}
            >
              Descargar alertas activas
            </button>
          )}
        </div>
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
                onClick={() => elegirRango(tipo)}
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
            onClick={() => elegirRango('personalizado')}
          >
            Personalizar
          </button>
          <button
            type="button"
            className="btn-secundario"
            data-testid="descargar-log"
            onClick={() => descargarLogAlertas(historial, 'log')}
          >
            Descargar log
          </button>
        </div>

        {rango.tipo === 'personalizado' && (
          <div className="rango-fechas">
            <label>
              Desde
              <input
                type="date"
                id="campo-desde"
                name="desde"
                autoComplete="off"
                max={hasta ? aIsoLocal(hasta) : undefined}
                value={desde ? aIsoLocal(desde) : ''}
                onChange={(e) => escribirParamsUrl({ desde: e.target.value || null }, 'replace')}
              />
            </label>
            <label>
              Hasta
              <input
                type="date"
                id="campo-hasta"
                name="hasta"
                autoComplete="off"
                min={desde ? aIsoLocal(desde) : undefined}
                value={hasta ? aIsoLocal(hasta) : ''}
                onChange={(e) => escribirParamsUrl({ hasta: e.target.value || null }, 'replace')}
              />
            </label>
          </div>
        )}

        {historial.length === 0 ? (
          <p data-testid="vacio-historial" className="estado-vacio">
            No hay alertas resueltas en el rango de tiempo seleccionado.
          </p>
        ) : (
          <>
            <ul className="lista-alertas" data-testid="lista-historial">
              {historial.slice(0, mostradas).map(filaAlerta)}
            </ul>
            {historial.length > mostradas && (
              <button
                type="button"
                className="btn-secundario"
                data-testid="mostrar-mas-historial"
                onClick={() => setMostradas(mostradas + ALERTAS_POR_PAGINA)}
              >
                Mostrar más ({historial.length - mostradas} restantes)
              </button>
            )}
          </>
        )}
      </section>
    </section>
  )
}

/// Genera un archivo CSV con las alertas y dispara la descarga.
function descargarLogAlertas(alertas: Alerta[], etiqueta: 'activas' | 'log'): void {
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
  tmpLink.download = `alertas-${etiqueta}-${sello}.csv`
  tmpLink.click()
  URL.revokeObjectURL(url)
}
