-- T-28 — Suite del alta con proveedor externo (Google, OAuth) y del backstop
-- de D27. Metodología T-21/T-27: identidades simuladas en SQL dentro de UNA
-- transacción terminada en ROLLBACK (residuo verificado = 0).
--
-- Cubre:
--  - Alta con Google (app_metadata provider = 'google', sin telefono ni
--    localidad): la cuenta SE CREA (no se revierte el alta) y nace SIN fila
--    de perfil.
--  - Regresión del alta por formulario (provider = 'email' con metadata
--    válida): el trigger sigue creando el perfil con el teléfono y la
--    localidad (R-01 AC6 de D27 intacto).
--  - Backstop de D27 INTACTO en el alta por email: metadata ausente,
--    localidad inexistente o teléfono corto → el alta se rechaza.
--  - La cuenta de Google completa su perfil después por el RPC
--    `actualizar_perfil` (el camino de «Mi cuenta», D30) y ve SOLO el suyo
--    (RLS).

begin;

create table public.t_t28_resultados (test text, detalle text);
alter table public.t_t28_resultados disable row level security;

-- ===== SETUP (rol propietario) =====

-- G: cuenta de Google (metadata del proveedor: nombre, correo, foto; sin
-- telefono ni localidad). El alta NO debe fallar.
do $$
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
  values ('00000000-0000-0000-0000-000000000000','b1000000-0000-4000-8000-000000000001','authenticated','authenticated','agrobits-t28-google@test.local','placeholder-no-hash',now(),now(),now(),
    '{"provider":"google","providers":["google"]}',
    jsonb_build_object('name','Persona de Google','email','agrobits-t28-google@test.local','email_verified',true,'picture','https://example.local/avatar.png','iss','accounts.google.com'));
  insert into public.t_t28_resultados values ('Google: el alta NO se revierte', 'OK (cuenta creada)');
exception when others then
  insert into public.t_t28_resultados values ('Google: el alta NO se revierte', 'FALLO (alta rechazada: ' || sqlerrm || ')');
end $$;

-- E: alta por formulario con metadata válida (regresión de D27).
do $$
declare lid int;
begin
  select id into lid from public.localidades where provincia = 'Santa Fe' and localidad = 'Rosario';
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
  values ('00000000-0000-0000-0000-000000000000','b1000000-0000-4000-8000-000000000002','authenticated','authenticated','agrobits-t28-email@test.local','placeholder-no-hash',now(),now(),now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('telefono','+54 9 261 555-2002','localidad_id',lid));
end $$;

-- Backstops de D27 (solo para el alta por email).
do $$
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
  values ('00000000-0000-0000-0000-000000000000','b1000000-0000-4000-8000-000000000003','authenticated','authenticated','agrobits-t28-sin-meta@test.local','placeholder-no-hash',now(),now(),now(),
    '{"provider":"email","providers":["email"]}','{}');
  insert into public.t_t28_resultados values ('Backstop email: alta sin perfil', 'FALLO (el alta no fue rechazada)');
exception when others then
  insert into public.t_t28_resultados values ('Backstop email: alta sin perfil', 'OK (alta rechazada: ' || sqlerrm || ')');
end $$;

do $$
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
  values ('00000000-0000-0000-0000-000000000000','b1000000-0000-4000-8000-000000000004','authenticated','authenticated','agrobits-t28-tel-corto@test.local','placeholder-no-hash',now(),now(),now(),
    '{"provider":"email","providers":["email"]}','{"telefono":"12345","localidad_id":1}');
  insert into public.t_t28_resultados values ('Backstop email: teléfono corto', 'FALLO (el alta no fue rechazada)');
exception when others then
  insert into public.t_t28_resultados values ('Backstop email: teléfono corto', 'OK (alta rechazada: ' || sqlerrm || ')');
end $$;

do $$
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
  values ('00000000-0000-0000-0000-000000000000','b1000000-0000-4000-8000-000000000005','authenticated','authenticated','agrobits-t28-loc-inexistente@test.local','placeholder-no-hash',now(),now(),now(),
    '{"provider":"email","providers":["email"]}','{"telefono":"2615550005","localidad_id":999999}');
  insert into public.t_t28_resultados values ('Backstop email: localidad inexistente', 'FALLO (el alta no fue rechazada)');
