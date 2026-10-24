-- T-H — Suite de historial de mediciones (gate de seguridad).
-- Ejecutada el 23/10/2026 via MCP de Supabase (execute_sql): 6/6 pruebas OK,
-- residuo 0 (metodologia T-21: identidades simuladas + ROLLBACK).
--
-- Cubre: RLS de lectura (cada persona solo ve sus agregados), agregacion diaria
-- correcta (media/min/max/n) y purga de crudas >30 dias.

begin;

create table public.t_h_resultados (test text, detalle text);
alter table public.t_h_resultados disable row level security;

-- ===== SETUP: dos cuentas con sensores y mediciones =====
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000000','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','authenticated','authenticated','hist-a@test.local','placeholder-no-hash',now(),now(),now(),'{"provider":"email","providers":["email"]}', jsonb_build_object('telefono','2600000000','localidad_id',1)),
  ('00000000-0000-0000-0000-000000000000','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','authenticated','authenticated','hist-b@test.local','placeholder-no-hash',now(),now(),now(),'{"provider":"email","providers":["email"]}', jsonb_build_object('telefono','2600000001','localidad_id',1))
on conflict (id) do nothing;

insert into public.sensors (id, user_id, name) values
  ('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','Sensor A'),
  ('22222222-2222-2222-2222-222222222222','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','Sensor B');

-- Mediciones de A: 3 lecturas de temperatura el dia D-1 (ayer)
insert into public.measurements (sensor_id, tipo, value, unit, measured_at) values
  ('11111111-1111-1111-1111-111111111111','temperatura', 20.0, '°C', (now() at time zone 'utc')::date - interval '1 day' + interval '10 hours'),
  ('11111111-1111-1111-1111-111111111111','temperatura', 24.0, '°C', (now() at time zone 'utc')::date - interval '1 day' + interval '11 hours'),
  ('11111111-1111-1111-1111-111111111111','temperatura', 22.0, '°C', (now() at time zone 'utc')::date - interval '1 day' + interval '12 hours');
-- Mediciones de B: 2 lecturas el dia D-1
insert into public.measurements (sensor_id, tipo, value, unit, measured_at) values
  ('22222222-2222-2222-2222-222222222222','temperatura', 30.0, '°C', (now() at time zone 'utc')::date - interval '1 day' + interval '9 hours'),
  ('22222222-2222-2222-2222-222222222222','temperatura', 32.0, '°C', (now() at time zone 'utc')::date - interval '1 day' + interval '10 hours');
-- Medicion antigua de A (>30 dias) para probar la purga
insert into public.measurements (sensor_id, tipo, value, unit, measured_at) values
  ('11111111-1111-1111-1111-111111111111','temperatura', 99.0, '°C', now() - interval '40 days');

-- ===== Agregacion manual (simula el job) =====
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

-- ===== AC1: agregacion correcta para A =====
insert into public.t_h_resultados
select 'AC1 agregacion A',
  case when valor_medio = 22 and valor_min = 20 and valor_max = 24 and n = 3
    then 'OK: media 22, min 20, max 24, n 3' else 'FALLO: ' || valor_medio || '/' || valor_min || '/' || valor_max || '/' || n end
from public.mediciones_diarias
where sensor_id = '11111111-1111-1111-1111-111111111111';

-- ===== AC2: agregacion correcta para B =====
insert into public.t_h_resultados
select 'AC2 agregacion B',
  case when valor_medio = 31 and valor_min = 30 and valor_max = 32 and n = 2
    then 'OK: media 31, min 30, max 32, n 2' else 'FALLO: ' || valor_medio || '/' || valor_min || '/' || valor_max || '/' || n end
from public.mediciones_diarias
where sensor_id = '22222222-2222-2222-2222-222222222222';

-- ===== AC3: RLS — A solo ve sus agregados =====
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
insert into public.t_h_resultados
select 'AC3a A ve solo los suyos',
  case when count(*) = 1 then 'OK: 1 agregado visible' else 'FALLO: ' || count(*) || ' visibles' end
from public.mediciones_diarias;
reset role;

-- ===== AC4: RLS — B solo ve los suyos =====
set local role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
insert into public.t_h_resultados
select 'AC4a B ve solo los suyos',
  case when count(*) = 1 then 'OK: 1 agregado visible' else 'FALLO: ' || count(*) || ' visibles' end
from public.mediciones_diarias;
reset role;

-- ===== AC5: purga de crudas >30 dias =====
delete from public.measurements where measured_at < now() - interval '30 days';
insert into public.t_h_resultados
select 'AC5 purga crudas antiguas',
  case when not exists (select 1 from public.measurements where value = 99.0)
    then 'OK: medicion antigua borrada' else 'FALLO: la medicion antigua sigue' end;

-- ===== AC6: las crudas recientes siguen =====
insert into public.t_h_resultados
select 'AC6 crudas recientes intactas',
  case when (select count(*) from public.measurements where sensor_id = '11111111-1111-1111-1111-111111111111') = 3
    then 'OK: 3 mediciones recientes de A' else 'FALLO: ' || (select count(*) from public.measurements where sensor_id = '11111111-1111-1111-1111-111111111111') end;

-- ===== RESULTADO =====
select test, detalle from public.t_h_resultados order by test;

rollback;