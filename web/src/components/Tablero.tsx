// Tablero principal (adaptación de AgroBits al layout del diseño de Figma
// «Snow Dashboard», node 98469:145265): fila de 4 tarjetas KPI, widget de
// evolución de lecturas (líneas, con pestañas por tipo de medición) y widget
// de última lectura por tipo (barras horizontales, como «Traffic by
// Website»). Es SOLO presentación: todos los valores se derivan de los
// stores existentes sin tocarlos. El ámbar (--senal) sigue reservado a las
// alertas activas (D20), por eso las barras son neutras.

import { useSyncExternalStore, useState } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { obtenerCultivos, suscribirCultivos } from '../data/storeCultivos'
import { obtenerSensores, suscribirSensores, type Sensor } from '../data/storeSensores'
import { obtenerAlertas, suscribirAlertas } from '../data/storeAlertas'
import { obtenerMediciones, suscribirMediciones, ultimasPorTipo } from '../data/medicionesSimuladas'
import { ETIQUETAS_MEDICION, VAR_COLOR_SENSOR } from '../data/catalogo'
import { TIPOS_MEDICION, type TipoMedicion } from '../domain/tipos'

/** Escalas solo para dimensionar las barras (los valores mostrados son reales). */
const ESCALA_MAXIMA: Record<TipoMedicion, number> = {
  humedad_suelo: 100,
  temperatura: 50,
  humedad_ambiental: 100,
  luminosidad: 60_000,
}

