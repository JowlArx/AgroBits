#include "sensores.h"

#include <DHT.h>
#include <math.h>

#include "config.h"

namespace {
DHT dht(PIN_DHT22_DATOS, DHT22);

// Ordenación por inserción para pocas muestras.
void ordenar(uint32_t* v, size_t n) {
  for (size_t i = 1; i < n; i++) {
    uint32_t clave = v[i];
    size_t j = i;
    while (j > 0 && v[j - 1] > clave) {
      v[j] = v[j - 1];
      j--;
    }
    v[j] = clave;
  }
}
}  // namespace

void sensores::iniciar() {
  pinMode(PIN_FC28_ALIMENTACION, OUTPUT);
  digitalWrite(PIN_FC28_ALIMENTACION, LOW);
  analogSetPinAttenuation(PIN_FC28_ANALOG, ADC_11db);
  analogSetPinAttenuation(PIN_LDR_ANALOG, ADC_11db);
  dht.begin();
}

bool sensores::leerSueloCrudo(uint16_t& raw, float& mv) {
  uint32_t cuentas[FC28_MUESTRAS];
  uint32_t milivoltios[FC28_MUESTRAS];

  // Alimentar solo durante la lectura: un sensor resistivo alimentado de forma continua se corroe por electrólisis.
  digitalWrite(PIN_FC28_ALIMENTACION, HIGH);
  delay(FC28_ESTABILIZACION_MS);
  for (uint8_t i = 0; i < FC28_MUESTRAS; i++) {
    cuentas[i] = analogRead(PIN_FC28_ANALOG);
    milivoltios[i] = analogReadMilliVolts(PIN_FC28_ANALOG);
    delay(20);
  }
  digitalWrite(PIN_FC28_ALIMENTACION, LOW);

  ordenar(cuentas, FC28_MUESTRAS);
  ordenar(milivoltios, FC28_MUESTRAS);
  uint32_t medianaCuentas = cuentas[FC28_MUESTRAS / 2];
  uint32_t medianaMv = milivoltios[FC28_MUESTRAS / 2];

  // Sin señal (0 mV en todas las muestras): cable cortado o pin sin conectar.
  if (medianaMv == 0) {
    return false;
  }
  raw = (uint16_t)medianaCuentas;
  mv = (float)medianaMv;
  return true;
}

float sensores::humedadDesdeMilivoltios(float mv) {
  float rango = FC28_MV_SECO - FC28_MV_HUMEDO;
  float pct = (FC28_MV_SECO - mv) / rango * 100.0f;
  if (pct < 0.0f) pct = 0.0f;
  if (pct > 100.0f) pct = 100.0f;
  return pct;
}

bool sensores::leerHumedadSuelo(float& porcentaje) {
  if (FC28_MV_SECO - FC28_MV_HUMEDO == 0.0f) {
    return false;
  }
  uint16_t raw = 0;
  float mv = 0.0f;
  if (!leerSueloCrudo(raw, mv)) {
    return false;
  }
  porcentaje = humedadDesdeMilivoltios(mv);
  return true;
}

bool sensores::leerDht(float& temperatura, float& humedadAmbiental) {
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  if (isnan(t) || isnan(h)) {
    return false;
  }
  temperatura = t;
  humedadAmbiental = h;
  return true;
}

bool sensores::leerLdrMilivoltios(float& mv) {
  constexpr uint8_t n = 9;
  uint32_t muestras[n];
  for (uint8_t i = 0; i < n; i++) {
    muestras[i] = analogReadMilliVolts(PIN_LDR_ANALOG);
    delay(5);
  }
  ordenar(muestras, n);
  float m = (float)muestras[n / 2];

  // Fuera de rango: sensor desconectado o cortocircuito.
  if (m < 1.0f || m > 3299.0f) {
    return false;
  }
  mv = m;
  return true;
}

float sensores::luxDesdeMilivoltios(float mv) {
  // Divisor 3V3 -> LDR -> nodo -> R_FIJA -> GND: Rldr = R_FIJA * (Vcc - V) / V
  float rLdr = LDR_R_FIJA_OHM * (3300.0f - mv) / mv;
  return LDR_LUX_A * powf(rLdr / LDR_R0_OHM, -LDR_LUX_B);
}

bool sensores::leerLuminosidad(float& lux) {
  float mv = 0.0f;
  if (!leerLdrMilivoltios(mv)) {
    return false;
  }
  lux = luxDesdeMilivoltios(mv);
  return true;
}
