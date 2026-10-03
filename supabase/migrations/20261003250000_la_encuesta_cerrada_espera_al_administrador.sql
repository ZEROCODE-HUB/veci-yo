-- ----------------------------------------------------------------------------
-- La encuesta cerrada espera al administrador
-- ----------------------------------------------------------------------------
-- Pedido por el cliente el 02/10/2026: cuando una encuesta termina, preguntarle
-- al administrador si publica los resultados o los deja en borrador.
--
-- Y hay un defecto debajo. La tarjeta de una votacion con los resultados
-- ocultos dice, literalmente:
--
--     «Los resultados se mostraran al cierre de la encuesta.»
--
-- Eso **no pasa**. `ocultar_resultados` se fija al crearla y nadie la vuelve a
-- tocar nunca, asi que una encuesta oculta se queda oculta para siempre. Es la
-- forma mas cara del defecto de este proyecto: no un boton que no hace nada
-- --eso se nota-- sino una frase que promete algo que no va a ocurrir. Quien la
-- lee no vuelve a mirar; espera.
--
-- Lo que entra:
--
--   · `resultados_publicados_en` y `resultados_publicados_por`. El **cuando** y
--     el **quien**: es una decision de alguien sobre un dato de la comunidad, y
--     sin firma no hay a quien preguntarle.
--   · Una regla de visibilidad que ya se puede cumplir: abiertos si la encuesta
--     nunca los oculto, o si alguien los publico.
--   · Las dos funciones para decidir, y la lista de lo que esta esperando.
--
-- Aditiva: columnas nuevas y nulas. Lo que hay no cambia de comportamiento
-- salvo en una cosa, y es la que se queria arreglar: una encuesta cerrada con
-- resultados ocultos ahora **se puede** abrir, cosa que antes era imposible.

alter table public.publicacion
  add column if not exists resultados_publicados_en  timestamptz,
  add column if not exists resultados_publicados_por uuid
    references auth.users(id) on delete set null;

comment on column public.publicacion.resultados_publicados_en is
  'Cuando la administracion decidio enseñar los resultados de una encuesta que los ocultaba. Null = todavia en borrador.';

comment on column public.publicacion.resultados_publicados_por is
  'Quien lo decidio. Es una decision sobre un dato de la comunidad: sin firma no hay a quien preguntarle.';

-- Quien publica tiene que constar, y nadie publica lo que nunca se oculto.
alter table public.publicacion
  drop constraint if exists publicacion_resultados_con_firma;

alter table public.publicacion
  add constraint publicacion_resultados_con_firma
  check (resultados_publicados_en is null or resultados_publicados_por is not null)
  not valid;

-- 1. Si los resultados se pueden ver -----------------------------------------

create or replace function public.resultados_a_la_vista(p_publicacion_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select coalesce(
    (select not p.ocultar_resultados or p.resultados_publicados_en is not null
     from public.publicacion p where p.id = p_publicacion_id),
    false
  );
$fn$;

comment on function public.resultados_a_la_vista is
  'Si los numeros de esta encuesta se pueden enseñar: porque nunca se ocultaron, o porque la administracion los publico al cerrar.';

grant execute on function public.resultados_a_la_vista(uuid) to authenticated;

-- 2. Decidir -----------------------------------------------------------------

create or replace function public.publicar_resultados(p_publicacion_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_pub public.publicacion%rowtype;
begin
  select * into v_pub from public.publicacion where id = p_publicacion_id;

  if v_pub.id is null or v_pub.deleted_at is not null then
    raise exception 'Esa encuesta no existe';
  end if;

  if not public.es_admin_condominio(v_pub.condominio_id) then
    raise exception 'Solo la administracion decide si se publican los resultados';
  end if;

  if v_pub.tipo <> 'encuesta' then
    raise exception 'Esto no es una encuesta';
  end if;

  /*
    Solo cuando ya cerro. Publicarlos con la votacion abierta cambia el
    resultado: quien todavia no ha votado veria por donde va y votaria a lo
    ganador. Una encuesta que enseña el marcador mientras se vota es otra cosa
    --y para eso esta `ocultar_resultados = false` desde el principio--.
  */
  if v_pub.publicada_hasta is null or v_pub.publicada_hasta > now() then
    raise exception 'Esta encuesta todavia esta abierta. Los resultados se deciden cuando cierra.';
  end if;

  update public.publicacion
  set resultados_publicados_en = now(),
      resultados_publicados_por = auth.uid()
  where id = p_publicacion_id;
end;
$fn$;

comment on function public.publicar_resultados is
  'La administracion enseña los resultados de una encuesta cerrada que los ocultaba. Solo despues del cierre: con la votacion abierta, ver el marcador cambia los votos.';

create or replace function public.dejar_resultados_en_borrador(p_publicacion_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_pub public.publicacion%rowtype;
begin
  select * into v_pub from public.publicacion where id = p_publicacion_id;

  if v_pub.id is null then
    raise exception 'Esa encuesta no existe';
  end if;

  if not public.es_admin_condominio(v_pub.condominio_id) then
    raise exception 'Solo la administracion decide si se publican los resultados';
  end if;

  /*
    Se puede volver atras. No es una puerta de un solo sentido: alguien publica
    por error unos resultados sensibles y tiene que poder taparlos otra vez.
    Que ya los haya visto gente es inevitable; dejarlos a la vista para siempre
    por un clic, no.
  */
  update public.publicacion
  set resultados_publicados_en = null,
      resultados_publicados_por = null
  where id = p_publicacion_id;
end;
$fn$;

comment on function public.dejar_resultados_en_borrador is
  'Vuelve a tapar unos resultados publicados. Se puede deshacer a proposito: publicar por error algo sensible no puede ser definitivo.';

grant execute on function public.publicar_resultados(uuid) to authenticated;
grant execute on function public.dejar_resultados_en_borrador(uuid) to authenticated;

-- 3. Lo que esta esperando una decision --------------------------------------

/*
  Sin esta lista, la decision no existe: el administrador tendria que acordarse
  de entrar a cada encuesta vieja a ver si cerro. Es el mismo motivo por el que
  el titular del preregistro ve a quien le falta.
*/
create or replace function public.encuestas_por_decidir(p_condominio_id uuid)
returns table (
  id            uuid,
  titulo        text,
  cerro_en      timestamptz,
  votos         bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
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
    and p.publicada_hasta is not null
    and p.publicada_hasta <= now()
    and public.es_admin_condominio(p_condominio_id)
  order by p.publicada_hasta desc;
$fn$;

comment on function public.encuestas_por_decidir is
  'Encuestas cerradas cuyos resultados siguen ocultos y nadie ha decidido si se enseñan. Vacio para quien no administra.';

grant execute on function public.encuestas_por_decidir(uuid) to authenticated;
