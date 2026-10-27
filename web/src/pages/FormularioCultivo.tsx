import { useEffect, useState } from 'react'
import {
  AVISO_CATALOGO,
  CATALOGO_CULTIVOS,
  ETIQUETAS_MEDICION,
  TIPO_PERSONALIZADO,
  umbralesPorDefecto,
} from '../data/catalogo'
import {
  actualizarCultivo,
  crearCultivo,
  nuevoCultivoDesdeCatalogo,
  obtenerCultivo,
  type ErrorCampo,
} from '../data/storeCultivos'
import { TIPOS_MEDICION, type TipoMedicion, type UmbralesPorTipo } from '../domain/tipos'

interface Props {
  cultivoId?: string
  onGuardado: () => void
  onCancelar: () => void
}

type ValoresUmbral = Partial<Record<TipoMedicion, { min: string; max: string }>>

function aCadenas(umbrales: UmbralesPorTipo): ValoresUmbral {
  const resultado: ValoresUmbral = {}
  for (const tipo of TIPOS_MEDICION) {
    const umbral = umbrales[tipo]
    if (!umbral) continue
    resultado[tipo] = { min: String(umbral.min), max: String(umbral.max) }
  }
  return resultado
}

function aNumeros(cadenas: ValoresUmbral): UmbralesPorTipo {
  const resultado = {} as UmbralesPorTipo
  for (const [tipo, valores] of Object.entries(cadenas)) {
    if (!valores) continue
    resultado[tipo as TipoMedicion] = { min: Number(valores.min), max: Number(valores.max) }
  }
  return resultado
}

