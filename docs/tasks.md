# AgroBits — Tareas

Estado: **desglose M2 propuesto el 16/10/2026 — pendiente de aprobación humana.**
Generado a partir de `docs/plan.md` (aprobado, M1) y trazado a `docs/spec.md` v2 (aprobado, M0).

Reglas:
- No iniciar una tarea sin aprobar previamente este listado (o una revisión del mismo).
- Toda tarea indica sus criterios de aceptación y sus pruebas; no se declara terminada sin ejecutarlas (AGENTS.md §8).
- Las tareas con criterios `[F2]` no pueden cerrarse en Fase 1.
- Instalar dependencias o crear la estructura de carpetas requiere confirmación previa al ejecutar la tarea (AGENTS.md §5).

---

## Fase 1 — Interfaz con datos simulados (hito M3)

### T-10 — Estructura del proyecto y tooling
- **Objetivo:** montar la SPA (Vite + React + TypeScript, decisión D12) con test runner (Vitest), linter y `.gitignore` (incluye `.env`, `node_modules`, builds).
- **Dependencias:** M2 aprobado.
- **Archivos afectados:** estructura de la SPA (ubicación por confirmar: raíz o `web/`), `package.json`, `vite.config.ts`, `.gitignore`.
- **Criterios de aceptación:** `npm run dev` sirve la app; `npm run build` compila sin errores; `npm run test` ejecuta 0 tests válidos (infra lista); ningún secreto quede trackeable por Git.
- **Pruebas requeridas:** ejecución de build y suite vacía.
- **Riesgos:** instalación de dependencias → requiere confirmación explícita.

### T-11 — Reglas de dominio puras
- **Objetivo:** definir tipos de medición (D2, 4 tipos con unidades), modelos (cultivo, sensor, medición, alerta), validación de umbrales `min < max` (R-05) y evaluación de alertas modelo D14 (R-13) en módulos sin dependencias de UI ni red.
- **Dependencias:** T-10.
- **Archivos afectados:** `src/domain/*`, `src/domain/*.test.ts`.
- **Criterios de aceptación:** R-05 AC1/AC2 y R-13 AC1–AC4 cubiertos por tests unitarios que pasan.
- **Pruebas requeridas:** Vitest — casos: dentro de rango, fuera por mínimo, fuera por máximo, repetida fuera de rango (sin duplicado), vuelta al rango (resolución), umbral inválido.
- **Riesgos:** confundir "alerta activa" con "historial" (el historial está fuera de alcance).

### T-12 — Generador de datos simulados (cliente) con contrato de medición
- **Objetivo:** mocks de los 4 tipos de medición usando el contrato de R-08 (`sensor_id`, tipo, valor, unidad, `measured_at`), para inyectarlos en la UI sin backend (R-10 AC1).
- **Dependencias:** T-11.
- **Archivos afectados:** `src/data/*`, tests del generador.
- **Criterios de aceptación:** el generador produce mediciones válidas según el contrato; valores plausibles por tipo (rangos realistas por unidad); determinista con semilla para tests.
- **Pruebas requeridas:** Vitest — forma del contrato, tipos, unidades.
- **Riesgos:** formato que luego no coincida con el generador de Fase 2 o el ESP32 (mitigación: un único contrato compartido).

### T-13 — Pantalla de cultivos: CRUD + umbrales
- **Objetivo:** crear, editar y eliminar cultivos (R-04) con nombre, tipo del catálogo o personalizado (R-05) y edición de umbrales [mín, máx] por tipo sobre los valores por defecto del catálogo (R-11, R-12).
- **Dependencias:** T-11, T-12.
- **Archivos afectados:** `src/pages/Cultivos*`, `src/data/catalogo` (semilla del catálogo), tests.
- **Criterios de aceptación:** R-04 AC1–AC3; R-05 AC1–AC2 (rechazo visible de mín ≥ máx); R-11 AC1 (umbrales precargados) y AC2 (aviso de "referencia orientativa"); R-12 AC1 (edición persiste en la sesión).
- **Pruebas requeridas:** tests unitarios de formulario/validación + prueba manual de los flujos.
- **Riesgos:** catálogo inicial sin fuentes documentadas (pregunta abierta de spec §8).

