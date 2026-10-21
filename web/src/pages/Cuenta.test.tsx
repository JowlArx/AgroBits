import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import Cuenta from './Cuenta'
import { iniciarSesion, configurarProveedorAuth } from '../data/storeSesion'
import { AuthFalso } from '../tests/soporte/authFalso'
import { datosFalsosActual } from '../tests/soporte/configurarTests'

// D43 — El nombre de usuario se edita desde «Mi cuenta». Vive en la metadata
// de Auth (D32), así que la escritura NO es la del perfil (RPC) sino la del
// proveedor de auth.
// D46 — Eliminar mi cuenta: la interfaz de la petición (con 7 días de gracia)
// y la de la cancelación. El doble de datos responde como el servidor: exige
// que el email escrito coincida con el de la cuenta.

const props = {
  email: 'pruebas@agrobits.test',
  nombreUsuario: 'Joel',
  cultivos: [],
  sensores: [],
  alertasActivas: 0,
  onVerCultivo: () => {},
}

async function entrar(): Promise<void> {
  const doble = new AuthFalso()
  doble.sembrar('pruebas@agrobits.test', 'secreta')
  configurarProveedorAuth(doble)
  await iniciarSesion('pruebas@agrobits.test', 'secreta')
}

describe('edición del nombre de usuario (D43)', () => {
  it('el campo aparece con el nombre actual y se puede cambiar', async () => {
    await entrar()
    render(<Cuenta {...props} />)

    const campo = (await screen.findByTestId('nombre-usuario-cuenta')) as HTMLInputElement
    expect(campo.value).toBe('Joel')

    fireEvent.change(campo, { target: { value: 'Ana' } })
    fireEvent.click(screen.getByTestId('guardar-nombre'))

    await waitFor(() => expect(screen.getByTestId('nombre-guardado')).toBeTruthy())
    expect(screen.getByTestId('nombre-guardado').textContent).toMatch(/actualizado/i)
  })

  it('un nombre demasiado corto se rechaza en cliente, sin escribir', async () => {
    await entrar()
    render(<Cuenta {...props} />)

    const campo = (await screen.findByTestId('nombre-usuario-cuenta')) as HTMLInputElement
    fireEvent.change(campo, { target: { value: 'J' } })
    fireEvent.click(screen.getByTestId('guardar-nombre'))

    await waitFor(() => expect(screen.getByTestId('error-nombre')).toBeTruthy())
    expect(screen.getByTestId('error-nombre').textContent).toMatch(/2 y 30 caracteres/)
    expect(screen.queryByTestId('nombre-guardado')).toBeNull()
  })

  it('un nombre vacío quita el nombre y avisa de la consecuencia', async () => {
    await entrar()
    render(<Cuenta {...props} />)

    const campo = (await screen.findByTestId('nombre-usuario-cuenta')) as HTMLInputElement
    fireEvent.change(campo, { target: { value: '' } })
    fireEvent.click(screen.getByTestId('guardar-nombre'))

    await waitFor(() => expect(screen.getByTestId('nombre-guardado')).toBeTruthy())
    expect(screen.getByTestId('nombre-guardado').textContent).toMatch(/quitado/i)
  })
})

describe('eliminar mi cuenta (D46)', () => {
  it('el botón de eliminar pide la confirmación con el email', async () => {
    await entrar()
    render(<Cuenta {...props} />)

    await screen.findByTestId('eliminar-cuenta')
    fireEvent.click(screen.getByTestId('eliminar-cuenta'))

    // Aparece el texto de confirmación y el campo de email.
    expect(screen.getByTestId('confirmacion-eliminacion').textContent).toMatch(/no se puede deshacer/i)
    // El botón de confirmar empieza desactivado.
    expect((screen.getByTestId('confirmar-eliminacion') as HTMLButtonElement).disabled).toBe(true)

    // Con el email correcto se activa.
    fireEvent.change(screen.getByTestId('confirmacion-email'), {
      target: { value: 'pruebas@agrobits.test' },
    })
    await waitFor(() =>
      expect((screen.getByTestId('confirmar-eliminacion') as HTMLButtonElement).disabled).toBe(false),
    )
  })

  it('al confirmar se registra la solicitud y se muestra el aviso de gracia', async () => {
    await entrar()
    render(<Cuenta {...props} />)

    fireEvent.click(await screen.findByTestId('eliminar-cuenta'))
    fireEvent.change(screen.getByTestId('confirmacion-email'), {
      target: { value: 'pruebas@agrobits.test' },
    })
    fireEvent.click(screen.getByTestId('confirmar-eliminacion'))

    // Aparece el aviso con la fecha de borrado y el botón de cancelar.
    await waitFor(() => expect(screen.getByTestId('aviso-gracia')).toBeTruthy())
    expect(screen.getByTestId('aviso-gracia').textContent).toMatch(/se borrará/i)
    expect(datosFalsosActual().solicitud).not.toBeNull()
  })

  it('un email que no coincide se rechaza y no hay solicitud', async () => {
    await entrar()
    render(<Cuenta {...props} />)

    fireEvent.click(await screen.findByTestId('eliminar-cuenta'))
    fireEvent.change(screen.getByTestId('confirmacion-email'), { target: { value: 'otra@cuenta.test' } })

    // El botón sigue desactivado: no se puede confirmar con otro email.
    expect((screen.getByTestId('confirmar-eliminacion') as HTMLButtonElement).disabled).toBe(true)
    expect(datosFalsosActual().solicitud).toBeNull()
  })

  it('desde el aviso de gracia se puede cancelar el borrado', async () => {
    await entrar()
    const datos = datosFalsosActual()
    datos.solicitud = { programadaPara: new Date(Date.now() + 7 * 24 * 60 * 60_000).toISOString() }
    render(<Cuenta {...props} />)

    fireEvent.click(await screen.findByTestId('cancelar-eliminacion'))

    await waitFor(() => expect(screen.queryByTestId('aviso-gracia')).toBeNull())
    expect(datos.solicitud).toBeNull()
  })
})
