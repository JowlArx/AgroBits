-- ============================================================================
-- BORRADOR — requiere aprobación humana; no aplicado.
-- Semilla del catálogo de cultivos (docs/catalogo-cultivos-fuentes.md, 27/10/2026).
--
-- Fuentes:
--   EcoCrop  = temperatura óptima TOPMN–TOPMX (FAO EcoCrop vía GAEZ v4).
--   FAO-56   = p y Zr (Tabla 22). Sin dato → NULL.
--   JowlArx  = rangos de grupo (D58): HR, humedad de suelo (% Capacidad de
--              Campo, %CC) y DLI. Partición de grupos 2 y 4 aprobada.
--   G1..G5   = grupo de la tabla de rangos de grupo.
--
-- Marca "-- NO VALIDADO" = valor derivado de [propuesto]; pendiente de INTA o
-- agrónomo. Ninguna fila de esta migración se aplica sin aprobación humana.
--
-- Alcance: 33 cultivos de la tabla de temperatura (sin Menta). 4 ya cargados
-- (Tomate, Lechuga, Albahaca, Pimiento) y 29 nuevos.
-- No se ejecuta contra la base. No se usa Supabase CLI en este borrador.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Extensión del esquema
-- ----------------------------------------------------------------------------
-- Decisión: nueva tabla public.crop_type_perfil (una fila por cultivo) en lugar
-- de ALTER TABLE sobre crop_type_catalog.
-- Motivo: crop_type_catalog es un modelo largo (crop_type, tipo) con CHECK
-- sobre tipo. p, Zr, banda %CC, DLI y fuente son atributos del cultivo, no de
-- un tipo de medición. Añadirlos a crop_type_catalog obligaría a repetirlos en
-- cada fila de tipo, o a ampliar el CHECK con 'dli', lo que cambia el
-- significado de la tabla existente.
-- Las columnas existentes de crop_type_catalog no cambian.

create table if not exists public.crop_type_perfil (
  crop_type text primary key check (char_length(trim(crop_type)) > 0),
  -- FAO-56: fracción de agua fácilmente disponible (p) y profundidad radicular Zr (m).
  p double precision check (p > 0 and p <= 1),
  zr_min_m double precision check (zr_min_m > 0),
  zr_max_m double precision check (zr_max_m > 0),
  -- Banda de respaldo de humedad de suelo en % de Capacidad de Campo.
  -- Se usa solo si el usuario no declara suelo. NO se guarda %vol.
  pcc_min double precision check (pcc_min >= 0 and pcc_min <= 100),
  pcc_max double precision check (pcc_max >= 0 and pcc_max <= 100),
  -- DLI (mol/m²/día) de referencia (D58/D59). Cuando las bases migren, la
  -- alerta usará el DLI calculado por la app (1 µmol/m²/s ≈ 54 lx), no
  -- estos valores. Se guardan como referencia.
  dli_min double precision,
  dli_max double precision,
  fuente text,
  constraint crop_type_perfil_zr check (zr_min_m is null or zr_max_m is null or zr_min_m <= zr_max_m),
  constraint crop_type_perfil_pcc check (pcc_min is null or pcc_max is null or pcc_min <= pcc_max),
  constraint crop_type_perfil_dli check (dli_min is null or dli_max is null or dli_min <= dli_max)
);

-- RLS: PENDIENTE DE CONFIRMAR ANTES DE APLICAR. El catálogo carga sin sesión
-- (lo verifica el e2e 06). Si crop_type_catalog habilita lectura a anon,
-- replicar esa política acá (to anon, authenticated); si no, mantener esta.
alter table public.crop_type_perfil enable row level security;

drop policy if exists crop_type_perfil_select_autenticados on public.crop_type_perfil;
create policy crop_type_perfil_select_autenticados
  on public.crop_type_perfil
  for select
  to authenticated
  using (true);


-- ----------------------------------------------------------------------------
-- 2. Filas de crop_type_catalog para cultivos nuevos (29 cultivos, 58 filas)
-- ----------------------------------------------------------------------------
-- temperatura = EcoCrop óptimo (TOPMN–TOPMX).
-- humedad_ambiental = rango de grupo (partición de grupos 2 y 4).
-- NO se inserta humedad_suelo: el catálogo guarda %vol y no se inventa; la
-- banda %CC va en crop_type_perfil.
-- NO se inserta luminosidad: solo existe para los 4 cultivos ya cargados. El
-- DLI se calcula en la app.
-- on conflict do nothing: no sobrescribe filas existentes.