### T-14 — Vista de mediciones del cultivo
- **Objetivo:** mostrar la última medición de los 4 tipos con valor, unidad y hora, o indicador "sin datos" (R-09).
- **Dependencias:** T-12, T-13.
- **Archivos afectados:** `src/pages/DetalleCultivo*`, componentes de medición.
- **Criterios de aceptación:** R-09 AC1 y AC2 (nunca inventar valores).
- **Pruebas requeridas:** tests de componente con datos presentes/ausentes.
- **Riesgos:** maquetar pensando en historial (fuera de alcance) y arrastrar complejidad.

### T-15 — Pantalla de alertas (UI)
- **Objetivo:** visualizar las alertas activas y resueltas de los cultivos con su detalle (R-14 AC2), reflejando el modelo D14 sobre los datos simulados.
- **Dependencias:** T-11, T-13.
- **Archivos afectados:** `src/pages/Alertas*`.
- **Criterios de aceptación:** R-13 AC1–AC4 observables en la UI con el generador; R-14 AC2 (detalle completo).
- **Pruebas requeridas:** tests de componente + prueba manual con generador forzado fuera de rango.
- **Riesgos:** mostrar alertas de "cultivos ajenos" solo aplica en Fase 2 (R-14 AC1 marcada `[F2]`).

### T-16 — Login provisional maquetado
- **Objetivo:** pantallas de registro/inicio de sesión maquetadas con usuario simulado, **marcadas como provisional** en UI y código (D6/D8).
- **Dependencias:** T-10.
- **Archivos afectados:** `src/pages/Auth*`.
- **Criterios de aceptación:** flujos de UI navegables; ningún texto ni documentación afirman que la autenticación es real; no valida R-01…R-03 (declarado).
- **Pruebas requeridas:** prueba manual de navegación.
- **Riesgos:** que se de por validado el login (recordatorio permanente en la UI).

### T-17 — Revisión humana de la Fase 1 (hito M3)
- **Objetivo:** demo de todos los flujos con datos simulados y checklist trazada a los criterios de la spec verificables sin backend.
- **Dependencias:** T-10…T-16.
- **Archivos afectados:** ninguno (informe de verificación).
- **Criterios de aceptación:** checklist completada, limitaciones declaradas, **aprobación explícita del humano** para entrar en Fase 2.
- **Pruebas requeridas:** manual completa.
- **Riesgos:** pasar de largo la revisión y empezar Fase 2 sin validar la UI.

### T-18 — Registro y asociación de sensores (UI Fase 1)
*(Añadida el 17/10/2026 con autorización explícima del humano: R-06 carecía de tarea en el desglose original M2.)*
- **Objetivo:** entidad de sensor en la Fase 1 con alta desde la vista del cultivo y asociación sensor↔cultivo (modelo N–N según D5, con un solo cultivo en la interfaz del MVP), reflejada en la visualización de mediciones (R-06 AC1–AC3).
- **Dependencias:** T-13, T-14.
- **Archivos afectados:** `src/data/storeSensores.ts` (nuevo), `src/data/medicionesSimuladas.ts` (mediciones por sensor), `src/pages/DetalleCultivo.tsx`, `src/pages/ListaCultivos.tsx` (limpieza de asociaciones al eliminar un cultivo), tests.
- **Criterios de aceptación:** R-06 AC1 (crear sensor con nombre y verlo listado), AC2 (asociarlo a un cultivo propio y que la asociación se refleje en la vista de mediciones), AC3 (el modelo soporta múltiples asociaciones N–N aunque la UI asocie a un cultivo).
- **Pruebas requeridas:** unitarias del store (alta, validación, N–N, desasociación) + tests de flujo en la vista del cultivo; verificación en navegador.
- **Riesgos:** reestructuración interna de `medicionesSimuladas.ts` (de clave por cultivo a clave por sensor) — afecta a tests de T-14 que deberán actualizarse sin perder cobertura.

---

## Fase 2 — Backend y datos reales (hito M4)

