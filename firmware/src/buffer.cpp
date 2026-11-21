#include "buffer.h"

#include <Preferences.h>

#include "config.h"

namespace {
Preferences prefs;
const char* ESPACIO_NVS = "agrobits";
uint32_t cabeza = 0;   // siguiente número de escritura
uint32_t cola = 0;     // siguiente número de lectura
uint32_t sesion = 0;

// Clave NVS: "q" + número de secuencia (máx. 15 caracteres).
String claveDe(uint32_t seq) {
  char buf[16];
  snprintf(buf, sizeof(buf), "q%lu", (unsigned long)seq);
  return String(buf);
}

void guardarPunteros() {
  prefs.putUInt("cab", cabeza);
  prefs.putUInt("cola", cola);
}
}  // namespace

void buffer::iniciar() {
  prefs.begin(ESPACIO_NVS, false);
  cabeza = prefs.getUInt("cab", 0);
  cola = prefs.getUInt("cola", 0);
  sesion = prefs.getUInt("ses", 0) + 1;
  prefs.putUInt("ses", sesion);
  Serial.printf("Buffer: %lu lotes pendientes, sesión %lu\n", (unsigned long)cantidad(), (unsigned long)sesion);
}

uint32_t buffer::sesionActual() {
  return sesion;
}

bool buffer::encolar(const String& lote) {
  if (cabeza - cola >= MAX_LOTES) {
    prefs.remove(claveDe(cola).c_str());
    cola++;
    Serial.println("Buffer lleno: se descarta el lote más antiguo");
  }
  if (prefs.putString(claveDe(cabeza).c_str(), lote) == 0) {
    guardarPunteros();
    return false;
  }
  cabeza++;
  guardarPunteros();
  return true;
}

bool buffer::leerPrimero(String& lote) {
  if (cola == cabeza) {
    return false;
  }
  lote = prefs.getString(claveDe(cola).c_str(), "");
  if (lote.length() == 0) {
    // Entrada corrupta o ausente: se elimina para no bloquear la cola.
    Serial.println("Buffer: entrada vacía descartada");
    descartarPrimero();
    return false;
  }
  return true;
}

void buffer::descartarPrimero() {
  if (cola == cabeza) {
    return;
  }
  prefs.remove(claveDe(cola).c_str());
  cola++;
  guardarPunteros();
}

uint32_t buffer::cantidad() {
  return cabeza - cola;
}
