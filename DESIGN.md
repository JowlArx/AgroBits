---
name: AgroBits
description: Monitoreo agrícola con sensores para huertas domésticas y pequeños cultivos.
colors:
  botanico: "#1e5b3d"
  botanico-hover: "#2e7d57"
  papel: "#f6f8f4"
  superficie: "#ffffff"
  tinta: "#12211a"
  tinta-tenue: "#5b6660"
  alarma: "#c2410c"
  alarma-suave: "#fdf0e7"
  borde: "#d8dfd6"
  borde-input: "#78857d"
typography:
  display:
    fontFamily: "'Fraunces', Georgia, 'Times New Roman', serif"
    fontSize: "clamp(1.9rem, 4.5vw, 2.75rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "'Fraunces', Georgia, 'Times New Roman', serif"
    fontSize: "1.6rem"
    fontWeight: 600
    lineHeight: 1.2
  title:
    fontFamily: "'Fraunces', Georgia, 'Times New Roman', serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.2
  body:
    fontFamily: "'Atkinson Hyperlegible', system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "'Atkinson Hyperlegible', system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "0.8rem"
    fontWeight: 700
    lineHeight: 1.4
rounded:
  control: "8px"
  card: "10px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.botanico}"
    textColor: "{colors.superficie}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.botanico-hover}"
    textColor: "{colors.superficie}"
    rounded: "{rounded.control}"
  button-secondary:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "44px"
  button-danger:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.alarma}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "44px"
  input:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.control}"
    padding: "7px 8px"
    height: "44px"
  chip:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta-tenue}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
  chip-alerta:
    backgroundColor: "{colors.alarma-suave}"
    textColor: "{colors.alarma}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
  card:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.card}"
    padding: "16px"
  nav-item:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta-tenue}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "44px"
---

# Design System: AgroBits

## Overview

**Creative North Star: "El cuaderno de campo"**

AgroBits se lee como el cuaderno de un hortelano cuidadoso: papel, tinta, observaciones medidas y **un único margen en ámbar** para la alarma. Todo lo demás se mantiene en voz baja —verde botánico sobre papel blanco-verdoso— para que la única señal que exige atención sea, de verdad, la alerta. La identidad no viene del adorno sino de la disciplina: una escala tipográfica corta, un solo acento, bordes de un píxel y nada que grite sin motivo.

El sistema sirve a dos superficies con el mismo lenguaje: la **landing** (`/`, persuasiva, de lectura larga) y el **panel** (`/app.html`, operativo, de uso repetido y con una mano). En el panel manda la densidad legible: el usuario necesita ver el estado de sus cultivos de un vistazo y actuar solo cuando hay alerta. Por eso el producto se organiza en torno a una tensión deliberada —mucho dato tranquilo, una alarma ruidosa— y no al revés.

**Key Characteristics:**

- **Un solo acento que significa algo:** el ámbar aparece exclusivamente en alertas activas (KPI, chip, distintivo, borde de tarjeta). Su escasez es el mensaje.
- **Papel y tinta, no blanco y negro:** superficies verde-grisáceas muy claras y una tinta verde-negra; el gris puro no existe en el sistema.
- **Tipografía con dos voces:** serif calurosa para nombrar (títulos), sans hiperlegible para medir (datos, etiquetas, cuerpos).
- **Plano por defecto:** la sombra aparece únicamente cuando algo flota de verdad (barra inferior de móvil, menú desplegable, selector abierto).
- **Un control propio cuando el del sistema no puede comunicar estado:** el desplegable de sensores es un listbox con flecha que gira al abrirse.

## Colors

Una paleta de tinta vegetal sobre papel: verde botánico como color de marca, papel verde-grisáceo como fondo, y un ámbar de alarma que solo se usa para las alertas activas.

### Primary

- **Verde botánico** (`#1e5b3d`): acciones, enlaces, sección activa, valor de marca por defecto. Es el color con más superficie del sistema, y aun así nunca grita: acompaña, no avisa.
- **Verde botánico vivo** (`#2e7d57`): estado hover de las acciones de marca.

### Neutral

