// Sincronización de hora con NTP. La hora solo es fiable tras una sincronización correcta.
#pragma once

#include <Arduino.h>
#include <time.h>

namespace reloj {
// Configura NTP (no bloquea). Llamar una vez en setup.
void iniciarSincronizacion();
// Llamar en loop: detecta hora válida y reintenta NTP con backoff si hace falta.
void mantener();
bool horaValida();
// Devuelve la hora actual (epoch UTC). false si la hora no es fiable.
bool obtenerEpoch(time_t& epoch);
// Formato ISO 8601 UTC con milisegundos a cero: 2026-10-29T10:00:00.000Z
String aIsoUtc(time_t epoch);
// Epoch estimado de millis()==0 en esta sesión (requiere hora válida alguna vez en la sesión).
bool epochArranqueConocido();
time_t epochDeUptime(uint32_t uptimeS);
}
