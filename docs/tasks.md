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
- **Pendiente de decisión:** `opencode.json` contiene una API key de Context7; no se ha commiteado por la prohibición de publicar credenciales (AGENTS.md §5).

## Fuera de esta versión (M5, post-MVP)

Historial de mediciones, firmware ESP32 y tokens de dispositivo, compartir sensores entre usuarios, notificaciones externas. No generar tareas de este bloque sin modificación aprobada de `docs/spec.md`.
