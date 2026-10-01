-- ============================================================================
-- 0002 · Identidad, columna vertebral de tenancy y membresías
-- ============================================================================
-- Crea la raíz del árbol multi-tenant, que hoy no existe en el código: el
-- prototipo representaba el edificio como un string libre (`edificioActivo`) y
-- asumía implícitamente un único condominio.
--
-- La tabla `membresia_unidad` está deliberadamente modelada "delgada" para
-- absorber cualquier respuesta a las dudas de producto abiertas, sin cambiar el
-- schema (ver docs/RIESGOS-Y-DUDAS.md):
--   D-01 ¿el Residente inicia sesión?     -> columna `puede_acceder`
--   D-02 ¿Coadministrador de condominio
--        o de unidad?                     -> existe en ambos enums de rol
--   D-09 ¿quién puede crear a quién?      -> es política, no estructura
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Enumeraciones
-- ----------------------------------------------------------------------------
-- Valores derivados del inventario en docs/INVENTARIO-VALORES.md. Se escriben
-- en minúscula y sin tildes; la etiqueta que ve el usuario es asunto de la UI.

-- Unión de los documentos de Colombia y Perú, los dos mercados del producto.
create type public.tipo_documento as enum (
  'cedula_ciudadania',   -- CO
  'cedula_extranjeria',  -- CO
  'dni',                 -- PE
  'carne_extranjeria',   -- PE
  'pep',                 -- PE
  'pasaporte'            -- ambos
);

create type public.tipo_porteria as enum (
  'entrada_principal',
  'acceso_vehicular'
);

create type public.estado_unidad as enum (
  'disponible',
  'invitado',
  'aceptado',
  'config_pendiente',
  'config_completado'
);

create type public.tipo_estacionamiento as enum (
  'visitante',
  'privado'
);

-- Roles a nivel condominio: los gestiona el Administrador.
create type public.rol_condominio as enum (
  'administrador',
  'coadministrador',
  'guardia'
);

-- Roles a nivel unidad: los gestiona el Propietario o el Inquilino Líder.
-- `coadministrador` aparece en ambos enums a propósito: las transcripciones
-- describen una figura de condominio y otra de unidad, y el equipo nunca las
-- separó formalmente (D-02). Modelarlas por separado no fuerza la decisión.
create type public.rol_unidad as enum (
  'propietario',
  'inquilino_lider',
  'residente',
  'corresidente',
  'coadministrador'
);


-- ----------------------------------------------------------------------------
-- perfil · extiende auth.users
-- ----------------------------------------------------------------------------
-- La identidad es auth.users.id. El correo vive en auth.users y NO se duplica
-- aquí: en el prototipo era la clave de facto de las personas (regla 3 de
-- AGENTS.md).

