-- La ficha del huésped se completa: horas, vehículos y reglas del edificio
--
-- Tres cosas que el prechequeo no pedía y que la portería y el anfitrión
-- necesitan. Las pidió el cliente el 09/10/2026, parte dictada por la
-- responsable de producto:
--
--   · «Confirmación de que el prechecking marque hora aprox de ingreso y
--     salida». Las columnas `visita.hora_estimada_llegada/salida` existen
--     desde el primer día y **nadie las escribía** desde el prechequeo; un
--     comentario de la aplicación decía «las pone el huésped en su
--     preregistro», y no era verdad.
--   · «Responsable del vehículo, en el formulario». `vehiculo_visita` tiene
--     placa, tipo, marca y color, y **no dice de quién es**. Y la web ni
--     siquiera pedía vehículos, aunque la portada los anuncia.
--   · Que el huésped **recorra y acepte las reglas del edificio** junto con
--     los términos. Las reglas viven en `reglamento` —tipo `huesped_temporal`—
--     y solo se podían leer con sesión, que el huésped no tiene.
--
-- Aditiva: columnas, un disparador, funciones nuevas, y `cerrar_precheckin`
-- reemplazada con la misma firma. No se toca ninguna función existente salvo
-- esa: las horas y el estado van por funciones propias en vez de cambiarle la
-- firma a `guardar_precheckin`, que la llaman la web y media docena de
-- recorridos.

-- ============================================================================
-- 0. De quién es este enlace, sea del titular o de un acompañante
-- ============================================================================
-- Hay dos clases de token —el de la estancia en `visita`, el de cada
-- acompañante en `invitado`— y las reglas las acepta cada adulto con el suyo.
-- Esto resuelve los dos a «qué estancia, qué persona, y si es el titular».
--
-- Interna: no se concede a nadie. Las funciones de abajo son `definer` y la
-- alcanzan; llamarla suelta sería una forma de probar tokens.

create or replace function public.persona_del_enlace(p_token text)
returns table (visita_id uuid, invitado_id uuid, es_titular boolean)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  (
    select v.id, i.id, true
    from public.visita v
    left join public.invitado i on i.visita_id = v.id and i.es_titular
    where v.precheckin_token_hash
          = encode(extensions.digest(p_token, 'sha256'), 'hex')
      and v.precheckin_expira_en > now()
    limit 1
  )
  union all
  (
    select i.visita_id, i.id, false
    from public.invitado i
    join public.visita v on v.id = i.visita_id
    where i.precheckin_token_hash
          = encode(extensions.digest(p_token, 'sha256'), 'hex')
      and v.precheckin_expira_en > now()
    limit 1
  )
  limit 1;
$$;

comment on function public.persona_del_enlace(text) is
  'La estancia y la persona detras de un enlace de preregistro, sea el del '
  'titular o el de un acompañante. Interna.';

revoke all on function public.persona_del_enlace(text) from public, anon, authenticated;
grant execute on function public.persona_del_enlace(text) to service_role;

-- ============================================================================
-- 1. Las horas
-- ============================================================================

create or replace function public.guardar_horas_precheckin(
  p_token        text,
  p_hora_llegada time,
  p_hora_salida  time
)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_visita uuid;
begin
  -- Solo el titular: la hora es de la estancia, no de cada persona, y con el
  -- enlace de un acompañante cualquiera podria moverla.
  select v.id into v_visita
  from public.visita v
  where v.precheckin_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and v.precheckin_expira_en > now();

  if v_visita is null then
    raise exception 'Ese enlace no vale o ya vencio';
  end if;

  if exists (select 1 from public.visita v
             where v.id = v_visita and v.precheckin_completado_en is not null) then
    raise exception 'Este preregistro ya esta cerrado';
  end if;

  update public.visita
     set hora_estimada_llegada = p_hora_llegada,
         hora_estimada_salida  = p_hora_salida
   where id = v_visita;
end;
$$;

comment on function public.guardar_horas_precheckin(text, time, time) is
  'La hora aproximada a la que el huesped llega el primer dia y se va el '
  'ultimo. Son aproximadas y no obligan a nada: sirven para que la porteria '
  'sepa cuando esperarlo.';

grant execute on function public.guardar_horas_precheckin(text, time, time)
  to anon, authenticated;

-- ============================================================================
-- 2. Las reglas del edificio
-- ============================================================================

alter table public.invitado
  add column if not exists reglamento_id uuid references public.reglamento(id),
  add column if not exists reglamento_aceptado_en timestamptz;

comment on column public.invitado.reglamento_aceptado_en is
  'Cuando acepto las reglas del edificio para huespedes. Nulo es «todavia '
  'no», no «se nego»: nada lo pone a otra cosa que a una fecha.';
