-- T-25 — Evaluación de alertas en la BD (R-13, modelo D14).
-- Decisión del humano (17/10/2026): la evaluación vive en el SERVIDOR, en un
-- trigger sobre `measurements`, de modo que un único punto evalúa CUALQUIER
-- escritor de mediciones (la SPA hoy; el ESP32 o un generador continuo en el
-- futuro, que escribirán directamente contra la API — plan.md §2).
--
-- Semántica D14 aplicada con la misma regla de dominio de T-11
-- (`valor < min || valor > max`; el valor exacto en el límite cuenta como
-- DENTRO de rango):
--   - fuera de rango sin alerta activa  → se CREA (R-13 AC1)
--   - fuera de rango con alerta activa  → se MANTIENE, actualizando el valor
--                                         leído, sin duplicar (AC2). El índice
--                                         único parcial
--                                         `alerts_unica_activa_por_cultivo_tipo`
--                                         + `ON CONFLICT DO NOTHING` hacen el
--                                         duplicado imposible incluso bajo
--                                         escrituras concurrentes (dos
--                                         pestañas o dos dispositivos).
--   - dentro de rango con alerta activa → se RESUELVE con hora (AC3)
--   - dentro de rango sin alerta        → nada (AC4)
--
-- Detalles de diseño:
--  - Evaluación por CULTIVO a partir de la ÚLTIMA lectura de cada tipo entre
--    TODOS los sensores asociados al cultivo (mismo criterio que R-09).
--  - El sensor puede pertenecer a varios cultivos (N–N, D5): cada cultivo se
--    evalúa con sus propios umbrales.
--  - Tipo sin umbral configurado → se omite (no se evalúa).
--  - `SECURITY INVOKER` (el default, declarado explícitamente): el trigger
--    corre con los permisos del rol que inserta y SIN servicio especial; las
--    políticas RLS siguen gobernando todo lo que lee y escribe, de modo que un
--    usuario solo puede generar alertas de sus propios cultivos (R-07/R-14).
--    Un futuro escritor `service_role` (bypass RLS) también dispara la
--    evaluación con sus propios privilegios.
--  - `created_at`/`resolved_at` se fijan a la hora de la MEDICIÓN que
--    originó el cambio (la "hora" que exige R-13 AC1/AC3), no a now().

create or replace function public.evaluar_alertas_de_sensor()
returns trigger
language plpgsql
security invoker
as $$
declare
  enlace record;
  ultima record;
  umbral record;
  activa_id uuid;
begin
  for enlace in
    select sc.crop_id
    from public.sensor_crop sc
    where sc.sensor_id = new.sensor_id
  loop
    for ultima in
      select distinct on (m.tipo) m.tipo, m.value, m.measured_at
      from public.measurements m
      join public.sensor_crop sc on sc.sensor_id = m.sensor_id
      where sc.crop_id = enlace.crop_id
      order by m.tipo, m.measured_at desc
    loop
      select ct.min, ct.max into umbral
      from public.crop_thresholds ct
      where ct.crop_id = enlace.crop_id and ct.tipo = ultima.tipo;

      -- Sin umbral para ese tipo: no se evalúa.
      if not found then
        continue;
      end if;

      select a.id into activa_id
      from public.alerts a
      where a.crop_id = enlace.crop_id
        and a.tipo = ultima.tipo
        and a.estado = 'activa';

      if ultima.value < umbral.min or ultima.value > umbral.max then
        if activa_id is null then
          insert into public.alerts (crop_id, tipo, value, estado, created_at)
          values (enlace.crop_id, ultima.tipo, ultima.value, 'activa', ultima.measured_at)
          on conflict do nothing;
        else
          update public.alerts set value = ultima.value where id = activa_id;
        end if;
      elsif activa_id is not null then
        update public.alerts
        set estado = 'resuelta', value = ultima.value, resolved_at = ultima.measured_at
        where id = activa_id;
      end if;
    end loop;
  end loop;

  return new;
end;
$$;

-- Se evalúa tras CADA medición insertada (los triggers AFTER ROW ven las filas
-- anteriores del mismo statement, de modo que la lectura completa de 4 tipos
-- ya está disponible en el último disparo).
drop trigger if exists measurements_evaluar_alertas on public.measurements;
create trigger measurements_evaluar_alertas
  after insert on public.measurements
  for each row
  execute function public.evaluar_alertas_de_sensor();
