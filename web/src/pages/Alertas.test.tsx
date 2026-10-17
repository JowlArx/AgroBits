import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import App from '../App'
import { reiniciarCultivos } from '../data/storeCultivos'
import { reiniciarSensores } from '../data/storeSensores'
import { reiniciarMediciones } from '../data/medicionesSimuladas'
import { reiniciarAlertas } from '../data/storeAlertas'
import { iniciarSesion } from '../data/storeSesion'
import { TIPOS_MEDICION } from '../domain/tipos'

beforeEach(async () => {
  await iniciarSesion('pruebas@agrobits.test', 'secreta')
  reiniciarCultivos()
  reiniciarSensores()
  reiniciarMediciones()
  reiniciarAlertas()
})

function abrirAlertas(): void {
  fireEvent.click(screen.getByTestId('nav-alertas'))
}

function fijarUmbral(tipo: string, min: string, max: string): void {
  fireEvent.change(screen.getByTestId(`min-${tipo}`), { target: { value: min } })
  fireEvent.change(screen.getByTestId(`max-${tipo}`), { target: { value: max } })
}

/** Umbrales donde solo la humedad de suelo queda fuera del rango simulado (5–80 %). */
function umbralesSoloHumedadFuera(): void {
  fijarUmbral('humedad_suelo', '0', '1')
  fijarUmbral('temperatura', '0', '100')
  fijarUmbral('humedad_ambiental', '0', '100')
  fijarUmbral('luminosidad', '0', '100000')
}

/** Umbrales tan amplios que toda lectura simulada queda dentro de rango. */
function umbralesSiempreDentro(): void {
  for (const tipo of TIPOS_MEDICION) fijarUmbral(tipo, '-1000', '100000')
}

function crearCultivoCon(nombre: string, fijarUmbrales: () => void): void {
  fireEvent.click(screen.getByRole('button', { name: 'Nuevo cultivo' }))
  fireEvent.change(screen.getByPlaceholderText('Ej.: Tomates del balcón'), {
    target: { value: nombre },
  })
  fijarUmbrales()
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
}

function prepararSensorYLectura(): void {
  fireEvent.click(screen.getByRole('button', { name: 'Ver mediciones' }))
  fireEvent.change(screen.getByTestId('nombre-sensor'), { target: { value: 'Sensor A' } })
  fireEvent.click(screen.getByTestId('crear-sensor'))
  fireEvent.click(screen.getByTestId('simular-lectura'))
}

describe('pantalla de alertas (T-15, R-13 y R-14)', () => {
  it('sin alertas muestra el mensaje de estado vacío', () => {
    render(<App />)
    abrirAlertas()

    expect(screen.getByTestId('vacio-alertas').textContent).toMatch(/No hay alertas/)
  })

  it('R-13 AC1 + R-14 AC2: la lectura fuera de rango genera una alerta con cultivo, tipo, valor y hora', () => {
    render(<App />)
    crearCultivoCon('Huerto en peligro', umbralesSoloHumedadFuera)
    prepararSensorYLectura()
    abrirAlertas()

    expect(screen.queryByTestId('vacio-alertas')).toBeNull()
    expect(screen.getByTestId('alerta-cultivo').textContent).toBe('Huerto en peligro')
    expect(screen.getByText('Humedad de suelo (% vol)')).toBeTruthy()
    expect(screen.getByTestId('alerta-valor').textContent).toContain('% vol')
    expect(screen.getByTestId('alerta-hora').querySelector('time')).toBeTruthy()
    expect(screen.getByText('Activa')).toBeTruthy()
  })

  it('R-13 AC2: lecturas repetidas fuera de rango no duplican la alerta', () => {
    render(<App />)
    crearCultivoCon('Huerto repetido', umbralesSoloHumedadFuera)
    prepararSensorYLectura()
    fireEvent.click(screen.getByTestId('simular-lectura'))
    fireEvent.click(screen.getByTestId('simular-lectura'))
    abrirAlertas()

    const filas = screen.getByTestId('lista-alertas').querySelectorAll('li')
    expect(filas).toHaveLength(1)
  })

  it('R-13 AC3: al volver al rango la alerta se marca resuelta con su hora', () => {
    render(<App />)
    crearCultivoCon('Huerto variable', umbralesSoloHumedadFuera)
    prepararSensorYLectura()

    // Se amplían los umbrales (editar el cultivo) y se lee de nuevo.
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }))
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
    fijarUmbral('humedad_suelo', '0', '100')
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ver mediciones' }))
    fireEvent.click(screen.getByTestId('simular-lectura'))
    abrirAlertas()

    expect(screen.getAllByText('Resuelta').length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText('Activa')).toBeNull()
    expect(screen.getByTestId('alerta-resuelta').querySelector('time')).toBeTruthy()
  })

  it('T-17: al eliminar el cultivo desaparecen sus alertas de la lista', () => {
    render(<App />)
    crearCultivoCon('Huerto efímero', umbralesSoloHumedadFuera)
    prepararSensorYLectura()
    abrirAlertas()
    expect(screen.queryByTestId('vacio-alertas')).toBeNull()

    fireEvent.click(screen.getByTestId('nav-cultivos'))
    fireEvent.click(screen.getByText('Eliminar'))
    abrirAlertas()

    expect(screen.getByTestId('vacio-alertas')).toBeTruthy()
  })

  it('desde la pantalla de alertas se puede volver a la lista de cultivos', () => {
    render(<App />)
    abrirAlertas()

    fireEvent.click(screen.getByTestId('nav-cultivos'))

    expect(screen.getByText('Mis cultivos')).toBeTruthy()
  })

  it('R-13 AC4: con todo dentro de rango no se crea ninguna alerta', () => {
    render(<App />)
    crearCultivoCon('Huerto tranquilo', umbralesSiempreDentro)
    prepararSensorYLectura()
    abrirAlertas()

    expect(screen.getByTestId('vacio-alertas')).toBeTruthy()
  })
})
