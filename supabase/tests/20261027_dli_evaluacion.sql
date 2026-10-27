-- Suite de evaluación diaria de luminosidad (DLI) — aprobada 27/10/2026.
--
-- Metodología idéntica a T-25: todo dentro de UNA transacción terminada en
-- ROLLBACK (residuo = 0). Se evalúa el día fijo 2026-10-20 pasando p_fecha, así
-- que la suite no depende de la fecha actual.
--
-- Cubre: (a) DLI bajo el mínimo → alerta activa; (b) DLI en banda → la alerta
-- previa se resuelve; (c) cultivo sin perfil → sin alerta; (d) no quedan
-- umbrales tipo 'luminosidad' en crop_thresholds ni en crop_type_catalog;
-- (e) el trigger no crea alertas de luminosidad por lectura; (f) la función no
-- es ejecutable por anon ni authenticated.
--
-- Banda de prueba 'Test DLI': 10..30 mol/m²/día.
-- Lecturas: 1 lectura de 1000 lux → DLI ≈ 0,0056 (bajo el mínimo).
-- Después 60 lecturas de 60000 lux más → DLI = (1000 + 3600000) × 300 / 54 / 1e6
-- ≈ 20,006 (en banda).

begin;

create table public.t_dli_resultados (test text, detalle text);
alter table public.t_dli_resultados disable row level security;
grant all on table public.t_dli_resultados to authenticated;

-- ===== SETUP (rol propietario) =====
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000000','aaaaaaaa-0000-0000-0000-000000000001','authenticated','authenticated','agrobits-dli-a@test.local','placeholder-no-hash',now(),now(),now(),'{"provider":"email","providers":["email"]}', jsonb_build_object('telefono','2600000012','localidad_id',(select id from public.localidades limit 1)))
on conflict (id) do nothing;

insert into public.crop_type_perfil (crop_type, dli_min, dli_max, fuente) values
  ('Test DLI', 10, 30, 'test 20261027');

insert into public.crops (id, user_id, name, crop_type, es_personalizado) values
  ('cccccccc-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','Huerto DLI','Test DLI',false),
  ('cccccccc-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000001','Huerto sin perfil','Test sin perfil',true);

insert into public.sensors (id, user_id, name) values
  ('dddddddd-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','Sensor DLI');

insert into public.sensor_crop (sensor_id, crop_id) values
  ('dddddddd-0000-0000-0000-000000000001','cccccccc-0000-0000-0000-000000000001'),
  ('dddddddd-0000-0000-0000-000000000001','cccccccc-0000-0000-0000-000000000002');

-- ===== (e) El trigger no crea alertas de luminosidad por lectura =====
-- 1 lectura muy baja: si el trigger la evaluara en lux, crearía una alerta.
insert into public.measurements (sensor_id, tipo, value, unit, measured_at)
values ('dddddddd-0000-0000-0000-000000000001','luminosidad',1000,'lux','2026-10-20T12:00:00Z');

insert into public.t_dli_resultados
select '(e) trigger: no crea alerta de luminosidad por lectura',
  case when (select count(*) from public.alerts
             where crop_id in ('cccccccc-0000-0000-0000-000000000001','cccccccc-0000-0000-0000-000000000002')
               and tipo = 'luminosidad') = 0
       then 'OK (0 alertas de luminosidad para el cultivo de prueba)'
       else 'FALLO' end;

-- ===== (a) DLI bajo el mínimo → alerta activa =====
select public.evaluar_alertas_dli_diario('2026-10-20');

insert into public.t_dli_resultados
select '(a) DLI bajo el minimo: alerta activa',
  case when (select count(*) from public.alerts
             where crop_id = 'cccccccc-0000-0000-0000-000000000001'
               and tipo = 'luminosidad' and estado = 'activa') = 1
       then 'OK (1 activa)'
       else 'FALLO (n=' || (select count(*) from public.alerts
             where crop_id = 'cccccccc-0000-0000-0000-000000000001'
               and tipo = 'luminosidad' and estado = 'activa') || ')' end;

