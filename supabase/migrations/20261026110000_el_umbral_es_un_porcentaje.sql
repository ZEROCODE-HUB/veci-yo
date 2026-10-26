-- El umbral de una encuesta es un porcentaje de participación (hueco 26).
--
-- El cliente respondió el 21/10/2026: «Mejor ponle porcentaje de
-- participación». El 25/10 se cambió por error en sentido contrario (votos
-- esperados, sin tope) al arreglar Parametrización sin mirar Huecos. Esto lo
-- devuelve a lo decidido.
--
-- La participación se cuenta por vivienda, igual que el voto (una por
-- vivienda, `validar_voto_unico`) y que la lista de quién falta por votar
-- (`pendientes_votacion`): viviendas que votaron sobre viviendas del edificio.
--
-- Solo aditiva: una restricción (no hay ninguna fila con umbral) y una función.

alter table public.publicacion
  add constraint publicacion_umbral_es_porcentaje
  check (umbral is null or umbral between 1 and 100);

comment on column public.publicacion.umbral is
  'Participación esperada de una encuesta, en porcentaje de viviendas del edificio (1 a 100). NULL = sin meta: la encuesta no enseña barra de avance. Hueco 26 (21/10/2026).';

create or replace function public.participacion_encuesta(p_publicacion_id uuid)
returns table (viviendas integer, votaron integer)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  /*
    Cuántas viviendas tiene el edificio y cuántas votaron. No dice qué votó
    nadie --eso lo guarda `resultados_publicacion`, que respeta el voto
    secreto--: solo cuántas, así que lo puede pedir cualquiera que vea la
    encuesta.
  */
  select
    (select count(*)::int from public.unidad u
      where u.condominio_id = pub.condominio_id and u.deleted_at is null),
    (select count(distinct v.unidad_id)::int from public.voto v
      where v.publicacion_id = pub.id and v.unidad_id is not null)
  from public.publicacion pub
  where pub.id = p_publicacion_id
    and public.puede_ver_publicacion(p_publicacion_id);
$$;

comment on function public.participacion_encuesta(uuid) is
  'Viviendas del edificio y cuántas votaron en esa encuesta, para medir la participación contra el umbral (porcentaje). Solo cuántas, nunca qué: lo puede pedir quien ve la encuesta.';

revoke execute on function public.participacion_encuesta(uuid) from public, anon;
grant execute on function public.participacion_encuesta(uuid) to authenticated, service_role;
