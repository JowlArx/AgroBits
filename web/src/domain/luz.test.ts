import { describe, expect, it } from 'vitest';
import { dliEstimado } from './luz';

/** Genera n lecturas con el mismo valor en lux. */
const lecturas = (n: number, lux: number) => Array.from({ length: n }, () => ({ value: lux }));

describe('dliEstimado', () => {
  it('12 h a 20.000 lx dan un DLI cercano a 16,0 mol/m²/día', () => {
    // 12 h a una lectura cada 5 min = 144 lecturas
    expect(dliEstimado(lecturas(144, 20000))).toBeCloseTo(16.0, 0);
    expect(Math.abs(dliEstimado(lecturas(144, 20000)) - 16.0)).toBeLessThanOrEqual(0.1);
  });

  it('limita cada lectura a 65.535 lx', () => {
    const porEncimaDelLimite = dliEstimado(lecturas(144, 100000));
    const enElLimite = dliEstimado(lecturas(144, 65535));
    expect(porEncimaDelLimite).toBeCloseTo(enElLimite, 10);
  });

  it('sin luz da 0', () => {
    expect(dliEstimado(lecturas(144, 0))).toBe(0);
    expect(dliEstimado([])).toBe(0);
  });
});
