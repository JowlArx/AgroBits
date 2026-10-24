# Historial y gráficas de mediciones — Tareas (borrador, pendiente de aprobación)

> Especificación: `docs/historial-mediciones-spec.md` (aprobada 23/10/2026).
> Plan: `docs/historial-mediciones-plan.md` (pendiente de aprobación).
> **Superado en parte por D51 (24/10/2026):** el historial es un bloque debajo de la lista de sensores, no una pestaña; las referencias a `panel=historial` y a las pestañas de este documento no aplican.

## T-H1 — Migración: tabla `mediciones_diarias` + RLS

- **Objetivo:** crear la tabla de agregados diarios con RLS por dueño del sensor.
- **Archivos:** `supabase/migrations/20261023000001_mediciones_diarias.sql`.
- **Criterios de aceptación:** tabla creada, RLS habilitado, PK `(sensor_id, tipo, dia)`, políticas de lectura por dueño del sensor.
- **Pruebas:** suite SQL (identidades simuladas + ROLLBACK, residuo 0).
- **Riesgos:** requiere aprobación para aplicar la migración (única BD dev+prod).

## T-H2 — Migración: jobs de agregación y purga (pg_cron)

- **Objetivo:** programar el job diario de agregación (03:15) y purga de crudas >30 días (03:30).
- **Archivos:** `supabase/migrations/20261023000002_jobs_historial.sql`.
- **Criterios de aceptación:** jobs programados y verificables en `cron.job`.
- **Pruebas:** ejecutar manualmente las funciones y verificar resultados.
- **Riesgos:** pg_cron ya habilitado (D46).

## T-H3 — Suite SQL de historial

- **Objetivo:** validar RLS y agregación con identidades simuladas.
- **Archivos:** `supabase/tests/20261023_t_historial.sql`.
- **Criterios de aceptación:** todas las pruebas OK, residuo 0.
- **Pruebas:** ejecutar vía MCP con ROLLBACK.

## T-H4 — Aprobación e instalación de dependencia XLSX

- **Objetivo:** instalar librería para generar `.xlsx` en cliente.
- **Archivos:** `web/package.json`, `.env` (sin secretos).
- **Criterios de aceptación:** dependencia instalada y documentada; aprobación humana previa (AGENTS.md §5).
- **Pruebas:** build sin errores.
- **Estado:** dependencia instalada (`xlsx@^0.18.5` en `web/package.json`).

## T-H5 — Vista «Historial» (UI)

- **Objetivo:** la vista de historial (filtros, gráfico de barras y exportación) se implementa como **pestaña dentro de la sección Sensores**: el componente `Historial` se reutiliza dentro de `Sensores.tsx` y solo se renderiza el panel activo (el de Sensores o el de historial).
- **Archivos:** `web/src/pages/Historial.tsx`, `web/src/pages/Sensores.tsx`, `web/src/App.tsx`, `web/src/estilos.css`.
- **Criterios de aceptación:** filtros funcionan, gráfico se renderiza, exportación genera `.xlsx`, estado vacío.
- **Pruebas:** vitest + E2E.
- **Estado (23/10/2026):** implementada y verificada — lint ✔, build ✔, vitest **184/184** ✔, Playwright **18/18** ✔ en local. La exportación usa `xlsx@^0.18.5` (`web/package.json`).

## T-H6 — Entrada al historial (navegación) — completada con cambio de ubicación

- **Objetivo original:** botón «Ver historial» en detalle del cultivo + enlace en menú de usuario + icono en barra móvil.
- **Cambio de ubicación (23/10/2026, decisión del humano: «Prefiero que el historial de mediciones esté en la sección de sensores»):** el Historial deja de ser una sección propia de la navegación y pasa a ser una **pestaña dentro de la sección Sensores**; el estado activo vive en la URL (`?vista=sensores&panel=historial` y `&cultivo=<cultivoId>` al venir del detalle de un cultivo).
- **Archivos:** `web/src/pages/Sensores.tsx`, `web/src/pages/DetalleCultivo.tsx`, `web/src/App.tsx`, `web/src/estilos.css`.
- **Criterios de aceptación (verificables con la nueva ubicación):**
  - (a) La barra de navegación **no** tiene botón «Historial» y el menú de usuario **no** tiene entrada «Historial».
  - (b) La sección Sensores muestra las pestañas «Sensores» y «Historial»; al pulsar «Historial» la URL queda en `?vista=sensores&panel=historial` y se muestra el panel de historial (y solo ese).
  - (c) El botón «Ver historial» del detalle de un cultivo abre esa misma pestaña con el cultivo preseleccionado (`?vista=sensores&panel=historial&cultivo=<id>`).
  - (d) Sin `panel`, Sensores muestra su pestaña habitual y la URL no lleva `panel`.
- **Pruebas:** E2E `web/e2e/08-historial-pestana.test.ts` (pestaña y URL; «Ver historial» con cultivo preseleccionado; pestañas sin desborde ni scroll horizontal en móvil 390×844).
- **Estado (23/10/2026):** completada y verificada — lint ✔, build ✔, vitest **184/184** ✔, Playwright **18/18** ✔ en local.

## T-H7 — Verificación y publicación

- **Objetivo:** lint, vitest, build, E2E contra producción, merge a `main`, push.
- **Criterios de aceptación:** 15/15 E2E, build nuevo verificado.
- **Riesgos:** requiere aprobación humana para merge/push (despliega).