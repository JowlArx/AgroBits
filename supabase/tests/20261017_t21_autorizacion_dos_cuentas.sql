-- T-21 — Suite de autorizacion con dos cuentas (gate de seguridad).
-- Ejecutada el 17/10/2026 via MCP de Supabase (execute_sql) contra el proyecto
-- de desarrollo: 22/22 pruebas OK (plan.md §4.2: "Supabase local (CLI) o
-- proyecto de pruebas via MCP").
--
-- Metodologia: identidades simuladas en SQL (set local role authenticated +
-- request.jwt.claim.sub/claims con el user_id de la cuenta A o B) dentro de
-- UNA transaccion terminada en ROLLBACK: las "cuentas" y todos sus datos
-- nacen y mueren en la transaccion (residuo verificado = 0 tras el rollback).
-- Cubre: R-02 (AC1/AC2 lectura y escritura cruzadas), R-07 AC1 (asociacion
-- sensor-cultivo cruzada), R-08 (mediciones por herencia del sensor),
-- R-14 AC1 (alertas por herencia del cultivo) y el catalogo de solo lectura.
--
-- Nota: este proyecto Supabase auto-activa RLS en tablas nuevas; por eso la
-- tabla de resultados de la suite la deshabilitamos explicitamente (no
-- persiste: la transaccion se revierte).

begin;

create table public.t_t21_resultados (test text, detalle text);
alter table public.t_t21_resultados disable row level security;

-- ===== SETUP (rol propietario: usuarios A y B + sus datos) =====
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000000','11111111-1111-1111-1111-111111111111','authenticated','authenticated','agrobits-t21-a@test.local','placeholder-no-hash',now(),now(),now(),'{"provider":"email","providers":["email"]}', jsonb_build_object('telefono','2600000000','localidad_id',(select id from public.localidades limit 1))),
  ('00000000-0000-0000-0000-000000000000','22222222-2222-2222-2222-222222222222','authenticated','authenticated','agrobits-t21-b@test.local','placeholder-no-hash',now(),now(),now(),'{"provider":"email","providers":["email"]}', jsonb_build_object('telefono','2600000001','localidad_id',(select id from public.localidades limit 1)))
on conflict (id) do nothing;

insert into public.crops (id, user_id, name, crop_type, es_personalizado) values
  ('33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111','Huerto A','Tomate',false),
  ('44444444-4444-4444-4444-444444444444','22222222-2222-2222-2222-222222222222','Huerto B','Lechuga',false);

insert into public.crop_thresholds (crop_id, tipo, min, max) values
  ('33333333-3333-3333-3333-333333333333','temperatura',15,28),
  ('44444444-4444-4444-4444-444444444444','temperatura',10,22);

insert into public.sensors (id, user_id, name) values
  ('55555555-5555-5555-5555-555555555555','11111111-1111-1111-1111-111111111111','Sensor A'),
  ('66666666-6666-6666-6666-666666666666','22222222-2222-2222-2222-222222222222','Sensor B');

insert into public.sensor_crop (sensor_id, crop_id) values
  ('55555555-5555-5555-5555-555555555555','33333333-3333-3333-3333-333333333333'),
  ('66666666-6666-6666-6666-666666666666','44444444-4444-4444-4444-444444444444');

insert into public.measurements (sensor_id, tipo, value, unit, measured_at) values
  ('55555555-5555-5555-5555-555555555555','temperatura',20,'C',now()),
  ('66666666-6666-6666-6666-666666666666','temperatura',18,'C',now());

insert into public.alerts (crop_id, tipo, value, estado) values
  ('33333333-3333-3333-3333-333333333333','temperatura',5,'activa'),
  ('44444444-4444-4444-4444-444444444444','temperatura',4,'activa');

grant all on table public.t_t21_resultados to authenticated;

-- ===== IDENTIDAD SIMULADA: USUARIO A =====
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

-- ---- Lecturas cruzadas (deben ver 0 filas ajenas) ----
insert into public.t_t21_resultados
select 'R-02 lectura: cultivos',
  case when count(*) = 1 and min(name) = 'Huerto A'
       then 'OK (solo su cultivo)'
       else 'FALLO (n=' || count(*) || ')' end
from public.crops;

insert into public.t_t21_resultados
select 'R-02 lectura: umbrales ajenos',
  case when count(*) = 0 then 'OK (0 filas)' else 'FALLO (n=' || count(*) || ')' end
from public.crop_thresholds where crop_id = '44444444-4444-4444-4444-444444444444';

insert into public.t_t21_resultados
select 'R-02 lectura: mediciones ajenas',
  case when count(*) = 0 then 'OK (0 filas)' else 'FALLO (n=' || count(*) || ')' end
from public.measurements where sensor_id = '66666666-6666-6666-6666-666666666666';

insert into public.t_t21_resultados
select 'R-14 AC1 lectura: alertas ajenas',
  case when count(*) = 0 then 'OK (0 filas)' else 'FALLO (n=' || count(*) || ')' end
from public.alerts where crop_id = '44444444-4444-4444-4444-444444444444';

insert into public.t_t21_resultados
select 'R-07 lectura: asociaciones visibles',
  case when count(*) = 1 and bool_and(sensor_id = '55555555-5555-5555-5555-555555555555' and crop_id = '33333333-3333-3333-3333-333333333333')
       then 'OK (solo la suya)'
       else 'FALLO (n=' || count(*) || ')' end
from public.sensor_crop;

insert into public.t_t21_resultados
select 'Catalogo lectura (solo lectura)',
  case when count(*) = 16 then 'OK (16 filas sembradas)' else 'FALLO (n=' || count(*) || ')' end
from public.crop_type_catalog;

-- ---- Escrituras cruzadas (deben rechazarse / no afectar filas) ----
do $$
declare n int;
begin
  update public.crops set name = 'HACKEADO' where id = '44444444-4444-4444-4444-444444444444';
  get diagnostics n = row_count;
  insert into public.t_t21_resultados values
    ('R-02 escritura: update de cultivo ajeno',
     case when n = 0 then 'OK (0 filas afectadas)' else 'FALLO (n=' || n || ')' end);
exception when others then
  insert into public.t_t21_resultados values ('R-02 escritura: update de cultivo ajeno', 'OK (rechazado: ' || sqlerrm || ')');
end $$;

do $$
declare n int;
begin
  delete from public.crops where id = '44444444-4444-4444-4444-444444444444';
  get diagnostics n = row_count;
  insert into public.t_t21_resultados values
    ('R-02 escritura: delete de cultivo ajeno',
     case when n = 0 then 'OK (0 filas afectadas)' else 'FALLO (n=' || n || ')' end);
exception when others then
  insert into public.t_t21_resultados values ('R-02 escritura: delete de cultivo ajeno', 'OK (rechazado: ' || sqlerrm || ')');
end $$;

do $$
begin
  insert into public.crops (user_id, name, crop_type) values ('22222222-2222-2222-2222-222222222222','Robado','Tomate');
  insert into public.t_t21_resultados values ('R-02 escritura: insert de cultivo con user_id ajeno','FALLO (insert permitido)');
exception when insufficient_privilege then
  insert into public.t_t21_resultados values ('R-02 escritura: insert de cultivo con user_id ajeno','OK (rechazado por RLS)');
end $$;

do $$
begin
  insert into public.crop_thresholds (crop_id, tipo, min, max) values ('44444444-4444-4444-4444-444444444444','temperatura',0,1);
  insert into public.t_t21_resultados values ('R-02 escritura: umbral en cultivo ajeno','FALLO (insert permitido)');
exception when insufficient_privilege then
  insert into public.t_t21_resultados values ('R-02 escritura: umbral en cultivo ajeno','OK (rechazado por RLS)');
end $$;

do $$
begin
  insert into public.measurements (sensor_id, tipo, value, unit, measured_at) values ('66666666-6666-6666-6666-666666666666','temperatura',99,'C',now());
  insert into public.t_t21_resultados values ('R-08/R-02 escritura: medicion en sensor ajeno','FALLO (insert permitido)');
exception when insufficient_privilege then
  insert into public.t_t21_resultados values ('R-08/R-02 escritura: medicion en sensor ajeno','OK (rechazado por RLS)');
end $$;

do $$
begin
  insert into public.alerts (crop_id, tipo, value, estado) values ('44444444-4444-4444-4444-444444444444','temperatura',1,'activa');
  insert into public.t_t21_resultados values ('R-14 AC1 escritura: alerta en cultivo ajeno','FALLO (insert permitido)');
exception when insufficient_privilege then
  insert into public.t_t21_resultados values ('R-14 AC1 escritura: alerta en cultivo ajeno','OK (rechazado por RLS)');
end $$;

-- ---- R-07 AC1: sensor propio -> cultivo ajeno y viceversa ----
do $$
begin
  insert into public.sensor_crop (sensor_id, crop_id) values ('55555555-5555-5555-5555-555555555555','44444444-4444-4444-4444-444444444444');
  insert into public.t_t21_resultados values ('R-07 AC1: sensor propio a cultivo ajeno','FALLO (asociacion permitida)');
exception when insufficient_privilege then
  insert into public.t_t21_resultados values ('R-07 AC1: sensor propio a cultivo ajeno','OK (rechazado por RLS)');
end $$;

do $$
begin
  insert into public.sensor_crop (sensor_id, crop_id) values ('66666666-6666-6666-6666-666666666666','33333333-3333-3333-3333-333333333333');
  insert into public.t_t21_resultados values ('R-07 AC1: sensor ajeno a cultivo propio','FALLO (asociacion permitida)');
exception when insufficient_privilege then
  insert into public.t_t21_resultados values ('R-07 AC1: sensor ajeno a cultivo propio','OK (rechazado por RLS)');
end $$;

-- ---- Catalogo inmutable para clientes ----
do $$
begin
  insert into public.crop_type_catalog (crop_type, tipo, default_min, default_max) values ('Hack','temperatura',0,1);
  insert into public.t_t21_resultados values ('Catalogo escritura: insert','FALLO (insert permitido)');
exception when insufficient_privilege then
  insert into public.t_t21_resultados values ('Catalogo escritura: insert','OK (rechazado por RLS: sin politica)');
end $$;

-- ---- Controles positivos (deben PASAR: operaciones legitimas de A) ----
do $$
declare n int;
begin
  insert into public.crops (user_id, name, crop_type) values (auth.uid(), 'Huerto A2', 'Tomate');
  get diagnostics n = row_count;
  insert into public.t_t21_resultados values
    ('Positivo A: insert de su propio cultivo',
     case when n = 1 then 'OK (1 fila)' else 'FALLO (n=' || n || ')' end);
exception when others then
  insert into public.t_t21_resultados values ('Positivo A: insert de su propio cultivo', 'FALLO (error: ' || sqlerrm || ')');
end $$;

do $$
declare n int;
begin
  insert into public.crop_thresholds (crop_id, tipo, min, max)
  values ((select id from public.crops where name = 'Huerto A2'), 'temperatura', 15, 28);
  get diagnostics n = row_count;
  insert into public.t_t21_resultados values
    ('Positivo A: umbral en su cultivo nuevo',
     case when n = 1 then 'OK (1 fila)' else 'FALLO (n=' || n || ')' end);
exception when others then
  insert into public.t_t21_resultados values ('Positivo A: umbral en su cultivo nuevo', 'FALLO (error: ' || sqlerrm || ')');
end $$;

do $$
declare n int;
begin
  insert into public.sensor_crop (sensor_id, crop_id)
  values ('55555555-5555-5555-5555-555555555555', (select id from public.crops where name = 'Huerto A2'));
  get diagnostics n = row_count;
  insert into public.t_t21_resultados values
    ('Positivo A: N-N su sensor a su segundo cultivo',
     case when n = 1 then 'OK (1 fila)' else 'FALLO (n=' || n || ')' end);
exception when others then
  insert into public.t_t21_resultados values ('Positivo A: N-N su sensor a su segundo cultivo', 'FALLO (error: ' || sqlerrm || ')');
end $$;

do $$
declare n int;
begin
  insert into public.measurements (sensor_id, tipo, value, unit, measured_at)
  values ('55555555-5555-5555-5555-555555555555','temperatura',21,'C',now());
  get diagnostics n = row_count;
  insert into public.t_t21_resultados values
    ('Positivo A: medicion en su sensor',
     case when n = 1 then 'OK (1 fila)' else 'FALLO (n=' || n || ')' end);
exception when others then
  insert into public.t_t21_resultados values ('Positivo A: medicion en su sensor', 'FALLO (error: ' || sqlerrm || ')');
end $$;

do $$
declare n int;
begin
  insert into public.alerts (crop_id, tipo, value, estado)
  values ((select id from public.crops where name = 'Huerto A2'), 'humedad_suelo', 10, 'activa');
  get diagnostics n = row_count;
  insert into public.t_t21_resultados values
    ('Positivo A: alerta en su cultivo',
     case when n = 1 then 'OK (1 fila)' else 'FALLO (n=' || n || ')' end);
exception when others then
  insert into public.t_t21_resultados values ('Positivo A: alerta en su cultivo', 'FALLO (error: ' || sqlerrm || ')');
end $$;

-- ===== IDENTIDAD SIMULADA: USUARIO B (simetria) =====
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

insert into public.t_t21_resultados
select 'R-02 simetria B: cultivos',
  case when count(*) = 1 and min(name) = 'Huerto B'
       then 'OK (solo su cultivo; no ve los de A)'
       else 'FALLO (n=' || count(*) || ')' end
from public.crops;

insert into public.t_t21_resultados
select 'R-02 simetria B: alertas de A ocultas',
  case when count(*) = 0 then 'OK (0 filas)' else 'FALLO (n=' || count(*) || ')' end
from public.alerts where crop_id = '33333333-3333-3333-3333-333333333333';

-- ===== RESULTADOS =====
reset role;

select test, detalle
from public.t_t21_resultados
order by test;

rollback;
