-- Perfil editable con zona horaria (usada por la ventana diurna de luminosidad).
-- Se elimina la version de 2 argumentos para no dejar una sobrecarga ambigua en PostgREST.
drop function if exists public.actualizar_perfil(text, integer);

create or replace function public.actualizar_perfil(
  p_telefono text,
  p_localidad_id integer,
  p_zona_horaria text default null
)
returns public.perfiles
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_perfil public.perfiles;
  v_zona text;
begin
  if auth.uid() is null then
    raise exception 'sin_sesion';
  end if;

  if p_telefono is null
     or p_telefono !~ '^\+?[0-9 ().-]+$'
     or regexp_replace(p_telefono, '\D', '', 'g') !~ '^[0-9]{6,20}$' then
    raise exception 'telefono_invalido';
  end if;

  if not exists (select 1 from public.localidades l where l.id = p_localidad_id) then
    raise exception 'localidad_inexistente';
  end if;

  if p_zona_horaria is not null then
    if not exists (select 1 from pg_timezone_names tz where tz.name = p_zona_horaria) then
      raise exception 'zona_horaria_invalida';
    end if;
    v_zona := p_zona_horaria;
  end if;

  insert into public.perfiles (user_id, localidad_id, telefono, zona_horaria)
  values (auth.uid(), p_localidad_id, trim(p_telefono), coalesce(v_zona, 'America/Argentina/Buenos_Aires'))
  on conflict (user_id) do update
    set localidad_id = excluded.localidad_id,
        telefono = excluded.telefono,
        zona_horaria = coalesce(v_zona, public.perfiles.zona_horaria)
  returning * into v_perfil;

  return v_perfil;
end;
$function$;

revoke all on function public.actualizar_perfil(text, integer, text) from public, anon;
grant execute on function public.actualizar_perfil(text, integer, text) to authenticated;