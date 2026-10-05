-- ----------------------------------------------------------------------------
-- Un voto por vivienda, no por persona
-- ----------------------------------------------------------------------------
-- El 05/10/2026 se le pregunto al cliente que pasa con quien tiene dos
-- viviendas --Guillermo es propietario de la 101 y de la 205-- y respondio:
-- «pues si tiene 2 viviendas puede votar 2 veces».
--
-- Hoy la regla es **por persona**, y eso produce tres cosas, las tres malas:
--
--   · `validar_voto_unico` cuenta por `usuario_id`, asi que Guillermo vota una
--     vez y ya no puede votar por la otra vivienda;
--   · `voto_unico_por_opcion` es unico por `(publicacion, usuario, opcion)`;
--   · y `pendientes_votacion` saca a una vivienda de la lista de «no votaron»
--     cuando **su propietario** voto, aunque fuera por la otra. O sea que
--     Guillermo vota por la 101 y la 205 desaparece de la lista sin haber
--     votado: el recuento de participacion sale mal.
--
-- La vivienda pasa a ser lo que vota. Es lo que ya decian las otras piezas
-- --`detalle_votacion` devuelve la unidad, `pendientes_votacion` lista
-- unidades-- asi que el modelo queda coherente consigo mismo.
--
-- ----------------------------------------------------------------------------
-- Y un agujero que esto destapa
-- ----------------------------------------------------------------------------
-- `voto.unidad_id` lo manda el cliente y **nadie comprobaba que fuera suya**.
-- Mientras el limite era por persona daba igual: votar dos veces se rechazaba
-- de todos modos. Con el limite por vivienda, no: un vecino podria mandar el
-- id de la 301 y gastarle el voto a Marcela.
--
-- Lo cierra la politica de alta, con `es_miembro_unidad`.
--
-- ----------------------------------------------------------------------------
-- Quien no tiene vivienda
-- ----------------------------------------------------------------------------
-- La porteria y la administracion pueden votar hoy --`voto_propio_escritura`
-- solo pide ser miembro del condominio-- y su voto no lleva unidad. No se les
-- quita: no se ha pedido, y quitarlo seria decidir por mi cuenta quien tiene
-- voz en una asamblea. Para ellos la regla sigue siendo una por persona, que
-- es lo unico que se puede contar.
--
-- Los cinco votos de septiembre tampoco llevan unidad --son de cuando el voto
-- no se ataba a un departamento-- y se quedan como estan.
--
-- Aditiva: cambia indices y reglas, no borra ni una fila.

-- ----------------------------------------------------------------------------
-- Los indices
-- ----------------------------------------------------------------------------
-- Dos parciales en vez de uno: la vivienda cuando la hay, y la persona cuando
-- no. Un indice unico no puede consultar otra tabla para decidir cual usar.

drop index if exists public.voto_unico_por_opcion;

create unique index if not exists voto_unico_por_vivienda
  on public.voto (publicacion_id, unidad_id, opcion_id)
  where unidad_id is not null;

create unique index if not exists voto_unico_sin_vivienda
  on public.voto (publicacion_id, usuario_id, opcion_id)
  where unidad_id is null;

-- ----------------------------------------------------------------------------
-- Una sola opcion, por vivienda
-- ----------------------------------------------------------------------------

create or replace function public.validar_voto_unico()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_multiple boolean;
  v_existentes integer;
begin
  select voto_multiple into v_multiple
  from public.publicacion where id = new.publicacion_id;

  if coalesce(v_multiple, false) then
    return new;
  end if;

  if new.unidad_id is not null then
    -- Por vivienda. Quien tiene dos vota dos veces, una por cada una.
    select count(*) into v_existentes
    from public.voto v
    where v.publicacion_id = new.publicacion_id
      and v.unidad_id = new.unidad_id
      and v.id <> coalesce(new.id, gen_random_uuid());

    if v_existentes > 0 then
      raise exception 'Esta vivienda ya voto en esta encuesta';
    end if;
  else
    -- Sin vivienda --la porteria, la administracion-- una por persona, que es
    -- lo unico que se puede contar.
    select count(*) into v_existentes
    from public.voto v
    where v.publicacion_id = new.publicacion_id
      and v.usuario_id = new.usuario_id
      and v.unidad_id is null
      and v.id <> coalesce(new.id, gen_random_uuid());

    if v_existentes > 0 then
      raise exception 'Esta encuesta admite un solo voto por persona';
    end if;
  end if;

  return new;
