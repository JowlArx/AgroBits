-- Alertas de luminosidad por DLI diario (aprobado por JowlArx el 27/10/2026).
--
-- Decisiones aprobadas:
--  (1) La luminosidad deja de tener umbrales en lux. Sus filas tipo='luminosidad'
--      se eliminan de crop_thresholds y crop_type_catalog; se archivan al final
--      de este fichero como INSERT comentados.
--  (2) La evaluación de luminosidad es DIARIA: pg_cron ejecuta
--      evaluar_alertas_dli_diario() cada día y compara el DLI estimado del día
--      anterior (UTC) con la banda dli_min..dli_max de crop_type_perfil.
--  (3) El trigger evaluar_alertas_de_sensor() deja de evaluar el tipo
--      'luminosidad' por lectura.

-- ============================================================================
-- 1. Evaluación diaria del DLI
-- ============================================================================
-- DLI estimado (mol/m²/día) = Σ min(lux, 65535) × 300 s / 54 lux·µmol⁻¹ / 1e6.
--  - 300 s: cadencia de 5 minutos entre lecturas del sensor (src/domain/luz.ts).
--  - 54: aproximación solar (1 µmol/m²/s ≈ 54 lux); no es válida bajo luz LED.
--  - Los huecos de lecturas SUBESTIMAN el DLI: el cálculo no interpola.
--  - Se satura en 65535 lux (límite del BH1750).
--
-- Dedup: la misma regla que el trigger: un único índice parcial
-- alerts_unica_activa_por_cultivo_tipo + ON CONFLICT DO NOTHING; si ya hay
-- alerta activa se actualiza el valor (fuera de banda) o se resuelve (en banda).
--
-- Sin perfil (o banda NULL) para el cultivo, o sin lecturas ese día → no se
-- genera ni resuelve alerta.
--
-- p_fecha permite evaluar un día concreto (pruebas); el cron usa el default
-- (día UTC anterior).
--
-- SECURITY DEFINER: se ejecuta con los privilegios del propietario (necesario
-- porque el cron no tiene sesión de usuario). Sin EXECUTE para public, anon ni
-- authenticated: solo lo invoca pg_cron.

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
  activa_id uuid;
begin
  for enlace in
    select sc.sensor_id, c.id as crop_id, c.crop_type
    from public.sensor_crop sc
    join public.crops c on c.id = sc.crop_id
  loop
    select p.dli_min, p.dli_max into perfil
    from public.crop_type_perfil p
    where p.crop_type = enlace.crop_type;

    -- Sin perfil o sin banda DLI: no se evalúa.
    if not found or perfil.dli_min is null or perfil.dli_max is null then
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

    select a.id into activa_id
    from public.alerts a
    where a.crop_id = enlace.crop_id
      and a.tipo = 'luminosidad'
      and a.estado = 'activa';

    if dli < perfil.dli_min or dli > perfil.dli_max then
      if activa_id is null then
        insert into public.alerts (crop_id, tipo, value, estado, created_at)
        values (enlace.crop_id, 'luminosidad', dli, 'activa', fin)
        on conflict do nothing;
      else
        update public.alerts set value = dli where id = activa_id;
      end if;
    elsif activa_id is not null then
      update public.alerts
      set estado = 'resuelta', value = dli, resolved_at = fin
      where id = activa_id;
    end if;
  end loop;
end;
$$;

revoke all on function public.evaluar_alertas_dli_diario(date) from public, anon, authenticated;

-- ============================================================================
-- 2. Programación diaria (03:20 UTC, tras la purga de las 03:00)
-- ============================================================================
select cron.schedule(
  'evaluar-dli-diario',
  '20 3 * * *',
  'select public.evaluar_alertas_dli_diario()'
);

-- ============================================================================
-- 3. Retirada de los umbrales de luminosidad en lux
-- ============================================================================
-- Conteo previo en la BD (verificado 27/10/2026; el RAISE NOTICE lo confirma al aplicar):
--   crop_type_catalog tipo='luminosidad': 4 filas (seed 20261017000003: Tomate,
--     Lechuga, Albahaca, Pimiento).
--   crop_thresholds tipo='luminosidad': 9 filas.
do $$
declare
  n_umbrales integer;
  n_catalogo integer;
begin
  select count(*) into n_umbrales from public.crop_thresholds where tipo = 'luminosidad';
  select count(*) into n_catalogo from public.crop_type_catalog where tipo = 'luminosidad';
  raise notice 'DLI: se eliminan % filas de crop_thresholds y % de crop_type_catalog (tipo luminosidad)', n_umbrales, n_catalogo;
end $$;

delete from public.crop_thresholds where tipo = 'luminosidad';
delete from public.crop_type_catalog where tipo = 'luminosidad';

-- ============================================================================
-- 4. El trigger deja de evaluar la luminosidad por lectura
-- ============================================================================
-- La luminosidad se evalúa a diario (DLI) en evaluar_alertas_dli_diario(); una
-- evaluación por lectura compararía lux instantáneos con una banda de DLI.

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
      -- La luminosidad NO se evalúa por lectura: su alerta es diaria (DLI),
      -- ver evaluar_alertas_dli_diario(). Aprobado el 27/10/2026.
      if ultima.tipo = 'luminosidad' then
        continue;
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
-- 5. Archivo de los umbrales retirados (NO se ejecuta)
-- ============================================================================
-- Valores de crop_type_catalog (seed 20261017000003):
-- insert into public.crop_type_catalog (crop_type, tipo, default_min, default_max) values
--   ('Tomate',   'luminosidad', 10000, 50000),
--   ('Lechuga',  'luminosidad',  8000, 40000),
--   ('Albahaca', 'luminosidad', 10000, 45000),
--   ('Pimiento', 'luminosidad', 12000, 50000)
-- on conflict (crop_type, tipo) do nothing;
--
-- Filas de crop_thresholds tipo='luminosidad' (9 filas; valores aún no archivados
-- aquí: copiarlas desde la BD antes de aplicar), con el formato:
-- insert into public.crop_thresholds (crop_id, tipo, min, max) values
--   ('<crop_id>', 'luminosidad', <min>, <max>);

-- Cierre de alertas lux ya sin efecto (2 activas en la base al 27/10/2026):
update public.alerts set estado = 'resuelta', resolved_at = now() where tipo = 'luminosidad' and estado = 'activa';
