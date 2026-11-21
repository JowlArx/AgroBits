// AgroBits firmware: muestrea cada 5 minutos, guarda el lote en NVS y lo envía a la ingesta.
#include <Arduino.h>
#include <esp_idf_version.h>
#include <esp_task_wdt.h>

#include "buffer.h"
#include "config.h"
#include "ingesta.h"
#include "provisionamiento.h"
#include "reloj.h"
#include "sensores.h"
#include "conexionWifi.h"

namespace {
uint32_t ultimaWifiOkMs = 0;     // último instante con WiFi conectado (para el timeout a portal)
uint32_t proximaMuestraMs = 0;   // programación sin hora válida
time_t proximaMuestraEpoch = 0;  // programación alineada a múltiplos de 300 s con hora válida
uint8_t intentosEnvio = 0;
uint32_t proximoEnvioMs = 0;
// Últimas lecturas del ciclo, para la línea MUESTRA (NAN = no leída en este ciclo).
float muestraTemp = NAN;
float muestraHr = NAN;
float muestraSuelo = NAN;
float muestraLux = NAN;

void iniciarWatchdog() {
#if ESP_IDF_VERSION_MAJOR >= 5
  esp_task_wdt_config_t cfg = {};
  cfg.timeout_ms = WDT_TIMEOUT_S * 1000;
  cfg.idle_core_mask = 0;
  cfg.trigger_panic = true;
  esp_task_wdt_deinit();  // ignora error si no estaba activo
  esp_task_wdt_init(&cfg);
#else
  esp_task_wdt_init(WDT_TIMEOUT_S, true);
#endif
  esp_task_wdt_add(NULL);
}

// Siguiente múltiplo de INTERVALO_MUESTRA_S estrictamente posterior a t.
time_t siguienteFrontera(time_t t) {
  return (t / INTERVALO_MUESTRA_S + 1) * INTERVALO_MUESTRA_S;
}

// Decide si toca muestrear: frontera de 300 s si hay hora válida; si no, cada 300 s desde el arranque.
bool tocaMuestrear() {
  if (reloj::horaValida()) {
    time_t ahora = time(nullptr);
    if (proximaMuestraEpoch == 0) {
      proximaMuestraEpoch = siguienteFrontera(ahora);
      return false;
    }
    if (ahora >= proximaMuestraEpoch) {
      proximaMuestraEpoch = siguienteFrontera(ahora);
      return true;
    }
    return false;
  }
  if (millis() >= proximaMuestraMs) {
    proximaMuestraMs = millis() + INTERVALO_MUESTRA_S * 1000UL;
    return true;
  }
  return false;
}

// Sin WiFi durante 5 min (red cambiada o clave errónea): vuelve al portal para reconfigurar.
void vigilarSinWifi() {
  if (wifi::conectado()) {
    ultimaWifiOkMs = millis();
    return;
  }
  if (millis() - ultimaWifiOkMs > TIMEOUT_SIN_WIFI_PORTAL_MS) {
    provisionamiento::reiniciarEnPortal("sin WiFi durante 5 min");
  }
}

void muestrear() {
  Lectura lecturas[4];
  size_t n = 0;
  muestraTemp = muestraHr = muestraSuelo = muestraLux = NAN;

  float v = 0.0f;
  if (sensores::leerHumedadSuelo(v)) {
    muestraSuelo = v;
    lecturas[n++] = {TIPO_HUMEDAD_SUELO, v};
  } else {
    Serial.println("FC-28: lectura no válida");
  }

  float temperatura = 0.0f;
  float humedad = 0.0f;
  if (sensores::leerDht(temperatura, humedad)) {
    muestraTemp = temperatura;
    muestraHr = humedad;
    lecturas[n++] = {TIPO_TEMPERATURA, temperatura};
    lecturas[n++] = {TIPO_HUMEDAD_AMBIENTAL, humedad};
  } else {
    Serial.println("DHT22: lectura no válida");
  }

  if (sensores::leerLuminosidad(v)) {
    muestraLux = v;
    lecturas[n++] = {TIPO_LUMINOSIDAD, v};
  } else {
    Serial.println("LDR: lectura no válida");
  }

  if (n == 0) {
    Serial.println("Ciclo sin lecturas válidas");
    return;
  }

  bool hora = reloj::horaValida();
  time_t ahora = 0;
  if (hora) {
    reloj::obtenerEpoch(ahora);
  }
  String lote = ingesta::codificarLote(lecturas, n, hora, ahora);
  if (!buffer::encolar(lote)) {
    Serial.println("NVS: no se pudo guardar el lote");
    return;
  }
  Serial.printf("Lote muestreado: %u lecturas, pendientes %lu\n", (unsigned)n, (unsigned long)buffer::cantidad());
}

// Envía como máximo un lote por iteración para no bloquear el ciclo.
// Devuelve true si en esta iteración se envió un lote a la ingesta.
bool enviarPendientes() {
  if (!wifi::conectado() || !reloj::horaValida()) {
    return false;
  }
  if (millis() < proximoEnvioMs) {
    return false;
  }
  String lote;
  if (!buffer::leerPrimero(lote)) {
    return false;
  }

  int codigo = 0;
  bool enviado = false;
  ResultadoEnvio resultado = ingesta::enviarLote(lote, codigo);
  switch (resultado) {
    case ResultadoEnvio::Enviado:
      buffer::descartarPrimero();
      intentosEnvio = 0;
      enviado = true;
      Serial.printf("Lote enviado, pendientes %lu\n", (unsigned long)buffer::cantidad());
      break;
    case ResultadoEnvio::Descartar:
      buffer::descartarPrimero();
      Serial.printf("Lote descartado (HTTP %d)\n", codigo);
      break;
    case ResultadoEnvio::EsperarHora:
      break;
    case ResultadoEnvio::Reintentar:
      intentosEnvio++;
      proximoEnvioMs = millis() + calcularBackoffMs(intentosEnvio, BACKOFF_ENVIO_BASE_MS, BACKOFF_ENVIO_MAX_MS);
      Serial.printf("Envío fallido (HTTP %d), reintento con backoff\n", codigo);
      break;
  }
  return enviado;
}

// Una línea por ciclo de muestreo con las magnitudes leídas. Sin secretos.
void formatearValor(float v, uint8_t decimales, char* salida, size_t tam) {
  if (isnan(v)) {
    snprintf(salida, tam, "NA");
  } else {
    snprintf(salida, tam, "%.*f", decimales, v);
  }
}

void imprimirMuestra(bool enviado) {
  char temp[16];
  char hr[16];
  char suelo[16];
  char lux[16];
  formatearValor(muestraTemp, 1, temp, sizeof(temp));
  formatearValor(muestraHr, 1, hr, sizeof(hr));
  formatearValor(muestraSuelo, 1, suelo, sizeof(suelo));
  formatearValor(muestraLux, 0, lux, sizeof(lux));
  Serial.printf("MUESTRA temp=%s hr=%s suelo=%s lux=%s enviado=%d", temp, hr, suelo, lux, enviado ? 1 : 0);
  if (!enviado) {
    Serial.printf(" cola=%lu", (unsigned long)buffer::cantidad());
  }
  Serial.println();
}
#ifdef AGROBITS_CALIBRACION_LDR
// Modo calibración: una línea CSV por lectura para anotar junto al luxómetro de referencia.
void imprimirCalibracionLdr() {
  float mv = 0.0f;
  if (!sensores::leerLdrMilivoltios(mv)) {
    Serial.println("LDR,ERROR");
    return;
  }
  float ohm = LDR_R_FIJA_OHM * (3300.0f - mv) / mv;
  float lux = sensores::luxDesdeMilivoltios(mv);
  Serial.printf("LDR,%.1f,%.0f,%.2f\n", mv, ohm, lux);
}

// Modo calibración DHT22: temperatura y humedad ambiental, una lectura por ciclo.
void imprimirCalibracionAire() {
  float temperatura = 0.0f;
  float humedad = 0.0f;
  if (!sensores::leerDht(temperatura, humedad) || isnan(temperatura) || isnan(humedad)) {
    Serial.println("AIRE,ERROR");
    return;
  }
  Serial.printf("AIRE,%.1f,%.1f\n", temperatura, humedad);
}

// Modo calibración FC-28: raw (cuentas ADC), mv y porcentaje relativo.
void imprimirCalibracionSuelo() {
  uint16_t raw = 0;
  float mv = 0.0f;
  if (!sensores::leerSueloCrudo(raw, mv)) {
    Serial.println("SUELO,ERROR");
    return;
  }
  float pct = sensores::humedadDesdeMilivoltios(mv);
  Serial.printf("SUELO,%u,%.1f,%.1f\n", (unsigned)raw, mv, pct);
}
#endif
}  // namespace

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.printf("AgroBits firmware %s\n", FW_VERSION);