- **Papel de cuaderno** (`#f6f8f4`): fondo de la aplicación y de la landing.
- **Superficie** (`#ffffff`): tarjetas, paneles, campos y menús; separa del papel con un borde, no con una sombra.
- **Tinta de campo** (`#12211a`): texto principal.
- **Tinta suave** (`#5b6660`): texto secundario, notas y unidades; en superficies de color se tiñe del tono, nunca gris neutro.
- **Borde de hoja** (`#d8dfd6`): separadores y contornos de superficie.
- **Borde de campo** (`#78857d`): contorno de los controles de formulario (más presente que el borde de superficie, porque el control debe poder llenarse).

### Alerta (secundario, restringido)

- **Ámbar de alarma** (`#c2410c`): exclusivamente alertas activas —el KPI que las cuenta, el distintivo «Activa», el borde de su tarjeta y el texto de la alerta—.
- **Ámbar suave** (`#fdf0e7`): fondo de los avisos y distintivos de alerta.

### Tema oscuro

El tema oscuro no es una paleta distinta: son los mismos roles con los valores invertidos (fondo `#0e1712`, superficie `#16211b`, marca `#74c894`, alarma `#f97316`). El papel se vuelve pizarra y la tinta, luz. La marca de alerta pasa a un naranja más claro para mantener el contraste AA sobre superficie oscura.

### Named Rules

**La regla de la sola voz.** El ámbar es lo único que tiene permiso para levantar la voz: si un elemento no es una alerta activa, no se pinta de ámbar — ni un borde, ni un icono, ni un texto. Si aparece ámbar, hay algo que hacer.

**La regla del papel.** Ninguna superficie se define por una sombra: se define por su relación con el papel (fondo, superficie) y por un borde de un píxel. La sombra es una excepción, no una técnica.

## Typography

**Display Font:** Fraunces (con Georgia, 'Times New Roman', serif)
**Body Font:** Atkinson Hyperlegible (con system-ui, -apple-system, 'Segoe UI', sans-serif)

**Character:** una serif con carácter de imprenta para lo que se *nombra* (la marca, los titulares, los títulos de sección) y una sans de altísima legibilidad para lo que se *mide* (cifras, unidades, etiquetas, datos). El contraste de voces marca de inmediato qué es texto y qué es dato, sin necesidad de explicarlo.

### Hierarchy

- **Display** (700, `clamp(1.9rem, 4.5vw, 2.75rem)`, interlínea 1.15): solo el titular de la landing.
- **Headline** (600, 1.6rem, 1.2): titulares de sección de la landing y `h1` de la app.
- **Title** (600, 1.25rem, 1.2): títulos de widget y de vista.
- **Body** (400, 1rem, interlínea 1.55): párrafos y datos; medida objetivo de 65–75 caracteres.
- **Label** (700, 0.8rem, 1.4): etiquetas, unidades, notas al pie de tarjeta y textos de control.

### Named Rules

**La regla del cuaderno.** El serif nombra, la sans mide. Si un bloque de datos (cifras, unidades, estados) aparece en serif, es un titular disfrazado: se está usando la voz equivocada.

**La regla de la cifra.** Toda cifra que cambió o que se compara va en `font-variant-numeric: tabular-nums`, para que las columnas de números se lean alineadas.

## Layout

- **Una columna de contenido, un panel lateral opcional.** En escritorio (≥62rem) el panel divide en columna principal + panel de 19rem (alertas activas y lecturas recientes); por debajo, el panel cae bajo el contenido.
- **Cabecera de una fila** (≥48rem): marca, navegación, título de la vista, chips de estado y cuenta. En móvil se reduce a marca + título + chip, y la navegación baja a una **barra inferior flotante** con los iconos de sección y el icono de perfil a la derecha.
- **Rejilla de tarjetas** con `auto-fit` y mínimo de 22rem; las tarjetas alinean al inicio (`align-items: start`), de modo que una tarjeta que crece no estira a sus vecinas.
- **Widgets**: dos columnas en escritorio, una en móvil; dentro de cada widget, pestañas de tipo a la izquierda y título a la derecha (en móvil, el título encima y las pestañas en una fila con scroll horizontal; el borde derecho de esa fila se desvanece para indicar que hay más pestañas).
- **Ritmo de espacio** en base 8px (`--espacio-1` 4px … `--espacio-6` 32px). El espacio por encima de un título es mayor que el de debajo; los grupos tightness se mantienen juntos y los bloques se separan con `--espacio-5`.
- **Puntos de ruptura:** 62rem (992px, se apila el panel), 48rem (768px, barra inferior de navegación y autos de móvil), 34rem (544px, KPIs cuadrados 2×2 y espaciados finos).

## Elevation & Depth

