-- Cuotas, Gratitud, avisos, verificaciones y llamadas leen sus parámetros (18/10/2026).
--
-- Aditiva en datos: no se borra ninguna fila del cliente. Se reemplazan
-- funciones, dos restricciones (su tope de negocio pasa a un disparador) y
-- valores por defecto de columnas. Mismos valores que antes: cambia dónde vive
-- el dato, no lo que hace la app.

CREATE OR REPLACE FUNCTION public.comprar_paquete_verificaciones(p_unidad_id uuid, p_cantidad integer, p_referencia text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_condominio uuid;
  v_monto  numeric(12,2);
  v_moneda char(3);
  v_id     uuid;
begin
  if not public.puede_configurar_alojamiento(p_unidad_id) then
    raise exception 'No podes comprar verificaciones para esta vivienda';
  end if;

  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'El paquete necesita una cantidad';
  end if;

  v_condominio := public.condominio_de_unidad(p_unidad_id);

  select p.monto, p.moneda into v_monto, v_moneda
  from public.precio_del_plan('paquete_verificaciones', v_condominio) p;

  insert into public.paquete_verificaciones
    (unidad_id, cantidad, vence_en, comprado_por, monto, moneda, referencia)
  values
    (p_unidad_id, p_cantidad, current_date + public.parametro_entero('verificaciones_paquete_dias'), auth.uid(),
     case when v_monto is null then null else v_monto * p_cantidad end,
     v_moneda,
     nullif(btrim(coalesce(p_referencia, '')), ''))
  returning id into v_id;

  return v_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.recoger_verificaciones_pendientes()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_id uuid;
  v_n  int := 0;
begin
  for v_id in
    select va.invitado_id
    from public.verificacion_antecedentes va
    where va.resultado = 'pendiente'
      and va.proveedor like 'tusdatos%'
      and va.ejecutada_en < now() - make_interval(mins => public.parametro_entero('antecedentes_reintento_tras_minutos'))
      and va.ejecutada_en > now() - make_interval(hours => public.parametro_entero('antecedentes_abandonar_tras_horas'))
    limit public.parametro_entero('antecedentes_pendientes_por_pasada')
  loop
    perform public.encolar_verificacion(v_id);
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.encolar_verificacion(p_invitado_id uuid)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp', 'extensions'
AS $function$
declare
  v_url   text;
  v_clave text;
begin
  select decrypted_secret into v_url
  from vault.decrypted_secrets where name = 'veciyo_url_funciones';
  select decrypted_secret into v_clave
  from vault.decrypted_secrets where name = 'veciyo_clave_servicio';

  if v_url is null or v_clave is null then
    raise exception 'Faltan los secretos veciyo_url_funciones / veciyo_clave_servicio en el Vault';
  end if;

  return net.http_post(
    url     := v_url || '/functions/v1/verificar-antecedentes',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_clave
    ),
    body    := jsonb_build_object('invitadoId', p_invitado_id),
    timeout_milliseconds := public.parametro_entero('antecedentes_espera_respuesta_segundos') * 1000
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.crear_cuota_del_mes(p_condominio_id uuid, p_periodo date DEFAULT NULL::date)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_hoy date := (now() at time zone public.zona_horaria_del_condominio(p_condominio_id))::date;
  v_mes date := date_trunc('month', coalesce(p_periodo, v_hoy))::date;
begin
  if not public.es_admin_condominio(p_condominio_id) then
    raise exception 'Solo la administración crea el mes de cuota';
  end if;

  -- Un mes de adelanto como mucho: mas alla es casi seguro un error de fecha.
  if v_mes > (date_trunc('month', v_hoy) + make_interval(months => public.parametro_entero('cuotas_meses_adelanto')))::date then
    raise exception 'Solo se puede crear el mes que corre o hasta % más adelante', public.parametro_entero('cuotas_meses_adelanto');
  end if;

  return public.abrir_mes_de_cuota(p_condominio_id, v_mes);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.cuadro_honor(p_condominio_id uuid)
 RETURNS TABLE(unidad_id uuid, codigo text, torre_numero integer, responsable_usuario_id uuid, responsable text, periodos_al_dia integer, periodos_totales integer, insignias integer, insignias_detalle jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with periodos as (
    select id, periodo
    from public.cuota_administracion
    where condominio_id = p_condominio_id
    order by periodo desc
    limit public.parametro_entero('cuotas_meses_historial', p_condominio_id)
  ),
  -- Si el estado de las cuotas se publica a quien pregunta (hueco 13).
  publica as (
    select coalesce(c.cuotas_visibilidad <> 'porcentaje', false)
           or public.es_admin_condominio(p_condominio_id) as si
    from public.condominio c
    where c.id = p_condominio_id
  ),
  responsables as (
    select distinct on (m.unidad_id)
      m.unidad_id, m.usuario_id, m.nombre
    from public.membresia_unidad m
    where m.activo
    order by m.unidad_id,
             m.es_admin_primario desc,
             (m.rol = 'propietario') desc,
             m.created_at
  )
  select
    u.id,
    u.codigo,
    t.numero,
    r.usuario_id,
    -- Si esa persona pidió aparecer con alias aquí, el nombre real no sale.
    coalesce(
      case when p.usa_alias_cuadro_honor
            and not public.es_admin_condominio(p_condominio_id)
            and not public.es_guardia_de_condominio(p_condominio_id)
           then nullif(p.alias, '') end,
      r.nombre
    ),
    case when pub.si then pagos.al_dia end,
    case when pub.si then (select count(*) from periodos)::int end,
    (select count(*)::int
       from public.reconocimiento rec
      where rec.usuario_id = r.usuario_id
        and rec.condominio_id = p_condominio_id),
    coalesce(
      (select jsonb_agg(
                jsonb_build_object(
                  'clave',    d.clave,
                  'etiqueta', d.etiqueta,
                  'icono',    d.icono,
                  'cantidad', d.cantidad
                )
                order by d.etiqueta
              )
         from (
           select i.clave, i.etiqueta, coalesce(i.icono, '⭐') as icono,
                  count(*)::int as cantidad
             from public.reconocimiento rec
             join public.insignia i on i.id = rec.insignia_id
            where rec.usuario_id = r.usuario_id
              and rec.condominio_id = p_condominio_id
            group by i.clave, i.etiqueta, i.icono
         ) d),
      '[]'::jsonb
    )
  from public.unidad u
  join public.torre t on t.id = u.torre_id
  join responsables r on r.unidad_id = u.id
  left join public.perfil p on p.id = r.usuario_id
  cross join publica pub
  cross join lateral (
    select count(*) filter (where pc.pagado)::int as al_dia
    from periodos per
    left join public.pago_cuota pc
      on pc.cuota_id = per.id and pc.unidad_id = u.id
  ) pagos
  where u.condominio_id = p_condominio_id
    and u.deleted_at is null
    and public.es_miembro_condominio(p_condominio_id)
    -- Solo los que pagan a tiempo, cuando eso se publica. Si no, todas: que
    -- falte una vivienda también diría que debe.
    and (not pub.si or pagos.al_dia = (select count(*) from periodos))
  order by t.numero, u.codigo;
$function$
;

CREATE OR REPLACE FUNCTION public.resumen_cuotas(p_condominio_id uuid)
 RETURNS TABLE(periodo date, moneda character, esperado numeric, recibido numeric, al_dia integer, atrasados integer, tiene_cuota boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with definidos as (
    select
      c.periodo,
      c.moneda,
      (c.monto * count(u.id))::numeric(12,2) as esperado,
      (c.monto * count(*) filter (where p.pagado))::numeric(12,2) as recibido,
      count(*) filter (where p.pagado)::int as al_dia,
      count(*) filter (where p.pagado is not true)::int as atrasados,
      true as tiene_cuota
    from public.cuota_administracion c
    join public.unidad u
      on u.condominio_id = c.condominio_id and u.deleted_at is null
    left join public.pago_cuota p
      on p.cuota_id = c.id and p.unidad_id = u.id
    where c.condominio_id = p_condominio_id
    group by c.id, c.periodo, c.moneda, c.monto
  ),
  /*
    El mes en curso, si nadie le puso cuota. `date_trunc` sobre `current_date`
    es inmune al huso --es una fecha, no un instante-- asi que aqui no hace
    falta anclar nada.
  */
  en_curso as (
    select
      date_trunc('month', current_date)::date as periodo,
      null::char(3) as moneda,
      0::numeric(12,2) as esperado,
      0::numeric(12,2) as recibido,
      0 as al_dia,
      (select count(*)::int from public.unidad u
       where u.condominio_id = p_condominio_id and u.deleted_at is null) as atrasados,
      false as tiene_cuota
    where not exists (
      select 1 from definidos d
      where d.periodo = date_trunc('month', current_date)::date
    )
  )
  select * from (
    select * from definidos
    union all
    select * from en_curso
  ) todo
  where public.es_miembro_condominio(p_condominio_id)
  order by periodo desc
  limit public.parametro_entero('cuotas_meses_historial', p_condominio_id);
$function$
;

CREATE OR REPLACE FUNCTION public.guardar_configuracion_cuotas(p_condominio_id uuid, p_monto numeric DEFAULT NULL::numeric, p_moneda text DEFAULT NULL::text, p_dia_vencimiento integer DEFAULT NULL::integer, p_automatica boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if not public.es_admin_condominio(p_condominio_id) then
    raise exception 'Solo la administración configura las cuotas';
  end if;

  if p_monto is not null and p_monto <= 0 then
    raise exception 'El importe de la cuota tiene que ser mayor que cero';
  end if;

  if p_dia_vencimiento is not null and p_dia_vencimiento not between 1 and public.parametro_entero('cuota_dia_vencimiento_maximo') then
    raise exception 'El día de vencimiento va del 1 al %', public.parametro_entero('cuota_dia_vencimiento_maximo');
  end if;

  if p_moneda is not null and p_moneda !~ '^[A-Z]{3}$' then
    raise exception 'La moneda se escribe con sus tres letras, como COP o USD';
  end if;

  if coalesce(p_automatica, false) and p_monto is null then
    raise exception 'Para crear el mes automáticamente hace falta el importe';
  end if;

  update public.condominio set
    cuota_monto           = p_monto,
    cuota_moneda          = p_moneda,
    cuota_dia_vencimiento = p_dia_vencimiento,
    cuota_automatica      = coalesce(p_automatica, false)
  where id = p_condominio_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.reconocimiento_con_medida()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_ultimo timestamptz;
begin
  if not public.es_residente_del_condominio(new.usuario_id, new.condominio_id) then
    raise exception
      'Solo se reconoce a quien vive en el edificio. La gratitud es entre vecinos.';
  end if;

  if not public.es_residente_del_condominio(new.otorgado_por, new.condominio_id) then
    raise exception
      'Solo los residentes dan reconocimientos. La gratitud es entre vecinos.';
  end if;

  select max(r.otorgado_en) into v_ultimo
  from public.reconocimiento r
  where r.otorgado_por = new.otorgado_por
    and r.condominio_id = new.condominio_id
    and r.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

  if v_ultimo is not null
     and coalesce(new.otorgado_en, now()) < v_ultimo + make_interval(days => public.parametro_entero('gratitud_dias_espera', new.condominio_id)) then
    raise exception
      'Ya diste un reconocimiento. Podras dar otro % dias despues del ultimo: es uno cada vez, y por eso vale.',
      public.parametro_entero('gratitud_dias_espera', new.condominio_id);
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.dias_para_dar_reconocimiento(p_condominio_id uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select greatest(
    0,
    coalesce(
      public.parametro_entero('gratitud_dias_espera', p_condominio_id) - floor(extract(epoch from (now() - max(r.otorgado_en))) / 86400)::int,
      0
    )
  )
  from public.reconocimiento r
  where r.otorgado_por = auth.uid()
    and r.condominio_id = p_condominio_id;
$function$
;

CREATE OR REPLACE FUNCTION public.avisar_preregistros_incompletos()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  f record;
  n int := 0;
begin
  for f in
    select v.id, v.unidad_id, v.fecha_desde,
           (v.fecha_desde - (now() at time zone public.zona_horaria_del_condominio(v.condominio_id))::date) as faltan,
           coalesce(t.nombre, 'Tu huésped') as nombre
    from public.visita v
    left join public.invitado t on t.visita_id = v.id and t.es_titular
    where v.tipo = 'huesped_temporal'
      and v.precheckin_completado_en is null
      and v.estado not in ('cancelada', 'finalizada')
      and v.fecha_desde between (now() at time zone public.zona_horaria_del_condominio(v.condominio_id))::date
                            and (now() at time zone public.zona_horaria_del_condominio(v.condominio_id))::date + public.parametro_entero('preregistro_alerta_dias', v.condominio_id)
      and not exists (
        select 1 from public.notificacion n
        where n.entidad_id = v.id and n.tipo = 'preregistro_incompleto'
      )
  loop
    perform public.notificar_anfitrion(
      f.unidad_id, 'preregistro_incompleto',
      'Llega pronto y sin preregistro',
      f.nombre || ' llega ' ||
        case when f.faltan <= 0 then 'hoy' when f.faltan = 1 then 'mañana'
             else 'en ' || f.faltan || ' días' end ||
        ' y no ha hecho su preregistro. Puedes recordárselo desde tu inicio.',
      'visita', f.id
    );
    n := n + 1;
  end loop;
  return n;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.dias_de_recordatorio_sensatos(p_dias smallint[])
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  select p_dias is null
      or not exists (
           select 1 from unnest(p_dias) d where d < 1 or d > public.parametro_entero('preregistro_recordatorio_dias_maximo')
         );
$function$
;

CREATE OR REPLACE FUNCTION public.guardar_recordatorios_precheckin(p_unidad_id uuid, p_al_huesped boolean, p_al_anfitrion boolean, p_dias smallint[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_dias smallint[];
begin
  -- El mismo permiso que el resto de la ficha del alojamiento: quien gestiona
  -- la vivienda. No se inventa uno nuevo.
  if not public.puede_configurar_alojamiento(p_unidad_id) then
    raise exception 'No tenes permiso para configurar esta vivienda';
  end if;

  if not exists (select 1 from public.suscripcion_renta_corta where unidad_id = p_unidad_id) then
    raise exception 'Esta vivienda no tiene renta corta activada';
  end if;

  /*
    Ordenados de mas lejos a mas cerca y sin repetidos. Lo segundo importa: con
    `{7,7,3}` el cron mandaria dos veces el mismo dia --y la constancia lo
    impediria, pero por accidente y dejando una fila de error--. Mejor que no
    se pueda escribir.
  */
  v_dias := coalesce(
    (select array_agg(distinct d order by d desc) from unnest(p_dias) d),
    '{}'::smallint[]
  );

  if not public.dias_de_recordatorio_sensatos(v_dias) then
    raise exception 'Los avisos van de 1 a % dias antes de la llegada', public.parametro_entero('preregistro_recordatorio_dias_maximo');
  end if;

  update public.suscripcion_renta_corta
  set recordatorio_al_huesped   = coalesce(p_al_huesped, recordatorio_al_huesped),
      recordatorio_al_anfitrion = coalesce(p_al_anfitrion, recordatorio_al_anfitrion),
      recordatorio_dias         = v_dias
  where unidad_id = p_unidad_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.avisar_del_mensaje()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
    exactamente lo que dice la pantalla al abrirlo.
  */
  v_titulo := coalesce(
    nullif(v_conv.nombre, ''),
    case v_conv.area
      when 'seguridad' then 'Portería'
      when 'administracion' then 'Administración'
      else 'Mensaje nuevo'
    end
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
$function$
;

CREATE OR REPLACE FUNCTION public.notificar_incidencia_correspondencia()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_unidad  uuid;
  v_empresa text;
  v_huesped uuid;
  v_texto   text;
begin
  select c.unidad_id, c.empresa, c.huesped_id into v_unidad, v_empresa, v_huesped
  from public.correspondencia c
  where c.id = new.correspondencia_id;

  if v_unidad is null then
    return new;
  end if;

  v_texto := coalesce(v_empresa, 'Un paquete') || ': ' || left(new.descripcion, public.parametro_entero('aviso_texto_largo'));

  perform public.notificar_unidad(
    v_unidad, 'correspondencia_incidencia',
    'Novedad con tu paquete', v_texto,
    'correspondencia', new.correspondencia_id,
    -- Quien la anotó ya lo sabe.
    new.reportada_por,
    true);
  perform public.avisar_al_huesped_del_paquete(
    v_huesped, v_unidad, 'correspondencia_incidencia',
    'Novedad con tu paquete', v_texto, new.correspondencia_id, new.reportada_por);

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.notificar_reclamo()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_quien  uuid := auth.uid();
  v_titulo text := coalesce(new.numero || ' · ', '') || new.titulo;
begin
  if tg_op = 'INSERT' then
    if new.area = 'aplicacion' then
      return new;
    end if;

    -- La administración.
    insert into public.notificacion
      (usuario_id, condominio_id, tipo, titulo, mensaje, entidad_tipo, entidad_id)
    select distinct mc.usuario_id, new.condominio_id, 'reclamo_nuevo'::public.motivo_notificacion,
           'Nueva PQRS', v_titulo, 'reclamo', new.id
    from public.membresia_condominio mc
    where mc.condominio_id = new.condominio_id
      and mc.rol in ('administrador', 'coadministrador')
      and mc.activo
      and mc.usuario_id is not null
      and mc.usuario_id is distinct from new.creado_por
      and public.quiere_aviso(mc.usuario_id, 'reclamo_nuevo', 'app');

    -- El anfitrión, si le toca (la misma condición que su lectura).
    if new.unidad_id is not null and (
         new.destinatario = 'propietario'
         or exists (select 1 from public.membresia_unidad h
                    where h.unidad_id = new.unidad_id
                      and h.usuario_id = new.creado_por
                      and h.rol = 'huesped_temporal')) then
      insert into public.notificacion
        (usuario_id, condominio_id, tipo, titulo, mensaje, entidad_tipo, entidad_id)
      select distinct m.usuario_id, new.condominio_id, 'reclamo_nuevo'::public.motivo_notificacion,
             'Nueva PQRS de tu vivienda', v_titulo, 'reclamo', new.id
      from public.membresia_unidad m
      where m.unidad_id = new.unidad_id
        and m.activo
        and m.usuario_id is not null
        and m.rol in ('propietario', 'inquilino_lider')
        and m.usuario_id is distinct from new.creado_por
        and public.quiere_aviso(m.usuario_id, 'reclamo_nuevo', 'app')
        -- Quien ya recibió el de la administración no recibe dos.
        and not exists (select 1 from public.notificacion n
                        where n.usuario_id = m.usuario_id and n.entidad_id = new.id);
    end if;

  elsif (new.estado, new.resolucion) is distinct from (old.estado, old.resolucion)
        and new.creado_por is not null
        and new.creado_por is distinct from v_quien then
    insert into public.notificacion
      (usuario_id, condominio_id, tipo, titulo, mensaje, entidad_tipo, entidad_id)
    select new.creado_por, new.condominio_id, 'reclamo_respondido'::public.motivo_notificacion,
           case new.estado
             when 'resuelto' then 'Tu PQRS se resolvió'
             when 'en_curso' then 'Tu PQRS está en curso'
             else 'Tu PQRS tiene novedades'
           end,
           coalesce(left(new.resolucion, public.parametro_entero('aviso_texto_largo')), v_titulo),
           'reclamo', new.id
    where public.quiere_aviso(new.creado_por, 'reclamo_respondido', 'app');
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.atender_sos(p_alarma_id uuid, p_que_paso text, p_que_vio text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  a            public.alarma_sos%rowtype;
  v_unidad     text;
  v_id         uuid;
  v_es_huesped boolean;
  v_mensaje    text;
begin
  select * into a from public.alarma_sos where id = p_alarma_id for update;
  if a.id is null then
    raise exception 'Esa alarma no existe';
  end if;
  if not public.es_personal_condominio(a.condominio_id) then
    raise exception 'Solo la porteria o la administracion atienden un S.O.S.';
  end if;
  if a.cerrada_en is not null then
    raise exception 'Esa alarma ya estaba cerrada';
  end if;
  if coalesce(btrim(p_que_paso), '') = '' or coalesce(btrim(p_que_vio), '') = '' then
    raise exception 'Escribe que paso y que viste: queda como incidencia';
  end if;

  select codigo into v_unidad from public.unidad where id = a.unidad_id;

  insert into public.reclamo (
    condominio_id, unidad_id, tipo, categoria, area, titulo, descripcion,
    creado_por, alarma_sos_id
  ) values (
    a.condominio_id, a.unidad_id, 'reclamo', 'seguridad', 'condominio',
    'Incidencia de S.O.S.' || coalesce(' · vivienda ' || v_unidad, ''),
    'Qué pasó: ' || btrim(p_que_paso) || chr(10) || 'Qué vio la portería: ' || btrim(p_que_vio),
    auth.uid(), a.id
  )
  returning id into v_id;

  update public.alarma_sos
     set cerrada_en  = now(),
         cerrada_por = auth.uid(),
         cierre      = 'atendida'
   where id = a.id;

  -- Que se entere quien pidió auxilio (hueco 15). Y si era un huésped, quien
  -- vive en la vivienda, que ya recibió el aviso de la alarma.
  v_es_huesped := a.unidad_id is not null and exists (
    select 1 from public.membresia_unidad m
    where m.unidad_id = a.unidad_id and m.usuario_id = a.usuario_id
      and m.rol = 'huesped_temporal' and m.activo);

  v_mensaje := 'La portería atendió el S.O.S.'
    || coalesce(' de la vivienda ' || v_unidad, '')
    || ' y dejó la incidencia: ' || left(btrim(p_que_paso), public.parametro_entero('aviso_texto_largo'));

  insert into public.notificacion
    (usuario_id, condominio_id, tipo, titulo, mensaje, entidad_tipo, entidad_id)
  select distinct d.usuario_id, a.condominio_id, 'sos_atendido'::public.motivo_notificacion,
         'S.O.S. atendido', v_mensaje, 'alarma_sos', a.id
  from (
    select a.usuario_id
    union
    select mu.usuario_id
    from public.membresia_unidad mu
    where v_es_huesped
      and mu.unidad_id = a.unidad_id
      and mu.activo
      and mu.puede_acceder
      and mu.rol <> 'huesped_temporal'
  ) d
  where d.usuario_id is not null
    and d.usuario_id <> auth.uid()
    and public.quiere_aviso(d.usuario_id, 'sos_atendido', 'app');

  return v_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.asignar_numero_contrato()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.numero is null or new.numero = '' then
    new.numero := lpad(nextval('public.contrato_numero_seq')::text, public.parametro_entero('numero_digitos_contrato'), '0');
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.asignar_numero_reclamo()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.numero is null or new.numero = '' then
    new.numero := lpad(nextval('public.reclamo_numero_seq')::text, public.parametro_entero('numero_digitos_pqrs'), '0');
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.asignar_numero_reserva()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.numero is null or new.numero = '' then
    new.numero := lpad(nextval('public.reserva_numero_seq')::text, public.parametro_entero('numero_digitos_reserva'), '0');
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.es_estancia_corta(p_unidad_id uuid, p_noches integer)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select case
    -- Sin noches no hay nada que clasificar; se trata como corta, que es el
    -- lado con mas limites.
    when p_noches is null or p_noches <= 0 then public.parametro_booleano('estancia_sin_noches_es_corta')
    else coalesce(
      p_noches <= (select p.corta_hasta_noches
                   from public.permisos_de_unidad(p_unidad_id) p),
      public.parametro_booleano('estancia_sin_noches_es_corta')
    )
  end;
$function$
;

CREATE OR REPLACE FUNCTION public.quiere_aviso(p_usuario_id uuid, p_motivo motivo_notificacion, p_canal text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select case
    -- La alarma de panico va siempre y por todo lo que haya.
    when p_motivo = 'sos_activado' then true
    when p_canal = 'app' then coalesce(
      (select p.por_app from public.preferencia_aviso p
       where p.usuario_id = p_usuario_id and p.motivo = p_motivo), public.parametro_booleano('avisos_app_por_defecto'))
    when p_canal = 'correo' then coalesce(
      (select p.por_correo from public.preferencia_aviso p
       where p.usuario_id = p_usuario_id and p.motivo = p_motivo), public.parametro_booleano('avisos_correo_por_defecto'))
    when p_canal = 'whatsapp' then coalesce(
      (select p.por_whatsapp from public.preferencia_aviso p
       where p.usuario_id = p_usuario_id and p.motivo = p_motivo), public.parametro_booleano('avisos_whatsapp_por_defecto'))
    -- Un canal que no existe no recibe nada. Mejor que `true`: un error de
    -- escritura en el nombre no debe convertirse en avisar por todas partes.
    else false
  end;
$function$
;

CREATE OR REPLACE FUNCTION public.llamadas_sin_contestar()
 RETURNS integer
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  with perdidas as (
    update public.llamada_internet
       set estado = 'perdida', terminada_en = now()
     where estado = 'sonando'
       and created_at < now() - make_interval(secs => public.parametro_entero('llamada_segundos_sin_contestar'))
    returning 1
  )
  select count(*)::integer from perdidas;
$function$
;

CREATE OR REPLACE FUNCTION public.calendarios_por_sincronizar()
 RETURNS TABLE(unidad_id uuid, ultima_vez timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  with ajustes as (
    select
      public.parametro_entero('calendario_intervalo_minutos') as minutos,
      public.parametro_entero('calendario_max_por_pasada') as tope
  ),
  candidatas as (
    select
      s.unidad_id,
      nullif(greatest(
        coalesce(s.ical_sincronizado_en, '-infinity'::timestamptz),
        coalesce(s.ical_pedido_en, '-infinity'::timestamptz)
      ), '-infinity'::timestamptz) as ultima_vez
    from public.suscripcion_renta_corta s
    where s.estado = 'activa'
      and s.cancelada_en is null
      and nullif(btrim(coalesce(s.ical_url, '')), '') is not null
  )
  select c.unidad_id, c.ultima_vez
  from candidatas c, ajustes a
  where c.ultima_vez is null
     or c.ultima_vez < now() - make_interval(mins => a.minutos)
  -- Las que llevan mas tiempo sin leerse, primero; las nunca leidas, antes.
  order by c.ultima_vez asc nulls first
  limit (select tope from ajustes);
$function$
;

-- ============================================================================
-- Topes que estaban escritos dentro de una restricción
-- ============================================================================

/*
  El día de la cuota (28) y el largo del apodo (40) estaban dentro de un CHECK.
  Un CHECK no puede leer el parámetro con garantías, así que el límite físico
  se queda en la restricción (un día del mes existe del 1 al 31; un apodo tiene
  al menos una letra) y el de negocio lo pone un disparador que lee el parámetro.
*/
alter table public.condominio drop constraint if exists condominio_cuota_dia_del_mes;
alter table public.condominio add constraint condominio_cuota_dia_del_mes
  check (cuota_dia_vencimiento is null or cuota_dia_vencimiento between 1 and 31);

alter table public.membresia_unidad drop constraint if exists membresia_unidad_apodo_con_texto;
alter table public.membresia_unidad add constraint membresia_unidad_apodo_con_texto
  check (apodo is null or char_length(btrim(apodo)) >= 1);

create or replace function public.respetar_topes_de_parametros()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
declare
  -- Por JSON y no new.campo: el disparador lo comparten dos tablas y cada una
  -- tiene solo una de las dos columnas; pedirle a una la de la otra revienta.
  v jsonb := to_jsonb(new);
begin
  if tg_table_name = 'condominio' and v->>'cuota_dia_vencimiento' is not null
     and (v->>'cuota_dia_vencimiento')::int > public.parametro_entero('cuota_dia_vencimiento_maximo') then
    raise exception 'El día de vencimiento va del 1 al %.', public.parametro_entero('cuota_dia_vencimiento_maximo');
  end if;
  if tg_table_name = 'membresia_unidad' and v->>'apodo' is not null
     and char_length(btrim(v->>'apodo')) > public.parametro_entero('apodo_largo_maximo') then
    raise exception 'El apodo puede tener como mucho % caracteres.', public.parametro_entero('apodo_largo_maximo');
  end if;
  return new;
end;
$$;

comment on function public.respetar_topes_de_parametros() is
  'Disparador: el día de vencimiento de la cuota y el largo del apodo no pasan de lo que dicen sus parámetros.';

drop trigger if exists condominio_topes_de_parametros on public.condominio;
create trigger condominio_topes_de_parametros
  before insert or update of cuota_dia_vencimiento on public.condominio
  for each row execute function public.respetar_topes_de_parametros();

drop trigger if exists membresia_unidad_topes_de_parametros on public.membresia_unidad;
create trigger membresia_unidad_topes_de_parametros
  before insert or update of apodo on public.membresia_unidad
  for each row execute function public.respetar_topes_de_parametros();

/*
  servicio_dia_aviso_maximo se sembró por error: el 31 de los avisos de un
  servicio es el último día que existe en un mes, no una decisión de negocio.
  Se retira (es la fila recién creada, no un dato del cliente).
*/
delete from public.configuracion_plataforma where clave = 'servicio_dia_aviso_maximo';
delete from public.configuracion_historial where clave = 'servicio_dia_aviso_maximo';

-- ============================================================================
-- Valores por defecto de columnas
-- ============================================================================

alter table public.suscripcion_renta_corta
  alter column verificaciones_base set default public.parametro_entero('verificaciones_incluidas'),
  alter column estacionamientos_huesped set default public.parametro_entero('renta_corta_estacionamientos_por_defecto'),
  alter column recordatorio_al_huesped set default public.parametro_booleano('preregistro_recordatorio_encendido'),
  alter column recordatorio_al_anfitrion set default public.parametro_booleano('preregistro_recordatorio_encendido');

alter table public.condominio
  alter column cuota_automatica set default public.parametro_booleano('cuota_automatica_por_defecto'),
  alter column verificar_documento_visitas set default public.parametro_booleano('porteria_verifica_documento_por_defecto');

alter table public.publicacion
  alter column avisar set default public.parametro_booleano('publicacion_avisar_por_defecto');

alter table public.membresia_unidad
  alter column contactable_chat set default public.parametro_booleano('persona_contactable_por_defecto'),
  alter column contactable_whatsapp set default public.parametro_booleano('persona_contactable_por_defecto'),
  alter column datos_visibles set default public.parametro_booleano('persona_datos_visibles_por_defecto');

alter table public.preferencia_aviso
  alter column por_app set default public.parametro_booleano('avisos_app_por_defecto'),
  alter column por_correo set default public.parametro_booleano('avisos_correo_por_defecto'),
  alter column por_whatsapp set default public.parametro_booleano('avisos_whatsapp_por_defecto');

alter table public.zona_comun
  alter column cupos_simultaneos set default public.parametro_entero('zona_cupos_por_defecto');
-- tiempo_min_entre_reservas se queda en 0 en la tabla: el 30 es lo que propone
-- el formulario de una zona nueva (parámetro zona_tiempo_entre_reservas_por_defecto),
-- no lo que la base supone si no llega nada.
