-- ----------------------------------------------------------------------------
-- El preregistro no se cierra hasta que todos los adultos aceptan
-- ----------------------------------------------------------------------------
-- `cerrar_precheckin` comprobaba **solo al titular**: su documento, su correo y
-- sus terminos. Un preregistro se cerraba con cuatro acompañantes que no habian
-- aceptado nada y, los que tenian documento, lo tenian porque se lo habia
-- tecleado otra persona.
--
-- Decidido con el cliente el 02/10/2026: el titular puede llenar los datos de
-- todos, pero **cada adulto acepta sus propios terminos**. Aceptar unas
-- condiciones en nombre de otro adulto no vale.
--
-- Los menores quedan fuera de la exigencia: no se les pide documento propio ni
-- se les hace aceptar nada. Por ellos responde quien les acompaña, y esa es
-- otra conversacion --el parentesco-- que todavia no esta construida.
--
-- Esto **cambia comportamiento visible**: una reserva con acompañantes que no
-- han aceptado deja de poder cerrarse. Es lo que se quiere, y el mensaje dice
-- quien falta por su nombre para que se pueda arreglar sin adivinar.
--
-- Solo se reemplaza la funcion. Ninguna tabla cambia.

create or replace function public.cerrar_precheckin(p_token text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp, auth
as $fn$
declare
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

  if not v_titular.terminos_aceptados then
    raise exception 'Hace falta aceptar los terminos y condiciones';
  end if;

  /*
    Y los acompañantes adultos, cada uno los suyos.

    Se nombran los que faltan en vez de decir «falta alguien»: con cuatro
    acompañantes, un mensaje generico obliga al titular a adivinar a quien
    llamar. Se corta en tres para que el mensaje siga siendo legible.
  */
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

  -- Y que tengan documento. Igual que al titular, y por el mismo motivo: es lo
  -- que la porteria compara en la puerta.
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

  -- Quien figura como emisor del acceso. Es el propietario de la vivienda: el
  -- huesped no puede invitarse a si mismo, aunque sea su mano la que pulsa.
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
    -- Vence con la estancia, no a los siete dias: un acceso que sobrevive a la
    -- salida del huesped es una llave que se queda fuera.
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
    La verificacion de antecedentes corre aqui. Si no se puede --la vivienda no
    tiene suscripcion, o se acabaron las verificaciones-- NO se bloquea el
    cierre: que un huesped no pueda terminar su registro porque su anfitrion no
    renovo un plan seria castigar a quien no decide.
  */
  begin
    perform public.anotar_verificacion(v_titular.id);
  exception when others then
    null;
  end;

  return v_token;
end;
$fn$;

comment on function public.cerrar_precheckin(text) is
  'Cierra el preregistro y emite el acceso del titular. Exige que cada acompañante adulto haya aceptado sus propios terminos y tenga documento; los menores quedan fuera.';
