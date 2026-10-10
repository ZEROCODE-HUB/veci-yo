-- La porteria ve hoy, mañana y a quien esta dentro. Nada mas.
--
-- Aditiva: funciones nuevas y dos politicas que se reescriben (una politica no
-- es un dato). No se borra ninguna tabla ni ninguna fila.
--
-- Decidido con el cliente el 09/10/2026: la lista del guardia trae solo lo de
-- hoy, lo de mañana y a quien siga dentro, **cerrado en la base** y no en la
-- pantalla. Hasta aqui `es_personal_condominio` le abria todas las visitas del
-- edificio, de cualquier fecha: nombres, documentos y telefonos de gente que
-- vino hace meses o que viene dentro de tres.
--
-- Los contadores y el grafico si miran mas dias. Para eso hay una funcion de
-- agregados que devuelve **numeros, no personas**.

-- ============================================================================
-- 1. Quien es solo guardia
-- ============================================================================

create or replace function public.solo_es_guardia(p_condominio_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select
    exists (
      select 1 from public.membresia_condominio mc
      where mc.condominio_id = p_condominio_id
        and mc.usuario_id = auth.uid()
        and mc.rol = 'guardia'
        and mc.activo
    )
    and not exists (
      select 1 from public.membresia_condominio mc
      where mc.condominio_id = p_condominio_id
        and mc.usuario_id = auth.uid()
        and mc.rol <> 'guardia'
        and mc.activo
    );
$$;

comment on function public.solo_es_guardia(uuid) is
  'Si quien pregunta es guardia de ese edificio y nada mas. Quien ademas lo '
  'administra conserva lo que le toca como administracion.';

grant execute on function public.solo_es_guardia(uuid) to authenticated;

-- ============================================================================
-- 2. La ventana
-- ============================================================================

create or replace function public.visita_en_ventana_de_porteria(
  p_condominio_id uuid,
  p_desde         date,
  p_hasta         date,
  p_estado        estado_visita,
  p_tipo          tipo_visita,
  p_creada_en     timestamptz,
  p_registrada_por uuid
)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  /*
    «Hoy» es el del edificio, no el del servidor: es la misma cuenta que hacen
    el resto de las reglas del proyecto.

    Una visita sin fecha de inicio cuenta desde el dia en que se registro. Sin
    fecha de fin dura ese dia, salvo la permanente --la empleada, el
    enfermero--, que no caduca.

    Quien esta dentro se ve siempre, aunque su estancia haya vencido: es
    justo a quien la porteria tiene que poder dar salida.

    Y lo que el propio guardia anoto hoy, sea para la fecha que sea. Sin eso
    no podria registrar una visita para pasado mañana: la fila que acaba de
    escribir dejaria de ser suya en el mismo instante, y la base responde a
    eso con un «permiso denegado» que no explica nada.
  */
  with reloj as (
    select (now() at time zone public.zona_horaria_del_condominio(p_condominio_id))::date as hoy,
           (p_creada_en at time zone public.zona_horaria_del_condominio(p_condominio_id))::date as creada
  )
  select
    p_estado = 'ingresada'
    or (p_registrada_por = auth.uid() and r.creada = r.hoy)
    or (
      coalesce(p_desde, r.creada) <= r.hoy + 1
      and case
            when p_hasta is not null then p_hasta >= r.hoy
            when p_tipo = 'permanente' then true
            else coalesce(p_desde, r.creada) >= r.hoy
          end
    )
  from reloj r;
$$;

comment on function public.visita_en_ventana_de_porteria(
  uuid, date, date, estado_visita, tipo_visita, timestamptz, uuid) is
  'Si una visita es de hoy, de mañana o de alguien que sigue dentro, con el '
  'reloj del edificio. Es lo unico que ve quien solo es guardia.';

grant execute on function public.visita_en_ventana_de_porteria(
  uuid, date, date, estado_visita, tipo_visita, timestamptz, uuid) to authenticated;

-- ============================================================================
-- 3. La visita, y lo que cuelga de ella
-- ============================================================================

drop policy if exists visita_lectura on public.visita;
create policy visita_lectura on public.visita for select
  using (
    ((unidad_id is not null) and public.es_miembro_unidad(unidad_id))
    or (
      (registrada_por = auth.uid())
      and (unidad_id is not null)
      and public.es_huesped_con_reserva(unidad_id)
    )
    or (
      public.es_guardia_de_condominio(condominio_id)
      and public.visita_en_ventana_de_porteria(
        condominio_id, fecha_desde, fecha_hasta, estado, tipo, created_at, registrada_por)
    )
    or public.puede_coadmin(condominio_id, 'visualizarVisitas'::text)
  );

/*
  Invitados, vehiculos, verificaciones, autorizaciones y los archivos del
  bucket pasan todos por aqui. El guardia entraba por `es_personal_condominio`,
  sin fecha; ahora, si solo es guardia, por la ventana.
*/
create or replace function public.puede_ver_visita(p_visita_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select exists (
    select 1 from public.visita v
    where v.id = p_visita_id
      and (
        (
          public.es_personal_condominio(v.condominio_id)
          and (
            not public.solo_es_guardia(v.condominio_id)
            or public.visita_en_ventana_de_porteria(
                 v.condominio_id, v.fecha_desde, v.fecha_hasta,
                 v.estado, v.tipo, v.created_at, v.registrada_por)
          )
        )
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
      )
  );
$$;

-- ============================================================================
-- 4. La foto del documento del huesped no es de la porteria
-- ============================================================================

create or replace function public.archivo_vedado_a_porteria(p_nombre text)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'storage', 'pg_temp'
as $$
  /*
    Lo que el huesped subio en su preregistro --`documento-frente-…`,
    `documento-reverso-…`-- lo ve el anfitrion, que es quien responde por la
    estancia. La porteria no: compara el **numero** que le enseñan en la puerta
    con el que el huesped escribio, y deja su propia foto como constancia.
  */
  select storage.filename(p_nombre) like 'documento-%'
     and exists (
       select 1 from public.visita v
       where v.id::text = (storage.foldername(p_nombre))[1]
         and public.solo_es_guardia(v.condominio_id)
     );
$$;

comment on function public.archivo_vedado_a_porteria(text) is
  'Si ese archivo del bucket de visitas es la foto del documento que subio el '
  'huesped y quien pregunta solo es guardia.';

grant execute on function public.archivo_vedado_a_porteria(text) to authenticated;

drop policy if exists visitas_lectura_fotos on storage.objects;
create policy visitas_lectura_fotos on storage.objects for select
  using (
    bucket_id = 'visitas'
    and public.puede_ver_visita(((storage.foldername(name))[1])::uuid)
    and not public.archivo_vedado_a_porteria(name)
  );

-- ============================================================================
-- 5. El trafico, en numeros
-- ============================================================================

create or replace function public.trafico_de_porteria(
  p_condominio_id uuid,
  p_dia           date
)
returns table (
  movimiento  text,
  hora        integer,
  es_huesped  boolean,
  personas    integer,
  con_vehiculo integer
)
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_zona text := public.zona_horaria_del_condominio(p_condominio_id);
begin
  if not public.es_personal_condominio(p_condominio_id) then
    raise exception 'Solo el personal del edificio puede ver su trafico'
      using errcode = '42501';
  end if;

  /*
    Cualquier dia, y por eso mismo **sin nombres**: cuantos entraron y a que
    hora, no quienes. La hora es la real si la porteria la marco, y la
    prevista si no. Quien no tiene ninguna de las dos no se puede poner en
    ninguna franja y no sale.
  */
  return query
  with personas as (
    select
      v.id as visita_id,
      v.tipo = 'huesped_temporal' as es_huesped,
      exists (select 1 from public.vehiculo_visita vv where vv.visita_id = v.id) as con_vehiculo,
      coalesce(
        extract(hour from (i.ingreso_en at time zone v_zona))::int,
        extract(hour from v.hora_estimada_llegada)::int
      ) as hora_ingreso,
      coalesce(
        extract(hour from (i.salida_en at time zone v_zona))::int,
        extract(hour from v.hora_estimada_salida)::int
      ) as hora_salida
    from public.visita v
    join public.invitado i on i.visita_id = v.id
    where v.condominio_id = p_condominio_id
      and v.deleted_at is null
      and v.fecha_desde = p_dia
  ),
  movimientos as (
    select 'ingreso'::text as movimiento, p.hora_ingreso as hora, p.es_huesped, p.con_vehiculo
    from personas p where p.hora_ingreso is not null
    union all
    select 'salida'::text, p.hora_salida, p.es_huesped, p.con_vehiculo
    from personas p where p.hora_salida is not null
  )
  select m.movimiento, m.hora, m.es_huesped,
         count(*)::int,
         count(*) filter (where m.con_vehiculo)::int
  from movimientos m
  group by 1, 2, 3
  order by 1, 2, 3;
end;
$$;

comment on function public.trafico_de_porteria(uuid, date) is
  'Cuantas personas entran y salen por hora en un dia, para el grafico de la '
  'porteria. Devuelve numeros y no personas: por eso puede mirar cualquier dia.';

revoke execute on function public.trafico_de_porteria(uuid, date) from public, anon;
grant execute on function public.trafico_de_porteria(uuid, date) to authenticated, service_role;

-- ============================================================================
-- 6. La porteria anota lo que vio en la puerta
-- ============================================================================

create or replace function public.anotar_verificacion_en_porteria(
  p_invitado_id          uuid,
  p_numero_visto         text,
  p_observaciones        text default null
)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_condominio uuid;
  v_visita     uuid;
  v_en_ficha   text;
  v_visto      text := upper(regexp_replace(coalesce(p_numero_visto, ''), '[^A-Za-z0-9]', '', 'g'));
  v_coincide   boolean;
begin
  select v.condominio_id, v.id,
         upper(regexp_replace(coalesce(i.documento_numero, ''), '[^A-Za-z0-9]', '', 'g'))
    into v_condominio, v_visita, v_en_ficha
  from public.invitado i
  join public.visita v on v.id = i.visita_id
  where i.id = p_invitado_id;

  /*
    Guardia de ese edificio, y con la visita a la vista: la misma ventana que
    la lista. Un mismo mensaje para «no existe» y «no te toca», para que la
    funcion no sirva de oraculo.
  */
  if v_condominio is null
     or not public.es_guardia_de_condominio(v_condominio)
     or not public.puede_ver_visita(v_visita) then
    raise exception 'Esa persona no esta en la lista de la porteria'
      using errcode = '42501';
  end if;

  if v_visto = '' then
    raise exception 'Hace falta el numero del documento que te enseñan';
  end if;

  if v_en_ficha = '' then
    raise exception 'Esta persona no escribio su documento en el preregistro: no hay con que compararlo';
  end if;

  /*
    «Coincide» lo decide la base, no un boton: el numero que la porteria lee
    en el documento fisico contra el que el huesped escribio. Sin puntos,
    guiones ni mayusculas de por medio.
  */
  v_coincide := v_visto = v_en_ficha;

  insert into public.verificacion_documento
    (invitado_id, estado, verificado_por, verificado_en, observaciones)
  values (
    p_invitado_id,
    case when v_coincide then 'verificado' else 'no_coincide' end::estado_verificacion,
    auth.uid(), now(),
    nullif(btrim(coalesce(p_observaciones, '')), '')
  )
  on conflict (invitado_id) do update set
    estado         = excluded.estado,
    verificado_por = excluded.verificado_por,
    verificado_en  = excluded.verificado_en,
    observaciones  = coalesce(excluded.observaciones, public.verificacion_documento.observaciones);

  return v_coincide;
end;
$$;

comment on function public.anotar_verificacion_en_porteria(uuid, text, text) is
  'La porteria teclea el numero del documento que le enseñan y la base dice '
  'si coincide con el del preregistro. Queda quien lo comprobo y cuando.';

revoke execute on function public.anotar_verificacion_en_porteria(uuid, text, text) from public, anon;
grant execute on function public.anotar_verificacion_en_porteria(uuid, text, text)
  to authenticated, service_role;

notify pgrst, 'reload schema';
