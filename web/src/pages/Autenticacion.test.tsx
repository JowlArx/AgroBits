import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import App from '../App'
import { reiniciarCultivos } from '../data/storeCultivos'
import { authFalsoActual } from '../tests/soporte/configurarTests'

// T-22 — Acceso con autenticación REAL (D8): la pantalla usa la store que
// delega en el proveedor; los tests corren con el doble en memoria que
// reproduce el contrato de Supabase Auth (duplicados rechazados, login con
// cuenta previa). El E2E contra el servidor real se verifica en navegador.

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
    expect(screen.getByTestId('sesion-usuario').textContent).toBe('persona@ejemplo.com')
    expect(screen.getByTestId('nav-alertas')).toBeTruthy()
  })

  it('registro de cuenta nueva entra en la aplicación (R-01 AC1)', async () => {
    render(<App />)

    fireEvent.click(screen.getByTestId('cambiar-modo'))
    expect(screen.getByRole('heading', { name: 'Crear cuenta' })).toBeTruthy()

    enviarAcceso('nueva@ejemplo.com', 'secreta1')

    expect(await screen.findByText('Mis cultivos')).toBeTruthy()
    expect(screen.getByTestId('sesion-usuario').textContent).toBe('nueva@ejemplo.com')
  })

  it('registro con email ya registrado muestra el error (R-01 AC2)', async () => {
    render(<App />)

    fireEvent.click(screen.getByTestId('cambiar-modo'))
    enviarAcceso('persona@ejemplo.com', 'secreta1')

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
