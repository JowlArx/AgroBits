// T-22 — Reglas de la contraseña compartidas por la UI y la store.
// Riesgo de T-22: «reglas de contraseña mal documentadas» — se documentan
// en pantalla (Autenticacion.tsx) y se validan antes de enviar.

/** Mínimo de la contraseña aceptado (regla por defecto de Supabase Auth). */
export const LONGITUD_MINIMA_CLAVE = 6
