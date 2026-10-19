-- T-27 — Registro enriquecido (D27, spec v3): catálogo de localidades y
-- perfiles de usuario. Aplicada el 19/10/2026 vía MCP de Supabase.
--
-- Objetivo (R-01 v3): el registro recoge teléfono y localidad obligatorios
-- para registrar el entorno de trabajo de los sensores como dimensión de la
-- futura capa analítica.
--
-- Diseño:
--  - `localidades`: catálogo provincia×ciudad de solo lectura (mismo patrón
--    que `crop_type_catalog`, D3). Se legible TAMBIÉN para `anon`: el
--    formulario de registro se carga sin sesión (única lectura pública del
--    esquema; es dato de referencia sin datos personales).
--  - `perfiles`: fila 1:1 por usuario con `telefono` y `localidad_id`.
--    RLS: el dueño solo LEE la suya; NO hay políticas de escritura para
--    clientes — la escritura es exclusiva del trigger de signup (un único
--    punto servidor, coherente con D19). Sin edición de perfil en el alcance
--    (D27): los usuarios previos a esta migración quedan sin fila.
--  - Trigger `AFTER INSERT ON auth.users` (SECURITY DEFINER, patrón oficial
--    de Supabase): copia `telefono` y `localidad_id` del metadata del signup
--    a `perfiles`. Backstop de servidor: si el metadata falta o es inválido
--    (localidad inexistente, teléfono con <6 dígitos), el INSERT falla y el
--    signup completo se revierte (R-01 AC5/AC6 garantizados también sin
--    cliente).
--  - Teléfono: mismos criterios que el cliente — hasta 20 dígitos
--    (mínimo 6), admite `+`, espacios, `(`, `)`, `.` y `-`. Es dato personal
--    (Ley 25.326): solo lo lee su dueño (RLS) y nunca se registra en logs.

create table if not exists public.localidades (
  id int generated always as identity primary key,
  provincia text not null check (char_length(trim(provincia)) > 0),
  localidad text not null check (char_length(trim(localidad)) > 0),
  constraint localidades_unica unique (provincia, localidad)
);

create table if not exists public.perfiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  localidad_id int not null references public.localidades (id),
  telefono text not null check (char_length(trim(telefono)) > 0),
  constraint perfiles_telefono_formato check (
    telefono ~ '^\+?[0-9 ().-]+$'
    and regexp_replace(telefono, '\D', '', 'g') ~ '^[0-9]{6,20}$'
  ),
  creado_en timestamptz not null default now()
);

-- ===== RLS =====

alter table public.localidades enable row level security;
alter table public.perfiles enable row level security;

-- Catálogo público de referencia (el registro es anónimo). Es el único
-- esquema legible sin sesión y no contiene datos personales.
create policy "localidades_read" on public.localidades
  for select to anon, authenticated using (true);

-- perfiles: lectura propia únicamente (R-02 por extensión; dato personal).
-- Sin políticas de insert/update/delete para clientes: la escritura vive en
-- el trigger de signup (postgres, SECURITY DEFINER, RLS no aplica al dueño).
create policy "perfiles_select_own" on public.perfiles
  for select to authenticated using (auth.uid() = user_id);

-- ===== Trigger de alta de perfil =====

create or replace function public.crear_perfil_de_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfiles (user_id, localidad_id, telefono)
  values (
    new.id,
    (new.raw_user_meta_data ->> 'localidad_id')::int,
    nullif(trim(new.raw_user_meta_data ->> 'telefono'), '')
  );
  return new;
end;
$$;

drop trigger if exists auth_users_crear_perfil on auth.users;
create trigger auth_users_crear_perfil
  after insert on auth.users
  for each row
  execute function public.crear_perfil_de_usuario();

-- ===== Semilla del catálogo (fuente: localidades de referencia de cada
-- provincia argentina — capital y principales ciudades; dato público,
-- ampliable por migraciones posteriores) =====