insert into public.crop_type_catalog (crop_type, tipo, default_min, default_max) values
  -- Grupo 1 — Hoja
  ('Acelga', 'temperatura', 15, 25),
  ('Acelga', 'humedad_ambiental', 60, 70),
  ('Espinaca', 'temperatura', 13, 20),
  ('Espinaca', 'humedad_ambiental', 60, 70),
  ('Rúcula', 'temperatura', 15, 25),
  ('Rúcula', 'humedad_ambiental', 60, 70),
  ('Radicheta', 'temperatura', 10, 30),
  ('Radicheta', 'humedad_ambiental', 60, 70),
  ('Achicoria', 'temperatura', 15, 23),
  ('Achicoria', 'humedad_ambiental', 60, 70),
  ('Perejil', 'temperatura', 11, 20),
  ('Perejil', 'humedad_ambiental', 60, 70),
  ('Cebolla de verdeo', 'temperatura', 12, 25),
  ('Cebolla de verdeo', 'humedad_ambiental', 60, 70),
  ('Cilantro', 'temperatura', 15, 25),
  ('Cilantro', 'humedad_ambiental', 60, 70),
  -- Grupo 2 — Fruto (HR 50–65)
  ('Berenjena', 'temperatura', 20, 35),
  ('Berenjena', 'humedad_ambiental', 50, 65),
  ('Zapallito de tronco', 'temperatura', 17, 30),
  ('Zapallito de tronco', 'humedad_ambiental', 50, 65),
  ('Calabacín', 'temperatura', 17, 30),
  ('Calabacín', 'humedad_ambiental', 50, 65),
  ('Zapallo anco / Coquena', 'temperatura', 20, 30),
  ('Zapallo anco / Coquena', 'humedad_ambiental', 50, 65),
  ('Zapallo cabutiá', 'temperatura', 20, 30),
  ('Zapallo cabutiá', 'humedad_ambiental', 50, 65),
  ('Zapallo plomo', 'temperatura', 20, 30),
  ('Zapallo plomo', 'humedad_ambiental', 50, 65),
  -- Grupo 3 — Raíz, tallo y bulbo (HR 50–65)
  ('Zanahoria', 'temperatura', 15, 24),
  ('Zanahoria', 'humedad_ambiental', 50, 65),
  ('Remolacha', 'temperatura', 15, 25),
  ('Remolacha', 'humedad_ambiental', 50, 65),
  ('Cebolla', 'temperatura', 12, 25),
  ('Cebolla', 'humedad_ambiental', 50, 65),
  ('Ajo', 'temperatura', 18, 30),
  ('Ajo', 'humedad_ambiental', 50, 65),
  ('Rábano', 'temperatura', 12, 26),
  ('Rábano', 'humedad_ambiental', 50, 65),
  -- Grupo 4 — Frutilla y aromáticas (partición aprobada; Menta excluida)
  ('Frutilla', 'temperatura', 11, 24),
  ('Frutilla', 'humedad_ambiental', 60, 75), -- NO VALIDADO
  ('Orégano', 'temperatura', 17, 28),
  ('Orégano', 'humedad_ambiental', 40, 55), -- NO VALIDADO
  ('Romero', 'temperatura', 18, 30),
  ('Romero', 'humedad_ambiental', 40, 55), -- NO VALIDADO
  ('Tomillo', 'temperatura', 16, 25),
  ('Tomillo', 'humedad_ambiental', 40, 55), -- NO VALIDADO
  -- Grupo 5 — Frutales (HR 50–70). Cítricos no listados en la tabla de grupos:
  -- asignados a G5 por asimilación (sin fuente propia). Revisar con INTA.
  ('Ciruelo', 'temperatura', 18, 33),
  ('Ciruelo', 'humedad_ambiental', 50, 70),
  ('Duraznero', 'temperatura', 20, 33),
  ('Duraznero', 'humedad_ambiental', 50, 70),
  ('Higuera', 'temperatura', 16, 26),
  ('Higuera', 'humedad_ambiental', 50, 70),
  ('Manzano', 'temperatura', 14, 27),
  ('Manzano', 'humedad_ambiental', 50, 70),
  ('Naranjo (cítricos)', 'temperatura', 20, 30),
  ('Naranjo (cítricos)', 'humedad_ambiental', 50, 70),
  ('Limonero (cítricos)', 'temperatura', 15, 28),
  ('Limonero (cítricos)', 'humedad_ambiental', 50, 70)
