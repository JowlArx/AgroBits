# Manual de instalación del sensor AgroBits

Este manual explica cómo poner en marcha el sensor de AgroBits en tu finca. No necesitas conocimientos técnicos ni cables adicionales: todo se hace desde tu móvil.

## Qué necesitas

- El equipo AgroBits (la placa pequeña con los sensores conectados).
- Un cargador USB de móvil y el cable de alimentación.
- Tu móvil con la WiFi de tu casa o de la finca.
- La contraseña de esa WiFi.
- La aplicación AgroBits en el navegador del móvil, con tu cuenta iniciada.

## Paso a paso

1. **Conecta el equipo a la corriente** con el cargador USB. Espera unos segundos a que arranque.
   Sin configuración, el equipo siempre arranca en modo de configuración.

2. **Busca la red WiFi del equipo** en la lista de redes de tu móvil. Se llama **`AgroBits-XXXX`** (las XXXX son cuatro caracteres propios de tu equipo). Está protegida con la contraseña que facilita el equipo técnico de AgroBits. Introdúcela y únete a la red.

3. **Abre la página de configuración.** Normalmente se abre sola. Si no aparece, abre el navegador del móvil y escribe `192.168.4.1`.

4. **Elige la red WiFi de tu casa o finca** en la lista. Si no aparece, escribe su nombre en el campo "Otra red".

5. **Escribe la contraseña de esa WiFi.** Si la red no tiene contraseña, deja el campo vacío.

6. **Copia el token del sensor desde AgroBits.** En la aplicación, entra en **Sensores → Token de dispositivo**, copia el código de 64 caracteres y pégalo en el campo "Token de dispositivo" de la página del equipo.

7. **Pulsa "Guardar y conectar".** Verás el mensaje "Configuración guardada. Reiniciando…". Espera unos segundos.

8. **Comprueba que funciona.** En unos minutos deberías ver nuevas lecturas en la aplicación AgroBits. Las lecturas llegan cada 5 minutos.

## Cambiar de WiFi o de token

Si cambias el router, la contraseña de la WiFi o quieres asociar el equipo a otro sensor:

1. Con el equipo encendido, mantén pulsado el botón **BOOT** de la placa durante **3 segundos** y suéltalo.
2. Repite los pasos 2 a 8 de arriba.

El equipo también abre la página de configuración por sí mismo si no consigue conectarse a la WiFi durante **5 minutos** seguidos. Si no lo ves hacer nada en 10 minutos, reinicia el equipo desconectándolo y conectándolo de nuevo.

## Borrar la configuración

Si vas a entregar o retirar el equipo:

1. Abre la página de configuración (pasos 2 y 3 de arriba).
2. Pulsa **"Borrar configuración"** y confirma.

El equipo se reinicia sin datos guardados. Para volver a usarlo, configúralo de nuevo.

## Si no aparece la red `AgroBits-XXXX`

- Desconecta y vuelve a conectar el cargador. Espera un minuto.
- Comprueba que el equipo tiene luz encendida.
- Prueba a apagar y encender la WiFi del móvil.
- Si sigue sin aparecer, mantén pulsado el botón BOOT 3 segundos con el equipo encendido.
- Si aun así no aparece, contacta con el equipo de AgroBits. No intentes abrir la placa.

## Si la página no abre o no encuentra mi WiFi

- Asegúrate de estar unido a la red `AgroBits-XXXX` y no a la de tu casa.
- Escribe `192.168.4.1` en el navegador.
- Si tu WiFi no aparece en la lista, escribe su nombre exacto en "Otra red". Distingue mayúsculas y minúsculas.
- Si la WiFi es de 5 GHz y no aparece, prueba con la de 2,4 GHz: el equipo solo se conecta a redes de 2,4 GHz.

## Si el token no se acepta

- El token tiene exactamente **64 caracteres** (letras de la a a la f y números del 0 al 9). Si la página indica un error, cópialo de nuevo desde **Sensores → Token de dispositivo**.
- Pega solo el token, sin espacios ni texto adicional.

## Si el sensor no envía datos

1. **Comprueba la WiFi.** Si el router está apagado o lejos, el equipo guarda las lecturas y las envía cuando vuelve la conexión.
2. **Espera 10 minutos.** Tras un corte de red, el equipo tarda un poco en reenviar los datos pendientes.
3. **Comprueba el token.** Si cambiaste el token en la aplicación, vuelve a configurar el equipo con el token nuevo (botón BOOT, 3 segundos).
4. **Revisa la hora.** Si el equipo no tiene hora de internet, espera: se sincroniza sola al conectarse.
5. **Reinicia el equipo.** Desconecta el cargador, espera 10 segundos y vuelve a conectarlo.

Si después de estos pasos no hay datos, anota la hora aproximada y avisa al equipo de AgroBits.

## Preguntas frecuentes

**¿Tengo que volver a configurar el equipo si se va la luz?**
No. La configuración queda guardada en el equipo.

**¿Mi contraseña WiFi queda guardada en el equipo?**
Sí, para que el equipo pueda conectarse. No se muestra en ninguna pantalla ni en la aplicación.

**¿Puedo usar el equipo en otra finca?**
Sí, si tienes WiFi allí. Configúralo de nuevo con la nueva red y el token de la nueva parcela.

**¿Hay que hacer algo cada día?**
No. El equipo funciona solo.
