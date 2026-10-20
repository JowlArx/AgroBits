// T-13 — Catálogo inicial de cultivos con umbrales por defecto (decisión D3:
// catálogo editable). Los valores son una REFERENCIA ORIENTATIVA y no
// asesoramiento agronómico certificado (R-11 AC2).

import type { ColorSensor, UmbralesPorTipo } from '../domain/tipos'

export interface EntradaCatalogo {
  tipoCultivo: string
  umbrales: UmbralesPorTipo
}

export const AVISO_CATALOGO =
  'Los umbrales del catálogo son una referencia orientativa, no asesoramiento agronómico. ' +
  'Revísalos y ajústalos a las condiciones de tu cultivo.'

export const CATALOGO_CULTIVOS: readonly EntradaCatalogo[] = [
  {
    tipoCultivo: 'Tomate',
    umbrales: {
      humedad_suelo: { min: 40, max: 75 },
      temperatura: { min: 15, max: 28 },
      humedad_ambiental: { min: 50, max: 80 },
      luminosidad: { min: 10_000, max: 50_000 },
    },
  },
  {
    tipoCultivo: 'Lechuga',
    umbrales: {
      humedad_suelo: { min: 45, max: 75 },
      temperatura: { min: 10, max: 22 },
      humedad_ambiental: { min: 50, max: 80 },
      luminosidad: { min: 8_000, max: 40_000 },
    },
  },
  {
    tipoCultivo: 'Albahaca',
    umbrales: {
      humedad_suelo: { min: 40, max: 70 },
      temperatura: { min: 18, max: 30 },
      humedad_ambiental: { min: 50, max: 80 },
      luminosidad: { min: 10_000, max: 45_000 },
    },
  },
  {
    tipoCultivo: 'Pimiento',
    umbrales: {
      humedad_suelo: { min: 40, max: 70 },
      temperatura: { min: 16, max: 30 },
      humedad_ambiental: { min: 50, max: 80 },
      luminosidad: { min: 12_000, max: 50_000 },
    },
  },
]

export const TIPO_PERSONALIZADO = 'Personalizado'

export function umbralesPorDefecto(tipoCultivo: string): UmbralesPorTipo | undefined {
  return CATALOGO_CULTIVOS.find((e) => e.tipoCultivo === tipoCultivo)?.umbrales
}

export const ETIQUETAS_MEDICION: Record<string, string> = {
  humedad_suelo: 'Humedad de suelo (% vol)',
  temperatura: 'Temperatura (°C)',
  humedad_ambiental: 'Humedad ambiental (% HR)',
  luminosidad: 'Luminosidad (lux)',
}

/**
 * D35: etiquetas cortas para pestañas y barras, donde la unidad ya aparece
 * en el valor (evita que el título ocupe dos líneas y desborde la tarjeta).
 */
export const ETIQUETAS_MEDICION_CORTA: Record<string, string> = {
  humedad_suelo: 'Humedad de suelo',
  temperatura: 'Temperatura',
  humedad_ambiental: 'Humedad ambiente',
  luminosidad: 'Luminosidad',
}

/** D30: etiquetas y variables CSS del color de línea de cada sensor. */
export const ETIQUETAS_COLOR_SENSOR: Record<ColorSensor, string> = {
  verde: 'Verde',
  azul: 'Azul',
  violeta: 'Violeta',
  cian: 'Turquesa',
  rosa: 'Rosa',
  gris: 'Gris',
}

export const VAR_COLOR_SENSOR: Record<ColorSensor, string> = {
  verde: 'var(--linea-verde)',
  azul: 'var(--linea-azul)',
  violeta: 'var(--linea-violeta)',
  cian: 'var(--linea-cian)',
  rosa: 'var(--linea-rosa)',
  gris: 'var(--linea-gris)',
}
