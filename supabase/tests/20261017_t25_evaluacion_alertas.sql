-- T-25 — Suite de evaluacion de alertas en la BD (trigger, modelo D14 / R-13).
-- Ejecutada el 17/10/2026 via MCP de Supabase (execute_sql) contra el proyecto
-- de desarrollo.
--
-- Metodologia identica a T-21: identidades simuladas en SQL (set local role
-- authenticated + request.jwt.claim.sub/claims con el user_id de la cuenta A o
-- B) dentro de UNA transaccion terminada en ROLLBACK: todo nace y muere en la
-- transaccion (residuo verificado = 0 tras el rollback).
--
-- Cubre: R-13 AC1 (crea alerta con tipo/valor/hora de la medicion), AC2
-- (lecturas sucesivas fuera de rango sin duplicar + rechazo directo del
-- duplicado por el indice unico parcial), AC3 (volver al rango resuelve con
-- hora), AC4 (en rango sin alerta previa no crea nada), evaluacion por cultivo
-- en el modelo N-N (D5), tipo sin umbral (omite sin romper), ultima lectura
-- por tipo entre TODOS los sensores del cultivo (R-09) y aislamiento
-- R-14 AC1 (B no ve las alertas de A).

begin;

create table public.t_t25_resultados (test text, detalle text);
alter table public.t_t25_resultados disable row level security;
grant all on table public.t_t25_resultados to authenticated;

-- ===== SETUP (rol propietario) =====
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000000','11111111-1111-1111-1111-111111111111','authenticated','authenticated','agrobits-t25-a@test.local','placeholder-no-hash',now(),now(),now(),'{"provider":"email","providers":["email"]}','{}'),
  ('00000000-0000-0000-0000-000000000000','22222222-2222-2222-2222-222222222222','authenticated','authenticated','agrobits-t25-b@test.local','placeholder-no-hash',now(),now(),now(),'{"provider":"email","providers":["email"]}','{}')
on conflict (id) do nothing;

insert into public.crops (id, user_id, name, crop_type, es_personalizado) values
  ('33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111','Huerto A1','Tomate',false);

insert into public.crop_thresholds (crop_id, tipo, min, max) values
  ('33333333-3333-3333-3333-333333333333','temperatura',15,28),
  ('33333333-3333-3333-3333-333333333333','humedad_suelo',20,60);

-- Dos sensores del MISMO cultivo: la ultima lectura por tipo de cualquiera
-- de ellos es la que se evalua (R-09).
insert into public.sensors (id, user_id, name) values
  ('55555555-5555-5555-5555-555555555555','11111111-1111-1111-1111-111111111111','Sensor A-1'),
  ('55555555-5555-5555-5555-555555555556','11111111-1111-1111-1111-111111111111','Sensor A-2');

insert into public.sensor_crop (sensor_id, crop_id) values
  ('55555555-5555-5555-5555-555555555555','33333333-3333-3333-3333-333333333333'),
  ('55555555-5555-5555-5555-555555555556','33333333-3333-3333-3333-333333333333');

-- Ninguna alerta sembrada: todas deben nacer del trigger.

grant all on table public.t_t25_resultados to authenticated;

-- ===== IDENTIDAD SIMULADA: USUARIO A =====
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

-- ---- AC1: medicion fuera de rango crea la alerta con tipo, valor y hora ----
insert into public.measurements (sensor_id, tipo, value, unit, measured_at)
values ('55555555-5555-5555-5555-555555555555','temperatura',35,'C','2026-10-17T12:00:00Z');

insert into public.t_t25_resultados
select 'R-13 AC1: crea alerta fuera de rango con tipo, valor y hora',
  case when count(*) = 1
         and min(valor) = 35
         and min(estado) = 'activa'
         and min(creada) = '2026-10-17T12:00:00Z'::timestamptz
       then 'OK (1 activa; valor 35; hora = hora de la medicion)'
       else 'FALLO (n=' || count(*) || ' detalle=' || coalesce(min(valor::text)||'/'||min(estado), 'sin filas') || ')' end
from (select value as valor, estado, created_at as creada
      from public.alerts
      where crop_id = '33333333-3333-3333-3333-333333333333' and tipo = 'temperatura' and estado = 'activa') x;

-- ---- AC2: segunda lectura fuera de rango NO duplica (se mantiene) ----
insert into public.measurements (sensor_id, tipo, value, unit, measured_at)
values ('55555555-5555-5555-5555-555555555555','temperatura',36,'C','2026-10-17T12:05:00Z');

insert into public.t_t25_resultados
select 'R-13 AC2: lecturas sucesivas fuera de rango sin duplicar',
  case when count(*) = 1 and min(value) = 36
       then 'OK (1 unica activa; valor actualizado a 36)'
       else 'FALLO (n=' || count(*) || ')' end
from public.alerts
where crop_id = '33333333-3333-3333-3333-333333333333' and tipo = 'temperatura' and estado = 'activa';

