import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import Cuenta from './Cuenta'
import { iniciarSesion, configurarProveedorAuth } from '../data/storeSesion'
import { AuthFalso } from '../tests/soporte/authFalso'

// D43 — El nombre de usuario se edita desde «Mi cuenta». Vive en la metadata
// de Auth (D32), así que la escritura NO es la del perfil (RPC) sino la del
// proveedor de auth. Estos tests comprueban el camino corto: la UI valida
// antes de tocar la red y avisa del resultado.

describe('edición del nombre de usuario (D43)', () => {
  it('el campo aparece con el nombre actual y se puede cambiar', async () => {
    const doble = new AuthFalso()
    doble.sembrar('pruebas@agrobits.test', 'secreta')
    configurarProveedorAuth(doble)
    await iniciarSesion('pruebas@agrobits.test', 'secreta')

    render(<Cuenta email="pruebas@agrobits.test" nombreUsuario="Joel" cultivos={2} sensores={1} alertasActivas={0} />)

    const campo = (await screen.findByTestId('nombre-usuario-cuenta')) as HTMLInputElement
    expect(campo.value).toBe('Joel')

    fireEvent.change(campo, { target: { value: 'Ana' } })
    fireEvent.click(screen.getByTestId('guardar-nombre'))

    await waitFor(() => expect(screen.getByTestId('nombre-guardado')).toBeTruthy())
    expect(screen.getByTestId('nombre-guardado').textContent).toMatch(/actualizado/i)
  })

  it('un nombre demasiado corto se rechaza en cliente, sin escribir', async () => {
    const doble = new AuthFalso()
    doble.sembrar('pruebas@agrobits.test', 'secreta')
    configurarProveedorAuth(doble)
    await iniciarSesion('pruebas@agrobits.test', 'secreta')

    render(<Cuenta email="pruebas@agrobits.test" nombreUsuario="Joel" cultivos={2} sensores={1} alertasActivas={0} />)

    const campo = (await screen.findByTestId('nombre-usuario-cuenta')) as HTMLInputElement
    fireEvent.change(campo, { target: { value: 'J' } })
    fireEvent.click(screen.getByTestId('guardar-nombre'))

    await waitFor(() => expect(screen.getByTestId('error-nombre')).toBeTruthy())
    expect(screen.getByTestId('error-nombre').textContent).toMatch(/2 y 30 caracteres/)
    expect(screen.queryByTestId('nombre-guardado')).toBeNull()
  })

  it('un nombre vacío quita el nombre y avisa de la consecuencia', async () => {
    const doble = new AuthFalso()
    doble.sembrar('pruebas@agrobits.test', 'secreta')
    configurarProveedorAuth(doble)
    await iniciarSesion('pruebas@agrobits.test', 'secreta')

    render(<Cuenta email="pruebas@agrobits.test" nombreUsuario="Joel" cultivos={2} sensores={1} alertasActivas={0} />)

    const campo = (await screen.findByTestId('nombre-usuario-cuenta')) as HTMLInputElement
    fireEvent.change(campo, { target: { value: '' } })
    fireEvent.click(screen.getByTestId('guardar-nombre'))

    await waitFor(() => expect(screen.getByTestId('nombre-guardado')).toBeTruthy())
    expect(screen.getByTestId('nombre-guardado').textContent).toMatch(/quitado/i)
  })
})
