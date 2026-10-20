import { describe, expect, it } from 'vitest'
import type { AuthError, SupabaseClient } from '@supabase/supabase-js'
import { ProveedorSupabase, mensajeAuth } from './proveedorSupabase'

// T-22 — Tests del proveedor real con el cliente supabase DOBLADO: cubren el
// contrato de respuestas de GoTrue verificado en E2E (signup con sesión,
// signup con confirmación de email y signup duplicado OFUSCADO con
// `identities: []` que da el mensaje de R-01 AC2).

interface Respuesta {
  data: {
    user: { email: string; identities: unknown[]; user_metadata?: Record<string, unknown> } | null
    session: unknown
  }
  error: AuthError | null
}

/** Perfil del registro (D27): teléfono y localidad de la fila del catálogo. */
const PERFIL_PRUEBA = { telefono: '+54 9 261 555-1234', localidadId: 7 }

function clienteFalso(respuesta: Respuesta, alRegistrarse?: (argumentos: Record<string, unknown>) => void): SupabaseClient {
  return {
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signUp: async (argumentos: Record<string, unknown>) => {
        alRegistrarse?.(argumentos)
        return respuesta
      },
      signInWithPassword: async () => respuesta,
      signOut: async () => ({ error: null }),
    },
  } as unknown as SupabaseClient
}

function errorAuth(mensaje: string, codigo?: string): AuthError {
  return { message: mensaje, code: codigo, status: 400 } as AuthError
}

describe('ProveedorSupabase.registrarse', () => {
  it('con sesión devuelta, crea la cuenta e inicia sesión (R-01 AC1)', async () => {
    const p = new ProveedorSupabase(
      clienteFalso({
        data: {
          user: { email: 'nueva@example.com', identities: [{ provider: 'email' }] },
          session: { access_token: 'tok' },
        },
        error: null,
      }),
    )

    const resultado = await p.registrarse('nueva@example.com', 'secreta1', PERFIL_PRUEBA)

    expect(resultado.ok).toBe(true)
    if (resultado.ok) expect(resultado.valor.usuario.email).toBe('nueva@example.com')
  })

  it('envía teléfono y localidad como metadata del signup (D27, AC6)', async () => {
    let argumentos: Record<string, unknown> | undefined
    const p = new ProveedorSupabase(
      clienteFalso(
        {
          data: {
            user: { email: 'nueva@example.com', identities: [{ provider: 'email' }] },
            session: { access_token: 'tok' },
          },
          error: null,
        },
        (a) => {
          argumentos = a
        },
      ),
    )

    await p.registrarse('nueva@example.com', 'secreta1', PERFIL_PRUEBA)

    // El trigger de la BD (crear_perfil_de_usuario) lee exactamente esta metadata.
    expect(argumentos).toEqual({
      email: 'nueva@example.com',
      password: 'secreta1',
      options: { data: { telefono: PERFIL_PRUEBA.telefono, localidad_id: PERFIL_PRUEBA.localidadId } },
    })
  })

  it('D32: con nombre de usuario lo añade a la metadata del signup', async () => {
    let argumentos: Record<string, unknown> | undefined
    const p = new ProveedorSupabase(
      clienteFalso(
        {
          data: {
            user: { email: 'nueva@example.com', identities: [{ provider: 'email' }] },
            session: { access_token: 'tok' },
          },
          error: null,
        },
        (a) => {
          argumentos = a
        },
      ),
    )

    await p.registrarse('nueva@example.com', 'secreta1', { ...PERFIL_PRUEBA, nombreUsuario: 'Joel' })

    const metadata = (argumentos?.options as { data: Record<string, unknown> }).data
    expect(metadata.nombre_usuario).toBe('Joel')
  })

  it('D32: la sesión devuelta por el signup recoge el nombre de la metadata', async () => {
    const p = new ProveedorSupabase(
      clienteFalso({
        data: {
          user: {
            email: 'nueva@example.com',
            identities: [{ provider: 'email' }],
            user_metadata: { nombre_usuario: ' Joel ' },
          },
          session: { access_token: 'tok' },
        },
        error: null,
      }),
    )

    const resultado = await p.registrarse('nueva@example.com', 'secreta1', PERFIL_PRUEBA)

    expect(resultado.ok).toBe(true)
    if (resultado.ok) expect(resultado.valor.usuario.nombreUsuario).toBe('Joel')
  })

  it('sin sesión e identidades presentes, informa la confirmación de email', async () => {
    const p = new ProveedorSupabase(
      clienteFalso({
        data: {
          user: { email: 'nueva@example.com', identities: [{ provider: 'email' }] },
          session: null,
        },
        error: null,
      }),
    )

    const resultado = await p.registrarse('nueva@example.com', 'secreta1', PERFIL_PRUEBA)

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.errores[0].motivo).toMatch(/revisa tu correo/)
  })

  it('la respuesta OFUSCADA de duplicado (identidades vacías) muestra el error de R-01 AC2', async () => {
    const p = new ProveedorSupabase(
      clienteFalso({
        data: { user: { email: 'ocupada@example.com', identities: [] }, session: null },
        error: null,
      }),
    )

    const resultado = await p.registrarse('ocupada@example.com', 'secreta1', PERFIL_PRUEBA)

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.errores[0].motivo).toBe('Ya existe una cuenta con ese email.')
  })

  it('traduce el error del servidor de registro débil (R-01 AC3)', async () => {
    const p = new ProveedorSupabase(
      clienteFalso({
        data: { user: null, session: null },
        error: errorAuth('Password should be at least 6 characters.', 'weak_password'),
      }),
    )

    const resultado = await p.registrarse('nueva@example.com', 'corta', PERFIL_PRUEBA)

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.errores[0].motivo).toMatch(/al menos 6 caracteres/)
  })
})

