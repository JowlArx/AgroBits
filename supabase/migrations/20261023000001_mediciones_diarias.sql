-- T-H1 — Tabla de agregados diarios de mediciones (historial).
-- Una fila por (sensor, tipo, dia): media, min, max y cantidad de lecturas.
-- RLS: solo el dueño del sensor lee sus agregados; la escritura la hacen los jobs (postgres).

create table if not exists public.mediciones_diarias (
  sensor_id uuid not null references public.sensors (id) on delete cascade,
  tipo text not null check (tipo in ('humedad_suelo', 'temperatura', 'humedad_ambiental', 'luminosidad')),
  dia date not null,
  valor_medio double precision not null,
  valor_min double precision not null,
  valor_max double precision not null,
  n integer not null check (n > 0),
  primary key (sensor_id, tipo, dia)
);

alter table public.mediciones_diarias enable row level security;

-- Lectura: solo el dueño del sensor.
create policy mediciones_diarias_lectura_propia on public.mediciones_diarias
  for select to authenticated
  using (exists (
    select 1 from public.sensors s
    where s.id = mediciones_diarias.sensor_id and s.user_id = (select auth.uid())
  ));

-- Indice auxiliar para rangos por sensor (el PK es sensor,tipo,dia).
create index if not exists mediciones_diarias_sensor_dia_idx
  on public.mediciones_diarias (sensor_id, dia);