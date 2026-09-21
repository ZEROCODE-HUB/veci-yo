-- ============================================================================
-- 0003 · Visitas, invitados y cumplimiento legal
-- ============================================================================
-- Tres correcciones estructurales respecto del prototipo:
--
-- 1. `invitado` pasa a ser tabla con identidad propia. En el prototipo era un
--    objeto anónimo dentro de un array de `VisitaItem`, y la verificación de
--    documento se indexaba por POSICIÓN en ese array. El reporte TRA/SIRE se
--    emite por huésped: sin id no hay forma de referenciarlo, auditarlo ni
--    reintentarlo, y borrar un invitado desplazaría las verificaciones a otra
--    persona.
--
-- 2. Toda visita queda atada a una unidad real por FK. Hoy `torre` y `depto`
--    son strings libres tomados de una lista estática, son opcionales en el
--    esquema zod, y el selector del guardia ofrece "Todas"/"Todos" — de modo
--    que se puede registrar una visita sin unidad asignada.
--
-- 3. El `timeline` de 6 pasos deja de ser un blob sin forma y pasa a ser una
--    tabla de eventos con marca de tiempo y actor.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Enumeraciones
-- ----------------------------------------------------------------------------

create type public.tipo_visita as enum (
  'amigos',
  'temporal',      -- profesional temporal
  'permanente',    -- personal de confianza
  'huesped_temporal'
);

create type public.estado_visita as enum (
  'programada',
  'ingresada',
  'finalizada',
  'cancelada'
);

create type public.instruccion_documento as enum (
  'verificar',
  'no_verificar'
);

create type public.tipo_notificacion as enum (
  'solo_notificar',
  'notificar_y_anunciar'
);

-- Las cuatro opciones que exige el documento de producto. El código actual
-- guarda texto libre y llegó a tener dos grafías de la misma ('Auto', 'Automóvil').
create type public.tipo_vehiculo as enum (
  'auto',
  'camioneta',
  'moto',
  'bus'
);

create type public.estado_verificacion as enum (
  'pendiente',
  'verificado',
  'no_coincide'
);

-- Los 6 pasos del timeline del huésped temporal.
create type public.paso_visita as enum (
  'preregistro_enviado',
  'documentacion_completa',
  'terminos_aceptados',
  'verificacion_aprobada',
  'reporte_entrada',
  'reporte_salida'
);

create type public.tipo_reporte_legal as enum (
  'tra',    -- Tarjeta de Registro de Alojamiento
  'sire'    -- reporte de extranjeros a migraciones
);

create type public.momento_reporte as enum (
  'entrada',
  'salida'
);

create type public.estado_reporte_legal as enum (
  'pendiente',
  'enviado',
  'fallido'
);


-- ----------------------------------------------------------------------------
-- visita
-- ----------------------------------------------------------------------------

create table public.visita (
  id                      uuid primary key default gen_random_uuid(),
  condominio_id           uuid not null references public.condominio(id) on delete cascade,
  unidad_id               uuid references public.unidad(id) on delete restrict,
  tipo                    public.tipo_visita not null,
  estado                  public.estado_visita not null default 'programada',

  -- Quién la registró y bajo qué autoridad.
  registrada_por          uuid references auth.users(id) on delete set null,
  autorizada_por          uuid references auth.users(id) on delete set null,
  autorizada_por_nombre   text,   -- el guardia puede anotar a quien autorizó de viva voz

  -- Ventana prevista y real.
  fecha_desde             date,
  fecha_hasta             date,
  hora_estimada_llegada   time,
  hora_estimada_salida    time,
  ingreso_en              timestamptz,
  salida_en               timestamptz,

  -- Configuración de la visita.
  instruccion_documento   public.instruccion_documento not null default 'verificar',
  tipo_notificacion       public.tipo_notificacion not null default 'solo_notificar',
  es_evento               boolean not null default false,
  nombre_evento           text,
  para_administracion     boolean not null default false,

  -- Solo para tipo 'permanente' / 'temporal'.
  dias_laborales          text,
  profesion               text,

  anotaciones_ingreso     text,
  anotaciones_salida      text,
  codigo_acceso           text,

  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  deleted_at              timestamptz,

  -- Corrige el defecto descrito arriba: sin unidad no hay visita, salvo que sea
  -- explícitamente una visita de la administración del condominio.
  constraint visita_requiere_unidad
    check (para_administracion or unidad_id is not null),

  constraint visita_evento_con_nombre
    check (not es_evento or nombre_evento is not null)
);

