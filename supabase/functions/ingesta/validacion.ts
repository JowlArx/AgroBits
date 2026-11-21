export const MAX_LECTURAS = 32;
// Ventana amplia a propósito: el dispositivo puede estar horas sin cobertura y
// reenviar el buffer al reconectar. No es defensa anti-replay (el token ya
// autoriza), sino una cota para descartar relojes absurdos.
export const VENTANA_MS = 24 * 60 * 60 * 1000;
export const ISO_8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})$/i;

// Tipos canónicos y su unidad exacta.
export const UNIDAD_CANONICA = new Map<string, string>([
  ['humedad_suelo', '% vol'],
  ['temperatura', '°C'],
  ['humedad_ambiental', '% HR'],
  ['luminosidad', 'lux'],
]);

export type Lectura = {
  tipo: string;
  valor: number;
  unidad: string;
  medida_en: string;
};

// Error con estado HTTP y mensaje seguro para el cliente.
export class ErrorHttp extends Error {
  status: number;

  constructor(status: number, mensaje: string) {
    super(mensaje);
    this.status = status;
  }
}

// Normaliza el cuerpo: acepta `{ lecturas: [...] }` o una lectura suelta.
export function extraerLecturas(cuerpo: unknown): unknown[] {
  if (typeof cuerpo !== 'object' || cuerpo === null || Array.isArray(cuerpo)) {
    throw new ErrorHttp(400, 'cuerpo inválido');
  }
  const registro = cuerpo as Record<string, unknown>;
  if ('lecturas' in registro) {
    if (!Array.isArray(registro.lecturas) || registro.lecturas.length === 0) {
      throw new ErrorHttp(400, 'lecturas debe ser una lista no vacía');
    }
    if (registro.lecturas.length > MAX_LECTURAS) {
      throw new ErrorHttp(422, `el lote supera el máximo de ${MAX_LECTURAS} lecturas`);
    }
    return registro.lecturas;
  }
  return [registro];
}

// Valida una lectura. Lanza 422 indicando el índice si algo falla.
export function validarLectura(raw: unknown, indice: number, ahora: number): Lectura {
  const error = (motivo: string) => new ErrorHttp(422, `lectura ${indice}: ${motivo}`);

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw error('formato inválido');
  }
  const r = raw as Record<string, unknown>;

  if (typeof r.tipo !== 'string' || !UNIDAD_CANONICA.has(r.tipo)) {
    throw error('tipo no válido');
  }
  const tipo = r.tipo;

  if (typeof r.unidad !== 'string' || r.unidad !== UNIDAD_CANONICA.get(tipo)) {
    throw error('unidad no válida para el tipo');
  }
  const unidad = r.unidad;

  if (typeof r.valor !== 'number' || !Number.isFinite(r.valor)) {
    throw error('valor no numérico o no finito');
  }

  if (typeof r.medida_en !== 'string' || !ISO_8601.test(r.medida_en)) {
    throw error('medida_en no es ISO 8601');
  }
  const momento = Date.parse(r.medida_en);
  if (Number.isNaN(momento)) {
    throw error('medida_en no es una fecha válida');
  }
  if (Math.abs(momento - ahora) > VENTANA_MS) {
    throw error('medida_en fuera de la ventana de 24 horas');
  }

  return { tipo, valor: r.valor, unidad, medida_en: r.medida_en };
}