end;
$fn$;

comment on function public.validar_voto_unico is
  'Una opcion por vivienda en una encuesta de voto unico. Quien tiene dos viviendas vota dos veces, una por cada una: lo decidio el cliente el 05/10/2026. Quien no tiene vivienda --porteria, administracion-- sigue con una por persona.';

-- ----------------------------------------------------------------------------
-- Y la vivienda tiene que ser suya
-- ----------------------------------------------------------------------------

drop policy if exists voto_propio_escritura on public.voto;

create policy voto_propio_escritura on public.voto
  for all to authenticated
  using (usuario_id = auth.uid())
  with check (
    usuario_id = auth.uid()
    and public.puede_ver_publicacion(publicacion_id)
    -- La vivienda por la que se vota es suya. Sin esto, con el limite por
    -- vivienda, un vecino podria gastarle el voto a otro mandando su id.
    and (unidad_id is null or public.es_miembro_unidad(unidad_id))
    and exists (
      select 1 from public.publicacion p
      where p.id = publicacion_id
        and public.es_miembro_condominio(p.condominio_id)
        and p.tipo = 'encuesta'
        and (p.publicada_hasta is null or p.publicada_hasta > now())
    )
  );

comment on policy voto_propio_escritura on public.voto is
  'Se vota en nombre propio, en una encuesta abierta que se puede ver, y **por una vivienda propia**. Lo ultimo importa desde que el limite es por vivienda: sin ello se le podria gastar el voto a un vecino.';

-- ----------------------------------------------------------------------------
-- Quien falta por votar, contado por vivienda
-- ----------------------------------------------------------------------------
-- Antes sacaba una vivienda de la lista cuando **su propietario** habia
-- votado, aunque fuera por otra. Con dos viviendas, votar una escondia las
-- dos.

create or replace function public.pendientes_votacion(p_publicacion_id uuid)
returns table (unidad text, propietario text)
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select u.codigo, coalesce(p.nombre || ' ' || p.apellido, mu.nombre)
  from public.publicacion pub
  join public.unidad u on u.condominio_id = pub.condominio_id and u.deleted_at is null
  join public.membresia_unidad mu on mu.unidad_id = u.id and mu.activo
                                 and mu.rol = 'propietario'
  left join public.perfil p on p.id = mu.usuario_id
  where pub.id = p_publicacion_id
    and public.es_admin_condominio(pub.condominio_id)
    and not exists (
      select 1 from public.voto v
      where v.publicacion_id = pub.id and v.unidad_id = u.id
    )
  order by u.codigo;
$fn$;

comment on function public.pendientes_votacion is
  'Las viviendas que no han votado. Por vivienda y no por persona: quien tiene dos y vota por una deja la otra pendiente, que es lo que de verdad falta.';

-- ----------------------------------------------------------------------------
-- Lo que esta persona ya voto, y por que vivienda
-- ----------------------------------------------------------------------------
-- La pantalla necesita saber **cual de sus viviendas** voto ya, para ofrecer
-- la otra. Antes le bastaba con la lista de opciones porque solo se podia
-- votar una vez.

create or replace function public.mis_votos(p_publicacion_id uuid)
returns table (opcion_id uuid, unidad_id uuid, codigo text)
language sql
stable
security invoker
set search_path = public, pg_temp
as $fn$
  -- `security invoker`: la politica `voto_propio_lectura` ya limita a los
  -- votos propios, y asi no hay dos sitios decidiendo lo mismo.
  select v.opcion_id, v.unidad_id, u.codigo
  from public.voto v
  left join public.unidad u on u.id = v.unidad_id
  where v.publicacion_id = p_publicacion_id;
$fn$;

comment on function public.mis_votos is
  'Lo que esta persona ya voto en esa encuesta, con la vivienda de cada voto. Hace falta desde que se vota por vivienda: quien tiene dos necesita ver cual le queda.';

revoke all on function public.mis_votos(uuid) from public;
grant execute on function public.mis_votos(uuid) to authenticated;
