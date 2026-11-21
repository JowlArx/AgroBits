// Codificación de lotes y envío HTTPS a la función de ingesta de Supabase.
#pragma once

#include <Arduino.h>
#include <time.h>

struct Lectura {
  const char* tipo;
  float valor;
};

enum class ResultadoEnvio {
  Enviado,      // 200: lote aceptado
  Reintentar,   // red, TLS, 401 o 5xx: conservar y reintentar con backoff
  Descartar,    // 422 o lote inválido/caducado: eliminar
  EsperarHora,  // no se puede convertir la marca temporal todavía
};

namespace ingesta {
// Formato almacenado: {"t":epoch,"l":[[tipo,valor],...]} con hora válida,
// o {"s":sesion,"u":uptime,"l":[...]} sin hora (se convierte al sincronizar en la misma sesión).
String codificarLote(const Lectura* lecturas, size_t n, bool horaValida, time_t epoch);
// Convierte el lote almacenado al cuerpo de la API y lo envía. codigoHttp = código HTTP o negativo si hay error de cliente.
ResultadoEnvio enviarLote(const String& loteAlmacenado, int& codigoHttp);
}
