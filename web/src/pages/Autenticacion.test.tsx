import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import App from '../App'
import { reiniciarCultivos } from '../data/storeCultivos'
import { authFalsoActual } from '../tests/soporte/configurarTests'

// T-22 — Acceso con autenticación REAL (D8): la pantalla usa la store que
// delega en el proveedor; los tests corren con el doble en memoria que
// reproduce el contrato de Supabase Auth (duplicados rechazados, login con
// cuenta previa). El E2E contra el servidor real se verifica en navegador.
// T-27 (D27, R-01 v3): el registro añade confirmación, teléfono y localidad
// (cascada provincia→localidad desde el catálogo del doble de datos).

beforeEach(() => {
  reiniciarCultivos()
  // Cuenta ya registrada para el flujo de inicio de sesión.
  authFalsoActual().sembrar('persona@ejemplo.com', 'secreta1')
})

function enviarAcceso(email: string, clave: string): void {
  fireEvent.change(screen.getByTestId('email'), { target: { value: email } })
  fireEvent.change(screen.getByTestId('clave'), { target: { value: clave } })
  fireEvent.click(screen.getByTestId('enviar-acceso'))
}

async function enviarRegistro(datos: {
  email: string
  clave: string
  confirmacion?: string
  telefono?: string
  provincia?: string
  localidad?: string
}): Promise<void> {
  fireEvent.click(screen.getByTestId('cambiar-modo'))
  // El catálogo llega asíncrono (DatosFalsos): espera antes de elegir.
  await screen.findByRole('option', { name: 'Santa Fe' })
  fireEvent.change(screen.getByTestId('email'), { target: { value: datos.email } })
  fireEvent.change(screen.getByTestId('clave'), { target: { value: datos.clave } })
  fireEvent.change(screen.getByTestId('confirmar-clave'), {
    target: { value: datos.confirmacion ?? datos.clave },
  })
  fireEvent.change(screen.getByTestId('telefono'), {
    target: { value: datos.telefono ?? '+54 9 261 555-1234' },
  })
  // Por defecto: Santa Fe (id 4 → Rosario en el catálogo del doble).
  fireEvent.change(screen.getByTestId('provincia'), { target: { value: datos.provincia ?? 'Santa Fe' } })
  fireEvent.change(screen.getByTestId('localidad'), { target: { value: datos.localidad ?? '4' } })
  fireEvent.click(screen.getByTestId('enviar-acceso'))
}

function opcionesDeLocalidad(): string[] {
  return [...(screen.getByTestId('localidad') as HTMLSelectElement).options].map((o) => o.textContent ?? '')
}

describe('acceso real (T-22, Supabase Auth vía doble de contrato)', () => {
  it('sin sesión muestra la pantalla de acceso y oculta el contenido de la app', () => {
    render(<App />)

    expect(screen.getByTestId('pantalla-acceso')).toBeTruthy()
    expect(screen.queryByText('Mis cultivos')).toBeNull()
    expect(screen.queryByTestId('nav-alertas')).toBeNull()
    expect(screen.queryByTestId('cerrar-sesion')).toBeNull()
  })

  it('documenta la regla de contraseña en pantalla (R-01 AC3)', () => {
    render(<App />)

    expect(screen.getByTestId('reglas-clave').textContent).toMatch(/Mínimo 6 caracteres/)
  })

  it('inicio de sesión con cuenta existente entra en la aplicación', async () => {
    render(<App />)

    enviarAcceso('persona@ejemplo.com', 'secreta1')

    expect(await screen.findByText('Mis cultivos')).toBeTruthy()
    // D32: sin nombre de usuario se muestra el email antes de la «@».
    expect(screen.getByTestId('sesion-usuario').textContent).toBe('persona')
    expect(screen.getByTestId('nav-alertas')).toBeTruthy()
  })

  it('registro de cuenta nueva entra en la aplicación (R-01 AC1)', async () => {
    render(<App />)

    await enviarRegistro({ email: 'nueva@ejemplo.com', clave: 'secreta1' })

    expect(await screen.findByText('Mis cultivos')).toBeTruthy()
    // D32: sin nombre de usuario se muestra el email antes de la «@».
    expect(screen.getByTestId('sesion-usuario').textContent).toBe('nueva')
  })

  it('registro con email ya registrado muestra el error (R-01 AC2)', async () => {
    render(<App />)

    await enviarRegistro({ email: 'persona@ejemplo.com', clave: 'secreta1' })

    const error = await screen.findByTestId('error-acceso')
    expect(error.textContent).toMatch(/Ya existe una cuenta/)
    expect(screen.queryByText('Mis cultivos')).toBeNull()
  })

  it('clave por debajo del mínimo se rechaza con el motivo (R-01 AC3)', async () => {
    render(<App />)

    enviarAcceso('persona@ejemplo.com', '12345')

    const error = await screen.findByTestId('error-acceso')
    expect(error.textContent).toMatch(/al menos 6 caracteres/)
    expect(screen.queryByText('Mis cultivos')).toBeNull()
  })

  it('valida el formato del email y que la clave no esté vacía', async () => {
    render(<App />)

    enviarAcceso('no-es-email', '')

    const error = await screen.findByTestId('error-acceso')
    expect(error.textContent).toMatch(/email válido/)
    expect(error.textContent).toMatch(/obligatoria/)
    expect(screen.queryByText('Mis cultivos')).toBeNull()
  })

  it('tras cerrar sesión, las rutas protegidas vuelven a exigir acceso (R-03 AC1)', async () => {
    render(<App />)
    enviarAcceso('persona@ejemplo.com', 'secreta1')
    await screen.findByText('Mis cultivos')

    fireEvent.click(screen.getByTestId('cerrar-sesion'))

    expect(await screen.findByTestId('pantalla-acceso')).toBeTruthy()
    expect(screen.queryByText('Mis cultivos')).toBeNull()
    expect(screen.queryByTestId('sesion-usuario')).toBeNull()
  })

  it('cambiar de modo limpia el error mostrado', async () => {
    render(<App />)
    enviarAcceso('no-es-email', '')
    expect(await screen.findByTestId('error-acceso')).toBeTruthy()

    fireEvent.click(screen.getByTestId('cambiar-modo'))

    expect(screen.queryByTestId('error-acceso')).toBeNull()
  })
})

