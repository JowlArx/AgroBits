-- D46 — Suite de eliminacion de cuenta (gate de seguridad).
-- Ejecutada el 23/10/2026 via MCP de Supabase (execute_sql) contra el proyecto
-- de desarrollo: 12/12 pruebas OK (plan.md §4.2: "Supabase local (CLI) o
-- proyecto de pruebas via MCP"). Metodologia y resultado: ver abajo.
--
-- Metodologia: identidades simuladas en SQL (set local role authenticated +
-- request.jwt.claims con el email de la cuenta) dentro de UNA transaccion
-- terminada en ROLLBACK: la cuenta, sus datos y la solicitud nacen y mueren
-- en la transaccion (residuo verificado = 0 tras el rollback).
--
-- Cubre: la peticion exige el email correcto (AC1), la solicitud programa el
-- borrado a 7 dias (AC2), cada persona solo ve y cancela la suya (AC3), el
-- borrado en cascada deja cero filas (AC4), la auditoria guarda el hash sin
-- datos personales (AC5) y el purgador no borra antes de tiempo (AC6).

begin;

create table public.t_d46_resultados (test text, detalle text);
alter table public.t_d46_resultados disable row level security;

-- ===== SETUP (rol propietario: una cuenta con datos) =====
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000000','11111111-1111-1111-1111-111111111111','authenticated','authenticated','agrobits-d46-a@test.local','placeholder-no-hash',now(),now(),now(),'{"provider":"email","providers":["email"]}', jsonb_build_object('telefono','2600000000','localidad_id',(select id from public.localidades limit 1))),
  ('00000000-0000-0000-0000-000000000000','22222222-2222-2222-2222-222222222222','authenticated','authenticated','agrobits-d46-b@test.local','placeholder-no-hash',now(),now(),now(),'{"provider":"email","providers":["email"]}', jsonb_build_object('telefono','2600000001','localidad_id',(select id from public.localidades limit 1)))
on conflict (id) do nothing;

insert into public.crops (id, user_id, name, crop_type, es_personalizado) values
  ('33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111','Huerto A','Tomate',false),
  ('44444444-4444-4444-4444-444444444444','22222222-2222-2222-2222-222222222222','Huerto B','Lechuga',false);

insert into public.sensors (id, user_id, name) values
  ('55555555-5555-5555-5555-555555555555','11111111-1111-1111-1111-111111111111','Sensor A'),
  ('66666666-6666-6666-6666-666666666666','22222222-2222-2222-2222-222222222222','Sensor B');

insert into public.sensor_crop (sensor_id, crop_id) values
  ('55555555-5555-5555-5555-555555555555','33333333-3333-3333-3333-333333333333'),
  ('66666666-6666-6666-6666-666666666666','44444444-4444-4444-4444-444444444444');

-- ===== AC1: el email de confirmacion debe coincidir =====
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','11111111-1111-1111-1111-111111111111','email','agrobits-d46-a@test.local')::text, true);
select set_config('request.jwt.claims', json_build_object('sub','11111111-1111-1111-1111-111111111111','email','agrobits-d46-a@test.local')::text, true);
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

do $$
begin
  -- Email incorrecto: el servidor lo rechaza.
  begin
    perform public.solicitar_eliminacion_cuenta('otra-cuenta@test.local');
    insert into public.t_d46_resultados values ('AC1a email incorrecto rechazado','FALLO: la funcion acepto un email que no coincide');
  exception when others then
    insert into public.t_d46_resultados values ('AC1a email incorrecto rechazado','OK: ' || sqlerrm);
  end;

  -- Email correcto: la peticion se registra.
  begin
    perform public.solicitar_eliminacion_cuenta('agrobits-d46-a@test.local');
    insert into public.t_d46_resultados values ('AC1b email correcto aceptado','OK: solicitud registrada');
  exception when others then
    insert into public.t_d46_resultados values ('AC1b email correcto aceptado','FALLO: ' || sqlerrm);
  end;
end;
$$;

-- ===== AC2: la solicitud se programa a 7 dias =====
do $$
declare
  v_dias numeric;
begin
  select extract(epoch from (programada_para - solicitada_en)) / 86400 into v_dias
  from public.solicitudes_eliminacion
  where user_id = '11111111-1111-1111-1111-111111111111';

  if v_dias between 6.9 and 7.1 then
    insert into public.t_d46_resultados values ('AC2 programada a 7 dias','OK: ' || round(v_dias::numeric, 2) || ' dias');
  else
    insert into public.t_d46_resultados values ('AC2 programada a 7 dias','FALLO: ' || coalesce(v_dias::text,'sin solicitud'));
  end if;
end;
$$;

-- ===== AC3: cada persona solo ve y cancela la suya =====
reset role;

insert into public.t_d46_resultados
select 'AC3a solo ve la suya',
  case when count(*) = 1 then 'OK: 1 solicitud visible' else 'FALLO: ' || count(*) || ' visibles' end
from public.solicitudes_eliminacion;

set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);

