-- ============================================================================
-- «Dejar en borrador» es una decision, y queda escrita
-- ============================================================================
-- Revision del 13/10/2026. Cuando una encuesta cierra con los resultados
-- ocultos, la administracion elige: publicarlos o dejarlos en borrador.
--
-- «Dejar en borrador» ponia a `null` lo que ya era `null`, y la lista de
-- pendientes filtra por ese mismo `null`: el aviso decia «los resultados
-- siguen en borrador» y la encuesta **seguia en «esperan tu decision» para
-- siempre**. El comentario del boton afirmaba lo contrario --«la lista deja de
-- molestar y queda constancia»--.
--
-- Ahora queda escrito quien lo decidio y cuando, y la lista lo respeta.
-- Publicarlos despues sigue siendo posible, desde la encuesta.

alter table public.publicacion
  add column if not exists resultados_revisados_en timestamptz,
  add column if not exists resultados_revisados_por uuid references auth.users(id) on delete set null;

comment on column public.publicacion.resultados_revisados_en is
  'Cuando la administracion decidio dejar en borrador los resultados de una encuesta cerrada. Mientras sea null y no esten publicados, la encuesta espera una decision.';
comment on column public.publicacion.resultados_revisados_por is
  'Quien lo decidio.';

create index if not exists publicacion_resultados_revisados_por_idx
  on public.publicacion (resultados_revisados_por)
  where resultados_revisados_por is not null;

CREATE OR REPLACE FUNCTION public.dejar_resultados_en_borrador(p_publicacion_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
      resultados_publicados_por = null,
      -- La constancia de que alguien lo miro y decidio no enseñarlos.
      resultados_revisados_en = now(),
      resultados_revisados_por = auth.uid()
  where id = p_publicacion_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.encuestas_por_decidir(p_condominio_id uuid)
 RETURNS TABLE(id uuid, titulo text, cerro_en timestamp with time zone, votos bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
    -- Ya se decidio dejarlos en borrador: no espera a nadie.
    and p.resultados_revisados_en is null
    and p.publicada_hasta is not null
    and p.publicada_hasta <= now()
    and public.es_admin_condominio(p_condominio_id)
  order by p.publicada_hasta desc;
$function$;
