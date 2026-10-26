# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Usuario principal:** personas con huerta doméstica y usuarios de pequeños cultivos. Confirmado en la entrevista de inicialización (20/10/2026); se descarta la hipótesis de «otros perfiles» (cooperativas, huertas comunitarias, agrónomos, Medianeras): no son usuarios objetivo.
- **Situación:** la persona cultiva en casa o en una parcela pequeña y no puede estar pendiente de sus cultivos a todas horas. Consulta el panel desde el teléfono o el escritorio para saber si su cultivo está dentro de rango y qué requiere atención.
- **Trabajo que quiere hacer:** entender, sin interpretar lecturas técnicas, si su cultivo está bien, y actuar solo cuando hay una alerta; en vez de leer cuatro series de números crudos.
- **Audiencia secundaria:** ninguna confirmada. El responsable del proyecto es un usuario interno del producto.

## Product Purpose

Construir una plataforma de monitoreo agrícola que conecte sensores IoT con una aplicación web y convierta las mediciones en información comprensible y accionable por cultivo.

Alcance actual (MVP aprobado, `docs/spec.md` v3): registro e inicio de sesión con perfil; gestión de cultivos; registro de sensores y asociación a cultivos; visualización de las últimas mediciones de los 4 tipos (humedad de suelo, temperatura, humedad ambiental, luminosidad) con datos simulados; umbrales por cultivo a partir de un catálogo editable; alertas binarias por umbral.

Por qué existe: los usuarios de huertas domésticas y pequeños cultivos necesitan comprender las condiciones de sus plantas sin tener que interpretar manualmente múltiples mediciones técnicas (`docs/spec.md` §1).

**Éxito:** el proyecto es personal: el éxito es que su responsable lo use, y que el sistema siga siendo mantenible y barato de operar (~0 €/mes). La decisión vigente es «personal ahora, producto público después»: se construye como herramienta propia, con la vista puesta en poder abrirse a terceros más adelante; eso no compromete hoy con escalado comercial, soporte ni niveles de servicio.

## Positioning

El mecanismo propio: umbrales configurados por cultivo (valores por defecto de un catálogo editable, sobrescribibles por el usuario) aplicados a lecturas en vivo, con un ciclo de vida de alerta evaluado **en el servidor** (trigger `AFTER INSERT ON measurements`): una única alerta activa por (cultivo, tipo), mantenida mientras la lectura siga fuera de rango y resuelta al volver al rango.

A eso se suma que el software produce lecturas con el mismo formato que enviará el ESP32 —el generador simulado ocupa su lugar hasta que exista hardware—, de modo que la plataforma se valida entera sin comprar sensores.

El resultado para el usuario: no un panel de números, sino «tu cultivo está fuera de rango, con este valor, a esta hora».

## Operating Context

- **Metodología:** Spec-Driven Development con aprobación humana en los hitos. Roles de agente (Planner / Implementador / Verificador, D11) con handoff documentado; ningún trabajo avanza de fase sin hito aprobado.
- **Idioma:** documentación y producto en español, conservando en inglés los nombres técnicos convencionales (D9).
- **Coste:** objetivo estructural de ~0 €/mes en infraestructura (tier gratuito). Cualquier servicio facturable exige aprobación humana previa (D7).
- **Verificación:** cada funcionalidad tiene criterios de aceptación verificables y nada se declara terminado sin ejecutar las verificaciones pertinentes, declarando limitaciones y pruebas pendientes. Hoy: eslint, vitest (173/173), build y Playwright E2E (15/15 en local y 15/15 contra producción) en verde; la semántica de base de datos se certifica con suites SQL versionadas (`supabase/tests/`) que usan identidades simuladas y `ROLLBACK`.
- **Datos:** mientras no haya hardware, el generador simulado corre en la SPA abierta y escribe con el token de la sesión del usuario (todo vía RLS, sin credenciales de servicio) (D18). Frecuencia: 1 lectura cada 5 minutos y sensor (D15).
- **Publicación:** cada push a `main` despliega en Vercel (proyecto `agrobits`, root directory `web/`). Los builds quedan bloqueados si la autoría del commit no corresponde al propietario del equipo en Vercel (D25). URL pública: `https://agrobits-jowlarxs-projects.vercel.app`.
- **Entrega de base de datos:** migraciones versionadas en `supabase/migrations/`, suites SQL en `supabase/tests/`, acceso al proyecto Supabase por MCP.
- **Flujo en Git:** una rama y un commit por tarea, mergeados a `main` tras verificarlos; tags por hito (`m0-spec` … `m5`).
- **Datos personales:** teléfono y localidad son datos de contacto del titular; el email es dato de cuenta de Supabase Auth. El teléfono se enmascara en la documentación (Ley 25.326).