create index visita_unidad_idx      on public.visita (unidad_id);
create index visita_condominio_idx  on public.visita (condominio_id, estado);
create index visita_fechas_idx      on public.visita (fecha_desde, fecha_hasta);

comment on column public.visita.unidad_id is
  'FK obligatoria salvo visitas para_administracion. Reemplaza los campos de texto torre/depto.';


-- ----------------------------------------------------------------------------
-- invitado
-- ----------------------------------------------------------------------------

create table public.invitado (
  id                      uuid primary key default gen_random_uuid(),
  visita_id               uuid not null references public.visita(id) on delete cascade,
  orden                   integer not null default 0,

  nombre                  text not null,
  tipo_documento          public.tipo_documento,
  documento_numero        text,
  fecha_nacimiento        date,
  es_menor                boolean not null default false,
  tiene_tutela            boolean not null default false,

  -- Excepción de términos: el anfitrión acepta en nombre del huésped cuando
  -- este no puede hacerlo, asumiendo la responsabilidad legal.
  terminos_aceptados      boolean not null default false,
  terminos_excepcion      boolean not null default false,
  terminos_aprobado_por   uuid references auth.users(id) on delete set null,

  llego                   boolean not null default false,
  ingreso_en              timestamptz,
  salida_en               timestamptz,

  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  constraint invitado_orden_unico_por_visita unique (visita_id, orden),

  constraint invitado_excepcion_con_aprobador
    check (not terminos_excepcion or terminos_aprobado_por is not null)
);

create index invitado_visita_idx on public.invitado (visita_id);


-- ----------------------------------------------------------------------------
-- vehiculo_visita
-- ----------------------------------------------------------------------------

