-- ============================================================================
-- 0005 · Zonas comunes, reservas y correspondencia
-- ============================================================================
-- El prototipo tenía TRES entidades solapadas para la misma zona común
-- (`ZonaComun`, `ZonaComunConfig`, `GestionZona`), con campos equivalentes de
-- nombre distinto (`reglamento`/`reglas`, `duracionMaxima`/`duracionPermitida`)
-- y tipos incompatibles para el mismo concepto (`horariosDisponibles` era
-- `Horario[]` en una y `string[]` en otra). Aquí es una sola tabla, derivada de
-- `GestionZona`, que era la más completa.
-- ============================================================================


create type public.estado_reserva as enum (
  'pendiente',
  'aprobada',
  'rechazada',
  'en_curso',
  'finalizada',
  'cancelada'
);

create type public.tipo_participante as enum (
  'residente',
  'visitante',
  'huesped_temporal'
);

create type public.asistencia_participante as enum (
  'pendiente',
  'presente',
  'salio'
);

create type public.tipo_fecha_especial as enum (
  'cerrada',
  'horario_especial'
);

create type public.estado_correspondencia as enum (
  'no_recibido',
  'en_porteria',
  'entregado'
);

create type public.estado_encomienda as enum (
  'buen_estado',
  'estado_intermedio',
  'mal_estado'
);

create type public.categoria_correspondencia as enum (
  'delivery',
  'compra',
  'servicios'
);


-- ----------------------------------------------------------------------------
-- zona_comun
-- ----------------------------------------------------------------------------

create table public.zona_comun (
  id                          uuid primary key default gen_random_uuid(),
  condominio_id               uuid not null references public.condominio(id) on delete cascade,
  nombre                      text not null,
  tipo                        text,
  descripcion                 text,
  emoji                       text,
  imagen_path                 text,

  horario_apertura            time,
  horario_cierre              time,
  dias_habilitados            smallint[] not null default '{0,1,2,3,4,5,6}',  -- 0=domingo (ISO)

  duracion_minima_min         integer,
  duracion_maxima_min         integer,
  tiempo_min_entre_reservas   integer not null default 0,

  capacidad_maxima            integer,
  cupos_simultaneos           integer not null default 1,
  usa_slots                   boolean not null default false,

  requiere_aprobacion         boolean not null default false,
  restringida_huesped         boolean not null default false,
  permite_estancia_corta      boolean not null default true,
  permite_estancia_larga      boolean not null default true,

  monto_garantia              numeric(12,2) not null default 0,
  costo_limpieza              numeric(12,2) not null default 0,
  costo_reserva               numeric(12,2) not null default 0,
  moneda                      char(3),

  reglamento                  text,
  activa                      boolean not null default true,

  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  deleted_at                  timestamptz,

  constraint zona_comun_duracion_coherente
    check (duracion_maxima_min is null or duracion_minima_min is null
           or duracion_maxima_min >= duracion_minima_min),
  constraint zona_comun_horario_coherente
    check (horario_apertura is null or horario_cierre is null or horario_cierre > horario_apertura),
  constraint zona_comun_moneda_si_hay_costo
    check ((monto_garantia = 0 and costo_limpieza = 0 and costo_reserva = 0) or moneda is not null)
);

create index zona_comun_condominio_idx on public.zona_comun (condominio_id) where deleted_at is null;


-- ----------------------------------------------------------------------------
-- zona_fecha_especial · feriados y cierres puntuales
-- ----------------------------------------------------------------------------

create table public.zona_fecha_especial (
  id              uuid primary key default gen_random_uuid(),
  zona_id         uuid not null references public.zona_comun(id) on delete cascade,
  fecha           date not null,
  tipo            public.tipo_fecha_especial not null,
  motivo          text,
  hora_apertura   time,
  hora_cierre     time,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint zona_fecha_especial_unica unique (zona_id, fecha),
  constraint zona_fecha_especial_horario
    check (tipo = 'cerrada' or (hora_apertura is not null and hora_cierre is not null))
);


