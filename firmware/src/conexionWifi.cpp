#include "conexionWifi.h"

#include <WiFi.h>

#include "config.h"
#include "provisionamiento.h"

namespace {
uint8_t intentos = 0;
bool intentoActivo = false;
uint32_t finIntentoMs = 0;
uint32_t proximoIntentoMs = 0;

void lanzarIntento() {
  intentos++;
  intentoActivo = true;
  finIntentoMs = millis() + TIMEOUT_CONEXION_WIFI_MS;
  // La contraseña nunca se imprime; el SSID sí, para diagnóstico.
  const ConfigDispositivo& cfg = provisionamiento::configuracion();
  Serial.printf("WiFi: conectando a %s (intento %u)\n", cfg.ssid.c_str(), intentos);
  WiFi.disconnect(false);
  WiFi.begin(cfg.ssid.c_str(), cfg.password.c_str());
}
}  // namespace

void wifi::iniciar() {
  WiFi.mode(WIFI_STA);
  lanzarIntento();
}

void wifi::mantener() {
  if (conectado()) {
    if (intentoActivo || intentos > 0) {
      Serial.printf("WiFi conectado, IP %s\n", WiFi.localIP().toString().c_str());
    }
    intentoActivo = false;
    intentos = 0;
    return;
  }

  if (intentoActivo) {
    if (millis() < finIntentoMs) {
      return;  // esperando al intento en curso
    }
    intentoActivo = false;
    proximoIntentoMs = millis() + calcularBackoffMs(intentos, BACKOFF_WIFI_BASE_MS, BACKOFF_WIFI_MAX_MS);
    Serial.println("WiFi: sin conexión, reintento con backoff");
    return;
  }

  if (millis() >= proximoIntentoMs) {
    lanzarIntento();
  }
}

bool wifi::conectado() {
  return WiFi.status() == WL_CONNECTED;
}