create table public.vehiculo_visita (
  id          uuid primary key default gen_random_uuid(),
  visita_id   uuid not null references public.visita(id) on delete cascade,
  placa       text not null,
  tipo        public.tipo_vehiculo,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index vehiculo_visita_idx on public.vehiculo_visita (visita_id);


-- ----------------------------------------------------------------------------
-- asignacion_estacionamiento
-- ----------------------------------------------------------------------------
-- Sustituye al mapa en memoria `spot -> clave`. El índice único parcial impide
-- que dos visitas ocupen el mismo lugar a la vez.

create table public.asignacion_estacionamiento (
  id                  uuid primary key default gen_random_uuid(),
  estacionamiento_id  uuid not null references public.estacionamiento(id) on delete cascade,
  visita_id           uuid not null references public.visita(id) on delete cascade,
  asignado_en         timestamptz not null default now(),
  liberado_en         timestamptz,
  asignado_por        uuid references auth.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create unique index asignacion_estacionamiento_ocupado
  on public.asignacion_estacionamiento (estacionamiento_id)
  where liberado_en is null;


-- ----------------------------------------------------------------------------
-- verificacion_documento
-- ----------------------------------------------------------------------------
-- El guardia compara el documento físico contra el subido en el precheck-in.
-- Antes se indexaba por posición dentro del array de invitados.

create table public.verificacion_documento (
  id                        uuid primary key default gen_random_uuid(),
  invitado_id               uuid not null references public.invitado(id) on delete cascade,
  estado                    public.estado_verificacion not null default 'pendiente',
  documento_original_path   text,   -- subido en el precheck-in (Storage)
  documento_tomado_path     text,   -- capturado en portería (Storage)
  verificado_por            uuid references auth.users(id) on delete set null,
  verificado_en             timestamptz,
  observaciones             text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),

  constraint verificacion_documento_unica unique (invitado_id),

  constraint verificacion_resuelta_con_actor
    check (estado = 'pendiente' or (verificado_por is not null and verificado_en is not null))
);


-- ----------------------------------------------------------------------------
-- visita_evento · el timeline de 6 pasos
-- ----------------------------------------------------------------------------

create table public.visita_evento (
  id             uuid primary key default gen_random_uuid(),
  invitado_id    uuid not null references public.invitado(id) on delete cascade,
  paso           public.paso_visita not null,
  completado_en  timestamptz not null default now(),
  actor_id       uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint visita_evento_unico unique (invitado_id, paso)
);


-- ----------------------------------------------------------------------------
-- reporte_legal · TRA / SIRE
-- ----------------------------------------------------------------------------
-- Decisión de producto del 17/07/2026: el reporte NO es automático. Se emite
-- huésped por huésped, por decisión del anfitrión, y solo una vez confirmado el
-- ingreso físico. `rnt_referencia` se copia al momento del envío porque el RNT
-- de la unidad puede cambiar o vencer después.

create table public.reporte_legal (
  id               uuid primary key default gen_random_uuid(),
  invitado_id      uuid not null references public.invitado(id) on delete restrict,
  tipo             public.tipo_reporte_legal not null,
  momento          public.momento_reporte not null,
  estado           public.estado_reporte_legal not null default 'pendiente',
  rnt_referencia   text,
  enviado_por      uuid references auth.users(id) on delete set null,
  enviado_en       timestamptz,
  respuesta        jsonb,
  error_detalle    text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint reporte_legal_unico unique (invitado_id, tipo, momento),

  constraint reporte_enviado_con_actor
    check (estado <> 'enviado' or (enviado_por is not null and enviado_en is not null))
);

comment on table public.reporte_legal is
  'Un registro por huésped, tipo y momento. Trazabilidad completa: quién lo envió, cuándo y qué respondió la entidad.';


-- ----------------------------------------------------------------------------
-- Disparadores de updated_at
-- ----------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array[
    'visita','invitado','vehiculo_visita','asignacion_estacionamiento',
    'verificacion_documento','visita_evento','reporte_legal'
  ] loop
    execute format(
      'create trigger %I_tocar_updated_at before update on public.%I
         for each row execute function public.tocar_updated_at()', t, t);
  end loop;
end $$;


-- ----------------------------------------------------------------------------
-- Autorización
-- ----------------------------------------------------------------------------

-- Guardia o administración: pueden operar sobre cualquier unidad del condominio.
create or replace function public.es_personal_condominio(p_condominio_id uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.membresia_condominio mc
    where mc.condominio_id = p_condominio_id
      and mc.usuario_id = auth.uid()
      and mc.activo
  );
$$;

comment on function public.es_personal_condominio is
  'Administrador, coadministrador o guardia del condominio. Alcance: todas las unidades.';

-- Residente: alcance limitado a las unidades donde tiene membresía activa.
-- Nota: son TODAS sus unidades, no solo la "activa" del selector de la app. La
-- unidad activa es estado de UI y no debe restringir lo que el usuario puede hacer.
create or replace function public.puede_operar_unidad(p_unidad_id uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.membresia_unidad mu
    where mu.unidad_id = p_unidad_id
      and mu.usuario_id = auth.uid()
      and mu.activo
  ) or public.es_personal_condominio(public.condominio_de_unidad(p_unidad_id));
$$;

comment on function public.puede_operar_unidad is
  'Frontera real de autorización sobre una unidad: membresía activa en ella, o personal del condominio.';

create or replace function public.puede_ver_visita(p_visita_id uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.visita v
    where v.id = p_visita_id
      and (
        public.es_personal_condominio(v.condominio_id)
        or (v.unidad_id is not null and public.puede_operar_unidad(v.unidad_id))
      )
  );
$$;


-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------

alter table public.visita                     enable row level security;
alter table public.invitado                   enable row level security;
alter table public.vehiculo_visita            enable row level security;
alter table public.asignacion_estacionamiento enable row level security;
alter table public.verificacion_documento     enable row level security;
alter table public.visita_evento              enable row level security;
alter table public.reporte_legal              enable row level security;

-- visita: el personal del condominio ve todas; el residente, las de sus unidades.
create policy visita_lectura on public.visita
  for select to authenticated
  using (
    public.es_personal_condominio(condominio_id)
    or (unidad_id is not null and public.puede_operar_unidad(unidad_id))
  );

create policy visita_escritura on public.visita
  for all to authenticated
  using (
    public.es_personal_condominio(condominio_id)
    or (unidad_id is not null and public.puede_operar_unidad(unidad_id))
  )
  with check (
    public.es_personal_condominio(condominio_id)
    or (unidad_id is not null and public.puede_operar_unidad(unidad_id))
  );

-- Tablas hijas de visita: heredan el permiso de su visita.
do $$
declare t text;
begin
  foreach t in array array['invitado','vehiculo_visita','asignacion_estacionamiento'] loop
    execute format(
      'create policy %I_acceso on public.%I for all to authenticated
         using (public.puede_ver_visita(visita_id))
         with check (public.puede_ver_visita(visita_id))', t, t);
  end loop;
end $$;

-- Tablas hijas de invitado.
do $$
declare t text;
begin
  foreach t in array array['verificacion_documento','visita_evento','reporte_legal'] loop
    execute format(
      'create policy %I_acceso on public.%I for all to authenticated
         using (exists (select 1 from public.invitado i
                        where i.id = %I.invitado_id and public.puede_ver_visita(i.visita_id)))
         with check (exists (select 1 from public.invitado i
                        where i.id = %I.invitado_id and public.puede_ver_visita(i.visita_id)))',
      t, t, t, t);
  end loop;
end $$;
