// H1 — Edge Function de ingesta de lecturas desde dispositivos.
//
// Decisiones aprobadas:
//   * Autenticación del dispositivo con la cabecera `x-device-token`.
//   * `Authorization` lo valida la plataforma (verify_jwt activo); aquí no se interpreta.
//   * El token nunca se guarda ni se registra: solo se compara su SHA-256 con `device_tokens`.
//   * Escritura en `measurements` con service_role (solo en servidor). No se abre `anon`.
//   * Sin dependencias externas: fetch directo contra PostgREST y crypto.subtle.
//
// Variables de entorno (inyectadas por Supabase): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

import { ErrorHttp, extraerLecturas, validarLectura } from './validacion.ts';

type FilaMedicion = {
  sensor_id: string;
  tipo: string;
  value: number;
  unit: string;
  measured_at: string;
};

function json(status: number, cuerpo: unknown): Response {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function sha256Hex(texto: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

function configuracion(): { url: string; serviceKey: string } {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) {
    throw new Error('configuración de Supabase incompleta');
  }
  return { url, serviceKey };
}

function cabeceras(serviceKey: string, extra: Record<string, string> = {}): HeadersInit {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return json(405, { error: 'método no permitido' });
  }

  try {
    const token = req.headers.get('x-device-token');
    if (!token) {
      throw new ErrorHttp(401, 'token de dispositivo ausente o no válido');
    }

    let cuerpo: unknown;
    try {
      cuerpo = await req.json();
    } catch {
      throw new ErrorHttp(400, 'cuerpo inválido');
    }

    const brutas = extraerLecturas(cuerpo);
    const ahora = Date.now();
    const lecturas = brutas.map((raw, i) => validarLectura(raw, i, ahora));

    const cfg = configuracion();

    // Búsqueda del token por su hash (nunca por el valor en claro).
    const hash = await sha256Hex(token);
    const urlTokens = new URL('/rest/v1/device_tokens', cfg.url);
    urlTokens.searchParams.set('token_hash', `eq.${hash}`);
    urlTokens.searchParams.set('activo', 'eq.true');
    urlTokens.searchParams.set('revoked_at', 'is.null');
    urlTokens.searchParams.set('select', 'id,sensor_id');

    const respuestaToken = await fetch(urlTokens, { headers: cabeceras(cfg.serviceKey) });
    if (!respuestaToken.ok) {
      console.error(`ingesta: consulta de token fallida (${respuestaToken.status})`);
      throw new Error('consulta de token fallida');
    }
    const filasToken = (await respuestaToken.json()) as { id: string; sensor_id: string }[];
    const dispositivo = filasToken[0];
    if (!dispositivo) {
      throw new ErrorHttp(401, 'token de dispositivo ausente o no válido');
    }

    // Inserción de todas las lecturas en una sola llamada.
    const filas: FilaMedicion[] = lecturas.map((l) => ({
      sensor_id: dispositivo.sensor_id,
      tipo: l.tipo,
      value: l.valor,
      unit: l.unidad,
      measured_at: l.medida_en,
    }));

    const respuestaInsert = await fetch(
      new URL('/rest/v1/measurements?on_conflict=sensor_id,tipo,measured_at', cfg.url),
      {
        method: 'POST',
        headers: cabeceras(cfg.serviceKey, { Prefer: 'resolution=merge-duplicates,return=minimal' }),
        body: JSON.stringify(filas),
      },
    );
    if (!respuestaInsert.ok) {
      console.error(`ingesta: inserción fallida (${respuestaInsert.status})`);
      throw new Error('inserción fallida');
    }

    // Mejor esfuerzo: si falla, no invalida la respuesta.
    try {
      const urlPatch = new URL('/rest/v1/device_tokens', cfg.url);
      urlPatch.searchParams.set('id', `eq.${dispositivo.id}`);
      await fetch(urlPatch, {
        method: 'PATCH',
        headers: cabeceras(cfg.serviceKey, { Prefer: 'return=minimal' }),
        body: JSON.stringify({ last_seen_at: new Date().toISOString() }),
      });
    } catch {
      console.error('ingesta: no se pudo actualizar last_seen_at');
    }

    return json(200, { insertadas: filas.length, sensor_id: dispositivo.sensor_id });
  } catch (err) {
    if (err instanceof ErrorHttp) {
      return json(err.status, { error: err.message });
    }
    console.error('ingesta: error interno');
    return json(500, { error: 'error interno' });
  }
});
