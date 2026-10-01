-- ============================================================================
-- 0006 · Anuncios, reglamentos, PQRS, pagos y reconocimiento
-- ============================================================================
-- Dos correcciones de fondo:
--
-- 1. Los votos de las encuestas eran `votosSi: string[]` / `votosNo: string[]`
--    DENTRO del anuncio: cualquiera que leyera el anuncio veía quién votó qué,
--    aunque `ocultarResultados` prometiera lo contrario; nada impedía votar dos
--    veces, y los datos de prueba ya mostraban departamentos en ambas listas.
--    Aquí el voto es una tabla con unicidad por votante y RLS que impide leer
--    el voto ajeno.
--
-- 2. Los pagos eran `Record<unidadId, boolean>` SIN periodo: marcar pagado en
--    octubre borraba septiembre, y encima el Cuadro de Honor y el histórico de
--    cuotas se calculan sobre eso.
-- ============================================================================


create type public.tipo_publicacion as enum ('anuncio', 'encuesta');

create type public.categoria_anuncio as enum (
  'servicios', 'eventos', 'mantenimiento', 'seguridad', 'administracion'
);

create type public.tipo_regla as enum (
  'residente_permanente', 'huesped_temporal', 'guardia_seguridad'
);

create type public.tipo_reclamo as enum (
  'consulta', 'reclamo', 'sugerencia', 'pregunta'
);

create type public.categoria_reclamo as enum (
  'convivencia', 'mantenimiento', 'seguridad', 'pagos', 'servicios'
);

create type public.estado_reclamo as enum (
  'pendiente', 'en_curso', 'resuelto'
);

create type public.origen_pago as enum (
  'manual', 'carga_masiva'
);


-- ----------------------------------------------------------------------------
-- publicacion · anuncios y encuestas
-- ----------------------------------------------------------------------------

