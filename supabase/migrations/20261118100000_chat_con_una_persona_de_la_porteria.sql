-- ============================================================================
-- Un chat con cada persona de la portería (18/11/2026)
-- ============================================================================
--
-- El cliente, el 18/11/2026, sobre «Conserje · Federico Valverde»: «sale el
-- nombre de a quien le estás escribiendo? … si uno termina el turno se
-- perdería el mensaje.. no es mejor que sea separado y que se elija a quien
-- escribir?». Aprobado así:
--
--   · Elegir a una persona de la portería abre un chat SOLO con ella (y con
--     quien vive en la vivienda que escribe), con su nombre arriba. Antes se
--     abría el hilo de la vivienda con toda la portería.
--   · Se le puede escribir aunque no esté de turno: el mensaje le espera y le
--     llega el aviso. La app avisa antes de cuándo vuelve.
--   · La administración puede leer esos chats, para que nada quede sin
--     respuesta si esa persona no vuelve.
--
-- Es una conversación `directa` --como la de la administración con su
-- oficina (`abrir_chat_con_la_oficina`)-- marcada con la persona de la
-- portería y la vivienda. El hilo de la vivienda con toda la portería sigue
-- existiendo y funcionando igual: lo usan las versiones instaladas.
--
-- Solo aditiva: una columna nueva sin valor obligatorio, una función nueva y
-- cuatro `create or replace` con la misma firma.

-- 1. La marca -----------------------------------------------------------------

alter table public.conversacion
  add column if not exists porteria_membresia_id uuid
    references public.membresia_condominio (id) on delete set null;

create index if not exists conversacion_porteria_membresia_idx
  on public.conversacion (porteria_membresia_id)
  where porteria_membresia_id is not null;

comment on column public.conversacion.porteria_membresia_id is
  'Solo en las directas con una persona de la portería (18/11/2026): su membresía. La conversación es entre ella y quien escribió desde la vivienda `unidad_id`; la administración también la lee.';

-- 2. Abrirlo --------------------------------------------------------------------

create or replace function public.abrir_chat_con_la_porteria(p_unidad_id uuid, p_membresia_id uuid)
 returns uuid
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $$
declare
  v_yo uuid := auth.uid();
  v_condominio uuid;
  v_suya public.membresia_condominio;
  v_conversacion uuid;
begin
  if v_yo is null or not public.es_residente_o_huesped(p_unidad_id) then
    raise exception 'Solo quien vive en esa vivienda puede escribir desde ella';
  end if;

  select u.condominio_id into v_condominio
  from public.unidad u
  where u.id = p_unidad_id and u.deleted_at is null;

  select * into v_suya
  from public.membresia_condominio m
  where m.id = p_membresia_id
    and m.condominio_id = v_condominio
    and m.rol = 'guardia'
    and m.activo
    and m.usuario_id is not null
    and coalesce((m.permisos ->> 'chat')::boolean, false);

  if v_suya.id is null then
    raise exception 'Esa persona no atiende el chat de la portería de este edificio';
  end if;
  if v_suya.usuario_id = v_yo then
    raise exception 'No puedes abrir un chat contigo';
  end if;

  -- El que ya hubiera de esta persona con esta vivienda, en el que estoy yo.
  select c.id into v_conversacion
  from public.conversacion c
  where c.tipo = 'directa'
    and c.porteria_membresia_id = p_membresia_id
    and c.unidad_id = p_unidad_id
    and exists (select 1 from public.participante_conversacion p
                where p.conversacion_id = c.id and p.usuario_id = v_yo)
  order by c.created_at
  limit 1;

  if v_conversacion is not null then
    return v_conversacion;
  end if;

  insert into public.conversacion
    (condominio_id, tipo, unidad_id, creada_por, porteria_membresia_id)
  values (v_condominio, 'directa', p_unidad_id, v_yo, p_membresia_id)
  returning id into v_conversacion;

  insert into public.participante_conversacion (conversacion_id, usuario_id)
  values (v_conversacion, v_yo), (v_conversacion, v_suya.usuario_id);

  return v_conversacion;