comment on column public.invitado.reglamento_id is
  'Que version de las reglas acepto, para que siga siendo identificable el '
  'dia que el edificio las cambie.';

create or replace function public.reglamento_de_la_estancia(p_token text)
returns table (id uuid, titulo text, contenido jsonb, version int)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select r.id, r.titulo, r.contenido, r.version
  from public.persona_del_enlace(p_token) p
  join public.visita v on v.id = p.visita_id
  join public.reglamento r
    on r.condominio_id = v.condominio_id
   and r.tipo = 'huesped_temporal'
   and r.vigente
  limit 1;
$$;

comment on function public.reglamento_de_la_estancia(text) is
  'Las reglas del edificio para huespedes, leidas con el enlace del '
  'preregistro. Vacio si el edificio no tiene unas vigentes.';

grant execute on function public.reglamento_de_la_estancia(text)
  to anon, authenticated;

create or replace function public.aceptar_reglamento_precheckin(p_token text)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_visita     uuid;
  v_invitado   uuid;
  v_reglamento uuid;
begin
  select p.visita_id, p.invitado_id into v_visita, v_invitado
  from public.persona_del_enlace(p_token) p;

  if v_visita is null then
    raise exception 'Ese enlace no vale o ya vencio';
  end if;
  if v_invitado is null then
    raise exception 'Primero hay que llenar los datos de quien reserva';
  end if;

  select r.id into v_reglamento
  from public.reglamento r
  join public.visita v on v.condominio_id = r.condominio_id
  where v.id = v_visita and r.tipo = 'huesped_temporal' and r.vigente
  limit 1;

  -- Un edificio sin reglas vigentes no tiene nada que aceptar. No es un
  -- error: el cierre tampoco las exige en ese caso.
  if v_reglamento is null then
    return;
  end if;

  /*
    Cada adulto acepta **las suyas** con su enlace, igual que los terminos:
    con el del titular se marca al titular; con el de un acompañante, a el.
  */
  update public.invitado
     set reglamento_id = v_reglamento,
         reglamento_aceptado_en = now()
   where id = v_invitado;
end;
$$;

comment on function public.aceptar_reglamento_precheckin(text) is
  'Quien trae el enlace acepta las reglas del edificio para huespedes. Vale '
  'para el titular y para cada acompañante, cada uno con el suyo.';

grant execute on function public.aceptar_reglamento_precheckin(text)
  to anon, authenticated;

-- Lo que la pantalla necesita saber al volver al enlace, de una vez.
create or replace function public.estado_del_precheckin(p_token text)
returns table (
  hora_llegada         time,
  hora_salida          time,
  hay_reglamento       boolean,
  reglamento_aceptado  boolean
)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select
    v.hora_estimada_llegada,
    v.hora_estimada_salida,
    exists (
      select 1 from public.reglamento r
      where r.condominio_id = v.condominio_id
        and r.tipo = 'huesped_temporal' and r.vigente
    ),
    coalesce(i.reglamento_aceptado_en is not null, false)
  from public.persona_del_enlace(p_token) p
  join public.visita v on v.id = p.visita_id
  left join public.invitado i on i.id = p.invitado_id;
$$;

comment on function public.estado_del_precheckin(text) is
  'Las horas previstas de la estancia y si quien trae el enlace ya acepto '
  'las reglas, para no pedirselo dos veces al volver.';

grant execute on function public.estado_del_precheckin(text)
  to anon, authenticated;

-- ============================================================================
-- 3. El vehículo tiene responsable
-- ============================================================================

alter table public.vehiculo_visita
  add column if not exists responsable_invitado_id uuid
    references public.invitado(id) on delete set null;

comment on column public.vehiculo_visita.responsable_invitado_id is
  'Quien responde por el vehiculo: un adulto de la misma estancia. Nulo en '
  'lo anterior al 09/10/2026 y en los que registra el anfitrion sin decirlo.';

create or replace function public.el_responsable_viaja_en_la_estancia()
returns trigger
language plpgsql
as $$
begin
  if new.responsable_invitado_id is null then
    return new;
  end if;

  /*
    De **esta** estancia y adulto. Va en un disparador y no en la funcion del
    preregistro porque la tabla tambien se escribe desde la aplicacion, por
    PostgREST: un limite que solo vive en un camino no es un limite.
  */
  if not exists (
    select 1 from public.invitado i
    where i.id = new.responsable_invitado_id
      and i.visita_id = new.visita_id
      and not i.es_menor
  ) then
    raise exception
      'Quien responde por el vehiculo tiene que ser un adulto de esta reserva';
  end if;

  return new;
end;
$$;

drop trigger if exists vehiculo_visita_responsable on public.vehiculo_visita;