describe('registro enriquecido (T-27, R-01 v3 / D27)', () => {
  it('el modo registro muestra confirmación, teléfono y localidad (D27)', () => {
    render(<App />)

    fireEvent.click(screen.getByTestId('cambiar-modo'))

    expect(screen.getByTestId('confirmar-clave')).toBeTruthy()
    expect(screen.getByTestId('telefono')).toBeTruthy()
    expect(screen.getByTestId('provincia')).toBeTruthy()
    expect(screen.getByTestId('localidad')).toBeTruthy()
  })

  it('la localidad empieza deshabilitada hasta elegir provincia', () => {
    render(<App />)

    fireEvent.click(screen.getByTestId('cambiar-modo'))

    expect((screen.getByTestId('localidad') as HTMLSelectElement).disabled).toBe(true)
  })

  it('la cascada provincia→localidad filtra las opciones del catálogo', async () => {
    render(<App />)

    fireEvent.click(screen.getByTestId('cambiar-modo'))
    await screen.findByRole('option', { name: 'Buenos Aires' }) // catálogo cargado
    fireEvent.change(screen.getByTestId('provincia'), { target: { value: 'Buenos Aires' } })

    expect(opcionesDeLocalidad()).toContain('La Plata')
    expect(opcionesDeLocalidad()).toContain('Mar del Plata')
    expect(opcionesDeLocalidad()).not.toContain('Córdoba')

    fireEvent.change(screen.getByTestId('provincia'), { target: { value: 'Córdoba' } })

    expect(opcionesDeLocalidad()).toContain('Córdoba')
    expect(opcionesDeLocalidad()).not.toContain('La Plata')
  })

  it('cambiar de provincia resetea la localidad elegida', async () => {
    render(<App />)

    fireEvent.click(screen.getByTestId('cambiar-modo'))
    await screen.findByRole('option', { name: 'Santa Fe' }) // catálogo cargado
    fireEvent.change(screen.getByTestId('provincia'), { target: { value: 'Santa Fe' } })
    fireEvent.change(screen.getByTestId('localidad'), { target: { value: '4' } })

    fireEvent.change(screen.getByTestId('provincia'), { target: { value: 'Buenos Aires' } })

    expect((screen.getByTestId('localidad') as HTMLSelectElement).value).toBe('')
  })

  it('AC4: la confirmación que no coincide se rechaza en pantalla sin entrar', async () => {
    render(<App />)

    await enviarRegistro({ email: 'nueva@ejemplo.com', clave: 'secreta1', confirmacion: 'distinta1' })

    const error = await screen.findByTestId('error-acceso')
    expect(error.textContent).toMatch(/Las contraseñas no coinciden/)
    expect(screen.queryByText('Mis cultivos')).toBeNull()
  })

  it('AC5: el teléfono vacío se rechaza indicando el campo', async () => {
    render(<App />)

    await enviarRegistro({ email: 'nueva@ejemplo.com', clave: 'secreta1', telefono: '' })

    const error = await screen.findByTestId('error-acceso')
    expect(error.textContent).toMatch(/El teléfono es obligatorio/)
    expect(screen.queryByText('Mis cultivos')).toBeNull()
  })

  it('AC5: el teléfono con menos de 6 dígitos se rechaza indicando el formato', async () => {
    render(<App />)

    await enviarRegistro({ email: 'nueva@ejemplo.com', clave: 'secreta1', telefono: '123' })

    const error = await screen.findByTestId('error-acceso')
    expect(error.textContent).toMatch(/entre 6 y 20 dígitos/)
    expect(screen.queryByText('Mis cultivos')).toBeNull()
  })

  it('AC5: sin localidad seleccionada se rechaza indicando la selección', async () => {
    render(<App />)

    await enviarRegistro({ email: 'nueva@ejemplo.com', clave: 'secreta1', localidad: '' })

    const error = await screen.findByTestId('error-acceso')
    expect(error.textContent).toMatch(/Selecciona una provincia y una localidad/)
    expect(screen.queryByText('Mis cultivos')).toBeNull()
  })
})
