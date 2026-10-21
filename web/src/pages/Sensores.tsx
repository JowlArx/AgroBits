// D30 — Vista de sensores: lista global de los sensores de la cuenta
// (nombre, cultivos vinculados, última lectura y selector del color de su
// línea) y detalle del sensor elegido con sus mediciones INDIVIDUALES
// (gráfico con su color y tabla completa). El color se persiste en la BD
// (`sensors.color_linea`, paleta nombrada sin ámbar/rojo por D20) a través
// de la store de sensores. Presentación sobre stores existentes.

import { useState, useSyncExternalStore } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  actualizarColorSensor,
  eliminarSensor,
  obtenerSensores,
  suscribirSensores,
} from '../data/storeSensores'
import { obtenerCultivo, suscribirCultivos } from '../data/storeCultivos'
import { eliminarMediciones, generarLectura, obtenerMediciones, suscribirMediciones } from '../data/medicionesSimuladas'
import { cargarAlertas } from '../data/storeAlertas'
import { COLORES_SENSOR, TIPOS_MEDICION, UNIDADES, type ColorSensor, type TipoMedicion } from '../domain/tipos'
import { ETIQUETAS_COLOR_SENSOR, ETIQUETAS_MEDICION, ETIQUETAS_MEDICION_CORTA, VAR_COLOR_SENSOR } from '../data/catalogo'
import ConfirmacionEnLinea from '../components/ConfirmacionEnLinea'

function horaLegible(iso: string): string {
  const fecha = new Date(iso)
  return Number.isNaN(fecha.getTime()) ? iso : fecha.toLocaleString('es-ES')
}

