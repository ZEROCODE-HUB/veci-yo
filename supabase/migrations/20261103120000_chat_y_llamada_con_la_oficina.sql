-- Llamar y escribir a la oficina desde su directorio (Para Claude 208,
-- 03/11/2026). En «Gestión y Renta Corta › Directorio Oficina y
-- Administración», cada administrador o coadministrador lleva «Llamar» y
-- «Chat», como los guardias, y solo si recibe llamadas o mensajes:
--   · llamadas: si no las apagó en su perfil (`quiere_llamadas_app`);
--   · mensajes: el administrador siempre; el coadministrador, si tiene el
--     permiso «contestarChat» (sin clave cuenta como puesto, como en
--     `puede_coadmin`).
--
-- «Chat» abre la conversación con esa persona. No existía: el chat era de
-- viviendas con un área y de canales. Se usa la conversación `directa`, que el
-- esquema ya tenía y que se ve solo entre sus participantes. Entre vecinos
-- sigue sin poder crearse (07/10/2026): esto es solo entre la oficina, y lo
-- abre una función que lo comprueba.
--
-- Solo aditiva: dos funciones nuevas y dos recreadas con lo mismo de antes y
-- una rama más.

-- 1. Si una persona de la oficina recibe mensajes del resto de la oficina.
create or replace function public.oficina_recibe_chat(p_membresia public.membresia_condominio)
 returns boolean
 language sql
 immutable
 set search_path to 'public', 'pg_temp'
as $$
  select p_membresia.activo
     and p_membresia.usuario_id is not null
     and (
       p_membresia.rol = 'administrador'
       or (
         p_membresia.rol = 'coadministrador'
         and coalesce(p_membresia.permisos ->> 'contestarChat', 'true') <> 'false'
       )
     );
$$;

comment on function public.oficina_recibe_chat(public.membresia_condominio) is
  'Si un administrador o coadministrador recibe mensajes del resto de la oficina (Para Claude 208).';

-- 2. Abrir (o recuperar) la conversación con alguien de la oficina.
create or replace function public.abrir_chat_con_la_oficina(p_condominio_id uuid, p_usuario_id uuid)
 returns uuid
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $$
declare
  v_yo uuid := auth.uid();
  v_suya public.membresia_condominio;
  v_conversacion uuid;
begin
  if v_yo is null or not public.es_admin_condominio(p_condominio_id) then
    raise exception 'Solo la administración del edificio escribe a su oficina';
  end if;
  if p_usuario_id = v_yo then
    raise exception 'No puedes abrir un chat contigo';
  end if;

  select * into v_suya
  from public.membresia_condominio m
  where m.condominio_id = p_condominio_id
    and m.usuario_id = p_usuario_id
    and m.activo
    and m.rol in ('administrador', 'coadministrador')
  order by case m.rol when 'administrador' then 0 else 1 end
  limit 1;

  if v_suya.id is null then
    raise exception 'Esa persona no está en la oficina de este edificio';
  end if;
  if not public.oficina_recibe_chat(v_suya) then
    raise exception 'Esa persona no recibe mensajes del chat';
  end if;

  -- La que ya hubiera entre los dos, en este edificio.
  select c.id into v_conversacion
  from public.conversacion c
  where c.condominio_id = p_condominio_id
    and c.tipo = 'directa'
    and exists (select 1 from public.participante_conversacion p
                where p.conversacion_id = c.id and p.usuario_id = v_yo)
    and exists (select 1 from public.participante_conversacion p
                where p.conversacion_id = c.id and p.usuario_id = p_usuario_id)
    and (select count(*) from public.participante_conversacion p
         where p.conversacion_id = c.id) = 2
  order by c.created_at
  limit 1;

  if v_conversacion is not null then
    return v_conversacion;
  end if;

  insert into public.conversacion (condominio_id, tipo, creada_por)
  values (p_condominio_id, 'directa', v_yo)
  returning id into v_conversacion;

  insert into public.participante_conversacion (conversacion_id, usuario_id)
  values (v_conversacion, v_yo), (v_conversacion, p_usuario_id);

  return v_conversacion;
end;
$$;

comment on function public.abrir_chat_con_la_oficina(uuid, uuid) is
  'Abre o recupera la conversación directa con un administrador o coadministrador del edificio (Para Claude 208). Solo la administración, y solo si esa persona recibe mensajes.';

-- 3. Con quién es cada conversación directa mía: su nombre, para la lista.
--    El perfil de otra persona de la oficina no se puede leer (no comparten
--    vivienda), así que el nombre sale de aquí y solo de mis conversaciones.
create or replace function public.con_quien_hablo()
 returns table(conversacion_id uuid, nombre text)
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $$
  select c.id,
         coalesce(
           nullif(btrim(coalesce(pf.nombre, '') || ' ' || coalesce(pf.apellido, '')), ''),
           (select m.nombre from public.membresia_condominio m
            where m.condominio_id = c.condominio_id and m.usuario_id = otro.usuario_id
            order by m.activo desc limit 1),
           'Conversación'
         )
  from public.conversacion c
  join public.participante_conversacion yo
    on yo.conversacion_id = c.id and yo.usuario_id = auth.uid()
  join public.participante_conversacion otro
    on otro.conversacion_id = c.id and otro.usuario_id <> auth.uid()
  left join public.perfil pf on pf.id = otro.usuario_id
  where c.tipo = 'directa';