end;
$$;

comment on function public.abrir_chat_con_la_porteria(uuid, uuid) is
  'Abre (o devuelve) el chat de quien vive en una vivienda con UNA persona de la portería que atiende el chat, esté o no de turno (18/11/2026).';

revoke execute on function public.abrir_chat_con_la_porteria(uuid, uuid) from public, anon;
grant execute on function public.abrir_chat_con_la_porteria(uuid, uuid) to authenticated, service_role;

-- 3. «Sin chat entre vecinos» no es esto ------------------------------------------
-- Las directas solo se crean por funciones (la política de alta no las
-- admite), y esta es con la portería, no con un vecino.

create or replace function public.directa_sin_chat_entre_vecinos()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
begin
  if new.tipo <> 'directa' or auth.uid() is null then
    return new;
  end if;
  -- Con una persona de la portería (18/11/2026).
  if new.porteria_membresia_id is not null then
    return new;
  end if;
  if public.es_admin_condominio(new.condominio_id) then
    return new;
  end if;
  if coalesce((select c.chat_entre_vecinos from public.condominio c where c.id = new.condominio_id), false) then
    return new;
  end if;
  raise exception 'En este edificio el chat entre vecinos está desactivado.'
    using errcode = 'check_violation',
          constraint = 'conversacion_sin_chat_entre_vecinos';
end;
$function$;

-- 4. Quién la ve: sus dos participantes y la administración ---------------------