-- ----------------------------------------------------------------------------
-- reserva_zona
-- ----------------------------------------------------------------------------
-- `comprobante_path` sostiene el flujo del 01/07/2026: el residente sube el
-- comprobante de pago y la administración aprueba a mano — no hay verificación
-- automática contra el banco.

create table public.reserva_zona (
  id                  uuid primary key default gen_random_uuid(),
  zona_id             uuid not null references public.zona_comun(id) on delete restrict,
  unidad_id           uuid not null references public.unidad(id) on delete restrict,
  solicitada_por      uuid references auth.users(id) on delete set null,
  numero              text,

  fecha               date not null,
  hora_inicio         time not null,
  hora_fin            time not null,

  estado              public.estado_reserva not null default 'pendiente',
  acompanantes        integer not null default 0,
  comentarios         text,

  comprobante_path    text,
  resuelta_por        uuid references auth.users(id) on delete set null,
  resuelta_en         timestamptz,
  motivo_rechazo      text,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint reserva_zona_horario_coherente check (hora_fin > hora_inicio),
  constraint reserva_zona_resuelta_con_actor
    check (estado not in ('aprobada','rechazada') or (resuelta_por is not null and resuelta_en is not null))
);

create index reserva_zona_zona_fecha_idx on public.reserva_zona (zona_id, fecha);
create index reserva_zona_unidad_idx     on public.reserva_zona (unidad_id);


-- ----------------------------------------------------------------------------
-- participante_reserva
-- ----------------------------------------------------------------------------
-- Antes era un array embebido `personas[]` con `llego: boolean | 'salio'`, un
-- tri-estado disfrazado de booleano.

