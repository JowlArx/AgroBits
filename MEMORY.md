# AgroBits — Memoria del proyecto

## Estado del proyecto

AgroBits se encuentra en la fase de definición de requisitos (Spec-Driven Development).

La especificación del MVP (`docs/spec.md` v2) fue **aprobada por el humano el 16/10/2026** (hito M0) y el plan (`docs/plan.md`) fue **aprobado el 16/10/2026** (hito M1). El desglose de tareas (`docs/tasks.md`, hito M2) fue **aprobado el 17/10/2026**, con la incorporación autorizada de T-18 (R-06) el mismo día. Fase 1 **completa y verificada** (T-10…T-16, T-18; 90 tests, build y lint correctos). **Hito M3 aprobado por el humano el 17/10/2026 («Comienza fase 2»):** checklist de T-17 + demo revisadas, sin cambios solicitados. **Fase 2 en marcha: T-20 completada el 17/10/2026** — 3 migraciones aplicadas y versionadas en `supabase/migrations/` (7 tablas, RLS en 7/7 con 25 políticas, índice único D14, semilla del catálogo); verificado sin `service_role` en cliente; exportación documentada en `tasks.md`. **T-21 completada el 17/10/2026** — gate de seguridad: suite SQL de dos cuentas (A/B) con identidades simuladas y `ROLLBACK` (residuo 0), **22/22 pruebas OK** (R-02, R-07 AC1, R-08, R-14 AC1, catálogo inmutable, controles positivos); suite versionada en `supabase/tests/`. Hallazgo: el proyecto auto-activa RLS en tablas nuevas. **T-22 completada el 17/10/2026** — auth real Supabase (`ProveedorAuth` intercambiable + `@supabase/supabase-js`); E2E completo contra GoTrue real: registro crea la cuenta e inicia sesión (R-01 AC1, con «Confirm email» activo y confirmación híbrida por SQL), duplicado **ofuscado** detectado (`identities: []`) → «Ya existe una cuenta con ese email.» (R-01 AC2), clave corta rechazada (AC3), login/persistencia/cierre con gate (R-03 AC1); **103 tests** ✔, build/lint ✔, residuo 0. Hallazgos: signup rechaza dominios sin MX; usuarios SQL manuales requieren tokens `''` en `auth.users`; cuota free tier ~2 signups/hora. **T-23 completada el 17/10/2026** — capa de datos intercambiable (plan.md §2): contrato `ProveedorDatos` + `ProveedorDatosSupabase` (PostgREST; `user_id` del token de sesión; normalización de horas timestamptz a ISO `Z`) inyectada en `main.tsx` y doble en memoria `DatosFalsos` en tests; stores con caché síncrona (suscripciones intactas) y acciones asíncronas; carga de datos al abrir sesión y vaciado al cerrar (refuerzo cliente de R-02); pantallas adaptadas solo a `async` + indicador de carga (sin rediseño). **115 tests** ✔ (15 suites), build/lint ✔; E2E real completo: crear cultivo/sensor/lectura → filas verificadas en BD (crops+4 umbrales, sensors+enlace N–N, 4 measurements), **persistencia tras recarga**, eliminar cultivo → residuo 0 (cascada), cierre de sesión con gate. Alertas siguen en memoria hasta T-25. Hallazgos: `auth.identities.email` es columna generada en esta versión de GoTrue (omitir en inserts manuales); el borrado en cadena del cultivo puede tardar varios segundos. **T-24 completada el 17/10/2026** — generador de datos simulados (R-10 AC2, D15) con decisión aprobada por el humano (D18): corre en la SPA abierta escribiendo con el token de sesión (vía RLS, sin cambios de nube). Contrato `ProgramadorLecturas` + `ProgramadorTemporizado` (tick inmediato si la última lectura venció; después 1 lectura/5 min/sensor; se autodesierta si el sensor se borra o se cierra la sesión) inyectado como T-22/T-23; las lecturas automáticas alimentan también las alertas D14 en memoria. **122 tests** ✔ (16 suites), build/lint ✔; E2E real: crear sensor → **lectura automática sin pulsar botón** (4 filas en `measurements` con formato R-08), persistencia tras recarga, sin duplicado inmediato con lectura reciente y **cadencia real observada** (segundo tick exactamente +5 min en vivo); consumo del tier gratuito calculado (trivial). Hallazgo: reiniciar `npm run dev` resolvió una transformación cacheada del watcher (reincidencia T-13/T-14). **T-25 completada el 17/10/2026** — evaluación de alertas en la BD (modelo D14, R-13) con **decisión del humano: Opción A (servidor con trigger)**; ver D19. Función trigger `evaluar_alertas_de_sensor` (SECURITY INVOKER, RLS intacta) en la migración `20261017000004`, con `ON CONFLICT DO NOTHING` sobre el índice único parcial D14 (duplicados imposibles bajo concurrencia); suite SQL `supabase/tests/20261017_t25_evaluacion_alertas.sql` **8/8 OK** (identidades simuladas + ROLLBACK, residuo 0); cliente convertido en lector (`ProveedorDatos.cargarAlertas`, `storeAlertas` fachada de solo lectura, tick/botón/borrado recargan la caché, `DatosFalsos` emula el trigger con la regla de T-11). **124 tests** ✔ (16 suites), build/lint ✔; E2E real: lectura automática → alerta creada por el trigger con tipo/valor/hora (AC1), segunda lectura sin duplicar (AC2), resolución con hora al volver al rango tras editar umbrales (AC3), cultivo tranquilo sin alertas (AC4), consola limpia, residuo 0. Hallazgo: el `click` de chrome-devtools no sometió el formulario de cultivo → usar `form.requestSubmit()` vía `evaluate_script`. Siguiente: **T-26** (validación final M4: checklist R-01…R-14, informe de limitaciones, aprobación de cierre de Fase 2).

