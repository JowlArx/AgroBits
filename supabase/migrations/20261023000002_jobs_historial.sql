-- T-H2 — Jobs diarios de agregacion y purga para el historial.
-- Requiere pg_cron habilitado (ya lo esta, D46).

-- Agregacion: cada dia a las 03:15 UTC agrega las mediciones del dia anterior.
select cron.schedule(
  'agregar-mediciones-diarias',
  '15 3 * * *',
  $$
  insert into public.mediciones_diarias (sensor_id, tipo, dia, valor_medio, valor_min, valor_max, n)
  select sensor_id, tipo, (measured_at at time zone 'utc')::date,
         avg(value), min(value), max(value), count(*)::int
  from public.measurements
  where measured_at >= (now() at time zone 'utc')::date - interval '1 day'
    and measured_at <  (now() at time zone 'utc')::date
  group by sensor_id, tipo, (measured_at at time zone 'utc')::date
  on conflict (sensor_id, tipo, dia) do update
    set valor_medio = excluded.valor_medio,
        valor_min   = excluded.valor_min,
        valor_max   = excluded.valor_max,
        n           = excluded.n;
  $$
);

-- Purga: cada dia a las 03:30 UTC borra mediciones crudas de mas de 30 dias.
select cron.schedule(
  'purgar-mediciones-crudas',
  '30 3 * * *',
  $$ delete from public.measurements where measured_at < now() - interval '30 days'; $$
);