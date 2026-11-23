-- Alerta «sin_senal»: un cultivo recibe una alerta mientras alguno de sus sensores reales
-- no ha enviado lecturas en los últimos 15 minutos. Un sensor que nunca ha enviado cuenta desde su alta.
-- La alerta se resuelve cuando todos sus sensores reales vuelven a enviar.

alter table public.alerts drop constraint if exists alerts_tipo_check;
alter table public.alerts add constraint alerts_tipo_check
  check (tipo in ('humedad_suelo', 'temperatura', 'humedad_ambiental', 'luminosidad', 'dli', 'sol_directo', 'sin_senal'));

create or replace function public.cultivos_sin_senal()
returns table (crop_id uuid, minutos double precision)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with lectura as (
    select s.id as sensor_id, sc.crop_id, s.created_at,
           max(dt.last_seen_at) as ultima
    from public.sensors s
    join public.sensor_crop sc on sc.sensor_id = s.id
    left join public.device_tokens dt
      on dt.sensor_id = s.id and dt.activo and dt.revoked_at is null
    where s.origen = 'real'
    group by s.id, sc.crop_id, s.created_at
  ),
  retraso as (
    select crop_id,
           (extract(epoch from (now() - coalesce(ultima, created_at))) / 60)::double precision as minutos
    from lectura
  )
  select crop_id, max(minutos) as minutos
  from retraso
  where minutos > 15
  group by crop_id;
$$;

create or replace function public.evaluar_alertas_sin_senal()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.alerts (crop_id, tipo, value, estado, created_at)
  select c.crop_id, 'sin_senal', c.minutos, 'activa', now()
  from public.cultivos_sin_senal() c
  on conflict do nothing;

  update public.alerts a
  set value = c.minutos
  from public.cultivos_sin_senal() c
  where a.crop_id = c.crop_id and a.tipo = 'sin_senal' and a.estado = 'activa';

  update public.alerts a
  set estado = 'resuelta', resolved_at = now()
  where a.tipo = 'sin_senal' and a.estado = 'activa'
    and not exists (select 1 from public.cultivos_sin_senal() c where c.crop_id = a.crop_id);
end;
$$;

revoke all on function public.cultivos_sin_senal() from public, anon, authenticated;
revoke all on function public.evaluar_alertas_sin_senal() from public, anon, authenticated;

select cron.schedule(
  'evaluar-sin-senal',
  '*/5 * * * *',
  'select public.evaluar_alertas_sin_senal()'
);