create trigger vehiculo_visita_responsable
  before insert or update of responsable_invitado_id, visita_id
  on public.vehiculo_visita
  for each row
  execute function public.el_responsable_viaja_en_la_estancia();

create or replace function public.vehiculos_del_precheckin(p_token text)
returns table (
  id uuid,
  placa text,
  tipo text,
  marca text,
  color text,
  responsable_invitado_id uuid,
  responsable_nombre text
)
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_visita uuid;
begin
  select v.id into v_visita
  from public.visita v
  where v.precheckin_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and v.precheckin_expira_en > now();

  if v_visita is null then
    raise exception 'Ese enlace no vale o ya vencio';
  end if;

  return query
  select
    vv.id, vv.placa, vv.tipo::text, vv.marca, vv.color,
    vv.responsable_invitado_id,
    nullif(btrim(coalesce(i.nombre, '') || ' ' || coalesce(i.apellidos, '')), '')
  from public.vehiculo_visita vv
  left join public.invitado i on i.id = vv.responsable_invitado_id
  where vv.visita_id = v_visita
  order by vv.created_at;
end;
$$;

grant execute on function public.vehiculos_del_precheckin(text)
  to anon, authenticated;

create or replace function public.guardar_vehiculo_precheckin(
  p_token                   text,
  p_placa                   text,
  p_responsable_invitado_id uuid,
  p_tipo                    tipo_vehiculo default null,
  p_marca                   text default null,
  p_color                   text default null,
  p_vehiculo_id             uuid default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_visita uuid;
  v_placa  text := upper(regexp_replace(coalesce(p_placa, ''), '[^A-Za-z0-9]', '', 'g'));
  v_id     uuid;
begin
  select v.id into v_visita
  from public.visita v
  where v.precheckin_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and v.precheckin_expira_en > now();

  if v_visita is null then
    raise exception 'Ese enlace no vale o ya vencio';
  end if;

  if exists (select 1 from public.visita v
             where v.id = v_visita and v.precheckin_completado_en is not null) then
    raise exception 'Este preregistro ya esta cerrado';
  end if;

  -- La placa es lo que mira la porteria: sin ella no hay vehiculo que apuntar.
  if v_placa = '' then
    raise exception 'Hace falta la placa del vehiculo';
  end if;

  -- Aqui si es obligatorio: es justo lo que este formulario viene a preguntar.
  if p_responsable_invitado_id is null then
    raise exception 'Falta decir quien responde por el vehiculo';
  end if;

  if p_vehiculo_id is not null then
    update public.vehiculo_visita set
      placa = v_placa,
      tipo  = p_tipo,
      marca = nullif(btrim(coalesce(p_marca, '')), ''),
      color = nullif(btrim(coalesce(p_color, '')), ''),
      responsable_invitado_id = p_responsable_invitado_id
    where id = p_vehiculo_id and visita_id = v_visita;

    if not found then
      raise exception 'Ese vehiculo no es de esta reserva';
    end if;
    return p_vehiculo_id;
  end if;

  insert into public.vehiculo_visita
    (visita_id, placa, tipo, marca, color, responsable_invitado_id)
  values (
    v_visita, v_placa, p_tipo,
    nullif(btrim(coalesce(p_marca, '')), ''),
    nullif(btrim(coalesce(p_color, '')), ''),
    p_responsable_invitado_id
  )
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.guardar_vehiculo_precheckin(
  text, text, uuid, tipo_vehiculo, text, text, uuid) is
  'El huesped apunta un vehiculo de su estancia y dice quien responde por '
  'el. La placa se guarda en mayusculas y sin separadores.';

grant execute on function public.guardar_vehiculo_precheckin(
  text, text, uuid, tipo_vehiculo, text, text, uuid) to anon, authenticated;

create or replace function public.quitar_vehiculo_precheckin(
  p_token       text,
  p_vehiculo_id uuid
)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_visita uuid;
begin
  select v.id into v_visita
  from public.visita v
  where v.precheckin_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and v.precheckin_expira_en > now();

  if v_visita is null then
    raise exception 'Ese enlace no vale o ya vencio';
  end if;

  if exists (select 1 from public.visita v
             where v.id = v_visita and v.precheckin_completado_en is not null) then
    raise exception 'Este preregistro ya esta cerrado';
  end if;

  delete from public.vehiculo_visita
  where id = p_vehiculo_id and visita_id = v_visita;

  if not found then
    raise exception 'Ese vehiculo no es de esta reserva';
  end if;
end;
$$;

grant execute on function public.quitar_vehiculo_precheckin(text, uuid)
  to anon, authenticated;

-- ============================================================================
-- 4. El cierre exige las reglas, si el edificio las tiene
-- ============================================================================
-- Mismo cuerpo que la version viva salvo el bloque nuevo, justo despues de la
-- comprobacion de los terminos.

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
