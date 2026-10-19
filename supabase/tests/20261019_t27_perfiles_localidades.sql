-- T-27 — Suite del registro enriquecido (D27 / R-01 v3 AC5-AC6) y RLS de
-- perfiles/localidades. Metodología T-21: identidades simuladas en SQL dentro
-- de UNA transacción terminada en ROLLBACK (residuo verificado = 0).
--
-- Cubre:
--  - AC6: el signup (insert en auth.users con metadata) crea el perfil con
--    teléfono y localidad correctos (trigger `crear_perfil_de_usuario`).
--  - Backstop de servidor (AC5): signup sin metadata, con localidad
--    inexistente o con teléfono corto → el ALTA COMPLETA FALLA (nada queda).
--  - localidades: catálogo legible para ANON (el registro es anónimo) y con
--    la semilla mínima esperada (>=100 localidades, 24 provincias).
--  - perfiles: el dueño solo ve la SUYA; anon no ve NADA; ni anon ni otros
--    usuarios pueden insertar/actualizar/borrar perfiles (sin escritura
--    desde cliente: D27).
--
-- Nota: los usuarios de esta suite se insertan en auth.users con metadata
-- válida para el trigger; si el trigger los rechaza, el DO block lo captura
-- y lo registra como resultado del test.

begin;

create table public.t_t27_resultados (test text, detalle text);
alter table public.t_t27_resultados disable row level security;

-- ===== SETUP (rol propietario) =====
do $$
declare
  lid_rosario int;
  lid_mendoza int;
  lid_cualquiera int;
begin
  select id into lid_rosario from public.localidades where provincia = 'Santa Fe' and localidad = 'Rosario';
  select id into lid_mendoza from public.localidades where provincia = 'Mendoza' and localidad = 'Mendoza';
  select id into lid_cualquiera from public.localidades limit 1;

  -- A y B: registros válidos (metadata completa) → el trigger crea el perfil.
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
  values
    ('00000000-0000-0000-0000-000000000000','a1000000-0000-4000-8000-000000000001','authenticated','authenticated','agrobits-t27-a@test.local','placeholder-no-hash',now(),now(),now(),'{"provider":"email","providers":["email"]}', jsonb_build_object('telefono','+54 9 261 555-1001','localidad_id',lid_rosario)),
    ('00000000-0000-0000-0000-000000000000','a1000000-0000-4000-8000-000000000002','authenticated','authenticated','agrobits-t27-b@test.local','placeholder-no-hash',now(),now(),now(),'{"provider":"email","providers":["email"]}', jsonb_build_object('telefono','2614442002','localidad_id',lid_mendoza))
  on conflict (id) do nothing;
end $$;

-- C: registro SIN metadata (como si el cliente no la enviara) → debe fallar.
do $$
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
  values ('00000000-0000-0000-0000-000000000000','a1000000-0000-4000-8000-000000000003','authenticated','authenticated','agrobits-t27-c@test.local','placeholder-no-hash',now(),now(),now(),'{"provider":"email","providers":["email"]}','{}');
  insert into public.t_t27_resultados values ('Backstop: signup sin perfil', 'FALLO (el alta no fue rechazada)');
exception when others then
  insert into public.t_t27_resultados values ('Backstop: signup sin perfil', 'OK (alta rechazada: ' || sqlerrm || ')');
end $$;

-- D: localidad inexistente (FK) → debe fallar.
do $$
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
  values ('00000000-0000-0000-0000-000000000000','a1000000-0000-4000-8000-000000000004','authenticated','authenticated','agrobits-t27-d@test.local','placeholder-no-hash',now(),now(),now(),'{"provider":"email","providers":["email"]}','{"telefono":"2614442004","localidad_id":999999}');
  insert into public.t_t27_resultados values ('Backstop: localidad inexistente', 'FALLO (el alta no fue rechazada)');
exception when others then
  insert into public.t_t27_resultados values ('Backstop: localidad inexistente', 'OK (alta rechazada: ' || sqlerrm || ')');
end $$;

-- E: teléfono con menos de 6 dígitos → debe fallar (check de perfiles).
do $$
declare lid int;
begin
  select id into lid from public.localidades limit 1;
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
  values ('00000000-0000-0000-0000-000000000000','a1000000-0000-4000-8000-000000000005','authenticated','authenticated','agrobits-t27-e@test.local','placeholder-no-hash',now(),now(),now(),'{"provider":"email","providers":["email"]}', jsonb_build_object('telefono','12345','localidad_id',lid));
  insert into public.t_t27_resultados values ('Backstop: teléfono corto', 'FALLO (el alta no fue rechazada)');
exception when others then
  insert into public.t_t27_resultados values ('Backstop: teléfono corto', 'OK (alta rechazada: ' || sqlerrm || ')');
end $$;

grant all on table public.t_t27_resultados to authenticated;
grant all on table public.t_t27_resultados to anon;