#ifdef AGROBITS_CALIBRACION_LDR
  // Modo calibración: sin WiFi, NTP ni portal; solo CSV por serie.
  sensores::iniciar();
  Serial.println("# LDR,mv,ohm,lux");
  Serial.println("# SUELO,raw,mv,pct");
  Serial.println("# AIRE,temp_c,hr");
  Serial.println("# anota lux del luxometro junto a cada linea");
  return;
#endif

  iniciarWatchdog();

  // Sin configuración (o con BOOT mantenido 3 s) el equipo se queda en el portal cautivo.
  provisionamiento::cargar();
  if (provisionamiento::debeEntrarEnPortal()) {
    provisionamiento::ejecutarPortal();  // no retorna: termina con reinicio
  }

  sensores::iniciar();
  buffer::iniciar();
  wifi::iniciar();
  ultimaWifiOkMs = millis();
  reloj::iniciarSincronizacion();

  // El DHT22 necesita al menos 2 s desde el encendido antes de la primera lectura.
  proximaMuestraMs = millis() + 3000UL;
}

void loop() {
#ifdef AGROBITS_CALIBRACION_LDR
  imprimirCalibracionLdr();
  imprimirCalibracionSuelo();
  imprimirCalibracionAire();
  delay(2000);
  return;
#endif

  esp_task_wdt_reset();
  provisionamiento::vigilarBoton();
  wifi::mantener();
  vigilarSinWifi();
  reloj::mantener();

  bool toca = tocaMuestrear();
  if (toca) {
    muestrear();
  }
  bool enviado = enviarPendientes();
  if (toca) {
    imprimirMuestra(enviado);
  }

  delay(100);
}