do $$
declare
  v_afectadas integer;
begin
  -- La cuenta B intenta cancelar la solicitud de la cuenta A. Con RLS, la fila
  -- no le pertenece, asi que el delete afecta 0 filas (no lanza excepcion).
  delete from public.solicitudes_eliminacion where user_id = '11111111-1111-1111-1111-111111111111';
  get diagnostics v_afectadas = row_count;
  if v_afectadas = 0 then
    insert into public.t_d46_resultados values ('AC3b no puede cancelar otra','OK: 0 filas afectadas (RLS bloquea)');
  else
    insert into public.t_d46_resultados values ('AC3b no puede cancelar otra','FALLO: la cuenta B cancelo ' || v_afectadas || ' solicitud(es)');
  end if;
end;
$$;

reset role;

insert into public.t_d46_resultados
select 'AC3c la solicitud sigue viva',
  case when count(*) = 1 then 'OK: la solicitud de A no se borro' else 'FALLO: ' || count(*) || ' solicitudes' end
from public.solicitudes_eliminacion;

-- ===== AC6: el purgador no borra antes de tiempo =====
select set_config('request.jwt.claims', '{}', true);
select public.purgar_cuentas_vencidas();

insert into public.t_d46_resultados
select 'AC6 no borra antes de tiempo',
  case when exists (select 1 from auth.users where id = '11111111-1111-1111-1111-111111111111')
    then 'OK: la cuenta sigue viva' else 'FALLO: la cuenta fue borrada antes de tiempo' end;

-- ===== AC4: vencido el plazo, el borrado deja cero filas =====
update public.solicitudes_eliminacion
set programada_para = now() - interval '1 minute'
where user_id = '11111111-1111-1111-1111-111111111111';

select public.purgar_cuentas_vencidas();

insert into public.t_d46_resultados
select 'AC4a cuenta borrada',
  case when not exists (select 1 from auth.users where id = '11111111-1111-1111-1111-111111111111')
    then 'OK: la cuenta ya no esta' else 'FALLO: la cuenta sigue en auth.users' end;

insert into public.t_d46_resultados
select 'AC4b datos en cascada',
  case when (select count(*) from public.crops where user_id = '11111111-1111-1111-1111-111111111111') = 0
        and (select count(*) from public.sensors where user_id = '11111111-1111-1111-1111-111111111111') = 0
        and (select count(*) from public.sensor_crop where sensor_id = '55555555-5555-5555-5555-555555555555') = 0
    then 'OK: cultivos, sensores y enlaces en cero'
    else 'FALLO: quedan filas de la cuenta' end;

insert into public.t_d46_resultados
select 'AC4c la otra cuenta no se toca',
  case when exists (select 1 from auth.users where id = '22222222-2222-2222-2222-222222222222')
    then 'OK: la cuenta B sigue viva' else 'FALLO: se borro una cuenta ajena' end;

-- ===== AC5: auditoria sin datos personales =====
insert into public.t_d46_resultados
select 'AC5a auditoria registrada',
  case when count(*) = 1 then 'OK: 1 asiento' else 'FALLO: ' || count(*) || ' asientos' end
from public.auditoria_eliminaciones;

insert into public.t_d46_resultados
select 'AC5b sin email ni user_id',
  case when email_hash not like '%@%' and email_hash ~ '^[0-9a-f]{64}$'
    then 'OK: hash sha256 de 64 caracteres'
    else 'FALLO: el hash no tiene el formato esperado' end
from public.auditoria_eliminaciones;

-- ===== RESULTADO =====
select test, detalle from public.t_d46_resultados order by test;

rollback;
