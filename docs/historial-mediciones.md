# Historial y gráficas de mediciones — Borrador de alcance (pendiente de aprobación)

> Documento de clarificación (SDD). No se implementa nada hasta aprobar este alcance.

## 1. Contexto

Hoy el tablero muestra solo las **últimas 15 lecturas** por tipo de medición (widget «Evolución de lecturas», ventana de 5 minutos, D45). El historial completo existe en la tabla `measurements` (sensor, tipo, valor, unidad, `measured_at`), pero **no se consulta ni se presenta** al usuario. El MVP (D1) dejó el historial fuera de alcance; este documento propone incorporarlo.

## 2. Objetivo

Permitir al usuario **consultar el historial de mediciones** de sus sensores/cultivos, verlo en **gráficas de barras por día** y **exportarlo a Excel**, con el mínimo coste adicional.

## 3. Decisiones (resueltas el 23/10/2026)

| # | Pregunta | Propuesta |
|---|----------|-----------|
| D-H1 | ¿Qué datos? | Mediciones crudas (ya existen) **+ agregación diaria** para las gráficas. |
| D-H2 | ¿Retención? | Crudas: **30 días** (borrado automático por job diario). Agregados diarios: **indefinido** (coste bajo, una fila por sensor×tipo×día). |
| D-H3 | ¿Dónde se ve? | **Sección «Historial»** accesible desde el detalle del cultivo (botón «Ver historial») y desde un enlace en el menú de usuario. En móvil, icono en la barra inferior (4.º elemento). |
| D-H4 | ¿Qué gráficas? | **Barras por día**: media + máximo + mínimo del día por sensor/tipo, con selector de rango de fechas y de sensor/cultivo. Se mantiene el widget de líneas del tablero. |
| D-H5 | ¿Exportación? | **Excel (.xlsx)** con **todos los datos crudos** del rango seleccionado, generado en cliente (requiere aprobación de dependencia). |
| D-H6 | ¿Acceso? | Solo el dueño (RLS por `user_id` vía sensor). |
| D-H7 | ¿Coste? | Agregación diaria + retención de crudas a 30 días + índice por `(sensor_id, measured_at)` ya existente. |

## 4. Impacto técnico previsto

- **BD:** tabla `mediciones_diarias` (o vista materializada) con `(sensor_id, tipo, dia, valor_medio, min, max, n)`; job diario de agregación + purga de crudas >30 días; RLS por dueño del sensor.
- **Cliente:** nueva vista/página, gráfico de barras (recharts ya instalado), selector de rango, exportación XLSX.
- **Tests:** suite SQL (identidades simuladas + ROLLBACK) y E2E.

## 5. Fuera de alcance (por ahora)

- Notificaciones externas, compartir sensores, firmware ESP32 (candidatos §7 separados).
- Agregación por hora/semana (solo diaria en esta fase).

## 6. Preguntas abiertas (resueltas)

1. ✅ Retención de crudas a 30 días (afecta solo al historial; las alertas ya guardaron su resultado en `alerts`).
2. ✅ Barras por día: media + máximo + mínimo.
3. ✅ Excel exporta todos los datos crudos del rango seleccionado.
4. ✅ Entrada al historial: botón «Ver historial» en el detalle del cultivo + enlace en el menú de usuario; icono en la barra inferior en móvil.

## 7. Próximo paso (si apruebas)

1. Aprobar este alcance (o ajustarlo).
2. Redactar `docs/spec.md` v4 (o anexo) con requisitos y criterios de aceptación.
3. Planificar (`docs/plan.md`) y desglosar tareas (`docs/tasks.md`).
4. Implementar y verificar.

---
*Documento borrador. No se ha implementado nada.*