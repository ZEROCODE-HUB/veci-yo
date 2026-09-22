-- ============================================================================
-- 0017 · Permisos de vivienda
-- ============================================================================
-- Que puede hacer una unidad: recibir correspondencia en la puerta, alojar
-- huespedes temporales, y con que reglas de estancia.
--
-- En el prototipo era UN objeto global en el store, pese a llamarse
-- "PermisoVivienda". Aqui se modela como corresponde:
--
--   unidad_id null  -> el valor por defecto del condominio, que es lo que edita
--                      hoy la pantalla de Administracion > Permisos.
--   unidad_id       -> una excepcion para esa unidad concreta.
--
-- Asi la pantalla actual sigue funcionando sin cambios de alcance, y el caso
-- que describe el documento de producto --el Administrador configura permisos
-- por vivienda-- queda soportado sin rehacer nada.
--
-- Los campos de estancia eran texto en el prototipo: `permiteVisitas: "Si"`,
-- con DOS grafias del mismo valor conviviendo ('Si' y 'Si' con tilde) y la UI
-- parchada para leer ambas. Aqui son boolean, y los dias son enteros en vez de
-- frases como "2 dias".
-- ============================================================================

create table public.permiso_vivienda (
  id                        uuid primary key default gen_random_uuid(),
  condominio_id             uuid not null references public.condominio(id) on delete cascade,
  unidad_id                 uuid references public.unidad(id) on delete cascade,

  entrega_directa           boolean not null default false,
  huespedes_temporales      boolean not null default false,
  /** Si la estancia corta y la larga tienen reglas distintas. */
  diferencia_estancia       boolean not null default false,

  -- Estancia corta
  corta_permite_visitas     boolean not null default false,
  corta_permite_ninos       boolean not null default true,
  corta_permite_mascotas    boolean not null default false,
  corta_permite_cocheras    boolean not null default false,
  corta_estancia_minima     integer not null default 1,
  corta_estancia_maxima     integer,
  corta_checkin_desde       time,
  corta_checkin_hasta       time,

  -- Estancia larga
  larga_permite_visitas     boolean not null default true,
  larga_permite_ninos       boolean not null default true,
  larga_permite_mascotas    boolean not null default false,
  larga_permite_cocheras    boolean not null default false,
  larga_estancia_minima     integer not null default 1,
  larga_estancia_maxima     integer,
  larga_checkin_desde       time,
  larga_checkin_hasta       time,

  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),

  constraint permiso_vivienda_corta_coherente
    check (corta_estancia_maxima is null or corta_estancia_maxima >= corta_estancia_minima),
  constraint permiso_vivienda_larga_coherente
    check (larga_estancia_maxima is null or larga_estancia_maxima >= larga_estancia_minima)
);

-- Un solo valor por defecto por condominio, y una sola excepcion por unidad.
create unique index permiso_vivienda_default_unico
  on public.permiso_vivienda (condominio_id) where unidad_id is null;
create unique index permiso_vivienda_unidad_unico
  on public.permiso_vivienda (unidad_id) where unidad_id is not null;

comment on table public.permiso_vivienda is
  'Fila con unidad_id null = valor por defecto del condominio. Con unidad_id = excepcion de esa vivienda.';


create trigger permiso_vivienda_tocar_updated_at
  before update on public.permiso_vivienda
  for each row execute function public.tocar_updated_at();

alter table public.permiso_vivienda enable row level security;

-- Los permisos los ve cualquier miembro --le afectan-- y los fija la
-- administracion del condominio.
create policy permiso_vivienda_lectura on public.permiso_vivienda
  for select to authenticated
  using (public.es_miembro_condominio(condominio_id));

create policy permiso_vivienda_escritura on public.permiso_vivienda
  for all to authenticated
  using (public.es_admin_condominio(condominio_id))
  with check (public.es_admin_condominio(condominio_id));


/**
 * Permisos efectivos de una unidad: su excepcion si la tiene, si no el valor
 * por defecto del condominio.
 */
create or replace function public.permisos_de_unidad(p_unidad_id uuid)
returns public.permiso_vivienda
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select pv.*
  from public.permiso_vivienda pv
  where pv.unidad_id = p_unidad_id
  union all
  select pv.*
  from public.permiso_vivienda pv
  join public.unidad u on u.condominio_id = pv.condominio_id
  where u.id = p_unidad_id
    and pv.unidad_id is null
    and not exists (
      select 1 from public.permiso_vivienda x where x.unidad_id = p_unidad_id
    )
  limit 1;
$$;
