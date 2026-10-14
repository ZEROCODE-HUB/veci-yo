/*
  El cierre del preregistro lanza la consulta real (14/10/2026).

  Hasta hoy `cerrar_precheckin` anotaba una verificacion `simulado` y solo del
  titular, y la consulta a Tus Datos --que ya funcionaba contra su ambiente de
  pruebas-- no la llamaba nadie. Ahora:

  - al cerrar se encola una llamada a `verificar-antecedentes` por cada adulto;
  - un cron cada 5 minutos recoge las que quedaron `pendiente` (la consulta
    tarda ~1 minuto) sin lanzar otra, o sea sin pagar otra vez;
  - y el cierre exige la fecha de expedicion a quien la necesita.

  Las tres funciones nuevas son internas: llevan la clave de servicio.

  Solo aditiva: funciones y un cron.
*/

create extension if not exists pg_net with schema extensions;

create or replace function public.encolar_verificacion(p_invitado_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp, extensions
as $fn$
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
    timeout_milliseconds := 60000
  );
end;
$fn$;

comment on function public.encolar_verificacion(uuid) is
  'Pide a la funcion verificar-antecedentes la consulta de un huesped, con la clave de servicio. Interna.';

/* Los adultos de la estancia que todavia no tienen verificacion. */
create or replace function public.encolar_verificaciones_de_visita(p_visita_id uuid)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_id uuid;
  v_n  int := 0;
begin
  for v_id in
    select i.id
    from public.invitado i
    where i.visita_id = p_visita_id
      and not i.es_menor
      and coalesce(btrim(i.documento_numero), '') <> ''
      and not exists (
        select 1 from public.verificacion_antecedentes va
        where va.invitado_id = i.id
          and va.proveedor is distinct from 'simulado'
      )
    order by i.orden
  loop
    perform public.encolar_verificacion(v_id);
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$fn$;

comment on function public.encolar_verificaciones_de_visita(uuid) is
  'Encola la consulta de antecedentes de cada adulto de una estancia que no la tenga ya. Interna.';

/*
  Las que quedaron a medias. Tus Datos guarda el resultado dos horas; pasado
  eso el identificador no sirve y no se insiste.
*/
create or replace function public.recoger_verificaciones_pendientes()
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_id uuid;
  v_n  int := 0;
begin
  for v_id in
    select va.invitado_id
    from public.verificacion_antecedentes va
    where va.resultado = 'pendiente'
      and va.proveedor like 'tusdatos%'
      and va.ejecutada_en < now() - interval '2 minutes'
      and va.ejecutada_en > now() - interval '2 hours'
    limit 50
  loop
    perform public.encolar_verificacion(v_id);
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$fn$;

comment on function public.recoger_verificaciones_pendientes() is
  'Vuelve a llamar a verificar-antecedentes por las consultas pendientes de menos de dos horas: las recoge sin lanzar otra. La llama pg_cron. Interna.';

revoke all on function public.encolar_verificacion(uuid) from public, anon, authenticated;
revoke all on function public.encolar_verificaciones_de_visita(uuid) from public, anon, authenticated;
revoke all on function public.recoger_verificaciones_pendientes() from public, anon, authenticated;
grant execute on function public.encolar_verificacion(uuid) to service_role;
grant execute on function public.encolar_verificaciones_de_visita(uuid) to service_role;
grant execute on function public.recoger_verificaciones_pendientes() to service_role;

do $$
begin
  perform cron.unschedule('verificaciones-pendientes')
  where exists (select 1 from cron.job where jobname = 'verificaciones-pendientes');
end $$;

select cron.schedule(
  'verificaciones-pendientes',
  '*/5 * * * *',
  $$select public.recoger_verificaciones_pendientes()$$
);

create or replace function public.cerrar_precheckin(p_token text)
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

  /*
    La fecha de expedicion, para cedula de extranjeria y PPT (14/10/2026).
    Sin ella Tus Datos no los consulta, y entonces esa persona entraria sin la
    consulta que el KT pide para todo huesped.
  */
  select string_agg(nombre, ', ' order by orden) into v_faltan
  from (
    select nombre, orden
    from public.invitado
    where visita_id = v_visita.id
      and not es_menor
      and tipo_documento in ('cedula_extranjeria', 'ppt')
      and documento_fecha_expedicion is null
    order by orden
    limit 3
  ) sinExpedicion;

  if v_faltan is not null then
    raise exception 'Falta la fecha de expedicion del documento de: %.', v_faltan;
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

  /*
    La consulta de antecedentes de **cada adulto**, de verdad (14/10/2026).

    Antes se anotaba una `simulado` y solo del titular. Ahora se encola una
    llamada a `verificar-antecedentes` por persona: sale al cerrar la
    transaccion y la funcion reserva el cupo, consulta y guarda. Si Tus Datos
    esta apagado, la funcion sigue anotando `simulado` como antes.

    Si encolar falla no se tumba el cierre --el huesped ya hizo su parte-- pero
    **se dice**: queda en `precheckin_aviso`, que es lo que ve el anfitrion. La
    version anterior se tragaba el error.
  */
  begin
    perform public.encolar_verificaciones_de_visita(v_visita.id);
  exception when others then
    update public.visita
       set precheckin_aviso = 'No se pudo lanzar la consulta de antecedentes: ' || sqlerrm
     where id = v_visita.id;
  end;

  return v_token;
end;
$function$;
