import { useEffect, useRef, useState } from 'react'

interface Props {
  /** Texto del botón que dispara la confirmación («Eliminar», «Desasociar»). */
  etiqueta: string
  /** Pregunta que se muestra al pedir confirmación. */
  pregunta: string
  /** Acción definitiva (se ejecuta al confirmar). */
  onConfirmar: () => void
  /** Clases extra del botón inicial (p. ej. `btn-peligro`). */
  className?: string
  /** `data-testid` del botón inicial (se conservan los existentes). */
  testId?: string
}

/**
 * D35 — Confirmación en línea para acciones destructivas.
 *
 * Al pulsar, el botón se convierte en la pregunta y dos opciones («Sí» /
 * «No»): sin modal, sin `window.confirm` y sin salir de la tarjeta. Es la
 * forma menos ruidosa de evitar un borrado accidental con el dedo.
 *
 * D40 — El foco ya no se pierde: al abrir la pregunta el foco pasa a «Sí» y,
 * al cancelar, vuelve al botón original (antes el elemento enfocado se
 * desmontaba y el teclado quedaba en el cuerpo de la página).
 */
export default function ConfirmacionEnLinea({
  etiqueta,
  pregunta,
  onConfirmar,
  className,
  testId,
}: Props) {
  const [preguntando, setPreguntando] = useState(false)
  const devolverFoco = useRef(false)
  const botonOriginal = useRef<HTMLButtonElement>(null)
  const botonSi = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (preguntando) {
      botonSi.current?.focus()
      return
    }
    if (devolverFoco.current) {
      devolverFoco.current = false
      botonOriginal.current?.focus()
    }
  }, [preguntando])

  if (!preguntando) {
    return (
      <button
        type="button"
        ref={botonOriginal}
        className={className}
        data-testid={testId}
        onClick={() => setPreguntando(true)}
      >
        {etiqueta}
      </button>
    )
  }

  return (
    <span className="confirmacion-en-linea" role="group" aria-label={pregunta}>
      <span className="confirmacion-pregunta">{pregunta}</span>
      <button
        type="button"
        ref={botonSi}
        className="btn-peligro"
        data-testid={testId ? `${testId}-confirmar` : undefined}
        onClick={() => {
          setPreguntando(false)
          onConfirmar()
        }}
      >
        Sí
      </button>
      <button
        type="button"
        data-testid={testId ? `${testId}-cancelar` : undefined}
        onClick={() => {
          setPreguntando(false)
          devolverFoco.current = true
        }}
      >
        No
      </button>
    </span>
  )
}
