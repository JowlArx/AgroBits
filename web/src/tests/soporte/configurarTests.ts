// T-22/T-23 — Configuración global de los tests (vitest `setupFiles`): antes
// de cada prueba se inyectan los dobles en memoria de auth y de datos (sin
// red), se siembra la cuenta estándar que usan las suites de interfaz y se
// vacían las cachés locales de las stores para que cada test empiece limpio.

import { beforeEach } from 'vitest'
import { configurarProveedorAuth } from '../../data/storeSesion'
import { configurarProveedorDatos } from '../../data/datos/proveedorDatos'
import { reiniciarCultivos } from '../../data/storeCultivos'
import { reiniciarSensores } from '../../data/storeSensores'
import { reiniciarMediciones } from '../../data/medicionesSimuladas'
import { reiniciarAlertas } from '../../data/storeAlertas'
import { AuthFalso } from './authFalso'
import { DatosFalsos } from './datosFalsos'

let actual: AuthFalso | null = null

/** Instancia del doble activo (para tests que necesitan sembrar más cuentas). */
export function authFalsoActual(): AuthFalso {
  if (!actual) throw new Error('El doble de auth aún no se ha instalado')
  return actual
}

beforeEach(() => {
  actual = new AuthFalso()
  actual.sembrar('pruebas@agrobits.test', 'secreta')
  configurarProveedorAuth(actual)

  configurarProveedorDatos(new DatosFalsos())
  reiniciarCultivos()
  reiniciarSensores()
  reiniciarMediciones()
  reiniciarAlertas()
})
