// Lectura de sensores: FC-28 (humedad de suelo), DHT22 (temperatura y humedad ambiental) y LDR (luz).
#pragma once

#include <Arduino.h>

namespace sensores {
// Configura pines y el DHT22. Llamar una vez en setup.
void iniciar();
// FC-28: alimenta el sensor desde GPIO5 solo durante la lectura y devuelve la mediana en % (no volumétrico).
// Lectura cruda del FC-28: raw en cuentas del ADC (0-4095), mv en milivoltios (mediana).
bool leerSueloCrudo(uint16_t& raw, float& mv);
// Porcentaje relativo a partir de mV, con FC28_MV_SECO / FC28_MV_HUMEDO.
float humedadDesdeMilivoltios(float mv);
bool leerHumedadSuelo(float& porcentaje);
// DHT22: temperatura en °C y humedad relativa en %. Mínimo 2 s entre lecturas.
bool leerDht(float& temperatura, float& humedadAmbiental);
// LDR: mediana de 9 lecturas del ADC en mV. Devuelve false si el valor está fuera de rango.
bool leerLdrMilivoltios(float& mv);
// LDR: conversión pura de mV a lux (curva no calibrada por defecto). Sin acceso a hardware.
float luxDesdeMilivoltios(float mv);
// LDR: estimación de lux a partir del divisor resistivo (curva no calibrada por defecto).
bool leerLuminosidad(float& lux);
}