create or replace function public.puede_ver_conversacion_fila(p_tipo tipo_conversacion, p_area area_conversacion, p_ambito ambito_grupo, p_unidad_id uuid, p_condominio_id uuid, p_conversacion_id uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
  select case p_tipo
    when 'directa' then exists (
      select 1 from public.participante_conversacion p
      where p.conversacion_id = p_conversacion_id and p.usuario_id = auth.uid()
    )
      -- La de una vivienda con una persona de la portería la lee también
      -- quien contesta el chat en la administración (18/11/2026).
      or (
        exists (select 1 from public.conversacion c
                where c.id = p_conversacion_id and c.porteria_membresia_id is not null)
        and public.puede_coadmin(p_condominio_id, 'contestarChat')
      )
    when 'area' then
      -- El huesped entra aqui mientras dure su estancia.
      public.es_residente_o_huesped(p_unidad_id)
      -- D-13: la porteria, no todo el personal, y solo el guardia con el chat
      -- encendido (hueco 22). La administracion tiene su propio hilo.
      or (p_area = 'seguridad'      and public.guardia_con_chat(p_condominio_id))
      -- Y en la administracion, quien tenga el permiso de contestar el chat
      -- (17/10/2026). Antes bastaba ser coadministrador.
      or (p_area = 'administracion' and public.puede_coadmin(p_condominio_id, 'contestarChat'))
    when 'grupo' then
      -- Y solo los roles del canal. Quien administra entra si su rol esta en
      -- la lista, como cualquiera.
      public.es_del_canal(p_conversacion_id)
    else false
  end;
$function$;

-- 5. El nombre que sale arriba ----------------------------------------------------
--   · quien vive en la vivienda ve «Conserje · Federico Valverde»;
--   · la persona de la portería ve «Ana Torres · Dpto 501»;
--   · la administración ve «Dpto 501 con Federico Valverde».

create or replace function public.con_quien_hablo()
 returns table(conversacion_id uuid, nombre text)
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
  with nombres as not materialized (
    select pf.id as usuario_id,
           nullif(btrim(coalesce(pf.nombre, '') || ' ' || coalesce(pf.apellido, '')), '') as nombre
    from public.perfil pf
  ),
  porteria as (
    select c.id, c.unidad_id, c.condominio_id, m.usuario_id as guardia_id,
           coalesce(
             (select n.nombre from nombres n where n.usuario_id = m.usuario_id),
             nullif(btrim(m.nombre), ''),
             'Portería'
           ) as guardia,
           coalesce(
             (select o.etiqueta from public.catalogo_opcion o
              where o.catalogo = 'cargos_de_porteria'
                and o.codigo = coalesce(nullif(btrim(m.cargo), ''), 'seguridad')
              limit 1),
             'Portería'
           ) as cargo,
           (select u.codigo from public.unidad u where u.id = c.unidad_id) as depto,
           (select coalesce(n.nombre, 'Vecino')
            from public.participante_conversacion p
            left join nombres n on n.usuario_id = p.usuario_id
            where p.conversacion_id = c.id and p.usuario_id <> m.usuario_id
            limit 1) as vecino
    from public.conversacion c
    join public.membresia_condominio m on m.id = c.porteria_membresia_id
    where c.tipo = 'directa'
  )
  -- Las de la oficina, como antes.
  select c.id,
         coalesce(
           (select n.nombre from nombres n where n.usuario_id = otro.usuario_id),
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
  where c.tipo = 'directa'
    and c.porteria_membresia_id is null

  union all

  select p.id,
         case
           when p.guardia_id = auth.uid() then p.vecino || ' · Dpto ' || coalesce(p.depto, '?')
           when exists (select 1 from public.participante_conversacion yo
                        where yo.conversacion_id = p.id and yo.usuario_id = auth.uid())
             then p.cargo || ' · ' || p.guardia
           else 'Dpto ' || coalesce(p.depto, '?') || ' con ' || p.guardia
         end
  from porteria p
  where exists (select 1 from public.participante_conversacion yo
                where yo.conversacion_id = p.id and yo.usuario_id = auth.uid())
     or public.puede_coadmin(p.condominio_id, 'contestarChat');
$function$;

-- 6. El aviso de un mensaje en una directa dice quién escribe ---------------------
-- Antes salía «Mensaje nuevo»: una directa no tiene nombre ni área.

create or replace function public.avisar_del_mensaje()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_conv record;
  v_titulo text;
begin
  select c.id, c.condominio_id, c.tipo, c.area, c.nombre, c.unidad_id
    into v_conv
  from public.conversacion c
  where c.id = new.conversacion_id;

  if v_conv.id is null then
    return new;
  end if;

  /*
    El titulo dice **de donde viene**, no quien escribio: en un canal de cien
    viviendas el nombre de quien escribe no situa nada, y en un hilo con la
    porteria responde quien este de turno --no una persona--, que es
    exactamente lo que dice la pantalla al abrirlo. En una directa si es una
    persona, y se dice quien (18/11/2026).
  */
  v_titulo := coalesce(
    nullif(v_conv.nombre, ''),
    case v_conv.area
      when 'seguridad' then 'Portería'
      when 'administracion' then 'Administración'
      else null
    end,
    case when v_conv.tipo = 'directa' then nullif(btrim(new.autor_nombre), '') end,
    'Mensaje nuevo'
  );

  insert into public.notificacion
    (usuario_id, condominio_id, tipo, titulo, mensaje, entidad_tipo, entidad_id)
  select q.usuario_id, v_conv.condominio_id, 'mensaje_de_chat',
         v_titulo, left(new.texto, public.parametro_entero('aviso_texto_largo')), 'conversacion', v_conv.id
  from public.quien_esta_en_la_conversacion(v_conv.id) q
  where
    -- A quien escribio, no.
    q.usuario_id <> new.autor_id
    /*
      A quien silencio **esta** conversacion, tampoco. Silenciar ya apagaba el
      contador de no leidos, y seria absurdo que empezara a sonar justo al
      conectar los avisos: el interruptor que el cliente pidio el 02/10 habria
      dejado de hacer lo que promete el mismo dia que esto se enciende.
    */
    and not exists (
      select 1 from public.participante_conversacion p
      where p.conversacion_id = v_conv.id
        and p.usuario_id = q.usuario_id
        and p.silenciado
    )
    -- Y a quien apago este motivo. Sin esto la casilla seria decorativa.
    and public.quiere_aviso(q.usuario_id, 'mensaje_de_chat', 'app');

  return new;
end;
$function$;