function horaCorta(iso: string): string {
  const fecha = new Date(iso)
  return Number.isNaN(fecha.getTime())
    ? iso
    : fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

/** Última lectura del sensor (la más reciente de cualquier tipo). */
function ultimaLectura(sensorId: string): { medidaEn: string } | undefined {
  const serie = obtenerMediciones(sensorId)
  let ultima: { medidaEn: string } | undefined
  for (const medicion of serie) if (!ultima || medicion.medidaEn > ultima.medidaEn) ultima = medicion
  return ultima
}

export default function Sensores() {
  const [sensorActivoId, setSensorActivoId] = useState<string | null>(null)
  const [tipoActivo, setTipoActivo] = useState<TipoMedicion>('temperatura')
  const [errorColor, setErrorColor] = useState('')

  useSyncExternalStore(suscribirSensores, obtenerSensores)
  useSyncExternalStore(suscribirCultivos, () => obtenerCultivo(sensorActivoId ?? ''))
  useSyncExternalStore(
    (oyente) => suscribirMediciones('sensores-vista', oyente),
    () => obtenerSensores().map((s) => `${s.id}:${obtenerMediciones(s.id).length}`).join('|'),
  )

  const sensores = obtenerSensores()
  const sensorActivo = sensores.find((s) => s.id === sensorActivoId)

  async function cambiarColor(sensorId: string, color: ColorSensor): Promise<void> {
    const resultado = await actualizarColorSensor(sensorId, color)
    setErrorColor(resultado.ok ? '' : resultado.errores.map((e) => e.motivo).join('. '))
  }

  /**
   * D34: elimina el sensor de la cuenta. En la BD caen en cascada sus
   * enlaces y sus mediciones; aquí se purga también la caché local.
   */
  async function eliminar(sensorId: string): Promise<void> {
    const resultado = await eliminarSensor(sensorId)
    if (!resultado.ok) {
      setErrorColor(resultado.errores.map((e) => e.motivo).join('. '))
      return
    }
    try {
      await eliminarMediciones([sensorId])
    } catch (error) {
      console.error('No se pudo purgar la caché de mediciones', error)
    }
    if (sensorActivoId === sensorId) setSensorActivoId(null)
  }

  const puntosSensor = sensorActivo
    ? obtenerMediciones(sensorActivo.id)
        .filter((m) => m.tipo === tipoActivo)
        .slice(-15)
        .map((m) => ({ hora: horaCorta(m.medidaEn), valor: m.valor }))
    : []

  const serieSensor = sensorActivo ? obtenerMediciones(sensorActivo.id) : []

  return (
    <section data-testid="vista-sensores">
      <h2>Sensores</h2>

      {sensores.length === 0 ? (
        <p data-testid="sin-sensores-panel" className="estado-vacio">
          Aún no hay sensores: crea uno en el detalle de un cultivo y aparecerá aquí con sus
          mediciones.
        </p>
      ) : (
        <ul data-testid="lista-sensores-panel" className="lista-sensores-panel">
          {sensores.map((sensor) => {
            const ultima = ultimaLectura(sensor.id)
            return (
              <li key={sensor.id} className="tarjeta-sensor" data-testid="tarjeta-sensor">
                <div className="datos-sensor">
                  <div className="fila-datos-sensor">
                    <strong className="nombre-sensor-panel">{sensor.nombre}</strong>
                    {/* D31: la hora de la última lectura, arriba a la derecha. */}
                    <span className="ultima-lectura-sensor">
                      {ultima ? (
                        <>
                          Últ. lectura:{' '}
                          <time dateTime={ultima.medidaEn}>{horaLegible(ultima.medidaEn)}</time>
                        </>
                      ) : (
                        'Sin lecturas todavía'
                      )}
                    </span>
                  </div>
                  <span className="vinculos-sensor">
                    {sensor.cultivoIds.length === 0
                      ? 'Sin cultivos vinculados'
                      : sensor.cultivoIds
                          .map((id) => obtenerCultivo(id)?.nombre ?? 'Cultivo eliminado')
                          .join(' · ')}
                  </span>
                </div>

                <div
                  className="paleta-colores"
                  role="group"
                  aria-label={`Color de la línea de ${sensor.nombre}`}
                >
                  {COLORES_SENSOR.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className="muestra-color"
                      style={{ background: VAR_COLOR_SENSOR[color] }}
                      data-color={color}
                      data-testid={`color-${color}`}
                      aria-label={`${ETIQUETAS_COLOR_SENSOR[color]} — color de ${sensor.nombre}`}
                      aria-pressed={sensor.colorLinea === color}
                      title={ETIQUETAS_COLOR_SENSOR[color]}
                      onClick={() => void cambiarColor(sensor.id, color)}
                    />
                  ))}
                  {/* D35: el color activo se nombra, no solo se insinúa. */}
                  <span className="nombre-color-sensor">{ETIQUETAS_COLOR_SENSOR[sensor.colorLinea]}</span>
                </div>

                <div className="acciones acciones-tarjeta">
                  <button
                    type="button"
                    onClick={() => setSensorActivoId(sensor.id)}
                    aria-expanded={sensorActivoId === sensor.id}
                  >
                    Ver mediciones
                  </button>
                  <ConfirmacionEnLinea
                    etiqueta="Eliminar"
                    pregunta={`¿Eliminar «${sensor.nombre}»?`}
                    className="btn-peligro"
                    testId="eliminar-sensor"
                    onConfirmar={() => void eliminar(sensor.id)}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {errorColor && (
        <p role="alert" data-testid="error-color">
          {errorColor}
        </p>
      )}

      {sensorActivo && (
        <article className="detalle-sensor" data-testid="detalle-sensor">
          <header className="fila-entre">
            <div>
              <h3>{sensorActivo.nombre}</h3>
              <span
                className="chip-color"
                style={{ background: VAR_COLOR_SENSOR[sensorActivo.colorLinea] }}
                aria-hidden="true"
              />
              <span className="etiqueta">{ETIQUETAS_COLOR_SENSOR[sensorActivo.colorLinea]}</span>
            </div>
            <button type="button" onClick={() => setSensorActivoId(null)}>
              Volver a la lista
            </button>
          </header>

          <h4>Evolución</h4>
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

          {puntosSensor.length === 0 ? (
            <p className="estado-vacio" data-testid="sin-lecturas-sensor">
              Sin lecturas todavía para “{ETIQUETAS_MEDICION[tipoActivo]}”: genera una lectura para
              ver la curva.
            </p>
          ) : (
            <div className="grafico-lineas grafico-sensor">
              <ResponsiveContainer width="100%" height="100%">
                {/* D31: eje Y alineado con el título + relleno degradado. */}
                <ComposedChart data={puntosSensor} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <defs>
                    <linearGradient id="relleno-sensor-0" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={VAR_COLOR_SENSOR[sensorActivo.colorLinea]} stopOpacity={0.22} />
                      <stop offset="95%" stopColor={VAR_COLOR_SENSOR[sensorActivo.colorLinea]} stopOpacity={0.02} />
                    </linearGradient>
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
                    formatter={(valor) => [`${valor} ${UNIDADES[tipoActivo]}`, ETIQUETAS_MEDICION[tipoActivo]]}
                  />
                  <Area
                    type="monotone"
                    dataKey="valor"
                    stroke="none"
                    fill="url(#relleno-sensor-0)"
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="valor"
                    stroke={VAR_COLOR_SENSOR[sensorActivo.colorLinea]}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          <h4>Mediciones individuales</h4>
          <button
            type="button"
            className="btn-primario"
            data-testid="simular-lectura-sensor"
            onClick={() => {
              void (async () => {
                await generarLectura(sensorActivo.id)
                await cargarAlertas()
              })()
            }}
          >
            Generar lectura simulada
          </button>

          <table className="tabla-umbrales" data-testid="tabla-mediciones-sensor">
            <thead>
              <tr>
                <th scope="col">Medición</th>
                <th scope="col">Valor</th>
                <th scope="col">Hora</th>
              </tr>
            </thead>
            <tbody>
              {serieSensor.length === 0 ? (
                <tr>
                  <td colSpan={3}>
                    <span className="sin-datos">Sin lecturas registradas todavía.</span>
                  </td>
                </tr>
              ) : (
                [...serieSensor]
                  .reverse()
                  .slice(0, 20)
                  .map((medicion, indice) => (
                    <tr key={`${medicion.medidaEn}-${medicion.tipo}-${indice}`}>
                      <td>{ETIQUETAS_MEDICION[medicion.tipo]}</td>
                      <td>
                        {medicion.valor} {medicion.unidad}
                      </td>
                      <td>
                        <time dateTime={medicion.medidaEn}>{horaLegible(medicion.medidaEn)}</time>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>

          <p className="aviso">
            El color de la línea se guarda en el sensor y se aplica también al tablero principal.
            Las lecturas simuladas se generan cada 5 minutos mientras la sesión está abierta.
          </p>
        </article>
      )}
    </section>
  )
}
