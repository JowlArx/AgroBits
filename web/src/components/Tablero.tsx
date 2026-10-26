// Tablero principal (adaptación de AgroBits al layout del diseño de Figma
// «Snow Dashboard», node 98469:145265): fila de 4 tarjetas KPI, widget de
// evolución de lecturas (líneas, con pestañas por tipo de medición) y widget
// de última lectura por tipo (barras horizontales, como «Traffic by
// Website»). Es SOLO presentación: todos los valores se derivan de los
// stores existentes sin tocarlos. El ámbar (--senal) sigue reservado a las
// alertas activas (D20), por eso las barras son neutras.

import { useSyncExternalStore, useState } from 'react'
import {
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
import { ETIQUETAS_MEDICION, ETIQUETAS_MEDICION_CORTA, VAR_COLOR_SENSOR } from '../data/catalogo'
import { TIPOS_MEDICION, UNIDADES, type TipoMedicion } from '../domain/tipos'
import { useParamsUrl } from '../hooks/useParamsUrl'
import SelectorDesplegable from './SelectorDesplegable'

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

/** D35: cuánto tiempo pasó desde la última lectura (resumen en texto). */
function haceCuanto(iso: string): string {
  const minutos = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000))
  if (minutos < 1) return 'hace un momento'
  if (minutos === 1) return 'hace 1 minuto'
  if (minutos < 60) return `hace ${minutos} minutos`
  const horas = Math.round(minutos / 60)
  return `hace ${horas} ${horas === 1 ? 'hora' : 'horas'}`
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

interface PuntoGrafico {
  medidaEn: string
  hora: string
  [sensor: string]: string | number
}

interface SerieGrafico {
  nombre: string
  color: string
}

const VENTANA_MS = 5 * 60_000

/** D45: inicio de la ventana de 5 minutos a la que pertenece una lectura. */
function ventanaDe(iso: string): string {
  return new Date(Math.floor(Date.parse(iso) / VENTANA_MS) * VENTANA_MS).toISOString()
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

    // D45: las lecturas se agrupan en ventanas de 5 minutos. Cada sensor
    // tiene su propio temporizador; sin agrupar, sus lecturas caían en
    // instantes distintos y las curvas aparecían sueltas.
    for (const medicion of serie) {
      const ventana = ventanaDe(medicion.medidaEn)
      const punto = porInstante.get(ventana) ?? { medidaEn: ventana, hora: horaCorta(ventana) }
      punto[nombre] = medicion.valor
      porInstante.set(ventana, punto)
    }
  }

  const puntos = [...porInstante.values()].sort((a, b) => a.medidaEn.localeCompare(b.medidaEn)).slice(-15)
  return { puntos, series }
}

