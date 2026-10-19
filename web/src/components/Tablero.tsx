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
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { obtenerCultivos, suscribirCultivos } from '../data/storeCultivos'
import { obtenerSensores, suscribirSensores } from '../data/storeSensores'
import { obtenerAlertas, suscribirAlertas } from '../data/storeAlertas'
import { obtenerMediciones, suscribirMediciones, ultimasPorTipo } from '../data/medicionesSimuladas'
import { ETIQUETAS_MEDICION } from '../data/catalogo'
import { TIPOS_MEDICION, type TipoMedicion } from '../domain/tipos'

/** Escalas solo para dimensionar las barras (los valores mostrados son reales). */
const ESCALA_MAXIMA: Record<TipoMedicion, number> = {
  humedad_suelo: 100,
  temperatura: 50,
  humedad_ambiental: 100,
  luminosidad: 60_000,
}

/** Paleta de líneas con los tokens del tema (sin usar ámbar, que es de alertas). */
const COLORES_LINEA = ['var(--marca)', 'var(--marca-hover)', 'var(--borde-input)', 'var(--texto-tenue)']

function horaCorta(iso: string): string {
  const fecha = new Date(iso)
  return Number.isNaN(fecha.getTime())
    ? iso
    : fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

interface PuntoGrafico {
  medidaEn: string
  hora: string
  [sensor: string]: string | number
}

/** Serie para el gráfico: una columna por sensor, fusionando por instante. */
function serieDe(
  tipo: TipoMedicion,
  sensores: readonly { id: string; nombre: string }[],
): { puntos: PuntoGrafico[]; nombres: string[] } {
  const porInstante = new Map<string, PuntoGrafico>()
  const nombresUsados = new Set<string>()
  const nombres: string[] = []

  for (const sensor of sensores) {
    // Dos sensores pueden llamar igual: se desambigua para no colisionar dataKeys.
    let nombre = sensor.nombre
    let sufijo = 2
    while (nombresUsados.has(nombre)) nombre = `${sensor.nombre} (${sufijo++})`
    nombresUsados.add(nombre)

    const serie = obtenerMediciones(sensor.id).filter((m) => m.tipo === tipo)
    if (serie.length === 0) continue
    nombres.push(nombre)

    for (const medicion of serie) {
      const punto = porInstante.get(medicion.medidaEn) ?? { medidaEn: medicion.medidaEn, hora: horaCorta(medicion.medidaEn) }
      punto[nombre] = medicion.valor
      porInstante.set(medicion.medidaEn, punto)
    }
  }

  const puntos = [...porInstante.values()].sort((a, b) => a.medidaEn.localeCompare(b.medidaEn)).slice(-15)
  return { puntos, nombres }
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

  const cultivos = obtenerCultivos()
  const sensores = obtenerSensores()
  const alertas = obtenerAlertas()
  const activas = alertas.filter((a) => a.estado === 'activa').length
  const lecturas = sensores.reduce((total, s) => total + obtenerMediciones(s.id).length, 0)

  const { puntos, nombres: nombresSensores } = serieDe(tipoActivo, sensores)

  const ultimas = ultimasPorTipo(sensores.map((s) => s.id))
  const hayLecturas = TIPOS_MEDICION.some((tipo) => ultimas[tipo] !== undefined)

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
                  {ETIQUETAS_MEDICION[tipo]}
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
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={puntos} margin={{ top: 8, right: 16, bottom: 8, left: -8 }}>
                  <CartesianGrid stroke="var(--borde)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="hora" stroke="var(--texto-tenue)" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis stroke="var(--texto-tenue)" tickLine={false} axisLine={false} fontSize={12} width={48} />
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
                  {nombresSensores.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
                  {nombresSensores.map((nombre, i) => (
                    <Line
                      key={nombre}
                      type="monotone"
                      dataKey={nombre}
                      stroke={COLORES_LINEA[i % COLORES_LINEA.length]}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>

        <article className="widget">
          <header className="cabecera-widget">
            <h3>Última lectura por tipo</h3>
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