El sistema es **plano por defecto**: las superficies se apoyan en el papel con un borde de un píxel y no llevan sombra. La sombra aparece solo cuando un elemento flota de verdad sobre el contenido, y en ese caso lleva desplazamiento y desenfoque (nunca un halo de color sin desenfoque).

### Shadow Vocabulary

- **Menú desplegable** (`0 8px 24px rgb(0 0 0 / 0.12)`): el menú de la cuenta y la lista del selector, que se superponen al contenido.
- **Barra inferior** (`0 12px 28px rgb(0 0 0 / 0.14)`): la barra flotante de navegación en móvil, que descansa sobre el scroll.
- **Anillo de selección** (`0 0 0 2px var(--fondo), 0 0 0 4px var(--texto)`): la muestra de color activa, que necesita un doble anillo para separarse de la superficie.
- **Halo de estado** (`0 0 0 3px` al 18% de la marca): el punto verde activo de los chips.

### Named Rules

**La regla de la flotación.** Si un elemento no tapa contenido, no lleva sombra. Y si lleva sombra, la lleva con desplazamiento y desenfoque: una sombra sin desenfoque es disfraz, no profundidad.

## Motion

Tres duraciones y dos curvas, definidas en `web/src/tokens.css`:

- `--duracion-rapida` (120ms): respuesta a la pulsación.
- `--duracion-normal` (200ms): elevación de tarjetas y cambios de borde.
- `--duracion-lenta` (320ms): entrada de la cabecera y de cada vista, con `--desplazamiento-entrada` (12px).
- `--ease-salida` (`cubic-bezier(0.2, 0.8, 0.2, 1)`): entradas y respuesta al puntero.
- `--ease-estado` (`cubic-bezier(0.45, 0, 0.55, 1)`): cambios de estado.

`--transicion` (140ms) se mantiene para los controles existentes.

- **Entrada:** al cambiar de vista, la cabecera y el contenido suben 12px y aparecen en 320ms.
- **Puntero:** las tarjetas de cultivo y los KPI se elevan 2px al pasar el ratón y se reducen a 98% al pulsar.
- **Botones:** al pulsar se reducen a 98%; ya no se desplazan 1px.

### Named Rules

**La regla del movimiento con función.** El movimiento explica un cambio de vista, de estado o de puntero; nunca decora. Con `prefers-reduced-motion: reduce` las duraciones pasan a 0,01ms (los cambios de estado son instantáneos), desaparecen la entrada y la elevación al pasar el puntero, y los botones no se escalan.

## Shapes

- **Esquinas suaves y contenidas:** controles con 8px (`--radio-sm`), tarjetas y superficies con 10px (`--radio`), píldoras y círculos con 999px. Nada de esquinas vivas y nada de esquinas totalmente redondeadas en bloques de texto.
- **Bordes finos:** un píxel de `--borde` separa superficies; los controles de formulario usan `--borde-input` para que su contorno se lea aunque no tengan contenido.
- **Iconografía:** SVG en línea dibujados con `currentColor` y el mismo grosor de trazo (1.4–1.6); nunca tipografía de iconos, nunca emoji. Los iconos de sección son abstractos (hoja, campana, sensor) y los de cultivo, específicos (tomate, lechuga, albahaca, pimiento, brotes).
- **Gráficos con relleno degradado** bajo la línea y eje Y con margen fijo de 44px, para que las curvas no «salten» de margen al cambiar de escala.

## Components

### Buttons

- **Shape:** esquinas de 8px, altura mínima 44px (objetivo táctil), tipografía de 0.95rem en peso 700.
- **Primary:** fondo verde botánico, texto blanco, borde del mismo color; hover al verde vivo.
- **Hover / Focus:** el borde y el texto pasan a verde en el secundario; el foco visible es un anillo de 2px en `--foco` con 2px de separación. Al pulsar, el botón baja 1px.
- **Secondary / Ghost / Tertiary:** secundario con superficie blanca y borde de campo; peligro con texto y borde en ámbar (y fondo ámbar suave al hover).
- **Acciones destructivas:** piden confirmación en línea —el botón se convierte en la pregunta y dos opciones— en vez de un modal o de un borrado inmediato.

### Chips

- **Style:** píldora de 1px de borde, fondo de superficie, texto en tinta suave, 0.8rem en peso 700.
- **State:** el chip de alertas activas invierte el color (texto y borde ámbar sobre ámbar suave) y lleva un punto de estado que se enciende en verde cuando hay sensores conectados.

