#include "provisionamiento.h"

#include <DNSServer.h>
#include <Preferences.h>
#include <cctype>
#include <WebServer.h>
#include <WiFi.h>
#include <esp_task_wdt.h>

#include "config.h"

namespace {
constexpr const char* NVS_NAMESPACE = "agrobits";
constexpr const char* NVS_SSID = "ssid";
constexpr const char* NVS_PASSWORD = "password";
constexpr const char* NVS_TOKEN = "device_token";
constexpr const char* NVS_FORZAR_PORTAL = "forzar_portal";
constexpr size_t SSID_MAX = 32;
constexpr size_t PASSWORD_MAX = 63;
constexpr size_t TOKEN_LEN = 64;
constexpr uint16_t DNS_PUERTO = 53;
constexpr uint16_t HTTP_PUERTO = 80;

ConfigDispositivo cfgActual;
DNSServer dns;
WebServer servidor(HTTP_PUERTO);
uint32_t ultimaActividadMs = 0;
bool pulsando = false;
uint32_t inicioPulsacionMs = 0;

// Redes del último escaneo (caché). Se rellena antes de levantar el AP y en "Volver a buscar redes".
constexpr size_t REDES_MAX = 20;
struct RedEscaneada {
  String ssid;
  int rssi = 0;
  bool conClave = false;
};
RedEscaneada redesCache[REDES_MAX];
size_t numRedesCache = 0;

// ---------- Validación ----------

bool ssidValido(const String& ssid) {
  return ssid.length() > 0 && ssid.length() <= SSID_MAX;
}

// Acepta mayúsculas y espacios alrededor; devuelve el token en minúsculas.
bool normalizarToken(String entrada, String& salida) {
  entrada.trim();
  if (entrada.length() != TOKEN_LEN) {
    return false;
  }
  salida = "";
  for (size_t i = 0; i < entrada.length(); i++) {
    char c = entrada.charAt(i);
    if (!isxdigit((unsigned char)c)) {
      return false;
    }
    salida += (char)tolower((unsigned char)c);
  }
  return true;
}

// ---------- NVS ----------

void escribirFlagForzar(bool valor) {
  Preferences p;
  p.begin(NVS_NAMESPACE, false);
  p.putBool(NVS_FORZAR_PORTAL, valor);
  p.end();
}

// Devuelve el flag y lo borra: el portal forzado es de un solo arranque.
bool leerYBorrarFlagForzar() {
  Preferences p;
  p.begin(NVS_NAMESPACE, false);
  bool forzado = p.getBool(NVS_FORZAR_PORTAL, false);
  if (forzado) {
    p.putBool(NVS_FORZAR_PORTAL, false);
  }
  p.end();
  return forzado;
}

// ---------- Utilidades HTML ----------

String escapar(const String& s) {
  String r;
  for (size_t i = 0; i < s.length(); i++) {
    char c = s.charAt(i);
    switch (c) {
      case '&': r += "&amp;"; break;
      case '<': r += "&lt;"; break;
      case '>': r += "&gt;"; break;
      case '"': r += "&quot;"; break;
      case '\'': r += "&#39;"; break;
      default: r += c; break;
    }
  }
  return r;
}

String cabecera(const char* titulo) {
  String h = "<!DOCTYPE html><html lang=\"es\"><head><meta charset=\"utf-8\">";
  h += "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">";
  h += "<title>";
  h += titulo;
  h += "</title><style>";
  h += "body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;margin:0;padding:16px;";
  h += "background:#f4f7f1;color:#1d2b1f;font-size:18px;line-height:1.4}";
  h += "main{max-width:480px;margin:0 auto}";
  h += "h1{font-size:1.6em;margin:.2em 0 .6em}";
  h += "label{display:block;font-weight:600;margin:16px 0 6px}";
  h += "input,select{width:100%;box-sizing:border-box;font-size:18px;padding:12px;";
  h += "border:2px solid #7a8f7c;border-radius:8px;background:#fff}";
  h += ".ayuda{font-size:15px;color:#4a5b4c;margin:6px 0 0}";
  h += ".error{background:#fde8e8;border:2px solid #b42318;color:#7a1310;padding:12px;border-radius:8px}";
  h += ".estado{background:#e6f0e4;padding:12px;border-radius:8px}";
  h += "button{width:100%;margin-top:24px;padding:14px;font-size:20px;font-weight:700;border:0;";
  h += "border-radius:8px;background:#2f6b3a;color:#fff}";
  h += ".secundario{background:#fff;color:#8a1c12;border:2px solid #8a1c12;margin-top:32px}";
  h += "</style></head><body><main>";
  return h;
}

String pie() {
  return "</main></body></html>";
}

String paginaMensaje(const char* titulo, const char* texto) {
  String h = cabecera(titulo);
  h += "<h1>";
  h += titulo;
  h += "</h1><p class=\"estado\">";
  h += texto;
  h += "</p>";
  h += pie();
  return h;
}

// Escanea redes (bloqueante, unos segundos) y guarda la lista en caché. No cambia el modo WiFi.
void escanearRedes() {
  numRedesCache = 0;
  int n = WiFi.scanNetworks();
  if (n < 0) {
    n = 0;
  }
  for (int i = 0; i < n && numRedesCache < REDES_MAX; i++) {
    String ssid = WiFi.SSID(i);
    if (ssid.length() == 0) {
      continue;  // redes ocultas: se introducen en el campo manual
    }
    redesCache[numRedesCache].ssid = ssid;
    redesCache[numRedesCache].rssi = WiFi.RSSI(i);
    redesCache[numRedesCache].conClave = WiFi.encryptionType(i) != WIFI_AUTH_OPEN;
    numRedesCache++;
  }
  WiFi.scanDelete();
  esp_task_wdt_reset();
}

// Opciones del desplegable a partir de la caché (sin escanear).
String opcionesRedes(const String& ssidElegido) {
  String opciones;
  for (size_t i = 0; i < numRedesCache; i++) {
    const RedEscaneada& r = redesCache[i];
    opciones += "<option value=\"" + escapar(r.ssid) + "\"";
    if (r.ssid == ssidElegido) {
      opciones += " selected";
    }
    opciones += ">" + escapar(r.ssid) + " (" + String(r.rssi) + " dBm)";
    if (r.conClave) {
      opciones += " · con clave";
    }
    opciones += "</option>";
  }
  return opciones;
}

String paginaFormulario(const String& error, const String& ssidEscrito, const String& tokenEscrito) {
  String h = cabecera("Configurar AgroBits");
  h += "<h1>Configurar AgroBits</h1>";

  if (cfgActual.ssid.length() > 0 || cfgActual.deviceToken.length() > 0) {
    h += "<p class=\"estado\">Configuración actual: red <b>" + escapar(cfgActual.ssid) + "</b>";
    if (cfgActual.deviceToken.length() > 0) {
      h += ", Token configurado";
    }
    h += ".</p>";
  }
  if (error.length() > 0) {
    h += "<p class=\"error\">" + escapar(error) + "</p>";
  }

  // Formulario de escaneo separado (no anidado): antes estaba dentro del de guardado y
  // su </form> cerraba el formulario de guardado, de modo que el botón de guardar no enviaba nada.
  h += "<form method=\"GET\" action=\"/\" onsubmit=\"this.querySelector('button').textContent='Buscando redes... puede tardar unos segundos';\">";
  h += "<input type=\"hidden\" name=\"escanear\" value=\"1\">";
  h += "<button type=\"submit\">Volver a buscar redes</button></form>";
  h += "<form method=\"POST\" action=\"/guardar\" autocomplete=\"off\">";
  if (numRedesCache > 0) {
    h += "<label for=\"ssid_lista\">Red WiFi</label>";
    h += "<select id=\"ssid_lista\" name=\"ssid_lista\">";
    h += opcionesRedes(ssidEscrito);
    h += "</select>";
  } else {
    h += "<p class=\"ayuda\">No se encontraron redes. Escribe el nombre de la red abajo.</p>";
  }
  h += "<label for=\"ssid_manual\">Otra red (si no aparece arriba)</label>";
  h += "<input id=\"ssid_manual\" name=\"ssid_manual\" type=\"text\" maxlength=\"32\" value=\"" + escapar(ssidEscrito) + "\">";
  h += "<label for=\"password\">Contraseña WiFi</label>";
  h += "<input id=\"password\" name=\"password\" type=\"password\" maxlength=\"63\">";
  h += "<p class=\"ayuda\">Déjala vacía si la red no tiene contraseña.</p>";
  h += "<label for=\"token\">Token de dispositivo</label>";
  h += "<input id=\"token\" name=\"token\" type=\"text\" inputmode=\"text\" maxlength=\"64\"";
  h += " autocapitalize=\"off\" autocorrect=\"off\" spellcheck=\"false\" value=\"" + escapar(tokenEscrito) + "\">";
  h += "<p class=\"ayuda\">Pégalo desde AgroBits → Sensores → Token de dispositivo (64 caracteres).</p>";
  h += "<button type=\"submit\">Guardar y conectar</button></form>";

  if (cfgActual.ssid.length() > 0 || cfgActual.deviceToken.length() > 0) {
    h += "<form method=\"POST\" action=\"/borrar\" onsubmit=\"return confirm('¿Borrar la configuración? ";
    h += "El equipo dejará de enviar datos hasta que se configure de nuevo.');\">";
    h += "<button class=\"secundario\" type=\"submit\">Borrar configuración</button></form>";
  }
  h += pie();
  return h;
}

// ---------- Handlers del portal ----------

void tocarActividad() {
  ultimaActividadMs = millis();
}

void manejarRaiz() {
  tocarActividad();
  Serial.println("portal: GET /");
  if (servidor.hasArg("escanear")) {
    escanearRedes();  // AP activo: el escaneo puede tardar unos segundos
    tocarActividad();
  }
  servidor.send(200, "text/html; charset=utf-8", paginaFormulario("", "", ""));
}

void manejarGuardar() {
  tocarActividad();
  String ssid = servidor.arg("ssid_manual");
  ssid.trim();
  if (ssid.length() == 0) {
    ssid = servidor.arg("ssid_lista");
    ssid.trim();
  }
  String password = servidor.arg("password");  // no se reescribe en el formulario
  String tokenEntrada = servidor.arg("token");
  String token;

  Serial.printf("portal: POST /guardar (ssid=%u, token=%u)\n",
                (unsigned)ssid.length(), (unsigned)tokenEntrada.length());

  String error;
  if (!ssidValido(ssid)) {
    error = "Indica el nombre de la red WiFi (entre 1 y 32 caracteres).";
  } else if (password.length() > PASSWORD_MAX) {
    error = "La contraseña WiFi no puede tener más de 63 caracteres.";
  } else if (!normalizarToken(tokenEntrada, token)) {
    error = "El token debe tener exactamente 64 caracteres hexadecimales (0-9 y a-f). Cópialo de AgroBits → Sensores → Token de dispositivo.";
  }

  if (error.length() > 0) {
    Serial.printf("portal: validacion fallida: %s\n", error.c_str());
    servidor.send(200, "text/html; charset=utf-8", paginaFormulario(error, ssid, tokenEntrada));
    return;
  }

  Preferences p;
  p.begin(NVS_NAMESPACE, false);
  size_t escritoSsid = p.putString(NVS_SSID, ssid);
  p.putString(NVS_PASSWORD, password);
  size_t escritoToken = p.putString(NVS_TOKEN, token);
  p.end();

  if (escritoSsid == 0 || escritoToken == 0) {
    Serial.println("PORTAL: error al escribir en NVS");
    servidor.send(200, "text/html; charset=utf-8",
                  paginaFormulario("No se pudo guardar la configuración en el equipo. Inténtalo de nuevo.", ssid, tokenEntrada));
    return;
  }

  Serial.println("portal: config guardada, reiniciando");
  servidor.send(200, "text/html; charset=utf-8",
                paginaMensaje("Configuración guardada", "Configuración guardada. Reiniciando…"));
  delay(1000);
  ESP.restart();
}

void manejarBorrar() {
  tocarActividad();
  Preferences p;
  p.begin(NVS_NAMESPACE, false);
  p.clear();
  p.end();
  Serial.println("PORTAL: configuración borrada, reiniciando");
  servidor.send(200, "text/html; charset=utf-8",
                paginaMensaje("Configuración borrada", "Configuración borrada. Reiniciando…"));
  delay(1000);
  ESP.restart();
}

// Cualquier otra ruta (detección de portal cautivo del móvil) se redirige a la página de configuración.
void redirigirAPortal() {
  tocarActividad();
  servidor.sendHeader("Location", "http://" + WiFi.softAPIP().toString() + "/", true);
  servidor.send(302, "text/plain", "");
}

// Nombre del AP: AgroBits-XXXX con los 4 últimos hex de la MAC.
String nombreAp() {
  uint8_t mac[6];
  WiFi.macAddress(mac);
  char buf[16];
  snprintf(buf, sizeof(buf), "AgroBits-%02X%02X", mac[4], mac[5]);
  return String(buf);
}

// BOOT mantenido 3 s durante el arranque (solo se detecta si el chip no entra en modo descarga).
bool botonMantenidoAlArrancar() {
  pinMode(PIN_BOTON_BOOT, INPUT_PULLUP);
  if (digitalRead(PIN_BOTON_BOOT) == HIGH) {
    return false;
  }
  Serial.println("BOOT pulsado al arrancar: mantenlo 3 s para abrir el portal");
  uint32_t inicio = millis();
  while (millis() - inicio < BOOT_PORTAL_MS) {
    if (digitalRead(PIN_BOTON_BOOT) == HIGH) {
      return false;
    }
    esp_task_wdt_reset();
    delay(20);
  }
  return true;
}
}  // namespace

