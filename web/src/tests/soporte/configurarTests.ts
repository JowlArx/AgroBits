// T-22 — Configuración global de los tests (vitest `setupFiles`): antes de
// cada prueba se inyecta un doble de autenticación en memoria (sin red) y se
// siembra la cuenta estándar que usan las suites de interfaz.

import { beforeEach } from 'vitest'
import { configurarProveedorAuth } from '../../data/storeSesion'
import { AuthFalso } from './authFalso'

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
})
