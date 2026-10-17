import { beforeEach, describe, expect, it } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import App from '../App'
import { reiniciarCultivos, obtenerCultivos } from '../data/storeCultivos'
import {
  asociarSensor,
  obtenerSensores,
  reiniciarSensores,
} from '../data/storeSensores'
import { reiniciarMediciones } from '../data/medicionesSimuladas'
import { iniciarSesion, reiniciarSesion } from '../data/storeSesion'
import { UNIDADES, TIPOS_MEDICION } from '../domain/tipos'

const existeCultivo = (id: string) => obtenerCultivos().some((c) => c.id === id)

// T-16: la app está tras un gate de acceso provisional; empieza con sesión simulada.
beforeEach(() => {
  reiniciarSesion()
  iniciarSesion('pruebas@agrobits.test', 'secreta')
  reiniciarCultivos()
  reiniciarSensores()
  reiniciarMediciones()
})

function crearCultivo(nombre: string): void {
  fireEvent.click(screen.getByRole('button', { name: 'Nuevo cultivo' }))
  fireEvent.change(screen.getByPlaceholderText('Ej.: Tomates del balcón'), {
    target: { value: nombre },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
}

function abrirDetalle(): void {
  fireEvent.click(screen.getByRole('button', { name: 'Ver mediciones' }))
}

function crearSensor(nombre: string): void {
  fireEvent.change(screen.getByTestId('nombre-sensor'), { target: { value: nombre } })
  fireEvent.click(screen.getByTestId('crear-sensor'))
}

function crearCultivoConDetalle(nombre: string): void {
  crearCultivo(nombre)
  abrirDetalle()
}

describe('vista de mediciones del cultivo (T-14, R-09)', () => {
  it('R-09 AC2: sin sensores ni lecturas muestra "sin datos" para los 4 tipos', () => {
    render(<App />)
    crearCultivoConDetalle('Huerto nuevo')

    expect(screen.getByTestId('sin-sensores')).toBeTruthy()
    expect(screen.getByTestId('resumen-medicion').textContent).toMatch(/Sin sensores/)
    for (const tipo of TIPOS_MEDICION) {
      expect(screen.getByTestId(`valor-${tipo}`).textContent).toBe('sin datos')
      expect(screen.getByTestId(`hora-${tipo}`).textContent).toBe('—')
    }
    expect(screen.queryByTestId('simular-lectura')).toBeNull()
  })

  it('R-09 AC1: tras generar una lectura muestra los 4 tipos con valor, unidad y hora', () => {
    render(<App />)
    crearCultivoConDetalle('Huerto con datos')
    crearSensor('Sensor A')

    fireEvent.click(screen.getByTestId('simular-lectura'))

    expect(screen.getByTestId('resumen-medicion').textContent).toMatch(/4 de 4/)
    for (const tipo of TIPOS_MEDICION) {
      const valor = screen.getByTestId(`valor-${tipo}`).textContent ?? ''
      expect(valor).toMatch(/\d/)
      expect(valor).toContain(UNIDADES[tipo])
      const hora = screen.getByTestId(`hora-${tipo}`)
      expect(hora.textContent).not.toBe('—')
      expect(hora.querySelector('time')).toBeTruthy()
    }
  })

  it('la unidad mostrada corresponde al tipo de medición', () => {
    render(<App />)
    crearCultivoConDetalle('Huerto')
    crearSensor('Sensor B')
    fireEvent.click(screen.getByTestId('simular-lectura'))

    expect(screen.getByTestId('valor-temperatura').textContent).toContain('°C')
    expect(screen.getByTestId('valor-luminosidad').textContent).toContain('lux')
    expect(screen.getByTestId('valor-humedad_suelo').textContent).toContain('% vol')
    expect(screen.getByTestId('valor-humedad_ambiental').textContent).toContain('% HR')
  })

  it('los valores simulados caen dentro de los rangos del tipo (contrato R-08)', () => {
    render(<App />)
    crearCultivoConDetalle('Huerto rango')
    crearSensor('Sensor C')
    fireEvent.click(screen.getByTestId('simular-lectura'))

    const texto = screen.getByTestId('valor-temperatura').textContent ?? ''
    const numero = Number(texto.replace(/[^\d.,-]/g, '').replace(',', '.'))
    expect(Number.isFinite(numero)).toBe(true)
    expect(numero).toBeGreaterThanOrEqual(5)
    expect(numero).toBeLessThanOrEqual(40)
  })

  it('vuelve a la lista de cultivos', () => {
    render(<App />)
    crearCultivoConDetalle('Huerto ida y vuelta')

    fireEvent.click(screen.getByRole('button', { name: 'Volver' }))

    expect(screen.getByText('Mis cultivos')).toBeTruthy()
  })
})

describe('registro y asociación de sensores (T-18, R-06)', () => {
  it('AC1: crea un sensor con nombre y aparece listado', () => {
    render(<App />)
    crearCultivoConDetalle('Huerto con sensor')

    crearSensor('Sensor del balcón')

    expect(screen.getByTestId('lista-sensores').textContent).toContain('Sensor del balcón')
    expect(screen.queryByTestId('sin-sensores')).toBeNull()
  })

  it('AC1: rechaza un sensor sin nombre e informa del motivo', () => {
    render(<App />)
    crearCultivoConDetalle('Huerto')

    crearSensor('   ')

    expect(screen.getByTestId('error-sensor').textContent).toMatch(/obligatorio/)
    expect(screen.queryByTestId('lista-sensores')).toBeNull()
  })

  it('AC2: la asociación se refleja en la visualización de mediciones', () => {
    render(<App />)
    crearCultivoConDetalle('Huerto asociado')
    expect(screen.queryByTestId('simular-lectura')).toBeNull()

    crearSensor('Sensor asociado')

    // El sensor ya asociado habilita las lecturas de este cultivo
    fireEvent.click(screen.getByTestId('simular-lectura'))
    expect(screen.getByTestId('resumen-medicion').textContent).toMatch(/4 de 4/)
    expect(screen.getByTestId('lista-sensores').textContent).toContain('Sensor asociado')
  })

  it('AC3: el modelo admite N–N y la vista refleja la asociación de un segundo cultivo', () => {
    render(<App />)
    crearCultivoConDetalle('Cultivo uno')
    crearSensor('Sensor compartido')
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }))
    crearCultivo('Cultivo dos')
    // Hay dos cultivos en la lista: abrimos el segundo.
    const botones = screen.getAllByRole('button', { name: 'Ver mediciones' })
    fireEvent.click(botones[1])

    // La UI del MVP asocia al cultivo actual: el segundo cultivo empieza sin sensores.
    expect(screen.queryByTestId('lista-sensores')).toBeNull()

    // El modelo (D5) permite la segunda asociación; la vista la refleja al cambiar la store.
    const sensor = obtenerSensores()[0]
    let resultado: unknown
    act(() => {
      resultado = asociarSensor(sensor.id, 'c2', existeCultivo)
    })
    expect(resultado).toEqual(expect.objectContaining({ ok: true }))

    expect(screen.getByTestId('lista-sensores').textContent).toContain('Sensor compartido')
    expect(obtenerSensores()).toHaveLength(1)
    expect(obtenerSensores()[0].cultivoIds).toHaveLength(2)
  })

  it('al eliminar un cultivo se retira su sensor (y sus mediciones)', () => {
    render(<App />)
    crearCultivoConDetalle('Huerto que se va')
    crearSensor('Sensor efímero')
    fireEvent.click(screen.getByTestId('simular-lectura'))
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }))
    fireEvent.click(screen.getByText('Eliminar'))

    expect(screen.getByTestId('vacio')).toBeTruthy()
    expect(obtenerSensores()).toHaveLength(0)
  })
})
