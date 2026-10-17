import { beforeEach, describe, expect, it } from 'vitest'
import {
  cerrarSesion,
  iniciarSesion,
  obtenerSesion,
  registrarse,
  suscribirSesion,
  configurarProveedorAuth,
} from './storeSesion'
import { AuthFalso } from '../tests/soporte/authFalso'

// T-22: la store delega en el proveedor inyectado. El doble reproduce el
// contrato REAL (el registro rechaza duplicados y el login exige cuenta
// previa); la app real inyecta ProveedorSupabase en main.tsx.

let doble: AuthFalso

beforeEach(() => {
  doble = new AuthFalso()
  configurarProveedorAuth(doble)
})

describe('store de sesión (T-22, proveedor intercambiable)', () => {
  it('empieza sin sesión', () => {
    expect(obtenerSesion()).toBeNull()
  })

  it('iniciarSesion con cuenta válida crea la sesión', async () => {
    doble.sembrar('persona@ejemplo.com', 'secreta1')

    const resultado = await iniciarSesion('persona@ejemplo.com', 'secreta1')

    expect(resultado.ok).toBe(true)
    expect(obtenerSesion()?.usuario.email).toBe('persona@ejemplo.com')
  })

  it('recorta el email antes de validarlo y guardarlo', async () => {
    doble.sembrar('persona@ejemplo.com', 'secreta1')

    await iniciarSesion('  persona@ejemplo.com  ', 'secreta1')

    expect(obtenerSesion()?.usuario.email).toBe('persona@ejemplo.com')
  })

  it('rechaza un email con formato inválido sin tocar al proveedor', async () => {
    const resultado = await iniciarSesion('no-es-email', 'secreta1')

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.errores[0].motivo).toMatch(/email válido/)
    expect(obtenerSesion()).toBeNull()
  })

  it('rechaza la clave vacía', async () => {
    const resultado = await iniciarSesion('persona@ejemplo.com', '')

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.errores[0].motivo).toMatch(/obligatoria/)
  })

  it('rechaza una clave corta e indica el mínimo (R-01 AC3)', async () => {
    const resultado = await iniciarSesion('persona@ejemplo.com', '12345')

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.errores[0].motivo).toMatch(/al menos 6 caracteres/)
  })

  it('login con credenciales no registradas devuelve el error del proveedor', async () => {
    const resultado = await iniciarSesion('desconocida@ejemplo.com', 'secreta1')

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.errores[0].motivo).toMatch(/incorrectos/)
    expect(obtenerSesion()).toBeNull()
  })

  it('registrarse con un email libre crea la cuenta y abre sesión (R-01 AC1, contrato)', async () => {
    const resultado = await registrarse('nueva@ejemplo.com', 'secreta1')

    expect(resultado.ok).toBe(true)
    expect(obtenerSesion()?.usuario.email).toBe('nueva@ejemplo.com')
  })

  it('registrarse con un email ya registrado se rechaza (R-01 AC2, contrato)', async () => {
    doble.sembrar('ocupada@ejemplo.com', 'secreta1')

    const resultado = await registrarse('ocupada@ejemplo.com', 'otraClave1')

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.errores[0].motivo).toMatch(/Ya existe una cuenta/)
    // La sesión no cambia: sigue sin abrirse.
    expect(obtenerSesion()).toBeNull()
  })

  it('registrarse también valida la longitud mínima de la contraseña (R-01 AC3)', async () => {
    const resultado = await registrarse('nueva@ejemplo.com', 'corta')

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.errores[0].motivo).toMatch(/al menos 6 caracteres/)
  })

  it('cerrarSesion vuelve al estado sin sesión (R-03 AC1)', async () => {
    doble.sembrar('persona@ejemplo.com', 'secreta1')
    await iniciarSesion('persona@ejemplo.com', 'secreta1')

    await cerrarSesion()

    expect(obtenerSesion()).toBeNull()
  })

  it('los oyentes se notifican al cambiar la sesión', async () => {
    let avisos = 0
    const unsubscribe = suscribirSesion(() => avisos++)
    doble.sembrar('persona@ejemplo.com', 'secreta1')

    await iniciarSesion('persona@ejemplo.com', 'secreta1')
    await cerrarSesion()
    unsubscribe()

    expect(avisos).toBe(2)
  })
})
