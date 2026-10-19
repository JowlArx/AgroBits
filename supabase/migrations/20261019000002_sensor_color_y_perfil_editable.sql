-- D30 — Color de línea por sensor y perfil editable (19/10/2026).
--
-- Objetivo:
--  1. `sensors.color_linea`: color de la línea del gráfico asignado por el
--     usuario a CADA sensor (decisión D30). Paleta NOMBRADA de 6 colores
--     validada con CHECK (el cliente envía el id, nunca un hex arbitrario).
--     Sin ámbar/rojo en la paleta para no competir con la señal de alertas
--     (D20). El dueño ya puede escribir su sensor: RLS `sensors_update_own`
--     de T-20 no cambia.
--  2. RPC `actualizar_perfil`: única vía de escritura de `perfiles`
--     (coherente con D19/D27 — la escritura vive en el servidor y NO se
--     añade política de escritura para clientes). Valida teléfono y
--     localidad también en servidor (backstop) y hace UPSERT para dar de
--     alta el perfil de las cuentas previas a D27 que no tienen fila.

-- ===== 1. Color de línea por sensor =====

alter table public.sensors
  add column if not exists color_linea text not null default 'verde';

alter table public.sensors
  drop constraint if exists sensors_color_linea_paleta;
alter table public.sensors
  add constraint sensors_color_linea_paleta
  check (color_linea in ('verde', 'azul', 'violeta', 'cian', 'rosa', 'gris'));

-- ===== 2. Perfil editable vía RPC (SECURITY DEFINER, patrón D19/T-27) =====

create or replace function public.actualizar_perfil(
  p_telefono text,
  p_localidad_id int
)
returns public.perfiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_perfil public.perfiles;
begin
  if auth.uid() is null then
    raise exception 'sin_sesion';
  end if;

  -- Mismos criterios que el cliente (D27/AC5): 6–20 dígitos, admite
  -- `+ ( ) . -` y espacios. Es dato personal (Ley 25.326): nunca se loguea.
  if p_telefono is null
     or p_telefono !~ '^\+?[0-9 ().-]+$'
     or regexp_replace(p_telefono, '\D', '', 'g') !~ '^[0-9]{6,20}$' then
    raise exception 'telefono_invalido';
  end if;

  if not exists (select 1 from public.localidades l where l.id = p_localidad_id) then
    raise exception 'localidad_inexistente';
  end if;

  insert into public.perfiles (user_id, localidad_id, telefono)
  values (auth.uid(), p_localidad_id, trim(p_telefono))
  on conflict (user_id) do update
    set localidad_id = excluded.localidad_id,
        telefono = excluded.telefono
  returning * into v_perfil;

  return v_perfil;
end;
$$;

-- Mínimo privilegio: solo el rol autenticado puede ejecutarla; el rol anon
-- (registro anónimo de D27) queda sin execute.
revoke execute on function public.actualizar_perfil(text, int) from public, anon;
grant execute on function public.actualizar_perfil(text, int) to authenticated;
