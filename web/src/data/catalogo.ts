// T-13 — Catálogo inicial de cultivos con umbrales por defecto (decisión D3:
// catálogo editable). Los valores son una REFERENCIA ORIENTATIVA y no
// asesoramiento agronómico certificado (R-11 AC2).

import type { UmbralesPorTipo } from '../domain/tipos'

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
