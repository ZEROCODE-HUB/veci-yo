-- ============================================================================
-- Lo que puede el profesional permanente con cuenta (18/11/2026, pedido del
-- cliente)
-- ============================================================================
-- Al registrarlo desde Visitas › Profesional permanente, quien gestiona la
-- vivienda decide dos cosas:
--   · «Puede contestar el citófono» (`puede_contestar_citofono`): le suena el
--     intercomunicador de la vivienda. Es lo que ya hacía todo trabajador con
--     app, así que los de antes quedan en sí.
--   · «Puede crear visitas» (`puede_crear_visitas`): anuncia visitas de amigos
--     y de profesionales temporales para esa vivienda, y ve las que él
--     registró. Nada más de la vivienda: sigue sin ser miembro.
-- Y queda unido a la visita permanente con que se registró (`visita_id`), para
-- que su ficha y su visita sean la misma persona.
--
-- Solo aditiva: columnas nuevas, una función nueva, dos políticas nuevas y
-- cinco funciones con su cuerpo de hoy más el permiso.

alter table public.trabajador_de_la_vivienda
  add column if not exists puede_contestar_citofono boolean not null default true,
  add column if not exists puede_crear_visitas boolean not null default false,
  add column if not exists visita_id uuid references public.visita(id) on delete set null;

comment on column public.trabajador_de_la_vivienda.puede_contestar_citofono is
  'Con app: le suena el intercomunicador de la vivienda y puede contestarlo (18/11/2026).';
comment on column public.trabajador_de_la_vivienda.puede_crear_visitas is
  'Con app: puede anunciar visitas (amigos, profesional temporal) para la vivienda y ve las que él registró (18/11/2026).';
comment on column public.trabajador_de_la_vivienda.visita_id is
  'La visita permanente con que se registró desde Visitas (18/11/2026), si la hay.';

-- ─── Quién es «profesional que crea visitas» ───────────────────────────────