on conflict (crop_type, tipo) do nothing;


-- ----------------------------------------------------------------------------
-- 3. Perfil agronómico por cultivo (33 cultivos)
-- ----------------------------------------------------------------------------
-- Incluye los 4 cultivos ya cargados (solo columnas nuevas; no toca sus filas
-- de crop_type_catalog). Sin dato FAO-56 → NULL.
-- Acelga y remolacha comparten registro EcoCrop 514; zapallito/calabacín 821;
-- zapallo anco/plomo 819. Se cargan como filas separadas con los mismos valores.
-- Abreviaturas de fuente: EcoCrop=código EcoPortCode; T22=FAO-56 Tabla 22; Gx=grupo JowlArx.

insert into public.crop_type_perfil
  (crop_type, p, zr_min_m, zr_max_m, pcc_min, pcc_max, dli_min, dli_max, fuente)
values
  -- Grupo 1 — Hoja (suelo %CC 70–80; DLI 14–20)
  ('Lechuga',            0.30, 0.3, 0.5, 70, 80, 14, 20, 'EcoCrop 1313; T22 «Lettuce»; G1 (existente)'),
  ('Acelga',             null, null, null, 70, 80, 14, 20, 'EcoCrop 514; sin dato T22; G1'),
  ('Espinaca',           0.20, 0.3, 0.5, 70, 80, 14, 20, 'EcoCrop 1997; T22 «Spinach»; G1'),
  ('Rúcula',             null, null, null, 70, 80, 14, 20, 'EcoCrop 5794; sin dato T22; G1'),
  ('Radicheta',          null, null, null, 70, 80, 14, 20, 'EcoCrop 694; sin dato T22; G1'),
  ('Achicoria',          null, null, null, 70, 80, 14, 20, 'EcoCrop 693; sin dato T22; G1'),
  ('Perejil',            null, null, null, 70, 80, 14, 20, 'EcoCrop 1661; sin dato T22; G1'),
  ('Cebolla de verdeo',  0.30, 0.3, 0.6, 70, 80, 14, 20, 'EcoCrop 365; T22 «Onions, green»; G1'),
  ('Cilantro',           null, null, null, 70, 80, 14, 20, 'EcoCrop 784; sin dato T22; G1'),
  -- Grupo 2 — Fruto (suelo %CC 60–75; DLI 22–30; 30 = «30+» abierto)
  ('Tomate',             0.40, 0.7, 1.5, 60, 75, 22, 30, 'EcoCrop 1379; T22 «Tomato»; G2 (existente)'),
  ('Pimiento',           0.30, 0.5, 1.0, 60, 75, 22, 30, 'EcoCrop 618; T22 «Sweet peppers»; G2 (existente)'),
  ('Berenjena',          0.45, 0.7, 1.2, 60, 75, 22, 30, 'EcoCrop 1965; T22 «Egg plant»; G2'),
  ('Zapallito de tronco', 0.50, 0.6, 1.0, 60, 75, 22, 30, 'EcoCrop 821; T22 «Squash, zucchini»; G2'),
  ('Calabacín',          0.50, 0.6, 1.0, 60, 75, 22, 30, 'EcoCrop 821; T22 «Squash, zucchini»; G2'),
  ('Zapallo anco / Coquena', 0.35, 1.0, 1.5, 60, 75, 22, 30, 'EcoCrop 819; T22 «Pumpkin, winter squash»; G2'),
  ('Zapallo cabutiá',    0.35, 1.0, 1.5, 60, 75, 22, 30, 'EcoCrop 820; T22 aproximado; G2'),
  ('Zapallo plomo',      0.35, 1.0, 1.5, 60, 75, 22, 30, 'EcoCrop 819; T22 «Pumpkin, winter squash»; G2'),
  -- Grupo 3 — Raíz, tallo y bulbo (suelo %CC 55–70; DLI 15–22)
  ('Zanahoria',          0.35, 0.5, 1.0, 55, 70, 15, 22, 'EcoCrop 871; T22 «Carrots»; G3'),
  ('Remolacha',          0.50, 0.6, 1.0, 55, 70, 15, 22, 'EcoCrop 514; T22 «Beets, table»; G3'),
  ('Cebolla',            0.30, 0.3, 0.6, 55, 70, 15, 22, 'EcoCrop 364; T22 «Onions, dry»; G3'),
  ('Ajo',                0.30, 0.3, 0.5, 55, 70, 15, 22, 'EcoCrop 367; T22 «Garlic»; G3'),
  ('Rábano',             0.30, 0.3, 0.5, 55, 70, 15, 22, 'EcoCrop 1839; T22 «Radishes»; G3'),
  -- Grupo 4 — Frutilla y aromáticas (partición; Menta excluida)
  ('Frutilla',           0.20, 0.2, 0.3, 70, 80, 18, 25, 'EcoCrop 1112; T22 «Strawberries»; %CC NO VALIDADO; DLI G4'), -- NO VALIDADO
  ('Albahaca',           null, null, null, 60, 70, 18, 25, 'EcoCrop 1547; sin dato T22; %CC NO VALIDADO; DLI G4 (existente)'), -- NO VALIDADO
  ('Orégano',            null, null, null, 50, 60, 20, 25, 'EcoCrop 2369; sin dato T22; %CC y DLI NO VALIDADO'), -- NO VALIDADO
  ('Romero',             null, null, null, 50, 60, 20, 25, 'EcoCrop 9326; sin dato T22; %CC y DLI NO VALIDADO (suelo bien drenado)'), -- NO VALIDADO
  ('Tomillo',            null, null, null, 50, 60, 20, 25, 'EcoCrop 2441; sin dato T22; %CC y DLI NO VALIDADO'), -- NO VALIDADO
  -- Grupo 5 — Frutales (suelo %CC 60–75; DLI 22–35 → dli_max 35)
  ('Ciruelo',            0.50, 1.0, 2.0, 60, 75, 22, 35, 'EcoCrop 16203; T22 «Apricots, peaches, stone fruit»; G5'),
  ('Duraznero',          0.50, 1.0, 2.0, 60, 75, 22, 35, 'EcoCrop 1796; T22 «Apricots, peaches, stone fruit»; G5'),
  ('Higuera',            null, null, null, 60, 75, 22, 35, 'EcoCrop 1071; sin dato T22; G5'),
  ('Manzano',            0.50, 1.0, 2.0, 60, 75, 22, 35, 'EcoCrop 1407; T22 «Apples, cherries, pears»; G5'),
  -- Cítricos: asimilados a G5 (no listados en la tabla de grupos). Revisar con INTA.
  ('Naranjo (cítricos)', 0.50, 0.8, 1.5, 60, 75, 22, 35, 'EcoCrop 720; T22 «Citrus»; G5 por asimilación'),
  ('Limonero (cítricos)', 0.50, 0.8, 1.5, 60, 75, 22, 35, 'EcoCrop 714; T22 «Citrus»; G5 por asimilación')
