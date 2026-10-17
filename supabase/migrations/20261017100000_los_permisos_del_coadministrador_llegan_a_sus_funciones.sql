-- Los permisos de consulta del coadministrador llegan a sus funciones
-- (17/10/2026).
--
-- Las tablas ya respetaban `visualizarVisitas`, `visualizarCorrespondencia`,
-- `visualizarZonasComunes` y `visualizarEncuestas` (politicas con
-- `puede_coadmin`). Pero siete funciones `security definer` que entregan lo
-- mismo por otro camino solo preguntaban `es_admin_condominio`, que es verdad
-- para cualquier coadministrador: con el permiso apagado seguia viendo los
-- reportes de visitas, paqueteria y reservas, quien pidio cada reserva y quien
-- voto que.
--
-- Cambia solo esa comprobacion, por la misma que usan las politicas.
-- `puede_coadmin` incluye al administrador, asi que para el no cambia nada.

CREATE OR REPLACE FUNCTION public.reporte_visitantes(p_condominio_id uuid, p_desde date DEFAULT NULL::date, p_hasta date DEFAULT NULL::date)
 RETURNS TABLE(fecha date, unidad text, tipo text, visitante text, documento text, ingreso timestamp with time zone, salida timestamp with time zone, placas text, registro text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
    and public.puede_coadmin(p_condominio_id, 'visualizarVisitas')
    and (p_desde is null or v.fecha_desde >= p_desde)
    and (p_hasta is null or v.fecha_desde <= p_hasta)
  order by v.fecha_desde desc, u.codigo;
$function$;

CREATE OR REPLACE FUNCTION public.reporte_correspondencia(p_condominio_id uuid, p_desde date DEFAULT NULL::date, p_hasta date DEFAULT NULL::date)
 RETURNS TABLE(registrada timestamp with time zone, unidad text, empresa text, categoria text, destinatario text, estado text, entregada timestamp with time zone, entregada_a text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
    and public.puede_coadmin(p_condominio_id, 'visualizarCorrespondencia')
    and (p_desde is null or c.registrada_en::date >= p_desde)
    and (p_hasta is null or c.registrada_en::date <= p_hasta)
  order by c.registrada_en desc;
$function$;

CREATE OR REPLACE FUNCTION public.reporte_areas_comunes(p_condominio_id uuid, p_desde date DEFAULT NULL::date, p_hasta date DEFAULT NULL::date)
 RETURNS TABLE(fecha date, zona text, unidad text, horario text, estado text, participantes bigint, resuelta_por text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
    and public.puede_coadmin(p_condominio_id, 'visualizarZonasComunes')
    and (p_desde is null or r.fecha >= p_desde)
    and (p_hasta is null or r.fecha <= p_hasta)
  order by r.fecha desc;
$function$;

CREATE OR REPLACE FUNCTION public.detalle_votacion(p_publicacion_id uuid)
 RETURNS TABLE(opcion text, votante text, unidad text, emitido_en timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$

  select

    o.etiqueta,

    coalesce(p.nombre || ' ' || p.apellido, 'Sin nombre'),

    u.codigo,

    v.emitido_en

  from public.voto v

  join public.opcion_voto o on o.id = v.opcion_id

  join public.publicacion pub on pub.id = v.publicacion_id

  left join public.perfil p on p.id = v.usuario_id

  left join public.unidad u on u.id = v.unidad_id

  where v.publicacion_id = p_publicacion_id

    and not pub.ocultar_resultados

    and public.puede_coadmin(pub.condominio_id, 'visualizarEncuestas')

  order by o.orden, v.emitido_en;

$function$;

CREATE OR REPLACE FUNCTION public.encuestas_por_decidir(p_condominio_id uuid)
 RETURNS TABLE(id uuid, titulo text, cerro_en timestamp with time zone, votos bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select
    p.id,
    p.titulo,
    p.publicada_hasta,
    (select count(*) from public.voto v where v.publicacion_id = p.id)
  from public.publicacion p
  where p.condominio_id = p_condominio_id
    and p.deleted_at is null
    and p.tipo = 'encuesta'
    and p.ocultar_resultados
    and p.resultados_publicados_en is null
    -- Ya se decidio dejarlos en borrador: no espera a nadie.
    and p.resultados_revisados_en is null
    and p.publicada_hasta is not null
    and p.publicada_hasta <= now()
    and public.puede_coadmin(p_condominio_id, 'visualizarEncuestas')
  order by p.publicada_hasta desc;
$function$;

CREATE OR REPLACE FUNCTION public.puede_ver_reserva(p_reserva_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select exists (
    select 1
    from public.reserva_zona r
    join public.zona_comun z on z.id = r.zona_id
    where r.id = p_reserva_id
      and (
        public.es_miembro_unidad(r.unidad_id)
        or public.puede_coadmin(z.condominio_id, 'visualizarZonasComunes')
        -- El huesped reserva a su nombre y tiene que poder adjuntar el suyo.
        or r.solicitada_por = auth.uid()
      )
  );
$function$;

CREATE OR REPLACE FUNCTION public.solicitantes_de_reservas(p_reservas uuid[])
 RETURNS TABLE(reserva_id uuid, solicitante text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select
    r.id,
    coalesce(
      -- Si pidio figurar con alias en las zonas, el nombre real no sale.
      case when p.usa_alias_zonas then nullif(p.alias, '') end,
      nullif(btrim(coalesce(p.nombre, '') || ' ' || coalesce(p.apellido, '')), ''),
      m.nombre
    )
  from public.reserva_zona r
  left join public.perfil p on p.id = r.solicitada_por
  left join public.membresia_unidad m
         on m.unidad_id = r.unidad_id
        and m.usuario_id = r.solicitada_por
        and m.activo
  where r.id = any(p_reservas)
    -- La misma visibilidad que la politica de la tabla: quien opera la
    -- vivienda, la administracion del condominio, y el huesped sobre la suya.
    and (
      public.puede_operar_unidad(r.unidad_id)
      or exists (
        select 1 from public.zona_comun z
        where z.id = r.zona_id and public.puede_coadmin(z.condominio_id, 'visualizarZonasComunes')
      )
      or (r.solicitada_por = auth.uid())
      -- Y la portería de ese edificio (15/10/2026).
      or exists (
        select 1 from public.zona_comun z
        where z.id = r.zona_id and public.es_guardia_de_condominio(z.condominio_id)
      )
    );
$function$;

-- Lo mismo con el chat: sin `contestarChat`, un coadministrador no podia abrir
-- hilos nuevos con una vivienda, pero leia y contestaba los ya abiertos,
-- porque el hilo de administracion se veia con `es_admin_condominio`. La
-- politica de alta de mensajes pide poder ver la conversacion, asi que esto
-- cierra las dos cosas.
CREATE OR REPLACE FUNCTION public.puede_ver_conversacion_fila(p_tipo tipo_conversacion, p_area area_conversacion, p_ambito ambito_grupo, p_unidad_id uuid, p_condominio_id uuid, p_conversacion_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select case p_tipo
    when 'directa' then exists (
      select 1 from public.participante_conversacion p
      where p.conversacion_id = p_conversacion_id and p.usuario_id = auth.uid()
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