create or replace function public.trabajador_registra_visitas(p_unidad_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select auth.uid() is not null and exists (
    select 1 from public.trabajador_de_la_vivienda t
    where t.unidad_id = p_unidad_id
      and t.usuario_id = auth.uid()
      and t.con_app and t.puede_crear_visitas
      and t.deleted_at is null
  );
$$;
comment on function public.trabajador_registra_visitas(uuid) is
  'Si quien llama es profesional permanente con app de esa vivienda y con permiso de crear visitas (18/11/2026).';
revoke execute on function public.trabajador_registra_visitas(uuid) from public, anon;
grant execute on function public.trabajador_registra_visitas(uuid) to authenticated, service_role;

-- ─── Crear y ver sus visitas ───────────────────────────────────────────────

-- Políticas aparte (se suman a las de siempre): amigos o profesional
-- temporal, programadas, a su nombre y para su vivienda.
drop policy if exists visita_alta_del_trabajador on public.visita;
create policy visita_alta_del_trabajador on public.visita
  for insert to authenticated
  with check (
    registrada_por = auth.uid()
    and unidad_id is not null
    and public.trabajador_registra_visitas(unidad_id)
    and public.condominio_de_unidad(unidad_id) = condominio_id
    and tipo in ('amigos', 'temporal')
    and estado = 'programada'
    and deleted_at is null
    and not coalesce(para_administracion, false)
  );

drop policy if exists visita_lectura_del_trabajador on public.visita;
create policy visita_lectura_del_trabajador on public.visita
  for select to authenticated
  using (
    registrada_por = auth.uid()
    and unidad_id is not null
    and public.trabajador_registra_visitas(unidad_id)
  );

-- Y las tablas hijas (invitados, vehículos) pasan por puede_ver_visita.

CREATE OR REPLACE FUNCTION public.puede_ver_visita(p_visita_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select exists (
    select 1 from public.visita v
    where v.id = p_visita_id
      and (
        (
          public.es_guardia_de_condominio(v.condominio_id)
          and public.visita_en_ventana_de_porteria(
                v.condominio_id, v.fecha_desde, v.fecha_hasta,
                v.estado, v.tipo, v.created_at, v.registrada_por)
        )
        or public.puede_coadmin(v.condominio_id, 'visualizarVisitas')
        /*
          `es_miembro_unidad` y no `puede_operar_unidad`, que era lo que habia:
          esa incluye a todo el personal del edificio, guardia incluido, asi
          que por aqui volvia a entrar sin fecha lo que la rama de arriba
          acaba de cerrar. Lo delato la prueba, no la lectura. El personal ya
          esta arriba; aqui quedan los de la vivienda.
        */
        or (v.unidad_id is not null and public.es_miembro_unidad(v.unidad_id))
        -- Lo suyo, y solo lo suyo: la visita que él registró.
        or (
          v.registrada_por = auth.uid()
          and v.unidad_id is not null
          and public.es_huesped_con_reserva(v.unidad_id)
        )
        -- El profesional permanente con permiso de crear visitas (18/11/2026):
        -- las que él registró, y nada más de la vivienda.
        or (
          v.registrada_por = auth.uid()
          and v.unidad_id is not null
          and public.trabajador_registra_visitas(v.unidad_id)
        )
      )
  );
$function$;

-- ─── El citófono, solo con permiso ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.le_suena_la_llamada(p_usuario_id uuid, p_destino destino_intercom, p_origen origen_intercom, p_condominio_id uuid, p_a_unidad_id uuid, p_quien_llama uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
            and t.con_app and t.puede_contestar_citofono and t.deleted_at is null
        )
      else false
    end
  );
$function$;

CREATE OR REPLACE FUNCTION public.llamar_a_quien(p_destino destino_intercom, p_a_usuario_id uuid DEFAULT NULL::uuid, p_a_unidad_id uuid DEFAULT NULL::uuid, p_desde_unidad_id uuid DEFAULT NULL::uuid, p_condominio_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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

  -- Una persona concreta, solo dentro de una vivienda.
  if p_a_usuario_id is not null and p_destino <> 'vivienda' then
    raise exception 'Solo se elige a una persona al llamar a una vivienda';
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
        and t.usuario_id is not null and t.con_app and t.puede_contestar_citofono and t.deleted_at is null
    ) gente
    where gente.usuario_id is distinct from auth.uid()
      and (p_a_usuario_id is null or gente.usuario_id = p_a_usuario_id)
      and public.le_suena_la_llamada(gente.usuario_id, p_destino, v_origen, v_condominio,
                                     case when p_destino = 'vivienda' then p_a_unidad_id end,
                                     auth.uid())
  ) then
    if p_a_usuario_id is not null then
      raise exception 'Esa persona no recibe llamadas por la app: elige «Todos» o llama por teléfono'
        using errcode = 'P0001';
    end if;
    raise exception 'Nadie recibe llamadas por la app ahí: llama por teléfono'
      using errcode = 'P0001';
  end if;

  insert into public.llamada_internet
    (condominio_id, de_usuario_id, de_unidad_id, destino, a_unidad_id, origen, a_usuario_id)
  values (v_condominio, auth.uid(), p_desde_unidad_id, p_destino,
          case when p_destino = 'vivienda' then p_a_unidad_id end, v_origen, p_a_usuario_id)
  returning id into v_id;
  return v_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.quienes_reciben_la_llamada(p_llamada_id uuid)
 RETURNS TABLE(usuario_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
      and t.usuario_id is not null and t.con_app and t.puede_contestar_citofono and t.deleted_at is null
  ) gente
  where l.id = p_llamada_id
    and gente.usuario_id is distinct from l.de_usuario_id
    -- Si se eligió a una persona, solo a ella (17/11/2026).
    and (l.a_usuario_id is null or gente.usuario_id = l.a_usuario_id)
    and public.le_suena_la_llamada(gente.usuario_id, l.destino, l.origen, l.condominio_id,
                                   l.a_unidad_id, l.de_usuario_id);
$function$;

