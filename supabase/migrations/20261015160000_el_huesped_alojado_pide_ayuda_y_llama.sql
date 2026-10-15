-- El huesped alojado pide ayuda y llama a la porteria (15/10/2026).
--
-- La revision de cobertura entre roles encontro que al huesped con cuenta se
-- le ofrecian tres cosas que la base le negaba:
--
--   · el boton S.O.S.: la alarma exigia `es_miembro_condominio`, que excluye
--     al huesped a proposito (20260922192000). La pantalla le decia «No se
--     pudo avisar a la porteria. Llama por telefono»;
--   · el intercomunicador: llamar a la porteria exigia `es_miembro_unidad`,
--     que tambien lo excluye. Y cuando la porteria llamaba a la vivienda, le
--     sonaba al dueño --aunque estuviera de viaje-- y no a quien esta dentro;
--   · el telefono de la porteria y el registro de una llamada.
--
-- Ahora el huesped **alojado** --con cuenta y dentro de sus fechas, ni antes
-- ni despues-- puede las tres. El cliente lo dijo asi: la porteria llama al
-- huesped solo si esta registrado en la app (comentario en el GSheet,
-- 15/10/2026), que es lo que comprueba `es_huesped_alojado`: mira la cuenta
-- de quien pregunta.
--
-- Y si el S.O.S. lo activa un huesped, se entera tambien la vivienda que lo
-- recibe (sus residentes, no otros huespedes): el anfitrion responde por el.

-- El huesped que esta hoy en algun edificio, con las dos fechas.
create or replace function public.es_huesped_alojado_en_condominio(p_condominio_id uuid)
returns boolean
language sql
stable security definer
set search_path to 'public', 'pg_temp'
as $function$
  select exists (
    select 1
    from public.membresia_unidad mu
    join public.unidad u on u.id = mu.unidad_id
    where u.condominio_id = p_condominio_id
      and mu.usuario_id = auth.uid()
      and mu.activo
      and mu.rol = 'huesped_temporal'
      and (mu.vigente_desde is null or mu.vigente_desde <= current_date)
      and (mu.vigente_hasta is null or mu.vigente_hasta >= current_date)
  );
$function$;

comment on function public.es_huesped_alojado_en_condominio(uuid) is
  'Huesped con cuenta y dentro de sus fechas en alguna vivienda del condominio.';

-- 1. El S.O.S.
drop policy if exists alarma_sos_activar on public.alarma_sos;
create policy alarma_sos_activar on public.alarma_sos
  for insert to authenticated
  with check (
    usuario_id = auth.uid()
    and (
      public.es_miembro_condominio(condominio_id)
      or public.es_huesped_alojado_en_condominio(condominio_id)
    )
    and (
      unidad_id is null
      or exists (
        select 1 from public.membresia_unidad m
        where m.unidad_id = alarma_sos.unidad_id
          and m.usuario_id = auth.uid()
          and m.activo
          and m.rol <> 'huesped_temporal'
      )
      or public.es_huesped_alojado(unidad_id)
    )
  );

create or replace function public.avisar_sos()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_nombre    text;
  v_vivienda  text;
  v_mensaje   text;
  v_avisados  integer;
  v_es_huesped boolean;
