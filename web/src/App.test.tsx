import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import App from './App'
import { reiniciarCultivos } from './data/storeCultivos'
import { iniciarSesion, reiniciarSesion } from './data/storeSesion'

// T-16: la app está tras un gate de acceso provisional; estos tests del
// flujo de cultivos empiezan ya con una sesión simulada.
beforeEach(() => {
  reiniciarCultivos()
  reiniciarSesion()
  iniciarSesion('pruebas@agrobits.test', 'secreta')
})

function irANuevoCultivo(): void {
  fireEvent.click(screen.getByRole('button', { name: 'Nuevo cultivo' }))
}

function rellenarNombre(nombre: string): void {
  fireEvent.change(screen.getByPlaceholderText('Ej.: Tomates del balcón'), {
    target: { value: nombre },
  })
}

function guardar(): void {
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
}

function crearCultivoRapido(nombre: string): void {
  irANuevoCultivo()
  rellenarNombre(nombre)
  guardar()
}

describe('flujo de cultivos en la interfaz (T-13)', () => {
  it('empieza mostrando el estado vacío', () => {
    render(<App />)
    expect(screen.getByTestId('vacio')).toBeTruthy()
  })

  it('R-11 AC1: al elegir un tipo del catálogo se precargan sus umbrales', () => {
    render(<App />)
    irANuevoCultivo()

    const select = screen.getByLabelText('Tipo de cultivo') as HTMLSelectElement
    expect(select.value).toBe('Tomate')

    expect((screen.getByTestId('min-temperatura') as HTMLInputElement).value).toBe('15')
    expect((screen.getByTestId('max-temperatura') as HTMLInputElement).value).toBe('28')
    expect((screen.getByTestId('max-luminosidad') as HTMLInputElement).value).toBe('50000')
  })

  it('R-11 AC1: cambiar de tipo en el formulario reemplaza los umbrales', () => {
    render(<App />)
    irANuevoCultivo()

    fireEvent.change(screen.getByLabelText('Tipo de cultivo'), { target: { value: 'Lechuga' } })

    expect((screen.getByTestId('min-temperatura') as HTMLInputElement).value).toBe('10')
  })

  it('R-11 AC2: el formulario avisa de que el catálogo es orientativo', () => {
    render(<App />)
    irANuevoCultivo()

    expect(screen.getByTestId('aviso-catalogo').textContent).toMatch(/orientativa/)
  })

  it('R-04 AC1: crea un cultivo y aparece en la lista', () => {
    render(<App />)
    crearCultivoRapido('Tomates del balcón')

    expect(screen.getByTestId('lista-cultivos').textContent).toContain('Tomates del balcón')
  })

  it('R-05 AC2: rechaza umbrales inválidos con mensaje y no guarda', () => {
    render(<App />)
    irANuevoCultivo()
    rellenarNombre('Cultivo inválido')

    // mínimo de temperatura (15) por encima del máximo (28) → inválido
    fireEvent.change(screen.getByTestId('min-temperatura'), { target: { value: '30' } })
    guardar()

    expect(screen.getByRole('alert').textContent).toMatch(/menor/)
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.getByTestId('vacio')).toBeTruthy()
  })

  it('R-04 AC2: edita el nombre de un cultivo y persiste', () => {
    render(<App />)
    crearCultivoRapido('Nombre original')

    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
    rellenarNombre('Nombre corregido')
    guardar()

    expect(screen.getByTestId('lista-cultivos').textContent).toContain('Nombre corregido')
    expect(screen.getByTestId('lista-cultivos').textContent).not.toContain('Nombre original')
  })

  it('R-04 AC3: elimina un cultivo', () => {
    render(<App />)
    crearCultivoRapido('Se va a borrar')

    fireEvent.click(screen.getByText('Eliminar'))

    expect(screen.getByTestId('vacio')).toBeTruthy()
  })

  it('R-12 AC1: un umbral editado persiste al reabrir el formulario', () => {
    render(<App />)
    crearCultivoRapido('Con umbral propio')

    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
    fireEvent.change(screen.getByTestId('min-temperatura'), { target: { value: '20' } })
    guardar()

    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
    expect((screen.getByTestId('min-temperatura') as HTMLInputElement).value).toBe('20')
  })

  it('permite crear un cultivo de tipo personalizado', () => {
    render(<App />)
    irANuevoCultivo()

    fireEvent.change(screen.getByLabelText('Tipo de cultivo'), { target: { value: 'Personalizado' } })
    fireEvent.change(screen.getByLabelText('Nombre del tipo personalizado'), {
      target: { value: 'Calabacines' },
    })
    rellenarNombre('Calabacín 1')
    guardar()

    expect(screen.getByTestId('lista-cultivos').textContent).toContain('Calabacines')
  })
})
