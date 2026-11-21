-- Luminosidad: zona horaria del usuario, nuevos tipos de alerta (dli, sol_directo),
-- umbrales de lux provisionales, evaluación de luminosidad en horario diurno
-- y horas de sol directo en la evaluación diaria del DLI.
--
-- Aprobada por el humano el 01/11/2026: recupera los umbrales de luz por lectura
-- (solo en horario diurno) y separa las alertas diarias de DLI en su propio tipo.
-- Sustituye parcialmente las decisiones (1) y (3) de 20261027000002_alertas_dli.sql.
--
-- Decisiones de este fichero:
--  (1) perfiles.zona_horaria: texto IANA, sin validación de valores.
--  (2) alerts.tipo admite 'dli' y 'sol_directo'. Las alertas 'luminosidad'
--      existentes se migran a 'dli' (histórico conservado, sin borrado).
--  (3) Horas de sol directo: se cuentan las lecturas de luminosidad del día
--      con value >= sol_directo_umbral_lux, cada una equivale a 5 minutos.
--  (4) La ventana diaria del DLI y de las horas de sol es UTC, no local
--      (limitación conocida).

-- ============================================================================
-- 1. Zona horaria del usuario
-- ============================================================================
alter table public.perfiles
  add column if not exists zona_horaria text not null default 'America/Argentina/Buenos_Aires';

comment on column public.perfiles.zona_horaria is
  'Zona horaria IANA del usuario (p. ej. America/Argentina/Buenos_Aires). Se usa para la ventana diurna de las alertas de luminosidad.';

-- ============================================================================
-- 2. Nuevos tipos de alerta
-- ============================================================================
alter table public.alerts drop constraint if exists alerts_tipo_check;
alter table public.alerts add constraint alerts_tipo_check
  check (tipo in ('humedad_suelo', 'temperatura', 'humedad_ambiental', 'luminosidad', 'dli', 'sol_directo'));

-- Migración del histórico: 'luminosidad' pasa a 'dli'. El índice único parcial
-- (crop_id, tipo) where estado = 'activa' no puede colisionar: 'dli' no tenía
-- filas antes de esta migración y cada cultivo tenía a lo sumo una alerta
-- activa de luminosidad.
update public.alerts set tipo = 'dli' where tipo = 'luminosidad';

-- ============================================================================
-- 3. Perfil de cultivo: horas de sol directo
-- ============================================================================
alter table public.crop_type_perfil
  add column if not exists sol_directo_max_h numeric not null default 6,
  add column if not exists sol_directo_umbral_lux integer not null default 1200;

comment on column public.crop_type_perfil.sol_directo_umbral_lux is
  'PROVISIONAL. Umbral de lux a partir del cual una lectura cuenta como sol directo. Con el divisor actual (resistencia de 10 kΩ) el techo medible del sensor es ~1 800 lux; revisar al cambiar la resistencia del divisor del LDR (p. ej. 1 kΩ).';

comment on column public.crop_type_perfil.sol_directo_max_h is
  'PROVISIONAL. Horas máximas de sol directo por día antes de generar alerta sol_directo. Valor de partición por grupo; no validado con datos de campo.';

-- Hortalizas de hoja: 4 h.
update public.crop_type_perfil set sol_directo_max_h = 4
where crop_type in ('Acelga', 'Achicoria', 'Espinaca', 'Lechuga', 'Radicheta', 'Rúcula', 'Cilantro', 'Perejil', 'Cebolla de verdeo');

-- Cultivos de fruto: 8 h.
update public.crop_type_perfil set sol_directo_max_h = 8
where crop_type in ('Tomate', 'Pimiento', 'Berenjena', 'Calabacín', 'Zapallito de tronco', 'Zapallo anco / Coquena', 'Zapallo cabutiá', 'Zapallo plomo', 'Frutilla');

-- Resto: 6 h (valor por defecto de la columna).

-- ============================================================================
-- 4. Umbrales de lux provisionales (rango real del sensor actual: 0–1 800 lux)
-- ============================================================================
-- PROVISIONAL: 100–1 500 lux corresponde al rango útil del sensor con divisor de
-- 10 kΩ. Al pasar a divisor de 1 kΩ el rango sube y estos límites deben
-- revisarse (subirlos).

-- 4.1 Umbrales por cultivo existente que aún no tengan luminosidad.
insert into public.crop_thresholds (crop_id, tipo, min, max)
select c.id, 'luminosidad', 100, 1500
from public.crops c
where not exists (
  select 1 from public.crop_thresholds ct
  where ct.crop_id = c.id and ct.tipo = 'luminosidad'
);

-- 4.2 Valores por defecto en el catálogo para cada crop_type.
insert into public.crop_type_catalog (crop_type, tipo, default_min, default_max)
select p.crop_type, 'luminosidad', 100, 1500
from public.crop_type_perfil p
on conflict (crop_type, tipo) do nothing;

