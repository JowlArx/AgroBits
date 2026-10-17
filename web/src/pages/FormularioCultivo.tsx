import { useState } from 'react'
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

type ValoresUmbral = Record<TipoMedicion, { min: string; max: string }>

function aCadenas(umbrales: UmbralesPorTipo): ValoresUmbral {
  const resultado = {} as ValoresUmbral
  for (const tipo of TIPOS_MEDICION) {
    resultado[tipo] = { min: String(umbrales[tipo].min), max: String(umbrales[tipo].max) }
  }
  return resultado
}

function aNumeros(cadenas: ValoresUmbral): UmbralesPorTipo {
  const resultado = {} as UmbralesPorTipo
  for (const tipo of TIPOS_MEDICION) {
    resultado[tipo] = { min: Number(cadenas[tipo].min), max: Number(cadenas[tipo].max) }
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

  const esPersonalizado = !CATALOGO_CULTIVOS.some((e) => e.tipoCultivo === tipoCultivo)

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

  function guardar(evento: React.FormEvent): void {
    evento.preventDefault()
    const datos = { nombre, tipoCultivo: tipoCultivo.trim() || TIPO_PERSONALIZADO, umbrales: aNumeros(cadenas) }
    const resultado = existente
      ? actualizarCultivo(existente.id, datos)
      : crearCultivo(datos)

    if (resultado.ok) onGuardado()
    else setErrores(resultado.errores)
  }

  return (
    <section>
      <h2>{existente ? `Editar «${existente.nombre}»` : 'Nuevo cultivo'}</h2>

      <p className="aviso" data-testid="aviso-catalogo">
        {AVISO_CATALOGO}
      </p>

      {errores.length > 0 && (
        <div role="alert" data-testid="errores">
          <p>No se pudo guardar:</p>
          <ul>
            {errores.map((e) => (
              <li key={`${e.campo}-${e.motivo}`}>{e.motivo}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={guardar}>
        <label>
          Nombre del cultivo
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej.: Tomates del balcón"
          />
        </label>

        <label>
          Tipo de cultivo
          <select value={esPersonalizado ? TIPO_PERSONALIZADO : tipoCultivo} onChange={(e) => cambiarTipo(e.target.value)}>
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
            <input
              type="text"
              value={tipoCultivo === TIPO_PERSONALIZADO ? '' : tipoCultivo}
              onChange={(e) => setTipoCultivo(e.target.value)}
            />
          </label>
        )}

        <fieldset>
          <legend>Umbrales de alerta</legend>
          {TIPOS_MEDICION.map((tipo) => (
            <div key={tipo} className="fila-umbral">
              <span className="etiqueta-umbral">{ETIQUETAS_MEDICION[tipo]}</span>
              <label>
                Mínimo
                <input
                  type="number"
                  data-testid={`min-${tipo}`}
                  value={cadenas[tipo].min}
                  onChange={(e) => cambiarUmbral(tipo, 'min', e.target.value)}
                />
              </label>
              <label>
                Máximo
                <input
                  type="number"
                  data-testid={`max-${tipo}`}
                  value={cadenas[tipo].max}
                  onChange={(e) => cambiarUmbral(tipo, 'max', e.target.value)}
                />
              </label>
            </div>
          ))}
        </fieldset>

        <div className="acciones">
          <button type="submit">Guardar</button>
          <button type="button" onClick={onCancelar}>
            Cancelar
          </button>
        </div>
      </form>
    </section>
  )
}
