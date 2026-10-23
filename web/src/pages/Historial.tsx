import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import * as XLSX from 'xlsx'
import { obtenerCultivos, suscribirCultivos } from '../data/storeCultivos'
import { obtenerSensores, suscribirSensores } from '../data/storeSensores'
import { exigirProveedor } from '../data/datos/proveedorDatos'
import type { AgregadoDiario } from '../data/datos/proveedorDatos'
import type { Medicion, TipoMedicion } from '../domain/tipos'
import { TIPOS_MEDICION } from '../domain/tipos'
import { ETIQUETAS_MEDICION } from '../data/catalogo'

function useCultivos() {
  return useSyncExternalStore(suscribirCultivos, obtenerCultivos, obtenerCultivos)
}
function useSensores() {
  return useSyncExternalStore(suscribirSensores, obtenerSensores, obtenerSensores)
}

function fechaISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

interface FilaBarra {
  dia: string
  [clave: string]: string | number
}

export default function Historial({
  cultivoIdInicial,
}: {
  cultivoIdInicial?: string
}) {
  const cultivos = useCultivos()
  const sensores = useSensores()

  const [cultivoId, setCultivoId] = useState<string>(cultivoIdInicial ?? '')
  const [sensorId, setSensorId] = useState<string>('')
  const [tipo, setTipo] = useState<TipoMedicion | ''>('')
  const [desde, setDesde] = useState<string>(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return fechaISO(d)
  })
  const [hasta, setHasta] = useState<string>(() => fechaISO(new Date()))

  const [agregados, setAgregados] = useState<AgregadoDiario[]>([])
  const [rawMediciones, setRawMediciones] = useState<Medicion[]>([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exportando, setExportando] = useState(false)

  // Sensores filtrados por cultivo seleccionado
  const sensoresFiltrados = useMemo(() => {
    if (!cultivoId) return sensores
    return sensores.filter((s) => s.cultivoIds.includes(cultivoId))
  }, [sensores, cultivoId])

  // Sensor efectivo: si el elegido ya no está en la lista filtrada, se trata como "todos".
  const sensorIdEfectivo = sensoresFiltrados.some((s) => s.id === sensorId) ? sensorId : ''

  const sensoresObjetivo = useMemo(() => {
    if (sensorIdEfectivo) return sensores.filter((s) => s.id === sensorIdEfectivo)
    if (cultivoId) return sensoresFiltrados
    return sensores
  }, [sensorIdEfectivo, cultivoId, sensores, sensoresFiltrados])

  // Selector de sensor usa el valor efectivo.
  // (el estado `sensorId` se mantiene para el control, pero se sanea al mostrar)

  // Carga de agregados al cambiar filtros
  useEffect(() => {
    let vivo = true
    const ids = sensoresObjetivo.map((s) => s.id)
    async function cargar() {
      setCargando(true)
      setError(null)
      try {
        const [datos, crudas] = await Promise.all([
          exigirProveedor().cargarAgregadosDiarios(ids, desde, hasta + 'T23:59:59'),
          exigirProveedor().cargarMedicionesRango(ids, desde, hasta + 'T23:59:59'),
        ])
        if (!vivo) return
        setAgregados(tipo ? datos.filter((d) => d.tipo === tipo) : datos)
        setRawMediciones(tipo ? crudas.filter((m) => m.tipo === tipo) : crudas)
      } catch (e) {
        if (!vivo) return
        setError(e instanceof Error ? e.message : 'No se pudo cargar el historial')
      } finally {
        if (vivo) setCargando(false)
      }
    }
    void cargar()
    return () => {
      vivo = false
    }
  }, [sensoresObjetivo, desde, hasta, tipo])

  // Datos para el gráfico: una fila por día, una columna por (sensor, tipo).
  // Se usan los agregados diarios cuando existen; para los días recientes que
  // aún no se han agregado (el job corre a las 03:15), se agregan en cliente
  // a partir de las mediciones crudas.
  const { puntos, series } = useMemo(() => {
    const porDia = new Map<string, FilaBarra>()
    const nombresUsados = new Set<string>()
    const series: { nombre: string; color: string }[] = []
    const colores = ['#2563eb', '#16a34a', '#dc2626', '#0d9488', '#ea580c', '#0891b2']

    // Conjunto de claves (sensor|tipo|dia) ya cubiertas por agregados.
    const cubiertas = new Set(agregados.map((a) => `${a.sensorId}|${a.tipo}|${a.dia}`))

    // Agregados oficiales.
    const todos: AgregadoDiario[] = [...agregados]

    // Agregación en cliente de las crudas para los días sin agregado.
    const grupos = new Map<string, number[]>()
    const meta = new Map<string, { sensorId: string; tipo: TipoMedicion; dia: string }>()
    for (const m of rawMediciones) {
      const dia = m.medidaEn.slice(0, 10)
      const clave = `${m.sensorId}|${m.tipo}|${dia}`
      if (cubiertas.has(clave)) continue
      const g = grupos.get(clave) ?? []
      g.push(m.valor)
      grupos.set(clave, g)
      if (!meta.has(clave)) meta.set(clave, { sensorId: m.sensorId, tipo: m.tipo, dia })
    }
    for (const [clave, vals] of grupos) {
      const m = meta.get(clave)!
      todos.push({
        sensorId: m.sensorId,
        tipo: m.tipo,
        dia: m.dia,
        valorMedio: vals.reduce((a, b) => a + b, 0) / vals.length,
        valorMin: Math.min(...vals),
        valorMax: Math.max(...vals),
        n: vals.length,
      })
    }

    for (const a of todos) {
      const sensor = sensores.find((s) => s.id === a.sensorId)
      const base = sensor?.nombre ?? a.sensorId
      let nombre = tipo ? base : `${base} · ${ETIQUETAS_MEDICION[a.tipo]}`
      let sufijo = 2
      while (nombresUsados.has(nombre)) nombre = `${nombre} (${sufijo++})`
      nombresUsados.add(nombre)
      if (!series.some((s) => s.nombre === nombre)) {
        series.push({ nombre, color: colores[series.length % colores.length] })
      }
      const fila = porDia.get(a.dia) ?? { dia: a.dia }
      fila[`${nombre} (media)`] = a.valorMedio
      fila[`${nombre} (máx)`] = a.valorMax
      fila[`${nombre} (mín)`] = a.valorMin
      porDia.set(a.dia, fila)
    }

    const puntos = [...porDia.values()].sort((a, b) => String(a.dia).localeCompare(String(b.dia)))
    return { puntos, series }
  }, [agregados, rawMediciones, sensores, tipo])

  const exportar = useCallback(async () => {
    setExportando(true)
    setError(null)
    try {
      const ids = sensoresObjetivo.map((s) => s.id)
      const mediciones = await exigirProveedor().cargarMedicionesRango(ids, desde, hasta + 'T23:59:59')
      const filtradas = tipo ? mediciones.filter((m) => m.tipo === tipo) : mediciones
      const filas = filtradas.map((m) => ({
        Sensor: sensores.find((s) => s.id === m.sensorId)?.nombre ?? m.sensorId,
        Cultivo:
          cultivos.find((c) => sensores.find((s) => s.id === m.sensorId)?.cultivoIds.includes(c.id))?.nombre ?? '',
        Tipo: ETIQUETAS_MEDICION[m.tipo],
        Valor: m.valor,
        Unidad: m.unidad,
        'Fecha y hora': m.medidaEn,
      }))
      const hoja = XLSX.utils.json_to_sheet(filas)
      const libro = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(libro, hoja, 'Historial')
      XLSX.writeFile(libro, `historial-${desde}-${hasta}.xlsx`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo exportar')
    } finally {
      setExportando(false)
    }
  }, [sensoresObjetivo, desde, hasta, tipo, sensores, cultivos])

  const hayDatos = agregados.length > 0 || rawMediciones.length > 0

  return (
    <section className="historial">
      <header className="historial-cabecera">
        <h2>Historial de mediciones</h2>
        <p className="historial-descripcion">
          Resumen diario (media, mínimo y máximo) y exportación a Excel de las lecturas registradas.
        </p>
      </header>

      <div className="historial-filtros">
        <label>
          Cultivo
          <select value={cultivoId} onChange={(e) => setCultivoId(e.target.value)}>
            <option value="">Todos</option>
            {cultivos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>
        <label>
          Sensor
          <select value={sensorIdEfectivo} onChange={(e) => setSensorId(e.target.value)}>
            <option value="">Todos</option>
            {sensoresFiltrados.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tipo
          <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoMedicion | '')}>
            <option value="">Todos</option>
            {TIPOS_MEDICION.map((t) => (
              <option key={t} value={t}>
                {ETIQUETAS_MEDICION[t]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Desde
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </label>
        <label>
          Hasta
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </label>
      </div>

      <div className="historial-acciones">
        <button type="button" onClick={exportar} disabled={!hayDatos || exportando}>
          {exportando ? 'Exportando…' : 'Exportar a Excel'}
        </button>
      </div>

      {error && <p role="alert" className="historial-error">{error}</p>}

      {cargando ? (
        <p className="historial-cargando">Cargando…</p>
      ) : !hayDatos ? (
        <p className="historial-vacio">No hay mediciones en el rango seleccionado.</p>
      ) : (
        <div className="historial-grafico">
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={puntos} margin={{ top: 12, right: 16, bottom: 8, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              {series.map((s) => (
                <Bar key={`${s.nombre}-media`} dataKey={`${s.nombre} (media)`} fill={s.color} name={`${s.nombre} media`} />
              ))}
              {series.map((s) => (
                <Bar key={`${s.nombre}-max`} dataKey={`${s.nombre} (máx)`} fill={s.color} fillOpacity={0.4} name={`${s.nombre} máx`} />
              ))}
              {series.map((s) => (
                <Bar key={`${s.nombre}-min`} dataKey={`${s.nombre} (mín)`} fill={s.color} fillOpacity={0.2} name={`${s.nombre} mín`} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}