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

/**
 * Hora relativa para la interfaz: mismo día → «ahora», «hace N min» o «hace N h»;
 * día anterior → «ayer HH:MM»; otro día → «dd/mm». Fecha inválida → el texto original.
 */
export function tiempoRelativo(iso: string, ahora: Date = new Date()): string {
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return iso
  const hora = fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  if (fecha.toDateString() === ahora.toDateString()) {
    const minutos = Math.floor((ahora.getTime() - fecha.getTime()) / 60_000)
    if (minutos < 1) return 'ahora'
    if (minutos < 60) return `hace ${minutos} min`
    return `hace ${Math.floor(minutos / 60)} h`
  }
  const ayer = new Date(ahora)
  ayer.setDate(ayer.getDate() - 1)
  if (fecha.toDateString() === ayer.toDateString()) return `ayer ${hora}`
  return fecha.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
}
