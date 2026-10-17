// T-22 — Doble de autenticación en memoria para tests de interfaz y store.
// Reproduce el contrato REAL del proveedor (a diferencia de la maqueta de
// T-16): el registro rechaza los emails duplicados (R-01 AC2) y el inicio de
// sesión exige una cuenta previa con esa clave (R-01 AC1). No toca red.

import type { Resultado } from '../../data/storeCultivos'
import type { ProveedorAuth, Sesion } from '../../data/sesion/proveedorAuth'

export class AuthFalso implements ProveedorAuth {
  private readonly cuentas = new Map<string, string>()
  private sesion: Sesion | null = null
  private readonly oyentes = new Set<() => void>()

  /** Registra una cuenta directamente (para preparar escenarios de test). */
  sembrar(email: string, clave: string): void {
    this.cuentas.set(email, clave)
  }

  sesionActual(): Sesion | null {
    return this.sesion
  }

  suscribir(oyente: () => void): () => void {
    this.oyentes.add(oyente)
    return () => {
      this.oyentes.delete(oyente)
    }
  }

  async iniciarSesion(email: string, clave: string): Promise<Resultado<Sesion>> {
    if (this.cuentas.get(email) !== clave) {
      return { ok: false, errores: [{ campo: 'clave', motivo: 'Email o contraseña incorrectos.' }] }
    }
    return this.abrir(email)
  }

  async registrarse(email: string, clave: string): Promise<Resultado<Sesion>> {
    if (this.cuentas.has(email)) {
      return { ok: false, errores: [{ campo: 'email', motivo: 'Ya existe una cuenta con ese email.' }] }
    }
    this.cuentas.set(email, clave)
    return this.abrir(email)
  }

  async cerrarSesion(): Promise<void> {
    this.sesion = null
    this.notificar()
  }

  private abrir(email: string): Resultado<Sesion> {
    this.sesion = { usuario: { email } }
    this.notificar()
    return { ok: true, valor: this.sesion }
  }

  private notificar(): void {
    for (const oyente of this.oyentes) oyente()
  }
}