describe('ProveedorSupabase.iniciarSesion', () => {
  it('con credenciales correctas abre sesión', async () => {
    const p = new ProveedorSupabase(
      clienteFalso({
        data: {
          user: { email: 'persona@example.com', identities: [{ provider: 'email' }] },
          session: { access_token: 'tok' },
        },
        error: null,
      }),
    )

    const resultado = await p.iniciarSesion('persona@example.com', 'secreta1')

    expect(resultado.ok).toBe(true)
    if (resultado.ok) expect(resultado.valor.usuario.email).toBe('persona@example.com')
  })

  it('D32: el login recoge el nombre de usuario de la metadata', async () => {
    const p = new ProveedorSupabase(
      clienteFalso({
        data: {
          user: {
            email: 'persona@example.com',
            identities: [{ provider: 'email' }],
            user_metadata: { nombre_usuario: 'Pepe' },
          },
          session: { access_token: 'tok' },
        },
        error: null,
      }),
    )

    const resultado = await p.iniciarSesion('persona@example.com', 'secreta1')

    expect(resultado.ok).toBe(true)
    if (resultado.ok) expect(resultado.valor.usuario.nombreUsuario).toBe('Pepe')
  })

  it('traduce las credenciales incorrectas del servidor', async () => {
    const p = new ProveedorSupabase(
      clienteFalso({
        data: { user: null, session: null },
        error: errorAuth('Invalid login credentials', 'invalid_credentials'),
      }),
    )

    const resultado = await p.iniciarSesion('persona@example.com', 'mal')

    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.errores[0].motivo).toBe('Email o contraseña incorrectos.')
  })
})

describe('mensajeAuth', () => {
  it('cubre los errores habituales de GoTrue', () => {
    expect(mensajeAuth(errorAuth('User already registered', 'user_already_exists'))).toMatch(/Ya existe una cuenta/)
    expect(mensajeAuth(errorAuth('Invalid login credentials'))).toMatch(/incorrectos/)
    expect(mensajeAuth(errorAuth('Email not confirmed'))).toMatch(/Confirma tu email/)
    expect(mensajeAuth(errorAuth('algo no previsto'))).toBe('algo no previsto')
  })
})