-- Reevaluar sin cambios no duplica (índice único parcial + ON CONFLICT).
select public.evaluar_alertas_dli_diario('2026-10-20');

insert into public.t_dli_resultados
select '(a) reevaluacion: no duplica la alerta activa',
  case when (select count(*) from public.alerts
             where crop_id = 'cccccccc-0000-0000-0000-000000000001'
               and tipo = 'luminosidad' and estado = 'activa') = 1
       then 'OK (sigue 1 activa)'
       else 'FALLO' end;

-- ===== (b) DLI en banda → la alerta previa se resuelve =====
insert into public.measurements (sensor_id, tipo, value, unit, measured_at)
select 'dddddddd-0000-0000-0000-000000000001', 'luminosidad', 60000, 'lux',
       '2026-10-20T01:00:00Z'::timestamptz + (i * interval '5 minutes')
from generate_series(1, 60) as i;

select public.evaluar_alertas_dli_diario('2026-10-20');

insert into public.t_dli_resultados
select '(b) DLI en banda: la alerta previa se resuelve',
  case when (select count(*) from public.alerts
             where crop_id = 'cccccccc-0000-0000-0000-000000000001'
               and tipo = 'luminosidad' and estado = 'activa') = 0
        and (select count(*) from public.alerts
             where crop_id = 'cccccccc-0000-0000-0000-000000000001'
               and tipo = 'luminosidad' and estado = 'resuelta') = 1
       then 'OK (0 activas; 1 resuelta)'
       else 'FALLO' end;

-- ===== (c) Cultivo sin perfil → sin alerta =====
insert into public.t_dli_resultados
select '(c) cultivo sin perfil: no genera alerta',
  case when (select count(*) from public.alerts
             where crop_id = 'cccccccc-0000-0000-0000-000000000002') = 0
       then 'OK (0 alertas para el cultivo sin perfil)'
       else 'FALLO' end;

-- ===== (d) No quedan umbrales de luminosidad en lux =====
insert into public.t_dli_resultados
select '(d) no quedan umbrales tipo luminosidad en lux',
  case when (select count(*) from public.crop_thresholds where tipo = 'luminosidad') = 0
        and (select count(*) from public.crop_type_catalog where tipo = 'luminosidad') = 0
       then 'OK (0 filas en crop_thresholds y crop_type_catalog)'
       else 'FALLO' end;

-- ===== (f) Privilegios: la función no es ejecutable por anon ni authenticated =====
insert into public.t_dli_resultados
select '(f) evaluar_alertas_dli_diario no ejecutable por anon/authenticated',
  case when not has_function_privilege('anon', 'public.evaluar_alertas_dli_diario(date)', 'EXECUTE')
        and not has_function_privilege('authenticated', 'public.evaluar_alertas_dli_diario(date)', 'EXECUTE')
       then 'OK (sin EXECUTE para anon ni authenticated)'
       else 'FALLO' end;

-- ===== RESULTADOS =====
select test, detalle
from public.t_dli_resultados
order by test;

-- El endpoint de ejecución no respeta BEGIN/ROLLBACK (autocommit): la limpieza
-- es EXPLÍCITA para garantizar residuo 0. Mismo resultado que un ROLLBACK.
drop table public.t_dli_resultados;
delete from public.alerts
  where crop_id in ('cccccccc-0000-0000-0000-000000000001','cccccccc-0000-0000-0000-000000000002');
delete from public.measurements where sensor_id = 'dddddddd-0000-0000-0000-000000000001';
delete from public.sensor_crop
  where sensor_id = 'dddddddd-0000-0000-0000-000000000001'
     or crop_id in ('cccccccc-0000-0000-0000-000000000001','cccccccc-0000-0000-0000-000000000002');
delete from public.sensors where id = 'dddddddd-0000-0000-0000-000000000001';
delete from public.crops
  where id in ('cccccccc-0000-0000-0000-000000000001','cccccccc-0000-0000-0000-000000000002');
delete from public.crop_type_perfil where crop_type = 'Test DLI';
delete from auth.users where id = 'aaaaaaaa-0000-0000-0000-000000000001';