### T-20 — Proyecto Supabase, esquema y RLS
- **Objetivo:** crear el proyecto (acción humana, tier gratuito, D7/D13), aplicar el esquema de `plan.md` §3 con migraciones y políticas RLS en todas las tablas con `user_id`.
- **Dependencias:** T-17 (Fase 1 revisada); aprobación humana para crear el servicio.
- **Archivos afectados:** migraciones SQL, configuración de entorno.
- **Criterios de aceptación:** tablas creadas según plan; RLS activa en todas ellas; sin `service_role` en el cliente; documentado cómo exportar los datos.
- **Pruebas requeridas:** inspección de políticas + pruebas T-21.
- **Riesgos:** RLS incompleta = fuga de datos (riesgo principal del proyecto).

### T-21 — Pruebas de autorización con dos cuentas (gate de seguridad)
- **Objetivo:** verificar R-02 y R-07 con cuentas A y B: ninguna lectura/escritura cruzada (AC de R-02 y AC1 de R-07).
- **Dependencias:** T-20.
- **Archivos afectados:** suite de integración.
- **Criterios de aceptación:** todas las pruebas cruzadas fallan cuando deben fallar y pasan cuando deben pasar; ejecución registrada.
- **Pruebas requeridas:** integración (Supabase local o proyecto de pruebas).
- **Riesgos:** no cubrir todos los caminos de acceso (mitigación: matriz tabla × operación × usuario).

### T-22 — Auth real y sustitución del login provisional
- **Objetivo:** integrar Supabase Auth (registro, sesión, cierre, reset) retirando el login simulado (R-01, R-02, R-03).
- **Dependencias:** T-20, T-21.
- **Archivos afectados:** `src/pages/Auth*`, capa de sesión.
- **Criterios de aceptación:** R-01 AC1–AC3, R-02, R-03 AC1 verificadas.
- **Pruebas requeridas:** integración + E2E mínima (registro → login → logout).
- **Riesgos:** reglas de contraseña mal documentadas.

### T-23 — Capa de datos: mocks → Supabase
- **Objetivo:** sustituir el inyectador de mocks por el cliente Supabase manteniendo el contrato de medición (R-09 con datos reales de la BD).
- **Dependencias:** T-20, T-13, T-14.
- **Archivos afectados:** `src/data/*`.
- **Criterios de aceptación:** la UI opera contra la BD sin cambiar pantallas; R-09 AC1/AC2 siguen cumpliéndose.
- **Pruebas requeridas:** integración (crear cultivo/medición → ver en UI).
- **Riesgos:** acoplamiento UI↔Supabase (mantener la capa intercambiable del plan).

### T-24 — Generador de datos simulados en Fase 2
- **Objetivo:** generador que escribe mediciones vía API con frecuencia de 5 min/sensor (D15) y formato idéntico al contrato (R-10 AC2).
- **Dependencias:** T-20, T-12.
- **Archivos afectados:** script/función de generación.
- **Criterios de aceptación:** R-10 AC2 verificada; consumos dentro del tier gratuito.
- **Pruebas requeridas:** integración (se generan y se leen mediciones).
- **Riesgos:** sobrepasar límites del tier gratuito.

### T-25 — Evaluación de alertas en Fase 2
- **Objetivo:** generar y resolver alertas al modelo D14 cuando entran mediciones (índice único de una alerta activa por cultivo/tipo).
- **Dependencias:** T-20, T-11 (reglas ya testeadas), T-24.
- **Archivos afectados:** lógica de alertas (BD o servidor).
- **Criterios de aceptación:** R-13 AC1–AC4 y R-14 AC1 verificadas; sin duplicados bajo escrituras repetidas.
- **Pruebas requeridas:** integración (incluido caso de concurrencia básica: dos lecturas fuera de rango seguidas).
- **Riesgos:** duplicados por condición de carrera (mitigación: restricción única en BD).

### T-26 — Validación final de la especificación (hito M4)
- **Objetivo:** checklist completa R-01…R-14 (incluidos los `[F2]`), suite E2E (Playwright) de flujos críticos e informe de limitaciones.
- **Dependencias:** T-20…T-25.
- **Archivos afectados:** suite E2E, informe de validación.
- **Criterios de aceptación:** todos los AC de la spec ejecutados y marcados; pruebas pendientes declaradas; aprobación humana de cierre de Fase 2.
- **Pruebas requeridas:** E2E + manual.
- **Riesgos:** dar por válido lo no probado (prohibido por AGENTS.md §8).

---

## Registro de verificación