create table public.perfil (
  id               uuid primary key references auth.users(id) on delete cascade,
  nombre           text not null,
  apellido         text not null default '',
  telefono         text,
  tipo_documento   public.tipo_documento,
  identificacion   text,
  verificado       boolean not null default false,
  alias            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table public.perfil is
  'Datos de persona asociados a una cuenta. El correo vive en auth.users.';


-- ----------------------------------------------------------------------------
-- condominio · el tenant raíz
-- ----------------------------------------------------------------------------

create table public.condominio (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  direccion   text not null,
  pais        char(2) not null,             -- ISO 3166-1 alfa-2: 'CO', 'PE'
  ciudad      text,
  moneda      char(3) not null default 'COP', -- ISO 4217
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

comment on table public.condominio is
  'Raíz del árbol multi-tenant. Todo dato del dominio cuelga de aquí.';


-- ----------------------------------------------------------------------------
-- torre
-- ----------------------------------------------------------------------------
-- Los conteos que el prototipo guardaba como texto (pisos, sotanos, cocheras,
-- entradas) son enteros (regla 5 de AGENTS.md).

create table public.torre (
  id                    uuid primary key default gen_random_uuid(),
  condominio_id         uuid not null references public.condominio(id) on delete cascade,
  numero                integer not null,
  nombre                text not null,
  descripcion           text,
  pisos                 integer,
  sotanos               integer,
  cocheras_visitas      integer not null default 0,
  cocheras_privadas     integer not null default 0,
  almacenes_privados    integer not null default 0,
  entradas_peatonales   integer not null default 0,
  entradas_vehiculares  integer not null default 0,
  nomenclatura_desde    text,
  nomenclatura_hasta    text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz,
  constraint torre_numero_unico_por_condominio unique (condominio_id, numero)
);


-- ----------------------------------------------------------------------------
-- porteria
-- ----------------------------------------------------------------------------
-- Reemplaza al campo de texto `Guardia.garita`, señalado como término regional
-- sin nombre de reemplazo cerrado (D-04). Al ser una FK, el nombre visible pasa
-- a ser un dato editable y la decisión de producto deja de bloquear el schema.

create table public.porteria (
  id             uuid primary key default gen_random_uuid(),
  condominio_id  uuid not null references public.condominio(id) on delete cascade,
  nombre         text not null,
  tipo           public.tipo_porteria not null,
  ubicacion      text,
  telefono       text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);


-- ----------------------------------------------------------------------------
-- tipologia
-- ----------------------------------------------------------------------------
-- PENDIENTE DE CONFIRMAR: el commit 9a65812 (03/09/2026) declara "eliminar
-- tipologias de arquitectura", pero la entidad, su store y su CRUD siguen
-- completos en el código y `Unidad` la referencia. Se conserva hasta que
-- producto confirme; quitarla después es más barato que reintroducirla.

create table public.tipologia (
  id                uuid primary key default gen_random_uuid(),
  condominio_id     uuid not null references public.condominio(id) on delete cascade,
  nombre            text not null,
  metros_cuadrados  numeric(8,2),
  habitaciones      integer,
  banos             integer,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);


-- ----------------------------------------------------------------------------
-- unidad
-- ----------------------------------------------------------------------------
-- `propietarioAsignado` y `propietarioEmail` del prototipo desaparecen: esa
-- relación ahora vive en `membresia_unidad` con una FK real.

create table public.unidad (
  id             uuid primary key default gen_random_uuid(),
  condominio_id  uuid not null references public.condominio(id) on delete cascade,
  torre_id       uuid not null references public.torre(id) on delete restrict,
  codigo         text not null,
  piso           integer not null,
  tipologia_id   uuid references public.tipologia(id) on delete set null,
  estado         public.estado_unidad not null default 'disponible',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz,
  constraint unidad_codigo_unico_por_condominio unique (condominio_id, codigo)
);

create index unidad_torre_idx on public.unidad (torre_id);


-- ----------------------------------------------------------------------------
-- deposito
-- ----------------------------------------------------------------------------

create table public.deposito (
  id             uuid primary key default gen_random_uuid(),
  condominio_id  uuid not null references public.condominio(id) on delete cascade,
  torre_id       uuid references public.torre(id) on delete set null,
  codigo         text not null,
  ubicacion      text,
  unidad_id      uuid references public.unidad(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint deposito_codigo_unico_por_condominio unique (condominio_id, codigo)
);


-- ----------------------------------------------------------------------------
-- estacionamiento
-- ----------------------------------------------------------------------------
-- En el prototipo esto era un contador global `{total, ocupados}` más un mapa
-- `spot -> clave`. Como tabla, la ocupación puede auditarse y liberarse sin
-- condiciones de carrera.

create table public.estacionamiento (
  id             uuid primary key default gen_random_uuid(),
  condominio_id  uuid not null references public.condominio(id) on delete cascade,
  torre_id       uuid references public.torre(id) on delete set null,
  codigo         text not null,
  ubicacion      text,
  tipo           public.tipo_estacionamiento not null,
  unidad_id      uuid references public.unidad(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint estacionamiento_codigo_unico_por_condominio unique (condominio_id, codigo),
  constraint estacionamiento_privado_con_unidad
    check (tipo <> 'privado' or unidad_id is not null)
);


-- ----------------------------------------------------------------------------
-- membresia_condominio
-- ----------------------------------------------------------------------------

create table public.membresia_condominio (
  id             uuid primary key default gen_random_uuid(),
  condominio_id  uuid not null references public.condominio(id) on delete cascade,
  usuario_id     uuid not null references auth.users(id) on delete cascade,
  rol            public.rol_condominio not null,
  porteria_id    uuid references public.porteria(id) on delete set null, -- solo guardias
  permisos       jsonb not null default '{}'::jsonb,
  activo         boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint membresia_condominio_unica unique (condominio_id, usuario_id, rol)
);

comment on column public.membresia_condominio.permisos is
  'Permisos granulares del coadministrador y del guardia (chat, llamadas, etc.). Las claves se tipan cuando producto cierre el listado.';


-- ----------------------------------------------------------------------------
-- membresia_unidad
-- ----------------------------------------------------------------------------
-- `usuario_id` es nullable a propósito: el Propietario puede registrar personas
-- que no tienen cuenta — en particular menores de edad, que según la decisión
-- del 01/07/2026 no acceden a la plataforma.

create table public.membresia_unidad (
  id                     uuid primary key default gen_random_uuid(),
  unidad_id              uuid not null references public.unidad(id) on delete cascade,
  usuario_id             uuid references auth.users(id) on delete set null,
  nombre                 text not null,
  rol                    public.rol_unidad not null,
  es_anfitrion_primario  boolean not null default false,
  es_admin_primario      boolean not null default false,
  es_residente           boolean not null default true,
  es_menor               boolean not null default false,
  puede_acceder          boolean not null default true,
  permisos               jsonb not null default '{}'::jsonb,
  activo                 boolean not null default true,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint membresia_unidad_menor_sin_acceso
    check (not es_menor or not puede_acceder),
  constraint membresia_unidad_con_acceso_requiere_cuenta
    check (not puede_acceder or usuario_id is not null)
);

comment on column public.membresia_unidad.puede_acceder is
  'Si esta persona inicia sesión con este rol. Resuelve D-01 sin cambiar el schema.';
comment on column public.membresia_unidad.usuario_id is
  'Null para personas registradas sin cuenta (p. ej. menores de edad).';

create index membresia_unidad_usuario_idx on public.membresia_unidad (usuario_id) where usuario_id is not null;

-- Una sola persona puede ser anfitrión primario, y una sola admin primario.
create unique index membresia_unidad_un_anfitrion_primario
  on public.membresia_unidad (unidad_id) where es_anfitrion_primario and activo;
create unique index membresia_unidad_un_admin_primario
  on public.membresia_unidad (unidad_id) where es_admin_primario and activo;


-- ----------------------------------------------------------------------------
-- Disparadores de updated_at
-- ----------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'perfil','condominio','torre','porteria','tipologia','unidad',
    'deposito','estacionamiento','membresia_condominio','membresia_unidad'
  ] loop
    execute format(
      'create trigger %I_tocar_updated_at before update on public.%I
         for each row execute function public.tocar_updated_at()',
      t, t
    );
  end loop;
end $$;


-- ----------------------------------------------------------------------------
-- Funciones de autorización
-- ----------------------------------------------------------------------------
-- SECURITY DEFINER para que las políticas puedan consultar las tablas de
-- membresía sin disparar recursión sobre sus propias políticas.

create or replace function public.es_miembro_condominio(p_condominio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.membresia_condominio mc
    where mc.condominio_id = p_condominio_id
      and mc.usuario_id = auth.uid()
      and mc.activo
  ) or exists (
    select 1
    from public.membresia_unidad mu
    join public.unidad u on u.id = mu.unidad_id
    where u.condominio_id = p_condominio_id
      and mu.usuario_id = auth.uid()
      and mu.activo
  );
$$;

create or replace function public.es_admin_condominio(p_condominio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.membresia_condominio mc
    where mc.condominio_id = p_condominio_id
      and mc.usuario_id = auth.uid()
      and mc.rol in ('administrador', 'coadministrador')
      and mc.activo
  );
$$;

create or replace function public.es_miembro_unidad(p_unidad_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.membresia_unidad mu
    where mu.unidad_id = p_unidad_id
      and mu.usuario_id = auth.uid()
      and mu.activo
  );
$$;

create or replace function public.condominio_de_unidad(p_unidad_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select u.condominio_id from public.unidad u where u.id = p_unidad_id;
$$;


-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
-- Regla 7 de AGENTS.md: ninguna tabla sin RLS. El patrón general es
--   lectura  -> cualquier miembro del condominio
--   escritura-> solo administración del condominio
-- salvo donde el dominio exija otra cosa.

alter table public.perfil                enable row level security;
alter table public.condominio            enable row level security;
alter table public.torre                 enable row level security;
alter table public.porteria              enable row level security;
alter table public.tipologia             enable row level security;
alter table public.unidad                enable row level security;
alter table public.deposito              enable row level security;
alter table public.estacionamiento       enable row level security;
alter table public.membresia_condominio  enable row level security;
alter table public.membresia_unidad      enable row level security;

-- perfil: cada quien ve y edita el suyo.
create policy perfil_lectura_propia on public.perfil
  for select to authenticated using (id = auth.uid());
create policy perfil_escritura_propia on public.perfil
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy perfil_alta_propia on public.perfil
  for insert to authenticated with check (id = auth.uid());

-- condominio: lo ven sus miembros; lo edita su administración.
create policy condominio_lectura on public.condominio
  for select to authenticated using (public.es_miembro_condominio(id));
create policy condominio_escritura on public.condominio
  for update to authenticated using (public.es_admin_condominio(id));

-- Arquitectura: lectura para miembros, escritura para administración.
do $$
declare
  t text;
begin
  foreach t in array array['torre','porteria','tipologia','unidad','deposito','estacionamiento'] loop
    execute format(
      'create policy %I_lectura on public.%I for select to authenticated
         using (public.es_miembro_condominio(condominio_id))', t, t);
    execute format(
      'create policy %I_escritura on public.%I for all to authenticated
         using (public.es_admin_condominio(condominio_id))
         with check (public.es_admin_condominio(condominio_id))', t, t);
  end loop;
end $$;

-- Membresías de condominio: visibles para los miembros, gestionadas por la
-- administración. Cada quien ve además la suya propia.
create policy membresia_condominio_lectura on public.membresia_condominio
  for select to authenticated
  using (usuario_id = auth.uid() or public.es_miembro_condominio(condominio_id));
create policy membresia_condominio_escritura on public.membresia_condominio
  for all to authenticated
  using (public.es_admin_condominio(condominio_id))
  with check (public.es_admin_condominio(condominio_id));

-- Membresías de unidad: las ven los miembros de esa unidad y la administración
-- del condominio. Las gestiona quien pertenece a la unidad.
create policy membresia_unidad_lectura on public.membresia_unidad
  for select to authenticated
  using (
    usuario_id = auth.uid()
    or public.es_miembro_unidad(unidad_id)
    or public.es_admin_condominio(public.condominio_de_unidad(unidad_id))
  );
create policy membresia_unidad_escritura on public.membresia_unidad
  for all to authenticated
  using (
    public.es_miembro_unidad(unidad_id)
    or public.es_admin_condominio(public.condominio_de_unidad(unidad_id))
  )
  with check (
    public.es_miembro_unidad(unidad_id)
    or public.es_admin_condominio(public.condominio_de_unidad(unidad_id))
  );
