import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import App from '../App'
import { reiniciarCultivos } from '../data/storeCultivos'
import { obtenerMediciones, reiniciarMediciones } from '../data/medicionesSimuladas'
import { UNIDADES, TIPOS_MEDICION } from '../domain/tipos'

beforeEach(() => {
  reiniciarCultivos()
  reiniciarMediciones()
})

function crearCultivoYAbrirDetalle(nombre: string): void {
  fireEvent.click(screen.getByRole('button', { name: 'Nuevo cultivo' }))
  fireEvent.change(screen.getByPlaceholderText('Ej.: Tomates del balcón'), {
    target: { value: nombre },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
  fireEvent.click(screen.getByRole('button', { name: 'Ver mediciones' }))
}

describe('vista de mediciones del cultivo (T-14, R-09)', () => {
  it('R-09 AC2: sin lecturas muestra "sin datos" para los 4 tipos y no inventa valores', () => {
    render(<App />)
    crearCultivoYAbrirDetalle('Huerto nuevo')

    expect(screen.getByTestId('resumen-medicion').textContent).toMatch(/Sin lecturas/)
    for (const tipo of TIPOS_MEDICION) {
      expect(screen.getByTestId(`valor-${tipo}`).textContent).toBe('sin datos')
      expect(screen.getByTestId(`hora-${tipo}`).textContent).toBe('—')
    }
  })

  it('R-09 AC1: tras generar una lectura muestra los 4 tipos con valor, unidad y hora', () => {
    render(<App />)
    crearCultivoYAbrirDetalle('Huerto con datos')

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
    crearCultivoYAbrirDetalle('Huerto')

    fireEvent.click(screen.getByTestId('simular-lectura'))

    expect(screen.getByTestId('valor-temperatura').textContent).toContain('°C')
    expect(screen.getByTestId('valor-luminosidad').textContent).toContain('lux')
    expect(screen.getByTestId('valor-humedad_suelo').textContent).toContain('% vol')
    expect(screen.getByTestId('valor-humedad_ambiental').textContent).toContain('% HR')
  })

  it('los valores simulados caen dentro de los rangos del tipo (contrato R-08)', () => {
    render(<App />)
    crearCultivoYAbrirDetalle('Huerto rango')

    fireEvent.click(screen.getByTestId('simular-lectura'))

    const texto = screen.getByTestId('valor-temperatura').textContent ?? ''
    const numero = Number(texto.replace(/[^\d.,-]/g, '').replace(',', '.'))
    expect(Number.isFinite(numero)).toBe(true)
    expect(numero).toBeGreaterThanOrEqual(5)
    expect(numero).toBeLessThanOrEqual(40)
  })

  it('vuelve a la lista de cultivos', () => {
    render(<App />)
    crearCultivoYAbrirDetalle('Huerto ida y vuelta')

    fireEvent.click(screen.getByRole('button', { name: 'Volver' }))

    expect(screen.getByText('Mis cultivos')).toBeTruthy()
  })

  it('al eliminar el cultivo también se limpian sus mediciones', () => {
    render(<App />)
    crearCultivoYAbrirDetalle('Huerto que se va')
    fireEvent.click(screen.getByTestId('simular-lectura'))
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }))

    expect(obtenerMediciones('c1').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByText('Eliminar'))

    expect(screen.getByTestId('vacio')).toBeTruthy()
    expect(obtenerMediciones('c1')).toHaveLength(0)
  })
})