- **T-10 — Completada el 17/10/2026.** Verificado: `npm run test` (1 test de humo, aprobado), `npm run build` (tsc + vite build sin errores), `npm run lint` (sin incidencias). Dependencias instaladas con autorización: react@19.3.1, vite@8.3.4, vitest@4.1.12, typescript@6.0.3, eslint@10.13.0; 0 vulnerabilidades reportadas. Estructura creada en `web/` (decisión aprobada). Desviación menor del criterio original: en vez de "0 tests", se incluyó un test de humo para comprobar que la infraestructura de tests realmente ejecuta — se declara explícitamente.
- **T-21 — Completada el 17/10/2026.** Gate de seguridad con dos cuentas contra el RLS real, ejecutado vía MCP (`execute_sql`) sobre el proyecto de desarrollo (`plan.md` §4.2 permite «proyecto de pruebas vía MCP»). **Metodología:** identidades simuladas en SQL (`set local role authenticated` + `request.jwt.claim.sub/claims` con el `user_id` de la cuenta A o B) dentro de **una sola transacción terminada en `ROLLBACK`** — las cuentas de prueba y todos sus datos nacieron y murieron en la transacción. **Suite versionada en `supabase/tests/20261017_t21_autorizacion_dos_cuentas.sql`. Resultado ejecutado: 22/22 pruebas OK**, incluidos: lecturas cruzadas A→B en las 5 tablas de datos (0 filas ajenas visibles), escrituras cruzadas rechazadas o sin efecto (update/delete de cultivo ajeno = 0 filas; insert con `user_id` ajeno, umbral/medición/alerta en entidad ajena = rechazo `42501`), **R-07 AC1**: `sensor propio → cultivo ajeno` y `sensor ajeno → cultivo propio` **rechazados**, **R-14 AC1** (lectura y escritura de alertas ajenas) rechazada, catálogo legible (16 filas) pero **inmutable para clientes**, **controles positivos** de A (insertar cultivo propio, umbral, N-N de su sensor a su segundo cultivo, medición y alerta propias) = 1 fila cada uno, y simetría con B. **Hallazgo de seguridad (positivo):** este proyecto Supabase **auto-activa RLS en las tablas nuevas** — la tabla temporal de resultados quedó denegada hasta deshabilitar RLS explícitamente; refuerza el objetivo de R-07/R-02. **Residuo verificado tras el `ROLLBACK`:** 0 cuentas de prueba, 0 cultivos/sensores/mediciones/alertas, tabla de resultados inexistente, catálogo intacto (16 filas). **Limitación declarada:** la simulación prueba las políticas RLS y la semántica de `auth.uid()`; no sustituye un login real con token de GoTrue — eso llega con T-22 (auth real) y la prueba final del gate en el flujo de aplicación.
- **T-20 — Completada el 17/10/2026.** Proyecto Supabase de desarrollo ya existente y conectado por MCP (`fxiukidjxdcsrhyiphmu`, 0 migraciones previas; creación del proyecto = acción humana previa, D7/D13 — verificado que ya estaba hecho). **3 migraciones aplicadas y versionadas en `supabase/migrations/`:** `20261017000001_create_agrobits_tables` (7 tablas según `plan.md` §3: `crops`, `crop_thresholds`, `sensors`, `sensor_crop`, `measurements`, `alerts`, `crop_type_catalog`; índices de `measurements` y **índice único parcial** `alerts_unica_activa_por_cultivo_tipo` para D14; checks `min < max` y tipos de medición), `20261017000002_enable_rls_and_policies` (**RLS en las 7/7 tablas + 25 políticas**: 4 por tabla de datos con `to authenticated` y herencia por `crop_id`/`sensor_id`, catálogo de solo lectura), `20261017000003_seed_crop_type_catalog` (16 filas idénticas a `web/src/data/catalogo.ts`). **Verificación ejecutada (AC):** (1) `pg_class.relrowsecurity = true` en las 7 tablas; (2) `pg_policies` = 25 políticas con los nombres esperados y **cero políticas para `anon`** (denegación por defecto pese a los grants por defecto de Supabase); (3) semilla: 4 tipos × 4 mediciones; (4) **sin `service_role` ni claves en el cliente**: grep del repo sin resultados (solo `project_ref` del MCP en `opencode.json`, no es un secreto) y `.env`/`.env.*` cubiertos por `.gitignore` desde T-10. **Cómo exportar los datos (AC):** — *(a)* Dashboard → **Table Editor → Download CSV** por tabla; *(b)* **SQL Editor** con el rol `postgres`: `copy (select * from public.<tabla>) to stdout with csv header`; *(c)* CLI/terminal: `pg_dump <connection-string> --data-only --table='public.*'` o `supabase db dump --data-only` (connection string en Dashboard → Settings → Database — credencial secreta, nunca en repo ni logs); *(d)* esquema completo reproducible desde `supabase/migrations/` y el historial remoto (`list_migrations`). **Limitación declarada:** la *aplicación efectiva* de las políticas frente a un JWT de `authenticated` aún no está probada — es el objetivo de T-21 (gate de seguridad con dos cuentas), previsto en `plan.md` §4.2.
- **T-17 — Completada el 17/10/2026: aprobación explícita del humano («Comienza fase 2»), hito M3 cerrado.** Checklist de la demo (abajo) revisada por el humano junto con el vídeo; sin cambios solicitados. Se autoriza el inicio de Fase 2 (T-20).

  **Demo (prueba manual completa, grabada):** `C:\Users\uarce\AppData\Local\Temp\opencode\demo-fase1-final.mp4` (1,6 MB, 17/10/2026). Flujo íntegro sobre `http://localhost:5173`: acceso provisional → envío inválido → login → alta con umbral inválido rechazado → alta correcta → sensor + lectura → alerta creada/sin duplicar/resuelta → eliminaciones → cierre de sesión. Cada paso fue comprobado sobre el snapshot de la página en el momento de ejecutarlo (los valores precargados, por ejemplo, se leyeron de los inputs: `minT=15 maxT=28 maxL=50000`).

  **Checklist trazada a `spec.md` — criterios verificables en Fase 1 (todos ejecutados):**

  | Requisito | AC | Evidencia |
  |---|---|---|
  | R-04 | AC1 | Cultivo "Demo Huerto" creado y visible en la lista (demo + test) |
  | R-04 | AC2 | Umbral editado de [0,1] a [0,100] en "Demo Alertas" con formulario precargado (demo + test) |
  | R-04 | AC3 | "Demo Tranquilo" y "Demo Alertas" eliminados y fuera de la lista; "Demo Huerto" permanece (demo + test) |
  | R-05 | AC1 | Guardado con los 4 pares mín<máx válidos (demo + test) |
  | R-05 | AC2 | min temperatura 30 > máx 28 → error "menor" y NO guardado (demo + test) |
  | R-06 | AC1 | Sensor creado con nombre y listado en el detalle (demo + test) |
  | R-06 | AC2 | Asociación reflejada: con sensor aparecen las lecturas, sin él no (demo + test) |
  | R-06 | AC3 | Modelo N–N verificado en store: mismo sensor en dos cultivos (test unitario) |
  | R-09 | AC1 | Detalle muestra 4/4 tipos con unidades (% vol, °C, % HR, lux) y hora (demo + test) |
  | R-09 | AC2 | Antes de la primera lectura: 4 × "sin datos" y sin botón de generación (demo + test) |
  | R-10 | AC1 | Aplicación completa sin backend: **0 peticiones xhr/fetch** en la lista de red (demo) — estado provisional que NO valida R-01…R-03 |
  | R-11 | AC1 | Precarga del catálogo leída de los inputs: Tomate `minT=15 maxT=28 maxL=50000` (demo + test) |
  | R-11 | AC2 | Aviso "referencia orientativa, no asesoramiento agronómico" presente (demo + test) |
  | R-12 | AC1 | Tras editar el umbral, la siguiente lectura resolvió la alerta (demo + test) |
  | R-13 | AC1 | Lectura fuera de rango → alerta con tipo, valor leído y hora (demo + test) |
  | R-13 | AC2 | Dos lecturas fuera de rango → UNA sola fila activa (demo + test) |
  | R-13 | AC3 | Vuelta al rango → "Resuelta" con hora de resolución y sin "Activa" (demo + test) |
  | R-13 | AC4 | Cultivo de umbrales amplios + lectura → lista de alertas vacía (demo + test) |
  | R-14 | AC2 | Detalle con cultivo, tipo, valor + unidad y hora (demo + test) |

  **Criterios NO verificables en Fase 1 (declarados, gate = T-21 en Fase 2):** R-01 AC1–AC3 (registro real, duplicados, política de contraseñas), R-02 AC1–AC2 (autorización por fila con dos cuentas), R-03 AC1 (rutas protegidas con sesión real), R-07 AC1, R-08 AC1–AC2 (persistencia real), R-10 AC2, R-14 AC1. El acceso de la Fase 1 es una maqueta y así lo indica su propia UI.

  **Alcance fuera de MVP (§7) — comprobado que no aparece:** historial/gráficas, hardware/ESP32, compartir sensores, notificaciones externas, móvil/suscripciones/riego.

  **Hallazgos de la revisión:** (1) **Corregido** — las alertas de un cultivo eliminado quedaban huérfanas (mostraban "Cultivo eliminado"): añadida `eliminarAlertasDeCultivo` con 2 tests nuevos (commit `5872a34`). (2) No se detectaron más incidencias funcionales.

  **Limitaciones declaradas:** almacén en memoria (recargar la página vacía los datos — hasta T-23); gate de sesión sin validación de credenciales; sin UI para desasociar un sensor (no lo exige la spec; el modelo lo soporta); sensores sin cultivo se eliminan (simplificación de Fase 1).

  **Verificación automatizada final (commit de la tarea):** `npm run test` → 13 archivos y **90 tests**; `npm run build` sin errores; `npm run lint` sin incidencias; consola del navegador con 0 errores y 0 avisos.

  **Estado:** ✔ aprobada por el humano el 17/10/2026 («Comienza fase 2») — ver registro superior.
