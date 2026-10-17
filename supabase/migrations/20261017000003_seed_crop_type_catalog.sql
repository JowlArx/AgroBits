-- T-20 — seed_crop_type_catalog (aplicada el 17/10/2026 vía MCP de Supabase)
-- Semilla del catalogo de tipos de cultivo (D3, R-11). Valores identicos a
-- web/src/data/catalogo.ts: REFERENCIA ORIENTATIVA, no asesoramiento
-- agronomico. Editables por usuario via crop_thresholds.

insert into public.crop_type_catalog (crop_type, tipo, default_min, default_max) values
  ('Tomate',   'humedad_suelo',     40, 75),
  ('Tomate',   'temperatura',       15, 28),
  ('Tomate',   'humedad_ambiental', 50, 80),
  ('Tomate',   'luminosidad',    10000, 50000),
  ('Lechuga',  'humedad_suelo',     45, 75),
  ('Lechuga',  'temperatura',       10, 22),
  ('Lechuga',  'humedad_ambiental', 50, 80),
  ('Lechuga',  'luminosidad',     8000, 40000),
  ('Albahaca', 'humedad_suelo',     40, 70),
  ('Albahaca', 'temperatura',       18, 30),
  ('Albahaca', 'humedad_ambiental', 50, 80),
  ('Albahaca', 'luminosidad',    10000, 45000),
  ('Pimiento', 'humedad_suelo',     40, 70),
  ('Pimiento', 'temperatura',       16, 30),
  ('Pimiento', 'humedad_ambiental', 50, 80),
  ('Pimiento', 'luminosidad',    12000, 50000)
on conflict (crop_type, tipo) do nothing;
