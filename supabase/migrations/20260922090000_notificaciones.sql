-- ----------------------------------------------------------------------------
-- Notificaciones
-- ----------------------------------------------------------------------------
-- Eran doce objetos fijos en un store de Zustand, agrupados por rol y con el
-- estado `leida` en memoria: se perdía al recargar y era el mismo para todos
-- los usuarios de ese rol. Tres problemas que el modelo tiene que resolver:
--
-- 1. La notificación es de una persona, no de un rol. "Tienes un paquete en
--    portería" no le corresponde a todos los propietarios del edificio.
-- 2. `leida` tiene que sobrevivir a la sesión y ser por persona.
-- 3. Tiene que poder llevar a algún sitio. Una notificación de correspondencia
--    sin el id del paquete obliga a buscarlo a mano.
--
-- Las notificaciones no se escriben desde la app: las generan los disparadores
-- de los hechos que las provocan, más abajo. Si las escribiera el cliente,
-- dependerían de que la pantalla que causó el hecho estuviera abierta.

-- `tipo_notificacion` ya está tomado: es cómo avisar de una visita
-- ('solo_notificar' / 'notificar_y_anunciar'). Este enum dice por qué se
-- notifica, que es otra cosa.
create type public.motivo_notificacion as enum (
  'correspondencia_recibida',
  'correspondencia_entregada',
  'visita_ingreso',
  'reserva_aprobada',
  'reserva_rechazada',
  'anuncio_publicado',
  'reconocimiento_recibido'
);

create table public.notificacion (
  id              uuid primary key default gen_random_uuid(),
  usuario_id      uuid not null references auth.users(id) on delete cascade,
  condominio_id   uuid not null references public.condominio(id) on delete cascade,
  tipo            public.motivo_notificacion not null,
  titulo          text not null,
  mensaje         text not null,

  -- A dónde lleva al tocarla. `entidad_tipo` es el nombre de la tabla; no es
  -- una FK porque apunta a tablas distintas según el tipo.
  entidad_tipo    text,
  entidad_id      uuid,

  leida_en        timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint notificacion_entidad_completa
    check ((entidad_tipo is null) = (entidad_id is null))
);

comment on column public.notificacion.leida_en is
  'Momento en que esa persona la leyó. Reemplaza al booleano `leida` compartido por rol.';

create index notificacion_bandeja_idx
  on public.notificacion (usuario_id, created_at desc);

-- Para el contador de la campana, que solo cuenta las no leídas.
create index notificacion_sin_leer_idx
  on public.notificacion (usuario_id) where leida_en is null;

create trigger notificacion_tocar_updated_at
  before update on public.notificacion
  for each row execute function public.tocar_updated_at();


-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
-- Cada quien ve y marca las suyas, nada más. Ni siquiera el administrador lee
-- la bandeja ajena: el contenido incluye movimientos de visitas y paquetes.

alter table public.notificacion enable row level security;

create policy notificacion_propia_lectura on public.notificacion
  for select to authenticated using (usuario_id = auth.uid());

create policy notificacion_propia_marcado on public.notificacion
  for update to authenticated
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

comment on policy notificacion_propia_lectura on public.notificacion is
  'La bandeja es privada. No hay política de insert: las escriben los disparadores, que corren como definidores.';


-- ----------------------------------------------------------------------------
-- Función de reparto
-- ----------------------------------------------------------------------------
-- Casi todas las notificaciones van "a la unidad": a todas las personas con
-- cuenta y acceso que viven o responden por ella.

create or replace function public.notificar_unidad(
  p_unidad_id     uuid,
  p_tipo          public.motivo_notificacion,
  p_titulo        text,
  p_mensaje       text,
  p_entidad_tipo  text default null,
  p_entidad_id    uuid default null,
  p_excepto       uuid default null
)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into public.notificacion
    (usuario_id, condominio_id, tipo, titulo, mensaje, entidad_tipo, entidad_id)
  select distinct m.usuario_id, u.condominio_id, p_tipo, p_titulo, p_mensaje,
         p_entidad_tipo, p_entidad_id
  from public.membresia_unidad m
  join public.unidad u on u.id = m.unidad_id
  where m.unidad_id = p_unidad_id
    and m.activo
    and m.puede_acceder
    and m.usuario_id is not null
    and (p_excepto is null or m.usuario_id <> p_excepto);
