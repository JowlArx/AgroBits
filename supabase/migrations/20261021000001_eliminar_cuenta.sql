-- D46 — Eliminar mi cuenta con periodo de gracia de 7 dias (aplicada el 23/10/2026 via MCP de Supabase).
-- Decisiones aprobadas: borrado por funcion SECURITY DEFINER, registro de
-- auditoria sin datos personales (hash del email) y 7 dias para cancelar.

create table public.solicitudes_eliminacion (
  user_id uuid primary key references auth.users (id) on delete cascade,
  solicitada_en timestamptz not null default now(),
  programada_para timestamptz not null default now() + interval '7 days'
);

alter table public.solicitudes_eliminacion enable row level security;

-- La persona solo ve y puede cancelar su propia solicitud. No hay politica de
-- insercion: las solicitudes se crean solo con la funcion de abajo.
create policy solicitud_propia_lectura on public.solicitudes_eliminacion
  for select to authenticated using (user_id = (select auth.uid()));

create policy solicitud_propia_cancelacion on public.solicitudes_eliminacion
  for delete to authenticated using (user_id = (select auth.uid()));

-- Auditoria: sin user_id ni email; solo el hash del email para poder demostrar
-- que una solicitud se atendio. Sin politicas: solo lo lee el propietario.
create table public.auditoria_eliminaciones (
  id bigint generated always as identity primary key,
  email_hash text not null,
  solicitada_en timestamptz not null,
  ejecutada_en timestamptz not null default now()
);

alter table public.auditoria_eliminaciones enable row level security;

-- Registra la solicitud. Exige que el email escrito coincida con el de la
-- sesion; no recibe ningun id, asi que nadie puede pedir borrar otra cuenta.
create or replace function public.solicitar_eliminacion_cuenta(confirmacion_email text)
returns timestamptz
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_programada timestamptz;
begin
  if v_uid is null then
    raise exception 'sesion_requerida' using errcode = '28000';
  end if;
  if v_email = '' or lower(trim(coalesce(confirmacion_email, ''))) <> v_email then
    raise exception 'confirmacion_incorrecta' using errcode = '22023';
  end if;

  insert into public.solicitudes_eliminacion (user_id)
  values (v_uid)
  on conflict (user_id) do nothing;

  select programada_para into v_programada
  from public.solicitudes_eliminacion
  where user_id = v_uid;

  return v_programada;
end;
$$;

-- Ejecutado por pg_cron. Borra las cuentas cuyo plazo vencio; el borrado de
-- auth.users arrastra todos los datos por on delete cascade.
create or replace function public.purgar_cuentas_vencidas()
returns integer
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  r record;
  total integer := 0;
begin
  for r in
    select s.user_id, u.email, s.solicitada_en
    from public.solicitudes_eliminacion s
    join auth.users u on u.id = s.user_id
    where s.programada_para <= now()
  loop
    insert into public.auditoria_eliminaciones (email_hash, solicitada_en)
    values (encode(extensions.digest(lower(r.email), 'sha256'), 'hex'), r.solicitada_en);

    delete from auth.users where id = r.user_id;
    total := total + 1;
  end loop;
  return total;
end;
$$;

-- Solo la funcion de solicitud es invocable por la persona usuaria.
revoke all on function public.solicitar_eliminacion_cuenta(text) from public, anon;
grant execute on function public.solicitar_eliminacion_cuenta(text) to authenticated;

revoke all on function public.purgar_cuentas_vencidas() from public, anon, authenticated;

-- Programacion diaria (requiere la extension pg_cron habilitada en el proyecto).
-- select cron.schedule('purgar-cuentas-vencidas', '0 3 * * *', 'select public.purgar_cuentas_vencidas()');
