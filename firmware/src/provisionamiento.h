// Provisionamiento por portal cautivo: WiFi y token de dispositivo guardados en NVS (namespace "agrobits").
#pragma once

#include <Arduino.h>

struct ConfigDispositivo {
  String ssid;
  String password;
  String deviceToken;
};

namespace provisionamiento {
// Lee la configuración de NVS. Llamar una vez al arrancar, antes de cualquier otro uso.
void cargar();
// True si hay SSID válido y token de 64 caracteres hexadecimales.
bool configuracionValida();
// Configuración cargada. No imprimir deviceToken ni password.
const ConfigDispositivo& configuracion();
// True si debe abrirse el portal: sin configuración, reinicio solicitado o BOOT mantenido 3 s al arrancar.
bool debeEntrarEnPortal();
// Levanta AP + portal cautivo. No retorna: termina con reinicio (guardado, borrado o timeout).
void ejecutarPortal();
// Marca el próximo arranque para entrar en portal y reinicia.
void reiniciarEnPortal(const char* motivo);
// Llamar en cada iteración de loop: BOOT mantenido 3 s reinicia en portal.
void vigilarBoton();
}  // namespace provisionamiento