export default function FormularioCultivo({ cultivoId, onGuardado, onCancelar }: Props) {
  const existente = cultivoId ? obtenerCultivo(cultivoId) : undefined
  const inicial = existente ?? nuevoCultivoDesdeCatalogo(CATALOGO_CULTIVOS[0].tipoCultivo)

  const [nombre, setNombre] = useState(inicial.nombre)
  const [tipoCultivo, setTipoCultivo] = useState(inicial.tipoCultivo)
  const [cadenas, setCadenas] = useState<ValoresUmbral>(() => aCadenas(inicial.umbrales))
  const [errores, setErrores] = useState<ErrorCampo[]>([])
  // T-23: el guardado es asíncrono (BD); el bloqueo evita envíos duplicados.
  const [guardando, setGuardando] = useState(false)

  const esPersonalizado = !CATALOGO_CULTIVOS.some((e) => e.tipoCultivo === tipoCultivo)
  // D35: los campos con error se marcan y reciben el foco al enviar.
  const conError = (campo: string): boolean => errores.some((e) => e.campo === campo)

  useEffect(() => {
    if (errores.length === 0) return
    const primero = errores[0].campo
    const id = primero.startsWith('umbrales.') ? `min-${primero.slice('umbrales.'.length)}` : primero
    document.getElementById(`campo-${id}`)?.focus()
  }, [errores])

  function cambiarTipo(valor: string): void {
    if (valor === TIPO_PERSONALIZADO) {
      setTipoCultivo('')
      return
    }
    setTipoCultivo(valor)
    const defecto = umbralesPorDefecto(valor)
    if (defecto) setCadenas(aCadenas(defecto)) // R-11 AC1: umbrales precargados
  }

  function cambiarUmbral(tipo: TipoMedicion, lado: 'min' | 'max', valor: string): void {
    setCadenas((prev) => ({ ...prev, [tipo]: { ...prev[tipo], [lado]: valor } }))
  }

  async function guardar(evento: React.FormEvent): Promise<void> {
    evento.preventDefault()
    if (guardando) return
    setGuardando(true)
    try {
      const datos = { nombre, tipoCultivo: tipoCultivo.trim() || TIPO_PERSONALIZADO, umbrales: aNumeros(cadenas) }
      const resultado = existente
        ? await actualizarCultivo(existente.id, datos)
        : await crearCultivo(datos)

      if (resultado.ok) onGuardado()
      else setErrores(resultado.errores)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <section>
      <h2>{existente ? `Editar «${existente.nombre}»` : 'Nuevo cultivo'}</h2>

      <p className="aviso" data-testid="aviso-catalogo">
        {AVISO_CATALOGO}
      </p>

      {errores.length > 0 && (
        <div role="alert" data-testid="errores">
          {/* D40: con un solo error, una línea; la lista solo cuando hay varios.
              Cada error lleva id para que el campo lo anuncie con
              `aria-describedby` (antes el mensaje y el campo quedaban
              desconectados). */}
          {errores.length === 1 ? (
            <p id={`error-${errores[0].campo}`}>{errores[0].motivo}</p>
          ) : (
            <>
              <p>No se pudo guardar:</p>
              <ul>
                {errores.map((e) => (
                  <li key={`${e.campo}-${e.motivo}`} id={`error-${e.campo}`}>
                    {e.motivo}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <form onSubmit={guardar} noValidate>
        <label>
          Nombre del cultivo
          <input
            type="text"
            id="campo-nombre"
            name="nombre"
            autoComplete="off"
            aria-invalid={conError('nombre') || undefined}
            aria-describedby={conError('nombre') ? 'error-nombre' : undefined}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej.: Tomates del balcón"
          />
        </label>

        <label>
          Tipo de cultivo
          <select
            id="campo-tipoCultivo"
            name="tipoCultivo"
            aria-invalid={conError('tipoCultivo') || undefined}
            aria-describedby={conError('tipoCultivo') ? 'error-tipoCultivo' : undefined}
            value={esPersonalizado ? TIPO_PERSONALIZADO : tipoCultivo}
            onChange={(e) => cambiarTipo(e.target.value)}
          >
            {CATALOGO_CULTIVOS.map((e) => (
              <option key={e.tipoCultivo} value={e.tipoCultivo}>
                {e.tipoCultivo}
              </option>
            ))}
            <option value={TIPO_PERSONALIZADO}>{TIPO_PERSONALIZADO}</option>
          </select>
        </label>

        {esPersonalizado && (
          <label>
            Nombre del tipo personalizado
            {/* D40: con id, el foco al primer error puede encontrarlo. */}
            <input
              type="text"
              id="campo-tipoPersonalizado"
              name="tipoPersonalizado"
              autoComplete="off"
              aria-invalid={conError('tipoPersonalizado') || undefined}
              aria-describedby={conError('tipoPersonalizado') ? 'error-tipoPersonalizado' : undefined}
              value={tipoCultivo === TIPO_PERSONALIZADO ? '' : tipoCultivo}
              onChange={(e) => setTipoCultivo(e.target.value)}
            />
          </label>
        )}

        <fieldset>
          <legend>Umbrales de alerta</legend>
          {/* La luz ya no lleva umbral por lectura: el DLI se evalúa a diario
              en la base (20261027000002_alertas_dli.sql). Solo se muestran los
              tipos con umbral. */}
          {Object.entries(cadenas).map(([tipo]) => (
            <div key={tipo} className="fila-umbral">
              <span className="etiqueta-umbral">{ETIQUETAS_MEDICION[tipo as TipoMedicion]}</span>
              <label>
                Mínimo
                <input
                  type="number"
                  id={`campo-min-${tipo}`}
                  name={`min-${tipo}`}
                  data-testid={`min-${tipo}`}
                  aria-label={`Mínimo de ${ETIQUETAS_MEDICION[tipo as TipoMedicion].toLowerCase()}`}
                  aria-invalid={conError(`umbrales.${tipo}`) || undefined}
                  aria-describedby={conError(`umbrales.${tipo}`) ? `error-umbrales.${tipo}` : undefined}
                  value={cadenas[tipo as TipoMedicion]?.min ?? ''}
                  onChange={(e) => cambiarUmbral(tipo as TipoMedicion, 'min', e.target.value)}
                />
              </label>
              <label>
                Máximo
                <input
                  type="number"
                  id={`campo-max-${tipo}`}
                  name={`max-${tipo}`}
                  data-testid={`max-${tipo}`}
                  aria-label={`Máximo de ${ETIQUETAS_MEDICION[tipo as TipoMedicion].toLowerCase()}`}
                  aria-invalid={conError(`umbrales.${tipo}`) || undefined}
                  aria-describedby={conError(`umbrales.${tipo}`) ? `error-umbrales.${tipo}` : undefined}
                  value={cadenas[tipo as TipoMedicion]?.max ?? ''}
                  onChange={(e) => cambiarUmbral(tipo as TipoMedicion, 'max', e.target.value)}
                />
              </label>
            </div>
          ))}
        </fieldset>

        <div className="acciones acciones-formulario">
          <button type="submit" className="btn-primario" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
          <button type="button" onClick={onCancelar}>
            Cancelar
          </button>
        </div>
      </form>
    </section>
  )
}
