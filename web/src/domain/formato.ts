/**
 * Formato de números para la interfaz (solo presentación; no altera datos).
 *
 * Regla: coma decimal española (locale es-AR) y sin separador de miles, porque
 * en mediciones agrícolas («1600 lux») el punto de miles confundiría más que ayudar.
 * Los decimales son exactos: `numero(17.6)` → "17,6"; `numero(45, 1)` → "45,0".
 * Si un valor no necesita decimales, el llamador pasa `decimales = 0`.
 */
export function numero(v: number, decimales = 1): string {
  return v.toLocaleString('es-AR', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
    useGrouping: false,
  })
}
