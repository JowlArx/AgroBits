// T-23 — Carga y vaciado de datos de la sesión activa (llamados desde App al
// montar/con la sesión): cultivos → sensores → mediciones de esos sensores.
// Al cerrar sesión se vacía TODA la caché local para que la siguiente cuenta
// no vea datos de la anterior (refuerzo cliente del aislamiento R-02; la
// garantía real sigue siendo RLS).

import { cargarCultivos, vaciarCultivos } from './storeCultivos'
import { cargarSensores, obtenerSensores, vaciarSensores } from './storeSensores'
import { cargarMediciones, vaciarMediciones } from './medicionesSimuladas'
import { reiniciarAlertas } from './storeAlertas'

export async function cargarDatosSesion(): Promise<void> {
  await cargarCultivos()
  await cargarSensores()
  await cargarMediciones(obtenerSensores().map((sensor) => sensor.id))
}

export function vaciarDatosSesion(): void {
  vaciarCultivos()
  vaciarSensores()
  vaciarMediciones()
  reiniciarAlertas()
}
