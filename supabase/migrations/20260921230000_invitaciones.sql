-- ============================================================================
-- 0009 · Invitaciones: como una persona obtiene su primera membresia
-- ============================================================================
-- Hasta ahora las membresias solo podian insertarse a mano. Este es el camino
-- real: alguien con autoridad invita por correo, la persona se registra, y al
-- aceptar se crea su membresia.
--
-- Reemplaza dos conceptos sueltos del prototipo que hacian lo mismo a medias:
-- `PropietarioInvited` (invitacion a una unidad) y los campos `estado` /
-- `fechaInvitacion` de `Coadministrador` (invitacion a nivel condominio).
--
-- El punto delicado es que quien acepta TODAVIA NO TIENE membresia, asi que no
-- puede leer la invitacion ni insertarse a si mismo: las politicas RLS se lo
-- impedirian, y aflojarlas abriria un agujero. Por eso aceptar es una funcion
-- SECURITY DEFINER con verificaciones explicitas, no un INSERT del cliente.
-- ============================================================================


create type public.estado_invitacion as enum (
  'pendiente',
  'aceptada',
  'rechazada',
  'revocada',
  'expirada'
);

create type public.ambito_invitacion as enum (
  'condominio',   -- administrador, coadministrador, guardia
  'unidad'        -- propietario, inquilino lider, residente, corresidente
);


-- ----------------------------------------------------------------------------
-- invitacion
-- ----------------------------------------------------------------------------

create table public.invitacion (
  id                uuid primary key default gen_random_uuid(),
  condominio_id     uuid not null references public.condominio(id) on delete cascade,
  ambito            public.ambito_invitacion not null,

  -- Segun el ambito se usa uno u otro rol. El CHECK impide estados imposibles,
  -- como una invitacion de unidad sin unidad o con rol de condominio.
  unidad_id         uuid references public.unidad(id) on delete cascade,
  rol_condominio    public.rol_condominio,
  rol_unidad        public.rol_unidad,

  correo            text not null,
  nombre            text not null,

  -- Secreto de un solo uso. Se guarda el hash, nunca el token en claro: quien
  -- tenga acceso de lectura a la tabla no debe poder aceptar invitaciones ajenas.
  token_hash        text not null,

  estado            public.estado_invitacion not null default 'pendiente',
  expira_en         timestamptz not null default (now() + interval '14 days'),

  invitada_por      uuid references auth.users(id) on delete set null,
  enviada_en        timestamptz,          -- null = todavia no se envio el correo
  aceptada_por      uuid references auth.users(id) on delete set null,
  aceptada_en       timestamptz,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint invitacion_token_unico unique (token_hash),

  constraint invitacion_ambito_coherente check (
    (ambito = 'unidad'
       and unidad_id is not null
       and rol_unidad is not null
       and rol_condominio is null)
    or
    (ambito = 'condominio'
       and unidad_id is null
       and rol_condominio is not null
       and rol_unidad is null)
  ),

  constraint invitacion_aceptada_con_actor check (
    estado <> 'aceptada' or (aceptada_por is not null and aceptada_en is not null)
  )
);

create index invitacion_correo_idx      on public.invitacion (lower(correo)) where estado = 'pendiente';
create index invitacion_condominio_idx  on public.invitacion (condominio_id, estado);
create index invitacion_unidad_idx      on public.invitacion (unidad_id);

comment on column public.invitacion.token_hash is
  'SHA-256 del token. El token en claro solo existe en el correo que recibe la persona invitada.';


-- ----------------------------------------------------------------------------
-- Quien puede invitar a que
-- ----------------------------------------------------------------------------

create or replace function public.puede_invitar_a_unidad(p_unidad_id uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    -- El propietario o el inquilino lider de la unidad gestionan a su gente.
    select 1 from public.membresia_unidad mu
    where mu.unidad_id = p_unidad_id
      and mu.usuario_id = auth.uid()
      and mu.activo
      and mu.rol in ('propietario', 'inquilino_lider')
  ) or public.es_admin_condominio(public.condominio_de_unidad(p_unidad_id));
$$;

comment on function public.puede_invitar_a_unidad is
  'Solo propietario e inquilino lider gestionan usuarios de su unidad; la administracion del condominio tambien, porque es quien da de alta al propietario inicial.';


-- ----------------------------------------------------------------------------
-- crear_invitacion
-- ----------------------------------------------------------------------------
-- Devuelve el token EN CLARO una sola vez: es lo unico que hay que poner en el
-- correo. No vuelve a estar disponible.
--
-- PENDIENTE (ver memoria del proyecto): mientras el envio de correo este
-- desactivado, la app muestra este token para poder recorrer el flujo. Cuando
-- se active el envio real, el token debe dejar de salir de aqui hacia la UI.

