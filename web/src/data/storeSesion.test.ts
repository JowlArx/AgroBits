import { beforeEach, describe, expect, it } from 'vitest'
import {
  cerrarSesion,
  iniciarSesion,
  obtenerSesion,
  registrarse,
  suscribirSesion,
  configurarProveedorAuth,
  telefonoValido,
} from './storeSesion'
import type { DatosRegistro } from './storeSesion'
import type { PerfilRegistro, ProveedorAuth } from './sesion/proveedorAuth'
import { AuthFalso } from '../tests/soporte/authFalso'

// T-22: la store delega en el proveedor inyectado. El doble reproduce el
// contrato REAL (el registro rechaza duplicados y el login exige cuenta
// previa); la app real inyecta ProveedorSupabase en main.tsx.
// T-27 (D27, R-01 v3): AC4 y AC5 se validan AQUÍ, antes de tocar al
// proveedor — los tests con espía prueban que un registro inválido nunca
// llega al servidor.

let doble: AuthFalso

/** Registro válido con perfil completo (R-01 v3, D27). */
const registroValido: DatosRegistro = {
  email: 'nueva@ejemplo.com',
  clave: 'secreta1',
  confirmacion: 'secreta1',
  telefono: '+54 9 261 555-1234',
  localidadId: 4,
}

/** Doble de proveedor que cuenta las llamadas de registro y captura el perfil. */
function espiaDeRegistro(): { proveedor: ProveedorAuth; llamadas: () => number; ultimoPerfil: () => PerfilRegistro | null } {
  let registraciones = 0
  let perfil: PerfilRegistro | null = null
  const proveedor: ProveedorAuth = {
    sesionActual: () => null,
    suscribir: () => () => {},
    iniciarSesion: async () => {
      throw new Error('no debe llamarse en estos tests')
    },
    registrarse: async (_email, _clave, p) => {
      registraciones++
      perfil = p
      return { ok: true, valor: { usuario: { email: 'espia@ejemplo.com' } } }
    },
    cerrarSesion: async () => {},
  }
  return { proveedor, llamadas: () => registraciones, ultimoPerfil: () => perfil }
}

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
    const resultado = await registrarse(registroValido)

    expect(resultado.ok).toBe(true)
    expect(obtenerSesion()?.usuario.email).toBe('nueva@ejemplo.com')
  })

  it('registrarse con un email ya registrado se rechaza (R-01 AC2, contrato)', async () => {
    doble.sembrar('ocupada@ejemplo.com', 'secreta1')

    const resultado = await registrarse({ ...registroValido, email: 'ocupada@ejemplo.com', clave: 'otraClave1', confirmacion: 'otraClave1' })

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.errores[0].motivo).toMatch(/Ya existe una cuenta/)
    // La sesión no cambia: sigue sin abrirse.
    expect(obtenerSesion()).toBeNull()
  })

  it('registrarse también valida la longitud mínima de la contraseña (R-01 AC3)', async () => {
    const resultado = await registrarse({ ...registroValido, clave: 'corta', confirmacion: 'corta' })

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

describe('registro enriquecido (T-27, R-01 v3 / D27)', () => {
  it('AC4: la confirmación que no coincide se rechaza SIN tocar al proveedor', async () => {
    const espia = espiaDeRegistro()
    configurarProveedorAuth(espia.proveedor)

    const resultado = await registrarse({ ...registroValido, confirmacion: 'distinta1' })

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.errores.some((e) => e.campo === 'confirmacion')).toBe(true)
    expect(espia.llamadas()).toBe(0)
  })

  it('AC5: el teléfono vacío se rechaza sin tocar al proveedor', async () => {
    const espia = espiaDeRegistro()
    configurarProveedorAuth(espia.proveedor)

    const resultado = await registrarse({ ...registroValido, telefono: '   ' })

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) {
      const error = resultado.errores.find((e) => e.campo === 'telefono')
      expect(error?.motivo).toMatch(/obligatorio/)
    }
    expect(espia.llamadas()).toBe(0)
  })

  it('AC5: el teléfono con formato inválido se rechaza sin tocar al proveedor', async () => {
    const espia = espiaDeRegistro()
    configurarProveedorAuth(espia.proveedor)

    const resultado = await registrarse({ ...registroValido, telefono: '12' })

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) {
      const error = resultado.errores.find((e) => e.campo === 'telefono')
      expect(error?.motivo).toMatch(/entre 6 y 20 dígitos/)
    }
    expect(espia.llamadas()).toBe(0)
  })

  it('AC5: sin localidad seleccionada se rechaza sin tocar al proveedor', async () => {
    const espia = espiaDeRegistro()
    configurarProveedorAuth(espia.proveedor)

    const resultado = await registrarse({ ...registroValido, localidadId: 0 })

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.errores.some((e) => e.campo === 'localidad')).toBe(true)
    expect(espia.llamadas()).toBe(0)
  })

  it('el registro válido delega teléfono (recortado) y localidad en el proveedor', async () => {
    const espia = espiaDeRegistro()
    configurarProveedorAuth(espia.proveedor)

    const resultado = await registrarse({ ...registroValido, telefono: '  261 555 9876  ' })

    expect(resultado.ok).toBe(true)
    expect(espia.llamadas()).toBe(1)
    expect(espia.ultimoPerfil()).toEqual({ telefono: '261 555 9876', localidadId: 4 })
  })

  it('telefonoValido admite dígitos con + ( ) . - y espacios (6–20 dígitos)', () => {
    expect(telefonoValido('2614442002')).toBe(true)
    expect(telefonoValido('+54 9 261 555-1234')).toBe(true)
    expect(telefonoValido('(0261) 555.1234')).toBe(true)
    expect(telefonoValido('123456')).toBe(true) // mínimo exacto
    expect(telefonoValido('9'.repeat(20))).toBe(true) // máximo exacto
  })

  it('telefonoValido rechaza vacío, corto, largo y caracteres no admitidos', () => {
    expect(telefonoValido('')).toBe(false)
    expect(telefonoValido('12345')).toBe(false) // 5 dígitos
    expect(telefonoValido('9'.repeat(21))).toBe(false) // 21 dígitos
    expect(telefonoValido('abc123456')).toBe(false)
    expect(telefonoValido('261-555?')).toBe(false)
  })
})