-- ---- D14: intento directo de duplicado activo → indice unico lo rechaza ----
do $$
begin
  insert into public.alerts (crop_id, tipo, value, estado)
  values ('33333333-3333-3333-3333-333333333333','temperatura',99,'activa');
  insert into public.t_t25_resultados values ('D14 indice unico: duplicado activo rechazado','FALLO (insert permitido)');
exception when unique_violation then
  insert into public.t_t25_resultados values ('D14 indice unico: duplicado activo rechazado','OK (23505 por el indice parcial)');
end $$;

-- ---- AC3: volver al rango resuelve con hora (via el OTRO sensor del cultivo) ----
insert into public.measurements (sensor_id, tipo, value, unit, measured_at)
values ('55555555-5555-5555-5555-555555555556','temperatura',20,'C','2026-10-17T12:10:00Z');

insert into public.t_t25_resultados
select 'R-13 AC3: la lectura en rango resuelve la alerta con su hora',
  case when (select count(*) from public.alerts
             where crop_id = '33333333-3333-3333-3333-333333333333' and tipo = 'temperatura' and estado = 'activa') = 0
         and (select count(*) from public.alerts
             where crop_id = '33333333-3333-3333-3333-333333333333' and tipo = 'temperatura'
               and estado = 'resuelta' and value = 20
               and resolved_at = '2026-10-17T12:10:00Z'::timestamptz) = 1
       then 'OK (0 activas; resuelta con hora de la medicion en rango)'
       else 'FALLO' end;

-- ---- AC4: lectura en rango sin alerta previa no crea nada ----
insert into public.measurements (sensor_id, tipo, value, unit, measured_at)
values ('55555555-5555-5555-5555-555555555555','humedad_suelo',40,'%','2026-10-17T12:15:00Z');

insert into public.t_t25_resultados
select 'R-13 AC4: lectura en rango sin alerta previa no crea nada',
  case when (select count(*) from public.alerts
             where crop_id = '33333333-3333-3333-3333-333333333333' and tipo = 'humedad_suelo') = 0
       then 'OK (0 alertas de humedad de suelo)'
       else 'FALLO' end;

-- ---- N-N (D5): el sensor pasa a un segundo cultivo con umbrales propios ----
insert into public.crops (user_id, name, crop_type, es_personalizado)
values (auth.uid(), 'Huerto A2', 'Lechuga', false);

insert into public.crop_thresholds (crop_id, tipo, min, max)
select id, 'temperatura', 5, 10 from public.crops where name = 'Huerto A2';

insert into public.sensor_crop (sensor_id, crop_id)
select '55555555-5555-5555-5555-555555555555', id from public.crops where name = 'Huerto A2';

insert into public.measurements (sensor_id, tipo, value, unit, measured_at)
values ('55555555-5555-5555-5555-555555555555','temperatura',35,'C','2026-10-17T12:20:00Z');

insert into public.t_t25_resultados
select 'D14 N-N: cada cultivo del sensor se evalua con sus umbrales',
  case when (select count(*) from public.alerts
             where tipo = 'temperatura' and estado = 'activa'
               and crop_id in ('33333333-3333-3333-3333-333333333333',
                               (select id from public.crops where name = 'Huerto A2'))) = 2
         and (select count(*) from public.alerts
             where crop_id = (select id from public.crops where name = 'Huerto A2')
               and tipo = 'temperatura' and estado = 'activa' and value = 35) = 1
       then 'OK (2 activas: una por cultivo, con sus umbrales)'
       else 'FALLO' end;

-- ---- Tipo sin umbral configurado: se omite sin romper la insercion ----
insert into public.crops (user_id, name, crop_type, es_personalizado)
values (auth.uid(), 'Huerto A3', 'Personalizado', true);

insert into public.sensor_crop (sensor_id, crop_id)
select '55555555-5555-5555-5555-555555555555', id from public.crops where name = 'Huerto A3';

insert into public.measurements (sensor_id, tipo, value, unit, measured_at)
values ('55555555-5555-5555-5555-555555555555','temperatura',99,'C','2026-10-17T12:25:00Z');

insert into public.t_t25_resultados
select 'Sin umbral: el tipo se omite y la medicion se inserta sin error',
  case when (select count(*) from public.alerts
             where crop_id = (select id from public.crops where name = 'Huerto A3')) = 0
       then 'OK (0 alertas para el cultivo sin umbrales)'
       else 'FALLO' end;

-- ===== IDENTIDAD SIMULADA: USUARIO B (aislamiento R-14 AC1) =====
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

insert into public.t_t25_resultados
select 'R-14 AC1: B no ve las alertas generadas para A',
  case when count(*) = 0 then 'OK (0 filas visibles)' else 'FALLO (n=' || count(*) || ')' end
from public.alerts
where crop_id in ('33333333-3333-3333-3333-333333333333',
                  (select id from public.crops where name = 'Huerto A2'));

-- ===== RESULTADOS =====
reset role;

select test, detalle
from public.t_t25_resultados
order by test;

rollback;
