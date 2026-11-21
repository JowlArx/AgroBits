import { describe, expect, it } from 'vitest';
import {
  ErrorHttp,
  extraerLecturas,
  validarLectura,
} from '../../../../supabase/functions/ingesta/validacion';

const AHORA = Date.UTC(2026, 10, 21, 12, 0, 0);
const HORA_MS = 60 * 60 * 1000;

function lecturaValida(indice: number) {
  return {
    tipo: 'temperatura',
    valor: 20 + indice,
    unidad: '°C',
    medida_en: new Date(AHORA - indice * 1000).toISOString(),
  };
}

function capturarError(fn: () => unknown): ErrorHttp {
  try {
    fn();
  } catch (err) {
    if (err instanceof ErrorHttp) return err;
    throw err;
  }
  throw new Error('se esperaba ErrorHttp');
}

describe('extraerLecturas (AC5)', () => {
  it('acepta un lote de 32 lecturas válidas y devuelve 32', () => {
    const lote = Array.from({ length: 32 }, (_, i) => lecturaValida(i));
    expect(extraerLecturas({ lecturas: lote })).toHaveLength(32);
  });

  it('rechaza un lote de 33 lecturas con status 422', () => {
    const lote = Array.from({ length: 33 }, (_, i) => lecturaValida(i));
    const err = capturarError(() => extraerLecturas({ lecturas: lote }));
    expect(err.status).toBe(422);
  });

  it('rechaza un lote vacío con status 400', () => {
    const err = capturarError(() => extraerLecturas({ lecturas: [] }));
    expect(err.status).toBe(400);
  });
});

describe('validarLectura (AC5)', () => {
  it('acepta medida_en a 23 h antes de ahora', () => {
    const raw = {
      tipo: 'temperatura',
      valor: 21.5,
      unidad: '°C',
      medida_en: new Date(AHORA - 23 * HORA_MS).toISOString(),
    };
    expect(() => validarLectura(raw, 0, AHORA)).not.toThrow();
  });

  it('rechaza medida_en a 25 h antes de ahora con status 422 y mensaje de 24 horas', () => {
    const raw = {
      tipo: 'temperatura',
      valor: 21.5,
      unidad: '°C',
      medida_en: new Date(AHORA - 25 * HORA_MS).toISOString(),
    };
    const err = capturarError(() => validarLectura(raw, 0, AHORA));
    expect(err.status).toBe(422);
    expect(err.message).toContain('24 horas');
  });

  it('rechaza unidad incorrecta para el tipo con status 422', () => {
    const raw = {
      tipo: 'temperatura',
      valor: 21.5,
      unidad: '% vol',
      medida_en: new Date(AHORA).toISOString(),
    };
    const err = capturarError(() => validarLectura(raw, 0, AHORA));
    expect(err.status).toBe(422);
  });
});
