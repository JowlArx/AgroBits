import { useCallback, useEffect, useState } from 'react'
import { alCambiarUrl, escribirParams } from '../data/urlEstado'

type Parametro = string | null

/**
 * D40 — Estado sincronizado con la query string.
 *
 * `porDefecto` describe los parámetros que se leen de la URL (los que no
 * estén, valen lo de por defecto). `escribir` devuelve los cambios a la URL:
 * con `push` la navegación entra en el historial (el «atrás» vuelve a la
 * sección anterior); con `replace` solo se sustituye la entrada actual (filtros).
 *
 * Al pulsar «atrás» en el navegador, el hook vuelve a leer la URL.
 */
export function useParamsUrl<T extends Record<string, Parametro>>(
  porDefecto: T,
): [T, (cambios: Partial<T>, modo?: 'push' | 'replace') => void] {
  // El default viaja como cadena estable: mantiene la función de lectura
  // idéntica entre renders sin recurrir a un ref.
  const porDefectoJson = JSON.stringify(porDefecto)

  const leer = useCallback((): T => {
    const defecto = JSON.parse(porDefectoJson) as T
    const params = new URLSearchParams(window.location.search)
    const leidos: Record<string, Parametro> = {}
    for (const clave of Object.keys(defecto)) {
      leidos[clave] = params.get(clave) ?? defecto[clave]
    }
    return leidos as T
  }, [porDefectoJson])

  const [valores, setValores] = useState<T>(leer)

  // Botón «atrás» / «adelante»: la URL manda.
  useEffect(() => alCambiarUrl(() => setValores(leer())), [leer])

  const escribir = useCallback((cambios: Partial<T>, modo: 'push' | 'replace' = 'replace') => {
    setValores((previos) => ({ ...previos, ...cambios }))
    escribirParams(cambios as Record<string, Parametro>, modo)
  }, [])

  return [valores, escribir]
}
