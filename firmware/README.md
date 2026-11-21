# AgroBits — firmware (ESP32-C3 SuperMini)

Firmware que lee humedad de suelo, temperatura/humedad ambiental y luminosidad cada 5 minutos, guarda cada lote en NVS y lo envía a la función de ingesta de Supabase.

Estado: **0.1.0. Compila con PlatformIO (verificado el 30/10/2026); sin validar en hardware.** Ver "Limitaciones conocidas".

## Hardware

Placa: ESP32-C3 SuperMini (RISC-V, 4 MB flash, sin PSRAM, USB-CDC nativo).

| Señal | GPIO | Notas |
|---|---|---|
| FC-28 salida analógica | GPIO0 | ADC1 canal 0 |
| LDR divisor | GPIO1 | ADC1 canal 1 |
| DHT22 datos | GPIO3 | Resistencia pull-up de 4,7–10 kΩ a 3V3 si el módulo no la trae |
| FC-28 alimentación conmutada | GPIO5 | Alimenta el FC-28 solo durante la lectura |

Evitar en otros usos: GPIO2, GPIO8, GPIO9 (strapping), GPIO18/GPIO19 (USB). El ADC solo es válido en GPIO0–GPIO4 con WiFi activo.

### Cableado

- **FC-28**: VCC → GPIO5, GND → GND, AO → GPIO0. El pin VCC **no** va a 3V3 fijo: el firmware lo alimenta desde GPIO5 durante cada lectura.
- **LDR**: 3V3 → LDR → GPIO1 → resistencia fija (R_FIJA, 10 kΩ por defecto) → GND. Medir la R_FIJA real y ajustar `LDR_R_FIJA_OHM` en `src/config.h`.
- **DHT22**: VCC → 3V3, GND → GND, DATA → GPIO3.

## Instalación para el cliente final

Un único binario sirve para todos los clientes. La WiFi y el token del dispositivo **no se compilan**: el cliente los introduce desde el móvil en un portal cautivo y se guardan en la NVS del ESP32.

1. Conecta el equipo a la corriente. Sin configuración arranca directamente en el portal.
2. Con el móvil, busca la WiFi **`AgroBits-XXXX`** (XXXX = 4 caracteres de la placa) y únete. Va protegida con WPA2 y la contraseña **`<PORTAL_PASSWORD: ver firmware/include/secrets.h>`** (impresa en la etiqueta del kit). Si cambias el valor en secrets.h, la etiqueta del kit deja de coincidir con el dispositivo. Para cambiarla, edita `PORTAL_PASSWORD` en `firmware/include/secrets.h` (mínimo 8 caracteres) y vuelve a compilar y flashear.
3. Se abre sola la página de configuración. Si no se abre, entra en `http://192.168.4.1/` con el navegador.
4. Elige tu red WiFi en la lista (o escríbela en "Otra red" si no aparece).
5. Escribe la contraseña de tu WiFi (déjala vacía si la red es abierta).
6. En AgroBits (web), ve a **Sensores → Token de dispositivo**, copia el token (64 caracteres) y pégalo en el campo "Token de dispositivo".
7. Pulsa **Guardar y conectar**. El equipo se reinicia y empieza a enviar lecturas cada 5 minutos.

Para **volver a abrir el portal** (cambiar de red o de token): mantén pulsado el botón **BOOT** de la placa durante 3 s y suéltalo. El equipo también vuelve al portal solo si no logra conectar a la WiFi durante 5 minutos, y sale del portal sin actividad tras 10 minutos.

Para **borrar la configuración**: abre el portal y pulsa "Borrar configuración" (pide confirmación). Tras reiniciar, el equipo vuelve al portal sin configuración.

El token se valida en el portal (64 caracteres hexadecimales). La página nunca muestra el token ni la contraseña guardados.

### Constantes del backend (versionadas)

`include/backend.h` contiene la URL de Supabase, la anon key (**pública por diseño**: va en el bundle web), la ruta de la función y la CA de TLS. El secreto real es el token de dispositivo, que vive solo en la NVS.