function horaCorta(iso: string): string {
  const fecha = new Date(iso)
  return Number.isNaN(fecha.getTime())
    ? iso
    : fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

/** Sensor con la lectura más reciente (D31): es el filtro por defecto del
 *  widget «Última lectura por tipo» hasta que el usuario elige otro. */
function sensorDeUltimaLectura(sensores: readonly Sensor[]): string | null {
  let mejor: string | null = null
  let ultima: string | null = null
  for (const sensor of sensores) {
    const serie = obtenerMediciones(sensor.id)
    const ultimaSerie = serie[serie.length - 1]
    if (ultimaSerie && (!ultima || ultimaSerie.medidaEn > ultima)) {
      ultima = ultimaSerie.medidaEn
      mejor = sensor.id
    }
  }
  return mejor
}

/** Iconos SVG en línea de las tarjetas KPI (currentColor, sin assets). */
const iconoHoja = (
  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
    <path d="M2.5 13.5C2.5 8 6 3.5 13.5 2.5c1 7.5-3.5 11-9 11z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    <path d="M3 13c3-4 6-6.5 8.5-8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
)

const iconoSensor = (
  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
    <circle cx="8" cy="11" r="1.6" fill="currentColor" />
    <path d="M4.8 8.2a4.5 4.5 0 0 1 6.4 0" fill="none" stroke="currentColor" strokeWidth="1.4" />
    <path d="M2.6 5.9a7.6 7.6 0 0 1 10.8 0" fill="none" stroke="currentColor" strokeWidth="1.4" />
  </svg>
)

const iconoCampana = (
  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
    <path d="M8 2a4 4 0 0 0-4 4v2.5L3 11h10l-1-2.5V6a4 4 0 0 0-4-4z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    <path d="M6.5 13a1.5 1.5 0 0 0 3 0" fill="none" stroke="currentColor" strokeWidth="1.4" />
  </svg>
)

const iconoPulso = (
  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
    <path d="M1.5 8.5h3l1.5-4 2.5 7 1.75-3h4.25" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

interface PuntoGrafico {
  medidaEn: string
  hora: string
  [sensor: string]: string | number
}

interface SerieGrafico {
  nombre: string
  color: string
}

/** Serie para el gráfico: una columna POR SENSOR (con su color, D30). */
function serieDe(
  tipo: TipoMedicion,
  sensores: readonly Sensor[],
): { puntos: PuntoGrafico[]; series: SerieGrafico[] } {
  const porInstante = new Map<string, PuntoGrafico>()
  const nombresUsados = new Set<string>()
  const series: SerieGrafico[] = []

  for (const sensor of sensores) {
    // Dos sensores pueden llamar igual: se desambigua para no colisionar dataKeys.
    let nombre = sensor.nombre
    let sufijo = 2
    while (nombresUsados.has(nombre)) nombre = `${sensor.nombre} (${sufijo++})`
    nombresUsados.add(nombre)

    const serie = obtenerMediciones(sensor.id).filter((m) => m.tipo === tipo)
    if (serie.length === 0) continue
    series.push({ nombre, color: VAR_COLOR_SENSOR[sensor.colorLinea] })

    for (const medicion of serie) {
      const punto = porInstante.get(medicion.medidaEn) ?? { medidaEn: medicion.medidaEn, hora: horaCorta(medicion.medidaEn) }
      punto[nombre] = medicion.valor
      porInstante.set(medicion.medidaEn, punto)
    }
  }

  const puntos = [...porInstante.values()].sort((a, b) => a.medidaEn.localeCompare(b.medidaEn)).slice(-15)
  return { puntos, series }
}

function TarjetaKpi({ etiqueta, valor, nota, alerta, icono }: {
  etiqueta: string
  valor: number
  nota: string
  alerta?: boolean
  icono: React.ReactNode
}) {
  return (
    <li className={alerta ? 'tarjeta-kpi kpi-alerta' : 'tarjeta-kpi'}>
      <span className="kpi-cabecera">
        <span className="kpi-icono" aria-hidden="true">{icono}</span>
        <span className="kpi-etiqueta">{etiqueta}</span>
      </span>
      <strong className="kpi-valor">{valor}</strong>
      <span className="kpi-nota">{nota}</span>
    </li>
  )
}

export default function Tablero() {
  // Suscripciones a las stores de las que se derivan los indicadores.
  useSyncExternalStore(suscribirCultivos, obtenerCultivos)
  useSyncExternalStore(suscribirSensores, obtenerSensores)
  useSyncExternalStore(suscribirAlertas, obtenerAlertas)
  useSyncExternalStore(
    (oyente) => suscribirMediciones('tablero', oyente),
    () => obtenerSensores().map((s) => `${s.id}:${obtenerMediciones(s.id).length}`).join('|'),
  )

  const [tipoActivo, setTipoActivo] = useState<TipoMedicion>('temperatura')
  // D31: «Última lectura por tipo» — sin elección manual, el widget sigue al
  // sensor que registró la última lectura (se deriva en cada render, sin
  // efectos); el usuario puede fijar un sensor (o «Todos») a mano.
  const [sensorManualId, setSensorManualId] = useState<string | null>(null)

  const cultivos = obtenerCultivos()
  const sensores = obtenerSensores()
  const alertas = obtenerAlertas()
  const activas = alertas.filter((a) => a.estado === 'activa').length
  const lecturas = sensores.reduce((total, s) => total + obtenerMediciones(s.id).length, 0)
  const sensorWidgetActivoId = sensorManualId ?? sensorDeUltimaLectura(sensores)

  const { puntos, series } = serieDe(tipoActivo, sensores)

  const ultimas = ultimasPorTipo(sensorWidgetActivoId ? [sensorWidgetActivoId] : sensores.map((s) => s.id))
  const hayLecturas = TIPOS_MEDICION.some((tipo) => ultimas[tipo] !== undefined)

  return (
    <section className="tablero" aria-label="Resumen del panel">
      <ul className="fila-kpis">
        <TarjetaKpi etiqueta="Cultivos" valor={cultivos.length} nota="registrados" icono={iconoHoja} />
        <TarjetaKpi etiqueta="Sensores" valor={sensores.length} nota="conectados" icono={iconoSensor} />
        <TarjetaKpi
          etiqueta="Alertas activas"
          valor={activas}
          nota={activas > 0 ? 'requieren atención' : 'todo en rango'}
          alerta={activas > 0}
          icono={iconoCampana}
        />
        <TarjetaKpi etiqueta="Lecturas" valor={lecturas} nota="registradas" icono={iconoPulso} />
      </ul>

      <div className="fila-widgets">
        <article className="widget">
          {/* D33: las pestañas van a la izquierda y el título a la derecha,
              en la misma altura, alineado con el contenido del gráfico. */}
          <header className="cabecera-widget">
            <div className="pestanas-widget" role="group" aria-label="Tipo de medición a mostrar">
              {TIPOS_MEDICION.map((tipo) => (
                <button
                  key={tipo}
                  type="button"
                  aria-pressed={tipo === tipoActivo}
                  onClick={() => setTipoActivo(tipo)}
                >
                  {ETIQUETAS_MEDICION[tipo]}
                </button>
              ))}
            </div>
            <h3>Evolución de lecturas</h3>
          </header>
          {puntos.length === 0 ? (
            <p className="estado-vacio">
              Sin lecturas todavía para “{ETIQUETAS_MEDICION[tipoActivo]}”: crea un sensor en el detalle del
              cultivo y genera una lectura.
            </p>
          ) : (
            <div className="grafico-lineas">
              <ResponsiveContainer width="100%" height={260}>
                {/* D31/D33: ComposedChart con relleno degradado bajo cada
                    línea; margen izquierdo 0 porque el eje Y mide 44 px. */}
                <ComposedChart data={puntos} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <defs>
                    {series.map((serie, indice) => (
                      <linearGradient key={serie.nombre} id={`relleno-tablero-${indice}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={serie.color} stopOpacity={0.22} />
                        <stop offset="95%" stopColor={serie.color} stopOpacity={0.02} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid stroke="var(--borde)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="hora" stroke="var(--texto-tenue)" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis stroke="var(--texto-tenue)" tickLine={false} axisLine={false} fontSize={12} width={44} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--superficie)',
                      border: '1px solid var(--borde)',
                      borderRadius: 8,
                      color: 'var(--texto)',
                      fontFamily: 'var(--fuente-texto)',
                    }}
                    formatter={(valor) => [`${valor}`, ETIQUETAS_MEDICION[tipoActivo]]}
                  />
                  {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
                  {series.map((serie, indice) => (
                    <Area
                      key={`${serie.nombre}-area`}
                      type="monotone"
                      dataKey={serie.nombre}
                      stroke="none"
                      fill={`url(#relleno-tablero-${indice})`}
                      isAnimationActive={false}
                    />
                  ))}
                  {series.map((serie) => (
                    <Line
                      key={serie.nombre}
                      type="monotone"
                      dataKey={serie.nombre}
                      stroke={serie.color}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  ))}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>

        <article className="widget">
          <header className="cabecera-widget">
            <h3>Última lectura por tipo</h3>
            <select
              className="selector-widget"
              data-testid="sensor-selector-widget"
              value={sensorWidgetActivoId ?? ''}
              onChange={(e) => setSensorManualId(e.target.value || null)}
            >
              <option value="">Todos los sensores</option>
              {sensores.map((sensor) => (
                <option key={sensor.id} value={sensor.id}>
                  {sensor.nombre}
                </option>
              ))}
            </select>
          </header>
          {!hayLecturas ? (
            <p className="estado-vacio">Aún no hay lecturas: aparecerán aquí al conectar un sensor.</p>
          ) : (
            <ul className="barras-tipo">
              {TIPOS_MEDICION.map((tipo) => {
                const medicion = ultimas[tipo]
                const porcentaje = medicion
                  ? Math.min(100, Math.round((medicion.valor / ESCALA_MAXIMA[tipo]) * 100))
                  : 0
                return (
                  <li key={tipo}>
                    <span className="barra-etiqueta">{ETIQUETAS_MEDICION[tipo]}</span>
                    <span className="barra-ruta" aria-hidden="true">
                      {medicion && <span className="barra-relleno" style={{ width: `${porcentaje}%` }} />}
                    </span>
                    <span className="barra-valor">
                      {medicion ? (
                        <>
                          {medicion.valor} {medicion.unidad}
                        </>
                      ) : (
                        <span className="sin-datos">sin datos</span>
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </article>
      </div>
    </section>
  )
}