create table public.participante_reserva (
  id            uuid primary key default gen_random_uuid(),
  reserva_id    uuid not null references public.reserva_zona(id) on delete cascade,
  nombre        text not null,
  tipo          public.tipo_participante not null default 'residente',
  asistencia    public.asistencia_participante not null default 'pendiente',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index participante_reserva_idx on public.participante_reserva (reserva_id);


-- ----------------------------------------------------------------------------
-- correspondencia
-- ----------------------------------------------------------------------------
-- El prototipo tenía NUEVE pares fecha/hora en columnas separadas, más dos
-- campos de estado sin relación documentada (`estado` y `estadoEncomienda`).
-- Aquí: tres timestamptz con su actor, y los dos estados con significados
-- distintos y explícitos (dónde está / en qué condición llegó).

create table public.correspondencia (
  id                  uuid primary key default gen_random_uuid(),
  condominio_id       uuid not null references public.condominio(id) on delete cascade,
  unidad_id           uuid not null references public.unidad(id) on delete restrict,

  empresa             text,
  logistica           text,          -- texto libre a propósito: son empresas, la lista crece
  categoria           public.categoria_correspondencia,
  descripcion         text,

  estado              public.estado_correspondencia not null default 'no_recibido',
  condicion           public.estado_encomienda,
  entrega_en_puerta   boolean not null default false,

  registrada_en       timestamptz not null default now(),
  registrada_por      uuid references auth.users(id) on delete set null,
  recibida_en         timestamptz,
  recibida_por        uuid references auth.users(id) on delete set null,
  entregada_en        timestamptz,
  entregada_a         text,          -- puede ser alguien sin cuenta

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz,

  constraint correspondencia_entregada_con_fecha
    check (estado <> 'entregado' or entregada_en is not null)
);

create index correspondencia_unidad_idx on public.correspondencia (unidad_id, estado);


-- ----------------------------------------------------------------------------
-- incidencia_correspondencia · el "informar"
-- ----------------------------------------------------------------------------

create table public.incidencia_correspondencia (
  id                  uuid primary key default gen_random_uuid(),
  correspondencia_id  uuid not null references public.correspondencia(id) on delete cascade,
  descripcion         text not null,
  fotos               text[] not null default '{}',
  reportada_por       uuid references auth.users(id) on delete set null,
  reportada_en        timestamptz not null default now(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);


-- ----------------------------------------------------------------------------
-- Disparadores de updated_at
-- ----------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array[
    'zona_comun','zona_fecha_especial','reserva_zona','participante_reserva',
    'correspondencia','incidencia_correspondencia'
  ] loop
    execute format(
      'create trigger %I_tocar_updated_at before update on public.%I
         for each row execute function public.tocar_updated_at()', t, t);
  end loop;
end $$;


-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------

alter table public.zona_comun                 enable row level security;
alter table public.zona_fecha_especial        enable row level security;
alter table public.reserva_zona               enable row level security;
alter table public.participante_reserva       enable row level security;
alter table public.correspondencia            enable row level security;
alter table public.incidencia_correspondencia enable row level security;

-- Zonas: las ve cualquier miembro; las configura la administración.
create policy zona_comun_lectura on public.zona_comun
  for select to authenticated using (public.es_miembro_condominio(condominio_id));
create policy zona_comun_escritura on public.zona_comun
  for all to authenticated
  using (public.es_admin_condominio(condominio_id))
  with check (public.es_admin_condominio(condominio_id));

create policy zona_fecha_especial_acceso on public.zona_fecha_especial
  for all to authenticated
  using (exists (select 1 from public.zona_comun z
                 where z.id = zona_fecha_especial.zona_id
                   and public.es_admin_condominio(z.condominio_id)))
  with check (exists (select 1 from public.zona_comun z
                 where z.id = zona_fecha_especial.zona_id
                   and public.es_admin_condominio(z.condominio_id)));
create policy zona_fecha_especial_lectura on public.zona_fecha_especial
  for select to authenticated
  using (exists (select 1 from public.zona_comun z
                 where z.id = zona_fecha_especial.zona_id
                   and public.es_miembro_condominio(z.condominio_id)));

-- Reservas: el residente opera las de sus unidades; la administración, todas.
create policy reserva_zona_lectura on public.reserva_zona
  for select to authenticated
  using (
    public.puede_operar_unidad(unidad_id)
    or exists (select 1 from public.zona_comun z
               where z.id = reserva_zona.zona_id
                 and public.es_admin_condominio(z.condominio_id))
  );
create policy reserva_zona_escritura on public.reserva_zona
  for all to authenticated
  using (
    public.puede_operar_unidad(unidad_id)
    or exists (select 1 from public.zona_comun z
               where z.id = reserva_zona.zona_id
                 and public.es_admin_condominio(z.condominio_id))
  )
  with check (
    public.puede_operar_unidad(unidad_id)
    or exists (select 1 from public.zona_comun z
               where z.id = reserva_zona.zona_id
                 and public.es_admin_condominio(z.condominio_id))
  );

create policy participante_reserva_acceso on public.participante_reserva
  for all to authenticated
  using (exists (select 1 from public.reserva_zona r
                 where r.id = participante_reserva.reserva_id
                   and public.puede_operar_unidad(r.unidad_id)))
  with check (exists (select 1 from public.reserva_zona r
                 where r.id = participante_reserva.reserva_id
                   and public.puede_operar_unidad(r.unidad_id)));

-- Correspondencia: la del propio departamento, o toda para el personal.
create policy correspondencia_acceso on public.correspondencia
  for all to authenticated
  using (public.puede_operar_unidad(unidad_id))
  with check (public.puede_operar_unidad(unidad_id));

create policy incidencia_correspondencia_acceso on public.incidencia_correspondencia
  for all to authenticated
  using (exists (select 1 from public.correspondencia c
                 where c.id = incidencia_correspondencia.correspondencia_id
                   and public.puede_operar_unidad(c.unidad_id)))
  with check (exists (select 1 from public.correspondencia c
                 where c.id = incidencia_correspondencia.correspondencia_id
                   and public.puede_operar_unidad(c.unidad_id)));