-- ===== AC6: perfiles creados por el trigger con los datos correctos =====
insert into public.t_t27_resultados
select 'AC6: perfil de A (teléfono y localidad)',
  case when count(*) = 1
         and min(telefono) = '+54 9 261 555-1001'
         and min(l.localidad) = 'Rosario'
       then 'OK (perfil con metadata del signup)'
       else 'FALLO (n=' || count(*) || ')' end
from public.perfiles p join public.localidades l on l.id = p.localidad_id
where p.user_id = 'a1000000-0000-4000-8000-000000000001';

insert into public.t_t27_resultados
select 'AC6: perfil de B',
  case when count(*) = 1 and min(telefono) = '2614442002'
       then 'OK (1 fila)' else 'FALLO (n=' || count(*) || ')' end
from public.perfiles where user_id = 'a1000000-0000-4000-8000-000000000002';

-- ===== Catálogo localidades =====
insert into public.t_t27_resultados
select 'Catálogo: semilla mínima',
  case when count(*) >= 100 and count(distinct provincia) = 24
       then 'OK (' || count(*) || ' localidades, 24 provincias)'
       else 'FALLO (' || count(*) || ' localidades, ' || count(distinct provincia) || ' provincias)' end
from public.localidades;

do $$
begin
  insert into public.localidades (provincia, localidad) values ('Santa Fe', 'Rosario');
  insert into public.t_t27_resultados values ('Catálogo: duplicado rechazado', 'FALLO (se permitió duplicar)');
exception when others then
  insert into public.t_t27_resultados values ('Catálogo: duplicado rechazado', 'OK (rechazado: ' || sqlerrm || ')');
end $$;

-- ===== ANON: el registro es anónimo → puede leer el catálogo =====
set local role anon;
set local request.jwt.claim.role = 'anon';
set local request.jwt.claims = '{"role":"anon"}';

insert into public.t_t27_resultados
select 'ANON: lee localidades',
  case when count(*) >= 100 then 'OK (catálogo visible sin sesión)'
       else 'FALLO (n=' || count(*) || ')' end
from public.localidades;

insert into public.t_t27_resultados
select 'ANON: no ve perfiles',
  case when count(*) = 0 then 'OK (0 filas)' else 'FALLO (n=' || count(*) || ')' end
from public.perfiles;

-- ===== USUARIO A: solo su perfil =====
set local role authenticated;
set local request.jwt.claim.sub = 'a1000000-0000-4000-8000-000000000001';
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claims = '{"sub":"a1000000-0000-4000-8000-000000000001","role":"authenticated"}';

insert into public.t_t27_resultados
select 'A: ve exactamente su perfil',
  case when count(*) = 1 and bool_and(user_id = 'a1000000-0000-4000-8000-000000000001')
       then 'OK (1 fila propia)' else 'FALLO (n=' || count(*) || ')' end
from public.perfiles;

insert into public.t_t27_resultados
select 'A: no ve el perfil de B',
  case when count(*) = 0 then 'OK (0 filas ajenas)' else 'FALLO (n=' || count(*) || ')' end
from public.perfiles where user_id = 'a1000000-0000-4000-8000-000000000002';

do $$
declare n int;
begin
  update public.perfiles set telefono = '2619998888'
  where user_id = 'a1000000-0000-4000-8000-000000000001';
  get diagnostics n = row_count;
  if n = 0 then
    insert into public.t_t27_resultados values ('A: sin escritura (update propio)', 'OK (0 filas afectadas)');
  else
    insert into public.t_t27_resultados values ('A: sin escritura (update propio)', 'FALLO (' || n || ' filas)');
  end if;
end $$;

do $$
begin
  insert into public.perfiles (user_id, localidad_id, telefono)
  values ('a1000000-0000-4000-8000-000000000001', (select id from public.localidades limit 1), '2610000000');
  insert into public.t_t27_resultados values ('A: sin escritura (insert propio)', 'FALLO (el insert fue permitido)');
exception when others then
  insert into public.t_t27_resultados values ('A: sin escritura (insert propio)', 'OK (denegado: ' || sqlerrm || ')');
end $$;

do $$
declare
  n int;
  restantes int;
begin
  delete from public.perfiles where user_id = 'a1000000-0000-4000-8000-000000000001';
  get diagnostics n = row_count;
  select count(*) into restantes from public.perfiles where user_id = 'a1000000-0000-4000-8000-000000000001';
  -- Sin política de delete, RLS no lanza error: afecta a 0 filas (denegación
  -- por defecto). Se comprueba tanto el contador como la persistencia.
  if n = 0 and restantes = 1 then
    insert into public.t_t27_resultados values ('A: sin escritura (delete propio)', 'OK (0 filas afectadas; el perfil persiste)');
  else
    insert into public.t_t27_resultados values ('A: sin escritura (delete propio)', 'FALLO (borradas=' || n || ', restantes=' || restantes || ')');
  end if;
end $$;

-- ===== VEREDICTO =====
reset role;

select test, detalle
from public.t_t27_resultados
order by test;

rollback;
