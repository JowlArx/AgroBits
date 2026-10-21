// T-22 — Doble de autenticación en memoria para tests de interfaz y store.
// Reproduce el contrato REAL del proveedor (a diferencia de la maqueta de
// T-16): el registro rechaza los emails duplicados (R-01 AC2) y el inicio de
// sesión exige una cuenta previa con esa clave (R-01 AC1). No toca red.

import type { Resultado } from '../../data/storeCultivos'
import type { PerfilRegistro, ProveedorAuth, Sesion, UrlRedireccion } from '../../data/sesion/proveedorAuth'

/** Perfil por defecto de las cuentas sembradas en tests (D27). */
const PERFIL_PRUEBA: PerfilRegistro = { telefono: '2615550000', localidadId: 1 }

/** T-28 — URL de OAuth que devuelve el doble (no navega a ningún sitio). */
const URL_GOOGLE_FALSA = 'https://accounts.google.com/o/oauth2/v2/auth?client_id=doble-de-prueba'

export class AuthFalso implements ProveedorAuth {
  private readonly cuentas = new Map<string, { clave: string; perfil: PerfilRegistro }>()
  private sesion: Sesion | null = null
  private readonly oyentes = new Set<() => void>()
  /** T-28 — Si se fija, el acceso con Google falla con ese motivo. */
  errorGoogle: string | null = null

  /** Registra una cuenta directamente (para preparar escenarios de test). */
  sembrar(email: string, clave: string, perfil: PerfilRegistro = PERFIL_PRUEBA): void {
    this.cuentas.set(email, { clave, perfil })
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
    const cuenta = this.cuentas.get(email)
    if (cuenta?.clave !== clave) {
      return { ok: false, errores: [{ campo: 'clave', motivo: 'Email o contraseña incorrectos.' }] }
    }
    return this.abrir(email, cuenta.perfil)
  }

  async registrarse(email: string, clave: string, perfil: PerfilRegistro): Promise<Resultado<Sesion>> {
    if (this.cuentas.has(email)) {
      return { ok: false, errores: [{ campo: 'email', motivo: 'Ya existe una cuenta con ese email.' }] }
    }
    this.cuentas.set(email, { clave, perfil })
    return this.abrir(email, perfil)
  }

  async cerrarSesion(): Promise<void> {
    this.sesion = null
    this.notificar()
  }

  /**
   * D43 — Cambia el nombre de usuario de la sesión abierta (en memoria). Un
   * nombre vacío lo quita.
   */
  async actualizarNombreUsuario(nombre: string): Promise<Resultado<Sesion>> {
    if (!this.sesion) {
      return { ok: false, errores: [{ campo: 'nombreUsuario', motivo: 'No hay ninguna sesión abierta.' }] }
    }
    const email = this.sesion.usuario.email
    this.sesion = { usuario: { email, ...(nombre ? { nombreUsuario: nombre } : {}) } }
    this.notificar()
    return { ok: true, valor: this.sesion }
  }

  /**
   * T-28 — El doble NO navega: devuelve la URL de OAuth para que la prueba
   * compruebe que la pantalla redirige a donde debe.
   */
  async iniciarSesionConGoogle(): Promise<Resultado<UrlRedireccion>> {
    if (this.errorGoogle) {
      return { ok: false, errores: [{ campo: 'google', motivo: this.errorGoogle }] }
    }
    return { ok: true, valor: { url: URL_GOOGLE_FALSA } }
  }

  private abrir(email: string, perfil: PerfilRegistro): Resultado<Sesion> {
    // D32: el nombre de usuario opcional viaja igual que en el proveedor real.
    const nombre = perfil.nombreUsuario?.trim()
    this.sesion = { usuario: { email, ...(nombre ? { nombreUsuario: nombre } : {}) } }
    this.notificar()
    return { ok: true, valor: this.sesion }
  }

  private notificar(): void {
    for (const oyente of this.oyentes) oyente()
  }
}