create or replace function public.crear_invitacion(
  p_condominio_id   uuid,
  p_ambito          public.ambito_invitacion,
  p_correo          text,
  p_nombre          text,
  p_unidad_id       uuid default null,
  p_rol_unidad      public.rol_unidad default null,
  p_rol_condominio  public.rol_condominio default null
)
returns table (invitacion_id uuid, token text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_token text;
  v_id uuid;
  v_correo text := lower(trim(p_correo));
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesion iniciada';
  end if;

  if p_ambito = 'unidad' then
    if not public.puede_invitar_a_unidad(p_unidad_id) then
      raise exception 'No tenes permiso para invitar a esta unidad';
    end if;
  else
    if not public.es_admin_condominio(p_condominio_id) then
      raise exception 'Solo la administracion del condominio puede invitar a estos roles';
    end if;
  end if;

  -- Una sola invitacion pendiente por correo y destino.
  update public.invitacion
     set estado = 'revocada', updated_at = now()
   where lower(correo) = v_correo
     and estado = 'pendiente'
     and condominio_id = p_condominio_id
     and unidad_id is not distinct from p_unidad_id;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.invitacion (
    condominio_id, ambito, unidad_id, rol_unidad, rol_condominio,
    correo, nombre, token_hash, invitada_por
  ) values (
    p_condominio_id, p_ambito, p_unidad_id, p_rol_unidad, p_rol_condominio,
    v_correo, p_nombre, encode(extensions.digest(v_token, 'sha256'), 'hex'), auth.uid()
  )
  returning id into v_id;

  return query select v_id, v_token;
end;
$$;


-- ----------------------------------------------------------------------------
-- consultar_invitacion
-- ----------------------------------------------------------------------------
-- Permite a la app mostrar "te invitaron a la unidad 101 como propietario"
-- ANTES de que la persona acepte, sin exponer nada mas.

create or replace function public.consultar_invitacion(p_token text)
returns table (
  condominio        text,
  unidad            text,
  rol               text,
  correo            text,
  nombre            text,
  expira_en         timestamptz,
  vigente           boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    c.nombre,
    u.codigo,
    coalesce(i.rol_unidad::text, i.rol_condominio::text),
    i.correo,
    i.nombre,
    i.expira_en,
    (i.estado = 'pendiente' and i.expira_en > now())
  from public.invitacion i
  join public.condominio c on c.id = i.condominio_id
  left join public.unidad u on u.id = i.unidad_id
  where i.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
$$;


-- ----------------------------------------------------------------------------
-- aceptar_invitacion
-- ----------------------------------------------------------------------------
-- El corazon del flujo. Verifica, crea la membresia y marca la invitacion, todo
-- en una transaccion.

create or replace function public.aceptar_invitacion(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_inv public.invitacion%rowtype;
  v_correo_usuario text;
  v_membresia_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesion iniciada para aceptar la invitacion';
  end if;

  select * into v_inv
  from public.invitacion
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
  for update;

  if not found then
    raise exception 'La invitacion no existe';
  end if;

  if v_inv.estado <> 'pendiente' then
    raise exception 'Esta invitacion ya no esta disponible';
  end if;

  if v_inv.expira_en <= now() then
    update public.invitacion set estado = 'expirada', updated_at = now() where id = v_inv.id;
    raise exception 'La invitacion vencio';
  end if;

  -- La invitacion es para una persona concreta, no para quien tenga el enlace.
  select lower(email) into v_correo_usuario from auth.users where id = auth.uid();
  if v_correo_usuario is distinct from lower(v_inv.correo) then
    raise exception 'Esta invitacion fue emitida para otro correo';
  end if;

  if v_inv.ambito = 'unidad' then
    insert into public.membresia_unidad (unidad_id, usuario_id, nombre, rol)
    values (v_inv.unidad_id, auth.uid(), v_inv.nombre, v_inv.rol_unidad)
    returning id into v_membresia_id;

    update public.unidad
       set estado = 'aceptado', updated_at = now()
     where id = v_inv.unidad_id and estado in ('disponible', 'invitado');
  else
    insert into public.membresia_condominio (condominio_id, usuario_id, rol)
    values (v_inv.condominio_id, auth.uid(), v_inv.rol_condominio)
    on conflict (condominio_id, usuario_id, rol) do update set activo = true
    returning id into v_membresia_id;
  end if;

  update public.invitacion
     set estado = 'aceptada',
         aceptada_por = auth.uid(),
         aceptada_en = now(),
         updated_at = now()
   where id = v_inv.id;

  return v_membresia_id;
end;
$$;


-- ----------------------------------------------------------------------------
-- rechazar_invitacion
-- ----------------------------------------------------------------------------

create or replace function public.rechazar_invitacion(p_token text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_correo_usuario text;
  v_inv public.invitacion%rowtype;
begin
  select * into v_inv from public.invitacion
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex') for update;

  if not found or v_inv.estado <> 'pendiente' then
    return;
  end if;

  select lower(email) into v_correo_usuario from auth.users where id = auth.uid();
  if v_correo_usuario is distinct from lower(v_inv.correo) then
    raise exception 'Esta invitacion fue emitida para otro correo';
  end if;

  update public.invitacion
     set estado = 'rechazada', updated_at = now()
   where id = v_inv.id;
end;
$$;


-- ----------------------------------------------------------------------------
-- Disparador y RLS
-- ----------------------------------------------------------------------------

create trigger invitacion_tocar_updated_at
  before update on public.invitacion
  for each row execute function public.tocar_updated_at();

alter table public.invitacion enable row level security;

-- Las invitaciones las ve quien las emitio o quien administra el destino.
-- La persona invitada NO lee esta tabla: llega por token y usa las funciones.
create policy invitacion_lectura on public.invitacion
  for select to authenticated
  using (
    invitada_por = auth.uid()
    or public.es_admin_condominio(condominio_id)
    or (unidad_id is not null and public.puede_invitar_a_unidad(unidad_id))
  );

-- La creacion pasa por crear_invitacion(), que genera el token. Un INSERT
-- directo dejaria una invitacion sin token utilizable.
create policy invitacion_revocacion on public.invitacion
  for update to authenticated
  using (
    invitada_por = auth.uid()
    or public.es_admin_condominio(condominio_id)
    or (unidad_id is not null and public.puede_invitar_a_unidad(unidad_id))
  )
  with check (
    invitada_por = auth.uid()
    or public.es_admin_condominio(condominio_id)
    or (unidad_id is not null and public.puede_invitar_a_unidad(unidad_id))
  );

comment on table public.invitacion is
  'El token en claro nunca se guarda ni se expone por RLS: quien acepta llega con el token del correo y pasa por aceptar_invitacion().';