## Capabilities and Constraints

**Capacidades confirmadas (MVP, `docs/spec.md` v3):**

- Cuentas: registro con email, contraseña, confirmación, teléfono y localidad de catálogo; inicio y cierre de sesión; sesiones persistentes; aislamiento por fila.
- Cultivos: crear, editar y eliminar; nombre, tipo (del catálogo o «Personalizado») y par [mín, máx] por cada uno de los 4 tipos de medición.
- Sensores: registro como entidad, asociación a cultivos (modelo N–N), desasociar y eliminar.
- Mediciones: última lectura disponible por tipo con valor, unidad y hora; estado «sin datos» cuando no hay lectura (no se inventan valores); evolución en ventanas de 5/10/15 minutos.
- Umbrales: catálogo editable de tipos de cultivo con valores por defecto presentados como referencia orientativa —no asesoramiento agronómico certificado— y sobrescribibles por el usuario.
- Alertas: binarias, una activa por (cultivo, tipo), con historial de resueltas; evaluación en servidor.
- Lecturas simuladas: 1 lectura por sensor cada 5 minutos desde la SPA.

**Restricciones y límites:**

- Plataforma: solo web. Responsive con breakpoint de 48 rem (768 px): en móvil la navegación pasa a barra inferior flotante. **No hay app nativa** (fuera del alcance del MVP); el móvil web sigue siendo web, no un lenguaje de diseño nativo.
- Stack (ya determinado por el código existente): Vite + React + TypeScript, Supabase (Postgres + Auth + RLS + API generada), Recharts, hosting en Vercel; Vitest + Testing Library para unit, Playwright para E2E.
- Seguridad: autorización por fila con `user_id` + RLS en todas las tablas de negocio; ninguna regla de acceso público indiscriminado; las claves solo viven en `web/.env.local` (gitignored) y en las variables de entorno de Vercel, nunca en el repositorio.
- Coste: ~0 €/mes (Supabase free tier, Vercel Hobby).
- Fuera de alcance: notificaciones externas, historial y retención de mediciones, sensores compartidos, suscripciones, riego automático, app móvil.
- Próximo bloque decidido: **hardware y firmware ESP32** (el generador simulado queda como sustituto mientras no exista sensor). El protocolo de comunicación sigue sin definirse.
- Hechos de producto explícitamente sin decidir: fuentes que justifiquen los umbrales del catálogo; fuentes y ampliación de la semilla de `localidades`; formato concreto de handoff entre roles de agente; protocolo ESP32.

## Brand Commitments

- **Nombre:** AgroBits. Es el nombre del producto, del repositorio (`JowlArx/AgroBits`, privado) y del proyecto de Vercel (`agrobits`).
- **Identidad visual (aprobada por el humano, D20; ratificada en D29 y D35):** papel blanco-verdoso, tinta verde-negra, verde botánico como color de marca y **ámbar-señal reservado en exclusiva a las alertas activas** — es lo único con voz alta en toda la interfaz. Tipografías Fraunces (títulos) y Atkinson Hyperlegible (cuerpo) vía Google Fonts, con fallback a fuentes del sistema. Los tokens viven en `web/src/tokens.css`, fuente única de verdad compartida por la landing y la app; tema claro y oscuro por `prefers-color-scheme`.
- **Estructura de producto confirmada:** landing estática de presentación en `/` y SPA en `/app.html` (D28); la landing comparte los tokens de la app.
- **Referencia de estructura (vinculante, D29):** el layout de panel sigue la estructura del kit comunitario de Figma «Snow Dashboard UI Kit» (nodo `98469:145265`, fileKey `jh9Rc1nsakFUSujdmiShCt`), conservando los tokens de marca.
- **Voz:** español, segunda persona del tú, directa y sin jerga técnica. Se eliminó el copy con identificadores internos (D35).
- **Logotipo:** `web/public/icono-hoja-senial.svg` (hoja con señal de wifi, con firma C2PA de Content Credentials) es el asset de marca en uso; el PNG anterior (`logo.png`) se eliminó del repositorio en D39.