## Objetivo

Construir una plataforma de monitoreo agrícola que conecte sensores IoT con una aplicación web y ofrezca información y alertas adaptadas a los cultivos.

## Contexto conocido

- El proyecto se desarrolla inicialmente como pasatiempo.
- El presupuesto inicial es limitado (objetivo ~0 €/mes en infraestructura).
- Se valida el software con datos simulados antes de invertir en hardware.
- El desarrollo utiliza OpenCode y metodología SDD.

## Decisiones aprobadas

Anteriores:

- Iniciar el proyecto en un repositorio independiente.
- Utilizar Git para el control de versiones.
- Preparar la documentación antes de implementar funcionalidades.
- Exigir validación humana y pruebas verificables.

Clarificación del MVP (16/10/2026):

- **D1 — Alcance del MVP:** registro/inicio de sesión, gestión de cultivos, registro de sensores como entidad, mediciones simuladas, umbrales por cultivo y alertas. Historial de mediciones y hardware ESP32 quedan fuera del alcance.
- **D2 — Tipos de medición:** los 4 tipos — humedad de suelo, temperatura, humedad ambiental y luz — cada uno con unidad, rango y umbrales propios.
- **D3 — Umbrales agronómicos:** catálogo editable (valores por defecto por tipo de cultivo, sobreescribibles por el usuario, presentados como referencia orientativa).
- **D4 — Modelo de alertas:** binario (alerta cuando la medición sale del rango [mín, máx] del cultivo).
- **D5 — Sensores compartidos:** fuera del MVP, pero el modelo de asociación sensor↔cultivo es N–N desde el inicio.
- **D6 — Fase de simulación:** enfoque híbrido por fases — Fase 1: interfaz con datos falsos para validar pantallas; Fase 2: backend + base de datos + auth real + generador de datos simulados (futuro reemplazo por el ESP32).
- **D7 — Infraestructura:** plataforma gestionada (managed) en tier gratuito; objetivo de coste ~0 €/mes; exportación de datos como criterio de selección; cualquier servicio facturable requiere aprobación previa.
- **D8 — Autenticación y autorización:** auth provisional en Fase 1 (marcada como temporal, no válida como criterio de aceptación), auth real en Fase 2 de la plataforma managed, con autorización por filas (`user_id` + RLS) desde el diseño.
- **D9 — Idioma:** todos los documentos del proyecto en español, conservando en inglés los términos técnicos convencionales; corregido el texto truncado de AGENTS.md §2.
- **D10 — Versionado:** commit inicial de la documentación en `master` como punto de partida.
- **D11 — Equipo:** agentes especializados (planner / implementador / verificador) con documentos de handoff entre ellos y aprobación humana en los hitos.

