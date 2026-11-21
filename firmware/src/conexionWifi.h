// Conexión WiFi no bloqueante con reintentos exponenciales y jitter.
#pragma once

#include <Arduino.h>

// Espera de backoff: base * 2^(intento-1), acotada a maximo, más jitter aleatorio de hasta el 50 %.
// Resultado máximo: 1.5 * maximo.
inline uint32_t calcularBackoffMs(uint8_t intento, uint32_t base, uint32_t maximo) {
  uint32_t espera = base;
  for (uint8_t i = 1; i < intento && espera < maximo; i++) {
    espera *= 2;
  }
  if (espera > maximo) {
    espera = maximo;
  }
  uint32_t jitter = (uint32_t)random(0, (long)(espera / 2) + 1);
  return espera + jitter;
}

namespace wifi {
// Arranca el primer intento de conexión (no bloquea).
void iniciar();
// Llamar en cada iteración de loop: gestiona timeouts y reintentos.
void mantener();
bool conectado();
}