create table public.publicacion (
  id                    uuid primary key default gen_random_uuid(),
  condominio_id         uuid not null references public.condominio(id) on delete cascade,
  tipo                  public.tipo_publicacion not null default 'anuncio',
  categoria             public.categoria_anuncio not null,
  titulo                text not null,
  descripcion           text,
  url_video             text,

  publicada_desde       timestamptz not null default now(),
  publicada_hasta       timestamptz,

  -- Segmentación de audiencia.
  para_propietarios     boolean not null default true,
  para_residentes       boolean not null default true,
  para_huespedes        boolean not null default false,

  -- Solo para encuestas.
  voto_multiple         boolean not null default false,
  ocultar_resultados    boolean not null default false,
  umbral                integer,

  creada_por            uuid references auth.users(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz,

  constraint publicacion_vigencia check (publicada_hasta is null or publicada_hasta > publicada_desde)
);

create index publicacion_condominio_idx on public.publicacion (condominio_id, publicada_desde desc)
  where deleted_at is null;


create table public.opcion_voto (
  id              uuid primary key default gen_random_uuid(),
  publicacion_id  uuid not null references public.publicacion(id) on delete cascade,
  etiqueta        text not null,
  orden           integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint opcion_voto_orden_unico unique (publicacion_id, orden)
);


create table public.voto (
  id              uuid primary key default gen_random_uuid(),
  publicacion_id  uuid not null references public.publicacion(id) on delete cascade,
  opcion_id       uuid not null references public.opcion_voto(id) on delete cascade,
  usuario_id      uuid not null references auth.users(id) on delete cascade,
  unidad_id       uuid references public.unidad(id) on delete set null,
  emitido_en      timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Nunca dos veces la misma opción. El caso "un solo voto por persona" lo
-- resuelve el trigger de abajo, porque depende de publicacion.voto_multiple y
-- un predicado de índice no puede consultar otra tabla.
create unique index voto_unico_por_opcion
  on public.voto (publicacion_id, usuario_id, opcion_id);

-- Cuando la encuesta NO admite voto múltiple, una fila por persona.
create or replace function public.validar_voto_unico()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_multiple boolean;
  v_existentes integer;
begin
  select voto_multiple into v_multiple
  from public.publicacion where id = new.publicacion_id;

  if not coalesce(v_multiple, false) then
    select count(*) into v_existentes
    from public.voto
    where publicacion_id = new.publicacion_id
      and usuario_id = new.usuario_id
      and id <> coalesce(new.id, gen_random_uuid());
    if v_existentes > 0 then
      raise exception 'Esta encuesta admite un solo voto por persona';
    end if;
  end if;
  return new;
end;
$$;

create trigger voto_validar_unico
  before insert or update on public.voto
  for each row execute function public.validar_voto_unico();

-- Recuento agregado, sin exponer quién votó qué.
create or replace function public.resultados_publicacion(p_publicacion_id uuid)
returns table (opcion_id uuid, etiqueta text, votos bigint)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select o.id, o.etiqueta, count(v.id)
  from public.opcion_voto o
  left join public.voto v on v.opcion_id = o.id
  where o.publicacion_id = p_publicacion_id
    and exists (
      select 1 from public.publicacion p
      where p.id = p_publicacion_id
        and public.es_miembro_condominio(p.condominio_id)
    )
  group by o.id, o.etiqueta
  order by o.orden;
$$;

comment on function public.resultados_publicacion is
  'Único camino para leer resultados. Devuelve conteos, nunca la identidad de los votantes.';


-- ----------------------------------------------------------------------------
-- reglamento
-- ----------------------------------------------------------------------------
-- En el prototipo el contenido estaba versionado en código. Es por condominio
-- (el RNT exige presentar el reglamento del propio condominio) y cambia.

create table public.reglamento (
  id              uuid primary key default gen_random_uuid(),
  condominio_id   uuid not null references public.condominio(id) on delete cascade,
  tipo            public.tipo_regla not null,
  titulo          text not null,
  contenido       jsonb not null default '[]'::jsonb,   -- [{titulo, items[]}]
  archivo_path    text,
  version         integer not null default 1,
  vigente         boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index reglamento_vigente_unico
  on public.reglamento (condominio_id, tipo) where vigente;


-- ----------------------------------------------------------------------------
-- reclamo · PQRS
-- ----------------------------------------------------------------------------

create table public.reclamo (
  id                  uuid primary key default gen_random_uuid(),
  condominio_id       uuid not null references public.condominio(id) on delete cascade,
  unidad_id           uuid references public.unidad(id) on delete set null,
  numero              text not null,
  creado_por          uuid references auth.users(id) on delete set null,

  tipo                public.tipo_reclamo not null,
  categoria           public.categoria_reclamo not null,
  titulo              text not null,
  descripcion         text not null,
  unidad_denunciada   uuid references public.unidad(id) on delete set null,

  estado              public.estado_reclamo not null default 'pendiente',
  resolucion          text,
  resuelto_por        uuid references auth.users(id) on delete set null,
  resuelto_en         timestamptz,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint reclamo_numero_unico unique (condominio_id, numero),
  constraint reclamo_resuelto_con_actor
    check (estado <> 'resuelto' or (resuelto_por is not null and resuelto_en is not null))
);


-- ----------------------------------------------------------------------------
-- cuota_administracion y pago_cuota
-- ----------------------------------------------------------------------------
-- `periodo` es el primer día del mes. Sin esta dimensión, marcar un pago
-- sobrescribía el del mes anterior.

create table public.cuota_administracion (
  id              uuid primary key default gen_random_uuid(),
  condominio_id   uuid not null references public.condominio(id) on delete cascade,
  periodo         date not null,
  monto           numeric(12,2) not null,
  moneda          char(3) not null,
  vence_en        date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint cuota_administracion_unica unique (condominio_id, periodo),
  constraint cuota_administracion_periodo_es_mes
    check (date_trunc('month', periodo)::date = periodo)
);

create table public.pago_cuota (
  id              uuid primary key default gen_random_uuid(),
  cuota_id        uuid not null references public.cuota_administracion(id) on delete cascade,
  unidad_id       uuid not null references public.unidad(id) on delete cascade,
  pagado          boolean not null default false,
  pagado_en       date,
  monto           numeric(12,2),
  origen          public.origen_pago not null default 'manual',
  registrado_por  uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint pago_cuota_unico unique (cuota_id, unidad_id),
  constraint pago_cuota_pagado_con_fecha check (not pagado or pagado_en is not null)
);

comment on table public.pago_cuota is
  'Un registro por unidad y periodo. Reemplaza el mapa unidadId->boolean, que perdía el histórico.';


-- ----------------------------------------------------------------------------
-- comite_propietarios
-- ----------------------------------------------------------------------------
-- Antes era `Record<email, boolean>` sin fecha de alta ni baja.

create table public.comite_propietarios (
  id              uuid primary key default gen_random_uuid(),
  condominio_id   uuid not null references public.condominio(id) on delete cascade,
  usuario_id      uuid not null references auth.users(id) on delete cascade,
  cargo           text,
  desde           date not null default current_date,
  hasta           date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint comite_vigencia check (hasta is null or hasta > desde)
);

create unique index comite_miembro_activo_unico
  on public.comite_propietarios (condominio_id, usuario_id) where hasta is null;


-- ----------------------------------------------------------------------------
-- insignia y reconocimiento
-- ----------------------------------------------------------------------------
-- Decisión del 21/07/2026: acumulación de insignias, SIN niveles ni progresión.
-- El código todavía muestra "Nivel Plata"; el modelo no lo contempla.

create table public.insignia (
  id              uuid primary key default gen_random_uuid(),
  clave           text not null unique,
  etiqueta        text not null,
  icono           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table public.reconocimiento (
  id              uuid primary key default gen_random_uuid(),
  insignia_id     uuid not null references public.insignia(id) on delete cascade,
  usuario_id      uuid not null references auth.users(id) on delete cascade,
  condominio_id   uuid not null references public.condominio(id) on delete cascade,
  otorgado_por    uuid references auth.users(id) on delete set null,
  otorgado_en     timestamptz not null default now(),
  motivo          text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index reconocimiento_usuario_idx on public.reconocimiento (usuario_id, condominio_id);


-- ----------------------------------------------------------------------------
-- Disparadores de updated_at
-- ----------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array[
    'publicacion','opcion_voto','voto','reglamento','reclamo',
    'cuota_administracion','pago_cuota','comite_propietarios','insignia','reconocimiento'
  ] loop
    execute format(
      'create trigger %I_tocar_updated_at before update on public.%I
         for each row execute function public.tocar_updated_at()', t, t);
  end loop;
end $$;


-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------

alter table public.publicacion           enable row level security;
alter table public.opcion_voto           enable row level security;
alter table public.voto                  enable row level security;
alter table public.reglamento            enable row level security;
alter table public.reclamo               enable row level security;
alter table public.cuota_administracion  enable row level security;
alter table public.pago_cuota            enable row level security;
alter table public.comite_propietarios   enable row level security;
alter table public.insignia              enable row level security;
alter table public.reconocimiento        enable row level security;

-- Publicaciones y reglamentos: lectura para miembros, escritura para administración.
do $$
declare t text;
begin
  foreach t in array array['publicacion','reglamento','cuota_administracion','comite_propietarios'] loop
    execute format(
      'create policy %I_lectura on public.%I for select to authenticated
         using (public.es_miembro_condominio(condominio_id))', t, t);
    execute format(
      'create policy %I_escritura on public.%I for all to authenticated
         using (public.es_admin_condominio(condominio_id))
         with check (public.es_admin_condominio(condominio_id))', t, t);
  end loop;
end $$;

create policy opcion_voto_lectura on public.opcion_voto
  for select to authenticated
  using (exists (select 1 from public.publicacion p
                 where p.id = opcion_voto.publicacion_id
                   and public.es_miembro_condominio(p.condominio_id)));
create policy opcion_voto_escritura on public.opcion_voto
  for all to authenticated
  using (exists (select 1 from public.publicacion p
                 where p.id = opcion_voto.publicacion_id
                   and public.es_admin_condominio(p.condominio_id)))
  with check (exists (select 1 from public.publicacion p
                 where p.id = opcion_voto.publicacion_id
                   and public.es_admin_condominio(p.condominio_id)));

-- VOTO: cada quien ve y emite SOLO el suyo. Los resultados agregados se
-- obtienen por resultados_publicacion(), nunca leyendo esta tabla.
create policy voto_propio_lectura on public.voto
  for select to authenticated using (usuario_id = auth.uid());
create policy voto_propio_escritura on public.voto
  for all to authenticated
  using (usuario_id = auth.uid())
  with check (
    usuario_id = auth.uid()
    and exists (select 1 from public.publicacion p
                where p.id = voto.publicacion_id
                  and public.es_miembro_condominio(p.condominio_id)
                  and p.tipo = 'encuesta'
                  and (p.publicada_hasta is null or p.publicada_hasta > now()))
  );

comment on policy voto_propio_lectura on public.voto is
  'Nadie lee el voto ajeno, ni siquiera la administración. Los resultados salen agregados.';

-- Reclamos: el autor y la administración.
create policy reclamo_lectura on public.reclamo
  for select to authenticated
  using (creado_por = auth.uid() or public.es_admin_condominio(condominio_id));
create policy reclamo_alta on public.reclamo
  for insert to authenticated
  with check (creado_por = auth.uid() and public.es_miembro_condominio(condominio_id));
create policy reclamo_gestion on public.reclamo
  for update to authenticated
  using (public.es_admin_condominio(condominio_id))
  with check (public.es_admin_condominio(condominio_id));

-- Pagos: la unidad ve el suyo; la administración, todos.
create policy pago_cuota_acceso on public.pago_cuota
  for all to authenticated
  using (public.puede_operar_unidad(unidad_id))
  with check (public.puede_operar_unidad(unidad_id));

-- Insignias: catálogo legible por cualquier autenticado.
create policy insignia_lectura on public.insignia
  for select to authenticated using (true);

create policy reconocimiento_lectura on public.reconocimiento
  for select to authenticated using (public.es_miembro_condominio(condominio_id));
create policy reconocimiento_escritura on public.reconocimiento
  for all to authenticated
  using (public.es_admin_condominio(condominio_id))
  with check (public.es_admin_condominio(condominio_id));
