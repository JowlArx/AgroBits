-- T-20 — create_agrobits_tables (aplicada el 17/10/2026 vía MCP de Supabase)
-- Esquema de AgroBits Fase 2 (plan.md §3, aprobado en M1).
-- Todas las tablas de datos se autorizan por user_id directo (crops, sensors)
-- o por herencia via crop_id/sensor_id (ver enable_rls_and_policies).

create table if not exists public.crops (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  crop_type text not null check (char_length(trim(crop_type)) > 0),
  es_personalizado boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crop_thresholds (
  crop_id uuid not null references public.crops (id) on delete cascade,
  tipo text not null check (tipo in ('humedad_suelo', 'temperatura', 'humedad_ambiental', 'luminosidad')),
  min double precision not null,
  max double precision not null,
  constraint crop_thresholds_rango check (min < max),
  primary key (crop_id, tipo)
);

create table if not exists public.sensors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.sensor_crop (
  sensor_id uuid not null references public.sensors (id) on delete cascade,
  crop_id uuid not null references public.crops (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (sensor_id, crop_id)
);

create table if not exists public.measurements (
  id uuid primary key default gen_random_uuid(),
  sensor_id uuid not null references public.sensors (id) on delete cascade,
  tipo text not null check (tipo in ('humedad_suelo', 'temperatura', 'humedad_ambiental', 'luminosidad')),
  value double precision not null,
  unit text not null,
  measured_at timestamptz not null
);

create index if not exists measurements_medida_en_idx on public.measurements (measured_at);
create index if not exists measurements_sensor_medida_idx on public.measurements (sensor_id, measured_at desc);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  crop_id uuid not null references public.crops (id) on delete cascade,
  tipo text not null check (tipo in ('humedad_suelo', 'temperatura', 'humedad_ambiental', 'luminosidad')),
  value double precision not null,
  estado text not null default 'activa' check (estado in ('activa', 'resuelta')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- Decision D14: una unica alerta ACTIVA por (cultivo, tipo).
create unique index if not exists alerts_unica_activa_por_cultivo_tipo
  on public.alerts (crop_id, tipo)
  where estado = 'activa';

create table if not exists public.crop_type_catalog (
  crop_type text not null,
  tipo text not null check (tipo in ('humedad_suelo', 'temperatura', 'humedad_ambiental', 'luminosidad')),
  default_min double precision not null,
  default_max double precision not null,
  constraint crop_type_catalog_rango check (default_min < default_max),
  primary key (crop_type, tipo)
);
