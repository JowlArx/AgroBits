-- Idempotencia de lecturas: una fila por sensor, tipo e instante.
-- Verificado el 01/11/2026: no quedan duplicados (la purga de 30 días los eliminó).
create unique index if not exists measurements_unica_por_sensor_tipo_instante
  on public.measurements (sensor_id, tipo, measured_at);

comment on index public.measurements_unica_por_sensor_tipo_instante is
  'Evita duplicados cuando el dispositivo reenvia un lote ya insertado (respuesta HTTP perdida).';