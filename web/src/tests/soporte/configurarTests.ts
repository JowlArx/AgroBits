// T-22/T-23/T-24 — Configuración global de los tests (vitest `setupFiles`): antes
// de cada prueba se inyectan los dobles en memoria de auth, de datos y del
// generador de lecturas (sin red ni timers), se siembra la cuenta estándar que
// usan las suites de interfaz y se vacían las cachés locales de las stores
// para que cada test empiece limpio.

import { beforeEach } from 'vitest'
import { configurarProveedorAuth } from '../../data/storeSesion'
import { configurarProveedorDatos } from '../../data/datos/proveedorDatos'
import { configurarProgramadorLecturas } from '../../data/programadorLecturas'
import { reiniciarCultivos } from '../../data/storeCultivos'
import { reiniciarSensores } from '../../data/storeSensores'
import { reiniciarMediciones } from '../../data/medicionesSimuladas'
import { reiniciarAlertas } from '../../data/storeAlertas'
import { AuthFalso } from './authFalso'
import { DatosFalsos } from './datosFalsos'
import { ProgramadorFalso } from './programadorFalso'

let actual: AuthFalso | null = null
let actualProgramador: ProgramadorFalso | null = null

/** Instancia del doble activo (para tests que necesitan sembrar más cuentas). */
export function authFalsoActual(): AuthFalso {
  if (!actual) throw new Error('El doble de auth aún no se ha instalado')
  return actual
}

/** Instancia del programador doble activo (T-24, para verificar programaciones). */
export function programadorFalsoActual(): ProgramadorFalso {
  if (!actualProgramador) throw new Error('El doble del programador aún no se ha instalado')
  return actualProgramador
}

beforeEach(() => {
  actual = new AuthFalso()
  actual.sembrar('pruebas@agrobits.test', 'secreta')
  configurarProveedorAuth(actual)

  configurarProveedorDatos(new DatosFalsos())
  actualProgramador = new ProgramadorFalso()
  configurarProgramadorLecturas(actualProgramador)
  reiniciarCultivos()
  reiniciarSensores()
  reiniciarMediciones()
  reiniciarAlertas()
})