## Evidence on Hand

Contenido y datos reales disponibles:

- Documentación: `docs/spec.md` (v3, aprobada), `docs/plan.md`, `docs/tasks.md`, `docs/constitution.md`, `docs/informe-validacion-m4.md`, `docs/informe-validacion-m5.md`; `MEMORY.md` con las decisiones D1–D37, su fecha y su aprobación.
- Catálogo de 4 tipos de cultivo con umbrales por defecto (Tomate, Lechuga, Albahaca, Pimiento), marcados como referencia orientativa.
- Semilla de `localidades`: 109 filas, 24 provincias argentinas.
- Esquema real en Supabase: `crops`, `crop_thresholds`, `sensors`, `sensor_crop`, `measurements`, `alerts`, `crop_type_catalog`, más `localidades` y `perfiles`; RLS activo en todas, 25 políticas.
- Cuentas de prueba E2E (`e2e-a@agrobits.test`, `e2e-b@agrobits.test`) sembradas por SQL: son fixtures, no usuarios reales.
- Landing con un panel de ejemplo de las 4 mediciones de «Tomate» y su alerta: datos simulados y etiquetados como ejemplo.
- Suites ejecutables: vitest 173/173, Playwright 15/15 en local y 15/15 contra producción, 3 suites SQL versionadas.

Ausencias que el trabajo futuro **no debe inventar**:

- No hay hardware ESP32 conectado ni datos de sensores reales: todas las lecturas son simuladas.
- No hay testimonios, casos de éxito, prensa, clientes reales ni métricas de uso; más allá de las cuentas de prueba, el producto no tiene usuarios.
- No hay fotografías propias de cultivos, parcelas o personas: el único asset de imagen es el logo.
- No hay fuente publicada que justifique los umbrales del catálogo ni las localidades sembradas.
- No se ha ejecutado un flujo real de confirmación por email en producción (requiere buzón y consume cuota del free tier).
- No existen notificaciones, historial largo, sensores compartidos ni app móvil.

## Product Principles

1. **Evidencia antes que afirmación.** Nada se declara terminado sin criterios de aceptación ejecutados y verificados; las limitaciones y las pruebas pendientes se declaran explícitamente, y los cambios avanzan en pasos pequeños con hito humano.
2. **Primero simulado, hardware después.** El software debe poder validarse entero sin hardware, y el generador usa el mismo formato que enviará el ESP32, de modo que el hardware entre después sin rediseñar el flujo de datos.
3. **Coste contenido.** El objetivo estructural es ~0 €/mes; gastar es una decisión que requiere aprobación humana previa, nunca un efecto secundario.
4. **El dueño de la fila, siempre.** Cultivos, sensores, mediciones y alertas pertenecen a una cuenta, y eso se aplica en el esquema (`user_id` + RLS), nunca solo en el cliente.
5. **Las alertas son la única voz alta.** El producto distingue lo informativo de lo accionable: la atención del usuario debe irse a la alerta, no al dashboard.

## Accessibility & Inclusion

- Objetivo declarado: **WCAG 2.2 nivel AA**, verificado en la práctica (contraste AA, `:focus-visible` ≥3:1, skip link, `aria-current` en navegación, `aria-describedby` en la regla de contraseña, `aria-label` en los inputs de umbrales, `aria-invalid` y foco al primer campo con error, objetivos táctiles ≥44 px, `prefers-reduced-motion` respetado).
- La app se usa en móvil (verificado a 390×844) y en escritorio: la información accionable —alertas activas y últimas lecturas— debe ser alcanzable en ambos sin pérdida de función.
- Cuando el control nativo no permite comunicar estado, se usa un control propio accesible (p. ej. el desplegable de sensores con `aria-haspopup`/`aria-expanded`).
- Idioma: interfaz y documentación en español (D9).
- Limitación declarada: la verificación de accesibilidad es interna (Lighthouse a11y 100, revisión manual); no hay auditoría externa.
