-- ============================================================================
-- 0021 · Reportes del administrador
-- ============================================================================
-- El prototipo "generaba" un reporte con un setTimeout de dos segundos que
-- devolvia los mismos parametros que habia recibido. No consultaba nada.
--
-- Aqui hay dos cosas distintas:
--
--   1. Las consultas que producen los datos, una por tipo de reporte. Devuelven
--      filas reales y respetan RLS: solo las emite quien administra.
--   2. El registro de la solicitud, porque un reporte lleva datos personales de
--      los residentes --quien entro, a que hora, a que unidad-- y quien lo pide
--      debe quedar asentado.
--
-- La exportacion a archivo y el envio automatico mensual NO estan aqui: ambos
-- necesitan el transporte de correo, que sigue sin proveedor contratado. Ver
-- la Edge Function `enviar-invitacion` y la nota de memoria del proyecto.
-- ============================================================================

create type public.tipo_reporte as enum (
  'visitantes',
  'correspondencia',
  'areas_comunes'
);

create table public.solicitud_reporte (
  id              uuid primary key default gen_random_uuid(),
  condominio_id   uuid not null references public.condominio(id) on delete cascade,
  tipo            public.tipo_reporte not null,
  desde           date,
  hasta           date,
  todo_historial  boolean not null default false,
  filas           integer,
  solicitada_por  uuid references auth.users(id) on delete set null default auth.uid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint solicitud_reporte_rango
    check (todo_historial or (desde is not null and hasta is not null)),
  constraint solicitud_reporte_rango_coherente
    check (desde is null or hasta is null or hasta >= desde)
);

create index solicitud_reporte_condominio_idx
  on public.solicitud_reporte (condominio_id, created_at desc);

comment on table public.solicitud_reporte is
  'Quien pidio que reporte y con que rango. Un reporte lleva datos personales de los residentes: la solicitud tiene que quedar asentada.';

create trigger solicitud_reporte_tocar_updated_at
  before update on public.solicitud_reporte
  for each row execute function public.tocar_updated_at();

alter table public.solicitud_reporte enable row level security;

create policy solicitud_reporte_acceso on public.solicitud_reporte
  for all to authenticated
  using (public.es_admin_condominio(condominio_id))
  with check (public.es_admin_condominio(condominio_id));


-- ----------------------------------------------------------------------------
-- Visitantes y vehiculos
-- ----------------------------------------------------------------------------

create or replace function public.reporte_visitantes(
  p_condominio_id uuid,
  p_desde date default null,
  p_hasta date default null
)
returns table (
  fecha         date,
  unidad        text,
  tipo          text,
  visitante     text,
  documento     text,
  ingreso       timestamptz,
  salida        timestamptz,
  placas        text,
  registro      text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    v.fecha_desde,
    u.codigo,
    v.tipo::text,
    i.nombre,
    i.documento_numero,
    i.ingreso_en,
    i.salida_en,
    (select string_agg(ve.placa, ', ') from public.vehiculo_visita ve where ve.visita_id = v.id),
    coalesce(p.nombre || ' ' || p.apellido, v.autorizada_por_nombre)
  from public.visita v
  join public.invitado i on i.visita_id = v.id
  left join public.unidad u on u.id = v.unidad_id
  left join public.perfil p on p.id = v.registrada_por
  where v.condominio_id = p_condominio_id
    and v.deleted_at is null
    and public.es_admin_condominio(p_condominio_id)
    and (p_desde is null or v.fecha_desde >= p_desde)
    and (p_hasta is null or v.fecha_desde <= p_hasta)
  order by v.fecha_desde desc, u.codigo;
$$;


-- ----------------------------------------------------------------------------
-- Correspondencia
-- ----------------------------------------------------------------------------

create or replace function public.reporte_correspondencia(
  p_condominio_id uuid,
  p_desde date default null,
  p_hasta date default null
)
returns table (
  registrada    timestamptz,
  unidad        text,
  empresa       text,
  categoria     text,
  destinatario  text,
  estado        text,
  entregada     timestamptz,
  entregada_a   text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    c.registrada_en,
    u.codigo,
    c.empresa,
    c.categoria::text,
    c.destinatario_nombre,
    c.estado::text,
    c.entregada_en,
    c.entregada_a
  from public.correspondencia c
  left join public.unidad u on u.id = c.unidad_id
  where c.condominio_id = p_condominio_id
    and c.deleted_at is null
    and public.es_admin_condominio(p_condominio_id)
    and (p_desde is null or c.registrada_en::date >= p_desde)
    and (p_hasta is null or c.registrada_en::date <= p_hasta)
  order by c.registrada_en desc;
$$;


-- ----------------------------------------------------------------------------
-- Areas comunes
-- ----------------------------------------------------------------------------

create or replace function public.reporte_areas_comunes(
  p_condominio_id uuid,
  p_desde date default null,
  p_hasta date default null
)
returns table (
  fecha         date,
  zona          text,
  unidad        text,
  horario       text,
  estado        text,
  participantes bigint,
  resuelta_por  text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    r.fecha,
    z.nombre,
    u.codigo,
    to_char(r.hora_inicio, 'HH24:MI') || ' - ' || to_char(r.hora_fin, 'HH24:MI'),
    r.estado::text,
    (select count(*) from public.participante_reserva pr where pr.reserva_id = r.id),
    coalesce(p.nombre || ' ' || p.apellido, '')
  from public.reserva_zona r
  join public.zona_comun z on z.id = r.zona_id
  left join public.unidad u on u.id = r.unidad_id
  left join public.perfil p on p.id = r.resuelta_por
  where z.condominio_id = p_condominio_id
    and public.es_admin_condominio(p_condominio_id)
    and (p_desde is null or r.fecha >= p_desde)
    and (p_hasta is null or r.fecha <= p_hasta)
  order by r.fecha desc;
$$;