exception when others then
  insert into public.t_t28_resultados values ('Backstop email: localidad inexistente', 'OK (alta rechazada: ' || sqlerrm || ')');
end $$;

grant all on table public.t_t28_resultados to authenticated;
grant all on table public.t_t28_resultados to anon;

-- ===== La cuenta de Google nace sin perfil =====
insert into public.t_t28_resultados
select 'Google: la cuenta nace SIN perfil',
  case when count(*) = 0 then 'OK (0 filas: lo completa en Mi cuenta)'
       else 'FALLO (n=' || count(*) || ')' end
from public.perfiles where user_id = 'b1000000-0000-4000-8000-000000000001';

-- ===== Regresión: el alta por email sigue creando el perfil =====
insert into public.t_t28_resultados
select 'Regresión email: el perfil se crea con el metadata',
  case when count(*) = 1
          and min(telefono) = '+54 9 261 555-2002'
          and min(l.localidad) = 'Rosario'
       then 'OK (perfil con teléfono y localidad)'
       else 'FALLO (n=' || count(*) || ')' end
from public.perfiles p join public.localidades l on l.id = p.localidad_id
where p.user_id = 'b1000000-0000-4000-8000-000000000002';

-- ===== La cuenta de Google completa su perfil (RPC de «Mi cuenta») =====
set local role authenticated;
set local request.jwt.claim.sub = 'b1000000-0000-4000-8000-000000000001';
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claims = '{"sub":"b1000000-0000-4000-8000-000000000001","role":"authenticated"}';

do $$
declare
  lid int;
  fila public.perfiles;
begin
  select id into lid from public.localidades where provincia = 'Santa Fe' and localidad = 'Rosario';
  select * into fila from public.actualizar_perfil('2615550001', lid);
  if fila.user_id = 'b1000000-0000-4000-8000-000000000001' and fila.telefono = '2615550001' then
    insert into public.t_t28_resultados values ('Google: completa su perfil con el RPC', 'OK (perfil creado)');
  else
    insert into public.t_t28_resultados values ('Google: completa su perfil con el RPC', 'FALLO (perfil no creado)');
  end if;
exception when others then
  insert into public.t_t28_resultados values ('Google: completa su perfil con el RPC', 'FALLO (' || sqlerrm || ')');
end $$;

-- El RPC valida en servidor (mismo backstop que el cliente).
do $$
begin
  perform public.actualizar_perfil('123', (select id from public.localidades limit 1));
  insert into public.t_t28_resultados values ('Google: el RPC rechaza un teléfono inválido', 'FALLO (lo aceptó)');
exception when others then
  insert into public.t_t28_resultados values ('Google: el RPC rechaza un teléfono inválido', 'OK (rechazado: ' || sqlerrm || ')');
end $$;

-- ===== RLS: la cuenta de Google solo ve SU perfil =====
insert into public.t_t28_resultados
select 'Google: ve exactamente su perfil',
  case when count(*) = 1 and bool_and(user_id = 'b1000000-0000-4000-8000-000000000001')
       then 'OK (1 fila propia)' else 'FALLO (n=' || count(*) || ')' end
from public.perfiles;

insert into public.t_t28_resultados
select 'Google: no ve el perfil ajeno',
  case when count(*) = 0 then 'OK (0 filas ajenas)' else 'FALLO (n=' || count(*) || ')' end
from public.perfiles where user_id = 'b1000000-0000-4000-8000-000000000002';

-- ===== ANON: el registro es anónimo; el perfil sigue privado =====
set local role anon;
set local request.jwt.claim.role = 'anon';
set local request.jwt.claims = '{"role":"anon"}';

insert into public.t_t28_resultados
select 'ANON: no ve ningún perfil',
  case when count(*) = 0 then 'OK (0 filas)' else 'FALLO (n=' || count(*) || ')' end
from public.perfiles;

-- ===== VEREDICTO =====
reset role;

select test, detalle
from public.t_t28_resultados
order by test;

rollback;