CREATE OR REPLACE FUNCTION public.se_puede_llamar_por_la_app(p_destino destino_intercom, p_condominio_id uuid, p_a_unidad_id uuid DEFAULT NULL::uuid, p_desde_unidad_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
          and t.usuario_id is not null and t.con_app and t.puede_contestar_citofono and t.deleted_at is null
      ) gente
      where gente.usuario_id is distinct from auth.uid()
        and public.le_suena_la_llamada(gente.usuario_id, p_destino, (select origen from yo),
                                       p_condominio_id,
                                       case when p_destino = 'vivienda' then p_a_unidad_id end,
                                       auth.uid())
    );
$function$;

-- ─── Agregarlo con sus permisos, y que le llegue el acceso ────────────────

/*
  La misma función con tres parámetros más, todos con valor por defecto: las
  versiones instaladas la siguen llamando igual. Se borra la de siete para que
  no haya dos y Postgres no sepa cuál elegir.

  Con app, le manda el correo «Tienes acceso a una vivienda» (como al
  propietario): que se descargue Veciyo y entre con ese correo, y verá la
  invitación en Inicio. Antes no le llegaba nada (pedido del cliente,
  18/11/2026). Con el mismo interruptor que las demás invitaciones
  (`invitaciones_por_correo`), y si el correo no sale, el trabajador se guarda
  igual.
*/
drop function if exists public.agregar_trabajador_de_la_vivienda(uuid, text, text, text, text, boolean, text);

