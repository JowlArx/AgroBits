# Historial y gráficas de mediciones — Plan (borrador, pendiente de aprobación)

> Especificación: `docs/historial-mediciones-spec.md` (aprobada 23/10/2026).

## 1. Arquitectura

- **BD (Supabase/Postgres):** nueva tabla `mediciones_diarias` (agregados) + job diario de agregación + purga de crudas >30 días. Reutiliza `pg_cron` (ya habilitado).
- **Cliente (Vite+React+TS):** la vista «Historial» se implementa como **pestaña dentro de la sección Sensores** (componente `Historial` reutilizado dentro de `Sensores`), con gráfico de barras (recharts, ya instalado) y exportación XLSX (librería nueva, pendiente de aprobación).
- **RLS:** solo el dueño del sensor ve sus datos.

## 2. Modelo de datos

### Nueva tabla `mediciones_diarias`

```sql
create table public.mediciones_diarias (
  sensor_id uuid not null references public.sensors (id) on delete cascade,
  tipo text not null check (tipo in ('humedad_suelo','temperatura','humedad_ambiental','luminosidad')),
  dia date not null,
  valor_medio double precision not null,
  valor_min double precision not null,
  valor_max double precision not null,
  n integer not null check (n > 0),
  primary key (sensor_id, tipo, dia)
);
```

- RLS: `select`/`delete` por dueño del sensor (herencia vía `sensors.user_id`).
- Índice: `(sensor_id, tipo, dia)` (PK ya lo cubre).

### Job diario de agregación (pg_cron, 03:15 UTC)

```sql
-- Agrega las mediciones del día anterior en mediciones_diarias (upsert).
insert into public.mediciones_diarias (sensor_id, tipo, dia, valor_medio, valor_min, valor_max, n)
select sensor_id, tipo, (measured_at at time zone 'utc')::date,
       avg(value), min(value), max(value), count(*)
from public.measurements
where measured_at >= now() - interval '2 days' and measured_at < now() - interval '1 day'
group by sensor_id, tipo, (measured_at at time zone 'utc')::date
on conflict (sensor_id, tipo, dia) do update
  set valor_medio = excluded.valor_medio, valor_min = excluded.valor_min,
      valor_max = excluded.valor_max, n = excluded.n;
```

### Job diario de purga (pg_cron, 03:30 UTC)

```sql
delete from public.measurements where measured_at < now() - interval '30 days';
```

## 3. Seguridad

- RLS en `mediciones_diarias` por dueño del sensor (mismo patrón que `measurements`).
- Sin políticas de escritura para clientes: agregación/purga solo por funciones SECURITY DEFINER o por el rol `postgres` (cron).
- Exportación XLSX en cliente usa los datos ya filtrados por RLS.

## 4. Cliente

- El componente `Historial` (`web/src/pages/Historial.tsx`) se reutiliza **dentro de la sección Sensores** (`web/src/pages/Sensores.tsx`) como un panel más: la sección muestra las pestañas «Sensores» y «Historial», y solo se renderiza el panel activo.
- El estado vive en la URL (patrón D40): `?vista=sensores&panel=historial` abre Sensores con la pestaña Historial activa; `?vista=sensores&panel=historial&cultivo=<cultivoId>` la abre además filtrada por ese cultivo. Sin `panel`, Sensores muestra su pestaña habitual.
- El panel de historial incluye:
  - Filtros: cultivo, sensor, tipo, rango de fechas.
  - Gráfico de barras (recharts `BarChart`) con media/mín/máx por día.
  - Botón «Exportar a Excel» (genera `.xlsx` en cliente).
  - Estado vacío si no hay datos.
- **Entrada:** la pestaña «Historial» de la sección Sensores y el botón «Ver historial» del detalle de un cultivo (abre la pestaña con el cultivo preseleccionado). **No hay entrada propia de navegación**: ni botón «Historial» en la barra de navegación (ni icono propio en la barra inferior de móvil) ni entrada «Historial» en el menú de usuario.

## 5. Dependencias

- **Librería XLSX** (p. ej. `xlsx`/SheetJS) → requiere aprobación antes de instalar (AGENTS.md §5).
- recharts ya instalado.

## 6. Pruebas

- **Suite SQL** (`supabase/tests/`): identidades simuladas + ROLLBACK, residuo 0. Valida RLS y agregación.
- **Unit tests** (vitest): lógica de agregación, filtros, exportación.
- **E2E** (Playwright): flujo de consulta + exportación.

## 7. Riesgos

- Volumen de datos: agregación diaria mantiene el coste bajo; purga de crudas a 30 días evita crecimiento ilimitado.
- La alerta R-13 usa la última medición exacta; al borrar crudas >30 días, el resultado ya está en `alerts`, no se pierde información de alertas.