- **T-16 — Completada el 17/10/2026.** Verificado: `npm run test` → 13 archivos y 87 tests aprobados; `npm run build` sin errores; `npm run lint` sin incidencias. Archivos: `src/data/storeSesion.ts` (**sesión simulada provisional**: `iniciarSesion`/`registrarse` solo validan formato de email y clave no vacía; NO verifica credenciales contra servidor y NO comprueba emails duplicados — declarado en el propio código y en `src/pages/Autenticacion.tsx`), pantalla `src/pages/Autenticacion.tsx` (modos iniciar sesión/registro con aviso permanente "no valida credenciales ni crea cuentas reales… Fase 2"), gate de sesión en `src/App.tsx` (sin sesión solo se ve el acceso; con sesión: email del usuario + "Cerrar sesión" + navegación), tests `storeSesion.test.ts` (7) y `Autenticacion.test.tsx` (7), y `beforeEach` con sesión simulada añadido en `App.test.tsx`, `DetalleCultivo.test.tsx` y `Alertas.test.tsx` (los tests previos asumen sesión abierta). Criterios cubiertos: flujos de UI navegables (registro + inicio de sesión + cierre), ningún texto afirma que la autenticación es real (aviso verificado en UI y test `aviso-provisional`), y **R-01…R-03 NO validadas — declarado explícitamente** (su gate es T-21 en Fase 2). **Incidencia detectada:** el `input` con `type="email"` activaba la validación nativa (jsdom/Chrome) que bloqueaba el `submit` antes de la validación propia → cambiado a `type="text"` con `autoComplete="email"` para que el mensaje en español sea consistente; regex del aviso ajustado al texto real ("…ni crea cuentas reales"). **Prueba manual de navegación en navegador:** estado inicial con acceso provisional y sin contenido de la app → envío inválido muestra los 2 errores y no entra → login válido entra con email visible en cabecera → navegación Alertas↔Cultivos → "Cerrar sesión" vuelve al acceso ocultando todo → modo "Regístrate" crea la sesión maqueta y entra; **consola con 0 errores y 0 avisos**.
- **T-15 — Completada el 17/10/2026.** Verificado: `npm run test` → 11 archivos y 72 tests aprobados; `npm run build` sin errores; `npm run lint` sin incidencias. Archivos: `src/data/storeAlertas.ts` (store de alertas con modelo D14: una única alerta activa por (cultivo, tipo), crea/mantiene/resuelve usando la regla pura `evaluarAlerta` de T-11), `src/pages/Alertas.tsx` (pantalla con lista ordenada activas-primero, estado vacío y detalle cultivo/tipo/valor/hora + hora de resolución), evaluación de alertas al generar lecturas en `src/pages/DetalleCultivo.tsx`, navegación "Cultivos"/"Alertas" en `src/App.tsx`, estilos de navegación y estados de alerta en `src/estilos.css`, tests `storeAlertas.test.ts` (7) y `Alertas.test.tsx` (6). Criterios cubiertos: R-13 AC1 (lectura fuera de rango crea alerta), AC2 (lecturas repetidas fuera de rango no duplican), AC3 (volver al rango resuelve la alerta con su hora), AC4 (dentro del rango no crea nada), R-14 AC2 (detalle con cultivo, tipo, valor y hora). R-14 AC1 queda [F2] con R-07 (verificación con dos cuentas en T-21). **Incidencia detectada y corregida en navegador:** desde la pantalla de Alertas no había forma de volver a la lista de cultivos; se añadió el botón "Cultivos" en la navegación global (con test). **Tercer caso del pitfall de `useSyncExternalStore`:** `alertasOrdenadas()` como `getSnapshot` devolvía arrays nuevos; se sustituyó por la referencia del store. **Verificación en navegador real (en `http://localhost:5174`, el 5173 quedó obsoleto tras el reinicio del entorno):** estado vacío "No hay alertas"; cultivo con umbrales que fuerzan la salida de rango → tras 2 lecturas **una sola** alerta "Humedad de suelo (% vol)" con cultivo "Huerto en peligro", valor 24.2 % vol y hora; editar umbrales + nueva lectura → alerta "Resuelta" con hora de resolución 17/10/2026, 2:04:25 y sin "Activa"; **consola con 0 errores**.
- **T-18 — Completada el 17/10/2026.** Verificado: `npm run test` → 9 archivos y 59 tests aprobados; `npm run build` sin errores; `npm run lint` sin incidencias. Archivos: `src/data/storeSensores.ts` (entidad Sensor con `cultivoIds[]` N–N D5, alta, asociación con validación de existencia, `quitarAsociacionesDeCultivo` al borrar cultivo), refactor de `src/data/medicionesSimuladas.ts` (**mediciones ahora por sensor**, no por cultivo; `ultimasPorTipo` toma la lectura más reciente entre los sensores del cultivo), `src/pages/DetalleCultivo.tsx` (sección de sensores con alta+asociación), `src/pages/ListaCultivos.tsx` (limpieza de asociaciones y mediciones al eliminar), tests `storeSensores.test.ts` y `DetalleCultivo.test.tsx` actualizados. Criterios cubiertos: R-06 AC1 (alta y listado, rechazo de nombre vacío), AC2 (la asociación se refleja en la vista de mediciones), AC3 (modelo N–N verificado en store: un sensor en dos cultivos; la vista refleja asociaciones existentes — la UI del MVP solo asocia al cultivo actual, según spec). **Bugs detectados y corregidos durante la tarea:** (1) `quitarAsociacionesDeCultivo` no persistía la retirada de asociación cuando el sensor se conservaba (condición basada en longitudes); (2) snapshots de `useSyncExternalStore` no cacheables (se sustituyeron por referencias de store y huella de texto). **Verificación en navegador real:** cultivo sin sensores → "Este cultivo aún no tiene sensores asociados" + 4 tipos "sin datos" + sin botón de lectura; crear "Sensor del balcón" → listado y lecturas habilitadas; generar → 4/4 con unidades y hora; **consola con 0 errores**. Nota: en el test AC3 se corrigió el uso de `act()` para llamadas a la store fuera de eventos de React.
- **T-14 — Completada el 17/10/2026.** Verificado: `npm run test` → 8 archivos y 46 tests aprobados; `npm run build` sin errores; `npm run lint` sin incidencias. Archivos: `src/data/medicionesSimuladas.ts` (sensor virtual por cultivo con límite de 200 lecturas, semilla determinista, limpieza al eliminar cultivo), `src/pages/DetalleCultivo.tsx`, navegación en `src/App.tsx`, botón "Ver mediciones" y limpieza en `src/pages/ListaCultivos.tsx`, tests `DetalleCultivo.test.tsx`. Criterios cubiertos: R-09 AC1 (valor + unidad + hora en los 4 tipos) y AC2 ("sin datos" sin inventar valores, incluido "—" en la hora). **Verificación en navegador real:** detalle del cultivo muestra los 4 tipos en "sin datos" antes de la primera lectura y "4 de 4" con unidades correctas (% vol, °C, % HR, lux) y hora legible tras pulsar "Generar lectura simulada"; consola sin errores. Incidencia conocida del watcher de Vite repetida: se resolvió con `touch` de los archivos afectados (ver registro de T-13).
- **T-13 — Completada el 17/10/2026.** Verificado: `npm run test` → 7 archivos y 40 tests aprobados; `npm run build` sin errores; `npm run lint` sin incidencias. Archivos: `src/data/catalogo.ts` (catálogo D3 con 4 cultivos + aviso R-11 AC2), `src/data/storeCultivos.ts` (CRUD en memoria Fase 1 con validación), `src/pages/ListaCultivos.tsx`, `src/pages/FormularioCultivo.tsx`, `src/App.tsx` (navegación simple), `src/estilos.css`, `src/vite-env.d.ts` (declaración de imports CSS, añadido al detectar el error TS2882 en build) y tests (`storeCultivos.test.ts`, `App.test.tsx` con Testing Library + jsdom). Criterios cubiertos: R-04 AC1–AC3, R-05 AC1–AC2, R-11 AC1–AC2, R-12 AC1. Dependencias añadidas con autorización: jsdom, @testing-library/react, @testing-library/dom (0 vulnerabilidades). **Verificación en navegador real (Chrome DevTools):** la app carga en `http://localhost:5173/`, flujo completo crear→guardar→verificar lista operativo, umbrales de Tomate precargados en el formulario (R-11 AC1 visible), consola sin errores tras dos arreglos menores detectados en esa revisión: favicon 404 (añadido `public/favicon.svg`) y campos sin `name` (añadidos atributos). **Incidencia de entorno detectada:** el watcher de Vite no captó un edit del archivo (`FormularioCultivo.tsx` servía una transformación cacheada); se resolvió con `touch` y se debe recordar que, si un cambio no se refleja en el navegador, hay que forzar el watcher o reiniciar `npm run dev`.
- **T-12 — Completada el 17/10/2026.** Verificado: `npm run test` → 5 archivos y 22 tests aprobados; `npm run build` sin errores; `npm run lint` sin incidencias. Archivos: `src/data/generador.ts` (PRNG mulberry32 con semilla, `crearGenerador()`, `generarSerie()` con intervalo de 5 min D15) y `src/data/generador.test.ts`. Criterios cubiertos: contrato R-08 para los 4 tipos, valores dentro de `RANGOS_SIMULACION` (200 muestras por tipo), determinismo con semilla, separación de 5 min entre lecturas y presencia de los 4 tipos por instante.
- **T-11 — Completada el 17/10/2026.** Verificado: `npm run test` → 4 archivos y 16 tests aprobados (Vitest); `npm run build` (tsc + vite) sin errores; `npm run lint` sin incidencias. Archivos: `src/domain/tipos.ts` (4 tipos D2, unidades, contrato de medición R-08), `src/domain/umbrales.ts` (validación R-05 AC1/AC2), `src/domain/alertas.ts` (evaluación R-13 AC1–AC4, modelo D14) y sus 3 suites de tests. Criterios cubiertos: R-05 AC1/AC2 y R-13 AC1–AC4 con casos de frontera (valor exacto en el límite = dentro de rango).
- **`opencode.json` — Resuelto el 17/10/2026 (decisión del agente, delegada por el humano):** se versiona el archivo con la API key de Context7 externalizada a `{env:CONTEXT7_API_KEY}` (sustitución soportada por OpenCode), y la clave se configuró como variable de entorno de usuario en la máquina local (no se publica). Verificado: `grep ctx7sk opencode.json` → 0 coincidencias.

## Fuera de esta versión (M5, post-MVP)

Historial de mediciones, firmware ESP32 y tokens de dispositivo, compartir sensores entre usuarios, notificaciones externas. No generar tareas de este bloque sin modificación aprobada de `docs/spec.md`.