create or replace function public.agregar_trabajador_de_la_vivienda(
  p_unidad_id uuid,
  p_nombre text,
  p_oficio text default null,
  p_codigo_pais text default null,
  p_telefono text default null,
  p_con_app boolean default false,
  p_correo text default null,
  p_puede_contestar_citofono boolean default true,
  p_puede_crear_visitas boolean default false,
  p_visita_id uuid default null
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
  v_con_app boolean := coalesce(p_con_app, false);
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
  if v_con_app then
    if v_correo is null or v_correo !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' then
      raise exception 'Para darle usuario en la app hace falta su correo';
    end if;
    if exists (select 1 from public.trabajador_de_la_vivienda t
                where t.unidad_id = p_unidad_id and t.deleted_at is null
                  and lower(t.correo_invitado) = v_correo) then
      raise exception 'Ese correo ya está invitado como trabajador de esta vivienda';
    end if;
  end if;
  -- La visita, si viene, es de esta vivienda.
  if p_visita_id is not null and not exists (
       select 1 from public.visita v where v.id = p_visita_id and v.unidad_id = p_unidad_id) then
    raise exception 'Esa visita no es de esta vivienda';
  end if;

  insert into public.trabajador_de_la_vivienda
    (unidad_id, nombre, oficio, codigo_pais, telefono, con_app, correo_invitado, creado_por,
     puede_contestar_citofono, puede_crear_visitas, visita_id)
  values
    (p_unidad_id, v_nombre, nullif(btrim(coalesce(p_oficio, '')), ''),
     case when v_telefono is null then null else upper(nullif(btrim(coalesce(p_codigo_pais, '')), '')) end,
     v_telefono, v_con_app,
     case when v_con_app then v_correo end, auth.uid(),
     v_con_app and coalesce(p_puede_contestar_citofono, true),
     v_con_app and coalesce(p_puede_crear_visitas, false),
     p_visita_id)
  returning id into v_id;

  if v_con_app then
    perform public.correo_de_acceso_de_trabajador(v_id);
  end if;

  return v_id;
end;
$$;
comment on function public.agregar_trabajador_de_la_vivienda(uuid, text, text, text, text, boolean, text, boolean, boolean, uuid) is
  'Agrega un profesional permanente a una vivienda. Sin app solo figura en el directorio; con app queda invitado a ese correo (le llega el correo de acceso) y, al aceptar, contesta el citófono y/o crea visitas según sus permisos. Quien gestiona la vivienda o la administración.';
revoke execute on function public.agregar_trabajador_de_la_vivienda(uuid, text, text, text, text, boolean, text, boolean, boolean, uuid) from public, anon;
grant execute on function public.agregar_trabajador_de_la_vivienda(uuid, text, text, text, text, boolean, text, boolean, boolean, uuid) to authenticated, service_role;

-- El correo de acceso. Interna: la llama `agregar_…`. Un correo que no sale no
-- impide guardar al trabajador.
create or replace function public.correo_de_acceso_de_trabajador(p_trabajador_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_url text;
  v_clave text;
  v_t public.trabajador_de_la_vivienda%rowtype;
  v_edificio text;
  v_unidad text;
  v_de_parte text;
  v_activo text;
begin
  select valor into v_activo from public.configuracion_plataforma where clave = 'invitaciones_por_correo';
  if coalesce(v_activo, 'true') <> 'true' then
    return;
  end if;
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'veciyo_url_funciones';
  select decrypted_secret into v_clave from vault.decrypted_secrets where name = 'veciyo_clave_servicio';
  if v_url is null or v_clave is null then
    return;
  end if;

  select * into v_t from public.trabajador_de_la_vivienda where id = p_trabajador_id;
  if v_t.id is null or not v_t.con_app or v_t.correo_invitado is null then
    return;
  end if;
  select c.nombre, 'Torre ' || tr.numero || ' · ' || u.codigo
    into v_edificio, v_unidad
    from public.unidad u
    join public.torre tr on tr.id = u.torre_id
    join public.condominio c on c.id = u.condominio_id
   where u.id = v_t.unidad_id;
  select nullif(btrim(coalesce(p.nombre, '') || ' ' || coalesce(p.apellido, '')), '')
    into v_de_parte from public.perfil p where p.id = v_t.creado_por;

  perform net.http_post(
    url     := v_url || '/functions/v1/enviar-correo',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_clave),
    body    := jsonb_build_object(
      'tipo', 'trabajador-asignado',
      'correo', v_t.correo_invitado,
      'nombre', split_part(v_t.nombre, ' ', 1),
      'condominio', v_edificio,
      'unidad', v_unidad,
      'deParte', v_de_parte
    )
  );
exception when others then
  return;
end;
$$;
comment on function public.correo_de_acceso_de_trabajador(uuid) is
  'Manda al profesional permanente con app el correo de acceso (18/11/2026). Interna.';
revoke execute on function public.correo_de_acceso_de_trabajador(uuid) from public, anon, authenticated;
grant execute on function public.correo_de_acceso_de_trabajador(uuid) to service_role;

-- ─── Su sesión sabe lo que puede ───────────────────────────────────────────

/*
  `mis_viviendas_de_trabajador` con dos columnas más: la app decide con ellas
  qué le enseña (crear visitas, el citófono). Cambia lo que devuelve, así que
  se borra y se crea; las versiones instaladas leen las columnas de siempre.
*/
drop function if exists public.mis_viviendas_de_trabajador();
create or replace function public.mis_viviendas_de_trabajador()
returns table (
  trabajador_id uuid,
  unidad_id uuid,
  codigo text,
  torre_numero integer,
  condominio_id uuid,
  condominio text,
  puede_crear_visitas boolean,
  puede_contestar_citofono boolean
)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select t.id, u.id, u.codigo, tr.numero::int, u.condominio_id, c.nombre,
         t.puede_crear_visitas, t.puede_contestar_citofono
    from public.trabajador_de_la_vivienda t
    join public.unidad u on u.id = t.unidad_id and u.deleted_at is null
    join public.torre tr on tr.id = u.torre_id
    join public.condominio c on c.id = u.condominio_id
   where t.usuario_id = auth.uid() and t.deleted_at is null and t.con_app
   order by t.created_at;
$$;
comment on function public.mis_viviendas_de_trabajador() is
  'Las viviendas en que quien llama es profesional permanente con app, con lo que puede hacer en cada una (18/11/2026).';
revoke execute on function public.mis_viviendas_de_trabajador() from public, anon;
grant execute on function public.mis_viviendas_de_trabajador() to authenticated, service_role;
