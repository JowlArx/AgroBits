// Gráfica de evolución de UN tipo de medición de UN sensor (últimas lecturas).
// Extraída de la vista de sensores (D31/D41) para reutilizarla en el detalle
// del cultivo. Presentación pura: los puntos y el color los decide quien la usa.

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
import { UNIDADES, type TipoMedicion } from '../domain/tipos'
import { ETIQUETAS_MEDICION } from '../data/catalogo'

interface Props {
  puntos: { medidaEn: string; valor: number }[]
  tipo: TipoMedicion
  /** Color de la línea (valor CSS, p. ej. `var(--sensor-verde)`). */
  color: string
}

/** Hora corta local (hh:mm:ss) para ejes y tooltip. */
export function horaCorta(iso: string): string {
  const fecha = new Date(iso)
  return Number.isNaN(fecha.getTime())
    ? iso
    : fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function GraficoLecturas({ puntos, tipo, color }: Props) {
  return (
    <div className="grafico-lineas grafico-sensor">
      <ResponsiveContainer width="100%" height="100%">
        {/* D31: eje Y alineado con el título + relleno plano (DESIGN.md). */}
        <ComposedChart data={puntos} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid stroke="var(--borde)" strokeDasharray="3 3" vertical={false} />
          {/* D41: la clave del eje es el instante completo, no la hora
              formateada (misma razón que en el tablero). */}
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
            formatter={(valor) => [`${valor} ${UNIDADES[tipo]}`, ETIQUETAS_MEDICION[tipo]]}
          />
          <Area
            type="linear"
            dataKey="valor"
            /* D41: el relleno no va al tooltip (si no, el sensor
               aparecía dos veces). */
            tooltipType="none"
            stroke="none"
            fill={color}
            fillOpacity={0.12}
            isAnimationActive={false}
          />
          <Line
            type="linear"
            dataKey="valor"
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
