-- T-28 — Acceso con Google (OAuth): alta de cuentas de proveedor externo.
--
-- Problema que resuelve:
--  El trigger `crear_perfil_de_usuario` (D27) crea la fila de `perfiles`
--  (teléfono + localidad) leyendo la metadata del signup por formulario. Las
--  cuentas que entran con Google NO pasan por el formulario: GoTrue las crea
--  con la metadata que devuelve el proveedor (nombre, correo, foto) y sin
--  `telefono` ni `localidad_id`. El INSERT del perfil fallaba entonces con
--  `null value in column "localidad_id"` y el ALTA COMPLETA se revertía
--  («Database error saving new user»): con Google no se podía crear una
--  cuenta nueva.
--
-- Solución (mínima y explícita):
--  - GoTrue marca el proveedor en `raw_app_meta_data` ANTES del INSERT
--    (`provider: 'email'` para el alta por formulario, `provider: 'google'`
--    para el alta por OAuth).
--  - El trigger crea el perfil SOLO en el alta por email. El backstop de D27
--    (rechazar el alta con metadata ausente o inválida) queda INTACTO para
--    el formulario: no seDebilita ninguna garantía de R-01 AC5/AC6.
--  - Una cuenta externa nace SIN fila de perfil y lo completa después en
--    «Mi cuenta» (vista D30), que escribe por el RPC `actualizar_perfil`
--    (SECURITY DEFINER, hace UPSERT). Es el mismo camino que las cuentas
--    anteriores a D27, que tampoco tienen fila.
--
-- Sin cambios de esquema: no se tocan tablas, políticas ni el RPC.

create or replace function public.crear_perfil_de_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_proveedor text;
begin
  -- `provider` lo fija GoTrue antes del INSERT (`email` / `google`).
  -- Si noviniera (alta manual), se asume `email`: comportamiento estricto.
  v_proveedor := coalesce(new.raw_app_meta_data ->> 'provider', 'email');

  -- Cuenta de proveedor externo (T-28): el alta no trae perfil (el
  -- proveedor no lo pide) y la cuenta lo completa en «Mi cuenta».
  if v_proveedor <> 'email' then
    return new;
  end if;

  insert into public.perfiles (user_id, localidad_id, telefono)
  values (
    new.id,
    (new.raw_user_meta_data ->> 'localidad_id')::int,
    nullif(trim(new.raw_user_meta_data ->> 'telefono'), '')
  );
  return new;
end;
$$;
