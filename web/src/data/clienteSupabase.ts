// T-22 — Cliente Supabase del navegador (D8: Fase 2 usa Supabase Auth y
// PostgREST). Usa SOLO la clave publicable (anon / publishable key), segura
// gracias al RLS verificado en T-20/T-21. El `service_role` jamás entra en
// el cliente (plan.md §4.3). Los valores viven en `.env.local` (ignorado por
// git); la plantilla documentada es `.env.example`.

import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const clavePublica = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !clavePublica) {
  throw new Error(
    'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en el entorno. ' +
      'Copia web/.env.example a web/.env.local y rellena los valores del proyecto Supabase.',
  )
}

export const clienteSupabase = createClient(url, clavePublica)
