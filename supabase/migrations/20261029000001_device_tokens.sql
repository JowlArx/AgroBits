-- H1 — device_tokens (hardware real: ingesta desde dispositivos)
-- Decisiones aprobadas:
--   * La ingesta llega por una Edge Function autenticada con token de dispositivo
--     (cabecera x-device-token), no con sesión de usuario.
--   * No se abre el rol anon: no hay ninguna policy para anon (denegación por defecto).
--   * service_role se usa solo en el servidor (Edge Function); nunca en el cliente.
-- Seguridad: el token en claro nunca se persiste; solo se guarda su SHA-256
-- en hexadecimal minúsculas (64 caracteres).
-- Todas las policies son `to authenticated` y comprueban la propiedad del sensor.

create table if not exists public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  sensor_id uuid not null references public.sensors (id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  nombre text not null default 'dispositivo' check (char_length(trim(nombre)) > 0),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  revoked_at timestamptz
);

create index if not exists device_tokens_sensor_idx on public.device_tokens (sensor_id);

comment on table public.device_tokens is
  'Tokens de dispositivo para la ingesta. Solo se guarda el SHA-256 del token; el token en claro nunca se persiste.';
comment on column public.device_tokens.token_hash is
  'SHA-256 en hexadecimal minúsculas del token de dispositivo. El token en claro nunca se almacena.';
comment on column public.device_tokens.revoked_at is
  'Momento de revocación. Un token con revoked_at no nulo no se acepta en la ingesta.';
comment on column public.device_tokens.last_seen_at is
  'Última vez que la ingesta aceptó una lectura con este token (mejor esfuerzo).';

alter table public.device_tokens enable row level security;

create policy "device_tokens_select_own" on public.device_tokens
  for select to authenticated
  using (exists (select 1 from public.sensors s where s.id = sensor_id and s.user_id = auth.uid()));

create policy "device_tokens_insert_own" on public.device_tokens
  for insert to authenticated
  with check (exists (select 1 from public.sensors s where s.id = sensor_id and s.user_id = auth.uid()));

create policy "device_tokens_update_own" on public.device_tokens
  for update to authenticated
  using (exists (select 1 from public.sensors s where s.id = sensor_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.sensors s where s.id = sensor_id and s.user_id = auth.uid()));

create policy "device_tokens_delete_own" on public.device_tokens
  for delete to authenticated
  using (exists (select 1 from public.sensors s where s.id = sensor_id and s.user_id = auth.uid()));
