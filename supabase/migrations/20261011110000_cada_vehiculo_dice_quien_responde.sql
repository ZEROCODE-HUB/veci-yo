-- El cierre del preregistro exige que cada vehiculo diga quien responde.
--
-- Aditiva: solo reemplaza `cerrar_precheckin`, con el mismo cuerpo que la
-- version viva mas un bloque, justo despues de la comprobacion de las reglas
-- del edificio.
--
-- Hasta aqui el responsable solo era obligatorio en el vehiculo que apuntaba
-- el propio huesped. El que apunta el anfitrion al reservar nacia sin el y
-- nadie lo completaba. El cliente, el 09/10/2026: se pone en el preregistro.

CREATE OR REPLACE FUNCTION public.cerrar_precheckin(p_token text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp', 'auth'
AS $function$
declare
  v_cuantos int;
  v_visita    public.visita%rowtype;
  v_titular   public.invitado%rowtype;
  v_anfitrion uuid;
  v_faltan    text;
  v_token     text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  select * into v_visita
  from public.visita
  where precheckin_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and precheckin_expira_en > now()
  for update;

  if v_visita.id is null then
    raise exception 'Ese enlace no vale o ya vencio';
  end if;

  if v_visita.precheckin_completado_en is not null then
    raise exception 'Este preregistro ya estaba cerrado';
  end if;

  select * into v_titular
  from public.invitado where visita_id = v_visita.id and es_titular;

  if v_titular.id is null
     or coalesce(btrim(v_titular.documento_numero), '') = ''
     or coalesce(btrim(v_titular.correo), '') = '' then
    raise exception 'Faltan tus datos: el documento y el correo son obligatorios';
  end if;

  /*
    Y que el titular sea mayor de edad. Es quien responde por la estancia y
    quien recibe el acceso a la aplicacion: si la fecha que escribio lo hace
    menor, o se equivoco al teclearla o esta reserva necesita otro titular.

    Solo se comprueba cuando dio su fecha: sin ella no hay nada que mirar, y
    suponerlo seria inventarse el dato.
  */
  if v_titular.es_menor then
    raise exception
      'Quien reserva tiene que ser mayor de edad. Si la fecha de nacimiento esta mal, corrigela; si no, la reserva la tiene que cerrar un adulto.';
  end if;

  if not v_titular.terminos_aceptados then
    raise exception 'Hace falta aceptar los terminos y condiciones';
  end if;

  /*
    Y que estén **todas las personas de la reserva**.

    El 09/10/2026 el cliente reservo para cuatro, no lleno a nadie mas, y el
    preregistro cerro igual. No era un descuido de las comprobaciones de abajo:
    todas miran las fichas que existen, y solo existia la suya. Los
    acompañantes sin nombre no se crean --los rellena el huesped-- asi que no
    habia nada de lo que quejarse.

    `huespedes_previstos` es de hoy mismo y esta funcion es de antes: nadie
    comparaba las dos cosas. Se compara ahora, y **solo por defecto**: una
    reserva vieja o una del calendario de Airbnb no trae el numero, y entonces
    esto no dice nada, como hasta ahora.

    Si al final viene menos gente, **el anfitrion cambia el numero de la
    reserva** y este enlace se actualiza solo. Lo decidio asi el cliente: el
    huesped no deberia poder cambiar lo que el anfitrion reservo.
  */
  if v_visita.huespedes_previstos is not null then
    select count(*) into v_cuantos
    from public.invitado where visita_id = v_visita.id;

    if v_cuantos < v_visita.huespedes_previstos then
      raise exception
        'Esta reserva es para % personas y hay % registrada(s). Añadí a quien falte, o pedile al anfitrión que cambie el número.',
        v_visita.huespedes_previstos, v_cuantos;
    end if;
  end if;

  select string_agg(nombre, ', ' order by orden) into v_faltan
  from (
    select nombre, orden
    from public.invitado
    where visita_id = v_visita.id
      and not es_titular
      and not es_menor
      and not terminos_aceptados
    order by orden
    limit 3
  ) pendientes;

  if v_faltan is not null then
    raise exception
      'Falta que acepten los terminos: %. A cada uno le llega su propio enlace; nadie puede aceptarlos por el.',
      v_faltan;
  end if;

  /*
    Y las reglas del edificio para huespedes, que son otra cosa que los
    terminos: los terminos son el contrato; las reglas, como se convive aqui
    --ruido, visitas, piscina--. El cliente lo pidio el 09/10/2026: que el
    huesped las tenga que recorrer y aceptar en su preregistro.

    **Solo si el edificio tiene unas vigentes.** Uno que no las ha escrito no
    puede exigir que se acepten, y bloquear ahi dejaria a todos sus huespedes
    sin poder terminar por algo que no depende de ellos.

    Todos los adultos, el titular incluido. Quien entro por excepcion --no pudo
    aceptar por si mismo y alguien respondio por el-- queda cubierto por esa
    misma excepcion.
  */
  if exists (
    select 1 from public.reglamento r
    where r.condominio_id = v_visita.condominio_id
      and r.tipo = 'huesped_temporal'
      and r.vigente
  ) then
    select string_agg(nombre, ', ' order by orden) into v_faltan
    from (
      select nombre, orden
      from public.invitado
      where visita_id = v_visita.id
        and not es_menor
        and reglamento_aceptado_en is null
        and not terminos_excepcion
      order by orden
      limit 3
    ) sinReglas;

    if v_faltan is not null then
      raise exception
        'Falta que acepten las reglas del edificio: %. Cada adulto las acepta desde su enlace.',
        v_faltan;
    end if;
  end if;

  /*
    Cada vehiculo dice quien responde por el.

    El anfitrion puede apuntar una placa al reservar, y entonces todavia no
    sabe quien viene: ese vehiculo nace sin responsable. El cliente lo aclaro
    el 09/10/2026: quien lo completa es el huesped, en su preregistro. Asi que
    aqui se exige, igual que el documento de un adulto que se apunto sin datos.
  */
  select string_agg(placa, ', ' order by placa) into v_faltan
  from (
    select placa
    from public.vehiculo_visita
    where visita_id = v_visita.id
      and responsable_invitado_id is null
    order by placa
    limit 3
  ) sinResponsable;

  if v_faltan is not null then
    raise exception
      'Falta decir quien responde por el vehiculo: %. Elige a un adulto de la reserva.',
      v_faltan;
  end if;

  select string_agg(nombre, ', ' order by orden) into v_faltan
  from (
    select nombre, orden
    from public.invitado
    where visita_id = v_visita.id
      and not es_titular
      and not es_menor
      and coalesce(btrim(documento_numero), '') = ''
    order by orden
    limit 3
  ) sinDocumento;

  if v_faltan is not null then
    raise exception 'Falta el documento de: %.', v_faltan;
  end if;

  -- Los menores: quien responde por cada uno ----------------------------------

  select string_agg(nombre, ', ' order by orden) into v_faltan
  from (
    select nombre, orden
    from public.invitado
    where visita_id = v_visita.id
      and es_menor
      and responsable_id is null
    order by orden
    limit 3
  ) sinResponsable;

  if v_faltan is not null then
    raise exception
      'Falta decir quien responde por: %. Tiene que ser un adulto de esta misma reserva.',
      v_faltan;
  end if;

  /*
    Y el papel, cuando no es su padre ni su madre.

    Se mira contra `autorizacion_menor.responsable_id` y no solo contra la
    existencia de la fila: si el titular sube el permiso de un tio y despues
    cambia el responsable a otra persona, el papel que hay esta a nombre de
    quien ya no viene. Esa comprobacion es la razon de que esa columna exista.
  */
  select string_agg(nombre, ', ' order by orden) into v_faltan
  from (
    select i.nombre, i.orden
    from public.invitado i
    where i.visita_id = v_visita.id
      and i.es_menor
      and i.parentesco in ('tutor_legal', 'otro')
      and not exists (
        select 1 from public.autorizacion_menor a
        where a.invitado_id = i.id
          and a.responsable_id is not distinct from i.responsable_id
      )
    order by i.orden
    limit 3
  ) sinPapel;

  if v_faltan is not null then
    raise exception
      'Falta la autorizacion firmada para: %. Hace falta cuando quien lo trae no es su padre ni su madre.',
      v_faltan;
  end if;

  select m.usuario_id into v_anfitrion
  from public.membresia_unidad m
  where m.unidad_id = v_visita.unidad_id
    and m.rol = 'propietario' and m.activo
  order by m.created_at limit 1;

  if v_anfitrion is null then
    raise exception 'Esta vivienda no tiene un propietario registrado';
  end if;

  insert into public.invitacion (
    condominio_id, ambito, unidad_id, rol_unidad,
    correo, nombre, token_hash, invitada_por, expira_en,
    vigente_desde, vigente_hasta, invitado_id
  ) values (
    v_visita.condominio_id, 'unidad', v_visita.unidad_id, 'huesped_temporal',
    lower(btrim(v_titular.correo)),
    btrim(v_titular.nombre || ' ' || coalesce(v_titular.apellidos, '')),
    encode(extensions.digest(v_token, 'sha256'), 'hex'),
    v_anfitrion,
    coalesce(v_visita.fecha_hasta + 1, current_date + 30)::timestamptz,
    v_visita.fecha_desde, v_visita.fecha_hasta, v_titular.id
  );

  update public.visita
  set precheckin_completado_en = now()
  where id = v_visita.id;

  update public.invitado
  set precheckin_completado_en = now()
  where id = v_titular.id;

  begin
    perform public.anotar_verificacion(v_titular.id);
  exception when others then
    null;
  end;

  return v_token;
end;
$function$

;

notify pgrst, 'reload schema';