$$;

comment on function public.con_quien_hablo() is
  'El nombre de la otra persona en cada conversación directa de quien llama (Para Claude 208).';

-- 4. El equipo del edificio: lo mismo de antes, y la oficina también dice si
--    recibe llamadas y mensajes.
create or replace function public.equipo_del_edificio(p_condominio_id uuid)
 returns table(
   membresia_id uuid,
   usuario_id uuid,
   rol public.rol_condominio,
   nombre text,
   correo text,
   telefono text,
   codigo_pais text,
   permisos jsonb,
   horario text,
   de_turno boolean,
   recibe_llamadas boolean,
   recibe_chat boolean
 )
 language plpgsql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $$
begin
  if not public.es_admin_condominio(p_condominio_id) then
    raise exception 'Solo la administración del edificio ve su equipo';
  end if;

  return query
  select
    m.id,
    m.usuario_id,
    m.rol,
    coalesce(
      nullif(btrim(coalesce(p.nombre, '') || ' ' || coalesce(p.apellido, '')), ''),
      m.nombre,
      'Sin nombre'
    ),
    u.email::text,
    coalesce(nullif(p.telefono, ''), m.telefono),
    coalesce(nullif(p.codigo_pais, ''), m.codigo_pais),
    coalesce(m.permisos, '{}'::jsonb),
    (
      select string_agg(
        (array['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'])[t.dia_semana + 1]
          || ' ' || to_char(t.hora_inicio, 'HH24:MI') || '–' || to_char(t.hora_fin, 'HH24:MI'),
        ' · ' order by t.dia_semana, t.hora_inicio)
      from public.turno_guardia t
      where t.membresia_id = m.id
    ),
    case when m.rol = 'guardia'
         then m.usuario_id is not null and public.guardia_atiende_ahora(p_condominio_id, m.usuario_id)
         else null end,
    case when m.rol = 'guardia'
         then (m.permisos ->> 'llamadas') = 'true'
              and m.usuario_id is not null and public.quiere_llamadas_app(m.usuario_id)
         else m.usuario_id is not null and public.quiere_llamadas_app(m.usuario_id) end,
    case when m.rol = 'guardia'
         then (m.permisos ->> 'chat') = 'true'
         else public.oficina_recibe_chat(m) end
  from public.membresia_condominio m
  left join public.perfil p on p.id = m.usuario_id
  left join auth.users u on u.id = m.usuario_id
  where m.condominio_id = p_condominio_id
    and m.activo
    and m.rol in ('administrador', 'coadministrador', 'guardia')
  order by case m.rol when 'administrador' then 0 when 'coadministrador' then 1 else 2 end, 4;
end;
$$;

-- 5. Quién recibe el aviso de un mensaje: lo mismo de antes y, en una
--    directa, sus participantes. Sin esta rama, un mensaje de la oficina a la
--    oficina no avisaba a nadie.
create or replace function public.quien_esta_en_la_conversacion(p_conversacion_id uuid)
 returns table(usuario_id uuid)
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $$
  with c as (
    select * from public.conversacion where id = p_conversacion_id
  )
  -- Un hilo de area: la vivienda, y el personal del area que lo atiende.
  select m.usuario_id
  from c
  join public.membresia_unidad m on m.unidad_id = c.unidad_id and m.activo
  where c.tipo = 'area'
    -- El huesped, mientras dure su estancia.
    and (
      m.rol <> 'huesped_temporal'
      or (
        (m.vigente_desde is null or m.vigente_desde <= public.hoy_en_el_edificio(c.condominio_id))
        and (m.vigente_hasta is null or m.vigente_hasta >= public.hoy_en_el_edificio(c.condominio_id))
      )
    )

  union

  select mc.usuario_id
  from c
  join public.membresia_condominio mc
    on mc.condominio_id = c.condominio_id and mc.activo
  where c.tipo = 'area'
    and (
      (c.area = 'seguridad' and mc.rol = 'guardia')
      -- D-13: la porteria no, en el hilo de administracion. Y al reves
      -- tampoco: cada area atiende el suyo.
      or (c.area = 'administracion' and mc.rol in ('administrador', 'coadministrador'))
    )

  union

  -- Un canal: quien tenga alguno de los roles que lo componen. Es
  -- `es_del_canal` del derecho, como conjunto en vez de como pregunta.
  select m.usuario_id
  from c
  join public.canal_rol cr on cr.conversacion_id = c.id and cr.rol_unidad is not null
  join public.unidad u on u.condominio_id = c.condominio_id and u.deleted_at is null
  join public.membresia_unidad m
    on m.unidad_id = u.id and m.rol = cr.rol_unidad and m.activo
  where c.tipo = 'grupo'
    and (not c.solo_quienes_viven or public.membresia_vive_ahi(m.rol, m.es_residente))

  union

  select mc.usuario_id
  from c
  join public.canal_rol cr on cr.conversacion_id = c.id and cr.rol_condominio is not null
  join public.membresia_condominio mc
    on mc.condominio_id = c.condominio_id and mc.rol = cr.rol_condominio and mc.activo
  where c.tipo = 'grupo'

  union

  -- Una directa: sus dos participantes (Para Claude 208, 03/11/2026).
  select p.usuario_id
  from c
  join public.participante_conversacion p on p.conversacion_id = c.id
  where c.tipo = 'directa';
$$;