Planificación (16/10/2026):

- **D12 — Frontend:** Vite + React + TypeScript (SPA en ambas fases).
- **D13 — Backend/infraestructura Fase 2:** Supabase (Postgres + RLS + Auth + API generada), en tier gratuito. El agente tendrá acceso mediante MCP Supabase; la creación de cuenta/proyecto la realiza el humano. Hosting estático gratuito para la SPA.
- **D14 — Modelo de alertas:** una única alerta activa por (cultivo, tipo), que se mantiene activa mientras la medición siga fuera de rango y se marca resuelta al volver al rango.
- **D15 — Frecuencia simulada:** 1 lectura cada 5 minutos por sensor en el generador de datos.

Higiene del proyecto (17/10/2026):

- **D16 — Configuración de agentes:** `opencode.json` se versiona con la API key de Context7 externalizada a `{env:CONTEXT7_API_KEY}` (variable de entorno local, nunca en el repo). Decisión delegada al agente por el humano.
- **D17 — Skills de agentes (17/10/2026):** el humano aprobó la instalación global (`~\.agents\skills\`) de 4 skills seleccionadas por búsqueda en skills.sh: `supabase` y `supabase-postgres-best-practices` (Supabase, oficiales), `accessibility` (Addy Osmani, WCAG 2.2) y `code-review` (Matt Pocock, para el rol Verificador D11). Evaluación de seguridad: Gen *Safe* y Socket *0 alerts* en las 4; Snyk *Med Risk* en `supabase` y `code-review`, *Low Risk* en `accessibility`. Requieren revisión de contenido antes de usarlas (corren con permisos completos del agente).
- **D18 — Ubicación del generador simulado (17/10/2026, aprobada por JowlArx):** el generador de Fase 2 (R-10 AC2, D15) corre en la **SPA abierta**, escribiendo con el token de la sesión del usuario (todo vía RLS; sin secretos ni cambios de configuración de nube). Sustituye al sensor físico «cuando no hay hardware conectado» (R-10). Un generador continuo en servidor (pg_cron / Edge Function con credencial de servicio que bypasea RLS) queda descartado para el MVP por riesgo, coste y la generación continua de datos para cuentas inactivas.
- **D19 — Evaluación de alertas en la BD (17/10/2026, elegida por JowlArx entre la Opción A y la B de cliente):** la evaluación D14 (crear/mantener/resolver, R-13) vive en el SERVIDOR, en un trigger `AFTER INSERT ON measurements` (`evaluar_alertas_de_sensor`, migración `20261017000004`), ejecutado en el contexto del rol que inserta (**SECURITY INVOKER, sin servicio especial**: RLS sigue gobernando; cualquier escritor de mediciones —SPA, ESP32 futuro vía API— queda evaluado en un único punto). La garantía anti-duplicados bajo concurrencia es el índice único parcial D14 + `ON CONFLICT DO NOTHING`. El cliente es solo lector (`ProveedorDatos.cargarAlertas`); sustituye a la evaluación en memoria de T-15/T-24. La semántica se certifica con la suite SQL versionada (identidades simuladas + ROLLBACK), no con pruebas de cliente.

## Decisiones pendientes

- Política de retención/agregación del historial de mediciones (Fase 2).
- Contenido y fuentes del catálogo inicial de cultivos.
- Formato concreto de handoff entre agentes especializados (D11).
- Protocolo de comunicación del ESP32 (post-MVP).
- Aprobación de `docs/plan.md` → completada el 16/10/2026 (M1).

- Aprobación del desglose de `docs/tasks.md` (M2).

## Próximo objetivo

Obtener la aprobación humana del desglose de `docs/tasks.md` (M2), incluida la ubicación de la SPA (`web/` o raíz), para iniciar T-10 bajo supervisión.

## Reglas de actualización

Registrar únicamente hechos comprobados y decisiones aceptadas. Identificar expresamente las hipótesis y actualizar este archivo cuando cambie el estado del proyecto.
