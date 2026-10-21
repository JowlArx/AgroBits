import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from './App'
import { reiniciarCultivos } from './data/storeCultivos'
import { iniciarSesion } from './data/storeSesion'

// T-16/T-22: la app está tras un gate de acceso; estos tests del flujo de
// cultivos empiezan ya con una sesión abierta (doble de auth inyectado en
// src/tests/soporte/configurarTests.ts).
// T-23: guardar/eliminar son asíncronos (ProveedorDatos), por eso los pasos
// esperan el resultado en la interfaz (findBy/waitFor).
beforeEach(async () => {
  reiniciarCultivos()
  await iniciarSesion('pruebas@agrobits.test', 'secreta')
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

async function crearCultivoRapido(nombre: string): Promise<void> {
  irANuevoCultivo()
  rellenarNombre(nombre)
  guardar()
  await screen.findByText(nombre)
}

describe('flujo de cultivos en la interfaz (T-13/T-23)', () => {
  it('empieza mostrando el estado vacío', async () => {
    render(<App />)
    expect(await screen.findByTestId('vacio')).toBeTruthy()
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

  it('R-04 AC1: crea un cultivo y aparece en la lista', async () => {
    render(<App />)
    await crearCultivoRapido('Tomates del balcón')

    expect(screen.getByTestId('lista-cultivos').textContent).toContain('Tomates del balcón')
  })

  it('R-05 AC2: rechaza umbrales inválidos con mensaje y no guarda', async () => {
    render(<App />)
    irANuevoCultivo()
    rellenarNombre('Cultivo inválido')

    // mínimo de temperatura (15) por encima del máximo (28) → inválido
    fireEvent.change(screen.getByTestId('min-temperatura'), { target: { value: '30' } })
    guardar()

    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/menor/))
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(await screen.findByTestId('vacio')).toBeTruthy()
  })

  it('R-04 AC2: edita el nombre de un cultivo y persiste', async () => {
    render(<App />)
    await crearCultivoRapido('Nombre original')

    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
    rellenarNombre('Nombre corregido')
    guardar()

    expect(await screen.findByText('Nombre corregido')).toBeTruthy()
    expect(screen.getByTestId('lista-cultivos').textContent).not.toContain('Nombre original')
  })

  it('R-04 AC3: elimina un cultivo', async () => {
    render(<App />)
    await crearCultivoRapido('Se va a borrar')

    // D35: «Eliminar» pide confirmación en línea antes de borrar.
    fireEvent.click(screen.getByText('Eliminar'))
    expect(screen.getByText('Se va a borrar')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Sí' }))

    expect(await screen.findByTestId('vacio')).toBeTruthy()
  })

  it('R-12 AC1: un umbral editado persiste al reabrir el formulario', async () => {
    render(<App />)
    await crearCultivoRapido('Con umbral propio')

    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
    fireEvent.change(screen.getByTestId('min-temperatura'), { target: { value: '20' } })
    guardar()
    // El formulario se cierra al guardar de forma asíncrona: se espera la lista.
    await screen.findByText('Con umbral propio')

    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
    expect((screen.getByTestId('min-temperatura') as HTMLInputElement).value).toBe('20')
  })

  it('permite crear un cultivo de tipo personalizado', async () => {
    render(<App />)
    irANuevoCultivo()

    fireEvent.change(screen.getByLabelText('Tipo de cultivo'), { target: { value: 'Personalizado' } })
    fireEvent.change(screen.getByLabelText('Nombre del tipo personalizado'), {
      target: { value: 'Calabacines' },
    })
    rellenarNombre('Calabacín 1')
    guardar()

    expect(await screen.findByText('Calabacines')).toBeTruthy()
  })
})

describe('navegación según el ancho de la ventana (D34)', () => {
  const anchoOriginal = window.innerWidth

  function fijarAncho(px: number): void {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: px })
  }

  afterEach(() => {
    fijarAncho(anchoOriginal)
  })

  it('en escritorio la navegación está en la cabecera y no hay barra inferior', () => {
    fijarAncho(1280)
    render(<App />)

    expect(screen.getByTestId('nav-cultivos')).toBeTruthy()
    expect(document.querySelector('.barra-inferior')).toBeNull()
  })

  it('en móvil la navegación baja a la barra inferior y el perfil va solo con icono', () => {
    fijarAncho(390)
    render(<App />)

    const barra = document.querySelector('.barra-inferior')
    expect(barra).toBeTruthy()
    expect(barra?.querySelector('[data-testid="nav-cultivos"]')).toBeTruthy()
    // En la cabecera no queda una navegación duplicada.
    expect(document.querySelector('.nav-superior')).toBeNull()

    // El perfil es solo el icono: nombre accesible «Mi cuenta» y sin texto visible.
    const perfil = screen.getByTestId('menu-usuario')
    expect(perfil.getAttribute('aria-label')).toBe('Mi cuenta')
    expect(perfil.textContent).toBe('')
    // El nombre sigue disponible para lectores de pantalla.
    expect(screen.getByTestId('sesion-usuario').textContent).toContain('pruebas')
  })
})

describe('desplegable de sensores del tablero (D36)', () => {
  it('abre, cambia de estado y permite elegir una opción', async () => {
    render(<App />)

    const boton = screen.getByTestId('sensor-selector-widget')
    expect(boton.getAttribute('aria-expanded')).toBe('false')
    expect(boton.getAttribute('aria-haspopup')).toBe('listbox')

    fireEvent.click(boton)

    // Abierto: el control lo comunica y la lista de opciones existe.
    expect(boton.getAttribute('aria-expanded')).toBe('true')
    const opciones = screen.getAllByRole('option')
    expect(opciones.length).toBeGreaterThan(0)

    fireEvent.click(opciones[0])

    expect(boton.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryAllByRole('option')).toHaveLength(0)
  })
})

describe('estado en la URL (D40)', () => {
  it('la navegación escribe la vista en la URL y el «atrás» restaura la anterior', async () => {
    render(<App />)
    await screen.findByTestId('vacio')

    fireEvent.click(screen.getByTestId('nav-alertas'))

    // La URL dice dónde está el usuario: la vista es enlazable.
    expect(window.location.search).toBe('?vista=alertas')
    expect(screen.getByTestId('rango-ciclo')).toBeTruthy()

    // Botón «atrás» del navegador: la URL manda y se vuelve al tablero.
    window.history.replaceState(null, '', '/app.html')
    window.dispatchEvent(new PopStateEvent('popstate'))

    await waitFor(() => expect(screen.getByTestId('vacio')).toBeTruthy())
    expect(screen.queryByTestId('rango-ciclo')).toBeNull()
  })
})
