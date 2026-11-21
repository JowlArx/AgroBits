// Cola persistente de lotes en NVS (Preferences). Orden FIFO, máximo MAX_LOTES.
#pragma once

#include <Arduino.h>

namespace buffer {
// Abre NVS e incrementa el contador de sesión (arranque). Llamar una vez en setup.
void iniciar();
// Número de arranque actual. Los lotes con marca de uptime solo son convertibles en la misma sesión.
uint32_t sesionActual();
// Guarda un lote al final de la cola. Si está llena, descarta el más antiguo.
bool encolar(const String& lote);
// Lee el lote más antiguo sin extraerlo.
bool leerPrimero(String& lote);
// Elimina el lote más antiguo (tras enviarlo o descartarlo).
void descartarPrimero();
uint32_t cantidad();
}
