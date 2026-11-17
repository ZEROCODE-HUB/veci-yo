-- El trabajador permanente de una vivienda (17/11/2026, aprobado por el
-- cliente): la empleada, el chofer. Al agregarlo se decide si se le da
-- usuario en la app:
--
--   · No: solo figura en el directorio de esa vivienda --la portería ve su
--     nombre, su oficio y su teléfono para llamarlo o anunciarle a alguien--.
--     No tiene cuenta.
--   · Sí: entra con su cuenta y SOLO contesta el intercomunicador de esa
--     vivienda (y, al contestar, autoriza de palabra la visita que anuncia la
--     portería). No ve visitas, correspondencia, zonas comunes, reservas,
--     cuadro de honor ni anuncios.
--
-- Por qué una tabla aparte y no un rol más de `membresia_unidad`: casi cien
-- funciones y varias políticas dan acceso a «quien tiene membresía activa en
-- la vivienda» (con la única excepción del huésped). Un rol nuevo ahí habría
-- entrado por todas esas puertas a la vez --avisos de paquetes, anuncios,
-- chat, votaciones, cuadro de honor-- y cerrarlas una a una es la forma de
-- dejarse alguna. Aquí es al revés: el trabajador no es miembro de nada, así
-- que la base no le deja ver nada, y lo único que se le abre a propósito es
-- el intercomunicador (`le_suena_la_llamada` y las tres que buscan a quién
-- le suena). Por lo mismo no cuenta como residente para votar ni para el
-- cuadro de honor: esas funciones miran `membresia_unidad`.
--
-- Solo aditiva: una tabla, funciones nuevas y cuatro funciones del
-- intercomunicador reescritas con su cuerpo de hoy más el trabajador.

-- ─── 1. La tabla ────────────────────────────────────────────────────────────

create table if not exists public.trabajador_de_la_vivienda (
  id uuid primary key default gen_random_uuid(),
  unidad_id uuid not null references public.unidad(id) on delete cascade,
  nombre text not null,
  oficio text,
  codigo_pais text,
  telefono text,
  con_app boolean not null default false,
  correo_invitado text,
  usuario_id uuid references auth.users(id) on delete set null,
  aceptado_en timestamptz,
  creado_por uuid references auth.users(id) on delete set null,
  dado_de_baja_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint trabajador_nombre_no_vacio check (btrim(nombre) <> ''),
  constraint trabajador_codigo_pais_es_iso2 check (codigo_pais is null or codigo_pais ~ '^[A-Z]{2}$'),
  -- Con app hace falta a quién invitar (o que ya tenga la cuenta puesta).
  constraint trabajador_con_app_tiene_a_quien check (
    not con_app or usuario_id is not null or nullif(btrim(coalesce(correo_invitado, '')), '') is not null
  ),
  -- Sin app no hay cuenta: es justo lo que se eligió.
  constraint trabajador_sin_app_sin_cuenta check (con_app or usuario_id is null)
);

comment on table public.trabajador_de_la_vivienda is
  'Trabajadores permanentes de una vivienda (17/11/2026): empleada, chofer. No son miembros de la vivienda: sin app solo figuran en su directorio; con app solo contestan su intercomunicador (le_suena_la_llamada). Se escribe por funciones (agregar_trabajador_de_la_vivienda, dar_de_baja_trabajador_de_la_vivienda, responder_mi_invitacion_de_trabajador).';
