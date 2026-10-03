-- ----------------------------------------------------------------------------
-- Ningun menor entra sin quien responda por el
-- ----------------------------------------------------------------------------
-- `cerrar_precheckin` deja fuera a los menores de todas sus comprobaciones --no
-- se les pide documento ni terminos, y eso esta bien-- pero entonces un niño
-- podia pasar la puerta **sin que nadie dijera quien lo trae**.
--
-- El cliente lo pidio asi el 02/10/2026: «Menores sin padre o madre siempre
-- pedir documentacion del responsable pues!». O sea dos cosas distintas:
--
--   · **todo** menor tiene que tener responsable, sea quien sea;
--   · y si ese responsable **no es el padre ni la madre**, hace falta el papel.
--
-- Padre y madre no lo necesitan porque su vinculo no se acredita con un permiso
-- de viaje: o se es o no se es. A un tio, un abuelo o un amigo de la familia si,
-- y es exactamente la situacion en la que un edificio no quiere equivocarse.
--
-- El texto de la advertencia ya existia --`VisitasNuevoScreen`, donde el
-- anfitrion da de alta la visita-- y **el huesped no lo veia nunca**. Ahora la
-- regla esta donde tiene efecto.
--
-- CAMBIO DE COMPORTAMIENTO VISIBLE: una reserva con un menor sin responsable, o
-- con un responsable que no es su padre ni su madre y sin el permiso subido,
-- deja de poder cerrarse.
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
$fn$;

comment on function public.cerrar_precheckin(text) is
  'Cierra el preregistro y emite el acceso del titular. Exige que cada adulto acepte lo suyo y tenga documento, y que cada menor tenga un responsable --con su permiso firmado si no es el padre ni la madre--.';