### Cards / Containers

- **Corner Style:** 10px.
- **Background:** superficie blanca sobre papel, con borde de 1px.
- **Shadow Strategy:** ninguna; solo las superficies flotantes llevan sombra.
- **Internal Padding:** 16px en tarjetas de contenido, 12px en tarjetas de KPI.
- **Regla estructural:** el icono cuelga a la izquierda y **todo el texto de la tarjeta comparte la misma arista vertical** (título, valor y nota alineados); una tarjeta que crece no estira a sus vecinas.

### Inputs / Fields

- **Style:** borde de 1px en `--borde-input`, fondo de superficie, 8px de radio, altura mínima 44px; la etiqueta va **encima** del campo, en peso 700.
- **Focus:** anillo de 2px en `--foco` con 2px de separación; en error, el borde pasa a ámbar y el campo recibe `aria-invalid`.
- **Error / Disabled:** los mensajes de error van en un bloque con `role="alert"`, fondo ámbar suave y borde ámbar; el foco salta al primer campo con problema.

### Navigation

- **Desktop:** botones de sección en la cabecera, con icono, texto en tinta suave y la sección activa en verde con peso 700 y un subrayado interior de 2px.
- **Mobile:** barra inferior flotante en forma de píldora, con un círculo por sección (la activa, en verde sólido) y el icono de perfil a la derecha, en un círculo verde tenue, sin nombre visible.
- **Menú de cuenta:** desplegable anclado a la derecha con «Mi cuenta» y «Cerrar sesión»; se cierra con clic fuera, `Escape` o al navegar.

### Desplegable propio

Cuando el control nativo no puede comunicar su estado (el `<select>` del sistema no indica si su lista está abierta), se usa un listbox propio: botón con `aria-haspopup="listbox"` y `aria-expanded`, lista con `role="option"` y `aria-selected`, **flecha que gira 180° mientras el menú está abierto** y cambio de aspecto del botón (borde y fondo de marca).

### Alerta

- Tarjeta de borde de 1px; con alerta activa, el borde se tiñe de ámbar al 45%.
- Tres líneas: tipo de medición con el distintivo de estado a la derecha, el **valor leído en grande** y el contexto (cultivo y hora) en tinta suave.
- El valor va en negrita con cifras tabulares: es la cifra que el usuario viene a mirar.

## Do's and Don'ts

### Do:

- **Do** reservar el ámbar para las alertas activas, y usarlo entero (borde, distintivo, cifra) cuando aparece.
- **Do** alinear el texto de una tarjeta en una sola arista vertical y dejar que cada tarjeta tenga su propio alto.
- **Do** comprobar la legibilidad del dato en el móvil con el dedo: la cifra en grande, la unidad al lado, la hora separada.
- **Do** confirmar en línea las acciones destructivas y pedir confirmación en un solo toque reversible.
- **Do** usar tokens (`--marca`, `--radio`, `--espacio-*`, `--t-*`) en lugar de valores sueltos: `web/src/tokens.css` es la única fuente de verdad, compartida por la landing y la app.
- **Do** mantener los `data-testid` estables al cambiar la presentación: son el contrato de la suite E2E.
- **Do** escribir en español claro, en segunda persona, sin jerga técnica ni identificadores internos (nada de «T-23» o «D15» en pantalla).

### Don't:

- **Don't** usar una franja de color lateral (>1px) en tarjetas, avisos o alertas: es el tic más reconocible de una interfaz generada, y en este sistema el acento va en el contenido, no en el borde.
- **Don't** dibujar una sparkline decorativa como si fuera información: si el gráfico no enseña el umbral, es ruido; si lo enseña, es el producto.
- **Don't** delegar en un control del sistema un estado que la interfaz debe comunicar (flecha, apertura, expansión).
- **Don't** dejar que una rejilla estire a todas las tarjetas cuando solo una crece.
- **Don't** usar emoji, tipografías de iconos o imágenes de relleno donde deba ir un SVG con `currentColor`.
- **Don't** alinear el valor de una tarjeta al borde de la tarjeta si el título cuelga de un icono: el texto comparte arista.
- **Don't** dar entrada a un dato que no existe: sin hardware, las lecturas son simuladas y se etiquetan como tales.
- **Don't** inventar testimonios, métricas de uso ni fuentes agronómicas: el producto no las tiene.