on conflict (crop_type) do update set
  p = excluded.p,
  zr_min_m = excluded.zr_min_m,
  zr_max_m = excluded.zr_max_m,
  pcc_min = excluded.pcc_min,
  pcc_max = excluded.pcc_max,
  dli_min = excluded.dli_min,
  dli_max = excluded.dli_max,
  fuente = excluded.fuente;

-- Menta: sin registro confiable en EcoCrop. No se inserta.
-- Frutilla, Albahaca, Orégano, Romero y Tomillo: valores de partición marcados
-- NO VALIDADO. Frutilla temperatura (EcoCrop) está validada.


-- ----------------------------------------------------------------------------
-- 4. Reemplazo de temperatura de los 4 cultivos existentes (BLOQUEADO)
-- ----------------------------------------------------------------------------
-- NO ACTIVAR sin aprobación explícita de JowlArx. Cambia valores ya en uso.
-- Valores EcoCrop propuestos (TOPMN–TOPMX):
--   Tomate 20–27 (actual 15–28); Lechuga 12–21 (actual 10–22);
--   Albahaca 18–27 (actual 18–30); Pimiento 17–30 (actual 16–30).
--
-- update public.crop_type_catalog set default_min = 20, default_max = 27
--   where crop_type = 'Tomate' and tipo = 'temperatura';
-- update public.crop_type_catalog set default_min = 12, default_max = 21
--   where crop_type = 'Lechuga' and tipo = 'temperatura';
-- update public.crop_type_catalog set default_min = 18, default_max = 27
--   where crop_type = 'Albahaca' and tipo = 'temperatura';
-- update public.crop_type_catalog set default_min = 17, default_max = 30
--   where crop_type = 'Pimiento' and tipo = 'temperatura';