comment on column public.trabajador_de_la_vivienda.oficio is 'Qué hace: «Empleada doméstica», «Chofer». Texto libre, opcional.';
comment on column public.trabajador_de_la_vivienda.codigo_pais is 'País del teléfono (ISO 3166-1 alfa-2), como en el resto de teléfonos.';
comment on column public.trabajador_de_la_vivienda.telefono is 'Para que la portería lo llame por teléfono o le anuncie a alguien. Opcional.';
comment on column public.trabajador_de_la_vivienda.con_app is 'Si se le dio usuario en la app («¿Le das usuario en la app?»). Con app y sin usuario_id, la invitación está pendiente.';
comment on column public.trabajador_de_la_vivienda.correo_invitado is 'A qué correo se le ofreció la app. Solo sirve para que al entrar con ese correo (confirmado) vea la invitación; la identidad es usuario_id.';
comment on column public.trabajador_de_la_vivienda.usuario_id is 'Su cuenta, cuando aceptó. Con ella le suena el intercomunicador de esta vivienda y nada más.';
comment on column public.trabajador_de_la_vivienda.aceptado_en is 'Cuándo aceptó la invitación a la app.';
comment on column public.trabajador_de_la_vivienda.creado_por is 'Quién lo agregó a la vivienda.';
comment on column public.trabajador_de_la_vivienda.dado_de_baja_por is 'Quién lo dio de baja (deleted_at).';

create unique index if not exists trabajador_una_cuenta_por_vivienda
  on public.trabajador_de_la_vivienda (unidad_id, usuario_id)
  where usuario_id is not null and deleted_at is null;
create index if not exists trabajador_por_vivienda
  on public.trabajador_de_la_vivienda (unidad_id) where deleted_at is null;
create index if not exists trabajador_por_usuario
  on public.trabajador_de_la_vivienda (usuario_id) where usuario_id is not null and deleted_at is null;

drop trigger if exists trabajador_tocar_updated_at on public.trabajador_de_la_vivienda;
create trigger trabajador_tocar_updated_at before update on public.trabajador_de_la_vivienda
  for each row execute function public.tocar_updated_at();

alter table public.trabajador_de_la_vivienda enable row level security;

/*
  Lo leen quienes ya ven el personal permanente de la vivienda
  (`personal_permanente_de_la_vivienda`): la administración y la portería del
  edificio y los miembros de la vivienda (sin el huésped). Y el propio
  trabajador, su fila. Nadie escribe por la API: solo las funciones.
*/
drop policy if exists trabajador_lectura on public.trabajador_de_la_vivienda;
create policy trabajador_lectura on public.trabajador_de_la_vivienda
  for select to authenticated
  using (
    deleted_at is null and (
      usuario_id = auth.uid()
      or public.es_miembro_unidad(unidad_id)
      or public.es_admin_condominio(public.condominio_de_unidad(unidad_id))
      or public.es_personal_condominio(public.condominio_de_unidad(unidad_id))
    )
  );

-- ─── 2. Quién lo gestiona ───────────────────────────────────────────────────

