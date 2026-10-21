import { useEffect, useId, useRef, useState } from 'react'

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
 *
 * D40 — Patrón listbox corregido: al abrirse el foco pasa a la lista (que es
 * quien recibe el teclado) y la opción resaltada se anuncia con
 * `aria-activedescendant`; el botón solo abre y cierra. Además, el nombre
 * accesible del control incluye su texto visible (WCAG 2.5.3 «Label in Name»).
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
  const lista = useRef<HTMLUListElement>(null)
  const idBase = useId()
  const idLista = `${idBase}-lista`
  const idOpcion = (indice: number): string => `${idBase}-opcion-${indice}`

  // Clic fuera: cierra el menú sin afectar al contenido.
  useEffect(() => {
    if (!abierto) return
    function alClic(evento: MouseEvent): void {
      if (!contenedor.current?.contains(evento.target as Node)) setAbierto(false)
    }
    document.addEventListener('mousedown', alClic)
    return () => document.removeEventListener('mousedown', alClic)
  }, [abierto])

  // Al abrirse, el foco pasa a la lista: es quien recibe el teclado.
  useEffect(() => {
    if (abierto) lista.current?.focus()
  }, [abierto])

  const seleccionada = opciones.find((o) => o.valor === valor)
  const textoVisible = seleccionada?.texto ?? '—'

  function cerrar(): void {
    setAbierto(false)
    boton.current?.focus()
  }

  function elegir(nuevoValor: string): void {
    onChange(nuevoValor)
    setAbierto(false)
    boton.current?.focus()
  }

  function mover(paso: number): void {
    if (opciones.length === 0) return
    setResaltado((indice) => (indice + paso + opciones.length) % opciones.length)
  }

  function alTecladoDelBoton(evento: React.KeyboardEvent): void {
    if (evento.key === 'Escape' && abierto) {
      evento.preventDefault()
      cerrar()
      return
    }
    if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
      evento.preventDefault()
      if (!abierto) {
        setAbierto(true)
        return
      }
      mover(evento.key === 'ArrowDown' ? 1 : -1)
    }
  }

  function alTecladoDeLaLista(evento: React.KeyboardEvent): void {
    if (evento.key === 'Escape') {
      evento.preventDefault()
      cerrar()
      return
    }
    if (evento.key === 'ArrowDown') {
      evento.preventDefault()
      mover(1)
      return
    }
    if (evento.key === 'ArrowUp') {
      evento.preventDefault()
      mover(-1)
      return
    }
    if (evento.key === 'Home') {
      evento.preventDefault()
      setResaltado(0)
      return
    }
    if (evento.key === 'End') {
      evento.preventDefault()
      setResaltado(Math.max(0, opciones.length - 1))
      return
    }
    if (evento.key === 'Enter' || evento.key === ' ') {
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
        aria-controls={idLista}
        /* D40: el nombre accesible incluye el texto visible (WCAG 2.5.3). */
        aria-label={`${etiqueta}: ${textoVisible}`}
        onClick={() => setAbierto((estaAbierto) => !estaAbierto)}
        onKeyDown={alTecladoDelBoton}
      >
        <span className="selector-valor">{textoVisible}</span>
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
        <ul
          className="selector-lista"
          role="listbox"
          id={idLista}
          ref={lista}
          tabIndex={-1}
          aria-label={etiqueta}
          aria-activedescendant={opciones.length > 0 ? idOpcion(resaltado) : undefined}
          onKeyDown={alTecladoDeLaLista}
        >
          {opciones.map((opcion, indice) => (
            <li
              key={opcion.valor}
              id={idOpcion(indice)}
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
