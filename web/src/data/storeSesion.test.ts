import { beforeEach, describe, expect, it } from 'vitest'
import {
  cerrarSesion,
  iniciarSesion,
  obtenerSesion,
  reiniciarSesion,
  registrarse,
  suscribirSesion,
} from './storeSesion'

beforeEach(() => reiniciarSesion())

describe('store de sesión simulada (T-16, D6/D8 — provisional)', () => {
  it('empieza sin sesión', () => {
    expect(obtenerSesion()).toBeNull()
  })

  it('iniciarSesion con email y clave válidos crea la sesión simulada', () => {
    const resultado = iniciarSesion('persona@ejemplo.com', 'secreta')

    expect(resultado.ok).toBe(true)
    expect(obtenerSesion()?.usuario.email).toBe('persona@ejemplo.com')
  })

  it('recorta el email antes de guardarlo', () => {
    iniciarSesion('  persona@ejemplo.com  ', 'secreta')

    expect(obtenerSesion()?.usuario.email).toBe('persona@ejemplo.com')
  })

  it('rechaza un email con formato inválido', () => {
    const resultado = iniciarSesion('no-es-email', 'secreta')

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.errores[0].motivo).toMatch(/email válido/)
    expect(obtenerSesion()).toBeNull()
  })

  it('rechaza la clave vacía', () => {
    const resultado = iniciarSesion('persona@ejemplo.com', '')

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.errores[0].motivo).toMatch(/obligatoria/)
    expect(obtenerSesion()).toBeNull()
  })

  it('registrarse es una maqueta equivalente (no valida duplicados)', () => {
    // Declarado en T-16: la duplicidad de emails NO se comprueba en Fase 1.
    expect(registrarse('a@ejemplo.com', 'secreta').ok).toBe(true)
    expect(obtenerSesion()?.usuario.email).toBe('a@ejemplo.com')
  })

  it('cerrarSesion vuelve al estado sin sesión', () => {
    iniciarSesion('persona@ejemplo.com', 'secreta')

    cerrarSesion()

    expect(obtenerSesion()).toBeNull()
  })

  it('los oyentes se notifican al cambiar la sesión', () => {
    let avisos = 0
    const unsubscribe = suscribirSesion(() => avisos++)

    iniciarSesion('persona@ejemplo.com', 'secreta')
    cerrarSesion()
    unsubscribe()

    expect(avisos).toBe(2)
  })
})