void provisionamiento::cargar() {
  Preferences p;
  p.begin(NVS_NAMESPACE, true);
  cfgActual.ssid = p.getString(NVS_SSID, "");
  cfgActual.password = p.getString(NVS_PASSWORD, "");
  cfgActual.deviceToken = p.getString(NVS_TOKEN, "");
  p.end();
}

bool provisionamiento::configuracionValida() {
  String token;
  return ssidValido(cfgActual.ssid) && normalizarToken(cfgActual.deviceToken, token);
}

const ConfigDispositivo& provisionamiento::configuracion() {
  return cfgActual;
}

bool provisionamiento::debeEntrarEnPortal() {
  bool forzado = leerYBorrarFlagForzar();
  if (!configuracionValida()) {
    Serial.println("Config: sin configuración → portal");
    return true;
  }
  if (forzado) {
    Serial.println("Config: reinicio solicitado → portal");
    return true;
  }
  if (botonMantenidoAlArrancar()) {
    Serial.println("Config: BOOT mantenido → portal");
    return true;
  }
  Serial.println("Config: config OK");
  return false;
}

void provisionamiento::ejecutarPortal() {
  String nombre = nombreAp();
  // Escaneo ANTES de levantar el AP: con el AP activo interrumpe clientes y devuelve menos redes.
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  delay(100);
  escanearRedes();
  WiFi.mode(WIFI_AP_STA);
  WiFi.softAP(nombre.c_str(), PORTAL_PASSWORD);  // WPA2 con contraseña fija (config.h)
  IPAddress ip = WiFi.softAPIP();

  dns.start(DNS_PUERTO, "*", ip);  // todo nombre resuelve al equipo

  servidor.on("/", HTTP_GET, manejarRaiz);
  servidor.on("/guardar", HTTP_POST, manejarGuardar);
  servidor.on("/borrar", HTTP_POST, manejarBorrar);
  servidor.onNotFound(redirigirAPortal);
  servidor.begin();

  tocarActividad();
  Serial.printf("PORTAL: AP WPA2 %s. Abre http://%s/\n", nombre.c_str(), ip.toString().c_str());

  while (true) {
    esp_task_wdt_reset();
    dns.processNextRequest();
    servidor.handleClient();
    if (millis() - ultimaActividadMs > PORTAL_INACTIVIDAD_MS) {
      Serial.println("PORTAL: 10 min sin actividad, reinicio");
      ESP.restart();
    }
    delay(10);
  }
}

void provisionamiento::reiniciarEnPortal(const char* motivo) {
  Serial.printf("PORTAL: reinicio a portal (%s)\n", motivo);
  escribirFlagForzar(true);
  delay(200);
  ESP.restart();
}

void provisionamiento::vigilarBoton() {
  if (digitalRead(PIN_BOTON_BOOT) == HIGH) {
    pulsando = false;
    return;
  }
  if (!pulsando) {
    pulsando = true;
    inicioPulsacionMs = millis();
    return;
  }
  if (millis() - inicioPulsacionMs >= BOOT_PORTAL_MS) {
    reiniciarEnPortal("BOOT mantenido 3 s");
  }
}