begin
  select trim(coalesce(p.nombre, '') || ' ' || coalesce(p.apellido, ''))
    into v_nombre
  from public.perfil p where p.id = new.usuario_id;

  select 'Torre ' || t.numero || ' · ' || u.codigo
    into v_vivienda
  from public.unidad u
  join public.torre t on t.id = u.torre_id
  where u.id = new.unidad_id;

  v_es_huesped := new.unidad_id is not null and exists (
    select 1 from public.membresia_unidad m
    where m.unidad_id = new.unidad_id
      and m.usuario_id = new.usuario_id
      and m.rol = 'huesped_temporal'
      and m.activo
  );

  -- El texto lo lee gente: va con tildes, aunque los comentarios de este
  -- archivo no las lleven.
  v_mensaje := coalesce(nullif(v_nombre, ''), 'Una persona')
    || case when v_es_huesped then ' (huésped)' else '' end
    || ' activó el S.O.S.'
    || coalesce(' desde ' || v_vivienda, '')
    || '. Atender de inmediato.';

  -- Los guardias de turno. Si no hay ninguno, la administracion: no avisar a
  -- nadie no es una opcion en una alarma. Y si quien la activa es un huesped,
  -- tambien los residentes de la vivienda que lo recibe (15/10/2026).
  with destinatarios as (
    select g.usuario_id from public.guardias_de_turno(new.condominio_id) g
    union
    select m.usuario_id
    from public.membresia_condominio m
    where m.condominio_id = new.condominio_id
      and m.rol in ('administrador', 'coadministrador')
      and m.activo
      and not exists (
        select 1 from public.guardias_de_turno(new.condominio_id)
      )
    union
    select mu.usuario_id
    from public.membresia_unidad mu
    where v_es_huesped
      and mu.unidad_id = new.unidad_id
      and mu.activo
      and mu.puede_acceder
      and mu.usuario_id is not null
      and mu.rol <> 'huesped_temporal'
  ),
  insertadas as (
    insert into public.notificacion
      (usuario_id, condominio_id, tipo, titulo, mensaje, entidad_tipo, entidad_id)
    select d.usuario_id, new.condominio_id, 'sos_activado',
           'S.O.S. activado', v_mensaje, 'alarma_sos', new.id
    from destinatarios d
    where d.usuario_id <> new.usuario_id
    returning 1
  )
  select count(*) into v_avisados from insertadas;

  update public.alarma_sos set avisados = v_avisados where id = new.id;
  return null;
end;
$function$;

-- 2. El intercomunicador, en los dos sentidos.
create or replace function public.llamar_por_internet(p_destino destino_intercom, p_a_unidad_id uuid DEFAULT NULL::uuid, p_desde_unidad_id uuid DEFAULT NULL::uuid)
 returns uuid
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_condominio uuid;
  v_id         uuid;
begin
  if p_destino = 'porteria' then
    -- Una vivienda llama a la porteria de su edificio: quien vive ahi o el
    -- huesped que esta dentro hoy.
    if p_desde_unidad_id is null
       or not (public.es_miembro_unidad(p_desde_unidad_id)
               or public.es_huesped_alojado(p_desde_unidad_id)) then
      raise exception 'Solo se llama a la porteria desde una vivienda tuya';
    end if;
    v_condominio := public.condominio_de_unidad(p_desde_unidad_id);
  else
    -- La porteria llama a una vivienda de su edificio.
    if p_a_unidad_id is null then
      raise exception 'Falta la vivienda a la que llamas';
    end if;
    v_condominio := public.condominio_de_unidad(p_a_unidad_id);
    if not public.porteria_puede_llamar(v_condominio) then
      raise exception 'La administracion no te habilito las llamadas';
    end if;
  end if;

  insert into public.llamada_internet (condominio_id, de_usuario_id, de_unidad_id, destino, a_unidad_id)
  values (v_condominio, auth.uid(), p_desde_unidad_id, p_destino,
          case when p_destino = 'vivienda' then p_a_unidad_id end)
  returning id into v_id;
  return v_id;
end;
$function$;

-- Cuando la porteria llama a la vivienda, suena tambien al huesped que esta
-- dentro y tiene la app.
create or replace function public.esta_en_la_llamada(p_llamada_id uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
  select exists (
    select 1 from public.llamada_internet l
    where l.id = p_llamada_id
      and (
        l.de_usuario_id = auth.uid()
        or (l.destino = 'porteria' and public.porteria_puede_llamar(l.condominio_id))
        or (l.destino = 'vivienda' and (public.es_miembro_unidad(l.a_unidad_id)
                                        or public.es_huesped_alojado(l.a_unidad_id)))
      )
  );
$function$;

-- 3. El telefono de la porteria y el registro de una llamada.
drop policy if exists porteria_lectura on public.porteria;
create policy porteria_lectura on public.porteria
  for select to authenticated
  using (
    public.es_miembro_condominio(condominio_id)
    or public.es_huesped_alojado_en_condominio(condominio_id)
  );

drop policy if exists llamada_alta on public.llamada;
create policy llamada_alta on public.llamada
  for insert to authenticated
  with check (
    de_usuario = auth.uid()
    and (
      public.es_miembro_condominio(condominio_id)
      or public.es_huesped_alojado_en_condominio(condominio_id)
    )
  );