**CA de TLS embebida:** `AGROBITS_CA_PEM` contiene la GTS Root R4 (Google Trust Services, autofirmada, válida hasta 22/06/2036). Cadena observada: `supabase.co` ← `WE1` ← `GTS Root R4` ← `GlobalSign Root CA`. Si Supabase cambia de CA, hay que sustituir ese bloque PEM y recompilar.

**Verificación del 21/11/2026:** `openssl s_client` confirma la cadena del servidor (verify OK: `supabase.co` ← `WE1` ← `GTS Root R4`). El código usa `setCACert` y no `setInsecure()`. La prueba negativa en el dispositivo se omitió por decisión del responsable.

`include/secrets.h` (no versionado, en `firmware/.gitignore`) solo sirve para overrides de desarrollo; el cliente no lo necesita. Plantilla en `include/secrets.example.h`. **No versionar valores reales.**

### Mantenimiento de la CA de TLS (solo desarrolladores)

El cliente no necesita hacer esto. El firmware usa `WiFiClientSecure` con `setCACert`. **No se usa `setInsecure()`.**

```bash
openssl s_client -showcerts -servername fxiukidjxdcsrhyiphmu.supabase.co \
  -connect fxiukidjxdcsrhyiphmu.supabase.co:443 < /dev/null
```

En la salida, copia el bloque `-----BEGIN CERTIFICATE-----` ... `-----END CERTIFICATE-----` de la CA emisora (la última del bloque o la intermedia, según la cadena) en `AGROBITS_CA_PEM`. Si el certificado cambia en el futuro, repite el proceso; si la conexión empieza a fallar con TLS, es la primera comprobación.

## Calibración

### FC-28 (humedad de suelo)

Es un sensor **resistivo**: mide la conductividad eléctrica del suelo, que depende de la humedad, la sal y la temperatura. El porcentaje es un índice relativo calibrado, **no** un contenido volumétrico de agua real.

1. Con el sensor en aire seco, leer por serie la línea `SUELO,raw,mv,pct` y anotar el valor `mv` como `FC28_MV_SECO`.
2. Con el sensor sumergido hasta la marca en un vaso de agua, anotar el valor `mv` como `FC28_MV_HUMEDO`.
3. Ajustar ambas constantes en `src/config.h`. Valores medidos el 30/10/2026 con esta sonda a 3V3: **aire 2897 mV → 0 %** y **agua 890–950 mV (se toma 910) → 100 %** (`FC28_MV_SECO = 2900`, `FC28_MV_HUMEDO = 910`). En aire el ADC satura en 4095 cuentas, así que el extremo seco tiene poca resolución: la humedad baja se detecta bien, pero no se distingue un 5 % de un 0 %.

El FC-28 se calibra con **dos puntos en mV**: aire (seco) y agua (húmedo). No usar las cuentas del ADC (0–4095, columna `raw`) como referencia: la escala del ESP32-C3 no llega a 3,3 V, así que las cuentas no son comparables entre sensores ni sesiones. Solo `mv` es el valor de calibración; `raw` se muestra únicamente para diagnóstico.

Recalibrar con el mismo tipo de suelo que se va a monitorizar.

### LDR (luminosidad)

Conversión: `lux = LDR_LUX_A * pow(R_ldr / LDR_R0_OHM, -LDR_LUX_B)`, con `R_ldr = LDR_R_FIJA_OHM * (3300 - mV) / mV`. La lectura es la mediana de 9 muestras del ADC.

Los coeficientes están **derivados del datasheet del GL5549** (Senba, GL55 series): 100–200 kΩ a 10 lux (se toma 150 kΩ), γ = 0,9 y 10 MΩ en oscuridad. De ahí `LDR_LUX_B = 1/γ = 1,111` y `LDR_LUX_A = 10 · (150000/10000)^B = 202,7`. Error esperado frente a un luxómetro real: **±30 %** (el CdS depende de la temperatura y envejece). El DLI calculado con esta curva es orientativo, no agronómico.

#### Procedimiento de calibración (ejecutable)

Desde `firmware/`:

1. Compilar y flashear el entorno de calibración: `pio run -e calibracion -t upload`
2. Abrir el monitor: `pio device monitor -b 115200`. Aparecen las cabeceras `# LDR,mv,ohm,lux`, `# SUELO,raw,mv,pct` y `# AIRE,temp_c,hr`. Cada 2 s salen tres líneas: `LDR,mv,ohm,lux`, `SUELO,raw,mv,pct` y `AIRE,temp_c,hr`. El modo calibración no arranca WiFi, NTP ni el portal.
3. Tomar 6 puntos: oscuridad, interior apagado, interior encendido, junto a ventana, sombra exterior, exterior directo.
4. En cada punto, esperar 10 s a que se estabilice, y anotar `mv` y el lux del luxómetro de referencia junto a la línea CSV. Si aparece `LDR,ERROR` o `SUELO,ERROR`, el valor está fuera de rango: revisar el cableado.
5. Pasar los pares (mv, lux de referencia) a quien ajuste la curva.
6. Al terminar, volver al firmware normal: `pio run -e esp32c3 -t upload`.

Advertencias:
- Saturación: cerca de 3300 mV el divisor se satura y distintos niveles altos dan casi el mismo `mv`.
- El LDR no es un sensor fotométrico: su respuesta espectral difiere de la del ojo y del luxómetro. Los lux son una estimación, no una medida fotométrica.

## Cadencia

- **Intervalo fijo de 300 s (5 minutos)**, alineado a múltiplos de 300 s de la hora UTC cuando hay hora válida.
- El DLI en base de datos asume **exactamente una muestra de `luminosidad` cada 300 s**. No cambiar `INTERVALO_MUESTRA_S` sin actualizar la app y este README.

## Hora

- Se sincroniza NTP al arrancar y se reintenta con backoff mientras no haya hora válida.
- Si no hay hora fiable, el lote se guarda con marca de uptime y **no se envía**. Cuando la hora se sincroniza en la misma sesión, la marca se convierte a hora real. Los lotes de sesiones anteriores sin hora se descartan, porque no se pueden datar.

## Formato de la ingesta

`POST https://fxiukidjxdcsrhyiphmu.supabase.co/functions/v1/ingesta`

Cabeceras: `Authorization: Bearer <anon key>`, `x-device-token: <token>`, `Content-Type: application/json`.

```json
{"lecturas":[
  {"tipo":"humedad_suelo","valor":50.0,"unidad":"% vol","medida_en":"2026-10-29T10:00:00.000Z"},
  {"tipo":"temperatura","valor":21.4,"unidad":"°C","medida_en":"2026-10-29T10:00:00.000Z"},
  {"tipo":"humedad_ambiental","valor":55.2,"unidad":"% HR","medida_en":"2026-10-29T10:00:00.000Z"},
  {"tipo":"luminosidad","valor":12000,"unidad":"lux","medida_en":"2026-10-29T10:00:00.000Z"}
]}
```

Un lote contiene como máximo 4 lecturas (una por tipo). Tipos y unidades son exactos. Si un sensor no devuelve valor en un ciclo, su lectura se omite.

Respuestas: 200 se confirma y el lote sale de la cola. 422 se descarta el lote. 401, 5xx o error de red conservan el lote y reintentan con backoff exponencial y jitter. El buffer se reenvía solo con lecturas de hasta 24 h de antigüedad; las más antiguas se descartan. La ingesta rechaza `medida_en` fuera de esa ventana de 24 h (422).

## Compilar y flashear

Requiere PlatformIO CLI o la extensión de VS Code.

```bash
cd firmware
pio run                  # compilar
pio run -t upload        # flashear
pio device monitor       # log serie a 115200
```

`platformio.ini` define dos flags de USB, ambas necesarias:

- `-DARDUINO_USB_MODE=1`: sin ella, el core busca `USBSerial` y la compilación falla.
- `-DARDUINO_USB_CDC_ON_BOOT=1`: sin ella, el log serie no sale por el USB del C3 SuperMini.

Tabla de particiones: `board_build.partitions = huge_app.csv`. Con la tabla por defecto la flash quedaba al 94,2 %; con esta, al 41,6 % (compilación del 30/10/2026).

Nombres de módulos: los de conexión se llaman `conexionWifi.*`. Un `wifi.h` local colisiona con `<WiFi.h>` en Windows, así que no usar ese nombre.