-- ============================================================================
-- 5. Trigger: luminosidad por lectura solo en horario diurno (07:00–18:59 local)
-- ============================================================================
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
  tz text;
  hora_local integer;
begin
  -- Zona horaria del dueño del sensor; por defecto Buenos Aires.
  select coalesce(
    (select p.zona_horaria
     from public.perfiles p
     join public.sensors s on s.user_id = p.user_id
     where s.id = new.sensor_id),
    'America/Argentina/Buenos_Aires'
  ) into tz;

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
      -- Luminosidad: solo se evalúa entre 07:00 y 18:59 de la hora local del dueño.
      if ultima.tipo = 'luminosidad' then
        hora_local := extract(hour from (ultima.measured_at at time zone tz))::integer;
        if hora_local < 7 or hora_local > 18 then
          continue;
        end if;
      end if;

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

-- ============================================================================
-- 6. Evaluación diaria: DLI (tipo 'dli') y horas de sol directo (tipo 'sol_directo')
-- ============================================================================
-- Ventana diaria en UTC (limitación conocida: no es el día local del usuario).
-- El cron 'evaluar-dli-diario' (03:20 UTC) sigue invocando
-- public.evaluar_alertas_dli_diario() sin argumentos; no se reprograma aquí.
--
-- SECURITY DEFINER: mismo criterio que la versión anterior. Sin EXECUTE para
-- public, anon ni authenticated: solo lo invoca pg_cron.
create or replace function public.evaluar_alertas_dli_diario(p_fecha date default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  dia date := coalesce(p_fecha, (now() at time zone 'utc')::date - 1);
  inicio timestamptz := dia::timestamp at time zone 'utc';
  fin timestamptz := (dia + 1)::timestamp at time zone 'utc';
  enlace record;
  perfil record;
  dli numeric;
  horas_sol numeric;
  lecturas_sol integer;
  activa_dli uuid;
  activa_sol uuid;
begin
  for enlace in
    select sc.sensor_id, c.id as crop_id, c.crop_type
    from public.sensor_crop sc
    join public.crops c on c.id = sc.crop_id
  loop
    select p.dli_min, p.dli_max, p.sol_directo_max_h, p.sol_directo_umbral_lux
      into perfil
    from public.crop_type_perfil p
    where p.crop_type = enlace.crop_type;

    -- Sin perfil: no se evalúa.
    if not found then
      continue;
    end if;

    select sum(least(m.value, 65535)) * 300 / 54 / 1e6 into dli
    from public.measurements m
    where m.sensor_id = enlace.sensor_id
      and m.tipo = 'luminosidad'
      and m.measured_at >= inicio
      and m.measured_at < fin;

    -- Sin lecturas ese día: no hay evidencia para alertar ni resolver.
    if dli is null then
      continue;
    end if;

    -- 5. DLI (banda dli_min..dli_max), solo si el perfil la define.
    if perfil.dli_min is not null and perfil.dli_max is not null then
      select a.id into activa_dli
      from public.alerts a
      where a.crop_id = enlace.crop_id
        and a.tipo = 'dli'
        and a.estado = 'activa';

      if dli < perfil.dli_min or dli > perfil.dli_max then
        if activa_dli is null then
          insert into public.alerts (crop_id, tipo, value, estado, created_at)
          values (enlace.crop_id, 'dli', dli, 'activa', fin)
          on conflict do nothing;
        else
          update public.alerts set value = dli where id = activa_dli;
        end if;
      elsif activa_dli is not null then
        update public.alerts
        set estado = 'resuelta', value = dli, resolved_at = fin
        where id = activa_dli;
      end if;
    end if;

    -- 6. Horas de sol directo: lecturas >= umbral × 5 min / 60.
    select count(*) into lecturas_sol
    from public.measurements m
    where m.sensor_id = enlace.sensor_id
      and m.tipo = 'luminosidad'
      and m.value >= perfil.sol_directo_umbral_lux
      and m.measured_at >= inicio
      and m.measured_at < fin;

    horas_sol := lecturas_sol * 5 / 60.0;

    select a.id into activa_sol
    from public.alerts a
    where a.crop_id = enlace.crop_id
      and a.tipo = 'sol_directo'
      and a.estado = 'activa';

    if horas_sol > perfil.sol_directo_max_h then
      if activa_sol is null then
        insert into public.alerts (crop_id, tipo, value, estado, created_at)
        values (enlace.crop_id, 'sol_directo', horas_sol, 'activa', fin)
        on conflict do nothing;
      else
        update public.alerts set value = horas_sol where id = activa_sol;
      end if;
    elsif activa_sol is not null then
      update public.alerts
      set estado = 'resuelta', value = horas_sol, resolved_at = fin
      where id = activa_sol;
    end if;
  end loop;
end;
$$;

revoke all on function public.evaluar_alertas_dli_diario(date) from public, anon, authenticated;
