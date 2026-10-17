// T-23 — Carga y vaciado de datos de la sesión activa (llamados desde App al
// montar/con la sesión): cultivos → sensores → mediciones de esos sensores y
// programación del generador simulado (T-24: 1 lectura/5 min/sensor, D15).
// Al cerrar sesión se detiene el generador y se vacía TODA la caché local
// para que la siguiente cuenta no vea datos de la anterior (refuerzo cliente
// del aislamiento R-02; la garantía real sigue siendo RLS).

import { cargarCultivos, vaciarCultivos } from './storeCultivos'
import { cargarSensores, obtenerSensores, vaciarSensores } from './storeSensores'
import { cargarMediciones, vaciarMediciones } from './medicionesSimuladas'
import { reiniciarAlertas } from './storeAlertas'
import { exigirProgramador } from './programadorLecturas'

export async function cargarDatosSesion(): Promise<void> {
  await cargarCultivos()
  await cargarSensores()
  const sensores = obtenerSensores()
  await cargarMediciones(sensores.map((sensor) => sensor.id))
  // T-24: con las series ya cargadas, cada sensor queda programado con su
  // próximo tick (inmediato si su última lectura supera los 5 minutos).
  exigirProgramador().programar(sensores.map((sensor) => sensor.id))
}

export function vaciarDatosSesion(): void {
  exigirProgramador().parar()
  vaciarCultivos()
  vaciarSensores()
  vaciarMediciones()
  reiniciarAlertas()
}
