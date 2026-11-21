#include "reloj.h"

#include "config.h"
#include "conexionWifi.h"

namespace {
time_t epochArranque = 0;
uint8_t intentosNtp = 0;
uint32_t proximoIntentoNtpMs = 0;
}  // namespace

void reloj::iniciarSincronizacion() {
  configTime(0, 0, NTP_SERVIDOR_1, NTP_SERVIDOR_2);
  proximoIntentoNtpMs = millis() + BACKOFF_NTP_BASE_MS;
}

void reloj::mantener() {
  if (horaValida()) {
    if (epochArranque == 0) {
      epochArranque = time(nullptr) - (time_t)(millis() / 1000UL);
      Serial.println("Reloj: hora NTP válida");
    }
    intentosNtp = 0;
    return;
  }

  if (!wifi::conectado() || millis() < proximoIntentoNtpMs) {
    return;
  }
  intentosNtp++;
  configTime(0, 0, NTP_SERVIDOR_1, NTP_SERVIDOR_2);
  proximoIntentoNtpMs = millis() + calcularBackoffMs(intentosNtp, BACKOFF_NTP_BASE_MS, BACKOFF_NTP_MAX_MS);
  Serial.println("Reloj: esperando sincronización NTP");
}

bool reloj::horaValida() {
  return time(nullptr) >= (time_t)EPOCH_MINIMO_VALIDO;
}

bool reloj::obtenerEpoch(time_t& epoch) {
  if (!horaValida()) {
    return false;
  }
  epoch = time(nullptr);
  return true;
}

String reloj::aIsoUtc(time_t epoch) {
  struct tm tm;
  gmtime_r(&epoch, &tm);
  char buf[32];
  strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%S.000Z", &tm);
  return String(buf);
}

bool reloj::epochArranqueConocido() {
  return epochArranque != 0;
}

time_t reloj::epochDeUptime(uint32_t uptimeS) {
  return epochArranque + (time_t)uptimeS;
}
