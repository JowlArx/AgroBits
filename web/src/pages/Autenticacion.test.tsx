import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import App from '../App'
import { reiniciarSesion } from '../data/storeSesion'
import { reiniciarCultivos } from '../data/storeCultivos'

beforeEach(() => {
  reiniciarSesion()
  reiniciarCultivos()
})

function iniciarSesion(email: string, clave: string): void {
  fireEvent.change(screen.getByTestId('email'), { target: { value: email } })
  fireEvent.change(screen.getByTestId('clave'), { target: { value: clave } })
  fireEvent.click(screen.getByTestId('enviar-acceso'))
}

describe('acceso provisional (T-16, D6/D8)', () => {
  it('sin sesión muestra la pantalla de acceso y oculta el contenido de la app', () => {
    render(<App />)

    expect(screen.getByTestId('pantalla-acceso')).toBeTruthy()
    expect(screen.queryByText('Mis cultivos')).toBeNull()
    expect(screen.queryByTestId('nav-alertas')).toBeNull()
    expect(screen.queryByTestId('cerrar-sesion')).toBeNull()
  })

  it('el aviso declara que NO es autenticación real y remite a la Fase 2', () => {
    render(<App />)

    const aviso = screen.getByTestId('aviso-provisional').textContent ?? ''
    expect(aviso).toMatch(/no valida credenciales/)
    expect(aviso).toMatch(/ni crea cuentas reales/)
    expect(aviso).toMatch(/Fase 2/)
    expect(aviso).toMatch(/provisional/)
  })

  it('flujo de inicio de sesión maquetado entra en la aplicación', () => {
    render(<App />)

    iniciarSesion('persona@ejemplo.com', 'secreta')

    expect(screen.getByText('Mis cultivos')).toBeTruthy()
    expect(screen.getByTestId('sesion-usuario').textContent).toBe('persona@ejemplo.com')
    expect(screen.getByTestId('nav-alertas')).toBeTruthy()
  })

  it('flujo de registro maquetado entra en la aplicación', () => {
    render(<App />)

    fireEvent.click(screen.getByTestId('cambiar-modo'))
    expect(screen.getByRole('heading', { name: 'Crear cuenta' })).toBeTruthy()

    iniciarSesion('nueva@ejemplo.com', 'secreta')

    expect(screen.getByText('Mis cultivos')).toBeTruthy()
    expect(screen.getByTestId('sesion-usuario').textContent).toBe('nueva@ejemplo.com')
  })

  it('valida el formato del email y que la clave no esté vacía', () => {
    render(<App />)

    iniciarSesion('no-es-email', '')

    expect(screen.getByTestId('error-acceso').textContent).toMatch(/email válido/)
    expect(screen.getByTestId('error-acceso').textContent).toMatch(/obligatoria/)
    expect(screen.queryByText('Mis cultivos')).toBeNull()
  })

  it('cerrar sesión vuelve al acceso provisional', () => {
    render(<App />)
    iniciarSesion('persona@ejemplo.com', 'secreta')

    fireEvent.click(screen.getByTestId('cerrar-sesion'))

    expect(screen.getByTestId('pantalla-acceso')).toBeTruthy()
    expect(screen.queryByText('Mis cultivos')).toBeNull()
    expect(screen.queryByTestId('sesion-usuario')).toBeNull()
  })

  it('cambiar de modo limpia el error mostrado', () => {
    render(<App />)
    iniciarSesion('no-es-email', '')
    expect(screen.getByTestId('error-acceso')).toBeTruthy()

    fireEvent.click(screen.getByTestId('cambiar-modo'))

    expect(screen.queryByTestId('error-acceso')).toBeNull()
  })
})