$$;

comment on function public.notificar_unidad is
  'Reparte una notificación a los miembros con cuenta de una unidad. `p_excepto` evita avisar a quien provocó el hecho.';


-- ----------------------------------------------------------------------------
-- Disparadores
-- ----------------------------------------------------------------------------

-- Correspondencia: al pasar a recibido y al entregarse.
create or replace function public.notificar_correspondencia()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.estado = 'en_porteria' and old.estado is distinct from 'en_porteria' then
    perform public.notificar_unidad(
      new.unidad_id, 'correspondencia_recibida',
      'Correspondencia recibida',
      coalesce(new.empresa, 'Un paquete') || ' llegó a portería.',
      'correspondencia', new.id, new.recibida_por);

  elsif new.estado = 'entregado' and old.estado is distinct from 'entregado' then
    perform public.notificar_unidad(
      new.unidad_id, 'correspondencia_entregada',
      'Correspondencia entregada',
      'Se entregó el envío' ||
        coalesce(' a ' || new.entregada_a, '') || '.',
      'correspondencia', new.id, null);
  end if;
  return new;
end;
$$;

create trigger correspondencia_notificar
  after update on public.correspondencia
  for each row execute function public.notificar_correspondencia();


-- Reservas: cuando la administración las resuelve.
create or replace function public.notificar_reserva()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_zona text;
begin
  if new.estado = old.estado then
    return new;
  end if;

  select z.nombre into v_zona
  from public.zona_comun z where z.id = new.zona_id;

  if new.estado = 'aprobada' then
    perform public.notificar_unidad(
      new.unidad_id, 'reserva_aprobada',
      'Reserva confirmada',
      'Tu reserva de ' || coalesce(v_zona, 'la zona común') ||
        ' para el ' || to_char(new.fecha, 'DD/MM/YYYY') || ' fue aprobada.',
      'reserva_zona', new.id, new.resuelta_por);

  elsif new.estado = 'rechazada' then
    perform public.notificar_unidad(
      new.unidad_id, 'reserva_rechazada',
      'Reserva rechazada',
      'Tu reserva de ' || coalesce(v_zona, 'la zona común') ||
        ' para el ' || to_char(new.fecha, 'DD/MM/YYYY') || ' fue rechazada.' ||
        coalesce(' Motivo: ' || new.motivo_rechazo, ''),
      'reserva_zona', new.id, new.resuelta_por);
  end if;
  return new;
end;
$$;

create trigger reserva_zona_notificar
  after update on public.reserva_zona
  for each row execute function public.notificar_reserva();


-- Reconocimientos: a quien lo recibe.
create or replace function public.notificar_reconocimiento()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_insignia text;
begin
  select i.etiqueta into v_insignia
  from public.insignia i where i.id = new.insignia_id;

  insert into public.notificacion
    (usuario_id, condominio_id, tipo, titulo, mensaje, entidad_tipo, entidad_id)
  values (new.usuario_id, new.condominio_id, 'reconocimiento_recibido',
          'Recibiste un reconocimiento',
          'Un vecino te reconoció como "' || coalesce(v_insignia, 'buen vecino') || '".',
          'reconocimiento', new.id);
  return new;
end;
$$;

comment on function public.notificar_reconocimiento is
  'No dice quién lo otorgó: el reconocimiento entre vecinos no se firma de cara al destinatario.';

create trigger reconocimiento_notificar
  after insert on public.reconocimiento
  for each row execute function public.notificar_reconocimiento();


-- Ingreso de una visita: avisa a la unidad que la esperaba.
create or replace function public.notificar_ingreso_invitado()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_unidad uuid;
begin
  if new.ingreso_en is null or old.ingreso_en is not null then
    return new;
  end if;

  select v.unidad_id into v_unidad
  from public.visita v where v.id = new.visita_id;

  -- Las visitas a la administración no tienen unidad a la que avisar.
  if v_unidad is null then
    return new;
  end if;

  perform public.notificar_unidad(
    v_unidad, 'visita_ingreso',
    'Tu visita ingresó',
    new.nombre || ' ingresó al condominio.',
    'visita', new.visita_id, null);
  return new;
end;
$$;

create trigger invitado_notificar_ingreso
  after update on public.invitado
  for each row execute function public.notificar_ingreso_invitado();
