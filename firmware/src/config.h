// Configuración central de AgroBits firmware (ESP32-C3 SuperMini).
// Pines y cadencia son parte del contrato con la app: cambiarlos exige actualizar el README.
#pragma once

#include <Arduino.h>

#define FW_VERSION "0.1.0"

// Constantes del backend (anon key pública, CA). WiFi y token NO van aquí: se guardan en NVS (portal cautivo).
#include "backend.h"

// ---- Pines (asignación fija) ----
// ADC válido solo en GPIO0-GPIO4 con WiFi activo. Evitar GPIO2, GPIO8, GPIO9, GPIO18, GPIO19.
constexpr uint8_t PIN_FC28_ANALOG = 0;        // GPIO0: salida analógica del FC-28
constexpr uint8_t PIN_LDR_ANALOG = 1;         // GPIO1: divisor con LDR
constexpr uint8_t PIN_DHT22_DATOS = 3;        // GPIO3: datos DHT22
constexpr uint8_t PIN_FC28_ALIMENTACION = 5;  // GPIO5: alimenta el FC-28 solo durante la lectura

// ---- Cadencia ----
// NO cambiar sin avisar: el DLI en base de datos asume una muestra de luminosidad cada 300 s.
constexpr uint32_t INTERVALO_MUESTRA_S = 300;

// ---- Watchdog ----
constexpr uint32_t WDT_TIMEOUT_S = 30;

// ---- Reloj ----
// Epoch mínimo para considerar la hora válida (noviembre de 2023). Anterior = reloj sin sincronizar.
constexpr uint32_t EPOCH_MINIMO_VALIDO = 1700000000UL;
constexpr const char* NTP_SERVIDOR_1 = "pool.ntp.org";
constexpr const char* NTP_SERVIDOR_2 = "time.google.com";

// ---- Buffer NVS ----
constexpr uint16_t MAX_LOTES = 200;
constexpr uint32_t ANTIGUEDAD_MAX_S = 24UL * 3600UL;  // lotes más antiguos se descartan

// ---- Reintentos (backoff exponencial con jitter) ----
constexpr uint32_t BACKOFF_WIFI_BASE_MS = 2000;
constexpr uint32_t BACKOFF_WIFI_MAX_MS = 300000;
constexpr uint32_t TIMEOUT_CONEXION_WIFI_MS = 20000;
constexpr uint32_t BACKOFF_NTP_BASE_MS = 5000;
constexpr uint32_t BACKOFF_NTP_MAX_MS = 300000;
constexpr uint32_t BACKOFF_ENVIO_BASE_MS = 5000;
constexpr uint32_t BACKOFF_ENVIO_MAX_MS = 600000;

// ---- Ingesta ----
constexpr const char* INGESTA_URL = SUPABASE_URL SUPABASE_FUNCTION_PATH;

// ---- Provisionamiento (portal cautivo) ----
constexpr uint8_t PIN_BOTON_BOOT = 9;                       // GPIO9 (BOOT): 3 s pulsado abre el portal
constexpr uint32_t BOOT_PORTAL_MS = 3000;
constexpr uint32_t TIMEOUT_SIN_WIFI_PORTAL_MS = 300000UL;  // 5 min sin WiFi -> reinicio en portal
constexpr uint32_t PORTAL_INACTIVIDAD_MS = 600000UL;        // 10 min sin actividad en el portal -> reinicio
// Contraseña WPA2 del AP del portal. Es compartida por todos los equipos y está documentada en el manual
// Contraseña WPA2 del AP del portal. Se define en include/secrets.h (local, no está en el repositorio).
// Debe tener al menos 8 caracteres. Cada equipo debe tener su propio secrets.h.
#include "secrets.h"

// ---- FC-28 (humedad de suelo, resistivo) ----
// Calibracion de dos puntos medida el 30/10/2026 con esta sonda alimentada a 3V3:
//   al aire (seco): 4095 cuentas, 2897 mV -> 0 %
//   en agua (humedo): ~1220 cuentas, 890-950 mV (se toma 910) -> 100 %
// No es una medida volumetrica: sirve para tendencias y umbrales de riego.
constexpr float FC28_MV_SECO = 2900.0f;     // mV medidos con el sensor en aire
constexpr float FC28_MV_HUMEDO = 910.0f;    // mV medidos con el sensor en agua
constexpr uint8_t FC28_MUESTRAS = 5;        // muestras para la mediana
constexpr uint32_t FC28_ESTABILIZACION_MS = 150;

// ---- LDR (luminosidad) ----
// Montaje: 3V3 -> LDR -> nodo ADC -> R_FIJA -> GND.
// lux = A * pow(R_ldr / R0, -B). Coeficientes derivados del datasheet del GL5549
// (Senba, GL55 series): 100-200 kOhm a 10 lux (se toma 150 kOhm), gamma = 0,9.
//   B = 1/gamma = 1,111
//   A = 10 * (150000 / 10000)^B = 202,7
// Error esperado frente a un luxometro real: +-30 % (CdS, sensible a temperatura).
constexpr float LDR_R_FIJA_OHM = 10000.0f;  // resistencia fija del divisor (10 kOhm)
constexpr float LDR_R0_OHM = 10000.0f;      // referencia de la curva
constexpr float LDR_LUX_A = 202.7f;         // curva GL5549 (datasheet)
constexpr float LDR_LUX_B = 1.111f;         // 1/gamma, gamma = 0,9

// ---- Tipos de lectura (EXACTOS según la API) ----
constexpr const char* TIPO_HUMEDAD_SUELO = "humedad_suelo";
constexpr const char* TIPO_TEMPERATURA = "temperatura";
constexpr const char* TIPO_HUMEDAD_AMBIENTAL = "humedad_ambiental";
constexpr const char* TIPO_LUMINOSIDAD = "luminosidad";