Cifras de la última compilación (30/10/2026): ESP32-C3, RAM 12,0 % (39 192 B de 327 680 B), flash 41,6 % (1 310 077 B de 3 145 728 B).

## Logs

El log serie no imprime WiFi, token, anon key ni cuerpo de respuesta. Solo muestra estado, códigos HTTP y contadores.

### Depuración por serie

El log serie usa 115200 baudios (`pio device monitor -b 115200`). Las líneas de datos dependen del modo de compilación:

- **Modo calibración** (`pio run -e calibracion`): cada 2 s imprime tres líneas CSV, sin WiFi ni envío:
  - `LDR,mv,ohm,lux`: luminosidad (LDR). Si la lectura está fuera de rango, `LDR,ERROR`.
  - `SUELO,raw,mv,pct`: humedad de suelo (FC-28). Si falla, `SUELO,ERROR`.
  - `AIRE,temp_c,hr`: temperatura y humedad ambiental (DHT22), con 1 decimal. Si el DHT22 no da una lectura válida, `AIRE,ERROR`. El DHT22 necesita al menos 2 s entre lecturas, por eso se lee una vez por ciclo.
- **Modo normal** (`pio run -e esp32c3`): imprime **una línea `MUESTRA` por ciclo de muestreo, es decir, cada 5 minutos** (la cadencia de muestreo), no cada 2 segundos ni por cada lectura individual:

  ```
  MUESTRA temp=23.4 hr=55.1 suelo=62.3 lux=1200 enviado=1
  ```

  - `temp` y `hr` provienen del DHT22; `suelo` del FC-28 (%); `lux` del LDR. Un valor no leído en ese ciclo aparece como `NA`.
  - `enviado=1` indica que en ese ciclo se envió un lote a la ingesta. `enviado=0` indica que no se envió (sin red, sin hora válida, o en espera de reintento) y añade `cola=<n>` con el número de lotes pendientes en el buffer.
  - La línea nunca incluye el token, la anon key ni la contraseña WiFi.
  - Los fallos de cada sensor (`DHT22: lectura no válida`, etc.) se siguen imprimiendo como mensajes independientes.

## Limitaciones conocidas

- **Validación en hardware.** La compilación está verificada (30/10/2026). El portal cautivo se verificó el 30/10/2026; la reapertura con BOOT y el envío de lecturas a la app quedaron verificados por el responsable a finales de octubre de 2026. **TLS:** verificado el 21/11/2026 (cadena y código; prueba negativa omitida por decisión del responsable). GPIO9 es pin de strapping: mantén BOOT pulsado con el equipo ya encendido, no al encender.
- **Sin idempotencia en la ingesta.** `measurements` no tiene índice único `(sensor_id, tipo, measured_at)` porque ya hay 2 104 grupos duplicados (generados por el simulador). Si se pierde la respuesta HTTP tras una inserción correcta, el reenvío puede duplicar filas. Añadir el índice requiere limpiar datos, con aprobación humana.
- **Calibración pendiente** de FC-28 y LDR. Los valores por defecto no son fiables.
- **Capacidad del buffer NVS.** `MAX_LOTES = 200`, pero la partición NVS por defecto de 4 MB (≈20 KB) probablemente no admita 200 lotes de este tamaño. Estimación: de unos 80 a 100 lotes antes de que `encolar` falle. Si se necesitan 200, hay que definir una tabla de particiones con una NVS mayor. Hasta comprobarlo, tratar el límite real como desconocido.
- **Huecos en el DLI** si el LDR falla en un ciclo: no hay interpolación.
- **Cola con retardo**: se envía un lote por iteración, así que tras una caída larga el vaciado tarda varios minutos.
- **Lotes de sesiones anteriores sin hora** se descartan al arrancar con hora válida.
- **Reloj del ESP32**: si la hora NTP llega tarde, las primeras muestras van con marca de uptime; el ajuste depende de que no haya reinicios entre el muestreo y la sincronización.
- **Sin firmware OTA** ni gestión remota de configuración.
- **Watchdog de 30 s** con reset en cada iteración de `loop`. Un POST que tarde más de 10 s por timeout puede acercarse al límite en redes muy lentas.
