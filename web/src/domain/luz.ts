/** Intervalo fijo entre lecturas de luminosidad, en segundos (5 minutos). */
const INTERVALO_LECTURA_S = 300;

/** Valor de saturación del sensor BH1750, en lux. */
const LUX_MAXIMO = 65535;

/** Aproximación solar: 1 µmol/m²/s ≈ 54 lux. No es válida bajo luz LED. */
const LUX_POR_UMOL = 54;

/**
 * Estima el DLI (mol/m²/día) a partir de lecturas de luminosidad en lux
 * tomadas a intervalo fijo. Cada lectura se limita a 65.535 lx, se convierte
 * a µmol/m²/s y se integra en el tiempo con el intervalo entre lecturas.
 */
export function dliEstimado(lecturas: ReadonlyArray<{ value: number }>): number {
  let umol = 0;
  for (const { value } of lecturas) {
    if (!Number.isFinite(value)) continue;
    const lux = Math.min(Math.max(value, 0), LUX_MAXIMO);
    umol += (lux / LUX_POR_UMOL) * INTERVALO_LECTURA_S;
  }
  return umol / 1_000_000;
}
