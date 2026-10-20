import { useEffect, useRef, useState } from 'react'

export interface OpcionSelector {
  valor: string
  texto: string
}

interface Props {
  /** Nombre accesible del control. */
  etiqueta: string
  /** Valor seleccionado ('' = la opción «todos»). */
  valor: string
  opciones: readonly OpcionSelector[]
  onChange: (valor: string) => void
  className?: string
  testId?: string
}

/**
 * D36 — Desplegable propio (listbox) para elegir el sensor del widget.
 *
 * El `<select>` nativo no permite saber si su lista está desplegada, así que
 * la flecha no puede cambiar de estado ni girar al abrirse. Con un listbox
 * propio la flecha apunta hacia arriba mientras el menú está abierto, el
 * control cambia de aspecto y el teclado funciona como corresponde (flechas
 * para moverse, Intro para elegir, Escape para cerrar).
 */
export default function SelectorDesplegable({
  etiqueta,
  valor,
  opciones,
  onChange,
  className,
  testId,
}: Props) {
  const [abierto, setAbierto] = useState(false)
  const [resaltado, setResaltado] = useState(() => Math.max(0, opciones.findIndex((o) => o.valor === valor)))
  const contenedor = useRef<HTMLDivElement>(null)
  const boton = useRef<HTMLButtonElement>(null)

  // Clic fuera: cierra el menú sin afectar al contenido.
  useEffect(() => {
    if (!abierto) return
    function alClic(evento: MouseEvent): void {
      if (!contenedor.current?.contains(evento.target as Node)) setAbierto(false)
    }
    document.addEventListener('mousedown', alClic)
    return () => document.removeEventListener('mousedown', alClic)
  }, [abierto])

  const seleccionada = opciones.find((o) => o.valor === valor)

  function elegir(nuevoValor: string): void {
    onChange(nuevoValor)
    setAbierto(false)
    boton.current?.focus()
  }

  function alTeclado(evento: React.KeyboardEvent): void {
    if (evento.key === 'Escape' && abierto) {
      setAbierto(false)
      return
    }
    if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
      evento.preventDefault()
      if (!abierto) {
        setAbierto(true)
        return
      }
      const paso = evento.key === 'ArrowDown' ? 1 : -1
      setResaltado((indice) => (indice + paso + opciones.length) % opciones.length)
      return
    }
    if ((evento.key === 'Enter' || evento.key === ' ') && abierto) {
      evento.preventDefault()
      const opcion = opciones[resaltado]
      if (opcion) elegir(opcion.valor)
    }
  }

  return (
    <div className="selector" ref={contenedor}>
      <button
        type="button"
        ref={boton}
        className={`selector-boton${abierto ? ' abierto' : ''}${className ? ` ${className}` : ''}`}
        data-testid={testId}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-label={etiqueta}
        onClick={() => setAbierto((estaAbierto) => !estaAbierto)}
        onKeyDown={alTeclado}
      >
        <span className="selector-valor">{seleccionada?.texto ?? '—'}</span>
        <svg
          className="selector-flecha"
          viewBox="0 0 10 6"
          width="10"
          height="6"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M1 1l4 4 4-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {abierto && (
        <ul className="selector-lista" role="listbox" aria-label={etiqueta}>
          {opciones.map((opcion, indice) => (
            <li
              key={opcion.valor}
              role="option"
              aria-selected={opcion.valor === valor}
              className={
                opcion.valor === valor ? 'opcion seleccionada' : indice === resaltado ? 'opcion resaltada' : 'opcion'
              }
              onMouseEnter={() => setResaltado(indice)}
              onClick={() => elegir(opcion.valor)}
            >
              {opcion.texto}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