/*
  Lo mismo que para agregar a alguien sin app (`agregar_persona_sin_app`):
  quien gestiona la vivienda, un rol al que el administrador de la app le deja
  invitar, o la administración del edificio.
*/
create or replace function public.gestiona_trabajadores_de(p_unidad_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select auth.uid() is not null and (
    public.puede_invitar_a_unidad(p_unidad_id)
    or public.puedo_en_la_vivienda(p_unidad_id, 'invitar_a_la_vivienda')
    or public.es_admin_condominio(public.condominio_de_unidad(p_unidad_id))
  );
$$;
comment on function public.gestiona_trabajadores_de(uuid) is
  'Si quien llama puede agregar o dar de baja trabajadores permanentes en esa vivienda: lo mismo que para agregar a alguien sin app.';
revoke execute on function public.gestiona_trabajadores_de(uuid) from public, anon;
grant execute on function public.gestiona_trabajadores_de(uuid) to authenticated, service_role;

-- ─── 3. Agregar y dar de baja ───────────────────────────────────────────────

create or replace function public.agregar_trabajador_de_la_vivienda(
  p_unidad_id uuid,
  p_nombre text,
  p_oficio text default null,
  p_codigo_pais text default null,
  p_telefono text default null,
  p_con_app boolean default false,
  p_correo text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_id uuid;
  v_nombre text := nullif(btrim(coalesce(p_nombre, '')), '');
  v_telefono text := nullif(btrim(coalesce(p_telefono, '')), '');
  v_correo text := lower(nullif(btrim(coalesce(p_correo, '')), ''));
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesion iniciada';
  end if;
  if not exists (select 1 from public.unidad u where u.id = p_unidad_id and u.deleted_at is null)
     or not public.gestiona_trabajadores_de(p_unidad_id) then
    raise exception 'No tienes permiso para agregar trabajadores a esta vivienda';
  end if;
  if v_nombre is null then
    raise exception 'Falta el nombre';
  end if;
  if coalesce(p_con_app, false) then
    if v_correo is null or v_correo !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' then
      raise exception 'Para darle usuario en la app hace falta su correo';
    end if;
    if exists (select 1 from public.trabajador_de_la_vivienda t
                where t.unidad_id = p_unidad_id and t.deleted_at is null
                  and lower(t.correo_invitado) = v_correo) then
      raise exception 'Ese correo ya está invitado como trabajador de esta vivienda';
    end if;
  end if;

  insert into public.trabajador_de_la_vivienda
    (unidad_id, nombre, oficio, codigo_pais, telefono, con_app, correo_invitado, creado_por)
  values
    (p_unidad_id, v_nombre, nullif(btrim(coalesce(p_oficio, '')), ''),
     case when v_telefono is null then null else upper(nullif(btrim(coalesce(p_codigo_pais, '')), '')) end,
     v_telefono, coalesce(p_con_app, false),
     case when coalesce(p_con_app, false) then v_correo end, auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;
comment on function public.agregar_trabajador_de_la_vivienda(uuid, text, text, text, text, boolean, text) is
  'Agrega un trabajador permanente a una vivienda (17/11/2026). Sin app solo figura en el directorio; con app queda invitado a ese correo y, al aceptar, solo contesta el intercomunicador. Quien gestiona la vivienda o la administración.';
revoke execute on function public.agregar_trabajador_de_la_vivienda(uuid, text, text, text, text, boolean, text) from public, anon;
grant execute on function public.agregar_trabajador_de_la_vivienda(uuid, text, text, text, text, boolean, text) to authenticated, service_role;

create or replace function public.dar_de_baja_trabajador_de_la_vivienda(p_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_unidad uuid;
begin
  select t.unidad_id into v_unidad
    from public.trabajador_de_la_vivienda t
   where t.id = p_id and t.deleted_at is null;
  -- Uno que no existe y uno de otra vivienda responden lo mismo.
  if v_unidad is null or not public.gestiona_trabajadores_de(v_unidad) then
    raise exception 'No tienes permiso para dar de baja a ese trabajador';
  end if;
  update public.trabajador_de_la_vivienda
     set deleted_at = now(), dado_de_baja_por = auth.uid()
   where id = p_id;
end;
$$;
comment on function public.dar_de_baja_trabajador_de_la_vivienda(uuid) is
  'Da de baja a un trabajador permanente: deja de figurar en el directorio y, si tenía app, deja de sonarle el intercomunicador.';
revoke execute on function public.dar_de_baja_trabajador_de_la_vivienda(uuid) from public, anon;
grant execute on function public.dar_de_baja_trabajador_de_la_vivienda(uuid) to authenticated, service_role;

-- ─── 4. Leerlos ─────────────────────────────────────────────────────────────

create or replace function public.trabajadores_de_la_vivienda(p_unidad_id uuid)
returns table (
  id uuid,
  nombre text,
  oficio text,
  codigo_pais text,
  telefono text,
  con_app boolean,
  tiene_cuenta boolean,
  correo_invitado text
)
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_condominio uuid := public.condominio_de_unidad(p_unidad_id);
  v_gestiona boolean;
begin
  if v_condominio is null
     or not (public.es_admin_condominio(v_condominio)
             or public.es_personal_condominio(v_condominio)
             or public.es_miembro_unidad(p_unidad_id)) then
    raise exception 'Solo la administración, la portería y quienes viven ahí ven a los trabajadores de una vivienda';
  end if;
  -- El correo al que se invitó solo lo ve quien lo puede cambiar.
  v_gestiona := public.gestiona_trabajadores_de(p_unidad_id);

  return query
  select t.id, t.nombre, t.oficio, t.codigo_pais, t.telefono, t.con_app,
         t.usuario_id is not null,
         case when v_gestiona then t.correo_invitado end
    from public.trabajador_de_la_vivienda t
   where t.unidad_id = p_unidad_id and t.deleted_at is null
   order by t.nombre, t.created_at;
end;
$$;
comment on function public.trabajadores_de_la_vivienda(uuid) is
  'Los trabajadores permanentes de una vivienda, para su directorio: nombre, oficio, teléfono y si tienen la app. La administración y la portería del edificio y los miembros de la vivienda.';
revoke execute on function public.trabajadores_de_la_vivienda(uuid) from public, anon;
grant execute on function public.trabajadores_de_la_vivienda(uuid) to authenticated, service_role;

-- Las viviendas en que quien llama es trabajador con app: para su sesión.
-- La vivienda no se puede leer por la API (no es miembro), así que viene de aquí.
create or replace function public.mis_viviendas_de_trabajador()
returns table (
  trabajador_id uuid,
  unidad_id uuid,
  codigo text,
  torre_numero integer,
  condominio_id uuid,
  condominio text
)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select t.id, u.id, u.codigo, tr.numero::int, u.condominio_id, c.nombre
    from public.trabajador_de_la_vivienda t
    join public.unidad u on u.id = t.unidad_id and u.deleted_at is null
    join public.torre tr on tr.id = u.torre_id
    join public.condominio c on c.id = u.condominio_id
   where t.usuario_id = auth.uid() and t.deleted_at is null and t.con_app
   order by t.created_at;
$$;
comment on function public.mis_viviendas_de_trabajador() is
  'Las viviendas en que quien llama es trabajador permanente con app (17/11/2026). Solo lo necesario para la barra de arriba.';
revoke execute on function public.mis_viviendas_de_trabajador() from public, anon;
grant execute on function public.mis_viviendas_de_trabajador() to authenticated, service_role;

-- ─── 5. La invitación, en Inicio ────────────────────────────────────────────

/*
  Como `mis_invitaciones_de_la_vivienda`: la ve quien entró con ese correo ya
  confirmado. Se acepta con un toque.
*/
create or replace function public.mis_invitaciones_de_trabajador()
returns table (id uuid, condominio text, torre integer, unidad text, invitada_por text)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select t.id, c.nombre, tr.numero::int, u.codigo,
         nullif(btrim(coalesce(p.nombre, '') || ' ' || coalesce(p.apellido, '')), '')
    from public.trabajador_de_la_vivienda t
    join auth.users yo on yo.id = auth.uid() and yo.email_confirmed_at is not null
    join public.unidad u on u.id = t.unidad_id and u.deleted_at is null
    join public.torre tr on tr.id = u.torre_id
    join public.condominio c on c.id = u.condominio_id
    left join public.perfil p on p.id = t.creado_por
   where t.deleted_at is null
     and t.con_app
     and t.usuario_id is null
     and lower(t.correo_invitado) = lower(yo.email)
   order by t.created_at;
$$;
comment on function public.mis_invitaciones_de_trabajador() is
  'Las invitaciones a la app como trabajador permanente de quien llama (por su correo confirmado), para aceptarlas en Inicio.';
revoke execute on function public.mis_invitaciones_de_trabajador() from public, anon;
grant execute on function public.mis_invitaciones_de_trabajador() to authenticated, service_role;

create or replace function public.responder_mi_invitacion_de_trabajador(p_id uuid, p_acepta boolean)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_t public.trabajador_de_la_vivienda%rowtype;
  v_correo text;
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesion iniciada';
  end if;
  select lower(email) into v_correo from auth.users
   where id = auth.uid() and email_confirmed_at is not null;

  select * into v_t from public.trabajador_de_la_vivienda
   where id = p_id for update;
  if v_t.id is null or v_t.deleted_at is not null or not v_t.con_app
     or v_t.usuario_id is not null or v_correo is null
     or lower(v_t.correo_invitado) <> v_correo then
    raise exception 'Esa invitación ya no está disponible';
  end if;

  if coalesce(p_acepta, false) then
    if exists (select 1 from public.trabajador_de_la_vivienda t
                where t.unidad_id = v_t.unidad_id and t.usuario_id = auth.uid()
                  and t.deleted_at is null) then
      raise exception 'Ya eres trabajador de esa vivienda';
    end if;
    update public.trabajador_de_la_vivienda
       set usuario_id = auth.uid(), aceptado_en = now()
     where id = v_t.id;
  else
    -- Rechazar la app no lo saca de la vivienda: sigue en el directorio, sin app.
    update public.trabajador_de_la_vivienda
       set con_app = false, correo_invitado = null
     where id = v_t.id;
  end if;
end;
$$;
comment on function public.responder_mi_invitacion_de_trabajador(uuid, boolean) is
  'Acepta o rechaza la invitación a la app como trabajador permanente. Al rechazar sigue en el directorio de la vivienda, sin app.';
revoke execute on function public.responder_mi_invitacion_de_trabajador(uuid, boolean) from public, anon;
grant execute on function public.responder_mi_invitacion_de_trabajador(uuid, boolean) to authenticated, service_role;

-- ─── 6. Lo que puede cada rol, para el resumen al invitar ───────────────────

/*
  El resumen «Podrá / No podrá» del formulario de invitar sale de aquí para
  las tres acciones que se configuran por rol (`permiso_de_rol`), con la misma
  regla que aplica la base al guardar (`rol_puede`: la excepción del
  edificio, si no la general, si no sí). Así el resumen no puede decir otra
  cosa que la base.
*/
create or replace function public.permisos_de_los_roles_de_la_vivienda(p_condominio_id uuid)
returns table (rol public.rol_con_permisos, accion public.accion_de_rol, permitido boolean)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select r, a, public.rol_puede(p_condominio_id, r, a)
    from unnest(array['inquilino_lider', 'residente', 'corresidente', 'coadministrador_vivienda']::public.rol_con_permisos[]) r
   cross join unnest(array['registrar_visitas', 'reservar_zonas', 'invitar_a_la_vivienda']::public.accion_de_rol[]) a;
$$;
comment on function public.permisos_de_los_roles_de_la_vivienda(uuid) is
  'Qué puede cada rol de vivienda en ese edificio (registrar visitas, reservar zonas, invitar), con la regla de rol_puede. Para el resumen «Podrá / No podrá» al invitar. permiso_de_rol ya lo puede leer cualquiera con sesión.';
revoke execute on function public.permisos_de_los_roles_de_la_vivienda(uuid) from public, anon;
grant execute on function public.permisos_de_los_roles_de_la_vivienda(uuid) to authenticated, service_role;

-- ─── 7. El intercomunicador le suena al trabajador con app ──────────────────

/*
  `le_suena_la_llamada` con su cuerpo de hoy (20261109120000) y, en la rama de
  la vivienda, el trabajador con cuenta. Contestar, rechazar, el permiso de la
  sala de voz y la lectura de la llamada pasan todos por aquí.
*/
create or replace function public.le_suena_la_llamada(
  p_usuario_id uuid, p_destino public.destino_intercom, p_origen public.origen_intercom,
  p_condominio_id uuid, p_a_unidad_id uuid, p_quien_llama uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select public.quiere_llamadas_app(p_usuario_id) and (
    case p_destino
      when 'porteria' then
        (exists (
          select 1 from public.membresia_condominio mc
          where mc.condominio_id = p_condominio_id and mc.usuario_id = p_usuario_id
            and mc.rol = 'guardia' and mc.activo and (mc.permisos ->> 'llamadas') = 'true'
        )
        -- Solo de turno (30/10/2026).
        and public.guardia_atiende_ahora(p_condominio_id, p_usuario_id))
        -- Sin otro en portería que conteste, la administración. Salvo que
        -- quien llame sea la propia administración.
        or (p_origen is distinct from 'administracion'
            and public.porteria_sin_otro_que_conteste(p_condominio_id, p_quien_llama)
            and exists (
              select 1 from public.membresia_condominio mc
              where mc.condominio_id = p_condominio_id and mc.usuario_id = p_usuario_id
                and mc.rol in ('administrador', 'coadministrador') and mc.activo
            ))
      when 'administracion' then
        exists (
          select 1 from public.membresia_condominio mc
          where mc.condominio_id = p_condominio_id and mc.usuario_id = p_usuario_id
            and mc.rol in ('administrador', 'coadministrador') and mc.activo
        )
      when 'vivienda' then
        exists (
          select 1 from public.membresia_unidad m
          where m.unidad_id = p_a_unidad_id and m.usuario_id = p_usuario_id and m.activo
            and (m.rol <> 'huesped_temporal'
                 or ((m.vigente_desde is null or m.vigente_desde <= public.hoy_en_la_unidad(p_a_unidad_id))
                     and (m.vigente_hasta is null or m.vigente_hasta >= public.hoy_en_la_unidad(p_a_unidad_id))))
        )
        -- El trabajador permanente con app (17/11/2026): contesta y autoriza
        -- de palabra la visita que anuncia la portería.
        or exists (
          select 1 from public.trabajador_de_la_vivienda t
          where t.unidad_id = p_a_unidad_id and t.usuario_id = p_usuario_id
            and t.con_app and t.deleted_at is null
        )
      else false
    end
  );
$$;

-- A quién buscar al llamar a una vivienda: sus miembros y sus trabajadores con app.
create or replace function public.quienes_reciben_la_llamada(p_llamada_id uuid)
returns table (usuario_id uuid)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select distinct gente.usuario_id
  from public.llamada_internet l
  cross join lateral (
    select mc.usuario_id from public.membresia_condominio mc
    where mc.condominio_id = l.condominio_id and mc.activo and mc.usuario_id is not null
    union
    select m.usuario_id from public.membresia_unidad m
    where l.destino = 'vivienda' and m.unidad_id = l.a_unidad_id and m.activo
    union
    select t.usuario_id from public.trabajador_de_la_vivienda t
    where l.destino = 'vivienda' and t.unidad_id = l.a_unidad_id
      and t.usuario_id is not null and t.deleted_at is null
  ) gente
  where l.id = p_llamada_id
    and gente.usuario_id is distinct from l.de_usuario_id
    and public.le_suena_la_llamada(gente.usuario_id, l.destino, l.origen, l.condominio_id,
                                   l.a_unidad_id, l.de_usuario_id);
$$;

create or replace function public.se_puede_llamar_por_la_app(
  p_destino public.destino_intercom, p_condominio_id uuid,
  p_a_unidad_id uuid default null, p_desde_unidad_id uuid default null)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  with yo as (
    select case
             when p_desde_unidad_id is not null
                  and (public.es_miembro_unidad(p_desde_unidad_id)
                       or public.es_huesped_alojado(p_desde_unidad_id))
               then 'vivienda'::public.origen_intercom
             when p_desde_unidad_id is null and p_destino <> 'administracion'
                  and public.es_admin_condominio(p_condominio_id)
               then 'administracion'::public.origen_intercom
             when p_desde_unidad_id is null and p_destino <> 'porteria'
                  and public.porteria_puede_llamar(p_condominio_id)
               then 'porteria'::public.origen_intercom
           end as origen
  )
  select coalesce((select origen from yo) is not null, false)
    and exists (
      select 1 from (
        select mc.usuario_id from public.membresia_condominio mc
        where mc.condominio_id = p_condominio_id and mc.activo and mc.usuario_id is not null
        union
        select m.usuario_id from public.membresia_unidad m
        where p_destino = 'vivienda' and m.unidad_id = p_a_unidad_id and m.activo
        union
        select t.usuario_id from public.trabajador_de_la_vivienda t
        where p_destino = 'vivienda' and t.unidad_id = p_a_unidad_id
          and t.usuario_id is not null and t.deleted_at is null
      ) gente
      where gente.usuario_id is distinct from auth.uid()
        and public.le_suena_la_llamada(gente.usuario_id, p_destino, (select origen from yo),
                                       p_condominio_id,
                                       case when p_destino = 'vivienda' then p_a_unidad_id end,
                                       auth.uid())
    );
$$;

create or replace function public.llamar_por_internet(
  p_destino public.destino_intercom, p_a_unidad_id uuid default null,
  p_desde_unidad_id uuid default null, p_condominio_id uuid default null)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_condominio uuid;
  v_origen     public.origen_intercom;
  v_id         uuid;
begin
  if p_desde_unidad_id is not null then
    -- Desde una vivienda: quien vive ahí o el huésped que está dentro hoy.
    -- El trabajador no: él contesta, no llama (17/11/2026).
    if not (public.es_miembro_unidad(p_desde_unidad_id)
            or public.es_huesped_alojado(p_desde_unidad_id)) then
      raise exception 'Solo se llama desde una vivienda tuya';
    end if;
    if p_destino = 'vivienda' then
      raise exception 'Desde una vivienda se llama a la portería o a la administración';
    end if;
    v_condominio := public.condominio_de_unidad(p_desde_unidad_id);
    v_origen := 'vivienda';
  else
    v_condominio := coalesce(p_condominio_id, public.condominio_de_unidad(p_a_unidad_id));
    if v_condominio is null then
      raise exception 'Falta a quién llamas';
    end if;
    if p_destino <> 'administracion' and public.es_admin_condominio(v_condominio) then
      v_origen := 'administracion';
    elsif p_destino <> 'porteria' and public.porteria_puede_llamar(v_condominio) then
      v_origen := 'porteria';
    elsif public.es_personal_condominio(v_condominio) then
      raise exception 'La administracion no te habilito las llamadas';
    else
      raise exception 'No puedes llamar a ese destino desde aquí';
    end if;
  end if;

  if p_destino = 'vivienda' then
    if p_a_unidad_id is null then
      raise exception 'Falta la vivienda a la que llamas';
    end if;
    if public.condominio_de_unidad(p_a_unidad_id) is distinct from v_condominio then
      raise exception 'Esa vivienda no es de tu edificio';
    end if;
  end if;

  if not exists (
    select 1 from (
      select mc.usuario_id from public.membresia_condominio mc
      where mc.condominio_id = v_condominio and mc.activo and mc.usuario_id is not null
      union
      select m.usuario_id from public.membresia_unidad m
      where p_destino = 'vivienda' and m.unidad_id = p_a_unidad_id and m.activo
      union
      select t.usuario_id from public.trabajador_de_la_vivienda t
      where p_destino = 'vivienda' and t.unidad_id = p_a_unidad_id
        and t.usuario_id is not null and t.deleted_at is null
    ) gente
    where gente.usuario_id is distinct from auth.uid()
      and public.le_suena_la_llamada(gente.usuario_id, p_destino, v_origen, v_condominio,
                                     case when p_destino = 'vivienda' then p_a_unidad_id end,
                                     auth.uid())
  ) then
    raise exception 'Nadie recibe llamadas por la app ahí: llama por teléfono'
      using errcode = 'P0001';
  end if;

  insert into public.llamada_internet
    (condominio_id, de_usuario_id, de_unidad_id, destino, a_unidad_id, origen)
  values (v_condominio, auth.uid(), p_desde_unidad_id, p_destino,
          case when p_destino = 'vivienda' then p_a_unidad_id end, v_origen)
  returning id into v_id;
  return v_id;
end;
$$;
