-- Separación entre sensores reales y simulados.
-- Decisiones:
--   * `simulado` (por defecto): el simulador de la SPA genera lecturas para el sensor.
--   * `real`: el sensor recibe lecturas de hardware; el simulador NO debe generar nada para él.
--   * El default garantiza que los sensores existentes queden como `simulado`.
--   * No se modifican RLS ni datos existentes.

alter table public.sensors
  add column if not exists origen text not null default 'simulado'
  check (origen in ('simulado', 'real'));

comment on column public.sensors.origen is
  'Origen de las lecturas del sensor: simulado (genera el simulador de la SPA) o real (hardware). Un sensor real desactiva el simulador para ese sensor.';
