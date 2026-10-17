// T-11 — Validación de umbrales (R-05): cada par debe cumplir min < max
// y valores numéricos finitos.

import { TIPOS_MEDICION, type TipoMedicion, type UmbralesPorTipo } from './tipos'

export interface ErrorUmbral {
  tipo: TipoMedicion
  motivo: string
}

export function validarUmbrales(umbrales: UmbralesPorTipo): ErrorUmbral[] {
  const errores: ErrorUmbral[] = []

  for (const tipo of TIPOS_MEDICION) {
    const umbral = umbrales[tipo]
    if (umbral === undefined) {
      errores.push({ tipo, motivo: 'Falta el umbral para este tipo de medición' })
      continue
    }
    if (!Number.isFinite(umbral.min) || !Number.isFinite(umbral.max)) {
      errores.push({ tipo, motivo: 'Los valores deben ser números finitos' })
      continue
    }
    if (umbral.min >= umbral.max) {
      errores.push({ tipo, motivo: 'El umbral mínimo debe ser menor que el máximo' })
    }
  }

  return errores
}