function TarjetaKpi({ etiqueta, valor, nota, alerta }: {
  etiqueta: string
  valor: number
  nota: string
  alerta?: boolean
}) {
  return (
    <li className={alerta ? 'tarjeta-kpi kpi-alerta' : 'tarjeta-kpi'}>
      <span className="kpi-etiqueta">{etiqueta}</span>
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
  // D40: el sensor fijado también va en la URL (`?sensor=…`): es un filtro
  // y se puede compartir. Al ser un filtro, sustituye la entrada actual.
  const [params, escribirParamsUrl] = useParamsUrl<{ sensor: string | null }>({ sensor: null })
  const sensorManualId = params.sensor
  const setSensorManualId = (id: string | null): void => {
    escribirParamsUrl({ sensor: id }, 'replace')
  }

  const cultivos = obtenerCultivos()
  const sensores = obtenerSensores()
  const alertas = obtenerAlertas()
  const activas = alertas.filter((a) => a.estado === 'activa').length
  const lecturas = sensores.reduce((total, s) => total + obtenerMediciones(s.id).length, 0)
  const sensorWidgetActivoId = sensorManualId ?? sensorDeUltimaLectura(sensores)

  const { puntos, series } = serieDe(tipoActivo, sensores)

  const ultimas = ultimasPorTipo(sensorWidgetActivoId ? [sensorWidgetActivoId] : sensores.map((s) => s.id))
  const hayLecturas = TIPOS_MEDICION.some((tipo) => ultimas[tipo] !== undefined)
  // D35: el gráfico se acompaña de su lectura en texto (en móvil el tooltip
  // es difícil de acertar con el dedo).
  const ultimaDelTipo = ultimasPorTipo(sensores.map((s) => s.id))[tipoActivo]

  return (
    <section className="tablero" aria-label="Resumen del panel">
      <ul className="fila-kpis">
        <TarjetaKpi etiqueta="Cultivos" valor={cultivos.length} nota="registrados" />
        <TarjetaKpi etiqueta="Sensores" valor={sensores.length} nota="conectados" />
        <TarjetaKpi
          etiqueta="Alertas activas"
          valor={activas}
          nota={activas > 0 ? 'requieren atención' : 'todo en rango'}
          alerta={activas > 0}
        />
        <TarjetaKpi etiqueta="Lecturas" valor={lecturas} nota="registradas" />
      </ul>

      <div className="fila-widgets">
        <article className="widget">
          {/* D33/D35: el título va a la derecha de las pestañas en escritorio
              (a la altura del contenido del gráfico) y encima de ellas en
              móvil, donde no cabe en una sola fila. El orden visual lo fija
              el CSS con `order`. */}
          <header className="cabecera-widget">
            <h3>Evolución de lecturas</h3>
            <div className="pestanas-widget" role="group" aria-label="Tipo de medición a mostrar">
              {TIPOS_MEDICION.map((tipo) => (
                <button
                  key={tipo}
                  type="button"
                  aria-pressed={tipo === tipoActivo}
                  onClick={() => setTipoActivo(tipo)}
                >
                  {ETIQUETAS_MEDICION_CORTA[tipo]}
                </button>
              ))}
            </div>
          </header>
          {puntos.length === 0 ? (
            <p className="estado-vacio">
              Sin lecturas todavía para “{ETIQUETAS_MEDICION[tipoActivo]}”: crea un sensor en el detalle del
              cultivo y genera una lectura.
            </p>
          ) : (
            <div className="grafico-lineas">
              {/* D40: el alto lo pone el CSS (`.grafico-lineas`), no un punto de
                  corte medido en JavaScript: dos fuentes para lo mismo. */}
              <ResponsiveContainer width="100%" height="100%">
                {/* D31/D33: margen izquierdo 0 porque el eje Y mide 44 px. Sin
                    relleno: con varias series, los tintes se superponían y
                    oscurecían una franja (DESIGN.md, «La regla del relleno plano»). */}
                <ComposedChart data={puntos} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <CartesianGrid stroke="var(--borde)" strokeDasharray="3 3" vertical={false} />
                  {/* D41: la clave del eje es el instante completo, no la hora
                      formateada: dos lecturas del mismo segundo producían
                      categorías repetidas (etiquetas duplicadas en el eje) y
                      dejaban el tooltip vacío. */}
                  <XAxis
                    dataKey="medidaEn"
                    tickFormatter={(valor: string) => horaCorta(valor)}
                    stroke="var(--texto-tenue)"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                  />
                  <YAxis stroke="var(--texto-tenue)" tickLine={false} axisLine={false} fontSize={12} width={44} />
                  <Tooltip
                    /* D41: la etiqueta del tooltip es el instante; se muestra
                       como hora legible, no como marca de tiempo cruda. */
                    labelFormatter={(valor) => horaCorta(String(valor))}
                    contentStyle={{
                      background: 'var(--superficie)',
                      border: '1px solid var(--borde)',
                      borderRadius: 8,
                      color: 'var(--texto)',
                      fontFamily: 'var(--fuente-texto)',
                    }}
                    formatter={(valor) => [`${valor} ${UNIDADES[tipoActivo]}`, ETIQUETAS_MEDICION[tipoActivo]]}
                  />
                  {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
                  {series.map((serie) => (
                    <Line
                      key={serie.nombre}
                      type="monotone"
                      dataKey={serie.nombre}
                      /* D45: une los huecos de una ventana sin lectura. */
                      connectNulls
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
          {ultimaDelTipo && (
            <p className="resumen-grafico" data-testid="resumen-grafico">
              Última lectura de {ETIQUETAS_MEDICION[tipoActivo].toLowerCase()}:{' '}
              <strong>
                {ultimaDelTipo.valor} {ultimaDelTipo.unidad}
              </strong>{' '}
              · {haceCuanto(ultimaDelTipo.medidaEn)}
            </p>
          )}
        </article>

        <article className="widget">
          <header className="cabecera-widget">
            <h3>Última lectura por tipo</h3>
            {/* D36: desplegable propio — la flecha gira al abrirse. */}
            <SelectorDesplegable
              etiqueta="Sensor del widget"
              valor={sensorWidgetActivoId ?? ''}
              testId="sensor-selector-widget"
              opciones={[
                { valor: '', texto: 'Todos los sensores' },
                ...sensores.map((sensor) => ({ valor: sensor.id, texto: sensor.nombre })),
              ]}
              onChange={(valor) => setSensorManualId(valor || null)}
            />
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
                    <span className="barra-etiqueta">{ETIQUETAS_MEDICION_CORTA[tipo]}</span>
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