insert into public.localidades (provincia, localidad) values
  ('Buenos Aires', 'Bahía Blanca'),
  ('Buenos Aires', 'Junín'),
  ('Buenos Aires', 'La Plata'),
  ('Buenos Aires', 'Mar del Plata'),
  ('Buenos Aires', 'Morón'),
  ('Buenos Aires', 'Pergamino'),
  ('Buenos Aires', 'Quilmes'),
  ('Buenos Aires', 'San Isidro'),
  ('Buenos Aires', 'Tandil'),
  ('Ciudad Autónoma de Buenos Aires', 'Ciudad Autónoma de Buenos Aires'),
  ('Catamarca', 'Andalgalá'),
  ('Catamarca', 'Belén'),
  ('Catamarca', 'San Fernando del Valle de Catamarca'),
  ('Catamarca', 'Tinogasta'),
  ('Chaco', 'Barranqueras'),
  ('Chaco', 'Presidencia Roque Sáenz Peña'),
  ('Chaco', 'Resistencia'),
  ('Chaco', 'San Francisco de Laishí'),
  ('Chubut', 'Comodoro Rivadavia'),
  ('Chubut', 'Esquel'),
  ('Chubut', 'Puerto Madryn'),
  ('Chubut', 'Rawson'),
  ('Chubut', 'Trelew'),
  ('Córdoba', 'Córdoba'),
  ('Córdoba', 'Jesús María'),
  ('Córdoba', 'Río Tercero'),
  ('Córdoba', 'San Francisco'),
  ('Córdoba', 'Villa Dolores'),
  ('Córdoba', 'Villa María'),
  ('Corrientes', 'Corrientes'),
  ('Corrientes', 'Curuzú Cuatiá'),
  ('Corrientes', 'Goya'),
  ('Corrientes', 'Monte Caseros'),
  ('Corrientes', 'Paso de los Libres'),
  ('Entre Ríos', 'Concordia'),
  ('Entre Ríos', 'Concepción del Uruguay'),
  ('Entre Ríos', 'Gualeguaychú'),
  ('Entre Ríos', 'Paraná'),
  ('Entre Ríos', 'Villaguay'),
  ('Formosa', 'Clorinda'),
  ('Formosa', 'El Espinillo'),
  ('Formosa', 'Formosa'),
  ('Formosa', 'Pirané'),
  ('Jujuy', 'Libertador General San Martín'),
  ('Jujuy', 'Palpalá'),
  ('Jujuy', 'Perico'),
  ('Jujuy', 'San Salvador de Jujuy'),
  ('La Pampa', 'General Pico'),
  ('La Pampa', 'Realicó'),
  ('La Pampa', 'Santa Rosa'),
  ('La Pampa', 'Toay'),
  ('La Rioja', 'Chamical'),
  ('La Rioja', 'Chilecito'),
  ('La Rioja', 'La Rioja'),
  ('La Rioja', 'Ulapes'),
  ('Mendoza', 'Godoy Cruz'),
  ('Mendoza', 'Las Heras'),
  ('Mendoza', 'Maipú'),
  ('Mendoza', 'Mendoza'),
  ('Mendoza', 'San Martín'),
  ('Mendoza', 'San Rafael'),
  ('Misiones', 'Eldorado'),
  ('Misiones', 'Leandro N. Alem'),
  ('Misiones', 'Oberá'),
  ('Misiones', 'Posadas'),
  ('Misiones', 'Puerto Iguazú'),
  ('Neuquén', 'Centenario'),
  ('Neuquén', 'Neuquén'),
  ('Neuquén', 'San Martín de los Andes'),
  ('Neuquén', 'Zapala'),
  ('Río Negro', 'Bariloche'),
  ('Río Negro', 'Cipolletti'),
  ('Río Negro', 'General Roca'),
  ('Río Negro', 'Viedma'),
  ('Río Negro', 'Villa Regina'),
  ('Salta', 'Cachi'),
  ('Salta', 'Cafayate'),
  ('Salta', 'Orán'),
  ('Salta', 'Salta'),
  ('Salta', 'Tilcara'),
  ('San Juan', 'Caucete'),
  ('San Juan', 'Jáchal'),
  ('San Juan', 'Pocito'),
  ('San Juan', 'San Juan'),
  ('San Luis', 'La Punta'),
  ('San Luis', 'Merlo'),
  ('San Luis', 'San Luis'),
  ('San Luis', 'Villa Mercedes'),
  ('Santa Cruz', 'Caleta Olivia'),
  ('Santa Cruz', 'El Calafate'),
  ('Santa Cruz', 'Puerto Deseado'),
  ('Santa Cruz', 'Río Gallegos'),
  ('Santa Fe', 'Rafaela'),
  ('Santa Fe', 'Reconquista'),
  ('Santa Fe', 'Rosario'),
  ('Santa Fe', 'Santa Fe'),
  ('Santa Fe', 'Venado Tuerto'),
  ('Santa Fe', 'Villa Gobernador Gálvez'),
  ('Santiago del Estero', 'Añatuya'),
  ('Santiago del Estero', 'La Banda'),
  ('Santiago del Estero', 'Santiago del Estero'),
  ('Santiago del Estero', 'Termas de Río Hondo'),
  ('Tierra del Fuego', 'Río Grande'),
  ('Tierra del Fuego', 'Tolhuin'),
  ('Tierra del Fuego', 'Ushuaia'),
  ('Tucumán', 'Concepción'),
  ('Tucumán', 'Monteros'),
  ('Tucumán', 'San Miguel de Tucumán'),
  ('Tucumán', 'Tafí del Valle')
on conflict (provincia, localidad) do nothing;
