#include "ingesta.h"

#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

#include <cstring>

#include "buffer.h"
#include "config.h"
#include "provisionamiento.h"
#include "reloj.h"

namespace {
// Unidades EXACTAS según la API.
const char* unidadPara(const char* tipo) {
  if (strcmp(tipo, TIPO_HUMEDAD_SUELO) == 0) return "% vol";
  if (strcmp(tipo, TIPO_TEMPERATURA) == 0) return "°C";
  if (strcmp(tipo, TIPO_HUMEDAD_AMBIENTAL) == 0) return "% HR";
  if (strcmp(tipo, TIPO_LUMINOSIDAD) == 0) return "lux";
  return nullptr;
}
}  // namespace

String ingesta::codificarLote(const Lectura* lecturas, size_t n, bool horaValida, time_t epoch) {
  JsonDocument doc;
  if (horaValida) {
    doc["t"] = (uint32_t)epoch;
  } else {
    doc["s"] = buffer::sesionActual();
    doc["u"] = (uint32_t)(millis() / 1000UL);
  }
  JsonArray pares = doc["l"].to<JsonArray>();
  for (size_t i = 0; i < n; i++) {
    JsonArray par = pares.add<JsonArray>();
    par.add(lecturas[i].tipo);
    par.add(lecturas[i].valor);
  }
  String salida;
  serializeJson(doc, salida);
  return salida;
}

ResultadoEnvio ingesta::enviarLote(const String& loteAlmacenado, int& codigoHttp) {
  codigoHttp = 0;

  JsonDocument entrada;
  if (deserializeJson(entrada, loteAlmacenado)) {
    return ResultadoEnvio::Descartar;
  }

  time_t epoch = 0;
  if (!entrada["t"].isNull()) {
    epoch = (time_t)entrada["t"].as<uint32_t>();
  } else {
    if (entrada["s"].as<uint32_t>() != buffer::sesionActual()) {
      // Marca de uptime de otro arranque: no se puede reconstruir la hora.
      return ResultadoEnvio::Descartar;
    }
    if (!reloj::epochArranqueConocido()) {
      return ResultadoEnvio::EsperarHora;
    }
    epoch = reloj::epochDeUptime(entrada["u"].as<uint32_t>());
  }

  time_t ahora = 0;
  if (!reloj::obtenerEpoch(ahora)) {
    return ResultadoEnvio::EsperarHora;
  }
  if (ahora - epoch > (time_t)ANTIGUEDAD_MAX_S) {
    return ResultadoEnvio::Descartar;
  }

  // Cuerpo de la API: {"lecturas":[{tipo,valor,unidad,medida_en}, ...]}
  JsonDocument salida;
  JsonArray lecturas = salida["lecturas"].to<JsonArray>();
  JsonArray pares = entrada["l"].as<JsonArray>();
  String marca = reloj::aIsoUtc(epoch);
  for (size_t i = 0; i < pares.size(); i++) {
    JsonArray par = pares[i].as<JsonArray>();
    const char* tipo = par[0].as<const char*>();
    const char* unidad = tipo ? unidadPara(tipo) : nullptr;
    if (unidad == nullptr) {
      continue;
    }
    JsonObject o = lecturas.add<JsonObject>();
    o["tipo"] = tipo;
    o["valor"] = par[1].as<float>();
    o["unidad"] = unidad;
    o["medida_en"] = marca;
  }
  if (lecturas.size() == 0) {
    return ResultadoEnvio::Descartar;
  }

  if (strstr(AGROBITS_CA_PEM, "CAMBIAR") != nullptr) {
    Serial.println("Ingesta: CA no configurada en backend.h; no se envía");
    return ResultadoEnvio::Reintentar;
  }

  String cuerpo;
  serializeJson(salida, cuerpo);

  WiFiClientSecure cliente;
  cliente.setCACert(AGROBITS_CA_PEM);
  cliente.setTimeout(10);

  HTTPClient http;
  http.setTimeout(10000);
  if (!http.begin(cliente, INGESTA_URL)) {
    Serial.println("Ingesta: no se pudo iniciar la conexión HTTPS");
    return ResultadoEnvio::Reintentar;
  }
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON_KEY);
  // El token vive en NVS (portal cautivo); nunca se imprime.
  http.addHeader("x-device-token", provisionamiento::configuracion().deviceToken.c_str());

  codigoHttp = http.POST(cuerpo);
  http.end();

  // Nunca se imprimen cabeceras ni cuerpo: solo el código.
  if (codigoHttp == 200) {
    return ResultadoEnvio::Enviado;
  }
  if (codigoHttp == 422) {
    return ResultadoEnvio::Descartar;
  }
  if (codigoHttp == 401) {
    Serial.println("Ingesta: 401, token de sensor rechazado; el lote se conserva");
  }
  return ResultadoEnvio::Reintentar;
}
