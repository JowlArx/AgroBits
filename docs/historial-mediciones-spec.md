# Historial y gráficas de mediciones — Especificación (borrador, pendiente de aprobación)

> Alcance aprobado el 23/10/2026 (`docs/historial-mediciones.md`). Este documento define los requisitos y criterios de aceptación. **No se implementa nada hasta aprobar esta especificación.**
>
> **Enmienda de ubicación (23/10/2026, decisión del humano: «Prefiero que el historial de mediciones esté en la sección de sensores»):** el Historial de mediciones deja de ser una sección propia de la navegación y pasa a ser una **pestaña dentro de la sección Sensores**, con el estado en la URL (`?vista=sensores&panel=historial`). El resto de la especificación (filtros, gráfica, exportación, retención y RLS) no cambia.
>
> **Enmienda D51 (24/10/2026, aprobada por JowlArx):** el historial deja de ser una pestaña y pasa a un bloque **debajo de la lista de sensores**, siempre visible, sin el parámetro `panel` en la URL. Sustituye el AC1 de R-H1 de la enmienda anterior. Se añade el AC5 de R-H2 (fade del tooltip).

## 1. Objetivo

Permitir al usuario consultar el historial de mediciones de sus sensores/cultivos, verlo en gráficas de barras por día y exportarlo a Excel, con el mínimo coste adicional.

## 2. Requisitos

### R-H1 — Historial consultable

El usuario puede ver las mediciones registradas por sus sensores, filtradas por cultivo, sensor, tipo de medición y rango de fechas.

- **AC1:** El Historial de mediciones se muestra en la sección Sensores, **debajo de la lista de sensores** y siempre visible. No es una pestaña ni una sección propia de la navegación: la barra de navegación y el menú de usuario no tienen entrada «Historial». Se alcanza desde la sección Sensores (`?vista=sensores`). El botón «Ver historial» del detalle de un cultivo abre `?vista=sensores&cultivo=<cultivoId>`, deja el filtro de cultivo preseleccionado y desplaza la vista hasta el historial. La URL no usa el parámetro `panel`. En móvil, el bloque cabe en 390 px sin scroll horizontal.
- **AC2:** El usuario puede filtrar por cultivo, sensor, tipo de medición y rango de fechas (desde/hasta).
- **AC3:** Solo se muestran mediciones de sensores propios (RLS). La cuenta B no ve las de la cuenta A.
- **AC4:** Si no hay mediciones en el rango, se muestra un estado vacío claro.

### R-H2 — Gráfica de barras por día

El usuario ve una gráfica de barras con la media, el máximo y el mínimo del día por sensor/tipo, para el rango seleccionado.

- **AC1:** La gráfica muestra barras agrupadas por día, con media, máximo y mínimo.
- **AC2:** El usuario puede cambiar el rango de fechas y el sensor/cultivo; la gráfica se actualiza.
- **AC3:** La gráfica se renderiza con recharts (ya instalado), sin nueva dependencia de gráficos.
- **AC4:** El tooltip describe **solo la barra bajo el cursor**: nombre de la serie, media, mínimo, máximo y nº de muestras del día, con la fecha como título. Al pasar el puntero por el fondo de la gráfica (fuera de cualquier barra) no se muestra tooltip.
- **AC5:** El tooltip no se desplaza al cambiar de barra: aparece con un fade de opacidad de hasta 150 ms. Con «reducir movimiento» activo, aparece sin fade.

### R-H3 — Exportación a Excel

El usuario puede descargar un archivo `.xlsx` con todos los datos crudos del rango seleccionado.

- **AC1:** Botón «Exportar a Excel» genera un `.xlsx` con columnas: sensor, cultivo, tipo, valor, unidad, fecha/hora.
- **AC2:** El archivo se descarga en el navegador (generación en cliente).
- **AC3:** Solo se exportan datos del usuario (RLS).
- **AC4:** Si no hay datos, el botón está desactivado o avisa.

### R-H4 — Retención y agregación (BD)

Las mediciones crudas se conservan 30 días; los agregados diarios se conservan indefinidamente.

- **AC1:** Existe tabla `mediciones_diarias` con `(sensor_id, tipo, dia, valor_medio, valor_min, valor_max, n)` y RLS por dueño del sensor.
- **AC2:** Job diario agrega las mediciones del día anterior en `mediciones_diarias`.
- **AC3:** Job diario borra mediciones crudas con `measured_at < now() - 30 días`.
- **AC4:** Suite SQL (identidades simuladas + ROLLBACK) valida RLS y agregación; residuo 0.

### R-H5 — Coste controlado

- **AC1:** La gráfica consulta agregados, no crudas, cuando el rango supera 7 días.
- **AC2:** Índice por `(sensor_id, measured_at)` ya existente; añadir índice por `(sensor_id, tipo, dia)` si hace falta.

## 3. Fuera de alcance

- Notificaciones externas, compartir sensores, firmware ESP32 (candidatos §7 separados).
- Agregación por hora/semana (solo diaria).
- Modificación de mediciones (solo lectura + exportación).

## 4. Dependencias y aprobaciones pendientes

- **Librería XLSX** (p. ej. `xlsx`/SheetJS o `exceljs`) para generación en cliente → requiere aprobación de dependencia antes de instalar.
- **pg_cron** ya habilitado (job del purgador de cuentas) → reutilizar para los jobs de agregación y purga.

## 5. Próximo paso

Si apruebas esta especificación, se redacta el plan (`docs/plan.md`) y el desglose de tareas (`docs/tasks.md`), y luego se implementa.